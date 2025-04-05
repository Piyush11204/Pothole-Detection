from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from ultralytics import YOLO
import torch
from deep_sort_realtime.deepsort_tracker import DeepSort
import pandas as pd
from dotenv import load_dotenv
import torchvision.transforms as transforms
from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns
import json


load_dotenv()

app = Flask(__name__)
CORS(app)


app.config["MONGO_URI"] = os.getenv("MONGODB_URI", "mongodb://localhost:27017/pothole_detection")
mongo = PyMongo(app)


app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "3v8!Zx@qP2dK#rY7sGmL^fT1W&bN9aX")
jwt = JWTManager(app)


UPLOAD_FOLDER = 'uploads'
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'best.pt')


model = YOLO(MODEL_PATH, task="detect")
tracker = DeepSort(max_age=30, max_iou_distance=0.3)
model_type = "DPT_Hybrid"
midas = torch.hub.load("intel-isl/MiDaS", model=model_type, pretrained=True)
midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
midas.to(device).eval()

def convert_to_real_world(pixels, conversion_factor=0.035):
    
    return pixels * conversion_factor

def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, "Error: Could not open video."

    pothole_data = {}
    pothole_depths = {}
    global_track_id = 1

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame)
        
        # Convert frame for MiDaS depth estimation
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        input_batch = midas_transforms(frame_rgb).to(device)

        with torch.no_grad():
            prediction = midas(input_batch)
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=frame.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()
        depth_map = prediction.cpu().numpy()

        # Prepare detections for tracker
        detections = []
        for result in results:
            for box in result.boxes:
                x_min, y_min, x_max, y_max = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                detections.append(([x_min, y_min, x_max - x_min, y_max - y_min], conf, "pothole"))

        # Update tracker with new detections
        tracked_objects = tracker.update_tracks(detections, frame=frame)

        for track in tracked_objects:
            if not track.is_confirmed():
                continue

            track_id = track.track_id
            if track_id not in pothole_data:
                x_min, y_min, w, h = map(int, track.to_ltwh())
                x_max, y_max = x_min + w, y_min + h

                length_real = convert_to_real_world(w)
                breadth_real = convert_to_real_world(h)

                depth_roi = depth_map[y_min:y_max, x_min:x_max]
                valid_depth_values = depth_roi[depth_roi > 0]

                if valid_depth_values.size > 0:
                    if track_id not in pothole_depths:
                        pothole_depths[track_id] = []
                    pothole_depths[track_id].append(np.max(valid_depth_values) * 0.001)
                    pothole_depths[track_id] = sorted(pothole_depths[track_id], reverse=True)[:4]
                    fixed_depth = np.mean(pothole_depths[track_id])
                else:
                    fixed_depth = 0

                pothole_data[track_id] = {
                    'id': global_track_id,
                    'length': float(length_real),
                    'breadth': float(breadth_real),
                    'depth': float(fixed_depth),
                    'volume': float(length_real * breadth_real * fixed_depth)
                }
                global_track_id += 1

    cap.release()
    return list(pothole_data.values()), None

def process_single_image(image_path):
    """Process a single image for pothole detection."""
    frame = cv2.imread(image_path)
    if frame is None:
        return None, "Error: Could not open image."

    results = model(frame)
    
    # Convert frame for MiDaS depth estimation
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    input_batch = midas_transforms(frame_rgb).to(device)

    with torch.no_grad():
        prediction = midas(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=frame.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()
    depth_map = prediction.cpu().numpy()

    potholes = []
    for result in results:
        for box in result.boxes:
            x_min, y_min, x_max, y_max = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            
            w = x_max - x_min
            h = y_max - y_min
            
            length_real = convert_to_real_world(w)
            breadth_real = convert_to_real_world(h)

            depth_roi = depth_map[y_min:y_max, x_min:x_max]
            valid_depth_values = depth_roi[depth_roi > 0]

            if valid_depth_values.size > 0:
                depth = np.max(valid_depth_values) * 0.001
            else:
                depth = 0

            pothole_info = {
                'id': len(potholes) + 1,
                'length': float(length_real),
                'breadth': float(breadth_real),
                'depth': float(depth),
                'volume': float(length_real * breadth_real * depth),
                'confidence': float(conf),
                'bbox': [x_min, y_min, x_max, y_max]
            }
            potholes.append(pothole_info)

    return potholes, None

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if mongo.db.users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already exists'}), 400
    
    hashed_password = generate_password_hash(data['password'])
    user_id = mongo.db.users.insert_one({
        'email': data['email'],
        'password': hashed_password,
        'name': data['name']
    }).inserted_id
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = mongo.db.users.find_one({'email': data['email']})
    
    if user and check_password_hash(user['password'], data['password']):
        access_token = create_access_token(identity=str(user['_id']))
        return jsonify({'token': access_token}), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/detect', methods=['POST'])
@jwt_required()
def detect_potholes():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.endswith(tuple(ALLOWED_VIDEO_EXTENSIONS)):
        return jsonify({'error': f'Invalid file type. Please upload a video file with one of the following extensions: {", ".join(ALLOWED_VIDEO_EXTENSIONS)}'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        # Process video and get results
        results = process_video(filepath)
        
        # Save results to MongoDB
        user_id = get_jwt_identity()
        result_data = {
            'user_id': user_id,
            'type': 'video',
            'filename': filename,
            'timestamp': datetime.now(),
            'total_potholes': len(results[0]),
            'total_volume': sum(p['volume'] for p in results[0]),
            'csv_file': results[1],
            'potholes': results[0]
        }
        mongo.db.analysis_results.insert_one(result_data)

        return jsonify({
            'total_potholes': len(results[0]),
            'total_volume': sum(p['volume'] for p in results[0]),
            'potholes': results[0],
            'csv_file': results[1]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the video file
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/detect/image', methods=['POST'])
@jwt_required()
def detect_potholes_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.lower().endswith(tuple('.' + ext for ext in ALLOWED_IMAGE_EXTENSIONS)):
        return jsonify({'error': f'Invalid file type. Please upload an image file with one of the following extensions: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        potholes, error = process_single_image(filepath)
        if error:
            return jsonify({'error': error}), 500

        # Calculate total volume needed
        total_volume = sum(pothole['volume'] for pothole in potholes)
        
        # Create CSV data
        csv_data = []
        for pothole in potholes:
            csv_data.append({
                'ID': pothole['id'],
                'Length (cm)': pothole['length'],
                'Breadth (cm)': pothole['breadth'],
                'Depth (cm)': pothole['depth'],
                'Volume (cm³)': pothole['volume'],
                'Confidence': pothole['confidence']
            })

        # Save to CSV
        csv_filename = f"potholes_{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
        df = pd.DataFrame(csv_data)
        df.to_csv(csv_path, index=False)

        # Save results to MongoDB
        user_id = get_jwt_identity()
        result_data = {
            'user_id': user_id,
            'type': 'image',
            'filename': filename,
            'timestamp': datetime.now(),
            'total_potholes': len(potholes),
            'total_volume': total_volume,
            'csv_file': csv_filename,
            'potholes': potholes
        }
        mongo.db.analysis_results.insert_one(result_data)

        return jsonify({
            'image_name': filename,
            'total_potholes': len(potholes),
            'total_volume': total_volume,
            'potholes': potholes,
            'csv_file': csv_filename
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the image file
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/detect/batch', methods=['POST'])
@jwt_required()
def detect_potholes_batch():
    if 'csv_file' not in request.files:
        return jsonify({'error': 'No CSV file provided'}), 400
    
    file = request.files['csv_file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Invalid file type. Please upload a CSV file'}), 400

    try:
        # Read CSV file
        df = pd.read_csv(file)
        if 'image_path' not in df.columns:
            return jsonify({'error': 'CSV file must contain an "image_path" column'}), 400

        results = []
        for index, row in df.iterrows():
            image_path = row['image_path']
            if not os.path.exists(image_path):
                results.append({
                    'image_path': image_path,
                    'error': 'Image file not found'
                })
                continue

            potholes, error = process_single_image(image_path)
            if error:
                results.append({
                    'image_path': image_path,
                    'error': error
                })
                continue

            # Calculate total volume
            total_volume = sum(pothole['volume'] for pothole in potholes)
            
            results.append({
                'image_path': image_path,
                'total_potholes': len(potholes),
                'total_volume': total_volume,
                'potholes': potholes
            })

        # Create summary CSV
        summary_data = []
        for result in results:
            if 'error' not in result:
                for pothole in result['potholes']:
                    summary_data.append({
                        'Image Path': result['image_path'],
                        'Pothole ID': pothole['id'],
                        'Length (cm)': pothole['length'],
                        'Breadth (cm)': pothole['breadth'],
                        'Depth (cm)': pothole['depth'],
                        'Volume (cm³)': pothole['volume'],
                        'Confidence': pothole['confidence']
                    })

        # Save summary to CSV
        csv_filename = f"batch_potholes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
        df_summary = pd.DataFrame(summary_data)
        df_summary.to_csv(csv_path, index=False)

        return jsonify({
            'total_images': len(results),
            'successful_detections': len([r for r in results if 'error' not in r]),
            'failed_detections': len([r for r in results if 'error' in r]),
            'results': results,
            'summary_csv': csv_filename
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_user_history():
    try:
        user_id = get_jwt_identity()
        
        # Get all analysis results for the user
        results = list(mongo.db.analysis_results.find(
            {'user_id': user_id},
            {'_id': 0}  # Exclude MongoDB _id field
        ).sort('timestamp', -1))  # Sort by timestamp in descending order

        # Convert datetime objects to strings for JSON serialization
        for result in results:
            result['timestamp'] = result['timestamp'].isoformat()

        return jsonify(results), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    try:
        user_id = get_jwt_identity()
        
        # Get all analysis results for the user
        results = list(mongo.db.analysis_results.find({'user_id': user_id}))
        
        if not results:
            return jsonify({
                'total_analyses': 0,
                'total_potholes': 0,
                'total_volume': 0,
                'average_potholes': 0,
                'average_volume': 0,
                'recent_analyses': []
            }), 200

        # Calculate statistics
        total_analyses = len(results)
        total_potholes = sum(r['total_potholes'] for r in results)
        total_volume = sum(r['total_volume'] for r in results)
        average_potholes = total_potholes / total_analyses
        average_volume = total_volume / total_analyses

        # Get recent analyses (last 5)
        recent_analyses = []
        for result in sorted(results, key=lambda x: x['timestamp'], reverse=True)[:5]:
            recent_analyses.append({
                'filename': result['filename'],
                'type': result['type'],
                'timestamp': result['timestamp'].isoformat(),
                'total_potholes': result['total_potholes'],
                'total_volume': result['total_volume']
            })

        return jsonify({
            'total_analyses': total_analyses,
            'total_potholes': total_potholes,
            'total_volume': total_volume,
            'average_potholes': average_potholes,
            'average_volume': average_volume,
            'recent_analyses': recent_analyses
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 
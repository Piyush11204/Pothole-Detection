from ultralytics import YOLO
import cv2
import numpy as np
import torch
from deep_sort_realtime.deepsort_tracker import DeepSort
from flask import Flask, Response, jsonify, send_from_directory
from flask_cors import CORS
import threading
import time
import json
import base64
from typing import Dict, Tuple, Optional
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__, static_folder='frontend/build')
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

# Global variables with thread-safe access
class VideoProcessorState:
    def __init__(self):
        self.latest_frame = None
        self.latest_pothole_data = {}
        self.processing_active = False
        self.global_pothole_data: Dict[int, Tuple[float, float, float]] = {}
        self.id_mapping: Dict[str, int] = {}
        self.global_track_id = 1
        self.lock = threading.Lock()
        self.encoded_frame = None  # Store base64 encoded frame

state = VideoProcessorState()

# Model initialization
def initialize_models():
    """Initialize YOLO, DeepSORT, and MiDaS models."""
    try:
        # Load YOLO model
        yolo_model = YOLO("models/best.pt", task="detect")
        
        # Initialize DeepSORT tracker
        tracker = DeepSort(max_age=30, max_iou_distance=0.3)
        
        # Load MiDaS depth estimation model
        midas = torch.hub.load("intel-isl/MiDaS", "DPT_Hybrid")
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
        
        # Set device and move model to it
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        midas.to(device).eval()
        
        return yolo_model, tracker, midas, midas_transforms, device
    except Exception as e:
        logger.error(f"Model initialization failed: {e}")
        raise

model, tracker, midas, midas_transforms, device = initialize_models()

def resize_frame(frame: np.ndarray, max_w: int, max_h: int) -> np.ndarray:
    """Resize frame while maintaining aspect ratio."""
    h, w = frame.shape[:2]
    scale = min(max_w / w, max_h / h)
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

def convert_to_real_world(pixels: float, conversion_factor: float = 0.035) -> float:
    """Convert pixel measurements to real-world centimeters."""
    return pixels * conversion_factor

def encode_frame_to_base64(frame):
    """Convert frame to base64 for sending to frontend."""
    _, buffer = cv2.imencode('.jpg', frame)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    return jpg_as_text

def process_video(video_path: str) -> None:
    """Process video to detect and track potholes with depth estimation."""
    global state, tracker
    
    with state.lock:
        if state.processing_active:
            logger.warning("Processing already active. Skipping new request.")
            return
        state.processing_active = True
        state.global_pothole_data.clear()
        state.id_mapping.clear()
        state.global_track_id = 1
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Could not open video: {video_path}")
        state.processing_active = False
        return

    pothole_data: Dict[int, Tuple[float, float, float]] = {}
    pothole_depths: Dict[int, list] = {}
    scaling_factor = 1  # Reduce bounding box size to 80% of original

    while cap.isOpened() and state.processing_active:
        ret, frame = cap.read()
        if not ret:
            logger.info("End of video or error encountered.")
            break

        results = model(frame)
        if len(results[0].boxes) == 0:
            logger.info("Blackout frame detected. Resetting tracker.")
            with state.lock:
                # Save current pothole data into the global dictionary
                for track_id, (length_real, breadth_real, fixed_depth) in pothole_data.items():
                    if track_id not in state.global_pothole_data:
                        state.global_pothole_data[track_id] = (length_real, breadth_real, fixed_depth)
                
            # Reset tracker but maintain global_track_id
            tracker = DeepSort(max_age=30, max_iou_distance=0.3)
            pothole_data.clear()
            pothole_depths.clear()
            time.sleep(0.03)
            continue

        # Depth estimation
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        input_batch = midas_transforms(frame_rgb).to(device)
        with torch.no_grad():
            prediction = midas(input_batch)
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1), size=frame.shape[:2], mode="bicubic", align_corners=False
            ).squeeze()
        depth_map = prediction.cpu().numpy()

        # Prepare detections for tracker with reduced bounding box size
        detections = []
        for result in results:
            for box in result.boxes:
                x_min, y_min, x_max, y_max = [int(x) for x in box.xyxy[0].tolist()]
                conf = float(box.conf[0])
                
                # Calculate original width and height
                w = x_max - x_min
                h = y_max - y_min
                
                # Reduce width and height by scaling factor
                new_w = int(w * scaling_factor)
                new_h = int(h * scaling_factor)
                
                # Recalculate coordinates to keep the box centered
                center_x = x_min + w // 2
                center_y = y_min + h // 2
                new_x_min = max(0, center_x - new_w // 2)
                new_y_min = max(0, center_y - new_h // 2)
                new_x_max = min(frame.shape[1], new_x_min + new_w)
                new_y_max = min(frame.shape[0], new_y_min + new_h)
                
                # Update detections with new coordinates - using ltwh format for DeepSORT
                detections.append(([new_x_min, new_y_min, new_x_max - new_x_min, new_y_max - new_y_min], conf, "pothole"))

        tracked_objects = tracker.update_tracks(detections, frame=frame)
        
        current_frame_data = {}
        for track in tracked_objects:
            if not track.is_confirmed():
                continue

            track_id = track.track_id
            with state.lock:
                if track_id not in state.id_mapping:
                    state.id_mapping[track_id] = state.global_track_id
                    state.global_track_id += 1
                unique_id = state.id_mapping[track_id]

            x_min, y_min, w, h = map(int, track.to_ltwh())
            if unique_id not in pothole_data:
                length_real = convert_to_real_world(w)
                breadth_real = convert_to_real_world(h)
                depth_roi = depth_map[y_min:y_min + h, x_min:x_min + w]
                valid_depth_values = depth_roi[depth_roi > 0]

                # Updated depth calculation logic from second code
                if valid_depth_values.size > 0:
                    if unique_id not in pothole_depths:
                        pothole_depths[unique_id] = []
                    
                    pothole_depths[unique_id].append(np.max(valid_depth_values) * 0.001)
                    pothole_depths[unique_id] = sorted(pothole_depths[unique_id], reverse=True)[:4]
                    fixed_depth = np.mean(pothole_depths[unique_id])
                else:
                    fixed_depth = 0
                
                pothole_data[unique_id] = (length_real, breadth_real, fixed_depth)

            length_real, breadth_real, fixed_depth = pothole_data[unique_id]
            current_frame_data[unique_id] = {
                "id": int(unique_id),
                "position": {"x": x_min, "y": y_min, "width": w, "height": h},
                "measurements": {"length": round(length_real, 2), "breadth": round(breadth_real, 2), "depth": round(fixed_depth, 2)}
            }

            # Annotate frame with reduced bounding box
            x_max, y_max = x_min + w, y_min + h
            cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
            text = f"ID: {unique_id} | L: {length_real:.2f} cm, B: {breadth_real:.2f} cm, D: {fixed_depth:.2f} cm"
            cv2.putText(frame, text, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

        resized_frame = resize_frame(frame, 800, 600)
        encoded_frame = encode_frame_to_base64(resized_frame)

        with state.lock:
            state.latest_frame = resized_frame
            state.latest_pothole_data = current_frame_data
            state.encoded_frame = encoded_frame
        time.sleep(0.03)

    cap.release()
    with state.lock:
        # Final update of global pothole data after processing ends
        for track_id, (length_real, breadth_real, fixed_depth) in pothole_data.items():
            if track_id not in state.global_pothole_data:
                state.global_pothole_data[track_id] = (length_real, breadth_real, fixed_depth)
        state.processing_active = False
    logger.info("Video processing completed.")

def generate_frames():
    """Generate video frames for streaming."""
    blank_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
    cv2.putText(blank_img, "Waiting for video...", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    encoded_blank = encode_frame_to_base64(blank_img)
    
    while True:
        with state.lock:
            frame = state.latest_frame
        if frame is not None:
            ret, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        else:
            ret, buffer = cv2.imencode('.jpg', blank_img)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        time.sleep(0.03 if state.processing_active else 0.1)

@app.route('/video_feed')
def video_feed():
    """Stream video frames using multipart response for direct browser viewing."""
    response = Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/video_frame')
def video_frame():
    """Return the latest frame as base64 encoded image for frontend JavaScript."""
    with state.lock:
        if state.encoded_frame is None:
            blank_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
            cv2.putText(blank_img, "Waiting for video...", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
            encoded_frame = encode_frame_to_base64(blank_img)
        else:
            encoded_frame = state.encoded_frame
    return jsonify({"image": encoded_frame})

@app.route('/pothole_data')
def get_pothole_data():
    """Return latest pothole data."""
    with state.lock:
        return jsonify(state.latest_pothole_data)

@app.route('/global_pothole_data')
def get_global_pothole_data():
    """Return aggregated pothole data across all clips."""
    with state.lock:
        formatted_data = {
            str(pothole_id): {
                "id": int(pothole_id),
                "measurements": {"length": round(l, 2), "breadth": round(b, 2), "depth": round(d, 2)}
            } for pothole_id, (l, b, d) in state.global_pothole_data.items()
        }
        
        # Calculate totals
        total = {
            "count": len(state.global_pothole_data),
            "length": round(sum(x[0] for x in state.global_pothole_data.values()), 2),
            "breadth": round(sum(x[1] for x in state.global_pothole_data.values()), 2),
            "depth": round(sum(x[2] for x in state.global_pothole_data.values()), 2)
        }
    return jsonify({"potholes": formatted_data, "total": total})

@app.route('/start_processing/<path:video_path>')
def start_processing(video_path: str):
    """Start video processing in a background thread."""
    with state.lock:
        if state.processing_active:
            return jsonify({"status": "already_running"})
        thread = threading.Thread(target=process_video, args=(video_path,))
        thread.daemon = True
        thread.start()
    return jsonify({"status": "started", "video_path": video_path})

@app.route('/stop_processing')
def stop_processing():
    """Stop video processing."""
    with state.lock:
        state.processing_active = False
    return jsonify({"status": "stopped"})

@app.route('/status')
def get_status():
    """Return current processing status."""
    with state.lock:
        return jsonify({"processing": state.processing_active, "potholes_count": len(state.global_pothole_data)})

# Serve frontend static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
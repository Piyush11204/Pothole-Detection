import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os

class PotholeDetector:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), '../ml_models/pothole_detection_model.h5')
        self.dimension_model_path = os.path.join(os.path.dirname(__file__), '../ml_models/dimension_estimation_model.h5')
        
        # Load models
        self.detection_model = load_model(self.model_path)
        self.dimension_model = load_model(self.dimension_model_path)
        
        # Define constants for dimension estimation
        self.CAMERA_HEIGHT = 1.5  # meters
        self.FOCAL_LENGTH = 1000  # pixels
        
    def preprocess_frame(self, frame):
        # Resize frame to model input size
        resized = cv2.resize(frame, (224, 224))
        # Normalize pixel values
        normalized = resized / 255.0
        return normalized
        
    def detect_potholes(self, frame):
        processed_frame = self.preprocess_frame(frame)
        predictions = self.detection_model.predict(np.expand_dims(processed_frame, axis=0))
        return predictions[0]
        
    def estimate_dimensions(self, frame, bbox):
        # Extract pothole region
        x, y, w, h = bbox
        pothole_region = frame[y:y+h, x:x+w]
        
        # Preprocess region for dimension model
        processed_region = cv2.resize(pothole_region, (128, 128))
        normalized_region = processed_region / 255.0
        
        # Get dimension predictions
        dimensions = self.dimension_model.predict(np.expand_dims(normalized_region, axis=0))
        
        # Convert pixel dimensions to real-world measurements (meters)
        real_width = (dimensions[0][0] * w * self.CAMERA_HEIGHT) / self.FOCAL_LENGTH
        real_length = (dimensions[0][1] * h * self.CAMERA_HEIGHT) / self.FOCAL_LENGTH
        depth = dimensions[0][2]  # Assuming model predicts depth directly
        
        return {
            'width': float(real_width),
            'length': float(real_length),
            'depth': float(depth)
        }
        
    def process_video(self, frames):
        results = {
            'potholes_detected': 0,
            'frames_with_potholes': [],
            'pothole_details': []
        }
        
        for frame_idx, frame in enumerate(frames):
            # Detect potholes in frame
            predictions = self.detect_potholes(frame)
            
            if predictions > 0.5:  # Assuming binary classification threshold
                results['potholes_detected'] += 1
                results['frames_with_potholes'].append(frame_idx)
                
                # Perform object detection to get bounding box
                # Note: This is a simplified version. You should use your actual object detection logic
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                blurred = cv2.GaussianBlur(gray, (11, 11), 0)
                thresh = cv2.threshold(blurred, 60, 255, cv2.THRESH_BINARY)[1]
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for contour in contours:
                    if cv2.contourArea(contour) > 500:  # Minimum area threshold
                        bbox = cv2.boundingRect(contour)
                        dimensions = self.estimate_dimensions(frame, bbox)
                        
                        severity = self.calculate_severity(dimensions)
                        
                        pothole_info = {
                            'frame_index': frame_idx,
                            'bbox': list(bbox),
                            'dimensions': dimensions,
                            'severity': severity,
                            'location': self.get_frame_location(frame_idx)  # You'll need to implement this based on your needs
                        }
                        results['pothole_details'].append(pothole_info)
        
        return results
    
    def calculate_severity(self, dimensions):
        # Simple severity calculation based on dimensions
        volume = dimensions['width'] * dimensions['length'] * dimensions['depth']
        
        if volume > 0.5:  # cubic meters
            return 'high'
        elif volume > 0.2:
            return 'medium'
        else:
            return 'low'
            
    def get_frame_location(self, frame_idx):
        # This should be implemented based on your video metadata or GPS data
        # Returning dummy coordinates for now
        return {
            'latitude': 0.0,
            'longitude': 0.0
        } 
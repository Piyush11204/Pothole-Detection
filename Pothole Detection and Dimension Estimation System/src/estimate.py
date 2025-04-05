from ultralytics import YOLO
import cv2
import numpy as np
import torch
from deep_sort_realtime.deepsort_tracker import DeepSort

# Load YOLO model
model = YOLO("best.pt", task="detect")

# Initialize DeepSORT tracker
tracker = DeepSort(max_age=30, max_iou_distance=0.3)

# Load MiDaS depth estimation model
model_type = "DPT_Hybrid"
midas = torch.hub.load("intel-isl/MiDaS", model=model_type, pretrained=True)
midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
midas.to(device).eval()

# Load video
video_path = "input/final4.mp4"
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

# Get video dimensions
frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

# Set display window size
max_width, max_height = 800, 600

# Dictionaries to store pothole data
pothole_data = {}  # Stores pothole details per clip
pothole_depths = {}  # Stores depth information per pothole

global_pothole_data = {}  # Stores all potholes across clips
id_mapping = {}  # Maps local tracker ID to a unique global ID
global_track_id = 1  # Counter for globally unique pothole IDs

def resize_frame(frame, max_w, max_h):
    """Resize frame while maintaining aspect ratio."""
    h, w = frame.shape[:2]
    scale = min(max_w / w, max_h / h)
    return cv2.resize(frame, (int(w * scale), int(h * scale)))

def convert_to_real_world(pixels, conversion_factor=0.035):
    """Convert pixel measurements to real-world centimeters."""
    return pixels * conversion_factor

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("End of video or error.")
        break

    results = model(frame)

    # Detect blackout frame (transition between clips)
    if len(results[0].boxes) == 0:
        print("Blackout detected. Saving pothole data & resetting tracker.")

        # Save current pothole data into the global dictionary
        for track_id, (length_real, breadth_real, fixed_depth) in pothole_data.items():
            if track_id not in global_pothole_data:
                global_pothole_data[track_id] = (length_real, breadth_real, fixed_depth)

        # Reset tracker & pothole data, but keep `global_track_id`
        tracker = DeepSort(max_age=30, max_iou_distance=0.3)
        pothole_data.clear()
        pothole_depths.clear()
        id_mapping.clear()  # Clear old ID mappings

        continue  # Skip this blackout frame

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

        track_id = track.track_id  # Local tracker ID

        # Assign a new unique global ID if the tracker ID is not mapped yet
        if track_id not in id_mapping:
            id_mapping[track_id] = global_track_id
            global_track_id += 1  # Increment global ID counter

        unique_id = id_mapping[track_id]  # Use globally assigned ID

        x_min, y_min, w, h = map(int, track.to_ltwh())
        x_max, y_max = x_min + w, y_min + h

        if unique_id not in pothole_data:
            length_real = convert_to_real_world(w)
            breadth_real = convert_to_real_world(h)

            depth_roi = depth_map[y_min:y_max, x_min:x_max]
            valid_depth_values = depth_roi[depth_roi > 0]

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

        # Draw bounding box & pothole ID on frame
        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
        text = f"ID: {unique_id} | L: {length_real:.2f} cm, B: {breadth_real:.2f} cm, D: {fixed_depth:.2f} cm"
        cv2.putText(frame, text, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 1 , (255, 0, 0), 2)

    # Display the frame
    resized_frame = resize_frame(frame, max_width, max_height)
    cv2.imshow("Pothole Detection, Tracking & Depth", resized_frame)
    if cv2.waitKey(25) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# Merge pothole data across all clips into global storage
for track_id, (length_real, breadth_real, fixed_depth) in pothole_data.items():
    if track_id not in global_pothole_data:
        global_pothole_data[track_id] = (length_real, breadth_real, fixed_depth)

# Print final pothole data after processing all clips
print("\nFinal Pothole Data:")
print("ID | Length (cm) | Breadth (cm) | Depth (cm)")
print("----------------------------------------")

total_length = 0
total_breadth = 0
total_depth = 0

for track_id, (length_real, breadth_real, fixed_depth) in global_pothole_data.items():
    print(f"{track_id}  | {length_real:.2f}        | {breadth_real:.2f}        | {fixed_depth:.2f}")
    
    total_length += length_real
    total_breadth += breadth_real
    total_depth += fixed_depth

print("----------------------------------------")
print(f"Total  | {total_length:.2f}      | {total_breadth:.2f}      | {total_depth:.2f}")
print(f"\nTotal potholes detected: {len(global_pothole_data)}")

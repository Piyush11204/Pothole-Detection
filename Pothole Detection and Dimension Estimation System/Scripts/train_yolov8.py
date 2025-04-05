from ultralytics import YOLO

model = YOLO('src/models/yolov8n.yaml', task='detect')



model.train(
    data='pothole_detection.yaml',  
    epochs=50,                      
    imgsz=640,                      
    batch=16,                       
    name='pothole_detection'        
)

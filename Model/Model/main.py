import os
import json
import base64
import cv2
import numpy as np
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from model.object_detector import ObjectDetector

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector
print("Initializing YOLOv8 Object Detector...")
detector = ObjectDetector(model_path='yolov8n.pt')
print("Detector Initialized.")

LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

def sanitize_filename(name: str):
    return "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()

def log_incident(log_file: str, items: list):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(log_file, "a") as f:
        for item in items:
            log_line = f"[{timestamp}] WARNING: Detected {item['item']} (Confidence: {item['confidence']:.2f})\n"
            f.write(log_line)
            print(log_line.strip())

@app.websocket("/ws/proctor/{exam_id}/{student_id}")
async def proctor_endpoint(
    websocket: WebSocket, 
    exam_id: str, 
    student_id: str,
    exam_name: str = "Unknown Exam",
    university_name: str = "Unknown University",
    course_name: str = "Unknown Course",
    course_code: str = "",
    student_name: str = "Unknown Student"
):
    await websocket.accept()
    
    folder_name = f"{exam_name}_{university_name}_{course_name}_{course_code}"
    folder_name = sanitize_filename(folder_name)
    exam_dir = os.path.join(LOG_DIR, folder_name)
    
    if not os.path.exists(exam_dir):
        os.makedirs(exam_dir, exist_ok=True)
        
    file_name = f"{student_id}_{student_name}.log"
    file_name = sanitize_filename(file_name.replace('.log', '')) + ".log"
    log_file = os.path.join(exam_dir, file_name)

    print(f"Client connected for Exam: {exam_id}, Student: {student_id}. Logging to {log_file}")
    try:
        while True:
            # Receive base64 image frame from client
            data = await websocket.receive_text()
            
            if data.startswith("data:image"):
                data = data.split(",")[1]
            
            # Decode base64 to numpy array for OpenCV
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # Run detection
                detected_items = detector.detect(frame)
                if detected_items:
                    log_incident(log_file, detected_items)
                    # Send feedback to frontend if needed
                    await websocket.send_json({"status": "warning", "items": detected_items})
            
    except WebSocketDisconnect:
        print(f"Client disconnected for Exam: {exam_id}, Student: {student_id}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

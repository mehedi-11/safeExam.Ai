import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')
print("Model loaded successfully.")

@app.websocket("/ws/proctor/{exam_id}/{student_id}")
async def websocket_endpoint(websocket: WebSocket, exam_id: str, student_id: str):
    await websocket.accept()
    print(f"Student {student_id} connected for Exam {exam_id}")
    try:
        while True:
            data = await websocket.receive_text()
            
            # The data is expected to be a data URL like "data:image/jpeg;base64,/9j/4AAQ..."
            if data.startswith('data:image'):
                base64_data = data.split(',')[1]
            else:
                base64_data = data
                
            img_bytes = base64.b64decode(base64_data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is not None:
                # Run YOLO inference
                results = model(img, stream=True, verbose=False)
                
                detected_items = []
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        class_name = model.names[cls_id]
                        if class_name in ['cell phone', 'book', 'person']:
                            detected_items.append({"item": class_name})
                            
                person_count = len([x for x in detected_items if x['item'] == 'person'])
                suspicious_items = [x for x in detected_items if x['item'] in ['cell phone', 'book']]
                
                if suspicious_items or person_count > 1:
                    warning_msg = {
                        "status": "warning",
                        "items": suspicious_items
                    }
                    if person_count > 1:
                        warning_msg["items"].append({"item": "multiple persons"})
                    await websocket.send_text(json.dumps(warning_msg))
                    
    except WebSocketDisconnect:
        print(f"Student {student_id} disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

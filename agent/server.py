import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from advanced_object_detection import process_image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Starting Proctoring AI Server...")

@app.websocket("/ws/proctor/{exam_id}/{student_id}")
async def websocket_endpoint(websocket: WebSocket, exam_id: str, student_id: str):
    await websocket.accept()
    print(f"Student {student_id} connected for Exam {exam_id}")
    try:
        while True:
            data = await websocket.receive_text()
            
            # The data is expected to be a data URL like "data:image/jpeg;base64,/9j/..."
            if data.startswith('data:image'):
                base64_data = data.split(',')[1]
            else:
                base64_data = data
                
            img_bytes = base64.b64decode(base64_data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is not None:
                # Process the image using our advanced_object_detection module
                annotated_image, warnings = process_image(img)
                
                # Format warnings for frontend compatibility 
                # frontend expects: { status: 'warning', items: [{item: '...'}, ...] }
                response_data = {
                    "status": "ok",
                    "items": [],
                    "frame": None
                }
                
                if warnings:
                    response_data["status"] = "warning"
                    response_data["items"] = [{"item": w} for w in warnings]
                
                # Encode the annotated frame to base64
                ret, buffer = cv2.imencode('.jpg', annotated_image, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                if ret:
                    b64_frame = base64.b64encode(buffer).decode('utf-8')
                    response_data["frame"] = f"data:image/jpeg;base64,{b64_frame}"
                
                await websocket.send_text(json.dumps(response_data))
                    
    except WebSocketDisconnect:
        print(f"Student {student_id} disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

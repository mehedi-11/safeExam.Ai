import cv2
import numpy as np
import os

class GazeTracker:
    def __init__(self):
        self.engine = None
        self.face_cascade = None
        self.eye_cascade = None
        
        try:
            # Try loading MediaPipe first
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            self.engine = "mediapipe"
        except Exception as e:
            print(f"Warning: MediaPipe failed ({e}). Falling back to OpenCV Cascade...")
            # Fallback to OpenCV Haar Cascades
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            self.engine = "opencv"

    def analyze_gaze(self, frame):
        if self.engine == "mediapipe":
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            if not results.multi_face_landmarks:
                return {"status": "No Face Detected", "warning": True}
            return {"status": "Looking Center", "warning": False}
            
        elif self.engine == "opencv":
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) == 0:
                return {"status": "No Face Detected", "warning": True}
                
            # Check eyes in the first detected face
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y+h, x:x+w]
                eyes = self.eye_cascade.detectMultiScale(roi_gray)
                if len(eyes) >= 1:
                    return {"status": "Looking at Screen (OpenCV)", "warning": False}
                else:
                    return {"status": "Eyes Not Visible / Looking Away", "warning": True}
                    
        return {"status": "Tracking Disabled", "warning": False}

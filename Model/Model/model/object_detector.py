from ultralytics import YOLO

class ObjectDetector:
    def __init__(self, model_path='yolov8n.pt'):
        # Load the pre-trained YOLOv8 nano model
        # It will automatically download the model file on first run
        self.model = YOLO(model_path)
        
        # COCO class IDs for forbidden objects 
        # 67: cell phone, 73: book, 63: laptop
        self.forbidden_classes = [67, 73, 63] 

    def detect(self, frame):
        """
        Runs object detection on a single frame.
        Returns a list of detected forbidden items.
        """
        results = self.model(frame, verbose=False)
        detected_items = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                if cls_id in self.forbidden_classes and conf > 0.5:
                    item_name = self.model.names[cls_id]
                    detected_items.append({
                        "item": item_name,
                        "confidence": conf,
                        "box": box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    })
                    
        return detected_items

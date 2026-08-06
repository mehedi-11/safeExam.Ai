import os
import urllib.request
import cv2
from ultralytics import YOLO

# Resolve the absolute path of the current directory to locate the models folder robustly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "yolov8s-worldv2.pt")

# Download the YOLO-World model if it doesn't exist
if not os.path.exists(MODEL_PATH):
    print("Downloading YOLOv8-World model...")
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    urllib.request.urlretrieve(
        "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s-worldv2.pt", 
        MODEL_PATH
    )

print("Loading YOLO-World model...")
model = YOLO(MODEL_PATH)

# Define custom classes for exam proctoring
custom_classes = [
    "cell phone",
    "book",
    "notebook",
    "pen",
    "pencil",
    "person",
    "smartwatch",
    "laptop",
    "monitor"
]
print(f"Setting custom classes: {custom_classes}")
model.set_classes(custom_classes)

def process_image(image):
    """
    Process an OpenCV image frame to detect exam proctoring objects.
    
    Args:
        image: OpenCV image array (e.g., from cv2.imread or video frame)
        
    Returns:
        annotated_image: The image with bounding boxes drawn.
        warnings: A list of string warnings (e.g., ["Multiple Persons Detected!", "Prohibited: cell phone"])
    """
    
    # Run detection
    # conf=0.1 allows zero-shot text classes to be detected
    results = model.predict(image, conf=0.1, verbose=False)

    # Initialize counts
    object_counts = {c: 0 for c in custom_classes}
    warnings = []
    
    annotated_image = image.copy()

    for result in results:
        annotated_image = result.plot() # Draws bounding boxes and labels
        
        boxes = result.boxes
        for box in boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            if class_name in object_counts:
                object_counts[class_name] += 1

    # Check for multiple persons or no persons
    if object_counts["person"] > 1:
        warnings.append("Multiple Persons Detected!")
        cv2.putText(annotated_image, "WARNING: Multiple Persons!", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    elif object_counts["person"] == 0:
        warnings.append("No Person Detected!")
        cv2.putText(annotated_image, "WARNING: No Person Detected!", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 165, 255), 2)

    # Check for prohibited items
    prohibited_detected = []
    for item in ["cell phone", "book", "notebook", "pen", "pencil", "smartwatch", "laptop", "monitor"]:
        if object_counts[item] > 0:
            prohibited_detected.append(item)
            
    if prohibited_detected:
        warn_msg = f"Prohibited Items: {', '.join(prohibited_detected)}"
        warnings.append(warn_msg)
        cv2.putText(annotated_image, warn_msg, (20, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    return annotated_image, warnings


# ==========================================
# Example usage for backend developers:
# ==========================================
if __name__ == "__main__":
    # Test with webcam to ensure the function works properly
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        print("Testing process_image function with webcam. Press 'q' to exit.")
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            annotated_frame, current_warnings = process_image(frame)
            
            if current_warnings:
                print("Warnings generated:", current_warnings)
                
            cv2.imshow("Test - Backend Module", annotated_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        cap.release()
        cv2.destroyAllWindows()

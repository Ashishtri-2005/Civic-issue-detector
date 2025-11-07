
from ultralytics import YOLO
import cv2
import numpy as np
import os


try:
    model_path = "D:/AMC/model/best.pt"
    if os.path.exists(model_path):
        model = YOLO(model_path)
        print(f"✅ YOLO model loaded successfully from: {model_path}")
    else:
        print(f" Model file not found at: {model_path}")
        model = None
except Exception as e:
    print(f" Error loading YOLO model: {e}")
    model = None


CLASS_LABELS = {
    0: "pothole",
    1: "fire", 
    2: "waterlogging",
    3: "garbage"
}

# Priority classes (if fire is detected, skip pothole detection)
HIGH_PRIORITY_CLASSES = ["fire"]

def detect_objects(image_path):
    """Detect objects in the given image using YOLO model"""
    
    if model is None:
        print("⚠️ Using dummy detection - model not loaded")
        return [{
            "bbox": [100, 100, 200, 200],
            "confidence": 0.85,
            "class": "pothole",
            "age_days": 30
        }]
    

    if not os.path.exists(image_path):
        raise ValueError(f"Cannot find image: {image_path}")
    
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")

        print(f"🖼️ Processing image: {image_path} (Size: {img.shape})")
        
        # Run inference
        results = model(img)
        detections = []
        detected_classes = set()

        for result in results:
            boxes = result.boxes
            if boxes is None:
                print("ℹ️ No objects detected")
                continue
                
            for i in range(len(boxes)):
                box = boxes[i].xyxy[0].cpu().numpy()
                conf = float(boxes[i].conf)
                cls = int(boxes[i].cls)
                label = CLASS_LABELS.get(cls, "unknown")
                
               
                detected_classes.add(label)

                age_days = None
                if label == "pothole":
                    # Check if high priority classes (like fire) are detected
                    if any(priority_class in detected_classes for priority_class in HIGH_PRIORITY_CLASSES):
                        print(f" Skipping pothole detection - high priority class detected")
                        continue
                    
                    x1, y1, x2, y2 = map(int, box)
                    if (x2 > x1 and y2 > y1 and 
                        x1 >= 0 and y1 >= 0 and 
                        x2 <= img.shape[1] and y2 <= img.shape[0]):
                        crop_img = img[y1:y2, x1:x2]
                        if crop_img.size > 0:
                            age_days = estimate_pothole_age(crop_img)
                    else:
                        print(" Invalid bounding box for pothole age estimation")

                detection = {
                    "bbox": box.tolist(),
                    "confidence": round(conf, 3),
                    "class": label,
                    "age_days": age_days
                }
                detections.append(detection)
                print(f"    Detected: {label} (confidence: {conf:.3f})")

        print(f"✅ Detection completed: {len(detections)} objects found")
        return detections

    except Exception as e:
        print(f" Detection error: {e}")
        raise

def estimate_pothole_age(crop_img):
    """Estimate pothole age based on image characteristics"""
    try:
        if crop_img.size == 0:
            return 1  
        
        gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        _, stddev = cv2.meanStdDev(gray)
        texture_score = stddev[0][0]
        brightness = np.mean(gray)

        edge_factor = 1.0 / (laplacian_var + 1e-5)
        texture_factor = texture_score / 255.0
        brightness_factor = brightness / 255.0

        age_score = 0.5 * edge_factor + 0.3 * texture_factor + 0.2 * brightness_factor
        estimated_age_days = int(round(age_score * 365))
        return min(max(estimated_age_days, 0), 365)
        
    except Exception as e:
        print(f" Pothole age estimation error: {e}")
        return 1
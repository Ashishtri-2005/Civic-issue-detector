# backend/db.py
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import json

# MongoDB connection URI
try:
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    db = client["AMC_db"]
    detections_collection = db["complaints"]  # Changed collection name to reflect one record per image
    print("✅ Connected to MongoDB successfully")
except Exception as e:
    print(f"❌ MongoDB connection error: {e}")
    # Create a dummy collection for fallback
    detections_collection = None

def save_detection(detection_record):
    """Save single image detection record to MongoDB"""
    if not detection_record:
        print("ℹ️ No detection record to save")
        return None
        
    if detections_collection is None:
        print("⚠️ MongoDB not available - skipping save")
        return None
        
    try:
        # Add timestamp to the record
        detection_record["db_timestamp"] = datetime.utcnow()
        
        result = detections_collection.insert_one(detection_record)
        print(f"✅ Saved image record to database with ID: {result.inserted_id}")
        return result.inserted_id
        
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        return None

def get_recent_detections(limit=10):
    """Get recent image records from database"""
    if detections_collection is None:
        return []
        
    try:
        return list(detections_collection.find()
                   .sort("db_timestamp", -1)
                   .limit(limit))
    except Exception as e:
        print(f"❌ Error fetching detections: {e}")
        return []

def get_detections_by_class(class_name, limit=10):
    """Get image records filtered by detected class"""
    if detections_collection is None:
        return []
        
    try:
        return list(detections_collection.find(
            {"detected_classes": class_name}
        ).sort("db_timestamp", -1).limit(limit))
    except Exception as e:
        print(f"❌ Error fetching detections by class: {e}")
        return []
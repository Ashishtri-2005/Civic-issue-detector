# backend/db.py
import os
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MongoDB Atlas URI from .env
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("❌ MONGO_URI not found in .env file! Please add it.")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    db = client["AMC_db"]  # Database name
    detections_collection = db["complaints"]  # Collection name
    # collection = db["complaints"]  # Collection name
    print("✅ Connected to MongoDB Atlas successfully")
except Exception as e:
    print(f"❌ MongoDB Atlas connection error: {e}")
    detections_collection = None


def save_detection(detection_record):
    """Save a single image detection record to MongoDB Atlas"""
    if not detection_record:
        print("ℹ️ No detection record to save")
        return None

    if detections_collection is None:
        print("⚠️ MongoDB not available - skipping save")
        return None

    try:
        detection_record["db_timestamp"] = datetime.utcnow()
        result = detections_collection.insert_one(detection_record)
        print(f"✅ Saved image record to database with ID: {result.inserted_id}")
        return result.inserted_id
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        return None


def get_recent_detections(limit=10):
    """Get recent image records from MongoDB Atlas"""
    if detections_collection is None:
        return []
    try:
        return list(detections_collection.find().sort("db_timestamp", -1).limit(limit))
    except Exception as e:
        print(f"❌ Error fetching recent detections: {e}")
        return []


def get_detections_by_class(class_name, limit=10):
    """Get image records filtered by detected class"""
    if detections_collection is None:
        return []
    try:
        return list(
            detections_collection.find({"detected_classes": class_name})
            .sort("db_timestamp", -1)
            .limit(limit)
        )
    except Exception as e:
        print(f"❌ Error fetching detections by class: {e}")
        return []

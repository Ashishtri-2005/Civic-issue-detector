
from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import shutil
import os
import uvicorn
from datetime import datetime

from model_utils import detect_objects
from notifications import register, unregister, broadcast
from db import save_detection

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


os.makedirs("temp", exist_ok=True)

@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None)
):
    try:
        print(f"📥 Received upload request:")
        print(f"   File: {file.filename}")
        print(f"   Location: {latitude}, {longitude}")
        print(f"   Timestamp: {timestamp}")
        
        # Validate file
        if not file.content_type.startswith('image/'):
            return JSONResponse(
                status_code=400, 
                content={"error": "File must be an image"}
            )

        # Save file temporarily
        file_location = f"temp/{file.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"✅ File saved to: {file_location}")

        # Detect objects
        detections = detect_objects(file_location)
        print(f"🔍 Detections: {len(detections)} objects found")

        # Create ONE record per image with all detections
        detection_record = {
            "filename": file.filename,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": timestamp,
            "upload_timestamp": datetime.utcnow().isoformat(),
            "detections": detections,  # Store all detections as an array
            "total_detections": len(detections),
            "detected_classes": [det["class"] for det in detections]
        }

        # Save to MongoDB (one record per image)
        save_detection(detection_record)

        # Broadcast notifications for each detection
        for det in detections:
            await broadcast(det)

        # Clean up temporary file
        try:
            os.remove(file_location)
            print(f"🧹 Temporary file removed: {file_location}")
        except Exception as e:
            print(f"⚠️ Could not remove temp file: {e}")

        return {
            "status": "success", 
            "detections": detections,
            "message": f"Processed {len(detections)} detections",
            "image_id": str(detection_record.get("_id", "unknown"))
        }

    except Exception as e:
        print(f"❌ Upload error: {e}")
        return JSONResponse(
            status_code=500, 
            content={"error": f"Internal server error: {str(e)}"}
        )

# -------------------------
# WebSocket endpoint
# -------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await register(websocket)
    print("🔌 New WebSocket connection established")
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo back for testing
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        await unregister(websocket)
        print("🔌 WebSocket connection closed")


@app.get("/")
async def root():
    return {"message": "Backend is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AMC Backend API",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
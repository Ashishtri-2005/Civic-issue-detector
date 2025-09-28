# backend/notifications.py
import asyncio
import json
from datetime import datetime

clients = set()

# Department mapping for different detection classes
DEPARTMENT_MAPPING = {
    "pothole": "Roads Department",
    "fire": "Fire Department", 
    "waterlogging": "Drainage Department",
    "garbage": "Sanitation Department"
}

async def register(websocket):
    """Register a new WebSocket client"""
    clients.add(websocket)
    print(f"🔌 WebSocket client registered. Total clients: {len(clients)}")

async def unregister(websocket):
    """Unregister a WebSocket client"""
    clients.discard(websocket)
    print(f"🔌 WebSocket client unregistered. Total clients: {len(clients)}")

async def broadcast(message: dict):
    """Broadcast detection message to all connected WebSocket clients"""
    if not clients:
        return
        
    try:
        # Add timestamp and department to message
        department = DEPARTMENT_MAPPING.get(message.get("class"), "General Department")
        
        # Simplified message without confidence percentage
        simplified_message = {
            "class": message.get("class"),
            "department": department,
            "notification_timestamp": datetime.utcnow().isoformat(),
            "type": "detection_alert"
        }
        
        # Add age_days only for pothole
        if message.get("class") == "pothole" and message.get("age_days"):
            simplified_message["age_days"] = message.get("age_days")
        
        data = json.dumps(simplified_message)
        
        # Send to all connected clients
        await asyncio.gather(
            *[client.send_text(data) for client in clients],
            return_exceptions=True
        )
        
        print(f"📢 Broadcasted notification to {len(clients)} clients")
        
    except Exception as e:
        print(f"❌ Broadcast error: {e}")

async def send_system_notification(message: str):
    """Send system notification to all clients"""
    notification = {
        "type": "system_notification",
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    await broadcast(notification)
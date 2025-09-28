import { useEffect, useState } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

function Dashboard() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const ws = new ReconnectingWebSocket("ws://localhost:8000/ws");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "detection_alert") {
          setNotifications((prev) => [data, ...prev.slice(0, 49)]); // Keep last 50 notifications
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#1e3c72', marginBottom: '20px' }}>🚨 Live Detection Notifications</h2>
      <div style={{ 
        background: 'white', 
        borderRadius: '10px', 
        padding: '20px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No notifications yet</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notifications.map((n, i) => (
              <li key={i} style={{
                padding: '15px',
                marginBottom: '10px',
                background: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: `4px solid ${
                  n.class === 'fire' ? '#dc3545' : 
                  n.class === 'pothole' ? '#ffc107' : 
                  '#6c757d'
                }`
              }}>
                <div style={{ fontWeight: 'bold', color: '#1e3c72', textTransform: 'capitalize' }}>
                  🚨 {n.class} Detected
                </div>
                {n.age_days && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Age:</strong> {n.age_days} days
                  </div>
                )}
                <div style={{ marginTop: '5px', color: '#666' }}>
                  <strong>Department:</strong> {n.department}
                </div>
                <div style={{ fontSize: '0.8em', color: '#999', marginTop: '5px' }}>
                  {new Date(n.notification_timestamp).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
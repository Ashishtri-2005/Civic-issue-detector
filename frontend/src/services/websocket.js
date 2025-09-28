const BACKEND_WS_URL = "ws://127.0.0.1:8000/ws";

export const connectWebSocket = (onMessage) => {
  const ws = new WebSocket(BACKEND_WS_URL);

  ws.onopen = () => {
    console.log("Connected to WebSocket!");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data); // pass detected objects to dashboard
  };

  ws.onclose = () => console.log("WebSocket disconnected");
  ws.onerror = (err) => console.error("WebSocket error:", err);

  return ws;
};

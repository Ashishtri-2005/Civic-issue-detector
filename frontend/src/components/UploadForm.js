import { useState, useEffect, memo, useCallback } from "react";
import "./UploadForm.css";

// ✅ Self-contained Timestamp (no props, no parent re-render)
const Timestamp = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimestamp = (date) => {
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="timestamp">
      <div className="current-time">{formatTimestamp(time)}</div>
      <div className="timezone">IST (Mumbai)</div>
    </div>
  );
});
Timestamp.displayName = "Timestamp";

function UploadForm() {
  // ✅ State Management
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [ws, setWs] = useState(null);

  // ✅ WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket("ws://localhost:8000/ws");
        
        websocket.onopen = () => {
          console.log("✅ WebSocket connected");
          setWs(websocket);
        };
        
        websocket.onmessage = (event) => {
          console.log("📨 WebSocket message:", event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.type === "detection_alert") {
              // Simplified message without percentage
              if (data.class === "pothole") {
                const ageText = data.age_days ? ` - ${data.age_days} days old` : '';
                setStatus(prev => `🚨 Pothole detected${ageText}`);
              } else if (data.class === "fire") {
                setStatus(prev => `🚨 Fire detected`);
              } else {
                setStatus(prev => `🚨 ${data.class} detected`);
              }
            }
          } catch (e) {
            console.log("WebSocket message:", event.data);
          }
        };
        
        websocket.onclose = () => {
          console.log("🔌 WebSocket disconnected");
          setWs(null);
          // Attempt reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        websocket.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
        };
        
      } catch (error) {
        console.error("❌ WebSocket connection failed:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // ✅ Utility: Status class based on state
  const getStatusClass = useCallback(() => {
    if (status.includes("Uploading") || status.includes("Camera opened") || status.includes("Getting your location"))
      return "uploading";
    if (status.includes("successful") || status.includes("Detected") || status.includes("detected"))
      return "success";
    if (status.includes("failed") || status.includes("denied") || status.includes("Error")) return "error";
    return "";
  }, [status]);

  // ✅ File Upload Function
  const handleUpload = useCallback(
    async (selectedFile) => {
      if (!selectedFile) {
        setStatus("❌ Error: No file selected.");
        return;
      }

      console.log("📤 Starting upload process for file:", selectedFile.name);
      console.log("File type:", selectedFile.type);
      console.log("File size:", (selectedFile.size / 1024 / 1024).toFixed(2), "MB");

      if (!selectedFile.type.startsWith("image/")) {
        setStatus("❌ Error: Please select a valid image file.");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setStatus("❌ Error: File size too large. Please select an image under 10MB.");
        return;
      }

      let latitude = "";
      let longitude = "";

      try {
        setStatus("📍 Getting your location...");
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        latitude = position.coords.latitude.toString();
        longitude = position.coords.longitude.toString();
        console.log("📍 Location obtained:", latitude, longitude);
      } catch (err) {
        console.error("Geolocation error:", err);
        setStatus("⚠️ Location access denied. Uploading without location data...");
        // Continue without location
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("timestamp", new Date().toISOString());

      try {
        setStatus("📤 Uploading your report...");
        console.log("🔄 Sending request to backend...");

        const response = await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });

        console.log("✅ Response received. Status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Server error:", errorText);
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("📊 Response data:", data);

        if (data?.detections?.length > 0) {
          // Simplified detection message without percentages
          const detectedItems = data.detections.map((d) => {
            let item = d.class || "Unknown";
            if (d.class === "pothole" && d.age_days) {
              item += ` - ${d.age_days} days old`;
            }
            return item;
          });
          setStatus(`✅ Upload successful! Detected: ${detectedItems.join(", ")}`);
        } else {
          setStatus("✅ Upload successful! No specific issues detected. Thank you for reporting.");
        }
      } catch (err) {
        console.error("❌ Upload error:", err);
        if (err.name === "TypeError" && err.message.includes("fetch")) {
          setStatus("❌ Upload failed! Please check if the backend server is running and try again.");
        } else {
          setStatus(`❌ Upload failed! ${err.message}`);
        }
      }
    },
    []
  );

  // ✅ Camera Functions (remain the same)
  const openCamera = useCallback(async () => {
    try {
      setStatus("📷 Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      setShowCamera(true);
      setStatus("✅ Camera opened. Position your device and take a photo.");
    } catch (err) {
      console.error("Camera access error:", err);
      let errorMessage = "❌ Camera access denied. ";
      if (err.name === "NotFoundError") {
        errorMessage += "No camera found on this device.";
      } else if (err.name === "NotAllowedError") {
        errorMessage += "Please allow camera permissions and try again.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera is being used by another application.";
      } else {
        errorMessage += "Please check your camera and try again.";
      }
      setStatus(errorMessage);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setStatus("");
  }, [stream]);

  const capturePhoto = useCallback(() => {
    try {
      const video = document.getElementById("cameraVideo");
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        setStatus("❌ Error: Camera not ready. Please try again.");
        return;
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const capturedFile = new File([blob], `incident_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            console.log("📸 Photo captured:", capturedFile.name);
            closeCamera();
            handleUpload(capturedFile);
          } else {
            setStatus("❌ Error: Failed to capture photo. Please try again.");
          }
        },
        "image/jpeg",
        0.8
      );
    } catch (err) {
      console.error("Photo capture error:", err);
      setStatus("❌ Error: Failed to capture photo. Please try again.");
    }
  }, [closeCamera, handleUpload]);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      console.log("📁 File selected:", selectedFile.name);
      handleUpload(selectedFile);
    }
    event.target.value = "";
  };

  // ✅ Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="bmc-app">
      {/* Header */}
      <header className="bmc-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="bmc-logo">AMC</div>
            <div className="header-text">
              <h1>Ashish chi mumbai Municipal Corporation</h1>
              <p>Citizen Complaint Portal</p>
            </div>
          </div>
          <div className="header-right">
            <div className="emergency-number">
              <strong>Emergency: 108</strong>
              <span>Fire: 101</span>
            </div>
            <Timestamp />
            <div className="ws-status">
              WebSocket: {ws ? "✅ Connected" : "❌ Disconnected"}
            </div>
          </div>
        </div>
      </header>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal">
          <div className="camera-container">
            <div className="camera-header">
              <h3>📷 Take Incident Photo</h3>
              <p>Position your device and capture the incident</p>
            </div>
            <video
              id="cameraVideo"
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video && stream) video.srcObject = stream;
              }}
            />
            <div className="camera-controls">
              <button className="capture-btn" onClick={capturePhoto}>
                📸 Capture Photo
              </button>
              <button className="close-camera-btn" onClick={closeCamera}>
                ❌ Close Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="upload-form-container">
          <div className="form-header">
            <h2>Report an Incident</h2>
            <p className="form-subtitle">Help us keep Mumbai clean and safe</p>
          </div>

          <div className="info-box">
            <strong>📍 Location Required:</strong> Please allow location access
            for accurate incident reporting
          </div>

          <div className="upload-options">
            <button className="camera-btn" onClick={openCamera} disabled={showCamera}>
              <span className="btn-icon">📷</span>
              Take Photo
            </button>

            <label className="upload-btn">
              <span className="btn-icon">📁</span>
              Upload Image
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {status && (
            <div className={`status-message ${getStatusClass()}`}>
              {status}
            </div>
          )}

          <div className="guidelines">
            <h4>📋 Reporting Guidelines:</h4>
            <ul>
              <li>Take clear photos of the incident</li>
              <li>Ensure your safety while taking photos</li>
              <li>Include surrounding landmarks if possible</li>
              <li>Report genuine issues only</li>
              <li>Maximum file size: 10MB</li>
              <li>Supported formats: JPG, PNG, WEBP</li>
            </ul>
          </div>

          <div className="debug-info">
            <h4>🔧 System Status:</h4>
            <ul>
              <li>Backend API: <span id="api-status">Checking...</span></li>
              <li>WebSocket: {ws ? "✅ Connected" : "❌ Disconnected"}</li>
              <li>Camera: {showCamera ? "✅ Active" : "✅ Ready"}</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bmc-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#services">Our Services</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#about">About AMC</a></li>
              <li><a href="#help">Help & FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact Information</h4>
            <p>📧 complaints@Ashishchimumbai.gov.in</p>
            <p>📞 +91-22-2266-9999</p>
            <p>📍 Mumbai, Maharashtra 400001</p>
          </div>
          <div className="footer-section">
            <h4>Emergency Services</h4>
            <p>🚨 Police: 100</p>
            <p>🚒 Fire Brigade: 101</p>
            <p>🏥 Ambulance: 108</p>
            <p>⚡ Electricity: 1912</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Ashish chi Municipal Corporation. All rights reserved.</p>
          <p>Serving Mumbai with dedication since 2005</p>
        </div>
      </footer>
    </div>
  );
}

export default UploadForm;
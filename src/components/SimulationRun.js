import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./SimulationRun.css"

const SimulationRun = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null); // Store socket in state

  function getSessionId() {
    const cookies = document.cookie.split(';');
    for (let i=0; i<cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('session=')) {
        return cookie.substring('session='.length);
      }
    }
    return null;
  }

  useEffect(() => {
    const newSocket = io("https://d820-138-250-27-20.ngrok-free.app ");
    

    const sessionId = getSessionId();

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      newSocket.emit("start_simulation", {
        session_id: sessionId
      }); // Trigger simulation on connect


    });

    newSocket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    setSocket(newSocket); // Save socket instance

    return () => {
      newSocket.disconnect();
      console.log("WebSocket cleanup: Disconnected on component unmount");
    };
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch("https://d820-138-250-27-20.ngrok-free.app /download-zip");
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation.zip"; // Change filename if needed
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading the file:", error);
    }
  };

  const handleClose = () => {
    if (socket) {
      socket.disconnect();
      console.log("WebSocket explicitly disconnected on close button click");
    }
    onClose(); // Close the popup
  };

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2>VFP Simulation Running</h2>
        <div className="message-box">
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <div className="btn-grp">
          <button onClick={handleDownload} className="download-button">
            Download Simulation Files
          </button>

          <button onClick={handleClose} className="close-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationRun;


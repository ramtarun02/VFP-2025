import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./SimulationRun.css"
import { useContext } from "react";
import FormDataContext from "./FormDataContext";

const SimulationRun = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null); // Store socket in state
  const { formData } = useContext(FormDataContext);
 
  useEffect(() => {
    if (!formData) {
      console.error("Error: No form data available in SimulationRun component.");
      return;
    }

    const newSocket = io("http://localhost:5001", {
      transports: ["websocket"], // Ensure WebSocket connection is used
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");

      // Convert FormData to a plain object
      const formObject = Object.fromEntries(formData.entries());

      newSocket.emit("start_simulation", formObject);
    });

    newSocket.on("message", (data) => {
      console.log("Message from server:", data);
      setMessages((prev) => [...prev, data]); // Store received messages
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      console.log("WebSocket cleanup: Disconnected on component unmount");
    };
  }, [formData]);


  const handleDownload = async () => {
    

    if (!formData) {
      console.error("Error: No form data available in SimulationRun component.");
      return;
    }

   // Convert FormData to a plain object
      const formObject = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("http://localhost:5001/download-zip", {
        method: "POST",
        body: formObject, // Send entire form data
      });

   
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formObject.simName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Download error:", error);
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


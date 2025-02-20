import React, { useState, useEffect } from "react";
import "./SimulationRun.css";
import { io } from 'socket.io-client';


const SimulationRun = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const socket = io("https://c7b8-138-250-27-38.ngrok-free.app");
  useEffect(() => {
  socket.on("connect", () => {
    console.log("WebSocket connected");
    socket.emit("start_simulation"); // Trigger simulation on connect
  });

  socket.on("message", (data) => {
    setMessages((prev) => [...prev, data]);
  });

  socket.on("disconnect", () => {
    console.log("WebSocket disconnected");
  });

  return () => {
    socket.disconnect();
  };
}, []);

const handleDownload = async () => { 
  try {             
        const response = await fetch('https://c7b8-138-250-27-38.ngrok-free.app/download-zip');
        if (!response.ok) {
            throw new Error('Failed to download file');
            }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simulation.zip'; // Change filename if needed
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); 
    } catch (error) {
        console.error('Error downloading the file:', error); 
    } 
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
          <button onClick={handleDownload} className="download-button"> Download Simulation Files </button>

          <button onClick={onClose} className="close-button">Close</button>
        </div>  
      </div>
    </div>
  );
};

export default SimulationRun;


import React, { useState, useEffect } from "react";
import "./SimulationRun.css";
import { io } from 'socket.io-client';


const SimulationRun = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const socket = io("http://localhost:5001");
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



  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2>VFP Simulation Running</h2>
        <div className="message-box">
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <button onClick={onClose} className="close-button">Close</button>
      </div>
    </div>
  );
};

export default SimulationRun;


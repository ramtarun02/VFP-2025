import { useState, useEffect, useRef } from "react";
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

    const newSocket = io("http://127.0.1:5000");

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

    newSocket.on("download_ready", ({ fileData, simName }) => {
      if (fileData) {
      const blob = new Blob([fileData], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${simName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
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


  const handleDownload = () => {
    if (!formData) {
      console.error("Error: No form data available in SimulationRun component.");
      return;
    }

    const formObject = Object.fromEntries(formData.entries());
    const simName = formObject.simName;
    if (!simName) {
      console.error("Error: Simulation name is missing in form data.");
      return;
    }

    if (socket) {
      socket.emit("download", { simName });
      console.log("Download request sent via WebSocket");
    }
  };


  const messageBoxRef = useRef(null);
  useEffect(() => {
    // Scroll to the bottom whenever the messages change
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]); // Trigger scroll when messages change


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
        <div className="message-box" ref={messageBoxRef}>
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


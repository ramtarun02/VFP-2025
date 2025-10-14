import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useContext } from "react";
import FormDataContext from "./FormDataContext";
import "./SimulationRun.css";

import { createSocket } from '../utils/socket';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SimulationRun = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [residualData, setResidualData] = useState({
    iterations: [],
    residuals: [],
  });
  const [simulationName, setSimulationName] = useState(""); // Store simulation name locally
  const { formData } = useContext(FormDataContext);
  const messageBoxRef = useRef(null);

  // Parse residual data from messages
  const parseResidualData = (message) => {
    // Pattern to match the format: [number] [iteration] [residual]
    // Handles both spaced and non-spaced negative residuals
    const residualPattern = /^\s*\d+\s+(\d+)\s*(-?[\d.e-]+)\s*$/i;

    const match = message.match(residualPattern);

    if (match) {
      const iteration = parseInt(match[1]);
      const residual = parseFloat(match[2]);

      // Only add valid numeric values
      if (!isNaN(iteration) && !isNaN(residual)) {
        setResidualData(prev => ({
          iterations: [...prev.iterations, iteration],
          residuals: [...prev.residuals, Math.abs(residual)], // Use absolute value for log scale
        }));
      }
    }
  };

  useEffect(() => {
    if (!formData) {
      console.error("Error: No form data available in SimulationRun component.");
      return;
    }

    const newSocket = createSocket({
      pingTimeout: 300000,  // 5 minutes
      pingInterval: 60000   // 1 minute
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      const formObject = Object.fromEntries(formData.entries());

      // Store simulation name locally for later use
      const simName = formObject.simName;
      setSimulationName(simName);
      console.log("Stored simulation name:", simName);

      newSocket.emit("start_simulation", formObject);
    });

    newSocket.on("message", (data) => {
      // console.log("Message from server:", data);
      setMessages((prev) => [...prev, data]);
      parseResidualData(data); // Parse for residual data
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

    newSocket.on("simulation_folder_ready", (folderData) => {
      console.log("Simulation folder data received:", folderData);

      if (folderData && folderData.success) {
        // Navigate to post processing with the folder data
        navigate('/post-processing', {
          state: {
            simulationFolder: folderData.data,
            simName: folderData.simName
          }
        });
      } else {
        console.error('Failed to get simulation folder data:', folderData?.error || 'Unknown error');
        alert('Failed to export simulation data. Please try again.');
      }
    });

    // Handle errors from socket events
    newSocket.on("error", (errorData) => {
      console.error("Socket error:", errorData);
      if (errorData.type === 'simulation_folder_error') {
        alert('Error exporting simulation data: ' + (errorData.message || 'Unknown error'));
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
  }, [formData, navigate]);

  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDownload = () => {
    if (!simulationName) {
      console.error("Error: Simulation name not available.");
      alert("Simulation name not available. Please restart the simulation.");
      return;
    }

    if (socket) {
      socket.emit("download", { simName: simulationName });
      console.log("Download request sent via WebSocket");
    }
  };

  const handleExportToVFPPost = () => {
    if (!simulationName) {
      console.error("Error: Simulation name not available.");
      alert("Simulation name not available. Please restart the simulation.");
      return;
    }

    if (socket) {
      console.log("Requesting simulation folder via WebSocket for:", simulationName);
      // Emit socket request to get simulation folder data
      socket.emit("get_simulation_folder", { simName: simulationName });
    } else {
      console.error("Socket connection not available");
      alert('Connection error. Please try again.');
    }
  };

  const handleClose = () => {
    if (socket) {
      socket.disconnect();
      console.log("WebSocket explicitly disconnected on close button click");
    }
    navigate(-1); // Go back to previous page
  };

  // Chart configuration
  const chartData = {
    labels: residualData.iterations,
    datasets: [
      {
        label: "Residuals",
        data: residualData.residuals,
        borderColor: "rgba(243, 33, 33, 1)", // Blue theme
        backgroundColor: "rgba(33, 150, 243, 0.1)", // Blue theme
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#1565c0", // Blue theme
        },
      },
      title: {
        display: true,
        text: "Residuals vs Iterations",
        color: "#1565c0", // Blue theme
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Iterations",
          color: "#000000ff", // Blue theme
        },
        ticks: {
          color: "#000000ff", // Blue theme
        },
        grid: {
          color: "rgba(33, 150, 243, 0.1)", // Blue theme
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Residuals",
          color: "#000000ff", // Blue theme
        },
        type: "linear",
        min: -0.005,
        ticks: {
          color: "#000000ff" // Black
        },
        grid: {
          color: "rgba(33, 150, 243, 0.1)", // Blue theme
        },
      },
    },
    animation: {
      duration: 200, // Faster animation for real-time updates
    },
  };

  return (
    <div className="simulation-page-container">
      <div className="simulation-header">
        <h1>VFP Simulation Running - {simulationName}</h1>
        <div className="header-buttons">
          <button onClick={handleDownload} className="download-button">
            Download Files
          </button>
          <button onClick={handleExportToVFPPost} className="export-post-button">
            Export to VFP Post
          </button>
          <button onClick={handleClose} className="close-button">
            Close
          </button>
        </div>
      </div>

      <div className="simulation-content">
        <div className="console-section">
          <h2>Console Output</h2>
          <div className="message-box" ref={messageBoxRef}>
            {messages.map((msg, index) => (
              <p key={index}>{msg}</p>
            ))}
          </div>
        </div>

        <div className="chart-section">
          <h2>Residuals Chart</h2>
          <div className="chart-container">
            {residualData.iterations.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="no-data-message">
                Waiting for residual data...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationRun;
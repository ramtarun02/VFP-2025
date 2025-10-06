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

const SimulationRunPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [residualData, setResidualData] = useState({
    iterations: [],
    residuals: [],
  });
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

    const newSocket = io("http://127.0.0.1:5000");

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      const formObject = Object.fromEntries(formData.entries());
      newSocket.emit("start_simulation", formObject);
    });

    newSocket.on("message", (data) => {
      console.log("Message from server:", data);
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

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      console.log("WebSocket cleanup: Disconnected on component unmount");
    };
  }, [formData]);

  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleExportToVFPPost = async () => {
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

    try {
      // Request simulation folder data from server
      const response = await fetch('http://127.0.0.1:5000/get-simulation-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ simName }),
      });

      if (response.ok) {
        const folderData = await response.json();

        // Navigate to post processing with the folder data
        navigate('/post-processing', {
          state: {
            simulationFolder: folderData,
            simName: simName
          }
        });
      } else {
        console.error('Failed to get simulation folder data');
        alert('Failed to export simulation data. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting to VFP Post:', error);
      alert('Error exporting simulation data. Please try again.');
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
        borderColor: "rgba(255, 70, 70, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
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
      },
      title: {
        display: true,
        text: "Residuals vs Iterations",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Iterations",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Residuals",
        },
        type: "logarithmic",
        min: 1e-10, // Set minimum value for log scale
      },
    },
    animation: {
      duration: 200, // Faster animation for real-time updates
    },
  };

  return (
    <div className="simulation-page-container">
      <div className="simulation-header">
        <h1>VFP Simulation Running</h1>
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

export default SimulationRunPage;
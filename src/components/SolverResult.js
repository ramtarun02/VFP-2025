import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SolverResult.css"; // Import the CSS file

const Results = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result || {};

    return (
        <div className="results-container">
            <h1 className="results-title">Simulation Results</h1>

            <div className="results-section">
                <h2>Simulation Parameters</h2>
                <div className="result-item">
                    <span className="result-label">Mach Number:</span>
                    <span className="result-value">{result.user_inputs?.mach}</span>
                </div>
                <div className="result-item">
                    <span className="result-label">Angle of Attack:</span>
                    <span className="result-value">{result.user_inputs?.aoa}</span>
                </div>
                <div className="result-item">
                    <span className="result-label">Reynolds Number:</span>
                    <span className="result-value">{result.user_inputs?.reynolds}</span>
                </div>
            </div>

            <div className="results-section">
                <h2>Boolean Parameters</h2>
                {["Continuation", "Excrescence", "AutoRunner", "Map File", "Geometry File", "Flow File"].map(
                    (key) => (
                        <div key={key} className="result-item">
                            <span className="result-label">{key.replace(/([A-Z])/g, " $1")}</span>
                            <span className="result-value">
                                {result.user_inputs?.[key] ? "✔️ Yes" : "❌ No"}
                            </span>
                        </div>
                    )
                )}
            </div>

            <div className="results-section">
                <h2>Uploaded Files</h2>
                <ul className="files-list">
                    {result.uploaded_files
                        ? Object.values(result.uploaded_files).map((file, index) => (
                              <li key={index} className="file-item">{file}</li>
                          ))
                        : <li>No files uploaded</li>}
                </ul>
            </div>

            <a href="/" className="back-button">Go Back</a>
        </div>
    );
};

export default Results;


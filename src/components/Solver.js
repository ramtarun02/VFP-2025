import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Solver.css"; // Import the CSS file

const Results = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result || {};

    const handleRunSimulation = () => {
        navigate("/simulation-run", { state: { result } });
    };

    return (
        <div className="results-container">
            <h1 className="results-title">Simulation Parameters</h1>

            <div className="results-section">
                <div className="result-item">
                    <span className="result-label">Simulation Name:</span>
                    <span className="result-value">{result.user_inputs?.simName}</span>
                </div>

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

                {["Continuation Run", "Excrescence Run", "AutoRunner", "Map File Imported", "Geometry File Imported", "Flow File Imported"].map(
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

            <div className="start-btn">
                <button className="sim-button" onClick={handleRunSimulation}>
                    <span>Run VFP Simulation</span>
                </button>
            </div>

            <button className="back-button" onClick={() => navigate("/run-solver")}>Go Back</button>
        </div>
    );
};

export default Results;
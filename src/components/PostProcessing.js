import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PostProcessing.css"; // Import the CSS file

function PostProcessing() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/propeller-wing-form");
  };

  return (
    <div className="module-page">
      <h1>Post Processing Module</h1>
      <p>This module provides visualization and analysis of the solver results.</p>
      <button className="propeller-button" onClick={handleClick}>
        ProWiM
      </button>
      <button className="back-link" onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );
}

export default PostProcessing;


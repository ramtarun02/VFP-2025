import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-container">
      <div className="logo-container">
        <img src="cranfield-logo.svg" alt="Cranfield University Logo" className="logo" />
      </div>

      <h1 className="title">Viscous Full Potential Flow Solver</h1>

      <div className="modules-grid">
        <Link to="/geometry" className="module">
          <img src="Geometry.png" alt="Geometry Module" className="module-image" />
          <p className="module-title">GEOMETRY MODULE</p>
        </Link>

        <Link to="/run-solver" className="module">
          <img src="solver.PNG" alt="Run VFP Solver" className="module-image" />
          <p className="module-title">RUN VFP SOLVER</p>
        </Link>

        <Link to="/post-processing" className="module">
          <img src="postprocess.png" alt="Post Processing Module" className="module-image" />
          <p className="module-title">POST PROCESSING MODULE</p>
        </Link>
      </div>

      <p className="footer-text">Developed by the Applied Aerodynamics Group</p>
    </div>
  );
}

export default LandingPage;


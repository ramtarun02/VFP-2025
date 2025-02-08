import React from "react";
import { Link } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <div className="landing-container">
      <h1 className="title">Viscous Full Potential Flow Solver</h1>
      
      {/* Placeholder for Main Image */}
      {/* <div className="main-image-container"> */}
      {/*   <img src="/path/to/main-image.png" alt="Main Model" className="main-image" /> */}
      {/* </div> */}
      {/*  */}
      {/* Cranfield University Logo & Instructions Button */}
      <div className="logo-container">
        <img src="cranfield-logo.svg" alt="Cranfield University Logo" className="logo" />
        {/*<button className="instructions-button">Instructions/Manual</button>*/}
      </div>
      
      {/* Module Sections */}
      <div className="modules-grid">
        {/* Geometry Module */}
        <Link to="/geometry" className="module">
          <img src="Geometry.png" alt="Geometry Module" className="module-image" />
          <p className="module-title">GEOMETRY MODULE</p>
        </Link>
        
        {/* Run VFP Solver */}
        <Link to="/run-solver" className="module">
          <img src="solver.PNG" alt="Run VFP Solver" className="module-image" />
          <p className="module-title">RUN VFP SOLVER</p>
        </Link>
        
        {/* Post Processing Module */}
        <Link to="/post-processing" className="module">
          <img src="postprocess.png" alt="Post Processing Module" className="module-image" />
          <p className="module-title">POST PROCESSING MODULE</p>
        </Link>
      </div>
      
      {/* Footer */}
      <p className="footer-text">Developed by the Applied Aerodynamics Group</p>
    </div>
  );
};


export default App;


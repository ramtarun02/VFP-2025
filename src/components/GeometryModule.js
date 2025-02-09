import React from "react";
import { Link } from "react-router-dom";


function GeometryModule() {
  return (
    <div className="module-page">
      <h1>Geometry Module</h1>
      <p>This module helps in defining and visualizing the geometry for the solver.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default GeometryModule;


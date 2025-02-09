import React from "react";
import { Link } from "react-router-dom";

function PostProcessing() {
  return (
    <div className="module-page">
      <h1>Post Processing Module</h1>
      <p>This module provides visualization and analysis of the solver results.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default PostProcessing;


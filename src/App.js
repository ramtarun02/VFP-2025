import React from "react";
import { BrowserRouter as Routers, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GeometryModule from "./components/GeometryModule";
import RunSolver  from "./components/RunSolver";
import SolverResult from "./components/SolverResult"
import PostProcessing from "./components/PostProcessing";

function App() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/geometry" element={<GeometryModule />} />
        <Route path="/run-solver" element={<RunSolver />} />
        <Route path="/results" element={<SolverResult />} />
        <Route path="/post-processing" element={<PostProcessing />} />
    </Routes>
  );
}

export default App;


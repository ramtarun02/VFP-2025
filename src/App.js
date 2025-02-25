import React from "react";
import { BrowserRouter as Routers, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GeometryModule from "./components/GeometryModule";
import RunSolver from "./components/runSolver/runSolver";
import Solver from "./components/Solver"
import PostProcessing from "./components/PostProcessing";
import { FormDataProvider } from "./components/FormDataContext";

function App() {
  return (
    <FormDataProvider> 
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/geometry" element={<GeometryModule />} />
          <Route path="/run-solver" element={<RunSolver />} />
          <Route path="/results" element={<Solver />} />
          <Route path="/post-processing" element={<PostProcessing />} />
      </Routes>
    </FormDataProvider>
  );
}

export default App;


 // import logo f▏rom './logo.svg';
import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "./RunSolver.css";


function RunSolver() {
  const [mach, setMach] = useState("");
  const [aoa, setAoA] = useState("");
  const [reynolds, setReynolds] = useState("");
  const [continuation, setContinuation] = useState(false);
  const [excrescence, setExcrescence] = useState(false);
  const [autoRunner, setAutoRunner] = useState(false);
  const [mapImported, setMapImported] = useState(false);
  const [geoImported, setGeoImported] = useState(false);
  const [datImported, setDatImported] = useState(false);
  const navigate = useNavigate();


  const handleSubmit = async () => {
    console.log("Form Data Submitted:", {mach, aoa, reynolds, continuation, excrescence}); // ✅ Debugging: See form data before sending

    try {
      const response = await fetch("http://127.0.0.1:5000/run-vfp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({mach, aoa, reynolds, continuation, excrescence}),
      });

      const result = await response.json();
      console.log("Server Response:", result);
      navigate("/results", { state: { result } }); // ✅ Navigate to new page with response
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };


  return (
    <div className="container">
      <div class="merged-container"> 
        <div className="top-panel">
          <button className="back-button"  onClick={() => navigate("/")}>Back to Main Module</button>
          <button className="import-button">Import Files</button>

          <div className="checkbox-group-1">
            <label>
              <input type="checkbox" checked={geoImported} readOnly />
              GEO Imported
            </label>
            <label>
              <input type="checkbox" checked={mapImported} readOnly/>
              MAP Imported
            </label>
            <label>
              <input type="checkbox" checked={datImported} readOnly/>
              DAT Imported
            </label>
          </div>
        </div>
        

        <div class="title-solver"> Flow Conditions and Solver Parameters</div>


        <div className="card">
          <div className="input-group">
            <label>Mach Number</label>
              <input value={mach} onChange={(e) => setMach(e.target.value)} />
          
            <label>Angle of Attack</label>
              <input value={aoa} onChange={(e) => setAoA(e.target.value)} />
          
            <label>Reynolds Number</label>
              <input value={reynolds} onChange={(e) => setReynolds(e.target.value)} />
          </div>

          <div className="checkbox-group-2">

            <label>
              <input type="checkbox" checked={excrescence} onChange={() => {setExcrescence(!excrescence); console.log("Excrescence Run:", !excrescence)}} />
              Excrescence Run
            </label>
          
            <label>
              <input type="checkbox" checked={continuation} onChange={() => {setContinuation(!continuation); console.log("Continuation Run:", !continuation)}} />
              Continuation Run
            </label>
          
            <label>
              <input type="checkbox" checked={autoRunner} onChange={() => setAutoRunner(!autoRunner)} />
              Auto-Runner
            </label>
          </div>

          <div className="button-group">
            <button className="run-button" onClick={handleSubmit} ><span>Run VFP </span></button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default RunSolver;

















// import logo from './logo.svg';
import { useState } from "react";
import "./App.css";

export default function App() {
  const [mach, setMach] = useState("");
  const [aoa, setAoA] = useState("");
  const [reynolds, setReynolds] = useState("");
  const [continuation, setContinuation] = useState(false);
  const [autoRunner, setAutoRunner] = useState(false);
  const [mapImported, setMapImported] = useState(false);
  const [geoImported, setGeoImported] = useState(false);
  const [datImported, setDatImported] = useState(false);



  return (
    <div className="container">
      <div className="left-panel">
        <button className="back-button">Back to Main Module</button>
        <button className="import-button">Import Files</button>
        <div className="checkbox-group-1">
         <label>
            <input type="checkbox" checked={geoImported} onChange={() => setGeoImported(!geoImported)} />
            GEO Imported
          </label>
          <label>
            <input type="checkbox" checked={mapImported} onChange={() => setMapImported(!mapImported)} />
            MAP Imported
          </label>
          <label>
            <input type="checkbox" checked={datImported} onChange={() => setDatImported(!datImported)} />
            DAT Imported
          </label>
        </div>
      </div>
      <div className="card">
        <h2>Flow Conditions and Solver Parameters</h2>
        
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
            <input type="checkbox" checked={continuation} onChange={() => setContinuation(!continuation)} />
            Continuation Run
          </label>
          
          <label>
            <input type="checkbox" checked={autoRunner} onChange={() => setAutoRunner(!autoRunner)} />
            Auto-Runner
          </label>
        </div>

        <div className="button-group">
          <button className="run-button"><span>Run VFP </span></button>
        </div>
      </div>
    </div>
  );
}


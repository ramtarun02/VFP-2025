import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Move, RotateCw } from 'lucide-react';
import "./GeometryModule.css"

function App() {
  const [viewMode, setViewMode] = useState('X-Y View');
  
  return (
    <div className="app">
      <header className="header">
        <div className="header-group">
          <button className="btn btn-primary">Back to Main Module</button>
          <button className="btn btn-secondary">FPCON</button>
          <button className="btn btn-secondary">Import file</button>
        </div>
        <h1 className="title">Geometry Module</h1>
        <div className="header-group">
          <button className="btn btn-secondary">Export GEO file</button>
          <button className="btn btn-secondary">Save plots</button>
          <button className="btn btn-danger">Reset</button>
        </div>
      </header>

      <div className="main-content">
        <div className="graph-container">
          <div className="graph-panel">
            <div className="graph-controls">
              <button className="tool-btn" title="Move"><Move size={16} /></button>
              <button className="tool-btn" title="Rotate"><RotateCw size={16} /></button>
              <button className="tool-btn" title="Zoom In"><ZoomIn size={16} /></button>
              <button className="tool-btn" title="Zoom Out"><ZoomOut size={16} /></button>
            </div>


            {/* <div className="graph-canvas"> */}
              {/* Graph would be rendered here */}
            {/* </div> */}
            {/* <div className="graph-canvas"> */}
              {/* Graph would be rendered here */}
            {/* </div> */}


          </div>
        </div>

        <div className="controls-panel">
          <div className="controls-container">
            <h2 className="controls-title">Controls</h2>
            
            <table className="parameters-table">
              <thead>
                <tr>
                  <th className="text-left">Parameter</th>
                  <th>Baseline</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {['Twist', 'Dihedral', 'YSECT', 'XLE', 'XTE', 'Chord'].map((param) => (
                  <tr key={param}>
                    <td>{param}</td>
                    <td><input type="text" className="input-field" /></td>
                    <td><input type="text" className="input-field" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="computation-controls">
              <button className="btn btn-primary">Compute Desired</button>
              <button className="btn btn-primary">Compute Global (b)</button>
            </div>

            <div className="improve-section">
              <h3 className="improve-title">Improve</h3>
              <div className="improve-options">
                <div className="radio-group">
                  <label>
                    <input type="radio" name="improve" defaultChecked />
                    <span>Twist</span>
                  </label>
                </div>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="improve" />
                    <span>Dihedral</span>
                  </label>
                </div>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="improve" />
                    <span>XLE</span>
                  </label>
                </div>
                
                <div className="sections-input">
                  <span>Sections:</span>
                  <input type="text" className="input-field" defaultValue="1" />
                  <span>To</span>
                  <input type="text" className="input-field" defaultValue="2" />
                </div>
                
                <div className="value-input">
                  <span>a =</span>
                  <input type="text" className="input-field" defaultValue="0" />
                </div>

                <button className="btn btn-primary btn-improve">Improve</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

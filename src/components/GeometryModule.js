import React, { useState } from 'react';
import Plot3D from './Plot3D'; // Import the 3D plotting component
import "./GeometryModule.css";

function GeometryModule() {
  const [plotDataState, setPlotDataState] = useState(null);
  const [sections, setSections] = useState([]); // Dropdown options
  const [selectedSection, setSelectedSection] = useState(-1); // Default to "3D Wing"


  // Handle file upload and fetch data from backend
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.1:5000/import-geo', {
        method: 'POST',
        body: formData,
      });

      const plotData = await response.json();
      console.log("Received Plotly Data:", plotData);

      // Store plot data directly from response
      if (plotData.plotData) {
        setPlotDataState(plotData.plotData);
        setSections(["3D Wing", ...Array.from({ length: (plotData.plotData.length-1) / 3 }, (_, i) => `Section ${i + 1}`), "Twist Distribution"]);
        setSelectedSection(-1); // Default to "3D Wing"
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSectionChange = (event) => {
    const sectionIndex = parseInt(event.target.value);
    if (sections[sectionIndex + 2] === "Twist Distribution") {
      console.log("selected Option", selectedSection)
      setSelectedSection(-2);
      console.log("Value Updated", selectedSection, plotDataState[plotDataState.length -1])
      
    } else {
      setSelectedSection(sectionIndex);
        }
    };

  return (
    <div className="app">
      <header className="header">
        <div className="header-group">
          <button className="btn btn-primary">Back to Main Module</button>
          <button className="btn btn-secondary">FPCON</button>

          <div className='btn btn-secondary'>
            <input
              type="file"
              accept=".GEO"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="fileInput"
            />
            <button onClick={() => document.getElementById('fileInput').click()} style={{ border: 'none' }}>
              Upload GEO File
            </button>
          </div>
        </div>

        <div className="header-group">
          <button className="btn btn-secondary">Export GEO file</button>
          <button className="btn btn-secondary">Save plots</button>
          <button className="btn btn-danger">Reset</button>
        </div>
      </header>

      <div className="main-content">
        <div className="graph-container">
          <div className="graph-panel">
            {/* Single Dropdown for selecting sections */}
            {sections.length > 0 && (
              <div className="dropdown-container">
                <label htmlFor="section-select">Section: </label>
                  <select id="section-select" onChange={handleSectionChange} 
                    value={selectedSection === -2 ? sections.length - 1 : selectedSection}>
                      {sections.map((section, index) => (
                      <option key={index} value={index - 1}>
                        {section}
                      </option>
                    ))}
                  </select>
                  
              </div>
            )}

            {/* Render Plot3D with selected section OR all sections */}
            {plotDataState && (
              <Plot3D 
                plotData = {(selectedSection === -1) ? plotDataState.slice(0,-1) : [plotDataState[selectedSection * 3], plotDataState[selectedSection * 3 + 1], plotDataState[selectedSection*3 +2]]}
                selectedSection={selectedSection} 
              />

            )}
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

export default GeometryModule;


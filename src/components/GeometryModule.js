import React, { useState } from 'react';
import Plot3D from './Plot3D'; // Import the 3D plotting component
import "./GeometryModule.css";
import { useNavigate } from "react-router-dom";


function GeometryModule() {
  const [geoData, setGeoData] = useState(null);
  const [plotDataState, setPlotDataState] = useState(null);
  const [sections, setSections] = useState([]); // Dropdown options
  const [selectedSection, setSelectedSection] = useState(-1); // Default to "3D Wing"
  const [parameters, setParameters] = useState({});
  const [modifiedParameters, setModifiedParameters] = useState({});
  const navigate = useNavigate();

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

      const { geoData, plotData } = await response.json();
      console.log("Received Data:", { geoData, plotData });

      if (plotData) {
        setGeoData(geoData);
        setPlotDataState(plotData);
        setSections(["3D Wing", ...geoData.map((_, i) => `Section ${i + 1}`), "Twist Distribution"]);
        setSelectedSection(-1);
      }
   } catch (error) {
      console.error('Error uploading file:', error);
    }
  };



  const handleSectionChange = (event) => {
    const sectionIndex = parseInt(event.target.value);
    if (sections[sectionIndex + 1] === "Twist Distribution") {
      setSelectedSection(-2);
    } else {
      setSelectedSection(sectionIndex);
      updateParameters(sectionIndex);

    }
  };

  const updateParameters = (sectionIndex) => {
    if (sectionIndex === -1) {
      setParameters({
        Twist: '',
        Dihedral:'',
        YSECT: '',
        XLE: '',
        XTE: '',
        Chord: '',
      });
    }
 
    if (geoData && geoData[sectionIndex]) {
      setParameters({
        Twist: geoData[sectionIndex].TWIST,
        Dihedral: geoData[sectionIndex].HSECT,
        YSECT: geoData[sectionIndex].YSECT,
        XLE: geoData[sectionIndex].G1SECT,
        XTE: geoData[sectionIndex].G2SECT,
        Chord: (geoData[sectionIndex].G2SECT - geoData[sectionIndex].G1SECT),
      });
    }
  };

  const handleParameterChange = (param, value) => {
    setModifiedParameters(prev => ({ ...prev, [param]: value }));
  };







    const plot_trace = (sectionIndex) => {
    if (!plotDataState) return [];
    
    if (sectionIndex === -1) { // "3D Wing" selected
      return plotDataState.flatMap((sectionData, index) => (
        [
          { x: sectionData.xus, y: sectionData.y,  z: sectionData.zus, type: 'scatter3d', mode: 'lines', name: `Upper Trace - Section ${index + 1}`, line: {'color': 'red', 'width': 6}},
          { x: sectionData.xls, y: sectionData.y,  z: sectionData.zls, type: 'scatter3d', mode: 'lines', name: `Lower Trace - Section ${index + 1}`, line: {'color': 'blue', 'width': 6} }
        ]
      ));
    }
    
    if (sectionIndex === -2) { // "Twist Distribution" selected
      return [
        { x: plotDataState.map((_, i) => i + 1), y: plotDataState.map(section => section.twist), type: 'scatter', mode: 'lines+markers', name: 'Twist Distribution' }
      ];
    }  


    const sectionData = plotDataState[sectionIndex] || {};
    

    return [
      { x: sectionData.xus, y: sectionData.zus, type: 'scatter', mode: 'lines', name: `Upper Surface - Section ${sectionIndex + 1}` , line: {'color': 'blue', 'width': 3} },
      { x: sectionData.xls, y: sectionData.zls, type: 'scatter', mode: 'lines', name: `Lower Surface - Section ${sectionIndex + 1}` , line: {'color': 'blue', 'width': 3} }
    ];
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-group">
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Main Module</button>
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
          <button className="btn btn-danger" onClick={ () => window.location.reload(false)}>Reset</button>
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
                    value={selectedSection === -2 ? sections.length   : selectedSection}>
                      {sections.map((section, index) => (
                      <option key={index} value={index-1}>
                        {section}
                      </option>
                    ))}
                  </select>
                  
              </div>
            )}

            {/* Render Plot3D with selected section OR all sections */}
            {plotDataState && (
              <Plot3D 
                plotData =  {plot_trace(selectedSection)} selectedSection={selectedSection} 
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
                {Object.entries(parameters  || { Twist: 0.0, Dihedral: 0.0, YSECT: 0.0, XLE: 0.0, XTE: 0.0, Chord: 0.0 }).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td><input type="text" className="input-field" value= {value} readOnly /></td>
                    <td><input type="text" className="input-field" onChange={(e) => handleParameterChange(key, e.target.value)}/></td>
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


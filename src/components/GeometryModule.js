import React, { useState } from 'react';
import Plot3D from './Plot3D';
import Plot2D from './Plot2D';
import "./GeometryModule.css";
import { useNavigate } from "react-router-dom";

function GeometryModule() {
  const [geoData, setGeoData] = useState(null);
  const [newgeoData, setnewGeoData] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [newplotData, setnewPlotData] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(-1);
  const [parameters, setParameters] = useState({});
  const [modifiedParameters, setModifiedParameters] = useState({});
  const [selected2DPlot, setSelected2DPlot] = useState("");
  const navigate = useNavigate();

  // File upload handler
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

      if (plotData) {
        setGeoData(geoData);
        setPlotData(plotData);
        setSections(["3D Wing", ...geoData.map((_, i) => `Section ${i + 1}`)]);
        setSelectedSection(-1);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSectionChange = (event) => {
    const sectionIndex = parseInt(event.target.value);
    setSelectedSection(sectionIndex);
    updateParameters(sectionIndex);
    setSelected2DPlot("");
  };

  const updateParameters = (sectionIndex) => {
    if (sectionIndex === -1) {
      setParameters({
        Twist: '',
        Dihedral: '', YSECT: '', XLE: '', XTE: '', Chord: '',
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
    setModifiedParameters(prev => ({
      ...parameters,
      ...prev,
      [param]: value
    }));
  };

  const computeDesired = async () => {
    if (selectedSection === null || selectedSection === undefined) {
      alert("Please select a section first");
      return;
    }
    if (Object.keys(modifiedParameters).length === 0) {
      alert("Please modify at least one parameter before computing");
      return;
    }
    try {
      const response = await fetch('http://127.0.1:5000/compute_desired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionIndex: selectedSection,
          parameters: modifiedParameters,
          geoData: newgeoData || geoData, // Use updatedGeoData if available
          plotData: newplotData || plotData // Use updatedPlotData if available
        }),
      });
      const { updatedGeoData, updatedPlotData } = await response.json();
      if (updatedPlotData) {
        setnewGeoData(updatedGeoData);
        setnewPlotData(updatedPlotData);
        // Do NOT reset modifiedParameters here
        updateParameters(selectedSection);
        console.log('Updated Geo Data:', updatedGeoData);
      }
    } catch (error) {
      console.error('Error computing desired parameters:', error);
    }
  }


  // 3D plot traces
  const plot3DTrace = () => {
    if (!plotData) return [];
    // Always show all sections in 3D
    return plotData.flatMap((sectionData, index) => [
      {
        x: sectionData.xus,
        y: sectionData.y,
        z: sectionData.zus,
        type: 'scatter3d',
        mode: 'lines',
        line: { 'color': 'red', 'width': 6 }
      },
      {
        x: sectionData.xls,
        y: sectionData.y,
        z: sectionData.zls,
        type: 'scatter3d',
        mode: 'lines',
        line: { 'color': 'blue', 'width': 6 }
      }
    ]);
  };

  // 2D plot traces
  const plot2DTrace = () => {
    if (!plotData) return [];
    // if (selected2DPlot === "twist" && geoData) {
    //   return [{
    //     x: geoData.map((_, i) => i + 1),
    //     y: geoData.map(section => section.TWIST),
    //     type: 'scatter',
    //     mode: 'lines+markers',
    //     name: 'Twist'
    //   }];
    // }

    if (selected2DPlot === "twist" && geoData) {
      const traces = [
        {
          x: geoData.map((_, i) => i + 1),
          y: geoData.map(section => section.TWIST),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Original Twist'
        }
      ];
      if (newgeoData) {
        traces.push({
          x: newgeoData.map((_, i) => i + 1),
          y: newgeoData.map(section => section.TWIST),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Modified Twist'
        });
      }     
      return traces;
    }

    if (selected2DPlot === "dihedral" && geoData) {
      const traces = [
        {
          x: geoData.map((_, i) => i + 1),
          y: geoData.map(section => section.HSECT),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Original Dihedral'
        }
      ];
      if (newgeoData) {
        traces.push({
          x: newgeoData.map((_, i) => i + 1),
          y: newgeoData.map(section => section.HSECT),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Modified Dihedral'
        });
      }
      return traces;
    }




    // if (selected2DPlot === "dihedral" && geoData) {
    //   return [{
    //     x: geoData.map((_, i) => i + 1),
    //     y: geoData.map(section => section.HSECT),
    //     type: 'scatter',
    //     mode: 'lines+markers',
    //     name: 'Dihedral Distribution'
    //   }];
    // }
    if (selected2DPlot === "section" && selectedSection >= 0) {
      const sectionData = plotData[selectedSection] || {};
      const traces = [
        {
          x: sectionData.xus,
          y: sectionData.zus,
          type: 'scatter',
          mode: 'lines',
          name: `Upper Surface - Section ${selectedSection + 1}`,
          line: { 'color': 'red', 'width': 3 }
        },
        {
          x: sectionData.xls,
          y: sectionData.zls,
          type: 'scatter',
          mode: 'lines',
          name: `Lower Surface - Section ${selectedSection + 1}`,
          line: { 'color': 'blue', 'width': 3 }
        }
      ];
      if (newplotData) {
        const newsectionData = newplotData[selectedSection] || {};
        if (newsectionData.xus_n && newsectionData.zus_n) {
          traces.push(
            {
              x: newsectionData.xus_n,
              y: newsectionData.zus_n,
              type: 'scatter',
              mode: 'lines',
              name: `Modified Upper - Section ${selectedSection + 1}`,
              line: { 'color': 'red', 'width': 3, 'dash': 'dash' }
            },
            {
              x: newsectionData.xls_n,
              y: newsectionData.zls_n,
              type: 'scatter',
              mode: 'lines',
              name: `Modified Lower - Section ${selectedSection + 1}`,
              line: { 'color': 'blue', 'width': 3, 'dash': 'dash' }
            }
          );
        }
      }
      return traces;
    }
    if (!selected2DPlot && newplotData && selectedSection >= 0) {
      const sectionData = plotData[selectedSection] || {};
      const newsectionData = newplotData[selectedSection] || {};
      const traces = [
        {
          x: sectionData.xus,
          y: sectionData.zus,
          type: 'scatter',
          mode: 'lines',
          name: `Original Upper - Section ${selectedSection + 1}`,
          line: { 'color': 'red', 'width': 3 }
        },
        {
          x: sectionData.xls,
          y: sectionData.zls,
          type: 'scatter',
          mode: 'lines',
          name: `Original Lower - Section ${selectedSection + 1}`,
          line: { 'color': 'blue', 'width': 3 }
        }
      ];
      if (newsectionData.xus_n && newsectionData.zus_n) {
        traces.push(
          {
            x: newsectionData.xus_n,
            y: newsectionData.zus_n,
            type: 'scatter',
            mode: 'lines',
            name: `Modified Upper - Section ${selectedSection + 1}`,
            line: { 'color': 'red', 'width': 3, 'dash': 'dash' }
          },
          {
            x: newsectionData.xls_n,
            y: newsectionData.zls_n,
            type: 'scatter',
            mode: 'lines',
            name: `Modified Lower - Section ${selectedSection + 1}`,
            line: { 'color': 'blue', 'width': 3, 'dash': 'dash' }
          }
        );
      }
      return traces;
    }
    return [];

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
          <button className="btn btn-danger" onClick={() => window.location.reload(false)}>Reset</button>
        </div>
      </header>

      <div className="content-row">
        {/* Main Content: vertical stack */}
        <div className="main-content">
          <div className="graph-panel">
            {sections.length > 0 && (
              <div className="dropdown-container">
                <label htmlFor="section-select">Section: </label>
                <select id="section-select" onChange={handleSectionChange}
                  value={selectedSection}>
                  {sections.map((section, index) => (
                    <option key={index} value={index - 1}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* Plot3D is rendered outside any container */}
          {plotData && (
            <Plot3D
              plotData={plot3DTrace()}
              selectedSection={selectedSection}
            />
          )}
          <div className="plot2d-panel">
            <div className="plot2d-radio-group">
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="section"
                  checked={selected2DPlot === "section"}
                  onChange={() => setSelected2DPlot("section")}
                  disabled={selectedSection < 0}
                />
                Section 2D Plot
              </label>
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="twist"
                  checked={selected2DPlot === "twist"}
                  onChange={() => setSelected2DPlot("twist")}
                />
                Twist Distribution
              </label>
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="dihedral"
                  checked={selected2DPlot === "dihedral"}
                  onChange={() => setSelected2DPlot("dihedral")}
                />
                Dihedral Distribution
              </label>
            </div>
          </div>
          {/* Plot2D is rendered outside any container */}
          {(plotData || newplotData) && (
            <Plot2D
              plotData={plot2DTrace()}
              selectedSection={selectedSection}
            />
          )}
        </div>

        {/* Side Content: vertical stack */}
        <div className="side-content">
          <div className="side-panel">
            <div className="specs-panel">
              <div className="specs-container">
                <h2 className="specs-title">Wing Specifications</h2>
                <table className="specs-table">
                  <tbody>
                    <tr>
                      <td>Aspect Ratio</td>
                      <td><input type="text" className="input-field" value="0" readOnly /></td>
                    </tr>
                    <tr>
                      <td>Wing Span</td>
                      <td><input type="text" className="input-field" value="0" readOnly /></td>
                    </tr>
                    <tr>
                      <td>Washout</td>
                      <td><input type="text" className="input-field" value="0" readOnly /></td>
                    </tr>
                    <tr>
                      <td>Number of Sections</td>
                      <td><input type="text" className="input-field" value="0" readOnly /></td>
                    </tr>
                    <tr>
                      <td>Taper Ratio</td>
                      <td><input type="text" className="input-field" value="0" readOnly /></td>
                    </tr>
                  </tbody>
                </table>
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
                    {Object.entries(parameters || { Twist: 0.0, Dihedral: 0.0, YSECT: 0.0, XLE: 0.0, XTE: 0.0, Chord: 0.0 }).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td><input type="text" className="input-field" value={typeof value === "number" ? Number(value).toFixed(3) : value} readOnly /></td>
                        <td><input type="text" className="input-field" onChange={(e) => handleParameterChange(key, e.target.value)} value={modifiedParameters[key] ?? ''} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="computation-controls">
                  <button className="btn btn-primary" onClick={computeDesired}>Compute Desired</button>
                  <button className="btn btn-primary">Compute Global (b)</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeometryModule;
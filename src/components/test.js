import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { ZoomIn, ZoomOut, Move, RotateCw } from 'lucide-react';
import "./GeometryModule.css"

function App() {
  const [plotDataState, setPlotDataState] = useState(null);
  const [plotLayout, setPlotLayout] = useState({
  title: {
    text: '3D Wing Section Visualization',
    font: { size: 18 }
  },
  scene: {
    aspectratio: { x: 3, y: 6, z: 1 }, // Stretch y-axis
    xaxis: { title: 'Chordwise (X)', showgrid: true },
    yaxis: { title: 'Spanwise (Y)', showgrid: true },
    zaxis: { title: 'Thickness (Z)', showgrid: true },
  },
  paper_bgcolor: 'white',
  plot_bgcolor: '#f8f8f8',
  margin: { l: 40, r: 40, t: 50, b: 40 }, // Balanced margins
});
   

  // handleFileUpload function to upload the file and fetch the data
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/import-geo', {
        method: 'POST',
        body: formData,
      });

      // if (!response.ok) {
      //   throw new Error('Network response was not ok');
      // }

      let data = await response.json();
      console.log("Received data:", data); // Log the data

      try {
        // If data is a string, parse it into an object
        if (typeof data === "string") {
          data = JSON.parse(data);
        }
      } catch (error) {
        console.error("Error parsing data:", error);
        return;
      }

      // Once data is fetched and parsed, set the plot data
      handlePlotData(data); // Calling handlePlotData with the fetched data
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  // Function to update the plotDataState and trigger re-render
  const handlePlotData = (data) => {
    const newPlotData = [{
      x: data.x,
      y: data.y,
      z: data.z,
      type: 'scatter3d',
      mode: 'lines+markers',
      marker: { size: 2 }
    }];
    setPlotDataState(newPlotData);
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
            <div className="graph-canvas" id="plot">
              {plotDataState ? (
                <Plot data={plotDataState} layout={{...plotLayout,
                autoSize: true,
                width : '100%',
                height: '100%',
                }} 
                useResizeHandler = {true}
                style = {{width:'100%', height: '100%'}}/>
              ) : (
                <p>Loading plot...</p>
              )}
            </div>
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

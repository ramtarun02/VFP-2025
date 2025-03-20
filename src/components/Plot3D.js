import React from 'react';
import Plot from 'react-plotly.js';

const Plot3D = ({ plotData, selectedSection }) => {

const sceneLayout = selectedSection === -1 
  ? { // 3D Wing View
      aspectmode: 'data',
      xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
      yaxis: { title: { text: 'Spanwise (Y)', font: { family: 'Times New Roman' } }, showgrid: true },
      zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
      camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } } // Default 3D camera
    }
  : { // 2D Section View (Only X-Z view)
      aspectmode: 'data',
      xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
      yaxis: { visible: false }, // Hide spanwise axis
      zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
      camera: { eye: { x: 0, y: 1.5, z: 0 } } // Adjusted camera for 2D side view
    };

  const layout = {
  title: {
    text: 'Wing Geometry Visualisation',
    font: { size: 18, family: 'Times New Roman' },
  },
  scene: sceneLayout, // Use the dynamically selected scene
  showlegend: selectedSection !== -1, // Hide legend for full 3D view
  margin: { l: 40, r: 40, t: 50, b: 40 },
  font: { family: 'Times New Roman' }, // Ensure consistent font
};

   return (
    <Plot
      data={plotData}
      layout={layout}
      useResizeHandler={true}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Plot3D;


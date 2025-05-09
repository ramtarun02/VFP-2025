import React from 'react';
import Plot from 'react-plotly.js';

const Plot3D = ({ plotData, selectedSection}) => {
  const sceneLayout = selectedSection === -1 
    ? { // 3D Wing View
        aspectmode: 'data',
        xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
        yaxis: { title: { text: 'Spanwise (Y)', font: { family: 'Times New Roman' } }, showgrid: true },
        zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
        camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
      }
    : { // 2D Section View (Only X-Z view)
        aspectmode: 'manual',
        aspectratio: {x: 2, y: 8, z: 2},
        xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
        yaxis: { visible: false },
        zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
        camera: { eye: { x: 0, y: 4, z: 0 } }
      };

  const layout = {
    title: {
      text: 'Wing Geometry Visualisation',
      font: { size: 18, family: 'Times New Roman' },
    },
    autorange: true,
    scene: sceneLayout,
    showlegend: selectedSection !== -1,
    autosize: true, 
    margin: { l: 25, r: 10, t: 50, b: 25 },
    font: { family: 'Times New Roman' },
  };

  return (
    <>
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={true}
        config={{responsive: true}}
        style={{ width: '100%', height: '90%' }}
      />
    </>
  );
};

export default Plot3D;

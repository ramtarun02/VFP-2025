import React from 'react';
import Plot from 'react-plotly.js';

const Plot3D = ({ plotData, selectedSection}) => {
  const sceneLayout = { // 3D Wing View
        aspectmode: 'data',
        xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
        yaxis: { title: { text: 'Spanwise (Y)', font: { family: 'Times New Roman' } }, showgrid: true },
        zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
        camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
      };

  const layout = {
    autorange: true,
    scene: sceneLayout,
    showlegend: false,
    autosize: true, 
    margin: { l: 25, r: 10, t: 50, b: 25 },
    font: { family: 'Times New Roman' },
    paper_bgcolor: '#f9fafb',    // Transparent background
    plot_bgcolor: '#f9fafb',
 
  };

  return (
    <>
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={true}
        config={{responsive: true}}
        style={{ width: '100%', height: '32vh' }}
      />
    </>
  );
};

export default Plot3D;

import React from 'react';
import Plot from 'react-plotly.js';

const Plot3D = ({ plotData, selectedSection, layout }) => {
  // Default 3D scene layout (fallback)
  const defaultSceneLayout = {
    aspectmode: 'data',
    xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
    yaxis: { title: { text: 'Spanwise (Y)', font: { family: 'Times New Roman' } }, showgrid: true },
    zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
    camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
  };

  // Default layout (fallback)
  const defaultLayout = {
    scene: defaultSceneLayout,
    showlegend: false,
    autosize: true,
    margin: { l: 25, r: 10, t: 50, b: 25 },
    font: { family: 'Times New Roman' },
    paper_bgcolor: '#f9fafb',
    plot_bgcolor: '#f9fafb',
  };

  // Use the provided layout or fall back to default
  const finalLayout = layout || defaultLayout;

  return (
    <>
      <Plot
        data={plotData}
        layout={finalLayout}
        useResizeHandler={true}
        config={{ responsive: true }}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
};

export default Plot3D;
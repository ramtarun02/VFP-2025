import React from 'react';
import Plot from 'react-plotly.js';

function Plot2D({ plotData, selectedSection }) {
  if (!plotData || plotData.length === 0) {
    return <div style={{ minHeight: '300px', textAlign: 'center', padding: '40px' }}>No 2D plot data available.</div>;
  }

  // Layout for 2D plots
  const layout = {
    title: selectedSection >= 0 ? `Section ${selectedSection + 1} - 2D Plot` : '2D Plot',
    xaxis: { title: 'X', showgrid: true, zeroline: false },
    yaxis: { title: 'Z', showgrid: true, zeroline: false },
    margin: { l: 60, r: 30, b: 50, t: 50 },
    legend: { orientation: 'h', y: -0.2 },
    autosize: true,
    height: undefined,
  };

  return (
    <Plot
      data={plotData}
      layout={layout}
      config={{ responsive: true }}
      style={{ width: '100%', height: '100%', marginTop: '1rem' }}
    />
  );
}

export default Plot2D;

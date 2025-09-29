import React, { useState, useEffect } from "react";
import "./ProWiM.css";
import Prowim3Dmodel from "./Prowim3Dmodel";
import { useNavigate } from "react-router-dom";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ticks } from "d3";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function computeKS0D(CL0, CD0, A) {
  if (!A || !CL0 || !CD0) return "";
  const pi = Math.PI;
  try {
    return (
      1 -
      Math.sqrt(
        ((2 * CL0) / (pi * A)) ** 2 +
        (1 - (2 * CD0) / (pi * A)) ** 2
      )
    ).toFixed(5);
  } catch {
    return "";
  }
}

function PropellerWingForm() {
  const navigate = useNavigate();
  const [showPlots, setShowPlots] = useState(false);

  const [formData, setFormData] = useState({
    A: "11",
    bOverD: "6.39",
    cOverD: "0.75",
    alpha0: "-2",
    N: "2",
    NSPSW: "0.4225",
    ZPD: "-0.1",
    IW: "2",
    NELMNT: "0",
    CTIP: "0.3",
    NAW: "1",
    ALFAWI: "5",
    CL0: "0.5",
    CD0: "0.0230",
    KS00: "0.001",
    propLocation: "5",
    D: "3"
  });

  const [arrayInputs, setArrayInputs] = useState({
    ALFAWI: [5],
    CL0: [0.5],
    CD0: [0.0230],
    KS00: [0.001]
  });

  // Compute KS00 array whenever A, CL0, or CD0 changes
  useEffect(() => {
    const A = parseFloat(formData.A);
    if (A && arrayInputs.CL0.length > 0 && arrayInputs.CD0.length > 0) {
      const newKS00 = arrayInputs.CL0.map((cl0, index) => {
        const cd0 = arrayInputs.CD0[index] || arrayInputs.CD0[0];
        return parseFloat(computeKS0D(cl0, cd0, A));
      });
      setArrayInputs(prev => ({ ...prev, KS00: newKS00 }));
    }
  }, [formData.A, arrayInputs.CL0, arrayInputs.CD0]);

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (name, value) => {
    // Parse comma-separated AND space-separated values
    // First replace commas with spaces, then split by spaces and filter
    const values = value
      .replace(/,/g, ' ')  // Replace all commas with spaces
      .split(/\s+/)        // Split by one or more whitespace characters
      .map(v => v.trim())  // Trim each value
      .filter(v => v !== '') // Remove empty strings
      .map(v => parseFloat(v)) // Convert to numbers
      .filter(v => !isNaN(v)); // Remove invalid numbers

    setArrayInputs(prev => ({ ...prev, [name]: values }));

    // Update display value
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        ALFAWI: arrayInputs.ALFAWI,
        CL0: arrayInputs.CL0,
        CD0: arrayInputs.CD0,
        KS00: arrayInputs.KS00
      };

      const response = await fetch("http://localhost:5000/prowim-compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.results);
        setShowPlots(false); // Reset to show 3D model when new results come
      } else {
        const errorText = await response.text();
        console.error("Error:", response.statusText, errorText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handlePlotResults = () => {
    setShowPlots(true);
  };

  const handleBackToModel = () => {
    setShowPlots(false);
  };

  const handleExportResults = (format = 'csv') => {
    if (!result || !Array.isArray(result) || result.length === 0) {
      alert("No results to export.");
      return;
    }

    // Prepare data for export
    const headers = ['Set', 'ALFAWI', 'CL0', 'CD0', 'KS00', 'CL_Prop', 'CD_Prop'];
    const rows = result.map((res, index) => [
      index + 1,
      arrayInputs.ALFAWI[index]?.toFixed(2) || 'N/A',
      arrayInputs.CL0[index]?.toFixed(3) || 'N/A',
      arrayInputs.CD0[index]?.toFixed(4) || 'N/A',
      arrayInputs.KS00[index]?.toFixed(4) || 'N/A',
      res.CZD?.toFixed(5) || 'N/A',
      res.CXD?.toFixed(5) || 'N/A'
    ]);

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      // CSV format
      content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = 'prowim_results.csv';
      mimeType = 'text/csv';
    } else if (format === 'txt') {
      // Space-separated format
      const columnWidths = headers.map((header, colIndex) =>
        Math.max(
          header.length,
          ...rows.map(row => String(row[colIndex]).length)
        )
      );

      const formatRow = (row) =>
        row.map((cell, index) => String(cell).padEnd(columnWidths[index])).join(' ');

      content = [formatRow(headers), ...rows.map(formatRow)].join('\n');
      filename = 'prowim_results.txt';
      mimeType = 'text/plain';
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Add dropdown export function
  const handleExportDropdown = (event) => {
    const format = event.target.value;
    if (format) {
      handleExportResults(format);
      // Reset dropdown
      event.target.value = '';
    }
  };


  // Prepare chart data
  const prepareChartData = () => {
    if (!result || !Array.isArray(result)) return { clData: null, cdData: null };

    const alphaValues = arrayInputs.ALFAWI;
    const clValues = result.map(res => res.CZD);
    const cdValues = result.map(res => res.CXD);
    const cl0Values = arrayInputs.CL0;
    const cd0Values = arrayInputs.CD0;

    const clData = {
      labels: alphaValues,
      datasets: [
        {
          label: 'CL_Prop (Computed)',
          data: clValues,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
        {
          label: 'CL0 (Input)',
          data: cl0Values,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderDash: [5, 5], // Dashed line for input values
          tension: 0.1,
        },
      ],
    };

    const cdData = {
      labels: alphaValues,
      datasets: [
        {
          label: 'CD_Prop (Computed)',
          data: cdValues,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
        },
        {
          label: 'CD0 (Input)',
          data: cd0Values,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderDash: [5, 5], // Dashed line for input values
          tension: 0.1,
        },
      ],
    };

    return { clData, cdData };
  };

  const { clData, cdData } = prepareChartData();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Aerodynamic Coefficients vs Angle of Attack',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Angle of Attack (degrees)',
        },
        ticks: {
          callback: function (value, index, values) {
            return Number(this.getLabelForValue(value)).toFixed(3); // Format ticks to 1 decimal place
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Coefficient Value',
        },
      },
    },
  };

  return (
    <div className="prowim-container">
      <div className="model-viewer">
        {!showPlots ? (
          <Prowim3Dmodel
            bOverD={parseFloat(formData.bOverD)}
            cOverD={parseFloat(formData.cOverD)}
            D={parseFloat(formData.D)}
            propLocation={parseFloat(formData.propLocation)}
          />
        ) : (
          <div className="plots-container">
            <div className="plot-controls">
              <button type="button" onClick={handleBackToModel} className="btn btn-secondary">
                Back to 3D Model
              </button>
            </div>
            {clData && cdData && (
              <div className="charts">
                <div className="chart">
                  <h4>CL vs Angle of Attack</h4>
                  <Line data={clData} options={chartOptions} />
                </div>
                <div className="chart">
                  <h4>CD vs Angle of Attack</h4>
                  <Line data={cdData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {[
            { label: "Wing Aspect Ratio (A)", name: "A" },
            { label: "b / D", name: "bOverD" },
            { label: "c / D", name: "cOverD" },
            { label: "Angle of attack at zero lift (α₀) [deg]", name: "alpha0" },
            { label: "Total number of propellers (N)", name: "N" },
            { label: "NSPSW", name: "NSPSW" },
            { label: "ZPD", name: "ZPD" },
            { label: "IW [deg]", name: "IW" },
            { label: "Thrust Coefficient (CTIP)", name: "CTIP" },
            { label: "Propeller Location along Wing Span (y/b)", name: "propLocation" },
            { label: "Propeller Diameter (D) [m]", name: "D" }
          ].map(({ label, name }) => (
            <div key={name}>
              <label>{label}</label>
              <input
                type="number"
                step="any"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                required
              />
            </div>
          ))}

          {/* Array inputs */}
          <div>
            <label>ALFAWI [deg]</label>
            <input
              type="text"
              name="ALFAWI"
              value={formData.ALFAWI}
              onChange={(e) => handleArrayChange("ALFAWI", e.target.value)}
              placeholder="0, 5, 10"
              required
            />
            <small>Current values: [{arrayInputs.ALFAWI.map(val => val.toFixed(2)).join(', ')}]</small>
          </div>

          <div>
            <label>CL0</label>
            <input
              type="text"
              name="CL0"
              value={formData.CL0}
              onChange={(e) => handleArrayChange("CL0", e.target.value)}
              placeholder="0.5, 0.6, 0.7"
              required
            />
            <small>Current values: [{arrayInputs.CL0.map(val => val.toFixed(3)).join(', ')}]</small>
          </div>

          <div>
            <label>CD0</label>
            <input
              type="text"
              name="CD0"
              value={formData.CD0}
              onChange={(e) => handleArrayChange("CD0", e.target.value)}
              placeholder="0.02, 0.025, 0.03"
              required
            />
            <small>Current values: [{arrayInputs.CD0.map(val => val.toFixed(3)).join(', ')}]</small>
          </div>

          <div>
            <label>KS00</label>
            <input
              type="text"
              value={arrayInputs.KS00.join(', ')}
              readOnly
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </div>

          <label>Number of flap elements (NELMNT)</label>
          <select name="NELMNT" value={formData.NELMNT} onChange={handleChange}>
            <option value="0">Flaps Up</option>
            <option value="1">Single Flap</option>
            <option value="2">Double Flaps</option>
          </select>

          <button type="submit">Compute</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Back to Main Module</button>
        </form>

        {/* Results display */}
        {result && Array.isArray(result) && (
          <div className="results">
            <h3>Computation Results</h3>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>ALFAWI</th>
                    <th>KS00</th>
                    <th>CL0</th>
                    <th>CD0</th>
                    <th>CL_Prop</th>
                    <th>CD_Prop</th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((res, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{arrayInputs.ALFAWI[index]?.toFixed(2) || 'N/A'}</td>
                      <td>{arrayInputs.KS00[index]?.toFixed(4) || 'N/A'}</td>
                      <td>{arrayInputs.CL0[index]?.toFixed(3) || 'N/A'}</td>
                      <td>{arrayInputs.CD0[index]?.toFixed(4) || 'N/A'}</td>
                      <td>{res.CZD?.toFixed(5) || 'N/A'}</td>
                      <td>{res.CXD?.toFixed(5) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="plot-button-container">
              <button type="button" onClick={handlePlotResults} className="btn btn-success">
                Plot CL vs Alpha & CD vs Alpha
              </button>

              <select onChange={handleExportDropdown} className="btn btn-info export-dropdown">
                <option value="">Export Results</option>
                <option value="csv">Export as CSV</option>
                <option value="txt">Export as TXT</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropellerWingForm;
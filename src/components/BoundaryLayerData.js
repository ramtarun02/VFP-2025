import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Plot from 'react-plotly.js';
import './BoundaryLayerData.css';
import { fontGrid } from '@mui/material/styles/cssUtils';

function BoundaryLayer() {
    const navigate = useNavigate();
    const location = useLocation();
    const [visData, setVisData] = useState(null);
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('level1');
    const [plotData, setPlotData] = useState({
        theta: null,
        delta: null,
        hbar: null,
        cf: null,
        beta: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle file import
    const handleImportVis = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vis';

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                setLoading(true);
                setError(null);

                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('http://127.0.0.1:5000/boundary_layer_data', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('VIS data received:', data);

                    setVisData(data);

                    // Update sections dropdown with level1 sections by default
                    if (data.levels && data.levels.level1 && data.levels.level1.sections) {
                        const sectionOptions = Object.keys(data.levels.level1.sections)
                            .map(sectionKey => ({
                                value: sectionKey,
                                label: `Section ${data.levels.level1.sections[sectionKey].spanJ2}`,
                                data: data.levels.level1.sections[sectionKey],
                                spanJ2: data.levels.level1.sections[sectionKey].spanJ2
                            }))
                            .sort((a, b) => a.spanJ2 - b.spanJ2); // Sort by spanJ2 in ascending order
                        setSections(sectionOptions);
                    }

                } catch (error) {
                    console.error('Error parsing VIS file:', error);
                    setError(`Error loading VIS file: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            }
        };

        input.click();
    };

    // Update sections when level changes
    useEffect(() => {
        if (visData && visData.levels && visData.levels[selectedLevel]) {
            const levelSections = visData.levels[selectedLevel].sections;
            if (levelSections) {
                const sectionOptions = Object.keys(levelSections)
                    .map(sectionKey => ({
                        value: sectionKey,
                        label: `Section ${levelSections[sectionKey].spanJ2}`,
                        data: levelSections[sectionKey],
                        spanJ2: levelSections[sectionKey].spanJ2
                    }))
                    .sort((a, b) => a.spanJ2 - b.spanJ2); // Sort by spanJ2 in ascending order
                setSections(sectionOptions);
                setSelectedSection(''); // Reset section selection
                setPlotData({
                    theta: null,
                    delta: null,
                    hbar: null,
                    cf: null,
                    beta: null
                }); // Clear current plots
            }
        }
    }, [visData, selectedLevel]);

    // Generate plot when section changes
    useEffect(() => {
        if (visData && selectedLevel && selectedSection) {
            generateBoundaryLayerPlots();
        }
    }, [visData, selectedLevel, selectedSection]);

    const generateBoundaryLayerPlots = () => {
        if (!visData || !selectedLevel || !selectedSection) return;

        const sectionData = visData.levels[selectedLevel].sections[selectedSection];
        if (!sectionData) return;

        const sectionInfo = `Section ${sectionData.spanJ2} (η=${sectionData.eta?.toFixed(5)})`;

        // Common plot configuration
        const commonConfig = {
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
        };

        const commonLayoutProps = {
            showlegend: false,
            margin: { l: 60, r: 40, t: 50, b: 50 },
            plot_bgcolor: 'white',
            paper_bgcolor: 'white',
            xaxis: {
                title: {
                    text: 'x/c',
                    font: { size: 14, family: 'Arial, sans-serif' }
                },
                showgrid: true,
                gridcolor: '#e8e8e8',
                range: [0, 1.05], // Fixed range [0,1]
                fixedrange: false
            },
            yaxis: {
                showgrid: true,
                gridcolor: '#e8e8e8',
                tickfont: { size: 12, family: 'Arial, sans-serif' },
            },
            title: {
                font: { size: 16, family: 'Arial, sans-serif' },
                x: 0.5,
                xanchor: 'center'
            },
            // Force 1:1 aspect ratio
            width: 400,
            height: 400,
            autosize: false
        };

        // 1. Theta/c (Momentum Thickness) Plot
        const thetaPlot = {
            data: [{
                x: sectionData['x/c'],
                y: sectionData['Theta/c'],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'θ/c',
                line: { color: '#e74c3c', width: 2 },
                marker: { size: 4, color: '#e74c3c' }
            }],
            layout: {
                ...commonLayoutProps,
                title: `Momentum Thickness (θ/c) - ${sectionInfo}`,
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: 'θ/c'
                }
            },
            config: commonConfig
        };

        // 2. Dis/c (Displacement Thickness) Plot
        const deltaPlot = {
            data: [{
                x: sectionData['x/c'],
                y: sectionData['Dis/c'],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'δ*/c',
                line: { color: '#27ae60', width: 2 },
                marker: { size: 4, color: '#27ae60' }
            }],
            layout: {
                ...commonLayoutProps,
                title: `Displacement Thickness (δ*/c) - ${sectionInfo}`,
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: 'δ*/c'
                }
            },
            config: commonConfig
        };

        // 3. H (Shape Factor) Plot
        const hbarPlot = {
            data: [{
                x: sectionData['x/c'],
                y: sectionData['H'],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'H',
                line: { color: '#8e44ad', width: 2 },
                marker: { size: 4, color: '#8e44ad' }
            }],
            layout: {
                ...commonLayoutProps,
                title: `Shape Factor (H) - ${sectionInfo}`,
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: 'H'
                }
            },
            config: commonConfig
        };

        // 4. Cf (Skin Friction Coefficient) Plot
        const cfPlot = {
            data: [{
                x: sectionData['x/c'],
                y: sectionData['Cf'],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Cf',
                line: { color: '#f39c12', width: 2 },
                marker: { size: 4, color: '#f39c12' }
            }],
            layout: {
                ...commonLayoutProps,
                title: `Skin Friction Coefficient (Cf) - ${sectionInfo}`,
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: 'Cf'
                }
            },
            config: commonConfig
        };

        // 5. Beta Plot
        const betaPlot = {
            data: [{
                x: sectionData['x/c'],
                y: sectionData['Beta'],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Beta',
                line: { color: '#3498db', width: 2 },
                marker: { size: 4, color: '#3498db' }
            }],
            layout: {
                ...commonLayoutProps,
                title: `Beta - ${sectionInfo}`,
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: 'Beta'
                }
            },
            config: commonConfig
        };

        setPlotData({
            theta: thetaPlot,
            delta: deltaPlot,
            hbar: hbarPlot,
            cf: cfPlot,
            beta: betaPlot
        });
    };



    const getLevels = () => {
        if (!visData || !visData.levels) return [];

        return Object.keys(visData.levels).map(levelKey => ({
            value: levelKey,
            label: levelKey.charAt(0).toUpperCase() + levelKey.slice(1)
        }));
    };

    return (
        <div className="boundary-layer-container">
            {/* Header */}
            <div className="boundary-layer-header">
                <div className="header-left">
                    <h1>Boundary Layer Data Visualization</h1>
                </div>
                <div className="header-right">
                    <button onClick={handleImportVis} className="header-btn import-btn">
                        Import .vis File
                    </button>
                    <button onClick={() => navigate('/post-processing')} className="header-btn back-btn">
                        Back to Post-Processing
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="boundary-layer-content">
                {/* Controls Sidebar */}
                <div className="controls-sidebar">
                    <div className="control-section">
                        <h3>File Information</h3>
                        {visData ? (
                            <div className="file-info">
                                <p><strong>File:</strong> {visData.fileName}</p>
                                <p><strong>Total Lines:</strong> {visData.metadata?.totalLines}</p>
                                <p><strong>Levels Available:</strong> {Object.keys(visData.levels || {}).length}</p>
                            </div>
                        ) : (
                            <p className="no-file">No .vis file loaded</p>
                        )}
                    </div>

                    {visData && (
                        <>
                            <div className="control-section">
                                <h3>Level Selection</h3>
                                <select
                                    className="control-dropdown"
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                >
                                    {getLevels().map(level => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-section">
                                <h3>Section Selection</h3>
                                <select
                                    className="control-dropdown"
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                >
                                    <option value="">Select Section</option>
                                    {sections.map(section => (
                                        <option key={section.value} value={section.value}>
                                            {section.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedSection && visData.levels[selectedLevel]?.sections[selectedSection] && (
                                <div className="control-section">
                                    <h3>Section Details</h3>
                                    <div className="section-details">
                                        <p><strong>Span:</strong> j-2 = {visData.levels[selectedLevel].sections[selectedSection].spanJ2}</p>
                                        <p><strong>Eta:</strong> {visData.levels[selectedLevel].sections[selectedSection].eta?.toFixed(5)}</p>
                                        <p><strong>Chord:</strong> {visData.levels[selectedLevel].sections[selectedSection].chord?.toFixed(5)}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Plot Area */}
                <div className="plot-area">
                    {loading && (
                        <div className="loading-indicator">
                            <p>Loading VIS file...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    )}

                    {!visData && !loading && !error && (
                        <div className="empty-state">
                            <h2>Welcome to Boundary Layer Data Visualization</h2>
                            <p>Import a .vis file to get started</p>
                            <button onClick={handleImportVis} className="import-button-large">
                                Import .vis File
                            </button>
                        </div>
                    )}

                    {plotData.theta && (
                        <div className="plots-grid">
                            <div className="plot-item">
                                <Plot
                                    data={plotData.theta.data}
                                    layout={plotData.theta.layout}
                                    config={plotData.theta.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>

                            <div className="plot-item">
                                <Plot
                                    data={plotData.delta.data}
                                    layout={plotData.delta.layout}
                                    config={plotData.delta.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>

                            <div className="plot-item">
                                <Plot
                                    data={plotData.hbar.data}
                                    layout={plotData.hbar.layout}
                                    config={plotData.hbar.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>

                            <div className="plot-item">
                                <Plot
                                    data={plotData.cf.data}
                                    layout={plotData.cf.layout}
                                    config={plotData.cf.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>

                            <div className="plot-item">
                                <Plot
                                    data={plotData.beta.data}
                                    layout={plotData.beta.layout}
                                    config={plotData.beta.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BoundaryLayer;

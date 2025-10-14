import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Plot from 'react-plotly.js';
import './BoundaryLayerData.css';

import { fetchAPI } from '../utils/fetch';

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
        beta: null,
        cp: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Add new state for available .vis files from simulation folder
    const [simulationData, setSimulationData] = useState(null);
    const [availableVisFiles, setAvailableVisFiles] = useState([]);

    // BL Velocity Profile states
    const [showBLProfile, setShowBLProfile] = useState(false);
    const [blInputs, setBLInputs] = useState({
        xc: 0.25,
        eta: 1.5
    });
    const [selectedSurface, setSelectedSurface] = useState('upper');
    const [blParameters, setBLParameters] = useState({
        theta: 'NaN',
        delta: 'NaN',
        hbar: 'NaN',
        cf: 'NaN',
        beta: 'NaN'
    });
    const [blPlots, setBLPlots] = useState({
        streamwise: null,
        crossflow: null
    });

    // Process simulation data on component mount to find .vis files
    useEffect(() => {
        console.log('Boundary Layer - Location state received:', location.state);

        if (location.state && location.state.simulationFolder) {
            const receivedData = location.state.simulationFolder;
            console.log('Boundary Layer - Raw simulation folder data:', receivedData);

            setSimulationData(receivedData);

            // Scan for .vis files in the simulation folder
            if (receivedData && receivedData.files) {
                const visFiles = [];

                // Check if files is an object with different file types
                if (typeof receivedData.files === 'object' && !Array.isArray(receivedData.files)) {
                    // Look for .vis files in different file type categories
                    Object.entries(receivedData.files).forEach(([fileType, fileList]) => {
                        if (Array.isArray(fileList)) {
                            fileList.forEach(file => {
                                if (file.name && file.name.toLowerCase().endsWith('.vis')) {
                                    visFiles.push(file);
                                }
                            });
                        }
                    });
                } else if (Array.isArray(receivedData.files)) {
                    // If files is an array, search directly
                    receivedData.files.forEach(file => {
                        if (file.name && file.name.toLowerCase().endsWith('.vis')) {
                            visFiles.push(file);
                        }
                    });
                }

                console.log('Found .vis files:', visFiles);
                setAvailableVisFiles(visFiles);
            }
        }
    }, [location.state]);

    // Handle file import from computer
    const handleImportVis = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vis';

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                await processVisFile(file, true); // true indicates local file
            }
        };

        input.click();
    };

    // Handle selection of .vis file from simulation folder
    const handleSelectVisFromFolder = async (visFile) => {
        console.log('Selected .vis file from folder:', visFile);
        setLoading(true);
        setError(null);

        try {
            // Fetch file content from server
            const simName = simulationData?.simName || 'unknown';
            console.log('Using simulation name:', simName);
            console.log('File path:', visFile.path || visFile.name);

            const response = await fetchAPI(`/get_file_content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    simName: simName,
                    filePath: visFile.path || visFile.name
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const content = await response.text();
            console.log('VIS file content fetched successfully, length:', content.length);

            // Create a File object from the content
            const blob = new Blob([content], { type: 'text/plain' });
            const fileObj = new File([blob], visFile.name, { type: 'text/plain' });

            await processVisFile(fileObj, false, visFile.name); // false indicates server file

        } catch (error) {
            console.error('Error fetching .vis file from server:', error);
            setError(`Error loading .vis file: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Common function to process .vis files (both local and server)
    const processVisFile = async (file, isLocalFile = true, originalFileName = null) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetchAPI('/boundary_layer_data', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('VIS data received:', data);

            // Add the original filename for server files
            if (!isLocalFile && originalFileName) {
                data.fileName = originalFileName;
            }

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
                    .sort((a, b) => a.spanJ2 - b.spanJ2);
                setSections(sectionOptions);
            }

        } catch (error) {
            console.error('Error processing VIS file:', error);
            setError(`Error processing VIS file: ${error.message}`);
        } finally {
            setLoading(false);
        }
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
                    .sort((a, b) => a.spanJ2 - b.spanJ2);
                setSections(sectionOptions);
                setSelectedSection('');
                setPlotData({
                    theta: null,
                    delta: null,
                    hbar: null,
                    cf: null,
                    beta: null,
                    cp: null
                });
            }
        }
    }, [visData, selectedLevel]);

    // Generate plot when section changes (only when not in BL profile mode)
    useEffect(() => {
        if (visData && selectedLevel && selectedSection && !showBLProfile) {
            generateBoundaryLayerPlots();
        }
    }, [visData, selectedLevel, selectedSection, showBLProfile]);

    // Function to separate upper and lower surface data
    const separateSurfaceData = (xData, yData) => {
        if (!xData || !yData || xData.length === 0) {
            return { lower: { x: [], y: [] }, upper: { x: [], y: [] } };
        }

        // Find the leading edge index (minimum x/c value)
        const minXValue = Math.min(...xData);
        const leIndex = xData.findIndex(x => x === minXValue);

        // Split data into lower and upper surfaces
        const lowerSurface = {
            x: xData.slice(0, leIndex + 1),
            y: yData.slice(0, leIndex + 1)
        };

        const upperSurface = {
            x: xData.slice(leIndex),
            y: yData.slice(leIndex)
        };

        return { lower: lowerSurface, upper: upperSurface };
    };

    // Interpolation function (2D bilinear interpolation)
    const interpolate2D = (X, ETA, values, targetX, targetEta) => {
        if (!X || !ETA || !values || X.length === 0) {
            return NaN;
        }

        // Simple nearest neighbor for now (can be enhanced with proper bilinear interpolation)
        let minDistance = Infinity;
        let nearestValue = NaN;

        for (let i = 0; i < X.length; i++) {
            for (let j = 0; j < X[i].length; j++) {
                const distance = Math.sqrt(
                    Math.pow(X[i][j] - targetX, 2) +
                    Math.pow(ETA[i] - targetEta, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestValue = values[i][j];
                }
            }
        }

        return nearestValue;
    };

    // Calculate BL velocity profile
    const calculateBLProfile = () => {
        if (!visData || !selectedLevel) {
            alert('Please load VIS data first');
            return;
        }

        const { xc, eta } = blInputs;

        // Create 2D mesh matrices from all sections
        const X = [];
        const ETA = [];
        const thetaMatrix = [];
        const deltaMatrix = [];
        const hMatrix = [];
        const cfMatrix = [];
        const betaMatrix = [];

        const levelData = visData.levels[selectedLevel];
        const sectionKeys = Object.keys(levelData.sections);

        sectionKeys.forEach((sectionKey, i) => {
            const section = levelData.sections[sectionKey];

            // Determine surface range
            let startIdx, endIdx;
            if (selectedSurface === 'upper') {
                // Upper surface: indices 100-180 (example range)
                startIdx = Math.floor(section['x/c'].length * 0.55);
                endIdx = section['x/c'].length - 1;
            } else {
                // Lower surface: indices 20-100 (example range)
                startIdx = Math.floor(section['x/c'].length * 0.1);
                endIdx = Math.floor(section['x/c'].length * 0.55);
            }

            X.push(section['x/c'].slice(startIdx, endIdx + 1));
            thetaMatrix.push(section['Theta/c'].slice(startIdx, endIdx + 1));
            deltaMatrix.push(section['Dis/c'].slice(startIdx, endIdx + 1));
            hMatrix.push(section['H'].slice(startIdx, endIdx + 1));
            cfMatrix.push(section['Cf'].slice(startIdx, endIdx + 1));
            betaMatrix.push(section['Beta'].slice(startIdx, endIdx + 1));

            ETA.push(section.eta || i * 0.1);
        });

        // Interpolate values at the specified x/c and eta
        const theta = interpolate2D(X, ETA, thetaMatrix, xc, eta);
        const delta = interpolate2D(X, ETA, deltaMatrix, xc, eta);
        const H = interpolate2D(X, ETA, hMatrix, xc, eta);
        const cf = interpolate2D(X, ETA, cfMatrix, xc, eta);
        const beta = interpolate2D(X, ETA, betaMatrix, xc, eta);

        setBLParameters({
            theta: isNaN(theta) ? 'NaN' : theta.toExponential(4),
            delta: isNaN(delta) ? 'NaN' : delta.toExponential(4),
            hbar: isNaN(H) ? 'NaN' : H.toFixed(4),
            cf: isNaN(cf) ? 'NaN' : cf.toExponential(4),
            beta: isNaN(beta) ? 'NaN' : beta.toFixed(4)
        });

        if (isNaN(theta) || isNaN(H) || isNaN(cf) || isNaN(beta)) {
            alert('Could not interpolate values at the specified location');
            return;
        }

        // Calculate velocity profiles
        const n = 2 / (H - 1);

        // Solve quadratic equation for Px (simplified - using approximation)
        const a_coeff = 1.522 * Math.sqrt(cf / 2);
        const b_coeff = 8.0605 * Math.sqrt(cf / 2) - (H - 1) / H;
        const c_coeff = 12.6896 * Math.sqrt(cf / 2) - 2.5189 * (H - 1) / H;

        const discriminant = b_coeff * b_coeff - 4 * a_coeff * c_coeff;
        const Px = discriminant >= 0 ?
            (-b_coeff + Math.sqrt(discriminant)) / (2 * a_coeff) : 0;

        // Generate y/delta values
        const y_delta = [];
        for (let i = 0; i <= 120; i++) {
            y_delta.push(i * 0.01);
        }

        // Power law profile
        const u_power = y_delta.map(y =>
            y <= 1 ? Math.pow(y, 1 / n) : 1
        );

        // Coles profile
        const u_Coles = y_delta.map(y => {
            if (y <= 0.001) return 0; // Avoid log(0)
            return 1 + Math.sqrt(cf / 2) * (5.8 * Math.log10(y) - (1 + Math.cos(Math.PI * y)) * Px);
        });

        // Crossflow profile
        const w_profile = y_delta.map(y =>
            y < 1 ? u_Coles[y_delta.indexOf(y)] * Math.pow(1 - y, 2) * Math.tan(beta * Math.PI / 180) : 0
        );

        // Create streamwise velocity plot
        const streamwisePlot = {
            data: [{
                x: u_power,
                y: y_delta,
                type: 'scatter',
                mode: 'lines',
                name: 'Streamwise Velocity',
                line: { color: '#000000', width: 2 }
            }],
            layout: {
                title: {
                    text: 'Streamwise Direction',
                    font: { size: 16, family: 'Arial, sans-serif' }
                },
                xaxis: {
                    title: { text: 'u/Ue', font: { size: 14 } },
                    range: [0, 1.2],
                    showgrid: true,
                    gridcolor: '#e8e8e8'
                },
                yaxis: {
                    title: { text: 'y/δ', font: { size: 14 } },
                    range: [0, 1.2],
                    showgrid: true,
                    gridcolor: '#e8e8e8'
                },
                showlegend: false,
                margin: { l: 60, r: 40, t: 60, b: 60 },
                plot_bgcolor: 'white',
                paper_bgcolor: 'white'
            },
            config: {
                displayModeBar: true,
                displaylogo: false,
                responsive: true
            }
        };

        // Create crossflow velocity plot
        const crossflowPlot = {
            data: [{
                x: w_profile,
                y: y_delta,
                type: 'scatter',
                mode: 'lines',
                name: 'Crossflow Velocity',
                line: { color: '#000000', width: 2 }
            }],
            layout: {
                title: {
                    text: 'Crossflow Direction',
                    font: { size: 16, family: 'Arial, sans-serif' }
                },
                xaxis: {
                    title: { text: 'w/Ue', font: { size: 14 } },
                    showgrid: true,
                    gridcolor: '#e8e8e8'
                },
                yaxis: {
                    title: { text: 'y/δ', font: { size: 14 } },
                    range: [0, 1.2],
                    showgrid: true,
                    gridcolor: '#e8e8e8'
                },
                showlegend: false,
                margin: { l: 60, r: 40, t: 60, b: 60 },
                plot_bgcolor: 'white',
                paper_bgcolor: 'white'
            },
            config: {
                displayModeBar: true,
                displaylogo: false,
                responsive: true
            }
        };

        setBLPlots({
            streamwise: streamwisePlot,
            crossflow: crossflowPlot
        });
    };

    const generateBoundaryLayerPlots = () => {
        if (!visData || !selectedLevel || !selectedSection) return;

        const sectionData = visData.levels[selectedLevel].sections[selectedSection];
        if (!sectionData) return;

        const sectionInfo = `Section ${sectionData.spanJ2} (η=${sectionData.eta?.toFixed(5)})`;

        // Common plot configuration
        const commonConfig = {
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            responsive: true
        };

        const commonLayoutProps = {
            showlegend: true,
            legend: {
                x: 0.02,
                y: 0.98,
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: '#ddd',
                borderwidth: 1
            },
            margin: { l: 80, r: 50, t: 80, b: 70 },
            plot_bgcolor: 'white',
            paper_bgcolor: 'white',
            xaxis: {
                title: {
                    text: 'x/c',
                    font: { size: 14, family: 'Arial, sans-serif' }
                },
                showgrid: true,
                gridcolor: '#e8e8e8',
                range: [0, 1.00],
                fixedrange: false,
                tickfont: { size: 12, family: 'Arial, sans-serif' }
            },
            yaxis: {
                showgrid: true,
                gridcolor: '#e8e8e8',
                tickfont: { size: 12, family: 'Arial, sans-serif' }
            },
            autosize: true
        };

        // 1. Theta/c (Momentum Thickness) Plot
        const thetaSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['Theta/c']);
        const thetaPlot = {
            data: [
                {
                    x: thetaSurfaces.lower.x,
                    y: thetaSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: thetaSurfaces.upper.x,
                    y: thetaSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Momentum Thickness (θ/c)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'θ/c',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        // 2. Dis/c (Displacement Thickness) Plot
        const deltaSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['Dis/c']);
        const deltaPlot = {
            data: [
                {
                    x: deltaSurfaces.lower.x,
                    y: deltaSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: deltaSurfaces.upper.x,
                    y: deltaSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Displacement Thickness (δ*/c)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'δ*/c',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        // 3. H (Shape Factor) Plot
        const hSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['H']);
        const hbarPlot = {
            data: [
                {
                    x: hSurfaces.lower.x,
                    y: hSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: hSurfaces.upper.x,
                    y: hSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Shape Factor (H)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'H',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        // 4. Cf (Skin Friction Coefficient) Plot
        const cfSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['Cf']);
        const cfPlot = {
            data: [
                {
                    x: cfSurfaces.lower.x,
                    y: cfSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: cfSurfaces.upper.x,
                    y: cfSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Skin Friction Coefficient (Cf)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'Cf',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        // 5. Beta Plot
        const betaSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['Beta']);
        const betaPlot = {
            data: [
                {
                    x: betaSurfaces.lower.x,
                    y: betaSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: betaSurfaces.upper.x,
                    y: betaSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Beta (β)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'Beta',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        // 6. Cp Plot
        const CpSurfaces = separateSurfaceData(sectionData['x/c'], sectionData['Cp']);
        const CpPlot = {
            data: [
                {
                    x: CpSurfaces.lower.x,
                    y: CpSurfaces.lower.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Lower Surface',
                    line: { color: '#1f77b4', width: 2 },
                    marker: { size: 4, color: '#1f77b4' }
                },
                {
                    x: CpSurfaces.upper.x,
                    y: CpSurfaces.upper.y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Upper Surface',
                    line: { color: '#d62728', width: 2 },
                    marker: { size: 4, color: '#d62728' }
                }
            ],
            layout: {
                ...commonLayoutProps,
                title: {
                    text: `Pressure Coefficient (Cp)`,
                    font: { size: 16, family: 'Arial, sans-serif' },
                    x: 0.5,
                    xanchor: 'center'
                },
                yaxis: {
                    ...commonLayoutProps.yaxis,
                    title: {
                        text: 'Cp',
                        font: { size: 14, family: 'Arial, sans-serif' }
                    }
                }
            },
            config: commonConfig
        };

        setPlotData({
            theta: thetaPlot,
            delta: deltaPlot,
            hbar: hbarPlot,
            cf: cfPlot,
            beta: betaPlot,
            cp: CpPlot
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
                    {/* Available .vis Files Section */}
                    {availableVisFiles.length > 0 && (
                        <div className="control-section">
                            <h3>Available .vis Files</h3>
                            <div className="vis-files-list">
                                {availableVisFiles.map((visFile, index) => (
                                    <div
                                        key={index}
                                        className="vis-file-item"
                                        onClick={() => handleSelectVisFromFolder(visFile)}
                                        title={`Click to load ${visFile.name}`}
                                    >
                                        <span className="vis-file-icon">📊</span>
                                        <span className="vis-file-name">{visFile.name}</span>
                                        {visData && visData.fileName === visFile.name && (
                                            <span className="vis-file-selected">✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="control-section">
                        <h3>File Information</h3>
                        {visData ? (
                            <div className="file-info">
                                <p><strong>File:</strong> {visData.fileName}</p>
                                <p><strong>Levels Available:</strong> {Object.keys(visData.levels || {}).length}</p>
                                {visData.levels[selectedLevel] && (
                                    <>
                                        <p><strong>Mach Number:</strong> {visData.levels[selectedLevel].machNumber}</p>
                                        <p><strong>Reynolds Number:</strong> {visData.levels[selectedLevel].reynoldsNumber}</p>
                                        <p><strong>Angle of Attack:</strong> {visData.levels[selectedLevel].incidence}°</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="no-file">
                                <p>No .vis file loaded</p>
                                {availableVisFiles.length > 0 ? (
                                    <p className="hint">Select a .vis file from above or import a new one</p>
                                ) : (
                                    <p className="hint">Import a .vis file to get started</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* BL Velocity Profile Toggle */}
                    <div className="control-section">
                        <h3>View Mode</h3>
                        <div className="toggle-container">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={showBLProfile}
                                    onChange={(e) => setShowBLProfile(e.target.checked)}
                                    className="toggle-checkbox"
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-text">BL Velocity Profile</span>
                            </label>
                        </div>
                    </div>

                    {visData && !showBLProfile && (
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

                    {/* BL Velocity Profile Controls */}
                    {visData && showBLProfile && (
                        <>
                            <div className="control-section">
                                <h3>Input Parameters</h3>
                                <div className="bl-inputs">
                                    <div className="input-group">
                                        <label>X/C:</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={blInputs.xc}
                                            onChange={(e) => setBLInputs(prev => ({
                                                ...prev,
                                                xc: parseFloat(e.target.value)
                                            }))}
                                            className="bl-input"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>η:</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={blInputs.eta}
                                            onChange={(e) => setBLInputs(prev => ({
                                                ...prev,
                                                eta: parseFloat(e.target.value)
                                            }))}
                                            className="bl-input"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={calculateBLProfile}
                                    className="calculate-btn"
                                >
                                    Calculate
                                </button>
                            </div>

                            <div className="control-section">
                                <h3>Surface Selection</h3>
                                <div className="surface-selection">
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="surface"
                                            value="upper"
                                            checked={selectedSurface === 'upper'}
                                            onChange={(e) => setSelectedSurface(e.target.value)}
                                        />
                                        <span>Upper Surface</span>
                                    </label>
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="surface"
                                            value="lower"
                                            checked={selectedSurface === 'lower'}
                                            onChange={(e) => setSelectedSurface(e.target.value)}
                                        />
                                        <span>Lower Surface</span>
                                    </label>
                                </div>
                            </div>

                            <div className="control-section">
                                <h3>Parameters</h3>
                                <div className="parameters-display">
                                    <div className="param-item">
                                        <span className="param-label">θ</span>
                                        <span className="param-value">{blParameters.theta}</span>
                                    </div>
                                    <div className="param-item">
                                        <span className="param-label">δ*</span>
                                        <span className="param-value">{blParameters.delta}</span>
                                    </div>
                                    <div className="param-item">
                                        <span className="param-label">H bar</span>
                                        <span className="param-value">{blParameters.hbar}</span>
                                    </div>
                                    <div className="param-item">
                                        <span className="param-label">Cf</span>
                                        <span className="param-value">{blParameters.cf}</span>
                                    </div>
                                    <div className="param-item">
                                        <span className="param-label">β</span>
                                        <span className="param-value">{blParameters.beta}</span>
                                    </div>
                                </div>
                            </div>
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
                            {availableVisFiles.length > 0 ? (
                                <div>
                                    <p>Select a .vis file from the available files above, or import a new one</p>
                                    <button onClick={handleImportVis} className="import-button-large">
                                        Import New .vis File
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p>Import a .vis file to get started</p>
                                    <button onClick={handleImportVis} className="import-button-large">
                                        Import .vis File
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Default 6-plot view */}
                    {visData && !showBLProfile && plotData.theta && (
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

                            <div className="plot-item">
                                <Plot
                                    data={plotData.cp.data}
                                    layout={plotData.cp.layout}
                                    config={plotData.cp.config}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </div>
                        </div>
                    )}

                    {/* BL Velocity Profile view */}
                    {visData && showBLProfile && (
                        <div className="bl-profile-container">
                            <div className="bl-profile-title">
                                <h2>Boundary Layer Velocity Profile</h2>
                            </div>
                            <div className="bl-plots-grid">
                                <div className="bl-plot-item">
                                    {blPlots.streamwise ? (
                                        <Plot
                                            data={blPlots.streamwise.data}
                                            layout={blPlots.streamwise.layout}
                                            config={blPlots.streamwise.config}
                                            style={{ width: '100%', height: '100%' }}
                                            useResizeHandler={true}
                                        />
                                    ) : (
                                        <div className="empty-plot">
                                            <p>Click Calculate to generate streamwise velocity profile</p>
                                        </div>
                                    )}
                                </div>
                                <div className="bl-plot-item">
                                    {blPlots.crossflow ? (
                                        <Plot
                                            data={blPlots.crossflow.data}
                                            layout={blPlots.crossflow.layout}
                                            config={blPlots.crossflow.config}
                                            style={{ width: '100%', height: '100%' }}
                                            useResizeHandler={true}
                                        />
                                    ) : (
                                        <div className="empty-plot">
                                            <p>Click Calculate to generate crossflow velocity profile</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BoundaryLayer;
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Plot from "react-plotly.js";
import { fetchAPI } from '../utils/fetch';


function ContourPlot() {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [simulationData, setSimulationData] = useState(null);
    const [cpData, setCpData] = useState(null);
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [surface, setSurface] = useState("upper");
    const [contourType, setContourType] = useState("CP");
    const [contourLevels, setContourLevels] = useState(50);
    const [showIsolines, setShowIsolines] = useState(true);
    const [plotData, setPlotData] = useState(null);
    const [minValue, setMinValue] = useState(0);
    const [maxValue, setMaxValue] = useState(1);
    const [threshold, setThreshold] = useState(0);

    // Load data from navigation state
    useEffect(() => {
        if (location.state?.simulationFolder) {
            setSimulationData(location.state.simulationFolder);
        }
        if (location.state?.parsedCpData) {
            setCpData(location.state.parsedCpData);
            console.log("Loaded CP data:", location.state.parsedCpData);
        }
        if (location.state?.selectedLevel) {
            setSelectedLevel(location.state.selectedLevel);
        }
    }, [location.state]);

    // Levels dropdown
    useEffect(() => {
        if (cpData && cpData.levels) {
            const levelOptions = Object.keys(cpData.levels).map(levelKey => {
                const match = levelKey.match(/level(\d+)/);
                const num = match ? parseInt(match[1]) : 1;
                return {
                    value: levelKey,
                    label: `Level ${num}`,
                    levelNumber: num
                };
            });
            levelOptions.sort((a, b) => b.levelNumber - a.levelNumber);
            setLevels(levelOptions);
            if (!selectedLevel && levelOptions.length > 0) {
                setSelectedLevel(levelOptions[0].value);
            }
        }
    }, [cpData, selectedLevel]);

    // Value range for threshold slider
    useEffect(() => {
        if (!cpData || !selectedLevel) return;
        const levelObj = cpData.levels[selectedLevel];
        if (!levelObj) return;

        // Gather all values for selected contour type
        let allVals = [];
        Object.values(levelObj.sections || {}).forEach(section => {
            if (section && section[contourType]) {
                allVals = allVals.concat(section[contourType]);
            }
        });
        if (allVals.length > 0) {
            const min = Math.min(...allVals);
            const max = Math.max(...allVals);
            setMinValue(min);
            setMaxValue(max);
            setThreshold(min);
        }
    }, [cpData, selectedLevel, contourType]);


    function interpolateToGrid(xSource, ySource, xTarget) {
        // Linear interpolation for each xTarget value
        return xTarget.map(x => {
            if (x < xSource[0] || x > xSource[xSource.length - 1]) return null;
            for (let i = 0; i < xSource.length - 1; i++) {
                if (xSource[i] <= x && x <= xSource[i + 1]) {
                    const t = (x - xSource[i]) / (xSource[i + 1] - xSource[i]);
                    return ySource[i] + t * (ySource[i + 1] - ySource[i]);
                }
            }
            return null;
        });
    }

    function buildWingGrid(cpData, selectedLevel, contourType, surface, threshold) {
        if (!cpData || !selectedLevel || !cpData.levels[selectedLevel]) return null;
        const levelObj = cpData.levels[selectedLevel];
        const sections = levelObj.sections || {};

        let yArr = [];
        let allX = [];

        // Gather all XPHYS values for the selected surface
        Object.values(sections).forEach(section => {
            const xphys = section.XPHYS || [];
            if (xphys.length === 0) return;
            const midIdx = Math.floor(xphys.length / 2);
            const xFiltered = (surface === "lower") ? xphys.slice(0, midIdx) : xphys.slice(midIdx);
            allX.push(...xFiltered);
        });

        // Deduplicate and sort
        const xRef = Array.from(new Set(allX)).sort((a, b) => a - b);

        let zGrid = [];
        Object.values(sections).forEach(section => {
            let yave = section.coefficients?.YAVE;
            if (yave === undefined) {
                const match = (section.sectionHeader || '').match(/YAVE=\s*([\d.-]+)/);
                yave = match ? parseFloat(match[1]) : undefined;
            }
            if (yave === undefined) return;

            const xphys = section.XPHYS || [];
            const vals = section[contourType] || [];
            if (xphys.length !== vals.length || xphys.length === 0) return;

            const midIdx = Math.floor(xphys.length / 2);
            const xFiltered = (surface === "lower") ? xphys.slice(0, midIdx) : xphys.slice(midIdx);
            const zFiltered = (surface === "lower") ? vals.slice(0, midIdx) : vals.slice(midIdx);

            // Interpolate to common grid
            let zRow = interpolateToGrid(xFiltered, zFiltered, xRef)
                .map(v => (v !== null && v >= threshold ? v : null));

            yArr.push(yave);
            zGrid.push(zRow);
        });

        if (zGrid.length === 0) return null;

        return {
            x: xRef, // 1D array: common XPHYS grid
            y: yArr, // 1D array: YAVE for each section
            z: zGrid // 2D array: CP/M for each section
        };
    }


    useEffect(() => {
        if (!cpData || !selectedLevel || !cpData.levels[selectedLevel]) {
            setPlotData(null);
            return;
        }

        // Build grid for selected surface and threshold
        const grid = buildWingGrid(cpData, selectedLevel, contourType, surface, threshold);
        console.log("Generated grid:", grid);
        if (!grid || grid.x.length === 0) {
            setPlotData(null);
            return;
        }

        setPlotData({
            data: [{
                type: "contour",
                x: grid.x,
                y: grid.y,
                z: grid.z,
                colorscale: "Jet",
                colorbar: {
                    title: contourType,
                    titlefont: { size: 14 },
                    tickfont: { size: 12 }
                },
                zauto: false,
                zmin: minValue,
                zmax: maxValue,
                ncontours: contourLevels,
                contours: {
                    coloring: showIsolines ? "heatmap" : "lines",
                    showlines: showIsolines
                },
                showscale: true,
                hoverongaps: false
            }],
            layout: {
                title: `${contourType} Contour - ${selectedLevel} (${surface === "upper" ? "Upper" : "Lower"} Surface)`,
                xaxis: { title: "XPHYS", showgrid: true },
                yaxis: { title: "YAVE", showgrid: true },
                margin: { l: 80, r: 120, t: 80, b: 80 },
                paper_bgcolor: "white",
                plot_bgcolor: "white",
                autosize: true
            },
            config: {
                displayModeBar: true,
                displaylogo: false,
                responsive: true
            }
        });
    }, [cpData, selectedLevel, surface, contourType, contourLevels, showIsolines, threshold, minValue, maxValue]);


    // UI
    return (
        <div className="flex flex-col h-screen bg-blue-50 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-blue-200 shadow-sm">
                <h1 className="text-xl font-semibold text-gray-800">Contour Plot Visualization</h1>
                <button
                    onClick={() => navigate("/post-processing")}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                    Back to Post-Processing
                </button>
            </div>
            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Controls Sidebar */}
                <div className="w-80 bg-white border-r border-blue-200 p-4 overflow-y-auto flex-shrink-0">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-400">
                            File Information
                        </h3>
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                            <p className="mb-2 text-sm">
                                <span className="font-semibold text-gray-700">Simulation:</span>
                                <span className="text-gray-900"> {simulationData?.simName || "N/A"}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold text-gray-700">CP File:</span>
                                <span className="text-gray-900"> {cpData?.fileName || "Loaded"}</span>
                            </p>
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-400">
                            Plot Configuration
                        </h3>
                        {/* Level Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                            <select
                                value={selectedLevel}
                                onChange={e => setSelectedLevel(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="">Select Level</option>
                                {levels.map(level => (
                                    <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Surface Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Surface</label>
                            <div className="flex space-x-3">
                                <button
                                    className={`px-4 py-2 rounded-lg font-medium ${surface === "upper" ? "bg-blue-600 text-white" : "bg-white border border-blue-300 text-blue-700"}`}
                                    onClick={() => setSurface("upper")}
                                >Upper</button>
                                <button
                                    className={`px-4 py-2 rounded-lg font-medium ${surface === "lower" ? "bg-blue-600 text-white" : "bg-white border border-blue-300 text-blue-700"}`}
                                    onClick={() => setSurface("lower")}
                                >Lower</button>
                            </div>
                        </div>
                        {/* Contour Type */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contour Type</label>
                            <select
                                value={contourType}
                                onChange={e => setContourType(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="CP">Pressure Coefficient (CP)</option>
                                <option value="M">Mach Number</option>
                            </select>
                        </div>
                        {/* Contour Levels */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contour Levels: {contourLevels}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={contourLevels}
                                onChange={e => setContourLevels(parseInt(e.target.value) || 50)}
                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>10</span>
                                <span>100</span>
                            </div>
                        </div>
                        {/* Isolines Toggle */}
                        <div className="mb-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showIsolines}
                                    onChange={e => setShowIsolines(e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="font-medium text-gray-800 text-sm">Show Isolines</span>
                            </label>
                        </div>
                        {/* Threshold Slider */}
                        {selectedLevel && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Threshold Value: {threshold.toFixed(4)}
                                </label>
                                <input
                                    type="range"
                                    min={minValue}
                                    max={maxValue}
                                    step={(maxValue - minValue) / 1000}
                                    value={threshold}
                                    onChange={e => setThreshold(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>{minValue.toFixed(3)}</span>
                                    <span>{maxValue.toFixed(3)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Value Range Display */}
                    {selectedLevel && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-400">
                                Value Range
                            </h3>
                            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="font-semibold text-gray-700 text-sm">Min:</span>
                                        <span className="font-mono text-gray-900 text-xs">{minValue.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="font-semibold text-gray-700 text-sm">Max:</span>
                                        <span className="font-mono text-gray-900 text-xs">{maxValue.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="font-semibold text-gray-700 text-sm">Range:</span>
                                        <span className="font-mono text-gray-900 text-xs">
                                            {(maxValue - minValue).toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Main Plot Area */}
                <div className="flex-1 flex flex-col p-4 bg-white overflow-hidden">
                    {plotData ? (
                        <div className="flex-1 border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <Plot
                                data={plotData.data}
                                layout={plotData.layout}
                                config={plotData.config}
                                style={{ width: "100%", height: "100%" }}
                                useResizeHandler={true}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                                Welcome to Contour Plot Visualization
                            </h2>
                            <p className="text-gray-600 text-lg mb-6">
                                Select surface and configure parameters to display contour plots
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {/* Custom slider thumb styling for Tailwind */}
            <style>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
}

export default ContourPlot;
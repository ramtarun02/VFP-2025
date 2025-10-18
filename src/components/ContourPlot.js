import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Plot from 'react-plotly.js';

function ContourPlot() {
    const navigate = useNavigate();
    const location = useLocation();

    // State variables
    const [simulationData, setSimulationData] = useState(null);
    const [parsedCpData, setParsedCpData] = useState(null);
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState('');
    const [selectedSurface, setSelectedSurface] = useState('upper');
    const [selectedContourType, setSelectedContourType] = useState('CP');
    const [contourLevels, setContourLevels] = useState(50);
    const [showIsolines, setShowIsolines] = useState(true);
    const [contourData, setContourData] = useState(null);
    const [minValue, setMinValue] = useState(0);
    const [maxValue, setMaxValue] = useState(1);
    const [thresholdValue, setThresholdValue] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize component with data from PostProcessing
    useEffect(() => {
        if (location.state) {
            const { simulationFolder, parsedCpData: cpData, selectedLevel: level } = location.state;

            setSimulationData(simulationFolder);
            setParsedCpData(cpData);

            if (cpData && cpData.levels) {
                const levelOptions = cpData.levels.map((levelData, index) => {
                    const levelMatch = levelData.flowParameters.match(/LEV=\s*(\d+)/);
                    const levelNumber = levelMatch ? parseInt(levelMatch[1]) : index + 1;

                    return {
                        value: index + 1,
                        label: `Level ${levelNumber}`,
                        actualLevelNumber: levelNumber,
                        data: levelData
                    };
                });

                setLevels(levelOptions);

                if (level) {
                    setSelectedLevel(level);
                } else if (levelOptions.length > 0) {
                    setSelectedLevel('1');
                }
            }
        }
    }, [location.state]);

    // Update min/max values when level or contour type changes
    useEffect(() => {
        if (parsedCpData && selectedLevel) {
            updateMinMaxValues();
        }
    }, [parsedCpData, selectedLevel, selectedContourType]);

    // Generate contour plot when parameters change
    useEffect(() => {
        if (parsedCpData && selectedLevel) {
            const timeoutId = setTimeout(() => {
                generateContourPlotWithLoading();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [parsedCpData, selectedLevel, selectedSurface, selectedContourType, contourLevels, showIsolines, thresholdValue]);

    const updateMinMaxValues = () => {
        if (!parsedCpData || !selectedLevel) return;

        const levelIndex = parseInt(selectedLevel) - 1;
        if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) return;

        const level = parsedCpData.levels[levelIndex];
        const sections = level.sections;

        let allValues = [];

        sections.forEach(section => {
            if (section.mainTable && section.mainTable.length > 0) {
                const columnIndex = selectedContourType === 'CP' ? 2 : 4;
                section.mainTable.forEach(row => {
                    if (row.length > columnIndex && typeof row[columnIndex] === 'number') {
                        allValues.push(row[columnIndex]);
                    }
                });
            }
        });

        if (allValues.length > 0) {
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            setMinValue(min);
            setMaxValue(max);
            setThresholdValue(min);
        }
    };

    const generateContourPlot = useCallback(() => {
        if (!parsedCpData || !selectedLevel) {
            setContourData(null);
            return;
        }

        const levelIndex = parseInt(selectedLevel) - 1;
        if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) {
            setContourData(null);
            return;
        }

        const level = parsedCpData.levels[levelIndex];
        const sections = level.sections;

        if (!sections || sections.length === 0) {
            setContourData(null);
            return;
        }

        // Extract data for contour plotting with mirroring
        const allX = [];
        const allY = [];
        const allZ = [];
        const wingOutlineData = {
            rightSide: { x: [], leadingEdge: [], trailingEdge: [] },
            leftSide: { x: [], leadingEdge: [], trailingEdge: [] }
        };

        sections.forEach((section, sectionIndex) => {
            if (!section.mainTable || section.mainTable.length === 0) return;

            const yaveMatch = section.sectionHeader.match(/YAVE=\s*([\d.-]+)/);
            const yave = yaveMatch ? parseFloat(yaveMatch[1]) : sectionIndex;

            const mainTable = section.mainTable;
            const limit = Math.floor((mainTable.length - 1) / 2);

            let dataToUse = [];
            if (selectedSurface === 'upper') {
                dataToUse = mainTable.slice(limit);
            } else {
                dataToUse = mainTable.slice(0, limit + 1);
            }

            const rightSideData = {
                x: [],
                y: [],
                z: [],
                spanPos: yave
            };

            let minX = Infinity, maxX = -Infinity;

            dataToUse.forEach(row => {
                if (row.length >= 10) {
                    const xCoord = typeof row[8] === 'number' ? row[8] : 0;
                    const zCoord = typeof row[9] === 'number' ? row[9] : 0;
                    const contourValue = selectedContourType === 'CP'
                        ? (typeof row[2] === 'number' ? row[2] : 0)
                        : (typeof row[4] === 'number' ? row[4] : 0);

                    rightSideData.x.push(xCoord);
                    rightSideData.y.push(zCoord);
                    rightSideData.z.push(contourValue);

                    minX = Math.min(minX, xCoord);
                    maxX = Math.max(maxX, xCoord);
                }
            });

            rightSideData.x.forEach((x, idx) => {
                allX.push(rightSideData.spanPos);
                allY.push(x);
                allZ.push(rightSideData.z[idx]);
            });

            rightSideData.x.forEach((x, idx) => {
                allX.push(-rightSideData.spanPos);
                allY.push(x);
                allZ.push(rightSideData.z[idx]);
            });

            wingOutlineData.rightSide.x.push(yave);
            wingOutlineData.rightSide.leadingEdge.push(minX);
            wingOutlineData.rightSide.trailingEdge.push(maxX);

            wingOutlineData.leftSide.x.push(-yave);
            wingOutlineData.leftSide.leadingEdge.push(minX);
            wingOutlineData.leftSide.trailingEdge.push(maxX);
        });

        if (allX.length === 0) {
            setContourData(null);
            return;
        }

        const filteredData = { x: [], y: [], z: [] };
        for (let i = 0; i < allZ.length; i++) {
            if (selectedContourType === 'CP') {
                if (allZ[i] >= thresholdValue) {
                    filteredData.x.push(allX[i]);
                    filteredData.y.push(allY[i]);
                    filteredData.z.push(allZ[i]);
                }
            } else {
                if (allZ[i] >= thresholdValue) {
                    filteredData.x.push(allX[i]);
                    filteredData.y.push(allY[i]);
                    filteredData.z.push(allZ[i]);
                }
            }
        }

        const plotData = [{
            x: filteredData.x.length > 0 ? filteredData.x : allX,
            y: filteredData.x.length > 0 ? filteredData.y : allY,
            z: filteredData.x.length > 0 ? filteredData.z : allZ,
            type: 'contour',
            colorscale: 'Jet',
            contours: {
                coloring: 'fill',
                showlines: showIsolines,
                size: (maxValue - minValue) / Math.min(contourLevels, 50),
                start: minValue,
                end: maxValue
            },
            colorbar: {
                title: selectedContourType,
                titlefont: { size: 14 },
                tickfont: { size: 12 }
            },
            zmin: minValue,
            zmax: maxValue,
            ncontours: Math.min(contourLevels, 50),
            connectgaps: false
        }];

        const outlineTraces = [
            {
                x: wingOutlineData.rightSide.x,
                y: wingOutlineData.rightSide.leadingEdge,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'black', width: 2 },
                name: 'Leading Edge',
                showlegend: false
            },
            {
                x: wingOutlineData.rightSide.x,
                y: wingOutlineData.rightSide.trailingEdge,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'black', width: 2 },
                name: 'Trailing Edge',
                showlegend: false
            },
            {
                x: wingOutlineData.leftSide.x,
                y: wingOutlineData.leftSide.leadingEdge,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'black', width: 2 },
                showlegend: false
            },
            {
                x: wingOutlineData.leftSide.x,
                y: wingOutlineData.leftSide.trailingEdge,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'black', width: 2 },
                showlegend: false
            }
        ];

        plotData.push(...outlineTraces);

        const layout = {
            title: `${selectedContourType} Contour Plot - Level ${selectedLevel} (${selectedSurface} Surface)`,
            xaxis: {
                title: 'Spanwise Position (YAVE)',
                showgrid: true,
                zeroline: true
            },
            yaxis: {
                title: 'Chordwise Position (X)',
                showgrid: true,
                zeroline: true,
                autorange: 'reversed'
            },
            margin: { l: 80, r: 80, t: 80, b: 80 },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',
            showlegend: false,
            autosize: true,
            hovermode: 'closest'
        };

        setContourData({
            data: plotData,
            layout: layout,
            config: {
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                responsive: true,
                doubleClick: 'reset+autosize'
            }
        });
    }, [parsedCpData, selectedLevel, selectedSurface, selectedContourType, contourLevels, showIsolines, thresholdValue, minValue, maxValue]);

    const generateContourPlotWithLoading = useCallback(async () => {
        setIsLoading(true);
        setTimeout(() => {
            generateContourPlot();
            setIsLoading(false);
        }, 50);
    }, [generateContourPlot]);

    const handleThresholdChange = (event) => {
        const value = parseFloat(event.target.value);
        setThresholdValue(value);
    };

    return (
        <div className="flex flex-col h-screen bg-blue-50 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 bg-white border-b border-blue-200 shadow-sm">
                <div className="flex items-center">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800">Contour Plot Visualization</h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                        onClick={() => navigate('/post-processing')}
                        className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                        <span className="hidden sm:inline">Back to Post-Processing</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Controls Sidebar */}
                <div className="w-64 lg:w-80 bg-white border-r border-blue-200 p-3 lg:p-4 overflow-y-auto flex-shrink-0">
                    {/* File Information Section */}
                    <div className="mb-4 lg:mb-6">
                        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 pb-2 border-b-2 border-blue-400">
                            File Information
                        </h3>
                        <div className="bg-blue-50 p-3 lg:p-4 rounded-lg border-l-4 border-blue-400">
                            <p className="mb-2 text-sm">
                                <span className="font-semibold text-gray-700">Simulation:</span>
                                <span className="text-gray-900"> {simulationData?.simName || 'N/A'}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold text-gray-700">CP File:</span>
                                <span className="text-gray-900"> {parsedCpData?.fileName || 'Loaded'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Plot Configuration */}
                    <div className="mb-4 lg:mb-6">
                        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 pb-2 border-b-2 border-blue-400">
                            Plot Configuration
                        </h3>

                        {/* Level Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm lg:text-base transition-colors duration-200"
                            >
                                <option value="">Select Level</option>
                                {levels.map(level => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Surface Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Surface</label>
                            <div className="space-y-2">
                                <label className="flex items-center p-2 lg:p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors duration-200">
                                    <input
                                        type="radio"
                                        name="surface"
                                        value="upper"
                                        checked={selectedSurface === 'upper'}
                                        onChange={(e) => setSelectedSurface(e.target.value)}
                                        className="mr-2 lg:mr-3 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`font-medium text-sm lg:text-base ${selectedSurface === 'upper' ? 'text-blue-600' : 'text-gray-700'}`}>Upper Surface</span>
                                </label>
                                <label className="flex items-center p-2 lg:p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors duration-200">
                                    <input
                                        type="radio"
                                        name="surface"
                                        value="lower"
                                        checked={selectedSurface === 'lower'}
                                        onChange={(e) => setSelectedSurface(e.target.value)}
                                        className="mr-2 lg:mr-3 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`font-medium text-sm lg:text-base ${selectedSurface === 'lower' ? 'text-blue-600' : 'text-gray-700'}`}>Lower Surface</span>
                                </label>
                            </div>
                        </div>

                        {/* Contour Type Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contour Type</label>
                            <select
                                value={selectedContourType}
                                onChange={(e) => setSelectedContourType(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm lg:text-base transition-colors duration-200"
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
                                onChange={(e) => setContourLevels(parseInt(e.target.value) || 50)}
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
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={showIsolines}
                                        onChange={(e) => setShowIsolines(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 lg:w-12 h-5 lg:h-6 rounded-full transition-colors duration-200 ${showIsolines ? 'bg-blue-500' : 'bg-gray-300'
                                        }`}></div>
                                    <div className={`absolute top-0.5 left-0.5 w-4 lg:w-5 h-4 lg:h-5 bg-white rounded-full transition-transform duration-200 ${showIsolines ? 'transform translate-x-5 lg:translate-x-6' : ''
                                        }`}></div>
                                </div>
                                <span className="ml-2 lg:ml-3 font-medium text-gray-800 text-sm lg:text-base">Show Isolines</span>
                            </label>
                        </div>

                        {/* Threshold Slider */}
                        {selectedLevel && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Threshold Value: {thresholdValue.toFixed(4)}
                                </label>
                                <input
                                    type="range"
                                    min={minValue}
                                    max={maxValue}
                                    step={(maxValue - minValue) / 1000}
                                    value={thresholdValue}
                                    onChange={handleThresholdChange}
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
                        <div className="mb-4 lg:mb-6">
                            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 pb-2 border-b-2 border-blue-400">
                                Value Range
                            </h3>
                            <div className="bg-green-50 p-3 lg:p-4 rounded-lg border-l-4 border-green-400">
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
                                        <span className="font-mono text-gray-900 text-xs">{(maxValue - minValue).toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Plot Area */}
                <div className="flex-1 flex flex-col p-2 lg:p-4 bg-white overflow-hidden">
                    {isLoading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-10 lg:h-12 w-10 lg:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-lg lg:text-xl text-blue-600 font-medium">Generating Contour Plot...</p>
                                <p className="text-sm text-gray-500 mt-2">Please wait while the contour data is being processed</p>
                            </div>
                        </div>
                    ) : contourData ? (
                        <div className="flex-1 border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <Plot
                                data={contourData.data}
                                layout={contourData.layout}
                                config={contourData.config}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler={true}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <div className="text-blue-400 mb-4 lg:mb-6">
                                <svg className="w-16 lg:w-24 h-16 lg:h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl lg:text-3xl font-semibold text-gray-800 mb-3 lg:mb-4">Welcome to Contour Plot Visualization</h2>
                            <p className="text-gray-600 text-sm lg:text-lg mb-4 lg:mb-6">Select a level and configure parameters to display contour plots</p>
                            {!selectedLevel && (
                                <p className="text-blue-600 font-medium">Please select a level to get started</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
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
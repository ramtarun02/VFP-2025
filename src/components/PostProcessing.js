import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Plot from 'react-plotly.js';
import { fetchAPI } from '../utils/fetch';

function PostProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({
    dat: null,
    cp: null,
    forces: null
  });

  // Server response data states
  const [parsedForcesData, setParsedForcesData] = useState(null);
  const [parsedCpData, setParsedCpData] = useState(null);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedPlotType, setSelectedPlotType] = useState('Mach');
  const [selectedSection, setSelectedSection] = useState('');
  const [plotData1, setPlotData1] = useState(null);
  const [plotData2, setPlotData2] = useState(null);
  const [meshData, setMeshData] = useState(null);
  const [showMesh, setShowMesh] = useState(false);
  const resizeRef = useRef(null);
  const [showSpanwiseDistribution, setShowSpanwiseDistribution] = useState(false);
  const [selectedSpanwiseCoeff, setSelectedSpanwiseCoeff] = useState('CL');
  const [spanwiseData, setSpanwiseData] = useState(null);

  // Loading states
  const [isLoadingCP, setIsLoadingCP] = useState(false);
  const [isLoadingForces, setIsLoadingForces] = useState(false);
  const [isLoadingDAT, setIsLoadingDAT] = useState(false);

  // Coefficients data
  const [coefficients, setCoefficients] = useState({
    CL: 0.000000,
    CD: 0.000000,
    CM: -0.000000
  });

  const [dragBreakdown, setDragBreakdown] = useState({
    cdInduced: 0.000,
    cdViscous: 0.000,
    cdWave: 0.000
  });

  // Debug simulation data structure
  const debugSimulationData = (data) => {
    console.log('Debug - Simulation Data Structure:', {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      fullData: data,
      filesType: data?.files ? typeof data.files : 'undefined',
      filesKeys: data?.files ? Object.keys(data.files) : [],
      filesIsArray: Array.isArray(data?.files),
      sampleFile: data?.files ? (Array.isArray(data.files) ? data.files[0] : Object.values(data.files).flat()[0]) : null
    });
  };

  // Convert files array to expected object structure
  const convertFilesArrayToObject = (filesArray) => {
    const fileTypes = {
      dat: [],
      cp: [],
      forces: [],
      geo: [],
      map: [],
      txt: [],
      log: [],
      other: []
    };

    if (!Array.isArray(filesArray)) {
      console.log('Files is not an array:', filesArray);
      return fileTypes;
    }

    filesArray.forEach(file => {
      if (!file || !file.name) {
        console.log('Invalid file object:', file);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
      console.log(`Processing file: ${file.name}, extension: ${ext}`);

      if (fileTypes[ext]) {
        fileTypes[ext].push(file);
      } else {
        fileTypes.other.push(file);
      }
    });

    // Sort each type alphabetically
    Object.keys(fileTypes).forEach(type => {
      fileTypes[type].sort((a, b) => a.name.localeCompare(b.name));
      console.log(`${type} files:`, fileTypes[type].length);
    });

    return fileTypes;
  };

  // Process simulation data on component mount
  useEffect(() => {
    console.log('Location state received:', location.state);

    if (location.state && location.state.simulationFolder) {
      console.log('Raw simulation folder data:', location.state.simulationFolder);

      const receivedData = location.state.simulationFolder;
      let finalData = null;

      if (receivedData.data) {
        console.log('Processing server socket data:', receivedData.data);
        finalData = receivedData.data;
      } else {
        console.log('Processing direct data:', receivedData);
        finalData = receivedData;
      }

      debugSimulationData(finalData);

      if (finalData && Array.isArray(finalData.files)) {
        console.log('Converting files array to object structure');
        finalData = {
          ...finalData,
          files: convertFilesArrayToObject(finalData.files)
        };
        console.log('Converted data:', finalData);
      }

      setSimulationData(finalData);
    }
  }, [location.state]);

  // Update sections when level or CP data changes
  useEffect(() => {
    if (parsedCpData && selectedLevel) {
      console.log('Updating sections for level:', selectedLevel);
      console.log('Available levels in CP data:', Object.keys(parsedCpData.levels || {}));

      if (parsedCpData.levels && parsedCpData.levels[selectedLevel]) {
        const level = parsedCpData.levels[selectedLevel];
        console.log('Selected level data:', level);

        if (level.sections && Object.keys(level.sections).length > 0) {
          const sectionOptions = Object.entries(level.sections).map(([sectionKey, sectionData]) => {
            // Extract section number from sectionKey (e.g., "section1" -> 1)
            const sectionMatch = sectionKey.match(/section(\d+)/);
            const sectionNumber = sectionMatch ? parseInt(sectionMatch[1]) : 1;

            // Also try to get section number from sectionHeader if available
            let actualSectionNumber = sectionNumber;
            if (sectionData.sectionHeader) {
              const headerSectionMatch = sectionData.sectionHeader.match(/J=\s*(\d+)/);
              if (headerSectionMatch) {
                actualSectionNumber = parseInt(headerSectionMatch[1]);
              }
            }

            return {
              value: sectionKey, // Use the actual key like "section1"
              label: `Section ${actualSectionNumber}`,
              actualSectionNumber: actualSectionNumber,
              data: sectionData
            };
          });

          console.log('Section options created:', sectionOptions);
          setSections(sectionOptions);
          setSelectedSection('');
        } else {
          console.log('No sections found in level data');
          setSections([]);
          setSelectedSection('');
        }
      } else {
        console.log('Selected level not found in CP data');
        setSections([]);
        setSelectedSection('');
      }
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [parsedCpData, selectedLevel]);

  // Generate plots when selections change
  const generatePlotData = useCallback(() => {
    if (selectedLevel && selectedPlotType && selectedSection && parsedCpData && !showMesh) {
      generatePlot1Data();
      generatePlot2Data();
    }
  }, [selectedLevel, selectedPlotType, selectedSection, parsedCpData, showMesh]);

  useEffect(() => {
    generatePlotData();
  }, [generatePlotData]);

  // Generate spanwise plots when selections change
  const generateSpanwisePlotData = useCallback(() => {
    if (selectedLevel && selectedSpanwiseCoeff && parsedCpData && showSpanwiseDistribution) {
      console.log('generateSpanwisePlotData called');

      if (!parsedCpData.levels || !parsedCpData.levels[selectedLevel]) {
        console.log('Level not found for spanwise:', selectedLevel);
        return;
      }

      const level = parsedCpData.levels[selectedLevel];
      const sections = level.sections;

      if (!sections || Object.keys(sections).length === 0) {
        console.log('No sections found for spanwise');
        return;
      }

      // Extract YAVE and coefficient values from section coefficients
      const yaveValues = [];
      const coeffValues = [];

      Object.values(sections).forEach((section) => {
        if (section.coefficients) {
          const yave = section.coefficients.YAVE;
          const coeff = section.coefficients[selectedSpanwiseCoeff];

          if (yave !== undefined && coeff !== undefined) {
            yaveValues.push(yave);
            coeffValues.push(coeff);
          }
        }
      });

      if (yaveValues.length === 0 || coeffValues.length === 0) {
        console.log('No valid spanwise data found');
        return;
      }

      const plotColor = '#334155'; // Professional slate color

      const spanwisePlotData = [{
        x: yaveValues,
        y: coeffValues,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: plotColor, width: 2 },
        marker: { color: plotColor, size: 6 },
        name: `${selectedSpanwiseCoeff} vs YAVE`
      }];

      const spanwisePlotLayout = {
        title: `Spanwise Distribution - ${selectedSpanwiseCoeff} vs YAVE (Level ${selectedLevel})`,
        xaxis: {
          title: 'YAVE',
          showgrid: true,
          zeroline: true,
          showticklabels: true
        },
        yaxis: {
          title: selectedSpanwiseCoeff,
          showgrid: true,
          zeroline: true,
          showticklabels: true
        },
        margin: { l: 60, r: 40, t: 60, b: 60 },
        showlegend: false,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
      };

      setSpanwiseData({
        data: spanwisePlotData,
        layout: spanwisePlotLayout,
        config: {
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
        }
      });
    }
  }, [selectedLevel, selectedSpanwiseCoeff, parsedCpData, showSpanwiseDistribution]);

  useEffect(() => {
    generateSpanwisePlotData();
  }, [generateSpanwisePlotData]);

  // Resize handlers
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
      setExplorerWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Server file parsing functions
  const sendFileToServer = async (file, fileType) => {
    try {
      const simName = simulationData?.simName || 'unknown';
      console.log(`Sending ${fileType} file to server:`, file.name);

      let fileContent;

      // Get file content
      if (file.file) {
        // From folder import
        fileContent = await readFileContent(file.file);
      } else {
        // From server
        const response = await fetchAPI(`/get_file_content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            simName: simName,
            filePath: file.path || file.name
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        fileContent = await response.text();
      }

      // Send to parser endpoint
      const parseResponse = await fetchAPI(`/parse_${fileType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          content: fileContent,
          simName: simName
        })
      });

      if (!parseResponse.ok) {
        const errorText = await parseResponse.text();
        throw new Error(`Parse error! status: ${parseResponse.status}, message: ${errorText}`);
      }

      const parsedData = await parseResponse.json();
      console.log(`Parsed ${fileType} data received:`, parsedData);

      return parsedData;

    } catch (error) {
      console.error(`Error processing ${fileType} file:`, error);

      if (error.message.includes('Failed to fetch')) {
        alert(`Network error processing ${fileType} file. Please check if the backend server is running.`);
      } else {
        alert(`Error processing ${fileType} file: ${error.message}`);
      }
      return null;
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Import folder handler
  const handleImportFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;

    input.onchange = (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        const folderStructure = processFolderFiles(files);
        setSimulationData(folderStructure);
      }
    };

    input.click();
  };

  // Navigate to ProWim handler
  const handleNavigateToProWim = () => {
    navigate('/post-processing/prowim', {
      state: {
        simulationFolder: simulationData
      }
    });
  };

  const handleContourPlotClick = () => {
    if (!parsedCpData || !selectedLevel) {
      alert('Please select CP file and choose a level first.');
      return;
    }

    navigate('/post-processing/contour-plot', {
      state: {
        simulationFolder: simulationData,
        simName: simulationData?.simName,
        parsedCpData: parsedCpData,
        selectedLevel: selectedLevel
      }
    });
  };

  const processFolderFiles = (fileList) => {
    const files = fileList.map(file => ({
      name: file.name,
      path: file.webkitRelativePath,
      size: file.size,
      modified: file.lastModified,
      isDirectory: false,
      file: file
    }));

    const sortedFiles = sortFilesByType(files);
    const folderName = files[0]?.path.split('/')[0] || 'Imported Folder';

    return {
      simName: folderName,
      folderPath: folderName,
      files: sortedFiles
    };
  };

  const sortFilesByType = (files) => {
    const fileTypes = {
      dat: [],
      cp: [],
      forces: [],
      geo: [],
      map: [],
      txt: [],
      log: [],
      other: []
    };

    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
      if (fileTypes[ext]) {
        fileTypes[ext].push(file);
      } else {
        fileTypes.other.push(file);
      }
    });

    Object.keys(fileTypes).forEach(type => {
      fileTypes[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return fileTypes;
  };

  // File selection handler
  const handleFileSelect = async (file) => {
    console.log('File selected:', file);

    const ext = file.name.split('.').pop().toLowerCase();
    console.log('File extension:', ext);

    if (['dat', 'cp', 'forces'].includes(ext)) {
      setSelectedFiles(prev => ({
        ...prev,
        [ext]: file
      }));

      // Handle different file types
      if (ext === 'cp') {
        setIsLoadingCP(true);
        setParsedCpData(null);
        setSections([]);
        setSelectedLevel('');
        setSelectedSection('');
        setLevels([]);

        const parsedData = await sendFileToServer(file, 'cp');
        setIsLoadingCP(false);

        if (parsedData) {
          console.log('CP Data received:', parsedData);
          setParsedCpData(parsedData);

          // Create level options from parsed data
          if (parsedData.levels && Object.keys(parsedData.levels).length > 0) {
            const levelOptions = Object.entries(parsedData.levels).map(([levelKey, levelData]) => {
              // Extract level number from levelKey (e.g., "level1" -> 1)
              const levelMatch = levelKey.match(/level(\d+)/);
              const levelNumber = levelMatch ? parseInt(levelMatch[1]) : 1;

              // Also try to get level from flowParameters if available
              let actualLevelNumber = levelNumber;
              if (levelData.flowParameters) {
                const flowLevelMatch = levelData.flowParameters.match(/LEV=\s*(\d+)/);
                if (flowLevelMatch) {
                  actualLevelNumber = parseInt(flowLevelMatch[1]);
                }
              }

              return {
                value: levelKey, // Use the actual key like "level1"
                label: `Level ${actualLevelNumber}`,
                actualLevelNumber: actualLevelNumber,
                data: levelData
              };
            });

            console.log('Level options created:', levelOptions);
            setLevels(levelOptions);
          }
        }
      }

      if (ext === 'forces') {
        setIsLoadingForces(true);
        setParsedForcesData(null);

        const parsedData = await sendFileToServer(file, 'forces');
        setIsLoadingForces(false);

        if (parsedData) {
          console.log('Forces Data received:', parsedData);
          setParsedForcesData(parsedData);

          // Update coefficients with the last level's data
          if (parsedData.levels && Object.keys(parsedData.levels).length > 0) {
            const levelKeys = Object.keys(parsedData.levels);
            const lastLevelKey = levelKeys[levelKeys.length - 1];
            const lastLevel = parsedData.levels[lastLevelKey];

            if (lastLevel.vfpCoefficients) {
              setCoefficients({
                CL: lastLevel.vfpCoefficients.CL || 0.000000,
                CD: lastLevel.vfpCoefficients.CD || 0.000000,
                CM: lastLevel.vfpCoefficients.CM || 0.000000
              });
            }

            const newDragBreakdown = {
              cdInduced: lastLevel.vortexCoefficients?.CD || 0.000,
              cdViscous: lastLevel.viscousDragData?.totalViscousDrag || 0.000,
              cdWave: 0.000
            };

            setDragBreakdown(newDragBreakdown);
          }
        }
      }

      if (ext === 'dat') {
        setIsLoadingDAT(true);

        const parsedData = await sendFileToServer(file, 'dat');
        setIsLoadingDAT(false);

        if (parsedData) {
          console.log('DAT file parsed successfully:', parsedData);
        }
      }
    }
  };

  // Mesh button handler
  const handleMeshClick = () => {
    if (!parsedCpData || !selectedLevel || !parsedForcesData) {
      alert('Please select CP and Forces files and choose a level first.');
      return;
    }

    if (showMesh) {
      setShowMesh(false);
      setMeshData(null);
    } else {
      generateMeshData();
      setShowMesh(true);
    }
  };

  // Generate mesh data
  const generateMeshData = () => {
    console.log('generateMeshData called');

    if (!parsedCpData || !selectedLevel || !parsedForcesData) {
      console.log('Missing data in generateMeshData');
      return;
    }

    if (!parsedCpData.levels || !parsedCpData.levels[selectedLevel]) {
      console.log('Level not found in CP data');
      return;
    }

    const level = parsedCpData.levels[selectedLevel];
    const sections = level.sections;

    if (!sections || Object.keys(sections).length === 0) {
      console.log('No sections found in level');
      return;
    }

    const meshLines = [];
    const allX = [];
    const allY = [];
    const allZ = [];

    // Process each section to build the mesh
    Object.values(sections).forEach((section, sectionIndex) => {
      if (!section['X/C'] || !section['Z/C']) return;

      const xCoords = section['X/C'];
      const zCoords = section['Z/C'];

      // Get YAVE from section coefficients
      let yave = 0;
      if (section.coefficients && section.coefficients.YAVE !== undefined) {
        yave = section.coefficients.YAVE;
      }

      // Create chordwise lines
      for (let i = 0; i < xCoords.length - 1; i++) {
        meshLines.push({
          x: [xCoords[i], xCoords[i + 1]],
          y: [yave, yave],
          z: [zCoords[i], zCoords[i + 1]],
          mode: 'lines',
          type: 'scatter3d',
          line: { color: '#334155', width: 2 }, // Professional slate color
          showlegend: false,
          hoverinfo: 'skip'
        });
      }

      // Collect all points
      xCoords.forEach((x, idx) => {
        allX.push(x);
        allY.push(yave);
        allZ.push(zCoords[idx]);
      });
    });

    const meshPlotData = {
      data: meshLines,
      layout: {
        title: `CFD Mesh Visualization - Level ${selectedLevel}`,
        scene: {
          xaxis: {
            title: 'X/C',
            showgrid: true,
            zeroline: true
          },
          yaxis: {
            title: 'Y (Span)',
            showgrid: true,
            zeroline: true
          },
          zaxis: {
            title: 'Z/C',
            showgrid: true,
            zeroline: true
          },
          aspectmode: 'data',
          bgcolor: 'white'
        },
        margin: { l: 0, r: 0, t: 40, b: 0 },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white'
      },
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
      }
    };

    setMeshData(meshPlotData);
  };

  // Add spanwise distribution button handler
  const handleSpanwiseDistributionClick = () => {
    if (!parsedCpData || !selectedLevel) {
      alert('Please select CP file and choose a level first.');
      return;
    }

    if (showSpanwiseDistribution) {
      setShowSpanwiseDistribution(false);
      setSpanwiseData(null);
    } else {
      setShowSpanwiseDistribution(true);
      setShowMesh(false);
      setMeshData(null);
    }
  };

  // Generate 2D plot data
  const generatePlot1Data = () => {
    if (!parsedCpData || !selectedLevel || !selectedSection) return;

    console.log('Generating plot1 data for level:', selectedLevel, 'section:', selectedSection);

    if (!parsedCpData.levels || !parsedCpData.levels[selectedLevel]) {
      console.log('Level not found:', selectedLevel);
      setPlotData1(null);
      return;
    }

    const level = parsedCpData.levels[selectedLevel];
    if (!level.sections || !level.sections[selectedSection]) {
      console.log('Section not found:', selectedSection);
      setPlotData1(null);
      return;
    }

    const section = level.sections[selectedSection];
    console.log('Section data:', section);

    // Use the correct data structure from readCP
    const xValues = section['X/C'] || [];
    const yValues = selectedPlotType === 'Cp'
      ? (section['CP'] || [])
      : (section['M'] || []);

    console.log('Plot data:', { xValues: xValues.length, yValues: yValues.length });

    if (xValues.length === 0 || yValues.length === 0) {
      setPlotData1(null);
      return;
    }

    const plotColor = '#334155'; // Professional slate color for all plots

    const plot1Data = [{
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: plotColor, width: 2 },
      marker: { color: plotColor, size: 4 },
      name: `${selectedPlotType} vs X/C`
    }];

    const plot1Layout = {
      title: `${selectedPlotType} vs X/C - Section ${selectedSection}`,
      xaxis: {
        title: {
          text: 'X/C',
          font: { size: 14, family: 'Arial, sans-serif' }
        },
        showgrid: true,
        zeroline: true,
        showticklabels: true
      },
      yaxis: {
        title: {
          text: selectedPlotType === 'Cp' ? 'Coefficient of Pressure (CP)' : 'Mach',
          font: { size: 14, family: 'Arial, sans-serif' }
        },
        showgrid: true,
        zeroline: true,
        showticklabels: true,
        autorange: selectedPlotType === 'Cp' ? 'reversed' : true
      },
      margin: { l: 60, r: 40, t: 60, b: 60 },
      showlegend: false,
      plot_bgcolor: 'white',
      paper_bgcolor: 'white'
    };

    setPlotData1({
      data: plot1Data,
      layout: plot1Layout,
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
      }
    });
  };

  const generatePlot2Data = () => {
    if (!parsedCpData || !selectedLevel || !selectedSection) return;

    if (!parsedCpData.levels || !parsedCpData.levels[selectedLevel]) {
      setPlotData2(null);
      return;
    }

    const level = parsedCpData.levels[selectedLevel];
    if (!level.sections || !level.sections[selectedSection]) {
      setPlotData2(null);
      return;
    }

    const section = level.sections[selectedSection];

    // Use the correct data structure from readCP
    const xValues = section['X/C'] || [];
    const zValues = section['Z/C'] || [];

    if (xValues.length === 0 || zValues.length === 0) {
      setPlotData2(null);
      return;
    }

    const plot2Data = [{
      x: xValues,
      y: zValues,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#334155', width: 2 }, // Professional slate color
      marker: { color: '#334155', size: 4 },
      name: 'Z/C vs X/C'
    }];

    const plot2Layout = {
      title: `Z/C vs X/C - Section ${selectedSection}`,
      xaxis: {
        title: 'X/C',
        showgrid: true,
        zeroline: true,
        showticklabels: true
      },
      yaxis: {
        title: 'Z/C',
        showgrid: true,
        zeroline: true,
        showticklabels: true
      },
      margin: { l: 60, r: 40, t: 60, b: 60 },
      showlegend: false,
      plot_bgcolor: 'white',
      paper_bgcolor: 'white'
    };

    setPlotData2({
      data: plot2Data,
      layout: plot2Layout,
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
      }
    });
  };

  const handleBoundaryLayerClick = () => {
    navigate('/post-processing/boundary-layer', {
      state: {
        simulationFolder: simulationData,
        simName: simulationData?.simName
      }
    });
  };

  // Render file explorer
  const renderFileExplorer = () => {
    if (!simulationData) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">No simulation data loaded</p>
          <button
            onClick={handleImportFolder}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Import Folder
          </button>
        </div>
      );
    }

    const files = simulationData.files || {};
    const hasFiles = Object.keys(files).some(fileType =>
      Array.isArray(files[fileType]) && files[fileType].length > 0
    );

    if (!hasFiles) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{simulationData.simName}</h3>
          <p className="text-gray-600 mb-4">No files found in the simulation folder</p>
          <button
            onClick={handleImportFolder}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Import Different Folder
          </button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{simulationData.simName}</h3>
          <div className="space-y-1">
            <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.dat ? 'bg-slate-100 text-slate-800' : 'bg-gray-100 text-gray-600'}`}>
              DAT: {isLoadingDAT ? '⏳ Loading...' : selectedFiles.dat ? '✓ Loaded' : '○ Not loaded'}
            </div>
            <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.cp ? 'bg-slate-100 text-slate-800' : 'bg-gray-100 text-gray-600'}`}>
              CP: {isLoadingCP ? '⏳ Loading...' : selectedFiles.cp ? '✓ Loaded' : '○ Not loaded'}
            </div>
            <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.forces ? 'bg-slate-100 text-slate-800' : 'bg-gray-100 text-gray-600'}`}>
              FORCES: {isLoadingForces ? '⏳ Loading...' : selectedFiles.forces ? '✓ Loaded' : '○ Not loaded'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(files).map(([fileType, fileList]) => {
            if (!Array.isArray(fileList) || fileList.length === 0) {
              return null;
            }

            return (
              <div key={fileType} className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{getFileTypeIcon(fileType)}</span>
                  <span className="font-medium text-gray-800">{fileType.toUpperCase()} Files ({fileList.length})</span>
                </div>
                <div className="space-y-1">
                  {fileList.map((file, index) => {
                    const isLoading = (fileType === 'cp' && isLoadingCP) ||
                      (fileType === 'forces' && isLoadingForces) ||
                      (fileType === 'dat' && isLoadingDAT);

                    return (
                      <div
                        key={index}
                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${isFileSelected(file)
                          ? 'bg-slate-100 border border-slate-300 shadow-sm'
                          : ['dat', 'cp', 'forces'].includes(fileType)
                            ? 'hover:bg-gray-50 border border-transparent'
                            : 'border border-transparent text-gray-500 cursor-default'
                          } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
                        onClick={() => !isLoading && ['dat', 'cp', 'forces'].includes(fileType) && handleFileSelect(file)}
                        title={file.name}
                      >
                        <span className="text-sm mr-2">
                          {isLoading ? '⏳' : getFileIcon(file.name)}
                        </span>
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        {isFileSelected(file) && !isLoading && <span className="text-slate-600 text-sm font-medium">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isFileSelected = (file) => {
    return Object.values(selectedFiles).some(selected => selected?.path === file.path);
  };

  const getFileTypeIcon = (fileType) => {
    const icons = {
      dat: '📊',
      cp: '📈',
      forces: '⚡',
      geo: '🔧',
      map: '🗺️',
      txt: '📝',
      log: '📋',
      other: '📄'
    };
    return icons[fileType] || '📄';
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'dat': return '📊';
      case 'cp': return '📈';
      case 'forces': return '⚡';
      case 'map': return '🗺️';
      case 'geo': return '🔧';
      case 'txt': return '📝';
      case 'log': return '📋';
      default: return '📄';
    }
  };

  // ...existing imports and logic code stays the same...

  return (
    <div className="h-screen w-screen flex flex-col bg-blue-50 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-blue-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={() => setIsExplorerOpen(!isExplorerOpen)}
            title={isExplorerOpen ? 'Hide file explorer' : 'Show file explorer'}
          >
            <svg className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${isExplorerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Post-Processing Module</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleImportFolder}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Import Folder
          </button>
          <button
            onClick={handleNavigateToProWim}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ProWiM
          </button>
          <button
            onClick={handleContourPlotClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Contour Plots
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Back to Main
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer Sidebar */}
        <div
          className={`bg-white border-r border-blue-200 transition-all duration-300 ${isExplorerOpen ? 'w-80' : 'w-0'
            } overflow-hidden relative`}
          style={{ width: isExplorerOpen ? `${explorerWidth}px` : '0px' }}
        >
          {/* File Explorer Content */}
          {!simulationData ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="text-blue-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">No simulation data loaded</p>
              <button
                onClick={handleImportFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Import Folder
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-blue-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">{simulationData.simName}</h3>
                <div className="space-y-1">
                  <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.dat ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    DAT: {isLoadingDAT ? '⏳ Loading...' : selectedFiles.dat ? '✓ Loaded' : '○ Not loaded'}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.cp ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    CP: {isLoadingCP ? '⏳ Loading...' : selectedFiles.cp ? '✓ Loaded' : '○ Not loaded'}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-md font-medium ${selectedFiles.forces ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    FORCES: {isLoadingForces ? '⏳ Loading...' : selectedFiles.forces ? '✓ Loaded' : '○ Not loaded'}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {Object.entries(simulationData.files || {}).map(([fileType, fileList]) => {
                  if (!Array.isArray(fileList) || fileList.length === 0) {
                    return null;
                  }

                  return (
                    <div key={fileType} className="mb-4">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{getFileTypeIcon(fileType)}</span>
                        <span className="font-medium text-gray-800">{fileType.toUpperCase()} Files ({fileList.length})</span>
                      </div>
                      <div className="space-y-1">
                        {fileList.map((file, index) => {
                          const isLoading = (fileType === 'cp' && isLoadingCP) ||
                            (fileType === 'forces' && isLoadingForces) ||
                            (fileType === 'dat' && isLoadingDAT);

                          return (
                            <div
                              key={index}
                              className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${isFileSelected(file)
                                ? 'bg-blue-100 border border-blue-300 shadow-sm'
                                : ['dat', 'cp', 'forces'].includes(fileType)
                                  ? 'hover:bg-blue-50 border border-transparent'
                                  : 'border border-transparent text-gray-500 cursor-default'
                                } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
                              onClick={() => !isLoading && ['dat', 'cp', 'forces'].includes(fileType) && handleFileSelect(file)}
                              title={file.name}
                            >
                              <span className="text-sm mr-2">
                                {isLoading ? '⏳' : getFileIcon(file.name)}
                              </span>
                              <span className="flex-1 text-sm truncate">{file.name}</span>
                              {isFileSelected(file) && !isLoading && <span className="text-blue-600 text-sm font-medium">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resize Handle */}
          {isExplorerOpen && (
            <div
              ref={resizeRef}
              className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors duration-200 ${isResizing ? 'bg-blue-400' : 'bg-blue-200'
                }`}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Show mesh plot spanning both areas when mesh is active */}
          {showMesh && meshData ? (
            <div className="flex-1 bg-white">
              <Plot
                data={meshData.data}
                layout={meshData.layout}
                config={meshData.config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          ) : showSpanwiseDistribution && spanwiseData ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-white">
                <Plot
                  data={spanwiseData.data}
                  layout={spanwiseData.layout}
                  config={spanwiseData.config}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler={true}
                />
              </div>
              <div className="flex-1 bg-white border-t border-blue-200">
                {plotData2 ? (
                  <Plot
                    data={plotData2.data}
                    layout={plotData2.layout}
                    config={plotData2.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="h-full bg-blue-50 flex items-center justify-center">
                    <p className="text-gray-500">No plot data available</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-white">
                {plotData1 ? (
                  <Plot
                    data={plotData1.data}
                    layout={plotData1.layout}
                    config={plotData1.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="h-full bg-blue-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-blue-400 mb-3">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">Select files and configure options to display plots</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 bg-white border-t border-blue-200">
                {plotData2 ? (
                  <Plot
                    data={plotData2.data}
                    layout={plotData2.layout}
                    config={plotData2.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="h-full bg-blue-50 flex items-center justify-center">
                    <p className="text-gray-500">No plot data available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-blue-200 flex flex-col overflow-y-auto">
          {/* Controls Section */}
          <div className="p-4 border-b border-blue-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Tools</h3>
            <div className="space-y-3">
              <button
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${showMesh
                  ? 'bg-blue-600 text-white shadow-sm focus:ring-blue-500'
                  : 'bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 focus:ring-blue-300'
                  }`}
                onClick={handleMeshClick}
              >
                {showMesh ? 'Hide Mesh' : 'Show Mesh'}
              </button>

              <button
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleBoundaryLayerClick}
              >
                Boundary Layer Data
              </button>

              <button
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${showSpanwiseDistribution
                  ? 'bg-blue-600 text-white shadow-sm focus:ring-blue-500'
                  : 'bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 focus:ring-blue-300'
                  }`}
                onClick={handleSpanwiseDistributionClick}
              >
                {showSpanwiseDistribution ? 'Hide Spanwise' : 'Spanwise Distribution'}
              </button>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="p-4 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  <option value="">Select Level</option>
                  {levels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plot Type</label>
                <select
                  className={`w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${showMesh || showSpanwiseDistribution ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  value={selectedPlotType}
                  onChange={(e) => setSelectedPlotType(e.target.value)}
                  disabled={showMesh || showSpanwiseDistribution}
                >
                  <option value="Mach">Mach</option>
                  <option value="Cp">Cp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  className={`w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${showMesh ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={showMesh}
                >
                  <option value="">Select Section</option>
                  {sections.map(section => (
                    <option key={section.value} value={section.value}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>

              {showSpanwiseDistribution && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
                  <select
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    value={selectedSpanwiseCoeff}
                    onChange={(e) => setSelectedSpanwiseCoeff(e.target.value)}
                  >
                    <option value="CL">CL</option>
                    <option value="CD">CD</option>
                    <option value="CM">CM</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Coefficients Section */}
          <div className="p-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aerodynamic Coefficients</h3>
            <div className="space-y-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">CL</span>
                  <span className="font-mono text-gray-900 text-sm">{coefficients.CL?.toFixed(6) || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">CD</span>
                  <span className="font-mono text-gray-900 text-sm">{coefficients.CD?.toFixed(6) || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">CM</span>
                  <span className="font-mono text-gray-900 text-sm">{coefficients.CM?.toFixed(6) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <h4 className="text-md font-semibold text-gray-800 mb-3">Drag Breakdown</h4>
            <div className="space-y-2">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">CD Induced</span>
                  <span className="font-mono text-gray-900 text-xs">{dragBreakdown.cdInduced?.toFixed(6) || '0.000000'}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">CD Viscous</span>
                  <span className="font-mono text-gray-900 text-xs">{dragBreakdown.cdViscous?.toFixed(6) || '0.000000'}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">CD Wave</span>
                  <span className="font-mono text-gray-900 text-xs">{dragBreakdown.cdWave?.toFixed(6) || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostProcessing;
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Plot from 'react-plotly.js';
import "./PostProcessing.css";
import { common } from "@material-ui/core/colors";

function PostProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({
    dat: null,
    cp: null,
    forces: null
  });
  const [parsedForcesData, setParsedForcesData] = useState(null);
  const [parsedDatData, setParsedDatData] = useState(null);
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

  // Fetch file content from server
  const fetchServerFile = async (file) => {
    try {
      console.log('Fetching server file:', file);

      const simName = simulationData?.simName || 'unknown';
      console.log('Using simulation name:', simName);
      console.log('File path:', file.path);

      const response = await fetch(`http://127.0.0.1:5000/get_file_content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simName: simName,
          filePath: file.path || file.name
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const content = await response.text();
      console.log('File content fetched successfully, length:', content.length);
      return content;

    } catch (error) {
      console.error('Error fetching file content:', error);

      if (error.message.includes('Failed to fetch')) {
        alert(`Network error loading file ${file.name}. Please check if the backend server is running on http://127.0.0.1:5000`);
      } else if (error.message.includes('404')) {
        alert(`File ${file.name} not found on server.`);
      } else {
        alert(`Error loading file ${file.name}: ${error.message}`);
      }
      return null;
    }
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
      const levelIndex = parseInt(selectedLevel) - 1;
      if (levelIndex >= 0 && levelIndex < parsedCpData.levels.length) {
        const level = parsedCpData.levels[levelIndex];
        const sectionOptions = level.sections.map((section, index) => ({
          value: index + 1,
          label: `Section ${index + 1}`,
          data: section
        }));
        setSections(sectionOptions);
        setSelectedSection('');
      } else {
        setSections([]);
        setSelectedSection('');
      }
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [parsedCpData, selectedLevel]);

  // Generate plots when selections change
  useEffect(() => {
    if (selectedLevel && selectedPlotType && selectedSection && parsedCpData && !showMesh) {
      generatePlotData();
    }
  }, [selectedLevel, selectedPlotType, selectedSection, parsedCpData, showMesh]);

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
  const handleFileSelect = (file) => {
    console.log('File selected:', file);

    const ext = file.name.split('.').pop().toLowerCase();
    console.log('File extension:', ext);

    if (['dat', 'cp', 'forces'].includes(ext)) {
      setSelectedFiles(prev => ({
        ...prev,
        [ext]: file
      }));

      if (ext === 'dat') {
        setParsedDatData(null);
        setSelectedLevel('');

        if (file.file) {
          console.log('Processing DAT file from folder import');
          parseDatFile(file.file);
        } else {
          console.log('Processing DAT file from server');
          fetchServerFile(file).then(content => {
            if (content) {
              try {
                const blob = new Blob([content], { type: 'text/plain' });
                const fileObj = new File([blob], file.name, { type: 'text/plain' });
                parseDatFile(fileObj);
              } catch (error) {
                console.error('Error creating file object for DAT:', error);
                alert(`Error processing DAT file: ${error.message}`);
              }
            }
          }).catch(error => {
            console.error('Error in DAT file fetch promise:', error);
          });
        }
      }

      if (ext === 'cp') {
        setParsedCpData(null);
        setSections([]);
        setSelectedLevel('');
        setSelectedSection('');

        if (file.file) {
          console.log('Processing CP file from folder import');
          parseCpFile(file.file);
        } else {
          console.log('Processing CP file from server');
          fetchServerFile(file).then(content => {
            if (content) {
              try {
                const blob = new Blob([content], { type: 'text/plain' });
                const fileObj = new File([blob], file.name, { type: 'text/plain' });
                parseCpFile(fileObj);
              } catch (error) {
                console.error('Error creating file object for CP:', error);
                alert(`Error processing CP file: ${error.message}`);
              }
            }
          }).catch(error => {
            console.error('Error in CP file fetch promise:', error);
          });
        }
      }

      if (ext === 'forces') {
        setParsedForcesData(null);

        if (file.file) {
          console.log('Processing Forces file from folder import');
          parseForcesFile(file.file);
        } else {
          console.log('Processing Forces file from server');
          fetchServerFile(file).then(content => {
            if (content) {
              try {
                const blob = new Blob([content], { type: 'text/plain' });
                const fileObj = new File([blob], file.name, { type: 'text/plain' });
                parseForcesFile(fileObj);
              } catch (error) {
                console.error('Error creating file object for Forces:', error);
                alert(`Error processing Forces file: ${error.message}`);
              }
            }
          }).catch(error => {
            console.error('Error in Forces file fetch promise:', error);
          });
        }
      }
    }
  };

  const parseFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
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

    const levelIndex = parseInt(selectedLevel) - 1;
    console.log('levelIndex:', levelIndex);

    if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) {
      console.log('Invalid level index:', levelIndex, 'Available levels:', parsedCpData.levels.length);
      return;
    }

    const level = parsedCpData.levels[levelIndex];
    const sections = level.sections;
    console.log('CP Level:', level);
    console.log('Sections count:', sections?.length);

    if (!sections || sections.length === 0) {
      console.log('No sections found in level');
      return;
    }

    // Get the actual level number from the CP data
    const actualLevelMatch = level.flowParameters.match(/LEV=\s*(\d+)/);
    const actualLevelNumber = actualLevelMatch ? parseInt(actualLevelMatch[1]) : parseInt(selectedLevel);
    console.log('Actual level number from CP file:', actualLevelNumber);

    // Get forces data for the actual level number
    const forcesLevel = parsedForcesData.levels.find(l => l.level === actualLevelNumber);
    console.log('Forces level found:', forcesLevel);

    if (!forcesLevel) {
      console.log('No matching forces level found for actual level:', actualLevelNumber);
      return;
    }

    console.log('Processing sections for mesh...');

    const meshLines = [];
    const allX = [];
    const allY = [];
    const allZ = [];

    // Process each section to build the mesh
    sections.forEach((section, sectionIndex) => {
      console.log(`Processing section ${sectionIndex + 1}:`, section);

      const mainTable = section.mainTable;
      if (!mainTable || mainTable.length === 0) {
        console.log(`Section ${sectionIndex + 1} has no main table data`);
        return;
      }

      console.log(`Section ${sectionIndex + 1} main table length:`, mainTable.length);

      // Get YAVE from forces data for this section
      let yave = 0;
      if (forcesLevel.data && forcesLevel.data[sectionIndex]) {
        yave = forcesLevel.data[sectionIndex].YAVE || 0;
        console.log(`Section ${sectionIndex + 1} YAVE:`, yave);
      } else {
        console.log(`No YAVE data for section ${sectionIndex + 1}`);
      }

      // Extract coordinates for this section
      const sectionX = [];
      const sectionY = [];
      const sectionZ = [];

      mainTable.forEach((row, rowIndex) => {
        if (row.length >= 2) {
          // Use X/C and Z/C from columns 0 and 1
          const xCoord = typeof row[0] === 'number' ? row[0] : 0;
          const zCoord = typeof row[1] === 'number' ? row[1] : 0;

          if (rowIndex < 3) {
            console.log(`Section ${sectionIndex + 1}, Row ${rowIndex}:`, {
              xCoord: xCoord,
              zCoord: zCoord,
              yave: yave
            });
          }

          sectionX.push(xCoord);
          sectionY.push(yave);
          sectionZ.push(zCoord);

          allX.push(xCoord);
          allY.push(yave);
          allZ.push(zCoord);
        }
      });

      console.log(`Section ${sectionIndex + 1} processed:`, {
        pointCount: sectionX.length,
        xRange: [Math.min(...sectionX), Math.max(...sectionX)],
        zRange: [Math.min(...sectionZ), Math.max(...sectionZ)],
        yValue: yave
      });

      // Create chordwise lines
      if (sectionX.length > 1) {
        for (let i = 0; i < sectionX.length - 1; i++) {
          meshLines.push({
            x: [sectionX[i], sectionX[i + 1]],
            y: [sectionY[i], sectionY[i + 1]],
            z: [sectionZ[i], sectionZ[i + 1]],
            mode: 'lines',
            type: 'scatter3d',
            line: { color: 'blue', width: 2 },
            showlegend: false,
            hoverinfo: 'skip'
          });
        }
      }
    });

    // Create spanwise lines
    console.log('Creating spanwise lines...');
    const sectionsData = [];

    sections.forEach((section, sectionIndex) => {
      const mainTable = section.mainTable;
      if (!mainTable || mainTable.length === 0) return;

      let yave = 0;
      if (forcesLevel.data && forcesLevel.data[sectionIndex]) {
        yave = forcesLevel.data[sectionIndex].YAVE || 0;
      }

      const sectionPoints = mainTable.map(row => ({
        x: typeof row[0] === 'number' ? row[0] : 0,
        y: yave,
        z: typeof row[1] === 'number' ? row[1] : 0
      }));

      sectionsData.push(sectionPoints);
    });

    // Create spanwise connections between sections
    if (sectionsData.length > 1) {
      for (let sectionIdx = 0; sectionIdx < sectionsData.length - 1; sectionIdx++) {
        const currentSection = sectionsData[sectionIdx];
        const nextSection = sectionsData[sectionIdx + 1];

        const minLength = Math.min(currentSection.length, nextSection.length);

        for (let pointIdx = 0; pointIdx < minLength; pointIdx++) {
          const currentPoint = currentSection[pointIdx];
          const nextPoint = nextSection[pointIdx];

          meshLines.push({
            x: [currentPoint.x, nextPoint.x],
            y: [currentPoint.y, nextPoint.y],
            z: [currentPoint.z, nextPoint.z],
            mode: 'lines',
            type: 'scatter3d',
            line: { color: 'blue', width: 1 },
            showlegend: false,
            hoverinfo: 'skip'
          });
        }
      }
    }

    console.log('Final mesh lines count:', meshLines.length);
    console.log('Total points:', allX.length);
    console.log('X range:', [Math.min(...allX), Math.max(...allX)]);
    console.log('Y range:', [Math.min(...allY), Math.max(...allY)]);
    console.log('Z range:', [Math.min(...allZ), Math.max(...allZ)]);

    if (meshLines.length === 0) {
      console.log('No mesh lines generated');
      return;
    }

    const meshPlotData = {
      data: meshLines,
      layout: {
        title: `CFD Mesh Visualization - Level ${actualLevelNumber}`,
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

    console.log('Generated mesh plot data with', meshLines.length, 'lines');
    setMeshData(meshPlotData);
  };

  useEffect(() => {
    if (selectedLevel && selectedSpanwiseCoeff && parsedCpData && showSpanwiseDistribution) {
      generateSpanwisePlotData();
    }
  }, [selectedLevel, selectedSpanwiseCoeff, parsedCpData, showSpanwiseDistribution]);


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
      generateSpanwisePlotData();
    }
  };

  // Generate spanwise distribution plot data
  const generateSpanwisePlotData = () => {
    console.log('generateSpanwisePlotData called');

    if (!parsedCpData || !selectedLevel) {
      console.log('Missing CP data or level selection');
      return;
    }

    const levelIndex = parseInt(selectedLevel) - 1;
    console.log('levelIndex:', levelIndex);

    if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) {
      console.log('Invalid level index:', levelIndex, 'Available levels:', parsedCpData.levels.length);
      return;
    }

    const level = parsedCpData.levels[levelIndex];
    const sections = level.sections;
    console.log('CP Level:', level);
    console.log('Sections count:', sections?.length);

    if (!sections || sections.length === 0) {
      console.log('No sections found in level');
      return;
    }

    // Extract YAVE and coefficient values from section headers
    const yaveValues = [];
    const coeffValues = [];

    sections.forEach((section, index) => {
      console.log(`Processing section ${index + 1} header:`, section.sectionHeader);

      // Parse section header for YAVE and coefficient values
      const yaveMatch = section.sectionHeader.match(/YAVE=\s*([\d.-]+)/);
      let coeffMatch;

      switch (selectedSpanwiseCoeff) {
        case 'CL':
          coeffMatch = section.sectionHeader.match(/CL=\s*([\d.-]+)/);
          break;
        case 'CD':
          coeffMatch = section.sectionHeader.match(/CD=\s*([\d.-]+)/);
          break;
        case 'CM':
          coeffMatch = section.sectionHeader.match(/CM=\s*([\d.-]+)/);
          break;
        default:
          coeffMatch = section.sectionHeader.match(/CL=\s*([\d.-]+)/);
      }

      if (yaveMatch && coeffMatch) {
        const yave = parseFloat(yaveMatch[1]);
        const coeff = parseFloat(coeffMatch[1]);

        console.log(`Section ${index + 1}: YAVE=${yave}, ${selectedSpanwiseCoeff}=${coeff}`);

        yaveValues.push(yave);
        coeffValues.push(coeff);
      } else {
        console.log(`Section ${index + 1}: Missing YAVE or ${selectedSpanwiseCoeff} in header`);
      }
    });

    console.log('YAVE values:', yaveValues);
    console.log(`${selectedSpanwiseCoeff} values:`, coeffValues);

    if (yaveValues.length === 0 || coeffValues.length === 0) {
      console.log('No valid data found for spanwise distribution');
      return;
    }

    // Create plot data
    const plotColor = selectedSpanwiseCoeff === 'CL' ? 'blue' :
      selectedSpanwiseCoeff === 'CD' ? 'red' : 'green';

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

    const spanwiseFullData = {
      data: spanwisePlotData,
      layout: spanwisePlotLayout,
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
      }
    };

    console.log('Generated spanwise plot data');
    setSpanwiseData(spanwiseFullData);
  };





  // Generate 2D plot data
  const generatePlotData = () => {
    if (!parsedCpData || !selectedLevel || !selectedSection) return;

    const levelIndex = parseInt(selectedLevel) - 1;
    const sectionIndex = parseInt(selectedSection) - 1;

    if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) return;
    if (sectionIndex < 0 || sectionIndex >= parsedCpData.levels[levelIndex].sections.length) return;

    const section = parsedCpData.levels[levelIndex].sections[sectionIndex];

    generatePlot1Data(section);
    generatePlot2Data(section);
  };

  const generatePlot1Data = (section) => {
    const data = section.mainTable;
    if (!data || data.length === 0) {
      setPlotData1(null);
      return;
    }

    const xValues = data.map(row => row[0]).filter(val => typeof val === 'number');
    const yValues = selectedPlotType === 'Cp'
      ? data.map(row => row[2]).filter(val => typeof val === 'number')
      : data.map(row => row[4]).filter(val => typeof val === 'number');

    if (xValues.length === 0 || yValues.length === 0) {
      setPlotData1(null);
      return;
    }

    const plotColor = selectedPlotType === 'Cp' ? 'blue' : 'red';
    const yAxisTitle = selectedPlotType === 'Cp' ? 'CP' : 'Mach';

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

  const generatePlot2Data = (section) => {
    const data = section.mainTable;
    if (!data || data.length === 0) {
      setPlotData2(null);
      return;
    }

    const xValues = data.map(row => row[0]).filter(val => typeof val === 'number');
    const zValues = data.map(row => row[1]).filter(val => typeof val === 'number');

    if (xValues.length === 0 || zValues.length === 0) {
      setPlotData2(null);
      return;
    }

    const plot2Data = [{
      x: xValues,
      y: zValues,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'black', width: 2 },
      marker: { color: 'black', size: 4 },
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

  // Parse CP file
  const parseCpFile = async (file) => {
    try {
      const content = await parseFileContent(file);
      const lines = content.split('\n');

      const cpData = {
        fileName: file.name,
        metadata: {
          totalLines: lines.length,
          parsedAt: new Date().toISOString()
        },
        simulationMetadata: null,
        levels: []
      };

      let lineIndex = 0;

      // Skip empty lines at the beginning
      while (lineIndex < lines.length && !lines[lineIndex].trim()) {
        lineIndex++;
      }

      // First non-empty line: simulation metadata
      if (lineIndex < lines.length) {
        cpData.simulationMetadata = lines[lineIndex].trim();
        lineIndex++;
      }

      // Parse levels
      while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();

        if (line.startsWith('LEV= ')) {
          const level = {
            flowParameters: line,
            sections: []
          };

          lineIndex++;

          // Parse sections within this level
          while (lineIndex < lines.length) {
            // Skip empty lines
            while (lineIndex < lines.length && !lines[lineIndex].trim()) {
              lineIndex++;
            }

            if (lineIndex >= lines.length) break;

            const sectionLine = lines[lineIndex].trim();

            // Check if we've reached the next level
            if (sectionLine.startsWith('LEV= ')) {
              lineIndex--;
              break;
            }

            // Check for section header
            if (sectionLine.startsWith('J= ')) {
              const section = {
                sectionHeader: sectionLine,
                mainTable: [],
                vortexSheetTable: [],
                coefficients: {}
              };


              // Parse coefficient values from section header
              const yaveMatch = sectionLine.match(/YAVE=\s*([\d.-]+)/);
              const clMatch = sectionLine.match(/CL=\s*([\d.-]+)/);
              const cdMatch = sectionLine.match(/CD=\s*([\d.-]+)/);
              const cmMatch = sectionLine.match(/CM=\s*([\d.-]+)/);
              const chordMatch = sectionLine.match(/CHORD=\s*([\d.-]+)/);
              const twistMatch = sectionLine.match(/TWIST=\s*([\d.-]+)/);
              const gamMatch = sectionLine.match(/GAM=\s*([\d.-]+)/);

              if (yaveMatch) section.coefficients.YAVE = parseFloat(yaveMatch[1]);
              if (clMatch) section.coefficients.CL = parseFloat(clMatch[1]);
              if (cdMatch) section.coefficients.CD = parseFloat(cdMatch[1]);
              if (cmMatch) section.coefficients.CM = parseFloat(cmMatch[1]);
              if (chordMatch) section.coefficients.CHORD = parseFloat(chordMatch[1]);
              if (twistMatch) section.coefficients.TWIST = parseFloat(twistMatch[1]);
              if (gamMatch) section.coefficients.GAM = parseFloat(gamMatch[1]);

              console.log(`Section coefficients extracted:`, section.coefficients);


              lineIndex++;

              // Skip empty lines until we reach the main table
              while (lineIndex < lines.length && !lines[lineIndex].trim()) {
                lineIndex++;
              }

              // Read main table data
              while (lineIndex < lines.length) {
                const dataLine = lines[lineIndex].trim();

                if (!dataLine) {
                  break;
                }

                if (dataLine.startsWith('J= ') || dataLine.startsWith('LEV= ')) {
                  lineIndex--;
                  break;
                }

                const values = dataLine.split(/\s+/);
                if (values.length > 0) {
                  const parsedValues = values.map(value => {
                    const numValue = parseFloat(value);
                    return isNaN(numValue) ? value : numValue;
                  });
                  section.mainTable.push(parsedValues);
                }

                lineIndex++;
              }

              // Skip empty lines after main table
              while (lineIndex < lines.length && !lines[lineIndex].trim()) {
                lineIndex++;
              }

              // Read vortex sheet table data
              while (lineIndex < lines.length) {
                const vortexDataLine = lines[lineIndex].trim();

                if (vortexDataLine.startsWith('J= ') || vortexDataLine.startsWith('LEV= ')) {
                  lineIndex--;
                  break;
                }

                if (!vortexDataLine) {
                  lineIndex++;
                  continue;
                }

                const vortexValues = vortexDataLine.split(/\s+/);
                if (vortexValues.length > 0) {
                  const parsedVortexValues = vortexValues.map(value => {
                    const numValue = parseFloat(value);
                    return isNaN(numValue) ? value : numValue;
                  });
                  section.vortexSheetTable.push(parsedVortexValues);
                }

                lineIndex++;
              }

              level.sections.push(section);
            } else {
              lineIndex++;
            }
          }

          cpData.levels.push(level);
        } else {
          lineIndex++;
        }
      }

      setParsedCpData(cpData);

      // Create level options from CP file data
      if (cpData.levels.length > 0) {
        const levelOptions = cpData.levels.map((level, index) => {
          const levelMatch = level.flowParameters.match(/LEV=\s*(\d+)/);
          const levelNumber = levelMatch ? parseInt(levelMatch[1]) : index + 1;

          return {
            value: index + 1,
            label: `Level ${levelNumber}`,
            actualLevelNumber: levelNumber,
            data: level
          };
        });

        setLevels(levelOptions);
        console.log('Set levels from CP file:', levelOptions);
      }

      console.log('Parsed CP file JSON:', cpData);

    } catch (error) {
      console.error('Error parsing .cp file:', error);
    }
  };

  // Parse DAT file
  const extractLevelsAndFuse = (content) => {
    const lines = content.split('\n');
    const result = {
      title: '',
      fuse: [],
      levels: {}
    };

    let lineIndex = 0;

    // Skip empty lines at the beginning
    while (lineIndex < lines.length && !lines[lineIndex].trim()) {
      lineIndex++;
    }

    // First line is the title
    if (lineIndex < lines.length) {
      result.title = lines[lineIndex].trim();
      lineIndex++;
    }

    // Skip empty lines
    while (lineIndex < lines.length && !lines[lineIndex].trim()) {
      lineIndex++;
    }

    // Second line indicates fuselage data count
    let fuseDataCount = 0;
    if (lineIndex < lines.length) {
      const fuseCountLine = lines[lineIndex].trim();
      fuseDataCount = parseInt(fuseCountLine);
      lineIndex++;
    }

    // Read fuse data if count > 0
    if (fuseDataCount > 0) {
      for (let i = 0; i < fuseDataCount && lineIndex < lines.length; i++) {
        const fuseLine = lines[lineIndex].trim();
        if (fuseLine) {
          result.fuse.push(fuseLine + '\n');
        }
        lineIndex++;
      }
    }

    // Parse level data
    let levelCount = 0;
    while (lineIndex < lines.length) {
      const line = lines[lineIndex].trim();

      const levelMatch = line.match(/^2\s+(\d{20})/);
      if (levelMatch) {
        levelCount++;
        const twentyDigitNumber = levelMatch[1];
        const levelNumber = parseInt(twentyDigitNumber.charAt(1));

        const levelKey = `level${levelCount}`;
        result.levels[levelKey] = [];

        result.levels[levelKey].push(line + '\n');
        lineIndex++;

        // Read next 14 lines for this level
        for (let i = 0; i < 14 && lineIndex < lines.length; i++) {
          const levelLine = lines[lineIndex];
          if (levelLine !== undefined) {
            result.levels[levelKey].push(levelLine + '\n');
          }
          lineIndex++;
        }
      } else {
        lineIndex++;
      }
    }

    return result;
  };

  const parseDatFile = async (file) => {
    try {
      const content = await parseFileContent(file);
      const extractedData = extractLevelsAndFuse(content);

      setParsedDatData(extractedData);

      // Don't set levels from DAT file anymore - CP file will handle this
      console.log('Parsed DAT file JSON:', extractedData);

    } catch (error) {
      console.error('Error parsing .dat file:', error);
    }
  };

  // Parse Forces file
  const parseViscousDragData = (lines, startIndex) => {
    const viscousData = {
      header: lines[startIndex],
      columns: [],
      data: [],
      totalViscousDrag: null,
      totalViscousDragTE: null
    };

    let headerIndex = startIndex + 1;
    while (headerIndex < lines.length && !lines[headerIndex].trim().includes('THETA')) {
      headerIndex++;
    }

    if (headerIndex < lines.length) {
      const headerLine = lines[headerIndex].trim();
      viscousData.columns = headerLine.split(/\s+/);

      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('Total viscous drag =')) {
          const match = line.match(/Total viscous drag\s*=\s*([\d.-]+)/);
          if (match) {
            viscousData.totalViscousDrag = parseFloat(match[1]);
          }
          continue;
        }

        if (line.includes('Total viscous drag te =')) {
          const match = line.match(/Total viscous drag te\s*=\s*([\d.-]+)/);
          if (match) {
            viscousData.totalViscousDragTE = parseFloat(match[1]);
          }
          continue;
        }

        if (!line || line.includes('Total viscous drag') || line.includes('LEV=')) break;

        const values = line.split(/\s+/);
        if (values.length >= viscousData.columns.length) {
          const rowData = {};
          viscousData.columns.forEach((col, index) => {
            rowData[col] = isNaN(parseFloat(values[index])) ? values[index] : parseFloat(values[index]);
          });
          viscousData.data.push(rowData);
        }
      }
    }

    return viscousData;
  };

  const parseLevel = (lines, startIndex) => {
    const levelLine = lines[startIndex].trim();
    const levelMatch = levelLine.match(/LEV=\s*(\d+)/);
    const itsMatch = levelLine.match(/ITS=\s*(\d+)/);
    const machMatch = levelLine.match(/MACH\s+NO=\s*([\d.]+)/);
    const alphaMatch = levelLine.match(/ALPHA=\s*([\d.-]+)/);

    if (!levelMatch) return null;

    const level = {
      level: parseInt(levelMatch[1]),
      iterations: itsMatch ? parseInt(itsMatch[1]) : null,
      machNumber: machMatch ? parseFloat(machMatch[1]) : null,
      alpha: alphaMatch ? parseFloat(alphaMatch[1]) : null,
      rawLine: levelLine,
      data: [],
      coefficients: null,
      viscousDragData: null,
      vfpCoefficients: null,
      ibeCoefficients: null,
      vortexCoefficients: null,
      wingArea: null
    };

    // Find the data table header
    let headerIndex = startIndex + 1;
    while (headerIndex < lines.length && !lines[headerIndex].includes('J   YAVE')) {
      headerIndex++;
    }

    if (headerIndex < lines.length) {
      const columns = ['J', 'YAVE', 'YAVE/YTIP', 'TWIST(deg)', 'CHORD', 'CL', 'CD', 'CM', 'GAM', 'NLEPOS'];

      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('CLTOT') || line.includes('LEV=')) break;

        const values = line.split(/\s+/);
        if (values.length >= columns.length) {
          const rowData = {};
          columns.forEach((col, index) => {
            rowData[col] = isNaN(parseFloat(values[index])) ? values[index] : parseFloat(values[index]);
          });
          level.data.push(rowData);
        }
      }
    }

    // Find all coefficient lines
    for (let i = headerIndex; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('CLTOT(VFP)')) {
        const clMatch = line.match(/CLTOT\(VFP\)=\s*([\d.-]+)/);
        const cdMatch = line.match(/CDTOT\(VFP\)=\s*([\d.-]+)/);
        const cmMatch = line.match(/CMTOT\(VFP\)=\s*([\d.-]+)/);
        const areaMatch = line.match(/WING AREA\(TOTAL\)=\s*([\d.-]+)/);

        level.vfpCoefficients = {
          CL: clMatch ? parseFloat(clMatch[1]) : null,
          CD: cdMatch ? parseFloat(cdMatch[1]) : null,
          CM: cmMatch ? parseFloat(cmMatch[1]) : null
        };

        level.wingArea = areaMatch ? parseFloat(areaMatch[1]) : null;
        level.coefficients = level.vfpCoefficients;
        continue;
      }

      if (line.includes('CLTOT(IBE)')) {
        const clMatch = line.match(/CLTOT\(IBE\)=\s*([\d.-]+)/);
        const cdMatch = line.match(/CDTOT\(IBE\)=\s*([\d.-]+)/);

        level.ibeCoefficients = {
          CL: clMatch ? parseFloat(clMatch[1]) : null,
          CD: cdMatch ? parseFloat(cdMatch[1]) : null
        };
        continue;
      }

      if (line.includes('CL(vortd)')) {
        const clMatch = line.match(/CL\(vortd\)\s*=\s*([\d.-]+)/);
        const cdMatch = line.match(/CD\(vortd\)\s*=\s*([\d.-]+)/);
        const dcdMatch = line.match(/DCD\(vortd\)\s*=\s*([\d.-]+)/);

        level.vortexCoefficients = {
          CL: clMatch ? parseFloat(clMatch[1]) : null,
          CD: cdMatch ? parseFloat(cdMatch[1]) : null,
          DCD: dcdMatch ? parseFloat(dcdMatch[1]) : null
        };
        continue;
      }

      if (line.includes('LEV=')) break;
    }

    // Find viscous drag data
    for (let i = headerIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('***************** VISCOUS DRAG DATA *****************')) {
        level.viscousDragData = parseViscousDragData(lines, i);
        break;
      }
      if (line.includes('LEV=')) break;
    }

    return level;
  };

  const parseForcesFile = async (file) => {
    try {
      const content = await parseFileContent(file);
      const lines = content.split('\n');

      const forcesData = {
        fileName: file.name,
        levels: [],
        metadata: {
          totalLines: lines.length,
          parsedAt: new Date().toISOString()
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('LEV=')) {
          const level = parseLevel(lines, i);
          if (level) {
            forcesData.levels.push(level);
          }
        }
      }

      setParsedForcesData(forcesData);

      // Update coefficients with the last level's data
      if (forcesData.levels.length > 0) {
        const lastLevel = forcesData.levels[forcesData.levels.length - 1];

        if (lastLevel.coefficients) {
          setCoefficients(lastLevel.coefficients);
        }

        const newDragBreakdown = {
          cdInduced: lastLevel.vortexCoefficients?.CD || 0.000,
          cdViscous: lastLevel.viscousDragData?.totalViscousDrag || 0.000,
          cdWave: 0.000
        };

        setDragBreakdown(newDragBreakdown);
      }

      console.log('Parsed Forces file JSON:', forcesData);

    } catch (error) {
      console.error('Error parsing .forces file:', error);
    }
  };

  const handleBoundaryLayerClick = () => {
    navigate('/post-processing/boundary-layer', { state: { simulationFolder: simulationData } });
  };

  // Render file explorer
  const renderFileExplorer = () => {
    console.log('Rendering file explorer with simulationData:', simulationData);

    if (!simulationData) {
      console.log('No simulation data available');
      return (
        <div className="empty-explorer">
          <p>No simulation data loaded</p>
          <button onClick={handleImportFolder} className="import-folder-btn">
            Import Folder
          </button>
        </div>
      );
    }

    const files = simulationData.files || {};
    console.log('Files object:', files);
    console.log('Files object keys:', Object.keys(files));
    console.log('Files object type:', typeof files);

    const hasFiles = Object.keys(files).some(fileType =>
      Array.isArray(files[fileType]) && files[fileType].length > 0
    );

    console.log('Has files:', hasFiles);

    if (!hasFiles) {
      return (
        <div className="empty-explorer">
          <h3>{simulationData.simName}</h3>
          <p>No files found in the simulation folder</p>
          <button onClick={handleImportFolder} className="import-folder-btn">
            Import Different Folder
          </button>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Debug: {JSON.stringify(simulationData, null, 2)}
          </div>
        </div>
      );
    }

    return (
      <div className="file-explorer-content">
        <div className="explorer-header">
          <h3>{simulationData.simName}</h3>
          <div className="selected-files-info">
            <div className={`file-status ${selectedFiles.dat ? 'selected' : ''}`}>
              DAT: {selectedFiles.dat ? '✓' : '✗'}
            </div>
            <div className={`file-status ${selectedFiles.cp ? 'selected' : ''}`}>
              CP: {selectedFiles.cp ? '✓' : '✗'}
            </div>
            <div className={`file-status ${selectedFiles.forces ? 'selected' : ''}`}>
              FORCES: {selectedFiles.forces ? '✓' : '✗'}
            </div>
          </div>
        </div>

        <div className="file-tree">
          {Object.entries(files).map(([fileType, fileList]) => {
            console.log(`Rendering file type: ${fileType}, files:`, fileList);

            if (!Array.isArray(fileList) || fileList.length === 0) {
              console.log(`Skipping ${fileType} - no files or not array`);
              return null;
            }

            return (
              <div key={fileType} className="file-type-section">
                <div className="file-type-header">
                  <span className="file-type-icon">{getFileTypeIcon(fileType)}</span>
                  <span className="file-type-name">{fileType.toUpperCase()} Files ({fileList.length})</span>
                </div>
                {fileList.map((file, index) => {
                  console.log(`Rendering file ${index}:`, file);
                  return (
                    <div
                      key={index}
                      className={`file-item ${isFileSelected(file) ? 'selected' : ''} ${['dat', 'cp', 'forces'].includes(fileType) ? 'selectable' : 'non-selectable'}`}
                      onClick={() => handleFileSelect(file)}
                      title={file.name}
                    >
                      <span className="file-icon">
                        {getFileIcon(file.name)}
                      </span>
                      <span className="file-name">{file.name}</span>
                      {isFileSelected(file) && <span className="selected-indicator">✓</span>}
                    </div>
                  );
                })}
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

  return (
    <div className="postprocessing-container">
      {/* Header */}
      <div className="postprocessing-header">
        <div className="header-left">
          <button
            className="toggle-explorer-btn"
            onClick={() => setIsExplorerOpen(!isExplorerOpen)}
          >
            {isExplorerOpen ? '◀' : '▶'}
          </button>
          <h1>Post-Processing Module</h1>
        </div>
        <div className="header-right">
          <button onClick={handleImportFolder} className="header-btn import-btn">
            Import Folder
          </button>
          <button onClick={handleNavigateToProWim} className="header-btn prowim-btn">
            ProWiM
          </button>
          <button onClick={() => navigate('/')} className="header-btn back-btn">
            Back to Main Module
          </button>
        </div>
      </div>

      <div className="postprocessing-content">
        {/* File Explorer Sidebar */}
        <div
          className={`file-explorer ${isExplorerOpen ? 'open' : 'closed'}`}
          style={{ width: isExplorerOpen ? `${explorerWidth}px` : '0px' }}
        >
          {renderFileExplorer()}

          {/* Resize Handle */}
          {isExplorerOpen && (
            <div
              ref={resizeRef}
              className={`resize-handle ${isResizing ? 'resizing' : ''}`}
              onMouseDown={handleMouseDown}
            >
              <div className="resize-line"></div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Show mesh plot spanning both areas when mesh is active */}
          {showMesh && meshData ? (
            <div className="mesh-container">
              <Plot
                data={meshData.data}
                layout={meshData.layout}
                config={meshData.config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          ) : showSpanwiseDistribution && spanwiseData ? (
            <>
              <div className="spanwise-container">
                <Plot
                  data={spanwiseData.data}
                  layout={spanwiseData.layout}
                  config={spanwiseData.config}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler={true}
                />
              </div>
              {/* Bottom Canvas Area - Plot 2 */}
              <div className="canvas-container bottom-canvas">
                {plotData2 ? (
                  <Plot
                    data={plotData2.data}
                    layout={plotData2.layout}
                    config={plotData2.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="blank-plot-area"></div>
                )}
              </div>

            </>
          ) : (
            <>
              {/* Top Canvas Area - Plot 1 */}
              <div className="canvas-container top-canvas">
                {plotData1 ? (
                  <Plot
                    data={plotData1.data}
                    layout={plotData1.layout}
                    config={plotData1.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="blank-plot-area"></div>
                )}
              </div>

              {/* Bottom Canvas Area - Plot 2 */}
              <div className="canvas-container bottom-canvas">
                {plotData2 ? (
                  <Plot
                    data={plotData2.data}
                    layout={plotData2.layout}
                    config={plotData2.config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                ) : (
                  <div className="blank-plot-area"></div>
                )}
              </div>
            </>
          )}
        </div>


        {/* Right Sidebar */}
        <div className="right-sidebar">
          {/* Controls Section */}
          <div className="control-section">
            <button
              className={`control-btn mesh-btn ${showMesh ? 'active' : ''}`}
              onClick={handleMeshClick}
            >
              {showMesh ? 'Hide Mesh' : 'Mesh'}
            </button>
            <button className="control-btn boundary-btn" onClick={handleBoundaryLayerClick}>Boundary Layer Data</button>

            <div className="dropdown-section">
              {/* Level Selection */}
              <select
                className="control-dropdown"
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

              {/* Plot Type Selection */}
              <select
                className="control-dropdown"
                value={selectedPlotType}
                onChange={(e) => setSelectedPlotType(e.target.value)}
                disabled={showMesh || showSpanwiseDistribution}
              >
                <option value="Mach">Mach</option>
                <option value="Cp">Cp</option>
              </select>

              {/* Section Selection */}
              <select
                className="control-dropdown"
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

            <div className="spanwise-section">
              <button
                className={`control-btn spanwise-btn ${showSpanwiseDistribution ? 'active' : ''}`}
                onClick={handleSpanwiseDistributionClick}
              >
                {showSpanwiseDistribution ? 'Hide Spanwise' : 'Spanwise Distribution'}
              </button>

              <select className="control-dropdown" value={selectedSpanwiseCoeff} onChange={(e) => setSelectedSpanwiseCoeff(e.target.value)} disabled={!showSpanwiseDistribution}>
                <option>Load</option>
                <option>CL</option>
                <option>CD</option>
                <option>CM</option>
              </select>
            </div>
          </div>

          {/* Coefficients Section */}
          <div className="coefficients-section">
            <h3>Coefficients</h3>
            <div className="coeff-table">
              <div className="coeff-row">
                <span className="coeff-label">CL</span>
                <span className="coeff-value">{coefficients.CL?.toFixed(6) || 'N/A'}</span>
              </div>
              <div className="coeff-row">
                <span className="coeff-label">CD</span>
                <span className="coeff-value">{coefficients.CD?.toFixed(6) || 'N/A'}</span>
              </div>
              <div className="coeff-row">
                <span className="coeff-label">CM</span>
                <span className="coeff-value">{coefficients.CM?.toFixed(6) || 'N/A'}</span>
              </div>
            </div>

            <h4>Drag Coefficients Breakdown:</h4>
            <div className="drag-table">
              <div className="drag-row">
                <span className="drag-label">CD Induced</span>
                <span className="drag-value">{dragBreakdown.cdInduced?.toFixed(6) || '0.000'}</span>
              </div>
              <div className="drag-row">
                <span className="drag-label">CD Viscous</span>
                <span className="drag-value">{dragBreakdown.cdViscous?.toFixed(6) || '0.000'}</span>
              </div>
              <div className="drag-row">
                <span className="drag-label">CD wave</span>
                <span className="drag-value">{dragBreakdown.cdWave?.toFixed(6) || 'NaN'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostProcessing;
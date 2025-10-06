import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Plot from 'react-plotly.js';
import "./PostProcessing.css";

function PostProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(300); // Default width
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

  // Coefficients data (will be populated from .forces file)
  const [coefficients, setCoefficients] = useState({
    CL: 0.201594,
    CD: 0.024548,
    CM: -0.120984
  });

  const [dragBreakdown, setDragBreakdown] = useState({
    cdInduced: 0.000,
    cdViscous: 0.000,
    cdWave: 0.000
  });

  // Check if we received simulation data from SimulationRun page
  useEffect(() => {
    if (location.state && location.state.simulationFolder) {
      setSimulationData(location.state.simulationFolder);
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

        // Reset selected section when level changes
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

  // Plot data when selections change
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
    if (newWidth >= 200 && newWidth <= 600) { // Min and max width constraints
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

  const handleImportFolder = () => {
    // Create a hidden input element for folder selection
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true; // This allows folder selection
    input.multiple = true;

    input.onchange = (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        // Process the selected folder
        const folderStructure = processFolderFiles(files);
        setSimulationData(folderStructure);
      }
    };

    input.click();
  };

  const processFolderFiles = (fileList) => {
    const files = fileList.map(file => ({
      name: file.name,
      path: file.webkitRelativePath,
      size: file.size,
      modified: file.lastModified,
      isDirectory: false,
      file: file // Keep reference to actual file
    }));

    // Sort files by type
    const sortedFiles = sortFilesByType(files);

    // Extract folder name from the first file's path
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
      const ext = file.name.split('.').pop().toLowerCase();
      if (fileTypes[ext]) {
        fileTypes[ext].push(file);
      } else {
        fileTypes.other.push(file);
      }
    });

    // Sort each type alphabetically
    Object.keys(fileTypes).forEach(type => {
      fileTypes[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return fileTypes;
  };

  const handleFileSelect = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (['dat', 'cp', 'forces'].includes(ext)) {
      setSelectedFiles(prev => ({
        ...prev,
        [ext]: file
      }));

      // If a .dat file is selected, parse it for levels
      if (ext === 'dat') {
        // Clear existing levels when selecting a different dat file
        setLevels([]);
        setParsedDatData(null);
        setSelectedLevel('');

        parseDatFile(file.file);
      }

      // If a .cp file is selected, parse it
      if (ext === 'cp') {
        // Clear existing cp data when selecting a different cp file
        setParsedCpData(null);
        setSections([]);
        setSelectedLevel('');
        setSelectedSection('');

        parseCpFile(file.file);
      }

      // If a .forces file is selected, parse it
      if (ext === 'forces') {
        // Clear existing forces data when selecting a different forces file
        setParsedForcesData(null);

        parseForcesFile(file.file);
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

  // Handle mesh button click
  const handleMeshClick = () => {
    if (!parsedCpData || !selectedLevel || !parsedForcesData) {
      alert('Please select CP and Forces files and choose a level first.');
      return;
    }

    if (showMesh) {
      // If mesh is currently shown, hide it and show regular plots
      setShowMesh(false);
      setMeshData(null);
    } else {
      // Generate mesh data and show it
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

    // Get forces data for the selected level
    const forcesLevel = parsedForcesData.levels.find(l => l.level === parseInt(selectedLevel));
    console.log('Forces level:', forcesLevel);

    if (!forcesLevel) {
      console.log('No matching forces level found for level:', selectedLevel);
      return;
    }

    console.log('Processing sections for mesh...');

    // Arrays to store all mesh lines
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
          const xCoord = typeof row[8] === 'number' ? row[8] : 0;
          const zCoord = typeof row[9] === 'number' ? row[9] : 0;

          if (rowIndex < 3) { // Log first few rows for debugging
            console.log(`Section ${sectionIndex + 1}, Row ${rowIndex}:`, {
              xCoord: xCoord,
              zCoord: zCoord,
              yave: yave
            });
          }

          sectionX.push(xCoord);
          sectionY.push(yave);
          sectionZ.push(zCoord);

          // Add to overall arrays
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

      // Create chordwise lines (connecting points along the chord at this section)
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

    // Create spanwise lines (connecting corresponding points between sections)
    console.log('Creating spanwise lines...');
    const sectionsData = [];

    // Collect all section data
    sections.forEach((section, sectionIndex) => {
      const mainTable = section.mainTable;
      if (!mainTable || mainTable.length === 0) return;

      let yave = 0;
      if (forcesLevel.data && forcesLevel.data[sectionIndex]) {
        yave = forcesLevel.data[sectionIndex].YAVE || 0;
      }

      const sectionPoints = mainTable.map(row => ({
        x: typeof row[8] === 'number' ? row[8] : 0,
        y: yave,
        z: typeof row[9] === 'number' ? row[9] : 0
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

    // Create the mesh plot data with wireframe lines
    const meshPlotData = {
      data: meshLines,
      layout: {
        title: 'CFD Mesh Visualization',
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


  // Generate plot data for Plotly
  const generatePlotData = () => {
    if (!parsedCpData || !selectedLevel || !selectedSection) return;

    const levelIndex = parseInt(selectedLevel) - 1;
    const sectionIndex = parseInt(selectedSection) - 1;

    if (levelIndex < 0 || levelIndex >= parsedCpData.levels.length) return;
    if (sectionIndex < 0 || sectionIndex >= parsedCpData.levels[levelIndex].sections.length) return;

    const section = parsedCpData.levels[levelIndex].sections[sectionIndex];

    // Generate Plot 1 data: CP vs X/C or Mach vs X/C
    generatePlot1Data(section);

    // Generate Plot 2 data: Z/C vs X/C
    generatePlot2Data(section);
  };

  const generatePlot1Data = (section) => {
    const data = section.mainTable;
    if (!data || data.length === 0) {
      setPlotData1(null);
      return;
    }

    // Extract X/C (column 0), CP (column 2), and Mach (column 4) values
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
        title: 'X/C',
        showgrid: true,
        zeroline: true,
        showticklabels: true
      },
      yaxis: {
        title: yAxisTitle,
        showgrid: true,
        zeroline: true,
        showticklabels: true
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

    // Extract X/C (column 0) and Z/C (column 1) values
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

  // Function to parse .cp file according to the specific structure
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

        // Check for level header line (starts with LEV=)
        if (line.startsWith('LEV=')) {
          const level = {
            flowParameters: line,
            sections: []
          };

          lineIndex++; // Move to next line after level header

          // Parse sections within this level
          while (lineIndex < lines.length) {
            // Skip empty lines
            while (lineIndex < lines.length && !lines[lineIndex].trim()) {
              lineIndex++;
            }

            if (lineIndex >= lines.length) break;

            const sectionLine = lines[lineIndex].trim();

            // Check if we've reached the next level
            if (sectionLine.startsWith('LEV=')) {
              lineIndex--; // Step back to process this line in outer loop
              break;
            }

            // Check for section header (starts with "J = ")
            if (sectionLine.startsWith('J=')) {
              const section = {
                sectionHeader: sectionLine,
                mainTable: [],
                vortexSheetTable: []
              };

              lineIndex++; // Move past section header

              // Skip empty lines until we reach the main table
              while (lineIndex < lines.length && !lines[lineIndex].trim()) {
                lineIndex++;
              }

              // Read main table data (space delimited values until empty line)
              while (lineIndex < lines.length) {
                const dataLine = lines[lineIndex].trim();

                // Stop at empty line (indicates end of main table)
                if (!dataLine) {
                  break;
                }

                // Check if we've reached next section or level
                if (dataLine.startsWith('J=') || dataLine.startsWith('LEV=')) {
                  lineIndex--; // Step back to process this line in outer loop
                  break;
                }

                // Parse the data line (space delimited values)
                const values = dataLine.split(/\s+/);
                if (values.length > 0) {
                  // Convert numeric values
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

              // Read vortex sheet table data (space delimited values until next section)
              while (lineIndex < lines.length) {
                const vortexDataLine = lines[lineIndex].trim();

                // Stop if we've reached next section or level
                if (vortexDataLine.startsWith('J=') || vortexDataLine.startsWith('LEV=')) {
                  lineIndex--; // Step back to process this line in outer loop
                  break;
                }

                // Skip empty lines
                if (!vortexDataLine) {
                  lineIndex++;
                  continue;
                }

                // Parse the vortex sheet data line (space delimited values)
                const vortexValues = vortexDataLine.split(/\s+/);
                if (vortexValues.length > 0) {
                  // Convert numeric values
                  const parsedVortexValues = vortexValues.map(value => {
                    const numValue = parseFloat(value);
                    return isNaN(numValue) ? value : numValue;
                  });
                  section.vortexSheetTable.push(parsedVortexValues);
                }

                lineIndex++;
              }

              // Add the completed section to the level
              level.sections.push(section);
            } else {
              // Not a section header, move to next line
              lineIndex++;
            }
          }

          // Add the completed level to cpData
          cpData.levels.push(level);
        } else {
          lineIndex++;
        }
      }

      setParsedCpData(cpData);

      // Log the complete CP file JSON structure
      console.log('Parsed CP file JSON:', cpData);

    } catch (error) {
      console.error('Error parsing .cp file:', error);
    }
  };

  // Function to extract levels and fuse data from .dat file (proper parsing)
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

      // Check if line starts with '2' followed by 20 digits
      const levelMatch = line.match(/^2\s+(\d{20})/);
      if (levelMatch) {
        levelCount++;
        const twentyDigitNumber = levelMatch[1];
        const levelNumber = parseInt(twentyDigitNumber.charAt(1)); // Second digit is level number

        const levelKey = `level${levelCount}`;
        result.levels[levelKey] = [];

        // Add the current line to this level
        result.levels[levelKey].push(line + '\n');
        lineIndex++;

        // Read next 15 lines for this level
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

      // Create level options for dropdowns based on .dat file
      const levelKeys = Object.keys(extractedData.levels);
      let levelOptions = [];

      if (levelKeys.length > 0) {
        levelOptions = levelKeys.map((key, index) => ({
          value: index + 1,
          label: `${file.name.replace('.dat', '')}_L${index + 1}`,
          data: extractedData.levels[key]
        }));
      }

      setLevels(levelOptions);

      // Log the complete JSON structure
      console.log('Parsed DAT file JSON:', extractedData);

    } catch (error) {
      console.error('Error parsing .dat file:', error);
    }
  };

  const parseViscousDragData = (lines, startIndex) => {
    const viscousData = {
      header: lines[startIndex],
      columns: [],
      data: [],
      totalViscousDrag: null,
      totalViscousDragTE: null
    };

    // Find the column headers line
    let headerIndex = startIndex + 1;
    while (headerIndex < lines.length && !lines[headerIndex].trim().includes('THETA')) {
      headerIndex++;
    }

    if (headerIndex < lines.length) {
      const headerLine = lines[headerIndex].trim();
      viscousData.columns = headerLine.split(/\s+/);

      // Parse data rows
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for total viscous drag values
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

      // Parse data rows
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

      // VFP Coefficients with wing area
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

        // Also set the main coefficients for backward compatibility
        level.coefficients = level.vfpCoefficients;
        continue;
      }

      // IBE Coefficients
      if (line.includes('CLTOT(IBE)')) {
        const clMatch = line.match(/CLTOT\(IBE\)=\s*([\d.-]+)/);
        const cdMatch = line.match(/CDTOT\(IBE\)=\s*([\d.-]+)/);

        level.ibeCoefficients = {
          CL: clMatch ? parseFloat(clMatch[1]) : null,
          CD: cdMatch ? parseFloat(cdMatch[1]) : null
        };
        continue;
      }

      // Vortex Coefficients
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

      // Parse each level
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

      // Update coefficients and drag breakdown with the last level's data
      if (forcesData.levels.length > 0) {
        const lastLevel = forcesData.levels[forcesData.levels.length - 1];

        // Update main coefficients
        if (lastLevel.coefficients) {
          setCoefficients(lastLevel.coefficients);
        }

        // Update drag breakdown
        const newDragBreakdown = {
          cdInduced: lastLevel.vortexCoefficients?.CD || 0.000,
          cdViscous: lastLevel.viscousDragData?.totalViscousDrag || 0.000,
          cdWave: 0.000 // This might need to be calculated or found elsewhere
        };

        setDragBreakdown(newDragBreakdown);
      }

      // Log the complete forces JSON structure
      console.log('Parsed Forces file JSON:', forcesData);

    } catch (error) {
      console.error('Error parsing .forces file:', error);
    }
  };

  const renderFileExplorer = () => {
    if (!simulationData) {
      return (
        <div className="empty-explorer">
          <p>No simulation data loaded</p>
          <button onClick={handleImportFolder} className="import-folder-btn">
            Import Folder
          </button>
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
          {Object.entries(simulationData.files).map(([fileType, files]) => {
            if (files.length === 0) return null;

            return (
              <div key={fileType} className="file-type-section">
                <div className="file-type-header">
                  <span className="file-type-icon">{getFileTypeIcon(fileType)}</span>
                  <span className="file-type-name">{fileType.toUpperCase()} Files ({files.length})</span>
                </div>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`file-item ${isFileSelected(file) ? 'selected' : ''} ${['dat', 'cp', 'forces'].includes(fileType) ? 'selectable' : 'non-selectable'
                      }`}
                    onClick={() => handleFileSelect(file)}
                    title={file.name} // Tooltip for full filename
                  >
                    <span className="file-icon">
                      {getFileIcon(file.name)}
                    </span>
                    <span className="file-name">{file.name}</span>
                    {isFileSelected(file) && <span className="selected-indicator">✓</span>}
                  </div>
                ))}
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
            <button className="control-btn boundary-btn">Boundary Layer Data</button>

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
                disabled={showMesh}
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

            <div className="interval-section">
              <label>Interval 3d plot:</label>
              <input type="number" defaultValue="0" className="interval-input" />
            </div>

            <div className="load-section">
              <select className="control-dropdown">
                <option>Load</option>
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
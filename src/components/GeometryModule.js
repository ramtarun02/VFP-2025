import React, { useState } from 'react';
import Plot3D from './Plot3D';
import Plot2D from './Plot2D';
import "./GeometryModule.css";
import { useNavigate } from "react-router-dom";
import { reverse } from 'd3';

function GeometryModule() {
  const [geoFiles, setGeoFiles] = useState([]); // Array to store multiple GEO files
  const [selectedGeoFile, setSelectedGeoFile] = useState(null); // Currently selected file for 3D view
  const [visible2DFiles, setVisible2DFiles] = useState([]); // Array of file IDs visible in 2D plots
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(-1);
  const [parameters, setParameters] = useState({});
  const [modifiedParameters, setModifiedParameters] = useState({});
  const [selected2DPlot, setSelected2DPlot] = useState("");
  const [planformView, setPlanformView] = useState(false); // New state for planform view toggle
  const navigate = useNavigate();
  const [wingSpecs, setWingSpecs] = useState({
    aspectRatio: 0,
    wingSpan: 0,
    numSections: 0,
    taperRatio: 0
  });

  // New state for Improve Panel
  const [improveSettings, setImproveSettings] = useState({
    selectedParameter: 'Twist',
    startSection: 1,
    endSection: 1,
    aValue: 0
  });

  const calculateWingSpecs = (geoData) => {
    if (!geoData || geoData.length === 0) {
      return {
        aspectRatio: 0,
        wingSpan: 0,
        numSections: 0,
        taperRatio: 0
      };
    }
    const numSections = geoData.length;
    const lastSection = geoData[geoData.length - 1];
    const wingSpan = 2 * lastSection.YSECT; // Assuming symmetry
    const tipChord = lastSection.G2SECT - lastSection.G1SECT;
    const taperRatio = tipChord;
    const aspectRatio = (2 * wingSpan) / (1 + taperRatio);
    return {
      aspectRatio: aspectRatio.toFixed(2),
      wingSpan: wingSpan.toFixed(3),
      numSections: numSections,
      taperRatio: taperRatio.toFixed(2)
    }
  };

  // Color palette for different GEO files
  const colorPalette = [
    { primary: 'red', secondary: 'blue' },
    { primary: 'green', secondary: 'orange' },
    { primary: 'purple', secondary: 'brown' },
    { primary: 'pink', secondary: 'gray' },
    { primary: 'cyan', secondary: 'yellow' },
    { primary: 'magenta', secondary: 'olive' }
  ];

  // Helper function to remove file extension
  const removeFileExtension = (filename) => {
    return filename.replace(/\.[^/.]+$/, "");
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('http://127.0.1:5000/import-geo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.results) {
        const newGeoFiles = [];

        data.results.forEach((result, index) => {
          if (!result.error && result.plotData) {
            const newGeoFile = {
              id: Date.now() + index, // Unique ID
              name: removeFileExtension(result.filename), // Remove extension from display name
              fullName: result.filename, // Keep full filename for reference
              originalGeoData: result.geoData,
              modifiedGeoData: null,
              originalPlotData: result.plotData,
              modifiedPlotData: null,
              color: colorPalette[(geoFiles.length + index) % colorPalette.length],
              selectedSection: -1 // Track selected section per file
            };
            newGeoFiles.push(newGeoFile);
          } else {
            console.error(`Error processing ${result.filename}:`, result.error);
          }
        });

        setGeoFiles(prev => [...prev, ...newGeoFiles]);

        // Set first new file as selected for 3D view if no file was previously selected
        if (!selectedGeoFile && newGeoFiles.length > 0) {
          const firstFile = newGeoFiles[0];
          setSelectedGeoFile(firstFile);
          setSections(["3D Wing", ...firstFile.originalGeoData.map((_, i) => `Section ${i + 1}`)]);
          setSelectedSection(-1);

          // Update improve settings with available sections
          setImproveSettings(prev => ({
            ...prev,
            endSection: firstFile.originalGeoData.length
          }));
        }

        // Add all new files to visible 2D files by default
        const newFileIds = newGeoFiles.map(file => file.id);
        setVisible2DFiles(prev => [...prev, ...newFileIds]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }

    // Reset file input
    event.target.value = '';
  };

  const exportGeoFile = async () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }

    try {
      const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
      const originalFilename = selectedGeoFile.fullName || `${selectedGeoFile.name}.GEO`;

      const response = await fetch('http://127.0.0.1:5000/export-geo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geoData: geoData,
          filename: originalFilename
        }),
      });

      if (response.ok) {
        // Get the filename from response headers or use default
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `${selectedGeoFile.name}_modified.GEO`;

        if (contentDisposition && contentDisposition.includes('filename=')) {
          filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        // Create blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log(`GEO file exported as: ${filename}`);
      } else {
        const errorData = await response.json();
        console.error('Export failed:', errorData.error);
        alert(`Export failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error exporting GEO file:', error);
      alert('Error exporting GEO file');
    }
  };

  const handleGeoFileSelection = (event) => {
    const fileId = parseInt(event.target.value);
    const selectedFile = geoFiles.find(file => file.id === fileId);
    setSelectedGeoFile(selectedFile);

    if (selectedFile) {
      const geoData = selectedFile.modifiedGeoData || selectedFile.originalGeoData;
      setSections(["3D Wing", ...geoData.map((_, i) => `Section ${i + 1}`)]);
      setSelectedSection(selectedFile.selectedSection);
      updateParameters(selectedFile.selectedSection);
      setModifiedParameters({}); // Clear modified parameters when switching files
      const specs = calculateWingSpecs(geoData);
      setWingSpecs(specs);

      // Update improve settings with available sections
      setImproveSettings(prev => ({
        ...prev,
        endSection: geoData.length
      }));

      // Reset planform view when switching files
      setPlanformView(false);
    } else {
      setWingSpecs({
        aspectRatio: 0,
        wingSpan: 0,
        numSections: 0,
        taperRatio: 0
      });
    }
  };

  const handle2DVisibilityToggle = (fileId) => {
    setVisible2DFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSectionChange = (event) => {
    const sectionIndex = parseInt(event.target.value);
    setSelectedSection(sectionIndex);
    updateParameters(sectionIndex);
    setSelected2DPlot("");
    setModifiedParameters({}); // Clear modified parameters when switching sections

    // Reset planform view when not in 3D Wing mode
    if (sectionIndex !== -1) {
      setPlanformView(false);
    }

    // Update the selected section for the current file
    if (selectedGeoFile) {
      setGeoFiles(prev => prev.map(file =>
        file.id === selectedGeoFile.id
          ? { ...file, selectedSection: sectionIndex }
          : file
      ));
      setSelectedGeoFile(prev => ({ ...prev, selectedSection: sectionIndex }));
    }
  };

  const handlePlanformToggle = () => {
    if (selectedSection === -1) { // Only allow when 3D Wing is selected
      setPlanformView(!planformView);
    }
  };

  const updateParameters = (sectionIndex) => {
    if (sectionIndex === -1 || !selectedGeoFile) {
      setParameters({
        Twist: '',
        Dihedral: '',
        YSECT: '',
        XLE: '',
        XTE: '',
        Chord: '',
      });
      return;
    }

    const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
    if (geoData && geoData[sectionIndex]) {
      setParameters({
        Twist: geoData[sectionIndex].TWIST,
        Dihedral: geoData[sectionIndex].HSECT,
        YSECT: geoData[sectionIndex].YSECT,
        XLE: geoData[sectionIndex].G1SECT,
        XTE: geoData[sectionIndex].G2SECT,
        Chord: (geoData[sectionIndex].G2SECT - geoData[sectionIndex].G1SECT),
      });
    }
  };

  const handleParameterChange = (param, value) => {
    setModifiedParameters(prev => ({
      ...parameters,
      ...prev,
      [param]: value
    }));
  };

  // New function to handle improve settings change
  const handleImproveSettingsChange = (field, value) => {
    setImproveSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // New function to perform interpolation
  const performInterpolation = async () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }

    const { selectedParameter, startSection, endSection, aValue } = improveSettings;

    if (startSection < 1 || endSection < 1 || startSection > endSection) {
      alert('Please enter valid start and end sections');
      return;
    }

    const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
    const numSections = geoData.length;

    if (startSection > numSections || endSection > numSections) {
      alert(`Section numbers must be between 1 and ${numSections}`);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/interpolate_parameter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geoData: geoData,
          plotData: selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData,
          parameter: selectedParameter,
          startSection: startSection - 1, // Convert to 0-based index
          endSection: endSection - 1, // Convert to 0-based index
          aValue: parseFloat(aValue)
        }),
      });

      const { updatedGeoData, updatedPlotData } = await response.json();

      if (updatedPlotData) {
        // Update the selected file with modified data
        setGeoFiles(prev => prev.map(file =>
          file.id === selectedGeoFile.id
            ? { ...file, modifiedGeoData: updatedGeoData, modifiedPlotData: updatedPlotData }
            : file
        ));

        // Update selectedGeoFile reference
        setSelectedGeoFile(prev => ({
          ...prev,
          modifiedGeoData: updatedGeoData,
          modifiedPlotData: updatedPlotData
        }));

        // Update parameters if a section is selected
        if (selectedSection >= 0) {
          updateParameters(selectedSection);
        }

        console.log('Interpolation completed successfully');
      }
    } catch (error) {
      console.error('Error performing interpolation:', error);
      alert('Error performing interpolation');
    }
  };

  // New function to reset improve changes
  const resetImproveChanges = () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }

    // Reset the selected file to original data
    setGeoFiles(prev => prev.map(file =>
      file.id === selectedGeoFile.id
        ? { ...file, modifiedGeoData: null, modifiedPlotData: null }
        : file
    ));

    // Update selectedGeoFile reference
    setSelectedGeoFile(prev => ({
      ...prev,
      modifiedGeoData: null,
      modifiedPlotData: null
    }));

    // Update parameters if a section is selected
    if (selectedSection >= 0) {
      updateParameters(selectedSection);
    }

    // Clear modified parameters
    setModifiedParameters({});

    console.log('All changes reset to original data');
  };

  // Function to reset all changes in Controls panel (renamed from compute Global)
  const resetAllChanges = () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }

    // Reset the selected file to original data
    setGeoFiles(prev => prev.map(file =>
      file.id === selectedGeoFile.id
        ? { ...file, modifiedGeoData: null, modifiedPlotData: null }
        : file
    ));

    // Update selectedGeoFile reference
    setSelectedGeoFile(prev => ({
      ...prev,
      modifiedGeoData: null,
      modifiedPlotData: null
    }));

    // Update parameters if a section is selected
    if (selectedSection >= 0) {
      updateParameters(selectedSection);
    }

    // Clear modified parameters
    setModifiedParameters({});

    console.log('All changes reset to original data');
  };

  const computeDesired = async () => {
    if (!selectedGeoFile || selectedSection === null || selectedSection === undefined) {
      alert("Please select a file and section first");
      return;
    }
    if (Object.keys(modifiedParameters).length === 0) {
      alert("Please modify at least one parameter before computing");
      return;
    }

    try {
      const response = await fetch('http://127.0.1:5000/compute_desired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionIndex: selectedSection,
          parameters: modifiedParameters,
          geoData: selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData,
          plotData: selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData
        }),
      });

      const { updatedGeoData, updatedPlotData } = await response.json();

      if (updatedPlotData) {
        // Update the selected file with modified data
        setGeoFiles(prev => prev.map(file =>
          file.id === selectedGeoFile.id
            ? { ...file, modifiedGeoData: updatedGeoData, modifiedPlotData: updatedPlotData }
            : file
        ));

        // Update selectedGeoFile reference
        setSelectedGeoFile(prev => ({
          ...prev,
          modifiedGeoData: updatedGeoData,
          modifiedPlotData: updatedPlotData
        }));

        // Update parameters with new baseline values and clear modified parameters
        updateParameters(selectedSection);
        setModifiedParameters({}); // Clear modified parameters after successful computation

        console.log('Updated Geo Data:', updatedGeoData);
      }
    } catch (error) {
      console.error('Error computing desired parameters:', error);
    }
  };

  // Get current selection info for header
  const getSelectionInfo = () => {
    if (!selectedGeoFile || selectedSection === -1) {
      return "No file or section selected";
    }
    return `${selectedGeoFile.name} - Section ${selectedSection + 1}`;
  };

  // 3D plot traces (only for selected file)
  const plot3DTrace = () => {
    if (!selectedGeoFile) return [];

    const plotData = selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData;
    const color = selectedGeoFile.color;

    if (planformView && selectedSection === -1) {
      // Generate planform view traces (top-down 2D view)
      const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
      return geoData.map((section, index) => ({
        y: [section.G2SECT, section.G1SECT, section.G1SECT, section.G2SECT, section.G2SECT],
        x: [section.YSECT, section.YSECT, section.YSECT, section.YSECT, section.YSECT],
        type: 'scatter',
        mode: 'lines',
        name: `Section ${index + 1}`,
        line: {
          color: index === 0 ? 'red' : 'black', // Highlight root section
          width: 4
        }
      }));
    } else {
      // Regular 3D view
      return plotData.flatMap((sectionData, index) => [
        {
          x: sectionData.xus,
          y: sectionData.y,
          z: sectionData.zus,
          type: 'scatter3d',
          mode: 'lines',
          line: { 'color': color.primary, 'width': 6 }
        },
        {
          x: sectionData.xls,
          y: sectionData.y,
          z: sectionData.zls,
          type: 'scatter3d',
          mode: 'lines',
          line: { 'color': color.secondary, 'width': 6 }
        }
      ]);
    }
  };

  // Get plot layout for 3D view
  const get3DPlotLayout = () => {
    if (planformView && selectedSection === -1) {
      // 2D planform view layout
      return {
        xaxis: {
          title: 'X (Chord Direction)',
          showgrid: true
        },
        yaxis: {
          title: 'Y (Span Direction)',
          showgrid: true,
          autorange: 'reversed' // Reverse y-axis for correct orientation
        },
        showlegend: false,
        title: 'Wing Planform View',
        autosize: true,
        margin: { l: 60, r: 20, b: 60, t: 60 },
        paper_bgcolor: '#f9fafb',
        plot_bgcolor: '#ffffff',
        font: { family: 'Times New Roman' }
      };
    } else {
      // Regular 3D layout
      return {
        scene: {
          aspectmode: 'data',
          xaxis: { title: { text: 'Chordwise (X)', font: { family: 'Times New Roman' } }, showgrid: true },
          yaxis: { title: { text: 'Spanwise (Y)', font: { family: 'Times New Roman' } }, showgrid: true },
          zaxis: { title: { text: 'Thickness (Z)', font: { family: 'Times New Roman' } }, showgrid: true },
          camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        title: '3D Wing View',
        showlegend: false,
        autosize: true,
        margin: { l: 25, r: 10, t: 50, b: 25 },
        font: { family: 'Times New Roman' },
        paper_bgcolor: '#f9fafb',
        plot_bgcolor: '#f9fafb'
      };
    }
  };


  // 2D plot traces (for all visible files)
  const plot2DTrace = () => {
    const visibleFiles = geoFiles.filter(file => visible2DFiles.includes(file.id));
    if (visibleFiles.length === 0) return [];

    if (selected2DPlot === "twist") {
      return visibleFiles.flatMap(file => {
        const geoData = file.originalGeoData;
        const modifiedGeoData = file.modifiedGeoData;
        const color = file.color;

        const traces = [{
          x: geoData.map((_, i) => i + 1),
          y: geoData.map(section => section.TWIST),
          type: 'scatter',
          mode: 'lines+markers',
          name: `${file.name} - Original Twist`,
          line: { color: color.primary }
        }];

        if (modifiedGeoData) {
          traces.push({
            x: modifiedGeoData.map((_, i) => i + 1),
            y: modifiedGeoData.map(section => section.TWIST),
            type: 'scatter',
            mode: 'lines+markers',
            name: `${file.name} - Modified Twist`,
            line: { color: color.primary, dash: 'dash' }
          });
        }

        return traces;
      });
    }

    if (selected2DPlot === "dihedral") {
      return visibleFiles.flatMap(file => {
        const geoData = file.originalGeoData;
        const modifiedGeoData = file.modifiedGeoData;
        const color = file.color;

        const traces = [{
          x: geoData.map((_, i) => i + 1),
          y: geoData.map(section => section.HSECT),
          type: 'scatter',
          mode: 'lines+markers',
          name: `${file.name} - Original Dihedral`,
          line: { color: color.secondary }
        }];

        if (modifiedGeoData) {
          traces.push({
            x: modifiedGeoData.map((_, i) => i + 1),
            y: modifiedGeoData.map(section => section.HSECT),
            type: 'scatter',
            mode: 'lines+markers',
            name: `${file.name} - Modified Dihedral`,
            line: { color: color.secondary, dash: 'dash' }
          });
        }

        return traces;
      });
    }

    if (selected2DPlot === "section") {
      return visibleFiles.flatMap(file => {
        const sectionIndex = file.selectedSection;

        // Skip if no valid section selected for this file
        if (sectionIndex < 0) return [];

        const plotData = file.originalPlotData;
        const modifiedPlotData = file.modifiedPlotData;
        const color = file.color;

        if (!plotData[sectionIndex]) return [];

        const sectionData = plotData[sectionIndex];
        const traces = [
          {
            x: sectionData.xus,
            y: sectionData.zus,
            type: 'scatter',
            mode: 'lines',
            name: `${file.name} - Section ${sectionIndex + 1} - Upper Surface`,
            line: { 'color': color.primary, 'width': 3 }
          },
          {
            x: sectionData.xls,
            y: sectionData.zls,
            type: 'scatter',
            mode: 'lines',
            name: `${file.name} - Section ${sectionIndex + 1} - Lower Surface`,
            line: { 'color': color.secondary, 'width': 3 }
          }
        ];

        if (modifiedPlotData && modifiedPlotData[sectionIndex]) {
          const newsectionData = modifiedPlotData[sectionIndex];
          if (newsectionData.xus_n && newsectionData.zus_n) {
            traces.push(
              {
                x: newsectionData.xus_n,
                y: newsectionData.zus_n,
                type: 'scatter',
                mode: 'lines',
                name: `${file.name} - Section ${sectionIndex + 1} - Modified Upper`,
                line: { 'color': color.primary, 'width': 3, 'dash': 'dash' }
              },
              {
                x: newsectionData.xls_n,
                y: newsectionData.zls_n,
                type: 'scatter',
                mode: 'lines',
                name: `${file.name} - Section ${sectionIndex + 1} - Modified Lower`,
                line: { 'color': color.secondary, 'width': 3, 'dash': 'dash' }
              }
            );
          }
        }
        return traces;
      });
    }

    return [];
  };

  // Generate section options for dropdowns
  const getSectionOptions = () => {
    if (!selectedGeoFile) return [];
    const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
    return geoData.map((_, index) => index + 1);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-group">
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Main Module</button>
          <button className="btn btn-secondary">FPCON</button>
          <div className='btn btn-secondary'>
            <input
              type="file"
              accept=".GEO"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="fileInput"
              multiple
            />
            <label onClick={() => document.getElementById('fileInput').click()}>
              Import file
            </label>
          </div>
        </div>
        <div className="header-group">
          <button className="btn btn-secondary" onClick={exportGeoFile}>Export GEO file</button>
          <button className="btn btn-secondary">Save plots</button>
          <button className="btn btn-danger" onClick={() => window.location.reload(false)}>Reset</button>
        </div>
      </header>

      <div className="content-row">
        {/* Main Content: vertical stack */}
        <div className="main-content">
          <div className="graph-panel">
            {/* GEO File Selection for 3D Plot */}
            {geoFiles.length > 0 && (
              <div className="dropdown-container">
                <label htmlFor="geo-file-select">3D Plot File: </label>
                <select
                  id="geo-file-select"
                  onChange={handleGeoFileSelection}
                  value={selectedGeoFile?.id || ''}
                >
                  {geoFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Section Selection with Planform View Toggle */}
            {sections.length > 0 && (
              <div className="dropdown-container">
                <label htmlFor="section-select">Section: </label>
                <select id="section-select" onChange={handleSectionChange}
                  value={selectedSection}>
                  {sections.map((section, index) => (
                    <option key={index} value={index - 1}>
                      {section}
                    </option>
                  ))}
                </select>

                {/* Planform View Toggle */}
                <div className="planform-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={planformView}
                      onChange={handlePlanformToggle}
                      disabled={selectedSection !== -1}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text">Planform View</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 3D Plot */}
          {selectedGeoFile && (
            <Plot3D
              plotData={plot3DTrace()}
              selectedSection={selectedSection}
              layout={get3DPlotLayout()}
            />
          )}

          <div className="plot2d-panel">
            {/* 2D File Visibility Controls */}
            {geoFiles.length > 0 && (
              <div className="file-visibility-container">
                <label>2D Plot Files: </label>
                <div className="checkbox-group">
                  {geoFiles.map(file => (
                    <label key={file.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={visible2DFiles.includes(file.id)}
                        onChange={() => handle2DVisibilityToggle(file.id)}
                      />
                      <span style={{ color: file.color.primary }}>
                        {file.name}
                        {file.selectedSection >= 0 && ` (Section ${file.selectedSection + 1})`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 2D Plot Type Selection */}
            <div className="plot2d-radio-group">
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="section"
                  checked={selected2DPlot === "section"}
                  onChange={() => setSelected2DPlot("section")}
                  disabled={!geoFiles.some(file => visible2DFiles.includes(file.id) && file.selectedSection >= 0)}
                />
                Section 2D Plot
              </label>
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="twist"
                  checked={selected2DPlot === "twist"}
                  onChange={() => setSelected2DPlot("twist")}
                />
                Twist Distribution
              </label>
              <label>
                <input
                  type="radio"
                  name="plot2d"
                  value="dihedral"
                  checked={selected2DPlot === "dihedral"}
                  onChange={() => setSelected2DPlot("dihedral")}
                />
                Dihedral Distribution
              </label>
            </div>
          </div>

          {/* 2D Plot */}
          {geoFiles.length > 0 && visible2DFiles.length > 0 && (
            <Plot2D
              plotData={plot2DTrace()}
              selectedSection={selectedSection}
            />
          )}
        </div>

        {/* Side Content: vertical stack */}
        <div className="side-content">
          <div className="side-panel">
            <div className="specs-panel">
              <div className="specs-container">
                <h2 className="specs-title">Wing Specifications</h2>
                <table className="specs-table">
                  <tbody>
                    <tr>
                      <td>Aspect Ratio</td>
                      <td><input type="text" className="input-field" value={wingSpecs.aspectRatio} readOnly /></td>
                    </tr>
                    <tr>
                      <td>Wing Span</td>
                      <td><input type="text" className="input-field" value={wingSpecs.wingSpan} readOnly /></td>
                    </tr>
                    <tr>
                      <td>Number of Sections</td>
                      <td><input type="text" className="input-field" value={wingSpecs.numSections} readOnly /></td>
                    </tr>
                    <tr>
                      <td>Taper Ratio</td>
                      <td><input type="text" className="input-field" value={wingSpecs.taperRatio} readOnly /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Improve Sections Panel */}
            <div className="improve-panel">
              <div className="improve-container">
                <h2 className="improve-title">Improve Sections</h2>

                {/* Parameter Selection */}
                <div className="improve-radio-group">
                  <label>
                    <input
                      type="radio"
                      name="improveParameter"
                      value="Twist"
                      checked={improveSettings.selectedParameter === 'Twist'}
                      onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                    />
                    Twist
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="improveParameter"
                      value="Dihedral"
                      checked={improveSettings.selectedParameter === 'Dihedral'}
                      onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                    />
                    Dihedral
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="improveParameter"
                      value="XLE"
                      checked={improveSettings.selectedParameter === 'XLE'}
                      onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                    />
                    XLE
                  </label>
                </div>

                {/* Section Range Selection */}
                <div className="improve-sections">
                  <div className="section-range">
                    <label>Sections:</label>
                    <div className="range-inputs">
                      <select
                        value={improveSettings.startSection}
                        onChange={(e) => handleImproveSettingsChange('startSection', parseInt(e.target.value))}
                        disabled={!selectedGeoFile}
                      >
                        {getSectionOptions().map(sectionNum => (
                          <option key={sectionNum} value={sectionNum}>
                            {sectionNum}
                          </option>
                        ))}
                      </select>

                      <span>to</span>

                      <select
                        value={improveSettings.endSection}
                        onChange={(e) => handleImproveSettingsChange('endSection', parseInt(e.target.value))}
                        disabled={!selectedGeoFile}
                      >
                        {getSectionOptions().map(sectionNum => (
                          <option key={sectionNum} value={sectionNum}>
                            {sectionNum}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Formula Display */}
                  <div className="formula-display">
                    <span>(y = ax² + bx + c)</span>
                  </div>

                  {/* A Value Input */}
                  <div className="a-value">
                    <label>a = </label>
                    <input
                      type="number"
                      className="input-field"
                      value={improveSettings.aValue}
                      onChange={(e) => handleImproveSettingsChange('aValue', e.target.value)}
                      step="0.1"
                    />
                  </div>
                </div>

                {/* Improve and Reset Controls */}
                <div className="improve-controls">
                  <button
                    className="btn btn-primary"
                    onClick={performInterpolation}
                    disabled={!selectedGeoFile}
                  >
                    Improve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={resetImproveChanges}
                    disabled={!selectedGeoFile || (!selectedGeoFile.modifiedGeoData && !selectedGeoFile.modifiedPlotData)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="controls-panel">
              <div className="controls-container">
                <h2 className="controls-title">Controls</h2>
                {/* Selection Info Header */}
                <div className="selection-info">
                  <h3 className="selection-header">{getSelectionInfo()}</h3>
                </div>
                <table className="parameters-table">
                  <thead>
                    <tr>
                      <th className="text-left">Parameter</th>
                      <th>Baseline</th>
                      <th>Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(parameters || { Twist: 0.0, Dihedral: 0.0, YSECT: 0.0, XLE: 0.0, XTE: 0.0, Chord: 0.0 }).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td><input type="text" className="input-field" value={typeof value === "number" ? Number(value).toFixed(3) : value} readOnly /></td>
                        <td><input type="text" className="input-field" onChange={(e) => handleParameterChange(key, e.target.value)} value={modifiedParameters[key] ?? ''} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="computation-controls">
                  <button className="btn btn-primary" onClick={computeDesired}>Compute Desired</button>
                  <button
                    className="btn btn-danger"
                    onClick={resetAllChanges}
                    disabled={!selectedGeoFile || (!selectedGeoFile.modifiedGeoData && !selectedGeoFile.modifiedPlotData)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeometryModule;
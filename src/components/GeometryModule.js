import React, { useState } from 'react';
import Plot3D from './Plot3D';
import Plot2D from './Plot2D';
import { useNavigate } from "react-router-dom";
import { fetchAPI } from '../utils/fetch';

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
      const response = await fetchAPI('/import-geo', {
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

          // FIX: Update wingSpecs here
          const geoData = firstFile.modifiedGeoData || firstFile.originalGeoData;
          setWingSpecs(calculateWingSpecs(geoData));
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

      const response = await fetchAPI('/export-geo', {
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
      setWingSpecs(calculateWingSpecs(geoData)); // <-- FIX: update specs here

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

    // // Reset planform view when not in 3D Wing mode
    // if (sectionIndex !== -1) {
    //   setPlanformView(false);
    // }

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
    setPlanformView(!planformView);
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
      [field]: field === 'aValue' ? parseFloat(value) || 0 : value
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

    const numSections = geoData.length;

    if (startSection > numSections || endSection > numSections) {
      alert(`Section numbers must be between 1 and ${numSections}`);
      return;
    }

    const numericAValue = typeof aValue === 'number' ? aValue : parseFloat(aValue) || 0;

    try {
      const response = await fetchAPI('/interpolate_parameter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geoData: geoData,
          plotData: selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData,
          parameter: selectedParameter,
          startSection: startSection - 1, // Convert to 0-based index
          endSection: endSection - 1, // Convert to 0-based index
          aValue: numericAValue
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
        const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
        setWingSpecs(calculateWingSpecs(geoData)); // <-- FIX: update specs here


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

    const geoData = selectedGeoFile.originalGeoData;
    setWingSpecs(calculateWingSpecs(geoData));


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
      const response = await fetchAPI('/compute_desired', {
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
        setWingSpecs(calculateWingSpecs(updatedGeoData)); // <-- FIX: update specs here

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

    if (planformView) {
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
    if (planformView) {
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
    <div className="min-h-screen bg-gray-100 font-serif">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-8 py-4 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              onClick={() => navigate('/')}
            >
              Back to Main Module
            </button>
            <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md">
              FPCON
            </button>
            <div className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md cursor-pointer">
              <input
                type="file"
                accept=".GEO"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="fileInput"
                multiple
              />
              <label
                className="cursor-pointer"
                onClick={() => document.getElementById('fileInput').click()}
              >
                Import file
              </label>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
              onClick={exportGeoFile}
            >
              Export GEO file
            </button>
            <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md">
              Save plots
            </button>
            <button
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              onClick={() => window.location.reload(false)}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex lg:flex-row flex-col gap-4 p-4 min-h-screen">
        {/* Left Side - Main Content */}
        <div className="flex-1 lg:w-3/4 space-y-4">
          {/* Combined Controls Panel - All in one horizontal line */}
          {geoFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-3">
              <div className="flex flex-wrap items-center gap-6">
                {/* 3D Plot File Selection */}
                <div className="flex items-center gap-3">
                  <label htmlFor="geo-file-select" className="font-medium text-gray-700 text-sm whitespace-nowrap">
                    3D Plot File:
                  </label>
                  <select
                    id="geo-file-select"
                    onChange={handleGeoFileSelection}
                    value={selectedGeoFile?.id || ''}
                    className="px-2 py-1 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                  >
                    {geoFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Selection */}
                {sections.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label htmlFor="section-select" className="font-medium text-gray-700 text-sm whitespace-nowrap">
                      Section:
                    </label>
                    <select
                      id="section-select"
                      onChange={handleSectionChange}
                      value={selectedSection}
                      className="px-2 py-1 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    >
                      {sections.map((section, index) => (
                        <option key={index} value={index - 1}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Planform View Toggle */}
                {sections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planformView}
                        onChange={handlePlanformToggle}
                        className="sr-only"
                      />
                      <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${planformView ? 'bg-blue-600' : 'bg-gray-300'
                        } ${selectedSection !== -1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${planformView ? 'transform translate-x-5' : ''
                          }`} />
                      </div>
                      <span className={`ml-2 text-sm font-medium ${selectedSection !== -1 ? 'text-gray-400' : 'text-gray-700'} whitespace-nowrap`}>
                        Planform View
                      </span>
                    </label>
                  </div>
                )}

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-gray-300"></div>

                {/* 2D Plot File Visibility Controls */}
                <div className="flex items-center gap-3">
                  <label className="font-medium text-gray-700 text-sm whitespace-nowrap">2D Plot Files:</label>
                  <div className="flex flex-wrap gap-3">
                    {geoFiles.map(file => (
                      <label key={file.id} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visible2DFiles.includes(file.id)}
                          onChange={() => handle2DVisibilityToggle(file.id)}
                          className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: file.color.primary }}
                        >
                          {file.name}
                          {file.selectedSection >= 0 && ` (S${file.selectedSection + 1})`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Another Vertical Separator */}
                <div className="h-6 w-px bg-gray-300"></div>

                {/* 2D Plot Type Selection */}
                <div className="flex items-center gap-3">
                  <label className="font-medium text-gray-700 text-sm whitespace-nowrap">Plot Type:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="section"
                        checked={selected2DPlot === "section"}
                        onChange={() => setSelected2DPlot("section")}
                        disabled={!geoFiles.some(file => visible2DFiles.includes(file.id) && file.selectedSection >= 0)}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Section 2D</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="twist"
                        checked={selected2DPlot === "twist"}
                        onChange={() => setSelected2DPlot("twist")}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Twist</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="dihedral"
                        checked={selected2DPlot === "dihedral"}
                        onChange={() => setSelected2DPlot("dihedral")}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Dihedral</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 3D Plot */}
          {selectedGeoFile && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <Plot3D
                plotData={plot3DTrace()}
                selectedSection={selectedSection}
                layout={get3DPlotLayout()}
              />
            </div>
          )}

          {/* 2D Plot */}
          {geoFiles.length > 0 && visible2DFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <Plot2D
                plotData={plot2DTrace()}
                selectedSection={selectedSection}
              />
            </div>
          )}
        </div>

        {/* Right Side - Control Panels (Reduced Width) */}
        <div className="lg:w-1/4 space-y-4">
          {/* Wing Specifications Panel */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <div className="p-4">
              <h2 className="text-lg font-bold text-blue-700 text-center mb-4 tracking-wide">
                Wing Specifications
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-medium text-gray-600">Aspect Ratio</label>
                  <input
                    type="text"
                    className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={wingSpecs.aspectRatio}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-medium text-gray-600">Wing Span</label>
                  <input
                    type="text"
                    className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={wingSpecs.wingSpan}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-medium text-gray-600">Number of Sections</label>
                  <input
                    type="text"
                    className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={wingSpecs.numSections}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-medium text-gray-600">Taper Ratio</label>
                  <input
                    type="text"
                    className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={wingSpecs.taperRatio}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Improve Sections Panel */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <div className="p-4">
              <h2 className="text-lg font-bold text-blue-700 text-center mb-4 tracking-wide">
                Improve Sections
              </h2>

              {/* Parameter Selection */}
              <div className="mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="improveParameter"
                        value="Twist"
                        checked={improveSettings.selectedParameter === 'Twist'}
                        onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Twist</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="improveParameter"
                        value="Dihedral"
                        checked={improveSettings.selectedParameter === 'Dihedral'}
                        onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Dihedral</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="improveParameter"
                        value="XLE"
                        checked={improveSettings.selectedParameter === 'XLE'}
                        onChange={(e) => handleImproveSettingsChange('selectedParameter', e.target.value)}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">XLE</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section Range Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sections:</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={improveSettings.startSection}
                      onChange={(e) => handleImproveSettingsChange('startSection', parseInt(e.target.value))}
                      disabled={!selectedGeoFile}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {getSectionOptions().map(sectionNum => (
                        <option key={sectionNum} value={sectionNum}>
                          {sectionNum}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-medium text-gray-600">to</span>
                    <select
                      value={improveSettings.endSection}
                      onChange={(e) => handleImproveSettingsChange('endSection', parseInt(e.target.value))}
                      disabled={!selectedGeoFile}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
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
                <div className="text-center mb-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="font-mono text-xs text-gray-600 font-medium">(y = ax² + bx + c)</span>
                </div>

                {/* A Value Input */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">a =</label>
                  <input
                    type="number"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={improveSettings.aValue}
                    onChange={(e) => handleImproveSettingsChange('aValue', e.target.value)}
                    step="0.5"
                    placeholder='0.0'
                  />
                </div>
              </div>

              {/* Improve and Reset Controls */}
              <div className="flex justify-center gap-2">
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={performInterpolation}
                  disabled={!selectedGeoFile}
                >
                  Improve
                </button>
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={resetImproveChanges}
                  disabled={!selectedGeoFile || (!selectedGeoFile.modifiedGeoData && !selectedGeoFile.modifiedPlotData)}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <div className="p-4">
              <h2 className="text-lg font-bold text-blue-700 text-center mb-4 tracking-wide">
                Controls
              </h2>

              {/* Selection Info Header */}
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-600 rounded-md">
                <h3 className="text-sm font-semibold text-blue-700 text-center">
                  {getSelectionInfo()}
                </h3>
              </div>

              {/* Parameters Table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 px-1 text-xs font-medium text-gray-700">Parameter</th>
                      <th className="text-center py-1 px-1 text-xs font-medium text-gray-700">Baseline</th>
                      <th className="text-center py-1 px-1 text-xs font-medium text-gray-700">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(parameters || { Twist: 0.0, Dihedral: 0.0, YSECT: 0.0, XLE: 0.0, XTE: 0.0, Chord: 0.0 }).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-1 px-1 text-xs font-medium text-gray-700">{key}</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 bg-gray-100 border border-gray-300 rounded text-xs focus:outline-none"
                            value={typeof value === "number" ? Number(value).toFixed(3) : value}
                            readOnly
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onChange={(e) => handleParameterChange(key, e.target.value)}
                            value={modifiedParameters[key] ?? ''}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-2">
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                  onClick={computeDesired}
                >
                  Compute Desired
                </button>
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
  );
}

export default GeometryModule;
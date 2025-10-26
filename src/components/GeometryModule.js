import React, { useState } from 'react';
import Plot3D from './Plot3D';
import Plot2D from './Plot2D';
import { useNavigate } from "react-router-dom";
import { fetchAPI } from '../utils/fetch';
import { Fragment } from 'react';

function GeometryModule() {
  // --- State Definitions ---
  const [geoFiles, setGeoFiles] = useState([]);
  const [selectedGeoFile, setSelectedGeoFile] = useState(null);
  const [visible2DFiles, setVisible2DFiles] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(-1);
  const [parameters, setParameters] = useState({});
  const [modifiedParameters, setModifiedParameters] = useState({});
  const [selected2DPlot, setSelected2DPlot] = useState("");
  const [planformView, setPlanformView] = useState(false);
  const navigate = useNavigate();
  const [wingSpecs, setWingSpecs] = useState({
    aspectRatio: 0,
    wingSpan: 0,
    numSections: 0,
    taperRatio: 0
  });
  const [fpconOpen, setFpconOpen] = useState(false);
  const [fpconParams, setFpconParams] = useState({
    geoName: '',
    mach: '',
    incidence: '',
    bodyRadius: '',
    aspectRatio: '',
    taperRatio: '',
    sweepAngle: '',
    nsect: 1,
    nchange: 0,
    changeSections: [],
    etas: [''],
    hsect: [''],
    xtwsec: [''],
    twsin: [''],
    files: [],
    clcd_conv: false
  });
  const [fpconDownloadUrl, setFpconDownloadUrl] = useState(null);
  const [improveSettings, setImproveSettings] = useState({
    selectedParameter: 'Twist',
    startSection: 1,
    endSection: 1,
    aValue: 0
  });

  // --- Side Panel State ---
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [sidePanelWidth, setSidePanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = React.useRef(null);

  // --- FPCON Handlers ---
  const handleFpconChange = (field, value, idx) => {
    if (['etas', 'hsect', 'xtwsec', 'twsin'].includes(field)) {
      setFpconParams(prev => {
        const arr = [...prev[field]];
        arr[idx] = value;
        return { ...prev, [field]: arr };
      });
    } else if (field === 'changeSections') {
      setFpconParams(prev => ({
        ...prev,
        changeSections: value.split(',').map(v => v.trim()).filter(Boolean)
      }));
    } else if (field === 'files') {
      setFpconParams(prev => ({
        ...prev,
        files: Array.from(value)
      }));
    } else if (field === 'clcd_conv') {
      setFpconParams(prev => ({
        ...prev,
        clcd_conv: value
      }));
    } else {
      setFpconParams(prev => ({
        ...prev,
        [field]: value
      }));
      if (field === 'nsect') {
        const n = Number(value) || 1;
        setFpconParams(prev => ({
          ...prev,
          etas: Array(n).fill(''),
          hsect: Array(n).fill(''),
          xtwsec: Array(n).fill(''),
          twsin: Array(n).fill('')
        }));
      }
    }
  };

  const handleFpconSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('geoName', fpconParams.geoName);
    formData.append('aspectRatio', fpconParams.aspectRatio);
    formData.append('taperRatio', fpconParams.taperRatio);
    formData.append('sweepAngle', fpconParams.sweepAngle);
    formData.append('mach', fpconParams.mach);
    formData.append('incidence', fpconParams.incidence);
    formData.append('body_radius', fpconParams.bodyRadius);
    formData.append('nsect', fpconParams.nsect);
    formData.append('nchange', fpconParams.nchange);
    formData.append('clcd_conv', fpconParams.clcd_conv ? 'y' : 'n');
    fpconParams.changeSections.forEach((sec, idx) => {
      formData.append(`changeSections[]`, sec);
    });
    fpconParams.etas.forEach((val, idx) => {
      formData.append(`etas[]`, val);
    });
    fpconParams.hsect.forEach((val, idx) => {
      formData.append(`hsect[]`, val);
    });
    fpconParams.xtwsec.forEach((val, idx) => {
      formData.append(`xtwsec[]`, val);
    });
    fpconParams.twsin.forEach((val, idx) => {
      formData.append(`twsin[]`, val);
    });
    fpconParams.files.forEach((file, idx) => {
      formData.append(`file${idx + 1}`, file);
    });

    try {
      const response = await fetchAPI('/fpcon', {
        method: 'POST',
        body: formData
      });
      if (response.ok && response.headers.get('content-type')?.includes('application/zip')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setFpconDownloadUrl(url);
      } else {
        let errorMsg = 'Unknown error';
        try {
          const result = await response.json();
          errorMsg = result.error || errorMsg;
        } catch { }
        alert('Error: ' + errorMsg);
        setFpconOpen(false);
      }
    } catch (err) {
      alert('Submission failed: ' + err.message);
      setFpconOpen(false);
    }
  };

  // --- Geometry Calculations ---
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
    const wingSpan = 2 * lastSection.YSECT;
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

  // --- Color Palette ---
  const colorPalette = [
    { primary: 'red', secondary: 'blue' },
    { primary: 'green', secondary: 'orange' },
    { primary: 'purple', secondary: 'brown' },
    { primary: 'pink', secondary: 'gray' },
    { primary: 'cyan', secondary: 'yellow' },
    { primary: 'magenta', secondary: 'olive' }
  ];

  // --- File Upload Handler ---
  const removeFileExtension = (filename) => filename.replace(/\.[^/.]+$/, "");
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
              id: Date.now() + index,
              name: removeFileExtension(result.filename),
              fullName: result.filename,
              originalGeoData: result.geoData,
              modifiedGeoData: null,
              originalPlotData: result.plotData,
              modifiedPlotData: null,
              color: colorPalette[(geoFiles.length + index) % colorPalette.length],
              selectedSection: -1
            };
            newGeoFiles.push(newGeoFile);
          }
        });
        setGeoFiles(prev => [...prev, ...newGeoFiles]);
        if (!selectedGeoFile && newGeoFiles.length > 0) {
          const firstFile = newGeoFiles[0];
          setSelectedGeoFile(firstFile);
          setSections(["3D Wing", ...firstFile.originalGeoData.map((_, i) => `Section ${i + 1}`)]);
          setSelectedSection(-1);
          setImproveSettings(prev => ({
            ...prev,
            endSection: firstFile.originalGeoData.length
          }));
          const geoData = firstFile.modifiedGeoData || firstFile.originalGeoData;
          setWingSpecs(calculateWingSpecs(geoData));
        }
        const newFileIds = newGeoFiles.map(file => file.id);
        setVisible2DFiles(prev => [...prev, ...newFileIds]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
    event.target.value = '';
  };

  // --- Export GEO File Handler ---
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
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `${selectedGeoFile.name}_modified.GEO`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
          filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Export failed: ${errorData.error}`);
      }
    } catch (error) {
      alert('Error exporting GEO file');
    }
  };

  // --- Selection Handlers ---
  const handleGeoFileSelection = (event) => {
    const fileId = parseInt(event.target.value);
    const selectedFile = geoFiles.find(file => file.id === fileId);
    setSelectedGeoFile(selectedFile);
    if (selectedFile) {
      const geoData = selectedFile.modifiedGeoData || selectedFile.originalGeoData;
      setSections(["3D Wing", ...geoData.map((_, i) => `Section ${i + 1}`)]);
      setSelectedSection(selectedFile.selectedSection);
      updateParameters(selectedFile.selectedSection);
      setModifiedParameters({});
      setWingSpecs(calculateWingSpecs(geoData));
      setImproveSettings(prev => ({
        ...prev,
        endSection: geoData.length
      }));
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
    setModifiedParameters({});
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

  const handleImproveSettingsChange = (field, value) => {
    setImproveSettings(prev => ({
      ...prev,
      [field]: field === 'aValue' ? parseFloat(value) || 0 : value
    }));
  };

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
    const numericAValue = typeof aValue === 'number' ? aValue : parseFloat(aValue) || 0;
    try {
      const response = await fetchAPI('/interpolate_parameter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geoData: geoData,
          plotData: selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData,
          parameter: selectedParameter,
          startSection: startSection - 1,
          endSection: endSection - 1,
          aValue: numericAValue
        }),
      });
      const { updatedGeoData, updatedPlotData } = await response.json();
      if (updatedPlotData) {
        setGeoFiles(prev => prev.map(file =>
          file.id === selectedGeoFile.id
            ? { ...file, modifiedGeoData: updatedGeoData, modifiedPlotData: updatedPlotData }
            : file
        ));
        setSelectedGeoFile(prev => ({
          ...prev,
          modifiedGeoData: updatedGeoData,
          modifiedPlotData: updatedPlotData
        }));
        const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
        setWingSpecs(calculateWingSpecs(geoData));
        if (selectedSection >= 0) {
          updateParameters(selectedSection);
        }
      }
    } catch (error) {
      alert('Error performing interpolation');
    }
  };

  const resetImproveChanges = () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }
    setGeoFiles(prev => prev.map(file =>
      file.id === selectedGeoFile.id
        ? { ...file, modifiedGeoData: null, modifiedPlotData: null }
        : file
    ));
    setSelectedGeoFile(prev => ({
      ...prev,
      modifiedGeoData: null,
      modifiedPlotData: null
    }));
    const geoData = selectedGeoFile.originalGeoData;
    setWingSpecs(calculateWingSpecs(geoData));
    if (selectedSection >= 0) {
      updateParameters(selectedSection);
    }
    setModifiedParameters({});
  };

  const resetAllChanges = () => {
    if (!selectedGeoFile) {
      alert('Please select a file first');
      return;
    }
    setGeoFiles(prev => prev.map(file =>
      file.id === selectedGeoFile.id
        ? { ...file, modifiedGeoData: null, modifiedPlotData: null }
        : file
    ));
    setSelectedGeoFile(prev => ({
      ...prev,
      modifiedGeoData: null,
      modifiedPlotData: null
    }));
    if (selectedSection >= 0) {
      updateParameters(selectedSection);
    }
    setModifiedParameters({});
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
        setGeoFiles(prev => prev.map(file =>
          file.id === selectedGeoFile.id
            ? { ...file, modifiedGeoData: updatedGeoData, modifiedPlotData: updatedPlotData }
            : file
        ));
        setSelectedGeoFile(prev => ({
          ...prev,
          modifiedGeoData: updatedGeoData,
          modifiedPlotData: updatedPlotData
        }));
        updateParameters(selectedSection);
        setModifiedParameters({});
        setWingSpecs(calculateWingSpecs(updatedGeoData));
      }
    } catch (error) {
      console.error('Error computing desired parameters:', error);
    }
  };

  // --- Plot Data ---
  const getSelectionInfo = () => {
    if (!selectedGeoFile || selectedSection === -1) {
      return "No file or section selected";
    }
    return `${selectedGeoFile.name} - Section ${selectedSection + 1}`;
  };

  const plot3DTrace = () => {
    if (!selectedGeoFile) return [];
    const plotData = selectedGeoFile.modifiedPlotData || selectedGeoFile.originalPlotData;
    const color = selectedGeoFile.color;
    if (planformView) {
      const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
      return geoData.map((section, index) => ({
        y: [section.G2SECT, section.G1SECT, section.G1SECT, section.G2SECT, section.G2SECT],
        x: [section.YSECT, section.YSECT, section.YSECT, section.YSECT, section.YSECT],
        type: 'scatter',
        mode: 'lines',
        name: `Section ${index + 1}`,
        line: {
          color: index === 0 ? 'red' : 'black',
          width: 4
        }
      }));
    } else {
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

  const get3DPlotLayout = () => {
    if (planformView) {
      return {
        xaxis: {
          title: 'X (Chord Direction)',
          showgrid: true
        },
        yaxis: {
          title: 'Y (Span Direction)',
          showgrid: true,
          autorange: 'reversed'
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

  const getSectionOptions = () => {
    if (!selectedGeoFile) return [];
    const geoData = selectedGeoFile.modifiedGeoData || selectedGeoFile.originalGeoData;
    return geoData.map((_, index) => index + 1);
  };

  // --- Resize Handlers for Side Panel ---
  const handleMouseDown = React.useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
      setSidePanelWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
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


  // --- MAIN RETURN ---
  return (
    <div className="h-screen w-screen flex flex-col bg-blue-50 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-blue-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            title={isSidePanelOpen ? 'Hide side panel' : 'Show side panel'}
          >
            <svg className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${isSidePanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Geometry Module</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => navigate('/')}
          >
            Back to Main Module
          </button>
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
            onClick={() => setFpconOpen(true)}
          >
            FPCON
          </button>
          <div className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md cursor-pointer">
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
              Import Geometry
            </label>
          </div>
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
            onClick={exportGeoFile}
          >
            Export GEO file
          </button>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            onClick={() => window.location.reload(false)}
          >
            Reset
          </button>
        </div>
      </div>

      {/* FPCON Modal */}
      {fpconOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto p-8 relative" style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-xl font-bold"
              onClick={() => { setFpconOpen(false); setFpconDownloadUrl(null); }}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">FPCON Wing Geometry Input</h2>
            <form onSubmit={handleFpconSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geometry Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.geoName}
                    onChange={e => handleFpconChange('geoName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.aspectRatio}
                    onChange={e => handleFpconChange('aspectRatio', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taper Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.taperRatio}
                    onChange={e => handleFpconChange('taperRatio', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LE Sweep Angle (deg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.sweepAngle}
                    onChange={e => handleFpconChange('sweepAngle', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mach Number</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.mach}
                    onChange={e => handleFpconChange('mach', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incidence Angle</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.incidence}
                    onChange={e => handleFpconChange('incidence', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Radius (c0) </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.bodyRadius}
                    onChange={e => handleFpconChange('bodyRadius', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Sections (NSECT)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.nsect}
                    onChange={e => handleFpconChange('nsect', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NCHANGE</label>
                  <input
                    type="number"
                    min="0"
                    max={fpconParams.nsect - 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fpconParams.nchange}
                    onChange={e => handleFpconChange('nchange', e.target.value)}
                    required
                  />
                </div>

                <div className="col-span-2 flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="clcd_conv"
                    checked={fpconParams.clcd_conv}
                    onChange={e => handleFpconChange('clcd_conv', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="clcd_conv" className="text-sm font-medium text-gray-700">
                    Require CL/CD Convergence
                  </label>
                </div>
                {fpconParams.nchange > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section numbers that differ (comma separated)
                    </label>
                    <input
                      type="text"
                      inputMode='text'
                      pattern='.*'
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 2,3,4"
                      value={fpconParams.changeSections.join(',')}
                      onChange={e => handleFpconChange('changeSections', e.target.value)}
                      required={fpconParams.nchange > 0}
                    />
                  </div>
                )}
              </div>
              {/* Dynamic Section Inputs */}
              <div>
                <h3 className="text-md font-semibold text-blue-600 mb-2">Section Data (for each section)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-2 py-1 text-xs font-bold text-gray-700">Section</th>
                        <th className="px-2 py-1 text-xs font-bold text-gray-700">Etas</th>
                        <th className="px-2 py-1 text-xs font-bold text-gray-700">HSECT</th>
                        <th className="px-2 py-1 text-xs font-bold text-gray-700">XTWSEC</th>
                        <th className="px-2 py-1 text-xs font-bold text-gray-700">TWSIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: fpconParams.nsect }, (_, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1 text-xs text-gray-700 font-semibold text-center">{idx + 1}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              className="w-20 px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={fpconParams.etas[idx] || ''}
                              onChange={e => handleFpconChange('etas', e.target.value, idx)}
                              required
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-20 px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={fpconParams.hsect[idx] || ''}
                              onChange={e => handleFpconChange('hsect', e.target.value, idx)}
                              required
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-20 px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={fpconParams.xtwsec[idx] || ''}
                              onChange={e => handleFpconChange('xtwsec', e.target.value, idx)}
                              required
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-20 px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={fpconParams.twsin[idx] || ''}
                              onChange={e => handleFpconChange('twsin', e.target.value, idx)}
                              required
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Files</label>
                <input
                  type="file"
                  multiple
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={e => handleFpconChange('files', e.target.files)}
                />
              </div>
              {/* Submit Button */}
              <div className="flex justify-center gap-4 mt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                  disabled={!!fpconDownloadUrl}

                >
                  Submit
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-all duration-200"
                  onClick={() => { setFpconOpen(false); setFpconDownloadUrl(null); }}
                >
                  Cancel
                </button>
              </div>

              {fpconDownloadUrl && (
                <div className="flex justify-center mt-4">
                  <a
                    href={fpconDownloadUrl}
                    download="VFP_Input_Files.zip"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                    onClick={() => { setFpconOpen(false); setFpconDownloadUrl(null); }}
                  >
                    Download VFP Input Files
                  </a>
                </div>
              )}

            </form>
          </div>
        </div>
      )}



      <div className="flex flex-1 overflow-hidden relative h-full w-full">
        {/* Side Panel */}
        <div
          className={`bg-white border-r border-blue-200 transition-all duration-300 absolute top-0 left-0 h-full z-10 ${isSidePanelOpen ? '' : 'w-0'} overflow-auto`}
          style={{ width: isSidePanelOpen ? `${sidePanelWidth}px` : '0px', minWidth: isSidePanelOpen ? `${sidePanelWidth}px` : '0px' }}
        >
          <div className="h-full flex flex-col">
            {/* Wing Specifications */}
            <div className="p-4 border-b border-blue-200 bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Wing Specifications</h3>
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
            {/* Improve Panel */}
            <div className="p-4 border-b border-blue-200 bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Improve Sections</h3>
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
                <div className="text-center mb-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="font-mono text-xs text-gray-600 font-medium">(y = ax² + bx + c)</span>
                </div>
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
            {/* Controls Panel */}
            <div className="p-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Controls</h3>
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-600 rounded-md">
                <h3 className="text-sm font-semibold text-blue-700 text-center">
                  {getSelectionInfo()}
                </h3>
              </div>
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
          {/* Resize Handle */}
          {isSidePanelOpen && (
            <div
              ref={resizeRef}
              className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors duration-200 ${isResizing ? 'bg-blue-400' : 'bg-blue-200'}`}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>

        {/* Main Plot Canvas */}
        <div
          className="flex-1 flex flex-col relative h-full"
          style={{
            marginLeft: isSidePanelOpen ? `${sidePanelWidth}px` : '0px',
            marginRight: '320px',
            transition: 'margin-left 0.3s, margin-right 0.3s',
            height: '100%',
            minHeight: 0,
          }}
        >
          <div className="flex-1 flex flex-col bg-blue-50 h-full min-h-0">
            <div className="flex-1 min-h-0">
              {selectedGeoFile ? (
                <Plot3D
                  plotData={plot3DTrace()}
                  selectedSection={selectedSection}
                  layout={{
                    ...get3DPlotLayout(),
                    paper_bgcolor: '#f9fafb',
                    plot_bgcolor: '#f9fafb'
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full bg-blue-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-blue-400 mb-3">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">Import a GEO file to display plots</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0">
              {geoFiles.length > 0 && visible2DFiles.length > 0 && (
                <Plot2D
                  plotData={plot2DTrace()}
                  selectedSection={selectedSection}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Plot Options Panel */}
        <div
          className="bg-white border-l border-blue-200 flex flex-col overflow-y-auto absolute top-0 right-0 h-full z-10"
          style={{ width: '320px', minWidth: '320px' }}
        >
          <div className="p-4 border-b border-blue-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Plot Options</h3>
            {geoFiles.length > 0 && (
              <div className="space-y-6">
                {/* 3D Plot File Selection */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="geo-file-select" className="font-medium text-gray-700 text-sm">
                    <span className="inline-block mb-1">3D Plot File:</span>
                  </label>
                  <select
                    id="geo-file-select"
                    onChange={handleGeoFileSelection}
                    value={selectedGeoFile?.id || ''}
                    className="px-3 py-2 border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm shadow-sm"
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
                  <div className="flex flex-col gap-2">
                    <label htmlFor="section-select" className="font-medium text-gray-700 text-sm">
                      <span className="inline-block mb-1">Section:</span>
                    </label>
                    <select
                      id="section-select"
                      onChange={handleSectionChange}
                      value={selectedSection}
                      className="px-3 py-2 border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm shadow-sm"
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
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planformView}
                        onChange={handlePlanformToggle}
                        className="sr-only"
                      />
                      <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${planformView ? 'bg-blue-600' : 'bg-gray-300'
                        } ${selectedSection !== -1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${planformView ? 'transform translate-x-6' : ''
                          }`} />
                      </div>
                      <span className={`ml-3 text-sm font-medium ${selectedSection !== -1 ? 'text-gray-400' : 'text-gray-700'} whitespace-nowrap`}>
                        Planform View
                      </span>
                    </label>
                  </div>
                )}
                {/* 2D Plot File Visibility Controls */}
                <div className="flex flex-col gap-2 mt-2">
                  <label className="font-medium text-gray-700 text-sm mb-1">2D Plot Files:</label>
                  <div className="flex flex-wrap gap-2">
                    {geoFiles.map(file => (
                      <label key={file.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={visible2DFiles.includes(file.id)}
                          onChange={() => handle2DVisibilityToggle(file.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: file.color.primary }}
                        >
                          {file.name}
                          {file.selectedSection >= 0 && <span className="ml-1 text-xs text-gray-500">({`S${file.selectedSection + 1}`})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* 2D Plot Type Selection */}
                <div className="flex flex-col gap-2 mt-2">
                  <label className="font-medium text-gray-700 text-sm mb-1">Plot Type:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="section"
                        checked={selected2DPlot === "section"}
                        onChange={() => setSelected2DPlot("section")}
                        disabled={!geoFiles.some(file => visible2DFiles.includes(file.id) && file.selectedSection >= 0)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Section 2D</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="twist"
                        checked={selected2DPlot === "twist"}
                        onChange={() => setSelected2DPlot("twist")}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Twist</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="plot2d"
                        value="dihedral"
                        checked={selected2DPlot === "dihedral"}
                        onChange={() => setSelected2DPlot("dihedral")}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Dihedral</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );


}

export default GeometryModule;
import { useState, useEffect } from "react";
import { useContext } from "react";
import FormDataContext from "../FormDataContext";
import { useNavigate } from "react-router-dom";
import "./runSolver.css";
import DragNDrop from "./DragNDrop";

function RunSolver() {
  const [simName, setsimName] = useState("");
  const [mach, setMach] = useState("");
  const [aoa, setAoA] = useState("");
  const [alpha0, setA0] = useState("");
  const [alphaN, setAN] = useState("");
  const [dalpha, setdalpha] = useState("");
  const [reynolds, setReynolds] = useState("");
  const [dumpName, setDumpName] = useState("");
  const [continuation, setContinuation] = useState(false);
  const [dump, setDump] = useState(false);
  const [excrescence, setExcrescence] = useState(false);
  const [autoRunner, setAutoRunner] = useState(false);
  const [mapImported, setMapImported] = useState(false);
  const [geoImported, setGeoImported] = useState(false);
  const [datImported, setDatImported] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Add state for storing actual filenames
  const [mapFileName, setMapFileName] = useState("");
  const [geoFileName, setGeoFileName] = useState("");
  const [datFileName, setDatFileName] = useState("");

  const { setFormData } = useContext(FormDataContext);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const formData = new FormData();

      // Append text fields
      formData.append("mach", mach);
      formData.append("aoa", aoa);
      formData.append("alpha0", alpha0);
      formData.append("dalpha", dalpha);
      formData.append("alphaN", alphaN);
      formData.append("reynolds", reynolds);
      formData.append("continuation", continuation);
      formData.append("dump", dump);
      formData.append("dumpName", dumpName);
      formData.append("excrescence", excrescence);
      formData.append("autoRunner", autoRunner);
      formData.append("mapImported", mapImported);
      formData.append("geoImported", geoImported);
      formData.append("datImported", datImported);
      formData.append("simName", simName);

      // Append actual filenames
      formData.append("mapFile", mapFileName);
      formData.append("geoFile", geoFileName);
      formData.append("datFile", datFileName);

      // Append files
      selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      setFormData(formData);

      const response = await fetch("http://127.0.1:5000/start-vfp", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Server Response:", result);
      navigate("/results", { state: { result } });
      console.log("Form Data Submitted:", { selectedFiles, mach, aoa, reynolds, continuation, excrescence });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  // Update checkboxes and filenames based on selected files
  useEffect(() => {
    const mapFile = selectedFiles.find(file => file.name.endsWith(".map"));
    const geoFile = selectedFiles.find(file => file.name.endsWith(".GEO"));
    const datFile = selectedFiles.find(file => file.name.endsWith(".dat"));

    // Update boolean states
    setMapImported(!!mapFile);
    setGeoImported(!!geoFile);
    setDatImported(!!datFile);

    // Update filename states
    setMapFileName(mapFile ? mapFile.name : "");
    setGeoFileName(geoFile ? geoFile.name : "");
    setDatFileName(datFile ? datFile.name : "");

    console.log("Updated filenames:", {
      map: mapFile ? mapFile.name : "none",
      geo: geoFile ? geoFile.name : "none",
      dat: datFile ? datFile.name : "none"
    });
  }, [selectedFiles]);

  return (
    <div className="solver-container">
      {/* Header Section */}
      <div className="solver-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate("/")}>
              <span className="arrow-left"></span>
              Back to Main Module
            </button>
          </div>
          <div className="header-center">
            <h1 className="page-title">Flow Conditions and Solver Parameters</h1>
          </div>
          <div className="header-right">
            {/* Empty div for balance */}
          </div>
        </div>
      </div>
      <div className="solver-content">
        {/* File Upload Panel */}
        <div className="upload-panel">
          <div className="panel-header">
            <h2>File Import</h2>
            <div className="header-line"></div>
          </div>

          <div className="drag-drop-wrapper">
            <DragNDrop onFilesSelected={setSelectedFiles} width="100%" />
          </div>

          <div className="file-status">
            <div className="status-grid">
              <div className={`status-item ${geoImported ? 'imported' : ''}`}>
                <div className="status-icon">
                  {geoImported ? '✓' : '○'}
                </div>
                <div className="status-content">
                  <span className="status-label">GEO File</span>
                  {geoFileName && <span className="filename">{geoFileName}</span>}
                </div>
              </div>

              <div className={`status-item ${mapImported ? 'imported' : ''}`}>
                <div className="status-icon">
                  {mapImported ? '✓' : '○'}
                </div>
                <div className="status-content">
                  <span className="status-label">MAP File</span>
                  {mapFileName && <span className="filename">{mapFileName}</span>}
                </div>
              </div>

              <div className={`status-item ${datImported ? 'imported' : ''}`}>
                <div className="status-icon">
                  {datImported ? '✓' : '○'}
                </div>
                <div className="status-content">
                  <span className="status-label">DAT File</span>
                  {datFileName && <span className="filename">{datFileName}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parameters Panel */}
        <div className="parameters-panel">
          <div className="panel-header">
            <h2>Solver Configuration</h2>
            <div className="header-line"></div>
          </div>

          <div className="parameters-content">
            {/* Basic Parameters */}
            <div className="parameter-section">
              <h3>Basic Parameters</h3>
              <div className="input-grid">
                <div className="input-field">
                  <label>Simulation Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setsimName(e.target.value)}
                    placeholder="Enter simulation name"
                  />
                </div>

                <div className="input-field">
                  <label>Mach Number</label>
                  <input
                    type="number"
                    value={mach}
                    onChange={(e) => setMach(e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                  />
                </div>

                <div className="input-field">
                  <label>Angle of Attack (°)</label>
                  <input
                    type="number"
                    value={aoa}
                    onChange={(e) => setAoA(e.target.value)}
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>

                <div className="input-field">
                  <label>Reynolds Number</label>
                  <input
                    type="number"
                    value={reynolds}
                    onChange={(e) => setReynolds(e.target.value)}
                    placeholder="1000000"
                    step="1000"
                  />
                </div>

                <div className="input-field full-width">
                  <label>Dump File Name <span className="optional">(For Continuation Runs Only)</span></label>
                  <input
                    type="text"
                    value={dumpName}
                    onChange={(e) => setDumpName(e.target.value)}
                    placeholder="Enter dump file name"
                  />
                </div>
              </div>
            </div>

            {/* Run Options */}
            <div className="parameter-section">
              <h3>Run Options</h3>
              <div className="checkbox-grid">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={excrescence}
                    onChange={() => {
                      setExcrescence(!excrescence);
                      console.log("Excrescence Run:", !excrescence)
                    }}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Excrescence Run</span>
                </label>

                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={continuation}
                    onChange={() => {
                      setContinuation(!continuation);
                      console.log("Continuation Run:", !continuation)
                    }}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Continuation Run</span>
                </label>

                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={autoRunner}
                    onChange={() => setAutoRunner(!autoRunner)}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Auto-Runner</span>
                </label>
              </div>
            </div>

            {/* Auto-Runner Options */}
            {autoRunner && (
              <div className="parameter-section auto-runner-section">
                <h3>Auto-Runner Configuration</h3>
                <div className="auto-runner-content">
                  <div className="auto-runner-inputs">
                    <div className="input-field">
                      <label>Step Size (°)</label>
                      <input
                        type="number"
                        value={dalpha}
                        onChange={(e) => setdalpha(e.target.value)}
                        placeholder="1.0"
                        step="0.1"
                      />
                    </div>

                    <div className="input-field">
                      <label>End Angle of Attack (°)</label>
                      <input
                        type="number"
                        value={alphaN}
                        onChange={(e) => setAN(e.target.value)}
                        placeholder="10.0"
                        step="0.1"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}


            {continuation && (
              <label className="checkbox-container continuation-option">
                <input
                  type="checkbox"
                  checked={dump}
                  onChange={() => setDump(!dump)}
                />
                <span className="checkmark"></span>
                <span className="checkbox-label">Continuation run at same Mach and alpha</span>
              </label>
            )}

            {/* Submit Button */}
            <div className="submit-section">
              <button className="start-button" onClick={handleSubmit}>
                <span className="button-icon">🚀</span>
                <span className="button-text">Start VFP Simulation</span>
                <span className="button-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunSolver;
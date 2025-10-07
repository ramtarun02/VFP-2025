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

      setFormData(formData); // ✅ Save formData in context

      const response = await fetch("http://127.0.1:5000/start-vfp", {
        method: "POST",
        body: formData, // No need for headers; browser sets `multipart/form-data
      });

      const result = await response.json();
      console.log("Server Response:", result);
      navigate("/results", { state: { result } }); // ✅ Navigate to results page with response
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
    <div className="container">
      <div className="top-panel">
        <button className="back-button" onClick={() => navigate("/")}>Back to Main Module</button>

        <div className="drag-drop-container">
          <DragNDrop onFilesSelected={setSelectedFiles} width="100%" />
        </div>

        <div className="checkbox-group-1">
          <label>
            <input type="checkbox" checked={geoImported} readOnly />
            GEO Imported {geoFileName && `(${geoFileName})`}
          </label>
          <label>
            <input type="checkbox" checked={mapImported} readOnly />
            MAP Imported {mapFileName && `(${mapFileName})`}
          </label>
          <label>
            <input type="checkbox" checked={datImported} readOnly />
            DAT Imported {datFileName && `(${datFileName})`}
          </label>
        </div>
      </div>

      <div className="title-solver">Flow Conditions and Solver Parameters</div>

      <div className="card">
        <div className="input-group">
          <label>Simulation Name</label>
          <input value={simName} onChange={(e) => setsimName(e.target.value)} />

          <label>Mach Number</label>
          <input value={mach} onChange={(e) => setMach(e.target.value)} />

          <label>Angle of Attack</label>
          <input value={aoa} onChange={(e) => setAoA(e.target.value)} />

          <label>Reynolds Number</label>
          <input value={reynolds} onChange={(e) => setReynolds(e.target.value)} />

          <label>Dump File Name (Only For Continuation Runs)</label>
          <input value={dumpName} onChange={(e) => setDumpName(e.target.value)} />
        </div>

        <div className="checkbox-group-2">
          <label>
            <input type="checkbox" checked={excrescence} onChange={() => { setExcrescence(!excrescence); console.log("Excrescence Run:", !excrescence) }} />
            Excrescence Run
          </label>

          <label>
            <input type="checkbox" checked={continuation} onChange={() => { setContinuation(!continuation); console.log("Continuation Run:", !continuation) }} />
            Continuation Run
          </label>

          <label>
            <input type="checkbox" checked={autoRunner} onChange={() => setAutoRunner(!autoRunner)} />
            Auto-Runner
          </label>
        </div>

        {autoRunner && (
          <div className="cont-opts">
            <div className="cont-opts-alpha">
              <div className="alpha-group">
                <label>Step</label>
                <input value={dalpha} onChange={(e) => setdalpha(e.target.value)} />
              </div>

              <div className="alpha-group">
                <label>End Angle of Attack</label>
                <input value={alphaN} onChange={(e) => setAN(e.target.value)} />
              </div>
            </div>

            <div>
              <input type="checkbox" className="dump-checkbox" onChange={() => { setDump(!dump) }} />
              Is this a continuation run at the same Mach and alpha
            </div>
          </div>
        )}

        <div className="button-group">
          <button className="run-button" onClick={handleSubmit}><span>Start VFP </span></button>
        </div>
      </div>
    </div>
  );
}

export default RunSolver;
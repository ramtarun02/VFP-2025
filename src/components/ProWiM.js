import React, { useState,  useEffect } from "react";
import "./ProWiM.css";
import Prowim3Dmodel from "./Prowim3Dmodel";
import { useNavigate } from "react-router-dom";


function computeKS0D(CL0, CD0, A) {
  if (!A || !CL0 || !CD0) return "";
  const pi = Math.PI;
  try {
    return (
      1 -
      Math.sqrt(
        ((2 * CL0) / (pi * A)) ** 2 +
          (1 - (2 * CD0) / (pi * A)) ** 2
      )
    ).toFixed(5);
  } catch {
    return "";
  }
}

function PropellerWingForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    A: "",
    bOverD: "6",
    cOverD: "",
    alpha0: "",
    N: "",
    NSPSW: "",
    ZPD: "",
    IW: "",
    NELMNT: "0",
    CTIP: "0.3",
    NAW: "1",
    ALFAWI: ["0"],
    CL0: ["0.5"],
    CD0: ["0.02"],
    KS00: ["0.1"],
    propLocation: "5",
    D: "3"
  });

   // Compute KS00 whenever A, CL0, or CD0 changes
  useEffect(() => {
    const A = parseFloat(formData.A);
    const CL0 = parseFloat(formData.CL0[0]);
    const CD0 = parseFloat(formData.CD0[0]);
    const ks00 = computeKS0D(CL0, CD0, A);
    setFormData((prev) => ({
      ...prev,
      KS00: [ks00]
    }));
  }, [formData.A, formData.CL0, formData.CD0]);

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["CL0", "CD0", "KS00", "ALFAWI"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: [value] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.1:5000/prowim-compute", {
        method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to fetch results from server");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="prowim-container">


      <div className="model-viewer">
        <Prowim3Dmodel
        bOverD={parseFloat(formData.bOverD)}
        cOverD={parseFloat(formData.cOverD)}
        D={parseFloat(formData.D)}
        propLocation={parseFloat(formData.propLocation)}
      />


      </div>
     {/* <div className="model-viewer"> */}
     {/*    <p>3D Model of Propeller Wing</p> */}
     {/*  </div> */}


      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {[
            { label: "Wing Aspect Ratio (A)", name: "A" },
            { label: "b / D", name: "bOverD" },
            { label: "c / D", name: "cOverD" },
            { label: "Angle of attack at zero lift (α₀) [deg]", name: "alpha0" },
            { label: "Total number of propellers (N)", name: "N" },
            { label: "NSPSW", name: "NSPSW" },
            { label: "ZPD", name: "ZPD" },
            { label: "IW [deg]", name: "IW" },
            { label: "Thrust Coefficient (CTIP)", name: "CTIP" },
            { label: "ALFAWI [deg]", name: "ALFAWI" },
            { label: "CL0", name: "CL0" },
            { label: "CD0", name: "CD0" },
            { label: "KS00", name: "KS00" },
            { label: "Propeller Location along Wing Span (y/b)", name: "propLocation" },
            { label: "Propeller Diameter (D) [m]", name: "D" }
          ].map(({ label, name }) => (
            <div key={name}>
              <label>{label}</label>
              <input
                type="number"
                step="any"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                required
              />
            </div>
          ))}

          <label>Number of flap elements (NELMNT)</label>
          <select name="NELMNT" value={formData.NELMNT} onChange={handleChange}>
            <option value="0">Flaps Up</option>
            <option value="1">Single Flap</option>
            <option value="2">Double Flaps</option>
          </select>
          
          <button type="submit">Compute</button>

          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Main Module</button>
        </form>

        {result && (
          <div className="results">
            <div>
              <label>CL_Prop</label>
              <input 
                type="text" 
                value={result.CZD.toFixed(5)} 
                readOnly 
              />
            </div>
            <div>
              <label>CD_Prop</label>
              <input 
                type="text" 
                value={result.CXD.toFixed(5)} 
                readOnly 
              />
            </div>
 {/*            <div> */}
 {/*              <label>CZDwf</label> */}
 {/*              <input  */}
 {/*                type="text"  */}
 {/*                value={result.CZDwf.toFixed(5)}  */}
 {/*                readOnly  */}
 {/*              /> */}
 {/*            </div> */}
 {/*            <div> */}
 {/*              <label>CX</label> */}
 {/*              <input  */}
 {/*                type="text"  */}
 {/*                value={result.CX.toFixed(5)}  */}
 {/*                readOnly  */}
 {/*              /> */}
 {/*            </div> */}
 {/*            <div> */}
 {/*              <label>CXwf</label> */}
 {/*              <input  */}
 {/*                type="text"  */}
 {/*                value={result.CXwf.toFixed(5)}  */}
 {/*                readOnly  */}
 {/*              /> */}
 {/*            </div> */}
 {/*            <div> */}
 {/*              <label>CXDwf</label> */}
 {/*              <input  */}
 {/*                type="text"  */}
 {/*                value={result.CXDwf.toFixed(5)}  */}
 {/*                readOnly  */}
 {/*              /> */}
 {/*            </div> */}
 {/*  */}



          </div>
        )}
     </div>
    </div>
  );
}

export default PropellerWingForm;


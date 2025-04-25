import React, { useState } from "react";
import "./ProWiM.css";

function compute_KS0D(CL0, CD0, A) {
  return 1 - Math.sqrt(((2 * CL0) / (Math.PI * A)) ** 2 + (1 - (2 * CD0) / (Math.PI * A)) ** 2);
}

function compute_TS0D(CL0, CD0, A) {
  return (Math.atan((2 * CL0 / (Math.PI * A)) / (1 - (2 * CD0 / (Math.PI * A)))) * 180) / Math.PI;
}

function PropellerWingForm() {
  const [formData, setFormData] = useState({
    A: "",
    bOverD: "",
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
    KS00: ["0.1"]
  });

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["CL0", "CD0", "KS00", "ALFAWI"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: [value] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    const A = parseFloat(data.A);
    const ZPD = parseFloat(data.ZPD);
    const alpha0 = parseFloat(data.alpha0);
    const IW = parseFloat(data.IW);
    const N = parseFloat(data.N);
    const bOverD = parseFloat(data.bOverD);
    const NSPSW = parseFloat(data.NSPSW);

    const CT = parseFloat(data.CTIP);
    const CL0 = parseFloat(data.CL0[0]);
    const CD0 = parseFloat(data.CD0[0]);
    const KS00 = parseFloat(data.KS00[0]);
    const ALFAWI = parseFloat(data.ALFAWI[0]);

    const KS0D = compute_KS0D(CL0, CD0, A);
    const TS0D = compute_TS0D(CL0, CD0, A);

    const Hzp = 1 - 2.5 * Math.abs(ZPD);
    const Kdc = 0.87;
    const Izp = 1;
    const TS0Ap0_1d = -2 * Kdc * alpha0;
    const TS10 = Hzp * TS0Ap0_1d + 1.15 * Kdc * Izp * IW + (ALFAWI - IW);
    const exponent = 1.36;
    const theta_s = TS0D + (CT + 0.3 * Math.sin((Math.PI * CT ** exponent))) * (TS10 - TS0D);
    const ks = KS0D + CT * (KS00 - KS0D);
    const r = Math.sqrt(1 - CT);

    const CZ =
      (1 + r) * (1 - ks) * Math.sin((Math.PI / 180) * theta_s) +
      ((2 / N) * bOverD ** 2 - (1 + r)) * r ** 2 * (1 - KS00 * Math.sin((Math.PI / 180) * TS0D));
    const alpha_p = ALFAWI - alpha0;
    const CZwf = CZ - CT * Math.sin((Math.PI / 180) * alpha_p);
    const CZDwf = CZwf * NSPSW / (1 - CT);

    const CX =
      (1 + r) * ((1 - ks) * Math.cos((Math.PI / 180) * theta_s) - r) +
      ((2 / N) * bOverD ** 2 - (1 + r)) * r ** 2 * ((1 - KS00) * Math.cos((Math.PI / 180) * TS0D) - 1);

    setResult({ CZ, CZwf, CZDwf, CX });
  };

  return (
    <div className="prowim-container">
      <div className="model-viewer">
        <p>3D Model of Propeller Wing</p>
      </div>

      <div className="form-container">
        <h2>Propeller Wing Module</h2>
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
          ].map(({ label, name }) => (
            <div key={name}>
              <label>{label}</label>
              <input type="number" step="any" name={name} value={formData[name]} onChange={handleChange} required />
            </div>
          ))}

          <label>Number of flap elements (NELMNT)</label>
          <select name="NELMNT" value={formData.NELMNT} onChange={handleChange}>
            <option value="0">Flaps Up</option>
            <option value="1">Single Flap</option>
            <option value="2">Double Flaps</option>
          </select>

          <button type="submit">Compute</button>
        </form>

        {result && (
          <div className="results">
            <h3>Results</h3>
            <p>CZ: {result.CZ.toFixed(3)}</p>
            <p>CZwf: {result.CZwf.toFixed(3)}</p>
            <p>CZDwf: {result.CZDwf.toFixed(3)}</p>
            <p>CX: {result.CX.toFixed(3)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropellerWingForm;


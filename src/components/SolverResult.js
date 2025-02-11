import { useLocation, useNavigate } from "react-router-dom";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state; // ✅ Extract data

  if (!result) {
    return <h2>No Data Received</h2>; // ❌ If no data, show error
  }

  return (
    <div>
      <h1>Simulation Results</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre> {/* ✅ Display data */}
      <button onClick={() => navigate("/run-solver")}>Back to Form</button>
    </div>
  );
};

export default ResultsPage;


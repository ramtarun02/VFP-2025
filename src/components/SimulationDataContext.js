import React, { createContext, useContext, useState } from "react";

const SimulationDataContext = createContext();

export function SimulationDataProvider({ children }) {
    const [simulationData, setSimulationData] = useState(null);
    return (
        <SimulationDataContext.Provider value={{ simulationData, setSimulationData }}>
            {children}
        </SimulationDataContext.Provider>
    );
}

export function useSimulationData() {
    return useContext(SimulationDataContext);
}
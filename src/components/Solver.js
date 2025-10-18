import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Results = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result || {};
    const userInputs = result.user_inputs || {};

    const handleRunSimulation = () => {
        navigate("/simulation-run", { state: { result } });
    };

    // Configuration parameters for display
    const basicParams = [
        { label: "Simulation Name", key: "simName", type: "text" },
        { label: "Mach Number", key: "mach", type: "number" },
        { label: "Angle of Attack (°)", key: "aoa", type: "number" },
        { label: "Reynolds Number", key: "reynolds", type: "number" },
    ];

    // Helper function to safely get boolean values
    const getBooleanValue = (key) => {
        const value = userInputs[key];
        return value === true || value === "true" || value === 'true';
    };

    // Helper function to safely get string values
    const getStringValue = (key) => {
        return userInputs[key] || '';
    };

    // Fixed key mappings based on actual data structure
    const runOptions = [
        { label: "Continuation Run", key: "Continuation Run" },
        { label: "Excrescence Run", key: "Excrescence Run" },
        { label: "Auto-Runner", key: "AutoRunner" },
    ];

    // Fixed file status mappings based on actual data structure
    const fileStatus = [
        { label: "MAP File", key: "Map File Imported", fileName: "file_2" },
        { label: "GEO File", key: "Geometry File Imported", fileName: "file_1" },
        { label: "DAT File", key: "Flow File Imported", fileName: "file_0" },
    ];

    const formatValue = (value, type) => {
        if (value === undefined || value === null || value === "") {
            return <span className="text-gray-400 italic">Not specified</span>;
        }

        if (type === "number") {
            return parseFloat(value).toLocaleString();
        }

        return value;
    };

    // Get uploaded files from the result object
    const uploadedFiles = result.uploaded_files || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
            {/* Header Section */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                                    Simulation Review
                                </h1>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate("/run-solver")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Setup
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic Parameters */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Flow Conditions */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Flow Conditions
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {basicParams.map((param) => (
                                        <div key={param.key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                                            <span className="font-medium text-gray-700">{param.label}</span>
                                            <span className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-1 rounded-md">
                                                {formatValue(userInputs[param.key], param.type)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Run Configuration */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Run Configuration
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-3">
                                    {runOptions.map((option) => {
                                        const isEnabled = getBooleanValue(option.key);
                                        return (
                                            <div key={option.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="font-medium text-gray-700">{option.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isEnabled
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-300 text-gray-600'
                                                        }`}>
                                                        {isEnabled ? '✓' : '○'}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isEnabled
                                                            ? 'text-green-700'
                                                            : 'text-gray-500'
                                                        }`}>
                                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Auto-Runner Additional Info */}
                                {getBooleanValue('AutoRunner') && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h3 className="text-sm font-semibold text-blue-800 mb-2">Auto-Runner Configuration</h3>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">Step Size:</span>
                                                <span className="font-mono text-blue-900">{getStringValue('dalpha') || 'Default'}°</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">End Angle:</span>
                                                <span className="font-mono text-blue-900">{getStringValue('alphaN') || 'Default'}°</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Continuation Additional Info */}
                                {getBooleanValue('Continuation Run') && getStringValue('dumpName') && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h3 className="text-sm font-semibold text-yellow-800 mb-2">Continuation Configuration</h3>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-yellow-700">Dump File:</span>
                                            <span className="font-mono text-yellow-900">{getStringValue('dumpName')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* File Status */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Input Files
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {fileStatus.map((file) => {
                                        const isImported = getBooleanValue(file.key);
                                        const fileName = uploadedFiles[file.fileName];

                                        return (
                                            <div key={file.key} className={`p-3 rounded-lg border-2 transition-all duration-200 ${isImported
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-gray-50 border-gray-200'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isImported
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-300 text-gray-600'
                                                        }`}>
                                                        {isImported ? '✓' : '○'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-800 text-sm">{file.label}</div>
                                                        {fileName && (
                                                            <div className="text-xs text-gray-600 font-mono truncate mt-1">
                                                                {fileName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Simulation Status */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Ready to Launch
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="text-center">
                                    <div className="mb-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600 text-sm">
                                            Configuration complete. Ready to start VFP simulation with the parameters above.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleRunSimulation}
                                        className="w-full group relative inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                                    >
                                        <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span>Start VFP Simulation</span>
                                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>

                                        {/* Animated background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Results;
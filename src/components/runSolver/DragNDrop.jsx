import React, { useEffect, useState } from "react";
import { AiOutlineCheckCircle, AiOutlineCloudUpload } from "react-icons/ai";
import { MdClear } from "react-icons/md";

const DragNDrop = ({
  onFilesSelected,
  width = "400px",
  height = "auto",
}) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const newFiles = Array.from(droppedFiles);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  useEffect(() => {
    onFilesSelected(files);
  }, [files, onFilesSelected]);

  return (
    <section
      className="bg-white border border-gray-200 rounded-2xl shadow-sm"
      style={{ width: width, height: height }}
    >
      <div
        className={`
          w-full p-6 flex flex-col items-center relative rounded-2xl cursor-pointer transition-all duration-300 ease-in-out
          ${isDragging || files.length > 0
            ? 'border-2 border-dashed border-green-400 bg-green-50'
            : 'border-2 border-dashed border-blue-400 bg-blue-50'
          }
          hover:border-blue-500 hover:bg-blue-100
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Upload Zone Elements */}
        <div className="flex flex-col gap-4 w-full">
          {/* Upload Info */}
          <div className="flex items-center justify-center mb-2">
            <AiOutlineCloudUpload className={`text-4xl mr-4 transition-colors duration-200 ${isDragging ? 'text-green-600' : 'text-blue-600'
              }`} />
            <div>
              <p className="font-bold text-gray-800 text-base leading-tight font-serif">
                {isDragging ? 'Drop files here!' : 'Drag and Drop VFP Input Files Here'}
              </p>
            </div>
          </div>

          {/* Browse Button */}
          <input
            type="file"
            hidden
            id="browse"
            onChange={handleFileChange}
            accept=".geo, .map, .dat"
            multiple
          />
          <label
            htmlFor="browse"
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg cursor-pointer font-serif font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 hover:shadow-md active:scale-95"
          >
            Browse files
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="w-full mt-4">
            <div className="flex flex-col gap-2 w-full max-h-40 overflow-auto custom-scrollbar">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate font-serif">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div
                    className="ml-3 cursor-pointer p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <MdClear className="text-lg text-gray-500 hover:text-red-600 transition-colors duration-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {files.length > 0 && (
          <div className="flex items-center mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <AiOutlineCheckCircle className="text-green-600 mr-2 text-lg" />
            <p className="text-sm font-bold text-green-700 font-serif">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </section>
  );
};

export default DragNDrop;
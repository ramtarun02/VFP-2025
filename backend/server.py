import os
from flask_cors import CORS
from flask import Flask, send_file, jsonify, request
import shutil


app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})


@app.route('/run-vfp', methods=['POST'])
def run_vfp():
    # Get form data
    mach = request.form.get("mach")
    aoa = request.form.get("aoa")
    reynolds = request.form.get("reynolds")
    continuation = request.form.get("continuation") == "true"
    excrescence = request.form.get("excrescence") == "true"
    autoRunner = request.form.get("autoRunner") == "true"
    mapImported = request.form.get("mapImported") == "true"
    geoImported = request.form.get("geoImported") == "true"
    datImported = request.form.get("datImported") == "true"
    simName = request.form.get("simName")


    # Create a directory to store uploaded files if it doesn't exist
    UPLOAD_FOLDER = simName
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Save uploaded files
    files_received = {}
    for file_key in request.files:
        file = request.files[file_key]
        if file.filename:  # Ensure file is uploaded
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)  # Save file
            files_received[file_key] = file.filename  # Store file names

    # Construct a response
    response = {
        "message": "VFP Run Successful! Here are your inputs:",
        "user_inputs": {
            "mach": mach,
            "aoa": aoa,
            "reynolds": reynolds,
            "continuation": continuation,
            "excrescence": excrescence,
            "autoRunner": autoRunner,
            "mapImported": mapImported,
            "geoImported": geoImported,
            "datImported": datImported,
            "simName": simName,
        },
        "uploaded_files": files_received  # Return saved file details
    }
    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True)

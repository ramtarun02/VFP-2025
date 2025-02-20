from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests
socketio = SocketIO(app, cors_allowed_origins="*")  # WebSocket Support

# Secret key for signing session cookies (required for Flask sessions)
app.secret_key = "your_secret_key_here"

@app.route('/start-vfp', methods=['POST'])
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

    # Store values in Flask session
    session["mach"] = mach
    session["aoa"] = aoa
    session["reynolds"] = reynolds

    # Create a directory to store uploaded files if it doesn't exist
    UPLOAD_FOLDER = simName
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Save uploaded files
    files_received = {}
    for file_key, file in request.files.items():
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
            "Continuation Run": continuation,
            "Excrescence Run": excrescence,
            "AutoRunner": autoRunner,
            "Map File Imported": mapImported,
            "Geometry File Imported": geoImported,
            "Flow File Imported": datImported,
            "simName": simName,
        },
        "uploaded_files": files_received  # Return saved file details
    }
    return jsonify(response)

# Endpoint to retrieve stored session values
@app.route('/get-vfp-data', methods=['GET'])
def get_vfp_data():
    return jsonify({
        "mach": session.get("mach"),
        "aoa": session.get("aoa"),
        "reynolds": session.get("reynolds")
    })

# WebSocket endpoint for VFP Simulation
@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', "WebSocket connection established")

@socketio.on('start_simulation')
def start_simulation():
    for i in range(1, 11):  # Simulate progress updates
        time.sleep(1)  # Simulating computation delay
        emit('message', f"Simulation progress: {i * 10}%")
    emit('message', "Simulation complete")

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=False, log_output=True)


from flask import Flask, request, jsonify, session, send_file
from flask_cors import CORS
from flask_session import Session
from flask_socketio import SocketIO, emit
import os
import shutil
import runVFP as run


app = Flask(__name__)
CORS(app)

# Secret key for signing session cookies (required for Flask sessions)
app.config['SECRET_KEY'] = 'mysecret'
app.config['SESSION_TYPE'] = 'filesystem'

# Initialize the session
Session(app)
# Change to manage_session=False to manually handle sessions
socketio = SocketIO(app, manage_session=True, cors_allowed_origins="*")


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

    # Create a directory to store uploaded files if it doesn't exist
    UPLOAD_FOLDER = simName
    UPLOAD_LOC = "./Simulations/"
    # Path
    path = os.path.join(UPLOAD_LOC, UPLOAD_FOLDER)
    os.makedirs(path, exist_ok=True)

    # Save uploaded files
    files_received = {}
    for file_key, file in request.files.items():
        if file.filename:  # Ensure file is uploaded
            file_path = os.path.join(path, file.filename)
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
        "uploaded_files": files_received,
    }
    return jsonify(response)


@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', "WebSocket connection established")


@socketio.on('start_simulation')
def start_simulation(data=None):
    if data and 'simName' in data:
        try: 

            # Retrieve the simulation name from the request
            sim_name = data['simName']

            if not sim_name:
                return jsonify({"error": "Simulation name not provided"}), 400

            sim_folder = os.path.join('./Simulations', sim_name)

            if not os.path.exists(sim_folder):
                return jsonify({"error": f"Simulation folder '{sim_folder}' not found"}), 404

            # Variables to store the filenames without extensions
            map_file = geo_file = dat_file = None

            # List all files in the simulation folder
            for filename in os.listdir(sim_folder):
                # Check file extensions
                if filename.endswith(".map"):
                    map_file = os.path.splitext(filename)[0]  # Remove extension
                elif filename.endswith(".GEO"):
                    geo_file = os.path.splitext(filename)[0]  # Remove extension
                elif filename.endswith(".dat"):
                    dat_file = os.path.splitext(filename)[0]  # Remove extension
            
            print(map_file, geo_file, dat_file)

            # If any file is missing, return an error
            if not map_file or not geo_file or not dat_file:
                return jsonify({"error": "Required files (.map, .GEO, .dat) are missing in the folder"}), 400
            
            # Extract boolean values and store as 'y' (true) or 'n' (false)
            con= 'y' if data.get("continuation", "false").lower() == "true" else 'n'
            exc = 'y' if data.get("excrescence", "false").lower() == "true" else 'n'
            
            print(exc, con)

            # Retrieve the simulation name directly from the received form data
            sim_name = data['simName']
            sim_folder = os.path.join("./Simulations/", sim_name)
            print(f"Simulation started for: {sim_name}")
            emit('message', f"Simulation started for {sim_name}")
            emit('message', run.copy_files_to_folder(sim_folder))

            run.create_batch_file(map_file, geo_file, dat_file, exc, con, sim_folder)

        except Exception as e:
            print(f"Error processing simulation data: {e}")
            emit('error', "Could not process simulation data")
    else:
        print("No simulation data provided or 'simName' missing")
        emit('error', "Simulation data missing required fields")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


@app.route('/download-zip', methods=['POST'])
def download_zip():
    try:
        # Extract form data from JSON request
        data = request.get_json()
        if not data or "simName" not in data:
            return jsonify({"error": "Simulation name is missing in the request"}), 400

        sim_name = data["simName"]
        zip_filename = f"{sim_name}.zip"
        zip_path = os.path.join("./", zip_filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(zip_path), exist_ok=True)

        # Create ZIP file from the simulation directory
        shutil.make_archive(zip_path.replace(".zip", ""), 'zip', f"./{sim_name}")

        if not os.path.exists(zip_path):
            return jsonify({"error": "Failed to create ZIP file"}), 500

        return send_file(zip_path, as_attachment=True)

    except Exception as e:
        print(f"Error creating ZIP file: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=False, log_output=True,
                 allow_unsafe_werkzeug=True)

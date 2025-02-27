from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import shutil
import subprocess
import runVFP as run
import zipfile

app = Flask(__name__)
CORS(app)

# # Secret key for signing session cookies (required for Flask sessions)
# app.config['SECRET_KEY'] = 'mysecret'
# app.config['SESSION_TYPE'] = 'filesystem'


# # Initialize the session
# Session(app)
# Change to manage_session=False to manually handle sessions
socketio = SocketIO(app, manage_session=True, cors_allowed_origins = '*')


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

@app.route("/download-zip", methods=['POST'])
def download_zip():
    try:
        # Ensure form data is present
        if 'simName' not in request.form:
            return jsonify({"error": "Missing simName in request."}), 400
        sim_name = request.form['simName']
        TEMP_ZIP_DIR = "./Simulations"
        sim_folder_path = os.path.join("./Simulations", sim_name)
        zip_file_path = os.path.join("./Simulations", f"{sim_name}.zip")
        # Check if simulation folder exists
        if not os.path.exists(sim_folder_path):
            return jsonify({"error": "Simulation folder not found."}), 404
        # Ensure temp directory exists
        os.makedirs(TEMP_ZIP_DIR, exist_ok=True)
        # Create a zip file using zipfile module
        with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(sim_folder_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, sim_folder_path)
                    zipf.write(file_path, arcname)
        # Send the file to the client
        return send_file(zip_file_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup temporary zip file after request completes
        if os.path.exists(zip_file_path):
            os.remove(zip_file_path)


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
            sim_folder = os.path.join("Simulations/", sim_name)
            print(f"Simulation started for: {sim_name}")

            script_dir = os.path.dirname(os.path.abspath(__file__))  # Get the current script's directory
            bat_file_path = os.path.join(script_dir, sim_folder, "run_vfp.bat")  # Adjust subdir name


            emit('message', f"Simulation started for {sim_name}")

            emit('message', run.copy_files_to_folder(sim_folder))

            try:
                run.create_batch_file(map_file, geo_file, dat_file, exc, con, sim_folder)
                emit('message', "Batch File Created Successfully. Attempting to Run the VFP.exe")

            except Exception as e:
                emit('message', f'Error: {str(e)}')



            # bat_file_path = os.path.join(sim_folder, "run_vfp.bat")


            try:
                # Execute the batch file and capture output in real-time
                process = subprocess.Popen(bat_file_path, shell= True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=os.path.dirname(bat_file_path))

                # Read and print output in real-time
                while True:
                    output = process.stdout.readline()
                    if output == "" and process.poll() is not None:
                        break
                    if output:
                        print(output.strip())
                        emit('message', output.strip())

                # Emit any error messages if necessary
                for line in iter(process.stderr.readline, ''):
                    emit('message', line.strip())

                # Wait for the process to finish
                process.stdout.close()
                process.stderr.close()
                process.wait()

                # Emit a final message once the batch file execution completes
                emit('message', 'Simulation completed successfully!')

            except Exception as e:
                emit('message',  f'Error: {str(e)}')

        except Exception as e:
            print(f"Error processing simulation data: {e}")
            emit('error', "Could not process simulation data")
    else:
        print("No simulation data provided or 'simName' missing")
        emit('error', "Simulation data missing required fields")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")



if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)


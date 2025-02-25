from flask import Flask, request, jsonify, session, send_file
from flask_cors import CORS
from flask_session import Session
from flask.sessions import SecureCookieSessionInterface
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
socketio = SocketIO(app, manage_session=False, cors_allowed_origins="*")


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
    session['simName'] = simName
    # Force the session to save
    session.modified = True

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
        "uploaded_files": files_received,
        "session_id": request.cookies.get('session')  # Return session ID for client to use
    }
    return jsonify(response)


@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', "WebSocket connection established")


@socketio.on('start_simulation')
def start_simulation(data=None):
    if data and 'session_id' in data:
        # Manually load the session with the provided session ID
        session_interface = SecureCookieSessionInterface()
        s = session_interface.get_signing_serializer(app)

        try:
            # Deserialize the session ID and get the session data
            session_data = s.loads(data['session_id'])
            # Use session data to retrieve specific variables
            sim_folder = session_data.get('simName')
            print(f"Retrieved simulation name from session: {sim_folder}")
            emit('message', f"Simulation started for {sim_folder}")
        except Exception as e:
            print(f"Error loading session: {e}")
            emit('error', "Could not load session data")
    else:
        print("No session ID provided")
        emit('error', "Session ID not provided")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


@app.route('/download-zip', methods=['GET'])
def download_zip():
    sim_name = session.get("simName")

    if not sim_name:
        return jsonify({"error": "Simulation name not found in session"}), 400

    zip_filename = f"{sim_name}.zip"
    zip_path = os.path.join("./", zip_filename)

    # Ensure directory exists
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)

    # Create ZIP file from the simulation directory
    shutil.make_archive(zip_path.replace(".zip", ""), 'zip', f"./{sim_name}")

    if not os.path.exists(zip_path):
        return jsonify({"error": "Failed to create ZIP file"}), 500

    return send_file(zip_path, as_attachment=True)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=False, log_output=True,
                 allow_unsafe_werkzeug=True)

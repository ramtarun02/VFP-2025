from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, emit
import os
import shutil
import signal
import subprocess
import runVFP as run
import readGEO as rG
import zipfile
import io
import math 
import numpy as np
import matplotlib.pyplot as plt


current_process = None
app = Flask(__name__)
CORS(app)

# Configure upload folder and allowed extensions
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)



def allowed_file(filename):
    """Check if the file has an allowed extension."""
    ALLOWED_EXTENSIONS = {'GEO'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
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

# @app.route("/download-zip", methods=['POST'])
# def download_zip():
#     try:
#         # Ensure form data is present
#         if 'simName' not in request.form:
#             return jsonify({"error": "Missing simName in request."}), 400
#         sim_name = request.form['simName']
#         TEMP_ZIP_DIR = "./Simulations"
#         sim_folder_path = os.path.join("./Simulations", sim_name)
#         zip_file_path = os.path.join("./Simulations", f"{sim_name}.zip")
#         # Check if simulation folder exists
#         if not os.path.exists(sim_folder_path):
#             return jsonify({"error": "Simulation folder not found."}), 404
#         # Ensure temp directory exists
#         os.makedirs(TEMP_ZIP_DIR, exist_ok=True)
#         # Create a zip file using zipfile module
#         with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
#             for root, _, files in os.walk(sim_folder_path):
#                 for file in files:
#                     file_path = os.path.join(root, file)
#                     arcname = os.path.relpath(file_path, sim_folder_path)
#                     zipf.write(file_path, arcname)
#         # Send the file to the client
#         return send_file(zip_file_path, as_attachment=True)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         # Cleanup temporary zip file after request completes
#         if os.path.exists(zip_file_path):
#             os.remove(zip_file_path)


@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', "WebSocket connection established")



current_process = None  # Global reference

def stream_process(command, cwd):
    global current_process
    try:
        current_process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=cwd)

        # Stream output line-by-line
        for line in iter(current_process.stdout.readline, ''):
            if line:
                clean_line = line.strip()
                print(clean_line)
                emit('message', clean_line)

        current_process.stdout.close()
        current_process.wait()
        emit('message', 'Simulation completed successfully!')

    except Exception as e:
        emit('message', f"Error during execution: {str(e)}")


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
                    # map_file = filename
                    map_file = os.path.splitext(filename)[0]  # Remove extension
                elif filename.endswith(".GEO"):
                    # geo_file = filename
                    geo_file = os.path.splitext(filename)[0]  # Remove extension
                elif filename.endswith(".dat"):
                    dat_file = filename
                    # dat_file = os.path.splitext(filename)[0]  # Remove extension
            

            dump_file = data['dumpName']
            print(map_file, geo_file, dat_file, dump_file)

            # If any file is missing, return an error
            if not map_file or not geo_file or not dat_file:
                return jsonify({"error": "Required files (.map, .GEO, .dat) are missing in the folder"}), 400
            
            # Extract boolean values and store as 'y' (true) or 'n' (false)
            con= 'y' if data.get("continuation", "false").lower() == "true" else 'n'
            auto= 'y' if data.get("autoRunner", "false").lower() == "true" else 'n'
            exc = 'y' if data.get("excrescence", "false").lower() == "true" else 'n'
            dump = 'y' if data.get("dump", "false").lower() == "true" else 'n'
            print(exc, con, dump)

            # Retrieve the simulation name directly from the received form data
            sim_name = data['simName']
            sim_folder = os.path.join("Simulations/", sim_name)
            print(f"Simulation started for: {sim_name}")

            script_dir = os.path.dirname(os.path.abspath(__file__))  # Get the current script's directory
            bat_file_path = os.path.join(script_dir, sim_folder, "run_vfp.bat")  # Adjust subdir name


            emit('message', f"Simulation started for {sim_name}")

            emit('message', run.copy_files_to_folder("./vfp-solver", sim_folder))
            run.copy_files_to_folder("./Python Utils", sim_folder)

             # Now use this function based on `con` value
            if auto == 'y':
                stream_process(["python", "VFP_Full_Process.py", dat_file, data["dalpha"], data["alphaN"], map_file, geo_file], sim_folder)
            else:
                stream_process(["python", "VFP_Full_Process.py", dat_file, "1", "1", map_file, geo_file], sim_folder)


        except Exception as e:
            print(f"Error processing simulation data: {e}")
            emit('error', "Could not process simulation data")
    else:
        print("No simulation data provided or 'simName' missing")
        emit('error', "Simulation data missing required fields")

@socketio.on('download')
def handle_download(data):
    SIMULATIONS_DIR = "./Simulations"
    try:
        sim_name = data.get('simName')
        if not sim_name:
            emit('message', "Error: Simulation name missing.")
            return

        sim_folder = os.path.join(SIMULATIONS_DIR, sim_name)
        if not os.path.exists(sim_folder):
            emit('message', f"Error: Simulation folder '{sim_name}' not found.")
            return

        # Create an in-memory zip file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(sim_folder):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, sim_folder)
                    zipf.write(file_path, arcname)

        zip_buffer.seek(0)  # Reset buffer position

        # Send the zip file as binary data
        emit('download_ready', {'simName': sim_name, 'fileData': zip_buffer.getvalue()})

    except Exception as e:
        emit('message', f"Error during download: {str(e)}")



@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

 





@app.route('/import-geo', methods=['POST'])
def import_geo():
    # Check if a file was uploaded
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']

    # # Check if the file has a valid name and extension
    # if file.filename == '':
    #     return jsonify({'error': 'No selected file'}), 400
    # if not allowed_file(file.filename):
    #     return jsonify({'error': 'Invalid file type. Only .GEO files are allowed.'}), 400

    # Save the file to the upload folder
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    print(file_path)

    try:
        # Pass the file to the readGEO function
        geo_data = rG.readGEO(file_path)
        import copy
        points = rG.airfoils(copy.deepcopy(geo_data))
        # Return the JSON response
        return jsonify({'geoData': geo_data, 'plotData': points}), 200

    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

    finally:
        # Clean up: Delete the uploaded file after processing
        if os.path.exists(file_path):
            os.remove(file_path)




def compute_KS0D(CL0, CD0, A):
    CL0 = np.array(CL0, dtype=float)
    CD0 = np.array(CD0, dtype=float)
    val = 1 - np.sqrt(((2 * CL0) / (math.pi * A)) ** 2 + (1 - (2 * CD0) / (math.pi * A)) ** 2)
    return np.round(val, 3)

def compute_TS0D(CL0, CD0, A):
    CL0 = np.array(CL0, dtype=float)
    CD0 = np.array(CD0, dtype=float)    
    val = np.degrees(np.arctan((2 * CL0 / (math.pi * A)) / (1 - (2 * CD0 / (math.pi * A)))))
    return np.round(val, 3)


@app.route("/prowim-compute", methods=["POST"])
def compute():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Invalid or missing JSON"}), 400

        print("Received data:", data)  # Debug log

        # Scalars
        A = float(data["A"])
        bOverD = float(data["bOverD"])
        cOverD = float(data["cOverD"])
        alpha0 = float(data["alpha0"])
        N = float(data["N"])
        NSPSW = float(data["NSPSW"])
        ZPD = float(data["ZPD"])
        IW = float(data["IW"])
        CT = float(data["CTIP"])
        NELMNT = float(data["NELMNT"])

        # Arrays - ensure they are lists
        CL0 = np.array(data["CL0"], dtype=float)
        CD0 = np.array(data["CD0"], dtype=float)
        KS00 = np.array(data["KS00"], dtype=float)
        ALFAWI = np.array(data["ALFAWI"], dtype=float)

        print(f"Array lengths - CL0: {len(CL0)}, CD0: {len(CD0)}, KS00: {len(KS00)}, ALFAWI: {len(ALFAWI)}")

        KS0D = compute_KS0D(CL0, CD0, A)
        TS0D = compute_TS0D(CL0, CD0, A)

        Hzp = round((1 - 2.5 * abs(ZPD)), 2)
        Kdc = round((-1.630 * cOverD ** 2 + 2.3727 * cOverD + 0.0038), 2)
        Izp = round((455.93 * ZPD ** 6 - 10.67 * ZPD**5 - 87.221 * ZPD**4 -
               3.2742 * ZPD**3 + 0.2309 * ZPD**2 + 0.0418 * ZPD + 1.0027))
        TS0Ap0_1d = -2 * Kdc * alpha0
        TS10 = Hzp * TS0Ap0_1d + 1.15 * Kdc * Izp * IW + (ALFAWI - IW)
        theta_s = TS0D + (CT + 0.3 * np.sin(math.pi * CT ** 1.36)) * (TS10 - TS0D)
        ks = KS0D + CT * (KS00 - KS0D)
        r = math.sqrt(1 - CT)

        theta_rad = np.radians(theta_s)
        TS0D_rad = np.radians(TS0D)
        alpha_p = ALFAWI - IW

        CZ = ((1 + r) * (1 - ks) * np.sin(theta_rad) +
              ((2 / N) * bOverD ** 2 - (1 + r)) * r ** 2 *
              (1 - KS00) * np.sin(TS0D_rad))

        CZwf = CZ - CT * np.sin(np.radians(alpha_p))
        CZDwf = CZwf * NSPSW / (1 - CT)
        CZD = CZ * NSPSW / (1 - CT)

        CX = ((1 + r) * ((1 - ks) * np.cos(theta_rad) - r) +
              ((2 / N) * bOverD ** 2 - (1 + r)) * r ** 2 *
              ((1 - KS00) * np.cos(TS0D_rad) - 1))

        CXwf = CX - CT * np.cos(np.radians(alpha_p))
        CXDwf = CXwf * NSPSW / (1 - CT)
        CXD = (CX * NSPSW / (1 - CT))

        # Prepare results as list of dicts - ensure all values are converted to Python types
        results = []
        for i in range(len(CL0)):
            result_item = {
                "KS0D": float(KS0D[i]) if isinstance(KS0D[i], np.floating) else float(KS0D[i]),
                "TS0D": float(TS0D[i]) if isinstance(TS0D[i], np.floating) else float(TS0D[i]),
                "theta_s": float(theta_s[i]) if isinstance(theta_s[i], np.floating) else float(theta_s[i]),
                "ks": float(ks[i]) if isinstance(ks[i], np.floating) else float(ks[i]),
                "CZ": float(CZ[i]) if isinstance(CZ[i], np.floating) else float(CZ[i]),
                "CZwf": float(CZwf[i]) if isinstance(CZwf[i], np.floating) else float(CZwf[i]),
                "CZDwf": float(CZDwf[i]) if isinstance(CZDwf[i], np.floating) else float(CZDwf[i]),
                "CZD": float(CZD[i]) if isinstance(CZD[i], np.floating) else float(CZD[i]),
                "CX": float(CX[i]) if isinstance(CX[i], np.floating) else float(CX[i]),
                "CXwf": float(CXwf[i]) if isinstance(CXwf[i], np.floating) else float(CXwf[i]),
                "CXDwf": float(CXDwf[i]) if isinstance(CXDwf[i], np.floating) else float(CXDwf[i]),
                "CXD": float(CXD[i]) if isinstance(CXD[i], np.floating) else float(CXD[i])
            }
            results.append(result_item)

        print(f"Computed {len(results)} results")
        print("Sample result:", results[0] if results else "No results")

        response = {"results": results}
        print("Sending response:", response)
        
        return jsonify(response)

    except Exception as e:
        print(f"Error in prowim-compute: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route('/compute_desired', methods=['POST'])
def compute_desired():
    data = request.get_json()
    section_index = data['sectionIndex']
    parameters = data['parameters']
    geo_data = data['geoData']
    plot_data = data['plotData']

    print(parameters)
    sec = section_index
    i = sec  # converting to 0-based index
    print(i)

    # Extract current section data
    current_section = geo_data[i]
    
    # Calculate current chord
    chord = current_section['G2SECT'] - current_section['G1SECT']

    # Parse upper and lower surface coordinates from [x, y] format to separate X and Z arrays
    current_section['XUS'] = [point[0] for point in current_section['US']]
    current_section['ZUS'] = [point[1] for point in current_section['US']]
    current_section['XLS'] = [point[0] for point in current_section['LS']]
    current_section['ZLS'] = [point[1] for point in current_section['LS']]
    
    
    # Extract new parameters
    nXLE = float(parameters['XLE'])
    ntwist = float(parameters['Twist'])
    dHSECT = float(parameters['Dihedral'])  # Default to current if not provided
    dchord = float(parameters['Chord'])
    dysect = float(parameters.get('YSECT', current_section['YSECT']))  # Default to current if not provided
    
    # Calculate differences and transformations
    # Assuming geo_data contains twist in degrees, convert difference to radians
    current_twist_deg = current_section['TWIST']  # Current twist in degrees
    dtwist = (ntwist - current_twist_deg) * (math.pi / 180)  # Difference in radians
    
    nHSECT = dHSECT - current_section['HSECT']
    scale = dchord / chord
    
    # Calculate XLE offset
    dXLE = nXLE - current_section['XUS'][0] - (current_section['XUS'][0] * (scale - 1))
    nZLE = current_section['ZUS'][0] * (scale - 1)

    ## Modify Section
    
    # Update twist if changed (round to 5 decimal places for comparison)
    if round(dtwist, 5) != 0:
        new_twist_deg = current_twist_deg + dtwist * (180 / math.pi)
        current_section['TWIST'] = new_twist_deg
    
    # Update HSECT if changed
    if round(nHSECT, 5) != 0:
        current_section['HSECT'] = dHSECT
    
    # Update YSECT if changed
    if round(dysect - current_section['YSECT'], 4) != 0:
        current_section['YSECT'] = dysect
    
    # Update chord if changed
    if round(dchord - chord, 5) != 0:
        current_section['CHORD'] = dchord
    
    # Update XLE if changed
    if round(dXLE, 4) != 0:
        current_section['XLE'] = nXLE

    # Transform upper surface coordinates (XUS, ZUS)
    if 'XUS_N' not in current_section:
        current_section['XUS_N'] = []
        current_section['ZUS_N'] = []
    
    current_section['XUS_N'] = []
    current_section['ZUS_N'] = []
    
    for n in range(len(current_section['XUS'])):
        x_us = current_section['XUS'][n]
        z_us = current_section['ZUS'][n]
        g1_sect = current_section['G1SECT']
        h_sect = current_section['HSECT']
        
        # Apply transformation: rotation + scaling + translation
        x_us_n = ((((x_us) * math.cos(-dtwist)) - ((z_us) * math.sin(-dtwist))) * scale) + dXLE
        
        z_us_n = ((((x_us) * math.sin(-dtwist)) + ((z_us) * math.cos(-dtwist))) * scale) + nZLE
        
        current_section['XUS_N'].append(x_us_n)
        current_section['ZUS_N'].append(z_us_n)


    # for n in range(len(current_section['XUS'])):
    #     x0 = current_section['XUS_N'][0]
    #     z0 = current_section['ZUS_N'][0]

    #     current_section['XUS_N'][n] -= x0
    #     current_section['ZUS_N'][n] -= z0

    # Transform lower surface coordinates (XLS, ZLS)
    if 'XLS_N' not in current_section:
        current_section['XLS_N'] = []
        current_section['ZLS_N'] = []
    
    current_section['XLS_N'] = []
    current_section['ZLS_N'] = []
    
    for n in range(len(current_section['XLS'])):

        x_ls = current_section['XLS'][n]
        z_ls = current_section['ZLS'][n]
        g1_sect = current_section['G1SECT']
        h_sect = current_section['HSECT']
        
        # Apply transformation: rotation + scaling + translation
        x_ls_n = ((((x_ls) * math.cos(-dtwist)) - ((z_ls) * math.sin(-dtwist))) * scale) + dXLE
        
        z_ls_n = ((((x_ls) * math.sin(-dtwist)) + ((z_ls) * math.cos(-dtwist))) * scale) - nZLE
        
        current_section['XLS_N'].append(x_ls_n)
        current_section['ZLS_N'].append(z_ls_n)

    # for n in range(len(current_section['XLS'])):
    #     x0 = current_section['XLS_N'][0]
    #     z0 = current_section['ZLS_N'][0]

    #     current_section['XLS_N'][n] -= x0
    #     current_section['ZLS_N'][n] -= z0


    # Generate updated plot data
    plot_data2 = rG.airfoils(geo_data)

    return jsonify({
        'updatedGeoData': geo_data,
        'updatedPlotData': plot_data2
    })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)


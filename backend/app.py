from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, emit
import os
import shutil
import signal
import subprocess
import tempfile
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


current_process = None  # Global reference

def stream_bat_process(bat_file_path, cwd, args=None):
    """Stream output from a .bat file execution with arguments"""
    global current_process
    try:
        # Ensure we're using the full path and proper command format
        if not os.path.isabs(bat_file_path):
            bat_file_path = os.path.abspath(bat_file_path)
        
        emit('message', f"Executing batch file: {bat_file_path}")
        emit('message', f"Working directory: {cwd}")
        
        # Build command with arguments
        if args:
            command = ['cmd', '/c', os.path.basename(bat_file_path)] + args
            emit('message', f"Arguments: {' '.join(args)}")
        else:
            command = ['cmd', '/c', os.path.basename(bat_file_path)]
        
        emit('message', f"Full command: {' '.join(command)}")
        
        current_process = subprocess.Popen(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT, 
            text=True, 
            cwd=cwd,
            shell=False
        )

        # Stream output line-by-line
        for line in iter(current_process.stdout.readline, ''):
            if line:
                clean_line = line.strip()
                print(clean_line)
                emit('message', clean_line)

        current_process.stdout.close()
        return_code = current_process.wait()
        
        if return_code == 0:
            emit('message', '[DONE] Solver Run Complete')
        else:
            emit('message', f'Solver completed with return code: {return_code}')
            emit('message', 'Check the batch file for syntax errors or missing dependencies')

    except Exception as e:
        emit('message', f"Error during BAT execution: {str(e)}")
        print(f"Full error details: {e}")

def stream_bat_process_alternative(bat_file_path, cwd, args=None):
    """Alternative method to stream batch file output with arguments"""
    global current_process
    try:
        # Change to the working directory first
        original_cwd = os.getcwd()
        os.chdir(cwd)
        
        emit('message', f"Changed to directory: {cwd}")
        emit('message', f"Executing: {os.path.basename(bat_file_path)}")
        
        # Build command with arguments
        if args:
            command = f"{os.path.basename(bat_file_path)} {' '.join(args)}"
            emit('message', f"Command with args: {command}")
        else:
            command = os.path.basename(bat_file_path)
        
        # Execute the batch file with arguments
        current_process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT, 
            text=True,
            shell=True
        )

        # Stream output line-by-line
        for line in iter(current_process.stdout.readline, ''):
            if line:
                clean_line = line.strip()
                print(clean_line)
                emit('message', clean_line)

        current_process.stdout.close()
        return_code = current_process.wait()
        
        if return_code == 0:
            emit('message', '[DONE] Solver Run Complete')
        else:
            emit('message', f'Solver completed with return code: {return_code}')

    except Exception as e:
        emit('message', f"Error during BAT execution: {str(e)}")
    finally:
        # Always change back to original directory
        os.chdir(original_cwd)

@socketio.on('start_simulation')
def start_simulation(data=None):
    if data and 'simName' in data:
        try: 
            # Retrieve the simulation name from the request
            sim_name = data['simName']

            if not sim_name:
                emit('error', "Simulation name not provided")
                return

            sim_folder = os.path.join('./Simulations', sim_name)

            if not os.path.exists(sim_folder):
                emit('error', f"Simulation folder '{sim_folder}' not found")
                return

            # Get specific file names from client data - use the correct keys
            map_filename = data.get('mapFile', '')
            geo_filename = data.get('geoFile', '')
            dat_filename = data.get('datFile', '')

            print(f"Client provided files: map={map_filename}, geo={geo_filename}, dat={dat_filename}")

            # Validate that file names are provided
            if not map_filename or not geo_filename or not dat_filename:
                emit('error', f"Missing file names. Received: map='{map_filename}', geo='{geo_filename}', dat='{dat_filename}'")
                return

            # Check if the specified files exist in the simulation folder
            map_file_path = os.path.join(sim_folder, map_filename)
            geo_file_path = os.path.join(sim_folder, geo_filename)
            dat_file_path = os.path.join(sim_folder, dat_filename)

            missing_files = []
            if not os.path.exists(map_file_path):
                missing_files.append(f"Map file: {map_filename}")
            if not os.path.exists(geo_file_path):
                missing_files.append(f"GEO file: {geo_filename}")
            if not os.path.exists(dat_file_path):
                missing_files.append(f"DAT file: {dat_filename}")

            if missing_files:
                emit('error', f"Missing files in simulation folder: {', '.join(missing_files)}")
                return

            emit('message', f"Found all required files: {map_filename}, {geo_filename}, {dat_filename}")

            # Remove file extensions for batch file arguments
            map_file = os.path.splitext(map_filename)[0]  # Remove extension
            geo_file = os.path.splitext(geo_filename)[0]  # Remove extension
            dat_file = os.path.splitext(dat_filename)[0]  # Remove extension

            # Extract boolean values and store as 'y' (true) or 'n' (false)
            con = data.get("continuation", "false").lower() == "true"
            auto = data.get("autoRunner", "false").lower() == "true"
            exc = data.get("excrescence", "false").lower() == "true"
            dump = data.get("dump", "false").lower() == "true"
            
            dump_file = data.get('dumpName', '')
            # Remove extension from dump file name if present
            if dump_file and '.' in dump_file:
                dump_file = os.path.splitext(dump_file)[0]

            print(f"Configuration: con={con}, auto={auto}, exc={exc}, dump={dump}")
            print(f"Files (without extensions): map={map_file}, geo={geo_file}, dat={dat_file}, dump={dump_file}")

            emit('message', f"Simulation started for {sim_name}")

            # Copy necessary files to simulation folder
            emit('message', run.copy_files_to_folder("./vfp-solver", sim_folder))
            run.copy_files_to_folder("./Python Utils", sim_folder)

            # Path to the batch file
            bat_file_path = os.path.join(sim_folder, "runvfphe_v4.bat")

            # Check if batch file exists
            if not os.path.exists(bat_file_path):
                emit('error', f"Batch file 'runvfphe_v4.bat' not found in {sim_folder}")
                return

            # Rest of the function remains the same...
            # Decision logic based on configuration
            if auto and not con and not exc:
                # Case 3: Auto runner mode
                emit('message', "Running in Auto Runner mode...")
                
                dalpha = data.get("dalpha", "1")
                alphaN = data.get("alphaN", "1")
                
                # Use stream_process to run VFP_Full_Process.py
                # Use full filename with extension for Python script
                stream_process([
                    "python", "VFP_Full_Process.py", 
                    dat_filename, dalpha, alphaN, map_file, geo_file
                ], sim_folder)

            elif con and not auto and not exc:
                # Case 2: Continuation mode
                emit('message', "Running in Continuation mode...")
                
                # Check if dump file exists when continuation is true
                if dump_file:
                    # Check for .fort52 file specifically (as per bat file)
                    dump_file_path = os.path.join(sim_folder, dump_file + ".fort52")
                    if not os.path.exists(dump_file_path):
                        emit('error', f"Dump file '{dump_file}.fort52' not found in simulation folder")
                        return
                    emit('message', f"Found dump file: {dump_file}.fort52")
                else:
                    emit('error', "Dump file name is required for continuation run")
                    return

                # Prepare arguments for continuation mode
                bat_args = [
                    map_file,           # map_base (without extension)
                    geo_file,           # geo_base (without extension)  
                    dat_file,           # flow_base (without extension)
                    "n",                # excres = no
                    "y",                # cont = yes
                    dump_file           # dump_base (without extension)
                ]

                emit('message', f"Batch arguments: {' '.join(bat_args)}")

                # Try the main method first, then fallback to alternative
                try:
                    stream_bat_process(bat_file_path, sim_folder, bat_args)
                except Exception as e:
                    emit('message', f"Primary method failed: {str(e)}")
                    emit('message', "Trying alternative execution method...")
                    stream_bat_process_alternative(bat_file_path, sim_folder, bat_args)

            elif not con and not auto and not exc:
                # Case 1: Standard mode (all false)
                emit('message', "Running in Standard mode...")
                
                # Prepare arguments for standard mode
                bat_args = [
                    map_file,           # map_base (without extension)
                    geo_file,           # geo_base (without extension)
                    dat_file,           # flow_base (without extension)
                    "n",                # excres = no
                    "n",                # cont = no
                    ""                  # dump_base = empty for standard mode
                ]

                emit('message', f"Batch arguments: {' '.join(bat_args)}")

                # Try the main method first, then fallback to alternative
                try:
                    stream_bat_process(bat_file_path, sim_folder, bat_args)
                except Exception as e:
                    emit('message', f"Primary method failed: {str(e)}")
                    emit('message', "Trying alternative execution method...")
                    stream_bat_process_alternative(bat_file_path, sim_folder, bat_args)

            elif exc and not con and not auto:
                # Case 4: Excrescence mode
                emit('message', "Running in Excrescence mode...")
                
                # Prepare arguments for excrescence mode
                bat_args = [
                    map_file,           # map_base (without extension)
                    geo_file,           # geo_base (without extension)
                    dat_file,           # flow_base (without extension)
                    "y",                # excres = yes
                    "n",                # cont = no
                    ""                  # dump_base = empty for excrescence mode
                ]

                emit('message', f"Batch arguments: {' '.join(bat_args)}")

                # Try the main method first, then fallback to alternative
                try:
                    stream_bat_process(bat_file_path, sim_folder, bat_args)
                except Exception as e:
                    emit('message', f"Primary method failed: {str(e)}")
                    emit('message', "Trying alternative execution method...")
                    stream_bat_process_alternative(bat_file_path, sim_folder, bat_args)

            else:
                # Handle invalid combinations
                if con and auto:
                    emit('error', "Cannot run both Continuation and Auto Runner simultaneously")
                elif con and exc:
                    emit('error', "Cannot run both Continuation and Excrescence simultaneously")
                elif auto and exc:
                    emit('error', "Cannot run both Auto Runner and Excrescence simultaneously")
                else:
                    emit('error', "Invalid configuration combination")

        except Exception as e:
            print(f"Error processing simulation data: {e}")
            emit('error', f"Could not process simulation data: {str(e)}")
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


@socketio.on('get_simulation_folder')
def handle_get_simulation_folder(data):
    try:
        sim_name = data.get('simName')
        
        if not sim_name:
            emit('error', {'type': 'simulation_folder_error', 'message': 'Simulation name not provided'})
            return
        
        sim_folder_path = os.path.join('./Simulations', sim_name)
        
        if not os.path.exists(sim_folder_path):
            emit('error', {'type': 'simulation_folder_error', 'message': f'Simulation folder {sim_name} not found'})
            return
        
        # Get all files in the simulation folder
        files = []
        for root, dirs, filenames in os.walk(sim_folder_path):
            for filename in filenames:
                file_path = os.path.join(root, filename)
                relative_path = os.path.relpath(file_path, sim_folder_path)
                file_size = os.path.getsize(file_path)
                file_modified = os.path.getmtime(file_path)
                
                files.append({
                    'name': filename,
                    'path': relative_path,
                    'size': file_size,
                    'modified': file_modified,
                    'isDirectory': False
                })
            
            # Add directories
            for dirname in dirs:
                dir_path = os.path.join(root, dirname)
                relative_path = os.path.relpath(dir_path, sim_folder_path)
                
                files.append({
                    'name': dirname,
                    'path': relative_path,
                    'size': 0,
                    'modified': os.path.getmtime(dir_path),
                    'isDirectory': True
                })
        
        emit('simulation_folder_ready', {
            'success': True,
            'data': {
                'simName': sim_name,
                'folderPath': sim_folder_path,
                'files': files
            },
            'simName': sim_name
        })
        
    except Exception as e:
        print(f"Error getting simulation folder: {str(e)}")
        emit('error', {
            'type': 'simulation_folder_error',
            'message': str(e)
        })



# Add this route to your Flask app

@app.route('/get_file_content', methods=['POST'])
def get_file_content():
    try:
        data = request.get_json()
        sim_name = data.get('simName')
        file_path = data.get('filePath')
        
        if not sim_name or not file_path:
            return jsonify({'error': 'Missing simName or filePath'}), 400
        
        # Construct full path
        full_path = os.path.join('./Simulations', sim_name, file_path)
        
        # Security check - ensure path is within simulations directory
        abs_sim_path = os.path.abspath(os.path.join('./Simulations', sim_name))
        abs_file_path = os.path.abspath(full_path)
        
        if not abs_file_path.startswith(abs_sim_path):
            return jsonify({'error': 'Invalid file path'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Read and return file content
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': 'text/plain; charset=utf-8'}
        
    except Exception as e:
        print(f"Error reading file: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/import-geo', methods=['POST'])
def import_geo():
    # Check if files were uploaded
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400

    files = request.files.getlist('files')
    
    if not files or all(file.filename == '' for file in files):
        return jsonify({'error': 'No files selected'}), 400

    results = []
    
    for file in files:
        if file.filename == '':
            continue
            
        # Save the file to the upload folder
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        print(f"Processing file: {file_path}")

        try:
            # Pass the file to the readGEO function
            geo_data = rG.readGEO(file_path)
            import copy
            points = rG.airfoils(copy.deepcopy(geo_data))
            
            # Add file info to results
            results.append({
                'filename': filename,
                'geoData': geo_data,
                'plotData': points
            })

        except Exception as e:
            results.append({
                'filename': filename,
                'error': f'Error processing file: {str(e)}'
            })

        finally:
            # Clean up: Delete the uploaded file after processing
            if os.path.exists(file_path):
                os.remove(file_path)

    # Return the JSON response with all results
    return jsonify({'results': results}), 200



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
        CXD = -(CX * NSPSW / (1 - CT))

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

    print("Parameters received:", parameters)
    sec = section_index
    i = sec  # converting to 0-based index
    print("Section index:", i)

    # Extract current section data
    current_section = geo_data[i]
    
    # Calculate current chord
    chord = current_section['G2SECT'] - current_section['G1SECT']
    
    # Extract new parameters
    new_xle = float(parameters.get('XLE', current_section['G1SECT']))
    new_xte = float(parameters.get('XTE', current_section['G2SECT'])) 
    new_twist = float(parameters.get('Twist', current_section['TWIST']))
    new_dihedral = float(parameters.get('Dihedral', current_section['HSECT']))
    new_ysect = float(parameters.get('YSECT', current_section['YSECT']))
    new_chord = float(parameters.get('Chord', chord))

    # Check if geometry parameters (YSECT, XLE, XTE) have changed
    geometry_changed = False
    
    if 'YSECT' in parameters and abs(new_ysect - current_section['YSECT']) > 1e-5:
        current_section['YSECT'] = new_ysect
        geometry_changed = True
        print(f"Updated YSECT to {new_ysect}")
    
    if 'XLE' in parameters and abs(new_xle - current_section['G1SECT']) > 1e-5:
        current_section['G1SECT'] = new_xle
        geometry_changed = True
        print(f"Updated XLE (G1SECT) to {new_xle}")
    
    if 'XTE' in parameters and abs(new_xte - current_section['G2SECT']) > 1e-5:
        current_section['G2SECT'] = new_xte
        geometry_changed = True
        print(f"Updated XTE (G2SECT) to {new_xte}")

    # If chord was modified, update XTE based on XLE + chord
    if 'Chord' in parameters and abs(new_chord - chord) > 1e-5:
        current_section['G2SECT'] = current_section['G1SECT'] + new_chord
        geometry_changed = True
        print(f"Updated chord to {new_chord}, XTE (G2SECT) to {current_section['G2SECT']}")

    # Step 1: Generate plot data from updated geoData (if geometry changed)
    if geometry_changed:
        plot_data = rG.airfoils(geo_data)
        print("Regenerated plot data due to geometry changes")
    
    # Step 2: Apply rotation/translation for twist and dihedral changes in plotData
    twist_changed = 'Twist' in parameters and abs(new_twist - current_section['TWIST']) > 1e-5
    dihedral_changed = 'Dihedral' in parameters and abs(new_dihedral - current_section['HSECT']) > 1e-5
    
    if twist_changed or dihedral_changed:
        print("Applying twist/dihedral transformations to plot data")
        
        # Get the current section's plot data
        section_plot_data = plot_data[i]
        
        # Calculate twist difference in radians
        if twist_changed:
            current_twist_deg = current_section['TWIST']
            dtwist_rad = (new_twist - current_twist_deg) * (math.pi / 180)
            print(f"Applying twist change: {current_twist_deg}° -> {new_twist}° (Δ={dtwist_rad} rad)")
            
            # Apply rotation to upper surface
            xus_rotated = []
            zus_rotated = []
            for j in range(len(section_plot_data['xus'])):
                x = section_plot_data['xus'][j]
                z = section_plot_data['zus'][j]
                
                # Rotate around origin (leading edge should be at origin in airfoil coordinates)
                x_rot = x * math.cos(-dtwist_rad) - z * math.sin(-dtwist_rad)
                z_rot = x * math.sin(-dtwist_rad) + z * math.cos(-dtwist_rad)
                
                xus_rotated.append(x_rot)
                zus_rotated.append(z_rot)
            
            # Apply rotation to lower surface
            xls_rotated = []
            zls_rotated = []
            for j in range(len(section_plot_data['xls'])):
                x = section_plot_data['xls'][j]
                z = section_plot_data['zls'][j]
                
                x_rot = x * math.cos(-dtwist_rad) - z * math.sin(-dtwist_rad)
                z_rot = x * math.sin(-dtwist_rad) + z * math.cos(-dtwist_rad)
                
                xls_rotated.append(x_rot)
                zls_rotated.append(z_rot)
            
            # Store the rotated coordinates as new data
            section_plot_data['xus_n'] = xus_rotated
            section_plot_data['zus_n'] = zus_rotated
            section_plot_data['xls_n'] = xls_rotated
            section_plot_data['zls_n'] = zls_rotated
        
        # Handle dihedral changes (if needed - this might involve y-coordinate translation)
        if dihedral_changed:
            print(f"Applying dihedral change: {current_section['HSECT']} -> {new_dihedral}")
            # Dihedral typically affects the y-coordinate positioning of the section
            # This might need specific implementation based on your coordinate system
            
    # Step 3: Update the geoData with new twist/dihedral values
    if twist_changed:
        current_section['TWIST'] = new_twist
        print(f"Updated TWIST in geoData to {new_twist}")
    
    if dihedral_changed:
        current_section['HSECT'] = new_dihedral
        print(f"Updated HSECT (Dihedral) in geoData to {new_dihedral}")

    # Step 4: Return updated geoData and plotData
    return jsonify({
        'updatedGeoData': geo_data,
        'updatedPlotData': plot_data
    })

@app.route('/export-geo', methods=['POST'])
def export_geo():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        geo_data = data.get('geoData')
        original_filename = data.get('filename', 'wing.GEO')
        
        if not geo_data:
            return jsonify({'error': 'No geoData provided'}), 400
        
        print(f"Exporting GEO file: {original_filename}")
        print(f"Number of sections: {len(geo_data)}")
        
        # Create modified filename by removing extension and adding _modified.GEO
        if original_filename.upper().endswith('.GEO'):
            base_name = original_filename[:-4]  # Remove .GEO extension
        else:
            base_name = original_filename
        
        modified_filename = f"{base_name}_modified.GEO"
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.GEO', delete=False) as temp_file:
            temp_filepath = temp_file.name
        
        try:
            # Call the writeGEO function from readGEO module
            rG.writeGEO(temp_filepath, geo_data)
            
            print(f"Generated modified filename: {modified_filename}")
            
            # Send the file to client with modified filename
            return send_file(
                temp_filepath, 
                as_attachment=True, 
                download_name=modified_filename,
                mimetype='application/octet-stream'
            )
            
        except Exception as e:
            print(f"Error writing GEO file: {str(e)}")
            return jsonify({'error': f'Error writing GEO file: {str(e)}'}), 500
        
        finally:
            # Clean up the temporary file after sending
            try:
                if os.path.exists(temp_filepath):
                    os.remove(temp_filepath)
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up temp file: {cleanup_error}")
    
    except Exception as e:
        print(f"Error in export_geo endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)


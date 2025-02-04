import os
import shutil
import tkinter as tk
from tkinter import filedialog

# Function to browse and select a file
def browse_file(file_type):
    file_path = filedialog.askopenfilename(title=f"Select {file_type} file", filetypes=[("Text Files", "*.map;*.geo;*.dat")])
    if file_path:
        file_name, _ = os.path.splitext(os.path.basename(file_path))
        return file_name, file_path
    return None, None

# Function to copy the selected file to the VFP folder
def copy_file_to_vfp_folder(file_name, source_path, vfp_folder):
    destination_path = os.path.join(vfp_folder, file_name + os.path.splitext(source_path)[1])
    shutil.copy(source_path, destination_path)
    return destination_path

def run_batch_file(map_file, geo_file, flow_file, excres, cont, vfp_folder):
    # Create the batch file contents
    batch_contents = f"""
echo off
title "Viscous Full Potential program"
rem color 9F
:map_input
set _map={map_file}
if not exist %_map%.map (echo file was not found)
if not exist %_map%.map goto :map_input
:geo_input
set _geo={geo_file}
if not exist %_geo%.geo (echo file was not found)
if not exist %_geo%.geo goto :geo_input
:flow_input
set _flow={flow_file}
if not exist %_flow%.dat (echo file was not found)
if not exist %_flow%.dat goto :flow_input
goto :copy_flow
:copy_flow
if not exist %_flow%.dat (echo file was not found)  
if not exist %_flow%.dat goto :flow_input  
copy %_map%.map fort.14
copy %_geo%.geo fort.10
copy %_flow%.dat fort.15
echo 'input files copied'
:excres
set _excres={excres} 
if %_excres%==n (goto cont_run) else (set /p _excresfile=enter excresence file name) 
if not exist %_excresfile%.dat (echo file was not found)
if not exist %_excresfile%.dat goto :excres
copy %_excresfile%.dat excres.dat 
:cont_run
set _contrun={cont} 
if %_contrun%==n (goto run_vfp) else (set /p _dumpfile=is this a continuation run at the same Mach and alpha type y for yes or n for no) 
if "%_dumpfile%"=="n" goto dump_filename
copy %_geo%%_flow%.fort11 fort.11 
copy %_geo%%_flow%.fort21 fort.21 
copy %_geo%%_flow%.fort50 fort.50 
copy %_geo%%_flow%.fort51 fort.51 
copy %_geo%%_flow%.fort52 fort.52
copy %_geo%%_flow%.fort55 fort.55
goto run_vfp
:dump_filename
set /p _dump=enter dump file name 
if not exist %_dump%.fort52 (echo file was not found)  
if not exist %_dump%.fort52 goto :dump_filename  
copy %_dump%.fort11 fort.11 
copy %_dump%.fort21 fort.21 
copy %_dump%.fort50 fort.50 
copy %_dump%.fort51 fort.51 
copy %_dump%.fort52 fort.52
copy %_dump%.fort55 fort.55
echo 'flow dump files found and copied
:run_vfp
vfphe.exe
echo 'mapflow complete starting to copy and tidy vfp files'
move fort.16 %_geo%%_flow%.flow
move fort.17 %_geo%%_flow%.conv
move fort.22 %_geo%.mapout
move fort.18 %_geo%%_flow%.forces
move fort.19 %_geo%%_flow%.cp
move fort.20 %_geo%%_flow%.vis
move fort.24 %_geo%%_flow%.sum
echo 'renaming flow dump files'
copy fort.11 %_geo%%_flow%.fort11
copy fort.15 %_geo%%_flow%.fort15
copy fort.21 %_geo%%_flow%.fort21
copy fort.50 %_geo%%_flow%.fort50
copy fort.51 %_geo%%_flow%.fort51
copy fort.52 %_geo%%_flow%.fort52
copy fort.55 %_geo%%_flow%.fort55
pause
echo.'start of wave drag calculation using field based method'
:copy wavedrg.dat wavedrg72.dat
copy fort.70 flow70.dat
copy fort.71 flow71.dat
pause
f137b1.exe
echo 'wave drag calculation complete'
copy wavedrg73.dat %_geo%%_flow%wavedrg73.dat
copy wavedrg74.dat %_geo%%_flow%wavedrg74.dat
copy wavedrg75.dat %_geo%%_flow%wavedrg75.dat
copy wavedrg76.dat %_geo%%_flow%wavedrg76.dat
pause
del fort.11
del fort.15
del fort.21
del fort.50
del fort.51
del fort.52
del fort.55
del fort.70
del fort.71
del wavedrg72.dat
del wavedrg73.dat
del wavedrg74.dat
del wavedrg75.dat
del wavedrg76.dat
echo 'files moved and tidied'
pause

    """
    
    # Write to the batch file in the VFP folder
    batch_file_path = os.path.join(vfp_folder, "run_vfp.bat")
    with open(batch_file_path, "w") as batch_file:
        batch_file.write(batch_contents)

    # Run the batch file from the VFP folder
    os.system(batch_file_path)

def main():
    # Initialize tkinter root window (it won't be shown)
    root = tk.Tk()
    root.withdraw()  # Hide the root window


    # Ask the user for the VFP folder (where batch file will be present)
    vfp_folder = filedialog.askdirectory(title="Select the VFP Folder where batch file will be saved")
    # if not vfp_folder:
    #     print("Please select a valid folder.")
    #     return
    
    # Ask for map, geo, and flow files
    map_file_name, map_file_path = browse_file("Map")
    geo_file_name, geo_file_path = browse_file("Geometry")
    flow_file_name, flow_file_path = browse_file("Flow")

    # # Ensure all files were selected
    # if not map_file_name or not geo_file_name or not flow_file_name:
    #     print("Please select all required files.")
    #     return

    # Copy selected files to the VFP folder
    copy_file_to_vfp_folder(map_file_name, map_file_path, vfp_folder)
    copy_file_to_vfp_folder(geo_file_name, geo_file_path, vfp_folder)
    copy_file_to_vfp_folder(flow_file_name, flow_file_path, vfp_folder)

    # Ask if this is an excrescence run
    excrescence_run = input("Is this an excrescence run? (y/n): ").strip().lower()
    # Ask if this is a continuation run
    continuation_run = input("Is this a continuation run? (y/n): ").strip().lower()

    # Pass the information to the batch file and run it
    run_batch_file(map_file_name, geo_file_name, flow_file_name, excrescence_run, continuation_run, vfp_folder)

if __name__ == "__main__":
    main()


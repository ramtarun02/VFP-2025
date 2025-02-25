import readGEO as rG
import airfoils as af
import runVFP as run
import subprocess
import os
import shutil


# run.copy_files_to_folder("CRM-Trial")

# run.create_batch_file('CRM1wb', 'CRM1wbs', 'M085Re5ma0p0', 'n', 'n', 'CRM-Trial')

def run_bat_file():
    script_dir = os.path.dirname(os.path.abspath(__file__))  # Get the current script's directory
    bat_file_path = os.path.join(script_dir, "CRM-Trial", "run_vfp.bat")  # Adjust subdir name

    process = subprocess.Popen(
        bat_file_path,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True  # Ensures output is treated as text, not bytes
    )

    # Read and print output in real-time
    while True:
        output = process.stdout.readline()
        if output == "" and process.poll() is not None:
            break
        if output:
            print(output.strip())

    process.stdout.close()
    process.wait()

def zip_folder(folder_path):
    """Zips the specified folder in the same location with the same name."""
    folder_path = os.path.abspath(folder_path)  # Get absolute path
    parent_dir, folder_name = os.path.split(folder_path)  # Extract parent dir and folder name
    output_zip = os.path.join(parent_dir, folder_name)  # Set output zip file path (without extension)

    shutil.make_archive(output_zip, 'zip', folder_path)  # Create the zip archive
    print(f"Folder '{folder_path}' has been zipped as '{output_zip}.zip'")

if __name__ == "__main__":
    # run_bat_file()
    folder_to_zip = "CRM-Trial"  # Update this with your folder path
    zip_folder(folder_to_zip)

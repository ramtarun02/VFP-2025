# Viscous Full Potential Flow Solver

## Overview 

The VFP (Viscous Full Potential) Web Application is a modern, browser-based computational fluid dynamics (CFD) tool designed for conceptual aircraft design. This application replaces the legacy MATLAB-based GUI with a scalable, cross-platform web solution built using ReactJS for the frontend and Python for the backend server. The VFP (Viscous Full Potential) Web Application is a modern, browser-based computational fluid dynamics (CFD) tool designed for transonic aircraft design. This application replaces the legacy MATLAB-based GUI with a scalable, cross-platform web solution built using ReactJS for the frontend and Python for the backend server.

## Purpose 

The VFP Web Application aims to:

- Provides an efficient and interactive graphical user interface for the legacy VFP CLI developed by ESDU.
- Enable efficient geometry visualisation, modifications and performance evaluations
- Supports Generation of VFP Input Files by integrated FPCON
- Auto Runner -- Enables Users to simulate continuation run through a range og angle of attacks.
- Facilitate multi-user, collaborative workflows through web-based access
- Support integration of propeller-wing interference modeling (ProWIM)
- Eliminate platform dependencies (Windows-only constraint of the original MATLAB/Fortran implementation)

## Target Audience

This application is designed for:

- **Aerospace engineers** conducting conceptual/preliminary aircraft design
- **Researchers** studying potential flows and boundary layer.
- **Students** learning CFD and aircraft design principles
- **Design teams** requiring collaborative and rapid aerodynamic analysis tools

## Key Advantages over Legacy VFP CLI/MATLAB GUI

- Provides an efficient and interactive graphical user interface for the legacy VFP CLI developed by ESDU.
- Enable efficient geometry visualisation, modifications and performance evaluations
- **Integrated FPCON**: Supports Generation of VFP Input Files by integrated ESDU's FPCON
- **Auto Runner** -- Enables Users to simulate continuation run through a range of angle of attacks.
- **Cross-platform accessibility**: Works on Windows, macOS, and Linux via web browser
- **Multi-user support**: Enables simultaneous access by multiple team members
- **Improved performance**: Enhanced responsiveness and computational efficiency
- **Modern UI/UX**: Intuitive interface with contemporary design patterns
- **No licensing costs**: Open-source technology stack eliminates proprietary software fees
- **Cloud deployment ready**: Can be hosted on institutional or cloud servers

# Getting Started

Welcome to the Aircraft Design and Optimization Tool! This guide will help you set up and start using the application, even if you have limited experience with software installation.

## System Requirements

**Minimum Requirements:**

- **Modern web browser (Chrome, Firefox, Safari, Edge)**
- **Internet connection (for web-hosted deployment)**

**For Local Installation:**

- **Git**
- **Frontend: Node.js 16.x or higher, npm 7.x or higher**
- **Backend: Python 3.8 or higher, pip package manager**
- **Operating System: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)**
- **RAM: 4GB minimum, 8GB recommended**
- **Disk Space: 2GB free space**

## Installation

### 2.2.1 Accessing the Web Application (End Users)

The application is deployed online via GitHub Pages. To access the VFP Web Application, simply navigate to the following URL in your web browser—no local installation required.

**VFP Application URL:** [https://ramtarun02.github.io/VFP-2025](https://ramtarun02.github.io/VFP-2025)

### 2.2.2 Local Installation (Developers/Administrators)

#### Step 1: Clone the Frontend Repository
```bash
git clone https://github.com/ramtarun02/VFP-2025.git
cd VFP-2025
```
#### Step 2: Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd VFP-2025

# Install dependencies
npm install
```

#### Step 3: Clone and Set Up the Backend Server
The backend server is now maintained in a separate repository. Clone and set up the backend as follows:

```bash
git clone https://github.com/ramtarun02/VFP-Python.git
cd VFP-Python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 2.3 Starting the Application

**Step 1: Start the Backend Server**
```bash
cd VFP-Python
# Activate virtual environment (Make Sure the venv is activated everytime you start the backend server)
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On macOS/Linux

# Set Flask app environment variable (Only Needed when setting up for the first time)
set FLASK_APP=src/app.py        # On Windows
# or
export FLASK_APP=src/app.py     # On macOS/Linux

# Start the Flask development server
flask run
```

The backend server will start on http://localhost:5000

**Step 2: Start the Frontend Development Server**
In the frontend folder (VFP-2025), run 
```bash 
npm run dev
```

The VFP Application will open in a new browser window/tab with an URL http://localhost:3000
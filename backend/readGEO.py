import numpy as np
from flask import jsonify
import airfoils as af

def readGEO(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    index = 0  # Track the current line being processed

    # Read the first line
    first_line = lines[index].strip().split()
    index += 1

    NSECT = int(first_line[0])  # Assuming NSECT is the first number

    Sections = []

    for i in range(NSECT):
        line = lines[index].strip().split()
        YSECT, G1SECT, G2SECT, HSECT = map(float, line[:4])
        index += 1

        # Read MU and ML values
        line = lines[index].strip().split()
        IMARK = int(line[0])
        MU = int(line[1])
        ML = int(line[2])
        XTWSEC = float(line[3])
        TWIST = float(line[4])
        index += 1

        # Read upper surface coordinates
        US = []
        for _ in range(MU):
            line = lines[index].strip().split()
            US.append((float(line[0]), float(line[1])))
            index += 1

        # Read lower surface coordinates
        LS = []
        for _ in range(ML):
            line = lines[index].strip().split()
            LS.append((float(line[0]), float(line[1])))
            index += 1

        Sections.append({
            'YSECT': YSECT, 'G1SECT': G1SECT, 'G2SECT': G2SECT, 'HSECT': HSECT,
            'IMARK': IMARK, 'MU': MU, 'ML': ML,
            'XTWSEC': XTWSEC, 'TWIST': TWIST,
            'US': US, 'LS': LS
        })

    # Read NRAD and associated radii values
    NRAD = int(lines[index].strip().split()[0])
    index += 1

    XRAD = []
    RAD = []

    for _ in range(NRAD):
        line = lines[index].strip().split()
        XRAD.append(float(line[0]))
        RAD.append(float(line[1]))
        index += 1

    return Sections


# def readGEO(filename):
#     with open(filename, 'r') as f:
#         lines = f.readlines()  # Read all lines at once

#     index = 0  # Track the current line being processed

#     # Read the first line
#     first_line = lines[index].strip().split()
#     index += 1

#     # # Read ISEND and DSEND values (4 pairs of values)
#     # ISEND = []
#     # DSEND = []
#     # for _ in range(4):
#     #     line = lines[index].strip().split()
#     #     ISEND.append(int(line[0]))
#     #     DSEND.append(float(line[1]))
#     #     index += 1

#     NSECT = int(first_line[0])  # Assuming NSECT is the first number

#     # Define NumPy structured array format
#     dtype = [
#         ('YSECT', 'f8'), ('G1SECT', 'f8'), ('G2SECT', 'f8'),
#         ('HSECT', 'f8'), ('IMARK', 'i4'), 
#         ('MU', 'O'), ('ML', 'O'),
#         ('XTWSECT', 'f8'), ('TWIST', 'f8'), 
#         ('US', 'O'),
#         ('LS', 'O'),
#         ('US_N', 'O'),
#         ('LS_N', 'O'),
#         ('NHSECT', 'O'),
#         ('NTWIST', 'O'), 
#         ('NYSECT', 'O'), 
#         ('XTWSEC', 'O')
#     ]

#     Sections = np.zeros(NSECT, dtype=dtype)

#     for i in range(NSECT):
#         line = lines[index].strip().split()
#         Sections[i] = (
#             float(line[0]), float(line[1]), float(line[2]),
#             float(line[3]), 0.0, 0.0, 0.0, None, None, None, None,
#             None, None, None, None, None, None
#         )
#         index += 1

#         # Read MU and ML values
#         line = lines[index].strip().split()
#         MU = int(line[1])
#         ML = int(line[2])
#         Sections[i]['IMARK'] = line[0]
#         Sections[i]['MU'] = MU
#         Sections[i]['ML'] = ML
#         Sections[i]['XTWSEC'] = line[3]
#         Sections[i]['TWIST'] = line[4]
#         index += 1

#         # Read upper surface coordinates
#         US = np.zeros((MU,2))

#         for j in range(MU):
#             line = lines[index].strip().split()
#             US[j,0] = float(line[0])
#             US[j,1] = float(line[1])
#             index += 1
#         Sections[i]['US'] = US

#         # Read lower surface coordinates
#         LS = np.zeros((MU,2))

#         for j in range(ML):
#             line = lines[index].strip().split()
#             LS[j,0] = float(line[0])
#             LS[j,1] = float(line[1])
#             index += 1
#         Sections[i]['LS'] = LS


#     # Read NRAD and associated radii values
#     NRAD = int(lines[index].strip().split()[0])
#     index += 1

#     XRAD = np.zeros(NRAD)
#     RAD = np.zeros(NRAD)

#     for i in range(NRAD):
#         line = lines[index].strip().split()
#         XRAD[i] = float(line[0])
#         RAD[i] = float(line[1])
#         index += 1

#     return Sections


def convert_to_plotly_format(points):
    """
    Converts a list of dictionaries (each representing an airfoil section) into Plotly-friendly format.
    
    Parameters:
        points (list): List of dictionaries, where each dictionary contains
                       'y', 'xus', 'xls', 'zus', 'zls' keys.

    Returns:
        dict: A structured dictionary that can be directly used in Plotly.
    """
    plotly_data = []
    twist_values = []
    section_numbers = []
    
    for i, section in enumerate(points):
        # Create trace for the upper surface
        upper_trace = {
            'x': section['xus'].tolist(),
            'y': section['y'].tolist(),  # Spanwise position
            'z': section['zus'].tolist(),
            'mode': 'lines',
            'type': 'scatter3d',
            'name': f'Section {i + 1} - Upper',
            'line': {'color': 'blue',
                     'width': 6}
        }

        # Create trace for the lower surface
        lower_trace = {
            'x': section['xls'].tolist(),
            'y': section['y'].tolist(),  # Spanwise position
            'z': section['zls'].tolist(),
            'mode': 'lines',
            'type': 'scatter3d',
            'name': f'Section {i + 1} - Lower',
            'line': {'color': 'red', 
                     'width': 6}
        }

        camber_trace = {
                'x': section['xus'].tolist(),
                'y': section['y'].tolist(),
                'z': section['camber'].tolist(),
                'mode': 'lines',
                'type': 'scatter3d',
                'name': f'Section {i + 1} - Camber',
                'line': {'color': 'green', 'width': 3}
                }

        # Append twist values and section numbers for separate plotting
        twist_values.append(section['twist'])
        section_numbers.append(i + 1)

        plotly_data.append(upper_trace)
        plotly_data.append(lower_trace)
        plotly_data.append(camber_trace)


    # Create twist distribution trace
    twist_trace = {
        'x': section_numbers,
        'y': twist_values,
        'mode': 'lines+markers',
        'type': 'scatter',
        'name': 'Twist Distribution',
        'line': {'color': 'black', 'width': 4}
    }

    plotly_data.append(twist_trace)

    return plotly_data




# print(convert_to_json(readGEO("CRM1wbs.GEO")))

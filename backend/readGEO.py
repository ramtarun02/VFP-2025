import numpy as np
from scipy.interpolate import interp1d
from flask import jsonify
import math

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



def interpolate_airfoil(airfoil_points, num_points=10000):
    """
    Perform linear interpolation on airfoil points where x is strictly increasing.
    
    Parameters:
    - airfoil_points: List of [x,y] coordinates of the original airfoil points
    - num_points: Desired number of points in the interpolated airfoil (default: 10000)
    
    Returns:
    - interpolated_points: Numpy array of interpolated [x,y] coordinates
    """
    # Convert to numpy array and separate x and y coordinates
    points = np.array(airfoil_points)
    x = points[:, 0]
    y = points[:, 1]
    
    # Verify x is strictly increasing
    if not np.all(np.diff(x) > 0):
        raise ValueError("x-coordinates must be strictly increasing for this interpolation method")
    
    # Create linear interpolation function for y coordinates
    fy = interp1d(x, y, kind='linear')
    
    # Generate new equally spaced x values
    x_new = np.linspace(x.min(), x.max(), num_points)
    
    # Calculate interpolated y values
    y_new = fy(x_new)
    
    x_new = x_new.tolist()
    y_new = y_new.tolist()
    # Combine into array of [x,y] points
    interpolated_points = np.column_stack((x_new, y_new))
    
    return interpolated_points, x_new, y_new



def airfoils(Sections):
 
    # Check if all sections have US and LS starting with (0, 0)
    if all(s['US'][0][0] == 0 and s['LS'][0][0] == 0 for s in Sections):
        # If condition is met, perform the transformation for all sections
        for s in Sections:
            s['US'] = [(x * (s['G2SECT'] - s['G1SECT']) + s['G1SECT'], y * (s['G2SECT'] - s['G1SECT'])) for x, y in s['US']]
            s['LS'] = [(x * (s['G2SECT'] - s['G1SECT']) + s['G1SECT'], y * (s['G2SECT'] - s['G1SECT'])) for x, y in s['LS']]


    Points = []
    

    try:
        for s in Sections:
            smoothed_airfoil, x_new, z_new = interpolate_airfoil(s['US'], num_points=10000)
            xus = x_new
            zus = z_new
            smoothed_airfoil, x_new, z_new = interpolate_airfoil(s['LS'], num_points=10000)
            xls = x_new
            zls = z_new

            y = [s['YSECT'] for _ in range(len(xls))]
            print("Interpolation Done")

            # Thickness to chord ratio and camber line
            t_max = max(zus[i] - zls[i] for i in range(len(zus)))
            c = s['G2SECT'] - s['G1SECT']
            t_c = t_max / c
            camber = [(abs(zus[i] - zls[i]) / 2) + zls[i] for i in range(len(zus))]
            
            # Twist calculation
            z_diff = abs(zus[0] - zus[-1])
            x_diff = s['G2SECT'] - s['G1SECT']
            twist = (math.degrees(math.atan(z_diff / x_diff))) * (-1 if zus[0] < zus[-1] else 1)
            
            Points.append({
                'y': y, 'xus': xus, 'zus': zus, 'xls': xls, 'zls': zls,
                't_c': t_c, 'camber': camber, 'twist': twist
            })

        return Points
 
    except ValueError as e:
        print(f"Error: {e}")


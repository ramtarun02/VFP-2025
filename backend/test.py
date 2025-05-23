import readGEO as rG
import airfoil_points as af


def writeGEO(filename, sections, xrad=None, rad=None):
    """
    Write GEO file from structured data
    
    Args:
        filename: Output filename
        sections: List of section dictionaries (from readGEO)
        xrad: List of XRAD values (optional)
        rad: List of RAD values (optional)
    """
    with open(filename, 'w') as f:
        # Hardcoded Line type 1 parameters
        # Format: 2I5, 4(I5,F10.0)
        line1_params = {
            'NSECT': len(sections),
            'NSECT1': 0,  # Typically same as NSECT if no special handling
            'ISEND': [1, 2, 3, 4],  # Example interpolation parameters
            'DSEND': [0.0, 0.0, 0.0, 0.0]  # Example delta parameters
        }
        
        # Write Line type 1
        line1 = f"  {line1_params['NSECT']:5d}{line1_params['NSECT1']:5d}"
        for i in range(4):
            line1 += f"{line1_params['ISEND'][i]:5d}{line1_params['DSEND'][i]:10.4f}"
        f.write(line1 + '\n')
        
        # Write sections
        for section in sections:
            # Line type 2: 4F10.0
            line2 = f"{section['YSECT']:10.4f}{section['G1SECT']:10.4f}" \
                   f"{section['G2SECT']:10.4f}{section['HSECT']:10.4f}"
            f.write(line2 + '\n')
            
            # Line type 3: 3I5, 2F10.0
            line3 = f"  {section['IMARK']:5d}{section['MU']:5d}{section['ML']:5d}" \
                   f"{section['XTWSEC']:10.4f}{section['TWIST']:10.4f}"
            f.write(line3 + '\n')
            
            # Line type 4 coordinates - Upper surface first
            for x, z in section['US']:
                line4 = f"{x:10.4f}{z:10.4f}"
                f.write(line4 + '\n')
            
            # Lower surface if not symmetrical (IMARK == 0)
            if section['IMARK'] == 0:
                for x, z in section['LS']:
                    line4 = f"{x:10.4f}{z:10.4f}"
                    f.write(line4 + '\n')
        
        # Write body data if provided
        if xrad is not None and rad is not None and len(xrad) > 0:
            # Hardcoded Line type 5 parameters
            line5_params = {
                'NRAD': len(xrad),
                'IREND': [1, 2],  # Example interpolation parameters
                'DREND': [0.0, 0.0]  # Example delta parameters
            }
            
            # Line type 5: I5, 2(I5, F10.0)
            line5 = f"{line5_params['NRAD']:5d}"
            for i in range(2):
                line5 += f"{line5_params['IREND'][i]:5d}{line5_params['DREND'][i]:10.4f}"
            f.write(line5 + '\n')
            
            # Line type 6 coordinates
            for x, r in zip(xrad, rad):
                line6 = f"{x:10.4f}{r:10.4f}"
                f.write(line6 + '\n')


import numpy as np
from math import cos, pi

def generate_airfoil_points(n_points=50):
    """Generate sample airfoil coordinates with specified number of points"""
    # Generate a simple NACA-like airfoil shape
    x = np.linspace(0, 1, n_points)
    
    # Upper surface (cosine distribution for more points near leading edge)
    theta = np.linspace(0, pi, n_points)
    x_us = 0.5 * (1 - np.cos(theta))  # Cosine spacing for better LE resolution
    y_us = 0.1 * (0.2969*np.sqrt(x_us) - 0.1260*x_us - 0.3516*x_us**2 + 0.2843*x_us**3 - 0.1015*x_us**4)
    
    # Lower surface
    x_ls = x_us[::-1]  # Same x distribution but reversed
    y_ls = -0.1 * (0.2969*np.sqrt(x_ls) - 0.1260*x_ls - 0.3516*x_ls**2 + 0.2843*x_ls**3 - 0.1015*x_ls**4)
    
    # Combine into coordinate pairs
    us = list(zip(x_us, y_us))
    ls = list(zip(x_ls[1:-1], y_ls[1:-1]))  # Skip duplicate LE and TE points
    
    return us, ls

# Generate detailed airfoil coordinates
us1, ls1 = generate_airfoil_points(60)
us2, ls2 = generate_airfoil_points(55)

# Example data with detailed coordinates
example_sections = [
    {
        'YSECT': 0.0, 'G1SECT': 1.0, 'G2SECT': 2.0, 'HSECT': 0.0,
        'IMARK': 0, 'MU': len(us1), 'ML': len(ls1),
        'XTWSEC': 0.5, 'TWIST': 0.0,
        'US': us1,
        'LS': ls1
    },
    {
        'YSECT': 1.0, 'G1SECT': 1.1, 'G2SECT': 2.1, 'HSECT': 0.1,
        'IMARK': 0, 'MU': len(us2), 'ML': len(ls2),
        'XTWSEC': 0.5, 'TWIST': 2.0,
        'US': us2,
        'LS': ls2
    }
]

# Example body data (optional)
example_xrad = np.linspace(0, 5, 20).tolist()
example_rad = [0.2 + 0.05*x - 0.01*x**2 for x in example_xrad]

# Write the GEO file
writeGEO("detailed_example.geo", example_sections, example_xrad, example_rad)

print(f"Created GEO file with:")
print(f"- {len(example_sections)} sections")
print(f"- Section 1: {len(us1)} upper, {len(ls1)} lower points")
print(f"- Section 2: {len(us2)} upper, {len(ls2)} lower points")
print(f"- Body with {len(example_xrad)} radius points")

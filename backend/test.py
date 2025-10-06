import readGEO as rG


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
            'NSECT1': 2,  # Typically same as NSECT if no special handling
            'ISEND': [-1, -1, -1, -1],  # Example interpolation parameters
            'DSEND': [0.0, 0.0, 0.0, 0.0]  # Example delta parameters
        }
        
        # Write Line type 1
        line1 = f"  {line1_params['NSECT']:3d}{line1_params['NSECT1']:5d}"
        for i in range(4):
            line1 += f"{line1_params['ISEND'][i]:5d}{line1_params['DSEND'][i]:10.5f}"
        f.write(line1 + '\n')
        
        # Write sections
        for section in sections:
            # Line type 2: 4F10.0
            line2 = f"{section['YSECT']:10.6f}{section['G1SECT']:10.6f}" \
                   f"{section['G2SECT']:10.6f}{section['HSECT']:10.6f}"
            f.write(line2 + '\n')
            
            # Line type 3: 3I5, 2F10.0
            line3 = f"  {section['IMARK']:3d}{section['MU']:5d}{section['ML']:5d}" \
                   f"{section['XTWSEC']:10.6f}{section['TWIST']:10.6f}"
            f.write(line3 + '\n')
            
            # Line type 4 coordinates - Upper surface first
            for x, z in section['US']:
                line4 = f"{x:10.6f}{z:10.6f}"
                f.write(line4 + '\n')
            
            # Lower surface if not symmetrical (IMARK == 0)
            if section['IMARK'] == 0:
                for x, z in section['LS']:
                    line4 = f"{x:10.6f}{z:10.6f}"
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

        else:
            # Write default ending lines when no xrad/rad data
            f.write("   0\n")
            f.write("\n")
            f.write("\n")
            f.write("\n")
            f.write("\n")
            f.write("     0    0       0.0    0       0.0\n")

x = rG.readGEO('S340wb.GEO')

writeGEO('test_out.GEO', x)
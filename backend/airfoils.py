import numpy as np

def airfoils(Sections):
    for s in Sections:
        # Check if the first coordinates of US and LS are [0, 0]
        if np.all(s['US'][0] == [0, 0]) and np.all(s['LS'][0] == [0, 0]):
            s['US'][:, 0] = s['US'][:, 0] * (s['G2SECT'] - s['G1SECT']) + s['G1SECT']
            s['US'][:, 1] = s['US'][:, 1] * (s['G2SECT'] - s['G1SECT'])
            s['LS'][:, 0] = s['LS'][:, 0] * (s['G2SECT'] - s['G1SECT']) + s['G1SECT']
            s['LS'][:, 1] = s['LS'][:, 1] * (s['G2SECT'] - s['G1SECT'])
    
    Points = []
    
    for s in Sections:
        Lines = {'aus': [], 'bus': [], 'als': [], 'bls': []}
        
        # Extracting upper surface lines
        for i in range(len(s['US']) - 1):
            p = np.polyfit(s['US'][i:i+2, 0], s['US'][i:i+2, 1], 1)
            Lines['aus'].append(p[0])
            Lines['bus'].append(p[1])
        
        # Extracting lower surface lines
        for i in range(len(s['LS']) - 1):
            p = np.polyfit(s['LS'][i:i+2, 0], s['LS'][i:i+2, 1], 1)
            Lines['als'].append(p[0])
            Lines['bls'].append(p[1])
        
        x = s['G1SECT']
        inc = 0.00005
        i, p, t = 0, 0, 0
        zus, xus, zls, xls, y = [], [], [], [], []
        
        while x <= s['G2SECT']:
            if i < len(s['US']) - 1 and x >= s['US'][i+1, 0]:
                i += 1
            if p < len(s['LS']) - 1 and x >= s['LS'][p+1, 0]:
                p += 1
            
            zus.append(Lines['aus'][i] * x + Lines['bus'][i])
            xus.append(x)
            zls.append(Lines['als'][p] * x + Lines['bls'][p])
            xls.append(x)
            y.append(s['YSECT'])           
            x += inc
            t += 1
        
        zus, xus, zls, xls, y = np.array(zus), np.array(xus), np.array(zls), np.array(xls), np.array(y)


        # Thickness to chord ratio and camber line
        t_max = np.max(zus - zls)
        c = s['G2SECT'] - s['G1SECT']
        t_c = t_max / c
        camber = (np.abs(zus - zls) / 2) + zls
        
        # Twist calculation
        z_diff = abs(zus[0] - zus[-1])
        x_diff = s['G2SECT'] - s['G1SECT']
        twist = np.degrees(np.arctan(z_diff / x_diff)) * (-1 if zus[0] < zus[-1] else 1)
        
        Points.append({'y': y, 'xus': xus, 'zus': zus, 'xls': xls, 'zls': zls, 't_c': t_c, 'camber': camber, 'twist': twist})
    
    return Points


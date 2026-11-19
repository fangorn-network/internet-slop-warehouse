# SPDX-License-Identifier: CC0-1.0
# Formula Blue lobby pieces (the current Holiday Inn Express prototype): open check-in pods, a gray-and-navy sectional,
# navy lounge chairs, a bar-height oak communal table with stools, the sundry market (glass-door cooler, shelves) and
# the open business center. Origin at floor center; front faces Blender -Y (three.js +Z).
#   blender -b --python projects/roadside-inn/blender/lobby.py -- [asset ...]     (default: all)
import bpy, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, preview, mats

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'assets')
SHOTS = os.path.join(HERE, '..', '..', '..', 'artifacts', 'roadside-inn', 'blender')
R = math.radians
OAK = {'color': 'ph-hotel-oak-color.jpg', 'normal': 'ph-hotel-oak-normal.jpg', 'roughness': 'ph-hotel-oak-roughness.jpg'}
COT = {'normal': 'ph-store-cotton-normal.jpg', 'roughness': 'ph-store-cotton-roughness.jpg'}


def kit(m):
    """Formula Blue palette on top of the hotel's shared materials."""
    m['oak'] = material('oak', maps=OAK, uv_scale=1.0)
    m['solid'] = material('solid_surface', color=(0.93, 0.93, 0.92), roughness=0.28)          # white Corian-style shell
    m['gray_fabric'] = material('gray_fabric', color=(0.1, 0.11, 0.125), roughness=0.95, maps=COT, normal_strength=0.8, uv_scale=6)
    m['navy'] = material('navy_fabric', color=(0.025, 0.05, 0.13), roughness=0.95, maps=COT, normal_strength=0.8, uv_scale=6)
    m['cobalt'] = material('cobalt_fabric', color=(0.02, 0.12, 0.42), roughness=0.9, maps=COT, normal_strength=0.8, uv_scale=6)
    m['vinyl'] = material('navy_vinyl', color=(0.03, 0.06, 0.16), roughness=0.35)
    m['brushed'] = material('brushed_metal', color=(0.62, 0.63, 0.65), roughness=0.32, metallic=1.0)
    m['steel_black'] = material('black_steel', color=(0.03, 0.03, 0.035), roughness=0.45, metallic=0.7)
    m['laminate_dark'] = material('dark_laminate', color=(0.07, 0.07, 0.08), roughness=0.45)
    m['led_blue'] = material('led_blue', color=(0.1, 0.35, 1.0), roughness=0.5)
    e = m['led_blue'].node_tree.nodes['Principled BSDF']
    e.inputs['Emission Color'].default_value = (0.15, 0.4, 1.0, 1); e.inputs['Emission Strength'].default_value = 6.0
    m['lit_white'] = material('lit_panel', color=(1, 1, 1), roughness=0.5)
    e = m['lit_white'].node_tree.nodes['Principled BSDF']
    e.inputs['Emission Color'].default_value = (0.95, 0.97, 1.0, 1); e.inputs['Emission Strength'].default_value = 3.0
    return m


def flat(color, rough=0.45, name=None):
    name = name or f'c{color}'
    return bpy.data.materials.get(name) or material(name, color=color, roughness=rough)   # one material per name


def checkin_pod(m):
    """Standalone check-in pod, 1.5 m: white solid-surface shell with rounded corners, cobalt LED washing the floor from
    under the toe kick and under the top's overhang, a navy inlay band. Staff side (+Y): monitor, keycard encoder,
    receipt printer. Guest side: card terminal."""
    W, D, H = 1.5, 0.72, 1.04
    body = box('shell', (W, D, H - 0.1), (0, 0, 0.1 + (H - 0.1) / 2), m['solid'], bevel=0.05, segments=6); smooth(body)
    box('plinth', (W - 0.12, D - 0.12, 0.1), (0, 0, 0.05), m['charcoal'])
    box('toe_led', (W - 0.14, 0.012, 0.012), (0, -(D - 0.12) / 2 - 0.008, 0.012), m['led_blue'])
    top = box('top', (W + 0.08, D + 0.12, 0.04), (0, -0.04, H + 0.02), m['solid'], bevel=0.015, segments=4); smooth(top)
    box('lip_led', (W - 0.04, 0.012, 0.01), (0, -D / 2 - 0.07, H - 0.008), m['led_blue'])
    box('band', (W + 0.004, D + 0.004, 0.05), (0, 0, 0.62), m['navy'])
    # staff side
    box('work', (W - 0.2, 0.3, 0.025), (0, D / 2 - 0.12, 0.76), m['solid'])
    mon = box('monitor', (0.54, 0.02, 0.33), (-0.25, 0.08, H + 0.32), m['black'], bevel=0.006); mon.rotation_euler = (R(8), 0, 0)
    box('monitor_neck', (0.04, 0.03, 0.14), (-0.25, 0.1, H + 0.11), m['steel'])
    box('monitor_foot', (0.2, 0.16, 0.012), (-0.25, 0.12, H + 0.046), m['steel'])
    box('encoder', (0.12, 0.16, 0.06), (0.35, 0.12, H + 0.07), m['black'], bevel=0.01)
    box('encoder_slot', (0.06, 0.004, 0.012), (0.35, 0.039, H + 0.08), m['led_blue'])
    box('printer', (0.14, 0.2, 0.12), (0.58, 0.14, H + 0.1), m['charcoal'], bevel=0.01)
    # guest side
    t = box('terminal', (0.08, 0.15, 0.04), (0.45, -0.22, H + 0.06), m['black'], bevel=0.008); t.rotation_euler = (R(-20), 0, 0)
    box('terminal_screen', (0.06, 0.004, 0.05), (0.45, -0.29, H + 0.075), m['led_blue']).rotation_euler = (R(-20), 0, 0)
    cyl('pen_cup', 0.03, 0.09, (-0.62, -0.25, H + 0.085), m['brushed'], verts=16)


def sectional(m):
    """L-shaped modular sectional: charcoal-gray woven fabric, navy and cobalt throw pillows, brushed square legs.
    Main run 2.7 m along X; the chaise returns 1.65 m forward (-Y) on the +X end."""
    g = m['gray_fabric']
    L, D = 2.7, 0.95
    b = box('base', (L, D, 0.24), (0, 0, 0.22), g, bevel=0.02); smooth(b)
    back = box('back', (L, 0.2, 0.46), (0, D / 2 - 0.1, 0.57), g, bevel=0.035, segments=4); smooth(back)
    a = box('arm_l', (0.16, D, 0.6), (-L / 2 + 0.08, 0, 0.4), g, bevel=0.03, segments=4); smooth(a)
    for i, x in enumerate((-0.86, 0.0)):
        c = box(f'seat{i}', (0.84, 0.72, 0.15), (x, -0.06, 0.415), g, bevel=0.045, segments=5); smooth(c)
        k = box(f'backc{i}', (0.82, 0.18, 0.4), (x, D / 2 - 0.24, 0.66), g, bevel=0.06, segments=5); smooth(k); k.rotation_euler = (R(-9), 0, 0)
    # chaise on +X: deep seat running forward
    cx = L / 2 - 0.47
    ch = box('chaise_base', (0.94, 1.65, 0.24), (cx, -(1.65 - D) / 2, 0.22), g, bevel=0.02); smooth(ch)
    cs = box('chaise_seat', (0.86, 1.56, 0.15), (cx - 0.02, -(1.65 - D) / 2 - 0.02, 0.415), g, bevel=0.045, segments=5); smooth(cs)
    ca = box('chaise_arm', (0.16, 1.65, 0.6), (L / 2 + 0.0, -(1.65 - D) / 2, 0.4), g, bevel=0.03, segments=4); smooth(ca)
    k = box('chaise_backc', (0.76, 0.18, 0.4), (cx - 0.04, D / 2 - 0.24, 0.66), g, bevel=0.06, segments=5); smooth(k); k.rotation_euler = (R(-9), 0, 0)
    for i, (x, mat, rz) in enumerate(((-1.12, m['navy'], 12), (cx + 0.18, m['cobalt'], -10), (cx - 0.22, m['navy'], 6))):
        p = box(f'pillow{i}', (0.44, 0.13, 0.42), (x, D / 2 - 0.36, 0.7), mat, bevel=0.06, segments=5); smooth(p)
        p.rotation_euler = (R(-16), 0, R(rz))
    for x, y in ((-L / 2 + 0.06, D / 2 - 0.06), (-L / 2 + 0.06, -D / 2 + 0.06), (L / 2 - 0.06, D / 2 - 0.06),
                 (L / 2 - 0.06, -1.65 + D / 2 + 0.06), (cx - 0.41, -1.65 + D / 2 + 0.06), (0.4, D / 2 - 0.06)):
        box('leg', (0.035, 0.035, 0.1), (x, y, 0.05), m['brushed'])


def lounge_chair(m):
    """Structured lounge chair: squared navy shell, loose seat cushion, thin brushed-metal frame legs."""
    n = m['navy']
    seat = box('seat', (0.66, 0.66, 0.13), (0, -0.02, 0.43), n, bevel=0.04, segments=5); smooth(seat)
    shell = box('back', (0.74, 0.1, 0.44), (0, 0.32, 0.66), n, bevel=0.03, segments=4); smooth(shell)
    shell.rotation_euler = (R(-6), 0, 0)
    for x in (-0.35, 0.35):
        a = box('arm', (0.08, 0.72, 0.28), (x, 0.0, 0.5), n, bevel=0.03, segments=4); smooth(a)
    box('apron', (0.74, 0.72, 0.06), (0, 0, 0.34), n, bevel=0.01)
    for x in (-0.33, 0.33):          # sled runners
        box('runner', (0.02, 0.66, 0.02), (x, 0, 0.01), m['brushed'])
        for y in (-0.31, 0.31):
            box('post', (0.02, 0.02, 0.31), (x, y, 0.165), m['brushed'])


def communal_table(m):
    """Bar-height communal table, 3.2 m: light oak slab, black steel trestle legs and a stretcher, four pop-up power
    modules down the middle with AC sockets and USB-A/C ports."""
    L, D, H = 3.2, 0.9, 1.05
    top = box('top', (L, D, 0.045), (0, 0, H - 0.0225), m['oak'], bevel=0.004); uv_box(top, 0.8)
    for x in (-L / 2 + 0.3, L / 2 - 0.3):
        box('leg_post', (0.08, 0.08, H - 0.1), (x, 0, (H - 0.1) / 2 + 0.05), m['steel_black'])
        box('leg_foot', (0.08, D - 0.12, 0.05), (x, 0, 0.025), m['steel_black'])
        box('leg_head', (0.08, D - 0.12, 0.05), (x, 0, H - 0.07), m['steel_black'])
    box('stretcher', (L - 0.6, 0.06, 0.06), (0, 0, 0.32), m['steel_black'])
    for i, x in enumerate((-1.2, -0.4, 0.4, 1.2)):
        box(f'power{i}', (0.26, 0.11, 0.012), (x, 0, H + 0.006), m['black'], bevel=0.003)
        for s in (-0.07, 0.0):
            box('socket', (0.04, 0.05, 0.003), (x + s, 0, H + 0.013), m['beige_plastic'])
        for s in (0.06, 0.09):
            box('usb', (0.012, 0.025, 0.003), (x + s, 0, H + 0.013), m['led_blue'] if s > 0.08 else m['steel'])


def bar_stool(m):
    """Counter stool, seat 0.76 m: navy vinyl seat with a low back, black steel legs and footrest."""
    s = box('seat', (0.42, 0.4, 0.07), (0, 0, 0.74), m['vinyl'], bevel=0.025, segments=4); smooth(s)
    bk = box('back', (0.4, 0.05, 0.16), (0, 0.19, 0.9), m['vinyl'], bevel=0.02, segments=4); smooth(bk); bk.rotation_euler = (R(-10), 0, 0)
    for x in (-0.15, 0.15):
        box('back_post', (0.02, 0.02, 0.18), (x, 0.19, 0.8), m['steel_black'])
    for x in (-0.17, 0.17):
        for y in (-0.16, 0.16):
            l = box('leg', (0.022, 0.022, 0.72), (x * 1.06, y * 1.06, 0.36), m['steel_black'])
            l.rotation_euler = (R(-3 if y > 0 else 3), R(3 if x > 0 else -3), 0)
    for y in (-0.17, 0.17):
        box('rung_x', (0.36, 0.018, 0.018), (0, y, 0.28), m['steel_black'])
    for x in (-0.18, 0.18):
        box('rung_y', (0.018, 0.34, 0.018), (x, 0, 0.28), m['steel_black'])


def market_cooler(m):
    """Two-door glass merchandiser, 1.35 m: black frame, lit header, LED-lit shelves of water, sodas, juice and milk."""
    W, D, H = 1.35, 0.72, 2.05
    box('back', (W, 0.04, H), (0, D / 2 - 0.02, H / 2), m['black'])
    for x in (-W / 2 + 0.02, W / 2 - 0.02):
        box('side', (0.04, D, H), (x, 0, H / 2), m['black'])
    box('base', (W, D, 0.14), (0, 0, 0.07), m['black'])
    box('top', (W, D, 0.04), (0, 0, H - 0.02), m['black'])
    box('header', (W, 0.06, 0.2), (0, -D / 2 + 0.03, H - 0.12), m['black'])
    box('header_lit', (W - 0.1, 0.004, 0.12), (0, -D / 2 - 0.002, H - 0.12), m['led_blue'])
    box('liner', (W - 0.08, 0.01, H - 0.38), (0, D / 2 - 0.045, 0.14 + (H - 0.38) / 2), material('liner', color=(0.92, 0.93, 0.95), roughness=0.4))
    for x in (-W / 2 + 0.05, W / 2 - 0.05):
        box('led_strip', (0.012, 0.012, H - 0.4), (x, -D / 2 + 0.09, 0.14 + (H - 0.4) / 2), m['lit_white'])
    glass = material('door_glass', color=(0.75, 0.82, 0.85), roughness=0.03, alpha=0.14)
    for i, x in enumerate((-W / 4, W / 4)):
        box(f'door_frame{i}_l', (0.035, 0.03, H - 0.36), (x - W / 4 + 0.02, -D / 2 + 0.015, 0.14 + (H - 0.36) / 2), m['black'])
        box(f'door_frame{i}_t', (W / 2, 0.03, 0.035), (x, -D / 2 + 0.015, H - 0.24), m['black'])
        box(f'door_frame{i}_b', (W / 2, 0.03, 0.035), (x, -D / 2 + 0.015, 0.16), m['black'])
        box(f'glass{i}', (W / 2 - 0.05, 0.008, H - 0.42), (x, -D / 2 + 0.015, 0.14 + (H - 0.36) / 2), glass)
        box(f'handle{i}', (0.025, 0.04, 0.7), (x + (W / 4 - 0.06) * (1 if i == 0 else -1), -D / 2 - 0.02, 1.1), m['brushed'])
    rnd = random.Random(7)
    water = material('water_bottle', color=(0.55, 0.75, 0.95), roughness=0.08, alpha=0.6)
    cap_blue = flat((0.05, 0.25, 0.75), 0.4, 'cap_blue')
    soda = [flat(c, 0.25, f'soda{i}') for i, c in enumerate(((0.7, 0.04, 0.05), (0.08, 0.45, 0.15), (0.92, 0.5, 0.05), (0.06, 0.15, 0.55), (0.85, 0.85, 0.86)))]
    juice = [flat(c, 0.3, f'juice{i}') for i, c in enumerate(((0.95, 0.6, 0.08), (0.7, 0.1, 0.25), (0.95, 0.85, 0.3)))]
    milk = flat((0.96, 0.96, 0.95), 0.5, 'milk'); label = flat((0.1, 0.3, 0.75), 0.5, 'milk_label')
    shelves = [0.2, 0.55, 0.9, 1.22, 1.52]
    for z in shelves[1:]:
        box('shelf', (W - 0.1, D - 0.14, 0.012), (0, 0.02, z), m['steel'])
        box('price_rail', (W - 0.1, 0.006, 0.03), (0, -D / 2 + 0.08, z - 0.006), flat((0.95, 0.95, 0.95), 0.5, 'rail'))
    for row, z in enumerate(shelves):
        x = -W / 2 + 0.1
        while x < W / 2 - 0.08:
            kind = ['milk', 'juice', 'soda', 'soda', 'water'][row]
            if kind == 'water':
                for d in range(3):
                    cyl('water', 0.033, 0.21, (x, -0.2 + d * 0.11, z + 0.117), water, verts=10)
                cyl('cap', 0.015, 0.02, (x, -0.2, z + 0.232), cap_blue, verts=8); x += 0.075
            elif kind == 'soda':
                mt = soda[int(x * 13 + row) % len(soda)]
                for d in range(3):
                    cyl('bottle', 0.034, 0.24, (x, -0.2 + d * 0.11, z + 0.132), mt, verts=10, r2=0.026)
                x += 0.078
            elif kind == 'juice':
                mt = juice[rnd.randrange(3)]
                for d in range(2):
                    box('juice', (0.065, 0.065, 0.2), (x, -0.18 + d * 0.12, z + 0.11), mt, bevel=0.008)
                x += 0.08
            else:
                for d in range(2):
                    box('milk', (0.1, 0.1, 0.2), (x, -0.16 + d * 0.15, z + 0.11), milk, bevel=0.015)
                    box('milk_lbl', (0.102, 0.06, 0.07), (x, -0.16 + d * 0.15, z + 0.1), label)
                x += 0.13


def market_shelf(m):
    """Sundry shelving, 1.2 m: dark laminate case, four shelves of single-serve chips, candy, pain-relief packets and
    travel toiletries, with white price strips."""
    W, D, H = 1.2, 0.42, 1.65
    box('back', (W, 0.02, H), (0, D / 2 - 0.01, H / 2), m['laminate_dark'])
    for x in (-W / 2 + 0.01, W / 2 - 0.01):
        box('side', (0.02, D, H), (x, 0, H / 2), m['laminate_dark'])
    box('kick', (W, D, 0.1), (0, 0, 0.05), m['laminate_dark'])
    rnd = random.Random(11)
    chips = [flat(c, 0.25, f'chip{i}') for i, c in enumerate(((0.85, 0.1, 0.08), (0.95, 0.75, 0.05), (0.1, 0.35, 0.8), (0.1, 0.55, 0.2), (0.45, 0.15, 0.55), (0.9, 0.45, 0.05)))]
    candy = [flat(c, 0.35, f'candy{i}') for i, c in enumerate(((0.35, 0.18, 0.08), (0.75, 0.05, 0.12), (0.95, 0.85, 0.15), (0.12, 0.12, 0.12), (0.1, 0.5, 0.75)))]
    toil = [flat(c, 0.3, f'toil{i}') for i, c in enumerate(((0.95, 0.95, 0.95), (0.2, 0.55, 0.85), (0.85, 0.9, 0.95), (0.2, 0.6, 0.35)))]
    for row, z in enumerate((0.1, 0.48, 0.86, 1.24)):
        box('shelf', (W - 0.04, D - 0.02, 0.02), (0, 0, z + 0.01), m['laminate_dark'])
        box('price_strip', (W - 0.04, 0.004, 0.035), (0, -D / 2 + 0.008, z + 0.0), flat((0.95, 0.95, 0.93), 0.5, 'strip'))
        x = -W / 2 + 0.07
        while x < W / 2 - 0.06:
            if row == 3:                       # chip bags, pillowy
                for d in range(2):
                    b = box('chips', (0.14, 0.05, 0.22), (x, -0.08 + d * 0.15, z + 0.13), chips[rnd.randrange(6)], bevel=0.02, segments=3)
                    smooth(b); b.rotation_euler = (R(rnd.uniform(-8, 4)), 0, R(rnd.uniform(-4, 4)))
                x += 0.155
            elif row == 2:                     # candy bars and boxes
                for d in range(4):
                    box('candy', (0.06, 0.08, 0.012 + 0.0), (x, -0.12 + d * 0.085, z + 0.026 + 0.0), candy[rnd.randrange(5)])
                    box('candy2', (0.06, 0.08, 0.012), (x, -0.12 + d * 0.085, z + 0.04), candy[rnd.randrange(5)])
                x += 0.075
            elif row == 1:                     # medicine packets and small boxes
                mt = flat((0.95, 0.95, 0.95), 0.4, 'med') if rnd.random() < 0.5 else flat((0.85, 0.15, 0.12), 0.4, 'med_red')
                for d in range(3):
                    box('med', (0.08, 0.03, 0.11), (x, -0.12 + d * 0.06, z + 0.075), mt)
                x += 0.1
            else:                              # travel toiletries
                mt = toil[rnd.randrange(4)]
                for d in range(3):
                    cyl('toiletry', 0.025, 0.12, (x, -0.12 + d * 0.08, z + 0.08), mt, verts=10)
                    cyl('toil_cap', 0.012, 0.025, (x, -0.12 + d * 0.08, z + 0.15), flat((0.12, 0.12, 0.14), 0.4, 'toil_cap'), verts=8)
                x += 0.07


def business_center(m):
    """Open business center counter, 1.9 m: oak top on a white laminate base, two all-in-one PCs with keyboards and
    mice, a networked laser printer on the end, a cable grommet."""
    W, D = 1.9, 0.65
    top = box('top', (W, D, 0.035), (0, 0, 0.745), m['oak'], bevel=0.003); uv_box(top, 0.8)
    for x in (-W / 2 + 0.02, W / 2 - 0.02):
        box('panel', (0.035, D - 0.04, 0.73), (x, 0, 0.365), m['white_paint'])
    box('modesty', (W - 0.06, 0.02, 0.45), (0, D / 2 - 0.04, 0.5), m['white_paint'])
    for i, x in enumerate((-0.55, 0.15)):
        aio = box(f'aio{i}', (0.56, 0.035, 0.36), (x, 0.12, 1.02), m['black'], bevel=0.008); aio.rotation_euler = (R(6), 0, 0)
        box(f'aio_screen{i}', (0.52, 0.004, 0.29), (x, 0.1, 1.04), m['led_blue']).rotation_euler = (R(6), 0, 0)
        box(f'aio_chin{i}', (0.56, 0.036, 0.04), (x, 0.13, 0.84), m['brushed'])
        box(f'aio_stand{i}', (0.06, 0.12, 0.08), (x, 0.17, 0.8), m['brushed'])
        box(f'kb{i}', (0.42, 0.13, 0.015), (x, -0.13, 0.77), m['charcoal'], bevel=0.003)
        box(f'mouse{i}', (0.055, 0.09, 0.025), (x + 0.3, -0.13, 0.775), m['charcoal'], bevel=0.012)
    box('printer', (0.42, 0.4, 0.3), (0.72, 0.05, 0.915), m['beige_plastic'], bevel=0.015)
    box('printer_top', (0.42, 0.2, 0.02), (0.72, 0.12, 1.075), m['charcoal'])
    box('printer_tray', (0.3, 0.16, 0.012), (0.72, -0.18, 0.86), m['charcoal'])
    box('paper', (0.21, 0.14, 0.01), (0.72, -0.17, 0.872), flat((0.97, 0.97, 0.96), 0.7, 'paper'))
    box('printer_panel', (0.1, 0.004, 0.04), (0.6, -0.15, 1.03), m['led_blue'])
    cyl('grommet', 0.03, 0.006, (-0.2, 0.25, 0.765), m['black'], verts=16)


def task_chair(m):
    """Mesh-back task chair on a five-star base with casters, seat 0.47 m."""
    s = box('seat', (0.48, 0.46, 0.07), (0, 0, 0.47), m['charcoal'], bevel=0.025, segments=4); smooth(s)
    mesh = material('chair_mesh', color=(0.05, 0.05, 0.055), roughness=0.8)
    bk = box('back', (0.44, 0.04, 0.48), (0, 0.24, 0.8), mesh, bevel=0.03, segments=4); smooth(bk); bk.rotation_euler = (R(-8), 0, 0)
    box('spine', (0.05, 0.03, 0.3), (0, 0.24, 0.56), m['black'])
    cyl('gas', 0.025, 0.25, (0, 0, 0.32), m['brushed'], verts=12)
    for k in range(5):
        a = k * 2 * math.pi / 5
        arm = box('star', (0.3, 0.04, 0.03), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.08), m['black'])
        arm.rotation_euler = (0, 0, a)
        cyl('caster', 0.025, 0.03, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.03), m['black'], verts=10, rotation=(R(90), 0, a))
    for x in (-0.25, 0.25):
        box('armrest', (0.05, 0.24, 0.025), (x, 0.0, 0.66), m['black'], bevel=0.008)
        box('arm_post', (0.025, 0.03, 0.17), (x, 0.0, 0.56), m['black'])


ASSETS = {
    'hotel-checkin-pod': (checkin_pod, dict(distance=3.0, height=1.6, target=(0, 0, 0.7))),
    'hotel-sectional': (sectional, dict(distance=4.6, height=2.0, target=(0.2, -0.3, 0.4))),
    'hotel-lounge-chair-navy': (lounge_chair, dict(distance=1.9, height=1.1, target=(0, 0, 0.45))),
    'hotel-communal-table': (communal_table, dict(distance=4.2, height=2.0, target=(0, 0, 0.8))),
    'hotel-bar-stool': (bar_stool, dict(distance=1.6, height=1.1, target=(0, 0, 0.5))),
    'hotel-market-cooler': (market_cooler, dict(distance=3.2, height=1.4, target=(0, 0, 1.0), yaw=20)),
    'hotel-market-shelf': (market_shelf, dict(distance=2.6, height=1.3, target=(0, 0, 0.8), yaw=20)),
    'hotel-business-center': (business_center, dict(distance=2.8, height=1.6, target=(0, 0, 0.8))),
    'hotel-task-chair': (task_chair, dict(distance=1.8, height=1.1, target=(0, 0, 0.5))),
}

def merge():
    """Join every mesh that shares a material: the cooler's 250 bottles become a handful of draw calls in three.js."""
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        groups.setdefault(o.data.materials[0].name if o.data.materials else '', []).append(o)
    for name, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = name or 'mesh'


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, view = ASSETS[name]
        reset()
        build(kit(mats()))
        merge()
        preview(os.path.join(SHOTS, name + '.png'), samples=24, **view)
        export(os.path.join(OUT, name + '.glb'), name)

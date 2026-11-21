# SPDX-License-Identifier: CC0-1.0
# Room 212 case goods and fittings (2026-11-21), built the way hotel case goods are built: 18 mm particleboard panels
# with a wood-print laminate face and PVC edge banding, overlay drawer fronts on white melamine drawer boxes running
# on steel slides, hinged doors, flush power modules. Origin at floor centre; front faces Blender -Y (three.js +Z).
# Animated parts are separate named nodes with their origin on the pivot and glTF extras saying how they move:
#   drawer_*  {kind: drawer, slide: metres along local -Y (three.js +Z)}
#   door_*    {kind: door, axis: z|x, open: radians}
#   outlet_*, usb_*  {kind: outlet|usb}: plug targets;  take_*: loose props.
#   blender -b --python projects/roadside-inn/blender/room.py -- [asset ...]
import bpy, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, mats
from lobby import merge, OUT, SHOTS
from sofa import uv_real, apply_mods
from kit21 import (mat, printed, printed_mat, laminate, edge_band, lam_panel, pull, unit, receptacle, shot, uv_turn,
                   LINEN, R, ROOM)
from props import lathe

T = 0.018                       # carcass panel thickness


def melamine():
    return mat('melamine_white', color=(0.86, 0.85, 0.82), roughness=0.4)


def steel_slide():
    return mat('slide_zinc', color=(0.7, 0.71, 0.72), roughness=0.4, metallic=1.0)


def drawer(name, x, w, z0, h, d, front_y, box_h=None, box_w=None, slide=None):
    """An overlay drawer: laminate front (w x h, 18 mm, banded) on a white melamine box (12 mm sides, 6 mm bottom).
    front_y is the carcass front plane; the front sits proud of it. Returns the node."""
    box_h = box_h or max(0.06, h - 0.06); box_w = box_w or w - 0.05
    fy = front_y - T / 2
    parts = [lam_panel(name, (w, T, h), (x, fy, z0 + h / 2))]
    by0 = front_y + 0.001; bd = d - 0.03; bz = z0 + 0.015
    mm = melamine()
    for sx in (-1, 1):
        parts.append(box(name + '_side', (0.012, bd, box_h), (x + sx * (box_w / 2 - 0.006), by0 + bd / 2, bz + box_h / 2), mm, bevel=0.001))
    parts.append(box(name + '_back', (box_w - 0.024, 0.012, box_h - 0.01), (x, by0 + bd - 0.006, bz + (box_h - 0.01) / 2 + 0.01), mm))
    parts.append(box(name + '_sub', (box_w - 0.024, bd - 0.012, 0.012), (x, by0 + (bd - 0.012) / 2, bz + 0.006), mm))   # drawer sub-front
    parts.append(box(name + '_bottom', (box_w - 0.02, bd - 0.01, 0.006), (x, by0 + bd / 2, bz + 0.003), mm))
    parts += pull(name + '_pull', (x, front_y - T, z0 + h / 2 + (h * 0.25 if h > 0.3 else 0)))
    return unit(name, parts, (x, front_y, z0), kind='drawer', slide=slide or round(bd * 0.8, 3))


def slides(x, w, z, d, front_y):
    """The steel slide pair the drawer runs on (fixed to the carcass sides)."""
    for sx in (-1, 1):
        box('slide', (0.011, d - 0.04, 0.03), (x + sx * (w / 2 - 0.0055), front_y + (d - 0.04) / 2 + 0.005, z), steel_slide())


def carcass(W, D, z0, z1, shelves=(), back=True, top=0.025, overhang=0.012):
    """Two sides, a bottom, a back and a top (overhanging a little at the front and sides), fixed shelves at z."""
    zc = (z0 + z1) / 2
    for sx in (-1, 1):
        lam_panel('side', (T, D, z1 - z0), (sx * (W / 2 - T / 2), 0, zc))
    lam_panel('bottom', (W - 2 * T, D - 0.006, T), (0, -0.003, z0 + T / 2))
    for z in shelves:
        lam_panel('shelf', (W - 2 * T, D - 0.006, T), (0, -0.003, z))
    if back:
        box('back', (W - 2 * T, 0.005, z1 - z0 - T), (0, D / 2 - 0.0025, zc + T / 2), melamine())
    lam_panel('top', (W + overhang, D + overhang, top), (0, -overhang / 2, z1 + top / 2))


def power_module(x, y, z, length=0.17):
    """Flush desk-top power module: a black bezel, two NEMA 5-15 receptacles, a USB-A and a USB-C port, each a node."""
    blk = mat('module_black', color=(0.025, 0.025, 0.028), roughness=0.45)
    slot = mat('slot_dark', color=(0.005, 0.005, 0.005), roughness=0.9)
    printed('module_face', length, 0.07, (x, y, z + 0.002), 'power_face', printed_mat(0.45, name='module_face'), depth=0.004, bevel=0.002, normal=(0, 0, 1))
    xs = [x - length / 2 + 0.03 + i * 0.042 for i in range(2)]
    for i, ox in enumerate(xs):
        unit(f'outlet_{i}', receptacle(f'outlet_{i}', (ox, y + 0.004, z + 0.004), blk, slot), (ox, y, z + 0.008), kind='outlet', standard='NEMA 5-15R')
    ux = x + length / 2 - 0.05
    usb_a = [box('usb_a', (0.0135, 0.0065, 0.002), (ux, y + 0.006, z + 0.0045), slot), box('usb_a_tongue', (0.011, 0.0018, 0.0008), (ux, y + 0.0068, z + 0.0055), mat('usb_tongue', color=(0.9, 0.9, 0.9), roughness=0.4))]
    unit('usb_a', usb_a, (ux, y + 0.006, z + 0.006), kind='usb', standard='USB-A')
    usb_c = [box('usb_c', (0.0095, 0.0036, 0.002), (ux + 0.026, y + 0.006, z + 0.0045), slot, bevel=0.0015)]
    unit('usb_c', usb_c, (ux + 0.026, y + 0.006, z + 0.006), kind='usb', standard='USB-C')


def bible(loc, rot=(0, 0, 0)):
    """A placed hardback Bible, 135 x 200 x 32 mm: navy leatherette boards stamped in gold, a cream page block, a
    spine. Built upright (cover facing -Y), then laid where it goes. Node take_bible."""
    W, H, D = 0.135, 0.2, 0.032
    pm = printed_mat(0.55, name='bible_print')
    parts = [printed('take_bible', W, H, (0, -D / 2 + 0.00125, H / 2), 'bible_front', pm, depth=0.0025, bevel=0.0008),
             printed('bible_back', W, H, (0, D / 2 - 0.00125, H / 2), 'bible_front', pm, depth=0.0025, bevel=0.0008, normal=(0, 1, 0)),
             printed('bible_spine', D, H, (-W / 2 + 0.0015, 0, H / 2), 'bible_spine', pm, depth=0.003, bevel=0.0008, normal=(-1, 0, 0)),
             printed('bible_pages', W - 0.006, H - 0.006, (0.002, 0, H / 2), 'bible_pages', printed_mat(0.85, name='bible_pages'), depth=D - 0.005, normal=(1, 0, 0))]
    b = unit('take_bible', parts, (0, 0, 0), kind='book', title='Holy Bible')
    b.location = loc; b.rotation_euler = rot
    return b


# ---------------------------------------------------------------- nightstand (R11, R15)
def nightstand(m):
    """Hotel nightstand 520 x 420 x 572 mm: banded laminate carcass on a recessed plinth, an open shelf, one drawer
    (with the Bible in it), a flush power module at the back of the top."""
    W, D, H = 0.52, 0.42, 0.572
    carcass(W, D, 0.05, H - 0.025, shelves=(0.30,))
    box('plinth', (W - 0.06, D - 0.08, 0.05), (0, 0.02, 0.025), m['black'])
    dz0 = 0.30 + T / 2 + 0.004
    slides(0, W - 2 * T, dz0 + 0.06, D, -D / 2)
    drawer('drawer_nightstand', 0, W - 0.004, dz0, H - 0.025 - dz0 - 0.004, D, -D / 2, box_h=0.12, box_w=W - 2 * T - 0.026)
    bible((0.12, -0.03, dz0 + 0.015 + 0.006 + 0.0162), (R(-90), 0, R(90)))
    power_module(-0.1, 0.12, H)


# ---------------------------------------------------------------- table lamp (R13)
def lampshade_mats():
    shade = bpy.data.materials.get('lampshade') or material('lampshade', maps=LINEN, roughness=0.95, normal_strength=0.6)
    lining = mat('shade_lining', color=(0.93, 0.92, 0.88), roughness=0.9)
    return shade, lining


def table_lamp(m):
    """Hotel bedside lamp, 650 mm: a weighted square dark-bronze base and column (felt underneath), a socket with a
    turn knob, a harp and finial, and a hardback linen drum shade (paper lining inside, rolled edges) on a spider."""
    bronze = mat('bronze', color=(0.16, 0.1, 0.06), roughness=0.38, metallic=1.0)
    box('felt', (0.136, 0.136, 0.002), (0, 0, 0.001), mat('felt', color=(0.02, 0.02, 0.02), roughness=1.0))
    b = box('base', (0.14, 0.14, 0.026), (0, 0, 0.015), bronze, bevel=0.004, segments=3); smooth(b)
    lathe('column', [(0.0, 0.028), (0.03, 0.028), (0.03, 0.036), (0.013, 0.05), (0.012, 0.36), (0.02, 0.37), (0.02, 0.385), (0.011, 0.39), (0.0, 0.39)], bronze, segs=24)
    lathe('socket', [(0.0, 0.39), (0.017, 0.392), (0.018, 0.44), (0.0125, 0.45), (0.0, 0.45)], bronze, segs=24)
    cyl('switch', 0.004, 0.02, (0.022, 0, 0.42), bronze, verts=10, rotation=(0, R(90), 0))
    cyl('switch_knob', 0.007, 0.006, (0.033, 0, 0.42), bronze, verts=12, rotation=(0, R(90), 0))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, segments=20, ring_count=12, location=(0, 0, 0.485)); bulb = bpy.context.object
    bulb.data.materials.append(m['led']); smooth(bulb)
    cyl('bulb_neck', 0.013, 0.03, (0, 0, 0.458), m['steel'], verts=16)
    # harp: two legs from the saddle rising to the top, a bronze finial over the spider
    import desk
    for sx in (-1, 1):
        h = desk.cable('harp', [(sx * 0.02, 0, 0.395), (sx * 0.075, 0, 0.47), (sx * 0.05, 0, 0.6), (0, 0, 0.632)], r=0.0018)
        h.data.materials[0] = bronze
    shade, lining = lampshade_mats()
    r0, r1, z0, z1 = 0.19, 0.18, 0.395, 0.645
    s = cyl('shade', r0, z1 - z0, (0, 0, (z0 + z1) / 2), shade, verts=64, r2=r1)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(s.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES_ONLY')
    bm.to_mesh(s.data); bm.free()
    s.data.materials.append(lining)
    sol = s.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = 0.0015; sol.material_offset = 1; sol.offset = -1
    apply_mods(s); uv_real(s, 0.32)
    for r, z in ((r0, z0), (r1, z1)):                       # rolled edges where the fabric wraps the rings
        bpy.ops.mesh.primitive_torus_add(major_radius=r - 0.0006, minor_radius=0.0028, major_segments=64, minor_segments=6, location=(0, 0, z))
        t = bpy.context.object; t.data.materials.append(shade); smooth(t)
    for a in (0, 120, 240):                                 # spider arms to the washer at the finial
        ca, sa = math.cos(R(a)), math.sin(R(a))
        cyl('spider', 0.0012, r1 - 0.012, ((r1 / 2) * ca, (r1 / 2) * sa, z1 - 0.012), bronze, verts=6, rotation=(0, R(90), R(a)))
    cyl('washer', 0.012, 0.003, (0, 0, z1 - 0.012), bronze, verts=16)
    lathe('finial', [(0.0, z1 - 0.01), (0.006, z1 - 0.008), (0.012, z1 + 0.004), (0.01, z1 + 0.016), (0.0, z1 + 0.02)], bronze, segs=16)


# ---------------------------------------------------------------- micro-fridge (R10)
def microfridge(m):
    """Laminate surround with a microwave over a 3.1 cu ft compact fridge (Danby-MicroFridge class, ~0.48 x 0.5 x 0.84 m).
    The fridge is hollow: a black steel cabinet, a white ABS liner, a small top freezer compartment with its own flap
    (door_freezer), a drip tray, two wire racks, a thermostat dial. The door (fridge_door, hinged on -X) carries the
    gasket and a moulded liner with a shelf and a bottle bin, and one ketchup packet."""
    for x in (-0.3, 0.3):
        lam_panel('surround_side', (T, 0.56, 1.55), (x, 0, 0.775))
    lam_panel('surround_top', (0.63, 0.58, 0.025), (0, -0.01, 1.5625))
    lam_panel('surround_shelf', (0.582, 0.54, T), (0, 0.0, 0.88))
    box('surround_back', (0.582, 0.005, 1.55), (0, 0.2775, 0.775), melamine())
    cab = mat('fridge_black', color=(0.025, 0.025, 0.027), roughness=0.35)
    liner = mat('fridge_liner', color=(0.92, 0.92, 0.9), roughness=0.25)
    W, D, H, z0 = 0.48, 0.47, 0.82, 0.03
    yf = -0.22                                              # cabinet front plane
    wall = 0.035
    for sx in (-1, 1):                                      # cabinet: sides, top, bottom, back (hollow)
        box('fridge_side', (wall, D, H), (sx * (W / 2 - wall / 2), yf + D / 2, z0 + H / 2), cab, bevel=0.003)
    box('fridge_top', (W, D, wall), (0, yf + D / 2, z0 + H - wall / 2), cab, bevel=0.003)
    box('fridge_bottom', (W, D, 0.05), (0, yf + D / 2, z0 + 0.025), cab, bevel=0.003)
    box('fridge_backwall', (W, 0.05, H), (0, yf + D - 0.025, z0 + H / 2), cab)
    iw, ih = W - 2 * wall, H - wall - 0.05
    for sx in (-1, 1):                                      # liner skins inside (white ABS), shelf ribs moulded in
        box('liner_side', (0.002, D - 0.06, ih), (sx * (iw / 2 - 0.001), yf + (D - 0.06) / 2 + 0.005, z0 + 0.05 + ih / 2), liner)
        for z in (0.27, 0.47):
            box('liner_rib', (0.008, D - 0.1, 0.006), (sx * (iw / 2 - 0.006), yf + (D - 0.1) / 2 + 0.03, z0 + z - 0.008), liner, bevel=0.002)
    box('liner_back', (iw, 0.002, ih), (0, yf + D - 0.051, z0 + 0.05 + ih / 2), liner)
    box('liner_floor', (iw, D - 0.06, 0.002), (0, yf + (D - 0.06) / 2 + 0.005, z0 + 0.051), liner)
    box('liner_ceiling', (iw, D - 0.06, 0.002), (0, yf + (D - 0.06) / 2 + 0.005, z0 + H - wall - 0.001), liner)
    # freezer compartment: an aluminium evaporator box across the top, its flap door hinged at the bottom edge
    alu = mat('evaporator', color=(0.8, 0.8, 0.79), roughness=0.35, metallic=1.0)
    fz0, fh = z0 + H - wall - 0.15, 0.145
    box('freezer_floor', (iw - 0.01, D - 0.12, 0.004), (0, yf + (D - 0.12) / 2 + 0.05, fz0), alu)
    for sx in (-1, 1):
        box('freezer_wall', (0.004, D - 0.12, fh), (sx * (iw / 2 - 0.007), yf + (D - 0.12) / 2 + 0.05, fz0 + fh / 2), alu)
    fd = [box('door_freezer', (iw - 0.02, 0.012, fh - 0.01), (0, yf + 0.045, fz0 + fh / 2), liner, bevel=0.003),
          box('freezer_lip', (0.08, 0.016, 0.012), (0, yf + 0.037, fz0 + fh - 0.02), liner, bevel=0.003)]
    unit('door_freezer', fd, (0, yf + 0.045, fz0 + 0.005), kind='door', axis='x', open=1.45)
    tray = material('drip_tray', color=(0.85, 0.88, 0.9), roughness=0.1, alpha=0.5)
    box('drip_tray', (iw - 0.03, D - 0.14, 0.012), (0, yf + (D - 0.14) / 2 + 0.06, fz0 - 0.02), tray, bevel=0.002)
    # two wire racks on the ribs: a frame and rods (chromed steel wire)
    wire = mat('rack_wire', color=(0.85, 0.85, 0.86), roughness=0.2, metallic=1.0)
    for z in (0.27, 0.47):
        zz = z0 + z; rd = D - 0.12; ry = yf + rd / 2 + 0.04
        for sy in (-1, 1):
            cyl('rack_frame', 0.0025, iw - 0.016, (0, ry + sy * rd / 2, zz), wire, verts=6, rotation=(0, R(90), 0))
        for sx in (-1, 1):
            cyl('rack_frame', 0.0025, rd, (sx * (iw / 2 - 0.008), ry, zz), wire, verts=6, rotation=(R(90), 0, 0))
        for i in range(13):
            cyl('rack_rod', 0.0015, rd, (-iw / 2 + 0.02 + i * (iw - 0.04) / 12, ry, zz + 0.003), wire, verts=6, rotation=(R(90), 0, 0))
    dial = printed('fridge_dial', 0.05, 0.05, (iw / 2 - 0.008, yf + 0.12, z0 + H - wall - 0.21), 'fridge_dial', printed_mat(0.4, name='fridge_dial'), depth=0.012, normal=(-1, 0, 0))
    # the door: skin, liner tub, gasket, door shelf and bottle bin, a recessed grip on the free edge
    dy = yf - 0.0
    hinge = (-W / 2, dy - 0.06, z0)
    parts = [box('fridge_door', (W, 0.03, H), (0, dy - 0.045, z0 + H / 2), cab, bevel=0.006)]
    parts.append(box('door_liner', (W - 0.07, 0.02, H - 0.08), (0, dy - 0.02, z0 + H / 2), liner, bevel=0.01))
    gasket = mat('gasket', color=(0.25, 0.25, 0.26), roughness=0.7)
    for (sx, sz, lx, lz) in ((W - 0.02, 0.016, 0, H / 2 - 0.018), (W - 0.02, 0.016, 0, -H / 2 + 0.018), (0.016, H - 0.02, W / 2 - 0.018, 0), (0.016, H - 0.02, -W / 2 + 0.018, 0)):
        parts.append(box('gasket', (sx, 0.012, sz), (lx, dy - 0.024, z0 + H / 2 + lz), gasket, bevel=0.004))
    for z, lip in ((0.62, 0.035), (0.2, 0.08)):             # a shallow shelf high up, a deep bottle bin low down
        zz = z0 + z
        parts.append(box('door_shelf', (W - 0.1, 0.085, 0.004), (0, dy + 0.03, zz), liner, bevel=0.0015))
        parts.append(box('door_lip', (W - 0.1, 0.004, lip), (0, dy + 0.072, zz + lip / 2), liner, bevel=0.0015))
        for sx in (-1, 1):
            parts.append(box('door_cheek', (0.004, 0.085, lip), (sx * (W / 2 - 0.05), dy + 0.03, zz + lip / 2), liner))
    parts.append(printed('fridge_badge', 0.11, 0.022, (0, dy - 0.0605, z0 + H - 0.06), 'fridge_badge', printed_mat(0.3, name='fridge_badge'), depth=0.0015, bevel=0.0005))
    grip = box('door_grip', (0.02, 0.012, 0.3), (W / 2 - 0.02, dy - 0.064, z0 + H - 0.25), cab, bevel=0.004)
    parts.append(grip)
    unit('fridge_door', parts, hinge, kind='door', axis='z', open=-1.6)
    # one ketchup packet left on the door shelf by a previous guest
    from props import pillow
    k = pillow('take_ketchup', 0.045, 0.03, 0.004, ROOM['ketchup'], printed_mat(0.3, name='ketchup'), (0.06, yf + 0.16, z0 + 0.47 + 0.0075), (R(-90), 0, R(12)), crimp=0.004, nx=4, nz=4)
    k['kind'] = 'condiment'
    for x in (-0.2, 0.2):
        for y in (-0.18, 0.2):
            cyl('fridge_foot', 0.012, 0.03, (x, y, 0.015), m['black'], verts=10)
    # microwave on the shelf (stainless, smoked window, keypad)
    box('microwave', (0.52, 0.38, 0.3), (0, 0.04, 0.889 + 0.15), m['steel'], bevel=0.008)
    box('mw_window', (0.32, 0.005, 0.2), (-0.07, -0.152, 1.04), m['glass_dark'], bevel=0.004)
    box('mw_panel', (0.1, 0.005, 0.24), (0.18, -0.152, 1.04), m['black'])
    for r in range(4):
        for c in range(3):
            box('mw_key', (0.02, 0.004, 0.014), (0.155 + c * 0.025, -0.156, 0.99 + r * 0.025), m['steel'], bevel=0.001)
    box('mw_display', (0.07, 0.004, 0.02), (0.18, -0.156, 1.125), m['led'])


# ---------------------------------------------------------------- desk (R11)
def desk(m):
    """1.3 m writing desk: banded laminate top, a two-drawer pedestal (box drawer over file drawer), a steel sled leg,
    a modesty panel, a grommet power module at the back of the top."""
    lam_panel('top', (1.3, 0.6, 0.032), (0, 0, 0.7415))
    PX, PW, PD = 0.42, 0.42, 0.56
    zc = 0.06 + (0.7255 - 0.06) / 2
    for sx in (-1, 1):
        lam_panel('ped_side', (T, PD, 0.7255 - 0.06), (PX + sx * (PW / 2 - T / 2), 0.0, zc))
    lam_panel('ped_bottom', (PW - 2 * T, PD - 0.006, T), (PX, -0.003, 0.06 + T / 2))
    box('ped_back', (PW - 2 * T, 0.005, 0.66), (PX, PD / 2 - 0.0025, zc), melamine())
    box('ped_plinth', (PW - 0.04, PD - 0.06, 0.06), (PX, 0.02, 0.03), m['black'])
    lam_panel('ped_rail', (PW - 2 * T, PD - 0.006, T), (PX, -0.003, 0.52))
    slides(PX, PW - 2 * T, 0.6, PD, -PD / 2); slides(PX, PW - 2 * T, 0.2, PD, -PD / 2)
    drawer('drawer_desk_top', PX, PW - 0.004, 0.532, 0.19, PD, -PD / 2, box_h=0.1, box_w=PW - 2 * T - 0.026)
    drawer('drawer_desk_file', PX, PW - 0.004, 0.082, 0.432, PD, -PD / 2, box_h=0.26, box_w=PW - 2 * T - 0.026)
    lam_panel('modesty', (0.78, T, 0.34), (-0.18, 0.26, 0.555))
    steel = m['charcoal']
    for y in (-0.26, 0.26):
        box('leg', (0.03, 0.03, 0.69), (-0.6, y, 0.375), steel, bevel=0.004)
    box('foot', (0.03, 0.56, 0.03), (-0.6, 0, 0.015), steel, bevel=0.004)
    box('rail', (0.03, 0.56, 0.03), (-0.6, 0, 0.71), steel, bevel=0.004)
    for y in (-0.27, 0.27):
        cyl('glide', 0.012, 0.006, (-0.6, y, 0.003), m['black'], verts=12)
    power_module(-0.3, 0.22, 0.7575)


# ---------------------------------------------------------------- credenza + TV
def credenza_tv(m):
    """2.4 m TV credenza: three bays, each a drawer over a hinged door, on black steel legs; a laminate wall panel and
    a 55-inch TV (tv_screen keeps its name: the game draws the picture there)."""
    L, D = 2.4, 0.5
    z0, z1 = 0.13, 0.7375
    zc = (z0 + z1) / 2
    for x in (-L / 2 + T / 2, -L / 6, L / 6, L / 2 - T / 2):
        lam_panel('cred_side', (T, D, z1 - z0), (x, 0, zc))
    lam_panel('cred_bottom', (L - 2 * T, D - 0.006, T), (0, -0.003, z0 + T / 2))
    box('cred_back', (L - 2 * T, 0.005, z1 - z0), (0, D / 2 - 0.0025, zc), melamine())
    lam_panel('cred_top', (L + 0.012, D + 0.012, 0.035), (0, -0.006, z1 + 0.0175))
    bw = L / 3
    for i in range(3):
        cx = -L / 3 + i * bw
        lam_panel('cred_rail', (bw - T, D - 0.006, T), (cx, -0.003, 0.56))
        slides(cx, bw - T, 0.64, D, -D / 2)
        drawer(f'drawer_{i}', cx, bw - 0.006, 0.572, 0.16, D, -D / 2, box_h=0.1, box_w=bw - T - 0.026)
        hx = cx - bw / 2 + 0.003
        parts = [lam_panel(f'door_{i}', (bw - 0.006, T, 0.42), (cx, -D / 2 - T / 2, z0 + 0.005 + 0.21))]
        parts += pull(f'door_{i}_pull', (cx + bw / 2 - 0.06, -D / 2 - T, z0 + 0.32), axis='z', length=0.096)
        unit(f'door_{i}', parts, (hx, -D / 2 - T / 2, z0), kind='door', axis='z', open=-1.75)
        box('cred_shelf', (bw - T - 0.004, D - 0.04, T), (cx, 0.01, z0 + 0.22), laminate())
    for x in (-L / 2 + 0.06, L / 2 - 0.06):
        for y in (-0.18, 0.2):
            cyl('leg', 0.015, 0.13, (x, y, 0.065), m['black'], verts=12)
    lam_panel('wall_panel', (L + 0.2, 0.019, 0.95), (0, 0.245, 0.8 + 0.475))
    tv_w, tv_h = 1.24, 0.71
    box('tv_body', (tv_w + 0.02, 0.035, tv_h + 0.02), (0, 0.2, 1.25), m['black'], bevel=0.006)
    box('tv_screen', (tv_w, 0.002, tv_h), (0, 0.181, 1.25), m['screen'])
    box('tv_mount', (0.3, 0.02, 0.2), (0, 0.226, 1.25), m['charcoal'])


# ---------------------------------------------------------------- headboard (R8)
def headboard(m):
    """Wall-hung laminate headboard 2.1 x 1.4 m (the Comfort Inn reference: a raised border round vertical boards):
    a 19 mm backer, 100 mm banded stiles and rails proud of it, four vertical boards with V-grooves between, hung on a
    French cleat so it stands 20 mm off the wall (a shadow line all round). Back face at +Y = wall."""
    W, H, zb = 2.1, 1.4, 0.42
    yb = 0.02 - 0.0095                                     # backer centre: its back face 20 mm off the wall plane y=0.02+... (cleat)
    lam_panel('backer', (W, 0.019, H), (0, yb, zb + H / 2))
    fy = yb - 0.019
    for sx in (-1, 1):
        s = lam_panel('stile', (0.1, 0.019, H), (sx * (W / 2 - 0.05), fy, zb + H / 2)); uv_turn(s)
    for z in (zb + 0.05, zb + H - 0.05):
        lam_panel('rail', (W - 0.2, 0.019, 0.1), (0, fy, z))
    n = 4; bw = (W - 0.2) / n
    for i in range(n):                                     # boards with a 3 mm V-groove between (eased edges)
        b = lam_panel('board', (bw - 0.004, 0.012, H - 0.2), (-W / 2 + 0.1 + bw * (i + 0.5), fy + 0.0035, zb + H / 2), bevel=0.0018); uv_turn(b)
    box('cleat', (W - 0.3, 0.02, 0.08), (0, 0.03, zb + H - 0.15), mat('cleat', color=(0.3, 0.27, 0.22), roughness=0.8))
    box('spacer', (W - 0.3, 0.02, 0.05), (0, 0.03, zb + 0.15), mat('cleat', color=(0.3, 0.27, 0.22), roughness=0.8))


# ---------------------------------------------------------------- bath amenities (R18) and toilet paper (R19)
def bath_amenities(m):
    """On a small white melamine tray: a pleat-wrapped 30 g bar soap and three 30 ml amenity bottles (shampoo,
    conditioner, lotion) with flip caps. Each is a loose prop."""
    tray = box('tray', (0.22, 0.1, 0.01), (0, 0, 0.005), mat('tray_white', color=(0.93, 0.93, 0.91), roughness=0.3), bevel=0.003, segments=3)
    smooth(tray)
    # wrapped soap: a rounded bar under pleated paper (the print wraps it; the folded ends are pinched)
    w, d, h = 0.07, 0.045, 0.018
    s = box('take_soap', (w, d, h), (-0.065, 0, 0.01 + h / 2), printed_mat(0.75, name='soap_wrap'), bevel=0.004, segments=2)
    from kit21 import face_uv
    face_uv(s, ROOM['soap_wrap'], (0, 0, 1)); s['kind'] = 'soap'
    for sx in (-1, 1):
        box('soap_fold', (0.004, d * 0.9, h * 0.7), (-0.065 + sx * (w / 2 + 0.001), 0, 0.01 + h / 2), mat('soap_paper', color=(0.93, 0.91, 0.86), roughness=0.8), bevel=0.0015)
    prof = [(0.0, 0.0), (0.014, 0.0), (0.0155, 0.004), (0.0155, 0.075), (0.012, 0.085), (0.007, 0.09), (0.007, 0.094)]
    caps = {'bottle_sh': (0.12, 0.23, 0.39), 'bottle_co': (0.35, 0.42, 0.23), 'bottle_lo': (0.54, 0.35, 0.17)}
    for i, key in enumerate(('bottle_sh', 'bottle_co', 'bottle_lo')):
        x = 0.0 + i * 0.036
        u0, v0, u1, v1 = ROOM[key]
        b = lathe(f'take_{key[7:]}', prof, printed_mat(0.25, name='bottle_label'), loc=(x, 0.005, 0.01), segs=24, rect=(u0, v0, u1, v1))
        b['kind'] = 'amenity'
        c = cyl(f'take_{key[7:]}_cap', 0.0085, 0.016, (x, 0.005, 0.01 + 0.102), mat(f'cap_{key}', color=caps[key], roughness=0.3), verts=20, bevel=0.002)
        c.parent = b; c.matrix_parent_inverse = b.matrix_world.inverted()


def toilet_paper(m):
    """Chrome two-post toilet tissue holder (two 56 mm roses, a spring roller between) with a 114 mm roll hung over
    the front, its first sheets hanging. Wall at +Y; origin at the wall, centre. Roll node take_toilet_paper."""
    ch = m['chrome']
    for sx in (-1, 1):
        cyl('rose', 0.028, 0.008, (sx * 0.075, -0.004, 0), ch, verts=32, bevel=0.002, rotation=(R(90), 0, 0))
        cyl('arm', 0.008, 0.07, (sx * 0.075, -0.043, 0), ch, verts=16, rotation=(R(90), 0, 0))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0095, segments=16, ring_count=8, location=(sx * 0.075, -0.078, 0)); k = bpy.context.object
        k.data.materials.append(ch); smooth(k)
    paper = mat('tissue', color=(0.95, 0.95, 0.94), roughness=0.95)
    core = mat('tissue_core', color=(0.52, 0.4, 0.27), roughness=0.9)
    cyl('roller', 0.0095, 0.13, (0, -0.072, 0), mat('roller_white', color=(0.9, 0.9, 0.88), roughness=0.4), verts=16, rotation=(0, R(90), 0))
    roll = lathe('take_toilet_paper', [(0.0215, -0.057), (0.056, -0.057), (0.0575, -0.054), (0.0575, 0.054), (0.056, 0.057), (0.0215, 0.057), (0.0205, 0.0), (0.0215, -0.057)], paper, loc=(0, -0.072, 0), rot=(0, R(90), 0), segs=40, caps=False)
    roll['kind'] = 'toilet paper'
    c = cyl('tp_core', 0.0215, 0.112, (0, -0.072, 0), core, verts=24, rotation=(0, R(90), 0))
    c.parent = roll; c.matrix_parent_inverse = roll.matrix_world.inverted()
    # the tail: over the front, hanging 90 mm, a slight curl
    import bmesh
    me = bpy.data.meshes.new('tail'); bm = bmesh.new(); prev = None
    pts = [(-0.072 - 0.0578 * math.sin(a), 0.0578 * math.cos(a)) for a in [i * math.pi / 8 for i in range(5)]] + [(-0.1298 - 0.002 * i, -0.01 - 0.02 * i) for i in range(1, 6)]
    rows = []
    for y, z in pts:
        rows.append([bm.verts.new((x, y, z)) for x in (-0.055, 0.055)])
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    bm.to_mesh(me); bm.free()
    t = bpy.data.objects.new('tp_tail', me); bpy.context.scene.collection.objects.link(t); me.materials.append(paper)
    sol = t.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.0006
    t.parent = roll; t.matrix_parent_inverse = roll.matrix_world.inverted()


ASSETS = {
    'hotel-nightstand': (nightstand, dict(cam=(0.75, -1.1, 0.95), target=(0, 0, 0.32)), dict(cam=(0.05, -0.35, 0.85), target=(-0.08, 0.08, 0.57))),
    'hotel-table-lamp': (table_lamp, dict(cam=(0.6, -1.0, 0.6), target=(0, 0, 0.32)), dict(cam=(0.15, -0.35, 0.62), target=(0, 0, 0.55))),
    'hotel-microfridge': (microfridge, dict(cam=(0.9, -1.8, 1.3), target=(0, 0, 0.75)), dict(cam=(0.25, -0.75, 0.75), target=(0, 0, 0.45))),
    'hotel-desk': (desk, dict(cam=(1.2, -1.8, 1.3), target=(0, 0, 0.45)), dict(cam=(0.2, -0.6, 1.0), target=(0.0, 0.1, 0.74))),
    'hotel-credenza-tv': (credenza_tv, dict(cam=(1.5, -3.0, 1.4), target=(0, 0, 0.8)), dict(cam=(0.5, -0.9, 0.7), target=(0.2, -0.25, 0.5))),
    'hotel-headboard': (headboard, dict(cam=(1.2, -3.2, 1.4), target=(0, 0, 1.1)), dict(cam=(0.95, -0.55, 1.6), target=(0.9, 0, 1.55))),
    'hotel-bath-amenities': (bath_amenities, dict(cam=(0.15, -0.4, 0.25), target=(0, 0, 0.04)), dict(cam=(0.0, -0.18, 0.08), target=(0.0, 0, 0.05))),
    'hotel-toilet-paper': (toilet_paper, dict(cam=(0.25, -0.45, 0.1), target=(0, -0.06, 0)), dict(cam=(0.05, -0.22, 0.03), target=(0, -0.07, 0))),
}
OPEN = {'hotel-nightstand': ['drawer_nightstand'], 'hotel-microfridge': ['fridge_door', 'door_freezer'], 'hotel-desk': ['drawer_desk_top'], 'hotel-credenza-tv': ['drawer_0', 'door_1']}


def open_all(names, amount=1.0):
    """Pose the named nodes open (for an 'open' preview): drawers slide, doors swing."""
    for n in names:
        o = bpy.data.objects[n]
        if o['kind'] == 'drawer':
            o.location.y -= o['slide'] * amount
        else:
            o.rotation_euler['xyz'.index(o['axis'])] += o['open'] * amount


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, far, close = ASSETS[name]
        reset()
        build(mats())
        merge()
        shot(os.path.join(SHOTS, name + '.png'), **far)
        if name in OPEN:
            open_all(OPEN[name]); bpy.context.view_layer.update()
            shot(os.path.join(SHOTS, name + '-open.png'), **close)
            open_all(OPEN[name], -1.0)
        else:
            shot(os.path.join(SHOTS, name + '-close.png'), **close)
        export(os.path.join(OUT, name + '.glb'), name)

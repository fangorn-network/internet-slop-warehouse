# SPDX-License-Identifier: CC0-1.0
# Elevator car interior and door leaf (2026-11-21). Reference: a two-stop Otis HydroFit hotel car (Wikimedia Commons,
# "Otis HydroFit elevator panel.jpg") and the Salem station car panel ("Elevator buttons in Salem station garage"):
# a full-height brushed swing-return panel beside the door: position indicator at the top, capacity plate, firefighters'
# cabinet with the Phase II key switch, inspection certificate, then the ADA band (35-48 in, 0.89-1.22 m) with
# black tactile plates (raised symbol and braille) left of 38 mm stainless buttons with lit halos.
# Car 2.2 x 3.2 m, door side -Y (three.js +Z), floor top at 0. Origin at floor centre.
#   blender -b --python projects/roadside-inn/blender/elevator.py -- [asset ...]
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, preview, mats
from lobby import merge, OUT, SHOTS
from kit21 import mat, printed, printed_mat, brushed, unit, lam_panel, laminate, shot, uv_turn, R

FY = -1.568         # face of the operating panel (the front return is at y -1.58; the car interior is +Y)
PX = 0.86           # operating panel centre (x), on the +X return


def button(name, x, z, m, cap=None, label=None):
    """A 38 mm stainless push button: a satin bezel, the lit halo ring the game turns amber, a slightly proud cap."""
    cap = cap or m['steel']
    parts = [cyl(name, 0.019, 0.004, (x, FY + 0.002, z), mat('cop_bezel', color=(0.6, 0.61, 0.63), roughness=0.35, metallic=1.0), verts=28, rotation=(R(90), 0, 0)),
             cyl(name + '_halo', 0.0165, 0.006, (x, FY + 0.004, z), mat('btn_halo', color=(0.85, 0.83, 0.78), roughness=0.3), verts=28, rotation=(R(90), 0, 0)),
             cyl(name + '_cap', 0.0145, 0.009, (x, FY + 0.0055, z), cap, verts=28, bevel=0.0015, rotation=(R(90), 0, 0))]
    o = unit(name, parts, (x, FY + 0.01, z), kind='button', label=label or name[4:])
    return o


def tactile(key, x, z, w=0.032, h=0.032):
    return printed('tactile_' + key, w, h, (x, FY + 0.0008, z), key, printed_mat(0.35, name='cop_tactile'), depth=0.0016, bevel=0.0006, normal=(0, 1, 0))


def operating_panel(m):
    st = brushed()
    face = box('cop_face', (0.3, 0.012, 2.0), (PX, FY - 0.006, 1.15), st, bevel=0.003); uv_box(face, 1.5); uv_turn(face)
    for sx in (-1, 1):
        for z in (0.2, 2.1):
            cyl('cop_screw', 0.0035, 0.002, (PX + sx * 0.13, FY + 0.001, z), m['steel'], verts=10, rotation=(R(90), 0, 0))
    # position indicator: a black bezel, the LCD the game draws on (node_cop_display), a hall-lantern style arrow
    box('cop_bezel_disp', (0.13, 0.006, 0.09), (PX, FY + 0.003, 1.88), m['black'], bevel=0.003)
    printed('node_cop_display', 0.1, 0.067, (PX, FY + 0.0065, 1.88), 'cop_display', printed_mat(0.15, 1.2, 'cop_display'), depth=0.001, normal=(0, 1, 0))
    for sx in (-1, 1):                                     # speaker grilles: rows of slots
        for i in range(5):
            box('cop_grille', (0.022, 0.0012, 0.0022), (PX + sx * 0.095, FY + 0.0004, 1.86 + i * 0.008), m['black'])
    printed('cop_cap', 0.2, 0.05, (PX, FY + 0.001, 1.77), 'cop_cap', printed_mat(0.4, name='cop_plate'), depth=0.0015, bevel=0.0005, normal=(0, 1, 0))
    printed('node_fire_hat', 0.03, 0.03, (PX, FY + 0.0012, 1.705), 't_fire', printed_mat(0.25, 0.3, 'fire_hat_lit'), depth=0.002, bevel=0.0006, normal=(0, 1, 0))
    # firefighters' cabinet: a recessed door with a reveal, its print, the Phase II key switch and the cabinet lock
    box('cop_cab_reveal', (0.212, 0.002, 0.252), (PX, FY + 0.0002, 1.53), m['black'])
    door = box('cop_cab_door', (0.2, 0.004, 0.24), (PX, FY + 0.002, 1.53), st, bevel=0.0015); uv_box(door, 1.5)
    printed('cop_fire_print', 0.19, 0.228, (PX, FY + 0.0042, 1.53), 'cop_fire', printed_mat(0.45, name='cop_fire'), depth=0.0004, normal=(0, 1, 0))
    k = [cyl('btn_fire_key', 0.011, 0.008, (PX, FY + 0.008, 1.553), m['chrome'], verts=24, bevel=0.001, rotation=(R(90), 0, 0)),
         box('btn_fire_key_slot', (0.0025, 0.002, 0.012), (PX, FY + 0.0125, 1.553), m['black'])]
    unit('btn_fire_key', k, (PX, FY + 0.01, 1.553), kind='keyswitch', positions='off,hold,on')
    cyl('cop_cab_lock', 0.007, 0.006, (PX - 0.075, FY + 0.006, 1.435), m['chrome'], verts=16, rotation=(R(90), 0, 0))
    # inspection certificate in a framed window
    box('cop_cert_frame', (0.11, 0.004, 0.15), (PX, FY + 0.002, 1.29), m['steel'], bevel=0.0015)
    printed('cop_cert', 0.1, 0.14, (PX, FY + 0.0042, 1.29), 'cop_cert', printed_mat(0.6, name='cop_cert'), depth=0.0004, normal=(0, 1, 0))
    box('cop_cert_glass', (0.1, 0.0008, 0.14), (PX, FY + 0.0052, 1.29), material('cop_glass', color=(0.9, 0.92, 0.95), roughness=0.05, alpha=0.18))
    # the ADA band: plates left of their buttons
    L, Rt = (PX + 0.095, PX + 0.05), (PX - 0.045, PX - 0.09)   # facing +Y, the viewer's left is +X
    rows = [(1.16, ('t_2', 'btn_floor_2', '2'), None),
            (1.08, ('t_1', 'btn_floor_1', '1'), ('t_stop', 'btn_stop', 'stop')),
            (1.00, ('t_open', 'btn_door_open', 'open'), ('t_close', 'btn_door_close', 'close')),
            (0.92, ('t_alarm', 'btn_alarm', 'alarm'), ('t_phone', 'btn_phone', 'phone'))]
    red = mat('stop_red', color=(0.7, 0.03, 0.02), roughness=0.3)
    for z, left, right in rows:
        for col, it in ((L, left), (Rt, right)):
            if not it:
                continue
            key, name, label = it
            if key == 't_stop':
                tactile(key, col[0] + 0.004, z, 0.04, 0.02)
                parts = [cyl(name, 0.017, 0.005, (col[1], FY + 0.0025, z), m['black'], verts=24, rotation=(R(90), 0, 0)),
                         cyl(name + '_knob', 0.014, 0.014, (col[1], FY + 0.012, z), red, verts=24, bevel=0.003, rotation=(R(90), 0, 0))]
                unit(name, parts, (col[1], FY + 0.01, z), kind='pull-switch', label='stop')
            else:
                tactile(key, col[0], z)
                button(name, col[1], z, m, label=label)
    for i in range(4):                                     # phone speaker slots above the phone button
        box('cop_phone_grille', (0.018, 0.0012, 0.0018), (Rt[1], FY + 0.0004, 0.95 + i * 0.006), m['black'])
    printed('cop_phone_txt', 0.07, 0.014, (Rt[1] + 0.02, FY + 0.0004, 0.889), 'cop_phone_txt', printed_mat(0.45, name='cop_fire'), depth=0.0004, normal=(0, 1, 0))
    printed('cop_help', 0.2, 0.03, (PX, FY + 0.0004, 0.86), 'cop_help', printed_mat(0.45, name='cop_fire'), depth=0.0004, normal=(0, 1, 0))
    cyl('node_alarm_ack', 0.008, 0.004, (PX, FY + 0.002, 0.825), mat('alarm_ack', color=(0.95, 0.95, 0.9), roughness=0.2), verts=16, rotation=(R(90), 0, 0))
    bpy.context.object.name = 'node_alarm_ack'


def rail(m, a, b, z=0.9):
    """A 38 mm round handrail from a to b (x, y), 38 mm clear of the wall, on cast standoff brackets, ends returned."""
    import mathutils
    A, B = mathutils.Vector((*a, z)), mathutils.Vector((*b, z)); d = B - A; L = d.length; mid = (A + B) / 2
    yaw = math.atan2(d.y, d.x)
    cyl('rail', 0.019, L, tuple(mid), m['steel'], verts=20, rotation=(0, R(90), yaw))
    n = mathutils.Vector((-d.y, d.x, 0)).normalized()        # toward the wall is +n or -n: pick the one pointing outward
    if (mid + n).length < mid.length:
        n = -n
    for t in (0.0, 0.5, 1.0):
        p = A + d * t
        cyl('rail_bracket', 0.008, 0.055, tuple(p + n * 0.03), m['steel'], verts=12, rotation=(R(90), 0, yaw))
        if t in (0.0, 1.0):
            cyl('rail_rose', 0.022, 0.006, tuple(p + n * 0.057), m['steel'], verts=20, rotation=(R(90), 0, yaw))
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.019, segments=16, ring_count=8, location=tuple(p)); s = bpy.context.object
            s.data.materials.append(m['steel']); smooth(s)


def ceiling(m):
    """Suspended ceiling: four #4 brushed stainless pans in a dark grid, two LED downlights in each pan (cab ceilings
    carry six to nine), an exhaust-fan grille at the rear."""
    st = brushed()
    box('ceil_grid', (2.2, 3.2, 0.01), (0, 0.01, 2.405), m['charcoal'])
    lens = mat('car_downlight', color=(1, 0.97, 0.9), roughness=0.4)
    e = lens.node_tree.nodes['Principled BSDF']; e.inputs['Emission Color'].default_value = (1, 0.95, 0.85, 1); e.inputs['Emission Strength'].default_value = 6
    for ix in (-1, 1):
        for iy in (-1, 1):
            cx, cy = ix * 0.553, 0.01 + iy * 0.803
            p = box('ceil_pan', (1.094, 1.594, 0.02), (cx, cy, 2.388), st, bevel=0.004); uv_box(p, 1.0)
            for j in (-1, 1):
                ly = cy + j * 0.4
                cyl('downlight_trim', 0.048, 0.006, (cx, ly, 2.375), m['chrome'], verts=28, bevel=0.002)
                cyl('downlight_lens', 0.036, 0.004, (cx, ly, 2.372), lens, verts=28)
    box('fan_grille', (0.3, 0.12, 0.004), (0, 1.25, 2.376), m['charcoal'], bevel=0.002)
    for i in range(9):
        box('fan_slot', (0.26, 0.006, 0.002), (0, 1.206 + i * 0.011, 2.3735), m['black'])


def elevator_car(m):
    terrazzo = material('car_terrazzo', maps={'color': 'acg-hotel-terrazzo-color.jpg', 'normal': 'acg-hotel-terrazzo-normal.jpg', 'roughness': 'acg-hotel-terrazzo-roughness.jpg'})
    st = brushed()
    f = box('floor', (2.2, 3.2, 0.02), (0, 0, 0.0), terrazzo); uv_box(f, 0.8)
    for x in (-1.12, 1.12):
        w = box('side', (0.02, 3.24, 2.42), (x, 0, 1.2), st); uv_box(w, 0.6); uv_turn(w)
    w = box('rear', (2.26, 0.02, 2.42), (0, 1.62, 1.2), st); uv_box(w, 0.6); uv_turn(w)
    # rear wall: wood-print laminate panels in stainless reveals, kick plate below
    for x in (-0.72, 0.0, 0.72):
        lam_panel('rear_panel', (0.7, 0.018, 1.7), (x, 1.601, 1.27))
    box('kick', (2.2, 0.006, 0.12), (0, 1.607, 0.07), st)
    # front wall: two returns and the header around the 1.2 m opening, a grooved aluminium sill
    for sx in (-1, 1):
        r = box('front_return', (0.51, 0.04, 2.42), (sx * 0.855, -1.6, 1.2), st, bevel=0.002); uv_box(r, 0.6); uv_turn(r)
    h = box('header', (1.2, 0.04, 0.2), (0, -1.6, 2.3), st, bevel=0.002); uv_box(h, 0.6)
    alu = mat('sill_alu', color=(0.78, 0.78, 0.76), roughness=0.4, metallic=1.0)
    box('sill', (1.24, 0.09, 0.012), (0, -1.62, 0.004), alu, bevel=0.001)
    for i in range(2):
        box('sill_groove', (1.24, 0.008, 0.002), (0, -1.635 + i * 0.03, 0.0102), m['black'])
    for sx in (-1, 1):                                    # handrails on the side and rear walls (stop short of the panel)
        rail(m, (sx * 1.053, -1.25), (sx * 1.053, 1.35))
    rail(m, (-0.85, 1.553), (0.85, 1.553))
    ceiling(m)
    operating_panel(m)


def door_leaf(m):
    """One leaf of a centre-opening door, 0.6 x 2.2 m, 30 mm: brushed face, folded edges, and a black rubber safety edge
    on the leading edge (+X): where two leaves meet, the two rubber edges draw the centre seam. Mirror for the other leaf."""
    st = brushed()
    b = box('leaf', (0.588, 0.03, 2.2), (-0.006, 0, 1.1), st, bevel=0.003); uv_box(b, 0.6); uv_turn(b)
    box('safety_edge', (0.012, 0.024, 2.16), (0.294, 0, 1.1), mat('rubber', color=(0.02, 0.02, 0.022), roughness=0.75), bevel=0.003)
    box('leaf_guide', (0.5, 0.01, 0.012), (0, 0, 0.006), m['black'])        # shoe that runs in the sill groove


ASSETS = {
    'hotel-elevator-car': (elevator_car, dict(cam=(-0.6, 1.3, 1.6), target=(0.3, -1.6, 1.3), lamp=((0, 0, 2.2), 150)),
                           dict(cam=(0.55, -1.0, 1.35), target=(PX, FY, 1.3), lamp=((0.3, -0.8, 2.0), 40))),
    'hotel-elevator-door-leaf': (door_leaf, dict(cam=(1.2, -2.2, 1.5), target=(0, 0, 1.1)),
                                 dict(cam=(0.45, -0.4, 1.2), target=(0.29, 0, 1.1))),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, far, close = ASSETS[name]
        reset()
        build(mats())
        merge()
        shot(os.path.join(SHOTS, name + '.png'), **far)
        shot(os.path.join(SHOTS, name + '-close.png'), **close)
        export(os.path.join(OUT, name + '.glb'), name)

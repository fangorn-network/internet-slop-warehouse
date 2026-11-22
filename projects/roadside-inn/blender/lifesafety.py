# SPDX-License-Identifier: CC0-1.0
# US life-safety hardware for the hotel.
#   hotel-extinguisher-cabinet: a semi-recessed fire extinguisher cabinet as US hotels have them (NFPA 10: a 10 lb ABC
#     dry-chemical extinguisher, top under 5 ft; ADA: under 4 in of projection): a white steel trim 2.8 in proud of
#     the wall, a clear acrylic door with the vertical red FIRE EXTINGUISHER lettering and a chrome pull, a white tub,
#     and inside the red cylinder with its black valve and lever, gauge, hose and a yellow annual-inspection tag.
#     Origin at the wall face, bottom centre; front -Y (three.js +Z). Mount its bottom ~0.85 m up (top ~1.5 m).
#   blender -b --python projects/roadside-inn/blender/lifesafety.py -- [asset ...]     (default: all)
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, export, preview, smooth
from lobby import OUT, SHOTS
from props import lathe


def extinguisher_cabinet():
    W, H, D, F = 0.31, 0.66, 0.072, 0.035          # trim outside, depth proud of the wall, frame width
    white = material('cabinet_white', (0.86, 0.86, 0.84), 0.45)
    tub = material('cabinet_tub', (0.8, 0.8, 0.78), 0.6)
    glass = material('cabinet_acrylic', (0.9, 0.93, 0.95), 0.05, alpha=0.14)
    red_text = material('cabinet_letters', (0.62, 0.03, 0.03), 0.5)
    chrome = material('chrome', (0.8, 0.8, 0.82), 0.2, 1.0)
    red = material('extinguisher_red', (0.55, 0.02, 0.03), 0.3)
    black = material('black_plastic', (0.02, 0.02, 0.02), 0.5)
    tag = material('inspection_tag', (0.95, 0.78, 0.1), 0.7)
    label = material('extinguisher_label', (0.92, 0.9, 0.84), 0.6)
    gauge = material('gauge_face', (0.85, 0.9, 0.85), 0.3)
    # trim: four rails proud of the wall, slightly rounded
    for x, z, w, h in ((0, F / 2, W, F), (0, H - F / 2, W, F), (-(W - F) / 2, H / 2, F, H - 2 * F), ((W - F) / 2, H / 2, F, H - 2 * F)):
        box('trim', (w, D, h), (x, -D / 2, z), white, bevel=0.004)
    # the tub: a back panel just in front of the wall and side walls back to the door (the cabinet's depth goes into the wall)
    box('tub_back', (W - 2 * F, 0.002, H - 2 * F), (0, -0.001, H / 2), tub)
    for x in (-1, 1):
        box('tub_side', (0.002, D - 0.004, H - 2 * F), (x * (W / 2 - F - 0.001), -D / 2, H / 2), tub)
    box('tub_floor', (W - 2 * F, D - 0.004, 0.002), (0, -D / 2, F + 0.001), tub)
    # the door: clear acrylic in the frame, a chrome pull on the right
    box('door_glass', (W - 2 * F + 0.01, 0.003, H - 2 * F + 0.01), (0, -D + 0.003, H / 2), glass)
    box('pull', (0.012, 0.012, 0.09), (W / 2 - F - 0.03, -D - 0.004, H / 2), chrome, bevel=0.003)
    # FIRE EXTINGUISHER down the door, red vinyl letters (Blender's built-in font, converted to mesh)
    bpy.ops.object.text_add(location=(0.075, -D - 0.0006, H - F - 0.03))
    t = bpy.context.object; t.data.body = 'FIRE EXTINGUISHER'; t.data.size = 0.034; t.data.extrude = 0.0003
    t.data.align_x = 'LEFT'; t.data.align_y = 'TOP'
    t.rotation_euler = (math.radians(90), math.radians(90), 0)   # stand it on the door, then read top to bottom
    bpy.ops.object.convert(target='MESH'); t.name = 'letters'; t.data.materials.append(red_text)
    # the extinguisher: a 10 lb ABC cylinder, 0.13 m across, standing on the tub floor behind the door
    z0, x0 = F + 0.003, -0.03
    body = lathe('cylinder', [(0.0, 0.0), (0.06, 0.0), (0.064, 0.008), (0.064, 0.36), (0.058, 0.39), (0.04, 0.41), (0.02, 0.42), (0.0, 0.42)], red, (x0, 0, z0), segs=32)
    cyl('neck', 0.016, 0.03, (x0, 0, z0 + 0.435), chrome, verts=16)
    box('valve', (0.03, 0.03, 0.04), (x0, 0, z0 + 0.465), black, bevel=0.004)
    box('lever', (0.1, 0.018, 0.008), (x0 + 0.03, 0, z0 + 0.49), black, bevel=0.002).rotation_euler = (0, math.radians(-8), 0)
    box('carry_handle', (0.09, 0.018, 0.008), (x0 + 0.025, 0, z0 + 0.465), black, bevel=0.002)
    cyl('gauge', 0.014, 0.008, (x0 - 0.02, -0.018, z0 + 0.462), chrome, verts=16, rotation=(math.radians(90), 0, 0))
    cyl('gauge_face', 0.011, 0.002, (x0 - 0.02, -0.0225, z0 + 0.462), gauge, verts=16, rotation=(math.radians(90), 0, 0))
    # the hose runs from the valve down the left side to a bracket near the bottom
    hose = cyl('hose', 0.008, 0.34, (x0 - 0.072, -0.01, z0 + 0.27), black, verts=10)
    hose.rotation_euler = (0, math.radians(4), 0)
    cyl('nozzle', 0.01, 0.05, (x0 - 0.07, -0.01, z0 + 0.08), black, verts=10)
    # the printed instruction label on the front, and the inspection tag on its wire
    lab = box('label', (0.07, 0.004, 0.12), (x0, -0.063, z0 + 0.22), label)
    box('tag', (0.035, 0.002, 0.06), (x0 + 0.045, -0.04, z0 + 0.38), tag).rotation_euler = (0, 0, math.radians(-18))
    cyl('tag_wire', 0.0008, 0.06, (x0 + 0.03, -0.03, z0 + 0.425), black, verts=6, rotation=(0, math.radians(35), 0))
    return body


ASSETS = {'hotel-extinguisher-cabinet': extinguisher_cabinet}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        reset()
        ASSETS[name]()
        preview(os.path.join(SHOTS, name + '.png'), distance=1.1, height=1.1, target=(0, 0, 0.33), yaw=20, samples=48)
        export(os.path.join(OUT, name + '.glb'), name)

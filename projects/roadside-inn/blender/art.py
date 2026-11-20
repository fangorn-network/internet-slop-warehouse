# SPDX-License-Identifier: CC0-1.0
# Framed wall art (labels/art.json, drawn by prints.mjs) and the great-room map mural.
#   hotel-wall-art: every framed piece as its own node art_<name>, each at the origin, top-centre anchored, front -Y
#     (three.js +Z), so painting() picks one by name. Satin moulding 22 x 30 mm, a bevel-cut mat board
#     set 5 mm back, the print behind it; each hangs a fraction of a degree off true.
#   hotel-map-mural: a 3.1 x 2.81 m printed vinyl wallcovering 1.5 mm proud of the wall, origin at floor centre.
#   blender -b --python projects/roadside-inn/blender/art.py -- [asset ...]     (default: all)
import bpy, bmesh, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, export, preview, carve, image
from lobby import OUT, SHOTS

LABELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'labels')
FRAME, DEPTH, BACK = 0.022, 0.03, 0.004     # moulding face, depth; the back sits 4 mm behind the anchor plane


def mat_once(name, **kw):
    return bpy.data.materials.get(name) or material(name, **kw)


def print_plane(name, w, h, y, img, rough=0.8, normal=None, normal_tiles=None):
    """A UV 0..1 plane facing -Y, top edge at z=0. normal: a tiling normal map repeated normal_tiles (u, v) times."""
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name
    o.scale = (w, h, 1); o.rotation_euler = (math.radians(90), 0, 0); o.location = (0, y, -h / 2)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    m = material(name + '_print', roughness=rough, maps={'color': os.path.join(LABELS, img)})
    if normal:
        nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
        coord = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (normal_tiles[0], normal_tiles[1], 1)
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image(normal); t.image.colorspace_settings.name = 'Non-Color'
        n = nt.nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value = 0.35
        nt.links.new(coord.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        nt.links.new(t.outputs['Color'], n.inputs['Color']); nt.links.new(n.outputs['Normal'], bsdf.inputs['Normal'])
    o.data.materials.append(m)
    return o


def window_frame(name, W, H, face, depth, y_front, mat, bevel):
    """A rectangular ring (outer W x H, ring width `face`), `depth` deep from y_front back, its edges eased."""
    o = box(name, (W, depth, H), (0, y_front + depth / 2, -H / 2), mat)
    cut = box(name + '_cut', (W - 2 * face, depth * 3, H - 2 * face), (0, y_front + depth / 2, -H / 2))
    carve(o, cut)
    b = o.modifiers.new('ease', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=b.name)
    o.data.shade_smooth(); o.data.use_auto_smooth = True; o.data.auto_smooth_angle = math.radians(35)
    return o


def piece(a):
    W, H = a['outer']; mat_w = a['mat']; ww, wh = a['window']
    pivot = bpy.data.objects.new('art_' + a['name'], None); bpy.context.scene.collection.objects.link(pivot)
    fin = mat_once('frame_black', color=(0.018, 0.018, 0.02), roughness=0.42) if a['frame'] == 'black' else \
        mat_once('frame_white', color=(0.86, 0.86, 0.84), roughness=0.38)
    front = BACK - DEPTH                                  # frame face plane (y, negative = toward the room)
    parts = [window_frame('frame', W, H, FRAME, DEPTH, front, fin, 0.0025)]
    if mat_w:
        board = mat_once('mat_board', color=(0.93, 0.925, 0.9), roughness=0.92)
        mb = window_frame('mat', W - 2 * FRAME, H - 2 * FRAME, mat_w, 0.0025, front + 0.006, board, 0.0015)
        for v in mb.data.vertices: v.co.z -= FRAME
        parts.append(mb)
        y_print = front + 0.0088
    else:
        y_print = front + 0.006
    pr = print_plane('print', ww, wh, y_print, a['image'])
    for v in pr.data.vertices: v.co.z -= FRAME + mat_w
    parts.append(pr)
    rnd = random.Random(a['name'])
    for p in parts:
        p.name = f"{a['name']}_{p.name}"; p.parent = pivot
    pivot.rotation_euler = (0, rnd.uniform(-0.004, 0.004), 0)   # hung a fraction of a degree off true
    return pivot


def wall_art():
    art = json.load(open(os.path.join(LABELS, 'art.json')))
    return [piece(a) for a in art]


def map_mural():
    """Printed vinyl mural on the great room's east wall: 3.1 x 2.81 m, bottom 0.12 m above the floor slab's base
    (0.11 above its top), 1.5 mm proud; a faint linen emboss (Poly Haven rough_linen normal, CC0) at its 27 cm repeat."""
    W, H = 3.1, 2.81
    o = print_plane('map_mural', W, H, -0.0015, 'mural.jpg', rough=0.85, normal='ph-hotel-linen-normal.jpg', normal_tiles=(W / 0.27, H / 0.27))
    for v in o.data.vertices: v.co.z += 0.12 + H
    return o


def spread(pivots):
    """Preview only: lay the pieces out on a wall, left to right, two rows."""
    x, z, row = -2.4, 2.6, 0
    for p in pivots:
        w = max(abs(c.dimensions.x) for c in p.children)
        if x + w > 2.6: x, z = -2.4, z - 1.15
        p.location = (x + w / 2, 0, z); x += w + 0.12


ASSETS = {'hotel-wall-art': wall_art, 'hotel-map-mural': map_mural}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        reset()
        made = ASSETS[name]()
        if name == 'hotel-wall-art':
            spread(made)
            preview(os.path.join(SHOTS, name + '.png'), distance=5.2, height=1.9, target=(0.1, 0, 1.9), yaw=0, samples=32)
            preview(os.path.join(SHOTS, name + '-close.png'), distance=0.75, height=2.35, target=(-1.55, 0, 2.15), yaw=28, samples=48)
            for p in made: p.location = (0, 0, 0)
        else:
            preview(os.path.join(SHOTS, name + '.png'), distance=4.2, height=1.6, target=(0, 0, 1.5), yaw=0, samples=32)
            preview(os.path.join(SHOTS, name + '-close.png'), distance=0.9, height=1.6, target=(0.1, 0, 1.45), yaw=8, samples=32)
        export(os.path.join(OUT, name + '.glb'), name)

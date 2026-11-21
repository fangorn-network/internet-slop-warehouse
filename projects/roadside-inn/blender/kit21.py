# SPDX-License-Identifier: CC0-1.0
# Shared kit for the 2026-11-21 models (room.py, elevator.py, hardware.py, bed.py): printed faces from labels/room.png
# (room-labels.mjs), cheap wood-print laminate with PVC edge banding, named interactive nodes, merge by material.
import bpy, bmesh, math, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import material, box, cyl, smooth
from sofa import uv_real, apply_mods, select_only

HERE = os.path.dirname(__file__)
ROOM = json.load(open(os.path.join(HERE, 'labels', 'room.json')))
R = math.radians
WAL = {'color': 'ph-hotel-walnut-color.jpg', 'normal': 'ph-hotel-walnut-normal.jpg'}
LINEN = {'color': 'ph-hotel-linen-color.jpg', 'normal': 'ph-hotel-linen-normal.jpg', 'roughness': 'ph-hotel-linen-roughness.jpg'}
BRUSHED = {'color': 'acg-hotel-brushed-steel-color.jpg', 'normal': 'acg-hotel-brushed-steel-normal.jpg', 'roughness': 'acg-hotel-brushed-steel-roughness.jpg'}


def mat(name, **kw):
    return bpy.data.materials.get(name) or material(name, **kw)


def printed_mat(rough=0.4, emit=0.0, name=None):
    """Material printed from labels/room.png."""
    name = name or f'room_print_{rough}_{emit}'
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(HERE, 'labels', 'room.png'), check_existing=True)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    if emit:
        nt.links.new(tx.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
    return m


def laminate():
    """Wood-print laminate (HPL/melamine): a printed walnut grain with almost no relief and one even satin sheen. Real
    wood varies in gloss along the grain; laminate doesn't, and that uniformity is what reads as 'cheap hotel'."""
    return bpy.data.materials.get('laminate') or material('laminate', maps=WAL, roughness=0.42, normal_strength=0.08)


def edge_band():
    """2 mm PVC edge banding: a flat colour matched to the print's average, a touch lighter and glossier."""
    return mat('edge_band', color=(0.2, 0.105, 0.055), roughness=0.33)


def brushed():
    return bpy.data.materials.get('car_brushed') or material('car_brushed', metallic=1.0, maps=BRUSHED)


def face_uv(o, rect, normal=(0, -1, 0)):
    """Map the faces that point along `normal` (local) onto the atlas rect by their extent; every other face samples a
    texel just inside the rect's corner (the print's edge colour)."""
    apply_mods(o)
    me = o.data; ul = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    n = list(normal); ax = [i for i in range(3) if abs(n[i]) < 0.5]          # the two in-plane axes
    front = [p for p in me.polygons if sum(p.normal[i] * n[i] for i in range(3)) > 0.7]
    vs = [me.vertices[v].co for p in front for v in p.vertices] or [v.co for v in me.vertices]
    lo = [min(v[a] for v in vs) for a in ax]; hi = [max(v[a] for v in vs) for a in ax]
    u0, v0, u1, v1 = rect
    flip = n[1] > 0.5 or n[0] < -0.5           # seen from outside, +Y and -X faces run u right-to-left
    for p in me.polygons:
        isf = p in front
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if isf:
                fu = (co[ax[0]] - lo[0]) / max(1e-6, hi[0] - lo[0]); fv = (co[ax[1]] - lo[1]) / max(1e-6, hi[1] - lo[1])
                if flip:
                    fu = 1 - fu
                ul.data[li].uv = (u0 + (u1 - u0) * min(1, max(0, fu)), v0 + (v1 - v0) * min(1, max(0, fv)))
            else:
                ul.data[li].uv = (u0 + 0.0015, v0 + 0.0015)
    return o


def printed(name, w, h, loc, key, m, depth=0.0012, bevel=0.0, normal=(0, -1, 0)):
    """A thin printed plate, w wide and h tall, facing `normal` (default -Y), centred on loc."""
    if normal[2] > 0.5:
        o = box(name, (w, h, depth), loc, m, bevel=bevel)
    elif abs(normal[0]) > 0.5:
        o = box(name, (depth, w, h), loc, m, bevel=bevel)
    else:
        o = box(name, (w, depth, h), loc, m, bevel=bevel)
    return face_uv(o, ROOM[key], normal)


def lam_panel(name, size, loc, bevel=0.0012, tile=1.0, band=True):
    """A laminate panel (MDF/particleboard core): wood print on the broad faces, PVC banding on the narrow edges."""
    o = box(name, size, loc, laminate(), bevel=bevel, segments=2)
    apply_mods(o); uv_real(o, tile)
    if band:
        thin = min(range(3), key=lambda i: size[i])
        o.data.materials.append(edge_band())
        for p in o.data.polygons:
            if abs(p.normal[thin]) < 0.5:
                p.material_index = 1
    return o


def pull(name, loc, length=0.128, m=None, axis='x', proud=0.032):
    """A bar pull on two posts, 128 mm centres, standing `proud` off a front facing -Y."""
    m = m or mat('satin_nickel', color=(0.72, 0.71, 0.68), roughness=0.3, metallic=1.0)
    x, y, z = loc; parts = []
    rot = (0, R(90), 0) if axis == 'x' else (0, 0, 0)
    parts.append(cyl(name, 0.0055, length + 0.03, (x, y - proud, z), m, verts=12, rotation=rot))
    for s in (-1, 1):
        px, pz = (x + s * length / 2, z) if axis == 'x' else (x, z + s * length / 2)
        parts.append(cyl(name + '_post', 0.0045, proud, (px, y - proud / 2, pz), m, verts=10, rotation=(R(90), 0, 0)))
    return parts


def unit(name, parts, pivot, **extras):
    """Join parts into one mesh named `name` with its origin at pivot (a hinge axis, a drawer's closed position): the
    node the game animates. Extra keyword values land in glTF extras (three.js userData)."""
    for p in parts:
        apply_mods(p)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = (0, 0, 0)
    for k, v in extras.items():
        o[k] = v
    return o


def merge_mats(objs, prefix=''):
    """Join objs that share a first material; returns the merged objects (named prefix + material)."""
    groups = {}
    for o in objs:
        apply_mods(o)
        groups.setdefault(o.data.materials[0].name if o.data.materials else 'mesh', []).append(o)
    out = []
    for name, g in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in g:
            o.select_set(True)
        bpy.context.view_layer.objects.active = g[0]
        if len(g) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = prefix + name; out.append(bpy.context.object)
    return out


def receptacle(name, loc, m_face, m_slot, normal_up=True):
    """A NEMA 5-15R face (34 x 38 mm rounded face, two slots, a D ground hole), facing +Z on a desk top. Parts list."""
    x, y, z = loc
    parts = [box(name, (0.034, 0.038, 0.004), (x, y, z + 0.002), m_face, bevel=0.004, segments=3)]
    for dx, l in ((-0.0064, 0.0079), (0.0064, 0.0063)):           # neutral (taller) and hot slots
        parts.append(box(name + '_slot', (0.0018, l, 0.0012), (x + dx, y + 0.004, z + 0.0039), m_slot))
    parts.append(cyl(name + '_gnd', 0.0024, 0.0012, (x, y - 0.0085, z + 0.0039), m_slot, verts=10))
    return parts


def shot(path, cam, target, samples=96, lens=35, lamp=None, floor=True, res=(640, 480)):
    """Like common.preview but with an explicit camera position (inside a car, at a panel), an optional point lamp
    (location, watts) for enclosed interiors, the same day-sky HDR."""
    from common import HAVEN
    scene = bpy.context.scene
    if not scene.world:
        world = bpy.data.worlds.new('preview'); scene.world = world; world.use_nodes = True
        env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(os.path.join(HAVEN, 'ph-hotel-farm-sky.hdr'))
        world.node_tree.links.new(env.outputs['Color'], world.node_tree.nodes['Background'].inputs['Color'])
    tmp = []
    if floor:
        bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, -0.0005)); fl = bpy.context.object
        fl.data.materials.append(mat('__floor', color=(0.35, 0.33, 0.3), roughness=0.9)); tmp.append(fl)
    cam_o = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam_o.data.lens = lens
    cam_o.location = cam; scene.collection.objects.link(cam_o); scene.camera = cam_o
    tgt = bpy.data.objects.new('tgt', None); tgt.location = target; scene.collection.objects.link(tgt)
    tr = cam_o.constraints.new('TRACK_TO'); tr.target = tgt; tmp += [cam_o, tgt]
    if lamp:
        ld = bpy.data.lights.new('lamp', 'POINT'); ld.energy = lamp[1]; ld.shadow_soft_size = 0.3
        lo = bpy.data.objects.new('lamp', ld); lo.location = lamp[0]; scene.collection.objects.link(lo); tmp.append(lo)
    scene.render.engine = 'CYCLES'; scene.cycles.samples = samples; scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in tmp:
        bpy.data.objects.remove(o)
    print(f'SHOT {path}')


def uv_turn(o):
    """Swap u and v (a quarter turn): brushed steel on elevator doors and walls runs vertically."""
    for l in o.data.uv_layers.active.data:
        l.uv = (l.uv[1], l.uv[0])
    return o

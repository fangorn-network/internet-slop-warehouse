# SPDX-License-Identifier: CC0-1.0
# The lobby coffee station, one model per thing so each can carry a kind (kinds.js): the bare counter with its waste
# hole, the thermal towers, the cup rack, the lid bin, the condiment riser, the hot-water box, the stir-straw tumbler and
# creamer basket, and the paper cup itself (liquid / lid / sleeve as hideable nodes). After the Fort Bragg Holiday Inn
# Express coffee counter photo (Wikimedia Commons, S. Stierch, 2022) and Fetco Luxus / Bunn product photos.
# Origin at the floor (or counter-top) centre; front faces Blender -Y (three.js +Z).
#   node projects/roadside-inn/blender/coffee-labels.mjs
#   blender -b --python projects/roadside-inn/blender/coffee.py -- [asset ...]     (default: all)
import bpy, bmesh, math, os, sys, json, random
from itertools import combinations
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, export, preview, mats, carve, empty, uv_box, image
from lobby import kit, flat, OUT, SHOTS
from props import mk, carton, pillow, atlas, liner, apply_uv_top, P

HERE = os.path.dirname(__file__)
RECT = json.load(open(os.path.join(HERE, 'labels', 'coffee.json')))
R = math.radians
TAU = math.tau
HOOKS = {'lever', 'band', 'band_decaf', 'liquid', 'lid', 'sleeve'}
KEEP = ('take_', 'stack_')


def C(k):
    return RECT[k]


def mid(k):          # a point inside a flat swatch
    u0, v0, u1, v1 = RECT[k]
    return ((u0 + u1) / 2, (v0 + v1) / 2)


def A(rough=0.45, name='coffee_print'):
    return atlas('coffee', rough=rough, name=name)


def dried():
    return flat((0.13, 0.06, 0.025), 0.22, 'coffee_dried')


def wicker():
    """Pale basket weave (ambientCG Wicker008A, CC0), 512 px copies in labels/ (the exporter re-reads image files)."""
    f = lambda r: os.path.join(HERE, 'labels', f'coffee-wicker-512-{r}.jpg')
    return bpy.data.materials.get('wicker_weave') or material('wicker_weave', maps={'color': f('color'), 'normal': f('normal'), 'roughness': f('roughness')})


def oak():
    """Blond oak veneer (Poly Haven oak_veneer_01, 1.83 m a tile, lightened), satin lacquer."""
    return bpy.data.materials.get('oak_veneer') or material('oak_veneer', roughness=0.45, maps={'color': os.path.join(HERE, 'labels', 'coffee-oak.jpg'),
        'normal': 'ph-coffee-oak-normal.jpg', 'roughness': 'ph-coffee-oak-roughness.jpg'}, normal_strength=0.5)


def walnut():
    """Walnut-grain laminate (Poly Haven walnut veneer, tinted warm and turned so the grain runs vertically)."""
    return bpy.data.materials.get('walnut_panel') or material('walnut_panel', maps={'color': os.path.join(HERE, 'labels', 'coffee-walnut.jpg'),
        'roughness': os.path.join(HERE, 'labels', 'coffee-walnut-rough.jpg')})


def uv_grain(o, tile=1.83, g=None):
    """Planar UVs per face with v along the board's longest axis (the grain), at the texture's real size."""
    me = o.data
    dims = [max(v.co[i] for v in me.vertices) - min(v.co[i] for v in me.vertices) for i in range(3)]
    g = max(range(3), key=lambda i: dims[i]) if g is None else g
    ul = me.uv_layers.active or me.uv_layers.new()
    for p in me.polygons:
        n = [abs(c) for c in p.normal]
        plane = [i for i in range(3) if i != max(range(3), key=lambda i: n[i])]
        vax = g if g in plane else plane[1]
        uax = plane[0] if plane[0] != vax else plane[1]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            ul.data[li].uv = (co[uax] / tile , co[vax] / tile)


# ---------- geometry ----------
def lathe2(name, prof, mat, segs=24, loc=(0, 0, 0), rot=(0, 0, 0), smooth_angle=50, uscale=1.0, repeat=1):
    """Revolve (r, z, key, v) points, bottom to top (outer walls) or top to bottom (inner walls: normals face the axis).
    key is a coffee-atlas rect name or an explicit (u0, v0, u1, v1); each band between two points takes the upper
    point's key, v interpolating only when both share it, so one mesh can carry print, rim and inside swatches.
    A point with r == 0 is a single pole vertex (caps)."""
    verts, faces, uvs, rings = [], [], [], []
    for r, z, *_ in prof:
        if r <= 0:
            rings.append([len(verts)]); verts.append((0, 0, z))
        else:
            rings.append(list(range(len(verts), len(verts) + segs)))
            verts += [(r * math.cos(TAU * j / segs), r * math.sin(TAU * j / segs), z) for j in range(segs)]
    rect = lambda key: RECT[key] if isinstance(key, str) else key
    for i in range(len(prof) - 1):
        a, b = rings[i], rings[i + 1]
        key = prof[i + 1][2]; u0, v0, u1, v1 = rect(key)
        va = prof[i][3] if prof[i][2] == key else prof[i + 1][3]
        vb = prof[i + 1][3]
        V = lambda f: v0 + (v1 - v0) * f
        for j in range(segs):
            base = math.floor(repeat * j / segs)        # repeat > 1 wraps the rect round several times (front and back labels)
            U = lambda jj: u0 + (u1 - u0) * (uscale * jj / segs if repeat == 1 else repeat * jj / segs - base)
            j1 = (j + 1) % segs
            if len(a) == 1:
                faces.append((a[0], b[j1], b[j])); uvs.append([(U(j + 0.5), V(va)), (U(j + 1), V(vb)), (U(j), V(vb))])
            elif len(b) == 1:
                faces.append((a[j], a[j1], b[0])); uvs.append([(U(j), V(va)), (U(j + 1), V(va)), (U(j + 0.5), V(vb))])
            else:
                faces.append((a[j], a[j1], b[j1], b[j])); uvs.append([(U(j), V(va)), (U(j + 1), V(va)), (U(j + 1), V(vb)), (U(j), V(vb))])
    o = mk(name, verts, faces, uvs, mat, loc, rot)
    o.data.shade_smooth(); o.data.use_auto_smooth = True; o.data.auto_smooth_angle = R(smooth_angle)
    return o


def prism(name, pts, thick, x, mat, bevel=0.0015):
    """A board cut to a (y, z) outline, thick along X, centred at x (side panels)."""
    n = len(pts)
    verts = [(x - thick / 2, y, z) for y, z in pts] + [(x + thick / 2, y, z) for y, z in pts]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    o = mk(name, verts, faces, None, mat)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
    if bevel:
        md = o.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    uv_grain(o)
    return o


def blob(name, rx, ry, loc, mat, seed, z=0.0003, n=14, rot=0.0):
    """A thin irregular film (dried drip, sticky ring, smear) lying on a surface."""
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, TAU) for _ in range(3)]
    pts = []
    for k in range(n):
        a = TAU * k / n
        f = 1 + 0.18 * math.sin(2 * a + ph[0]) + 0.1 * math.sin(3 * a + ph[1]) + 0.06 * math.sin(5 * a + ph[2])
        pts.append((rx * f * math.cos(a), ry * f * math.sin(a)))
    verts = [(0, 0, z)] + [(x, y, z * 0.4) for x, y in pts]
    faces = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    o = mk(name, verts, faces, [[(0.5, 0.5)] * 3] * n, mat, loc, (0, 0, rot))
    o.data.shade_smooth()
    return o


def ring_film(name, r0, r1, a0, a1, loc, mat, seed, z=0.0003, n=24):
    """A partial annulus film (coffee ring, stain on a rim) from angle a0 to a1, its width wandering."""
    rnd = random.Random(seed); ph = rnd.uniform(0, TAU)
    verts, faces = [], []
    for k in range(n + 1):
        a = a0 + (a1 - a0) * k / n
        w = (r1 - r0) * (0.5 + 0.5 * math.sin(math.pi * k / n)) * (0.8 + 0.2 * math.sin(5 * a + ph))
        verts += [(r0 * math.cos(a), r0 * math.sin(a), z), ((r0 + w) * math.cos(a), (r0 + w) * math.sin(a), z)]
    for k in range(n):
        faces.append((2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2))
    return mk(name, verts, faces, [[(0.5, 0.5)] * 4] * n, mat, loc)


def deform(o, angle, depth, z0, width=0.6):
    """Crush a cup rim inwards around `angle` above local z0 (a thumb dent)."""
    for v in o.data.vertices:
        if v.co.z <= z0:
            continue
        a = math.atan2(v.co.y, v.co.x); d = math.atan2(math.sin(a - angle), math.cos(a - angle))
        f = math.exp(-(d / width) ** 2) * ((v.co.z - z0) / 0.02) ** 1.5
        r = math.hypot(v.co.x, v.co.y)
        if r > 1e-6:
            k = max(0.0, 1 - depth * min(1.0, f) / r)
            v.co.x *= k; v.co.y *= k


def world_bvh(o):
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get(); eo = o.evaluated_get(dg); me = eo.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); t = BVHTree.FromBMesh(bm); bm.free(); eo.to_mesh_clear()
    return t


def overlaps(objs, label=''):
    """Pairs of meshes that intersect (BVH), printed: nothing should, bar parts glued face to face."""
    bpy.context.view_layer.update()
    trees = {o.name: world_bvh(o) for o in objs}
    hits = [(a.name, b.name) for a, b in combinations(objs, 2) if trees[a.name].overlap(trees[b.name])]
    print(f'OVERLAP {label}: {len(hits)}', hits[:40])
    return hits


# ---------- the paper cup, its lid and sleeve (shared by the cup, rack and lid bin) ----------
R0, RT, ZT, P_NEST = 0.0295, 0.0435, 0.106, 0.011      # 12 oz hot cup: foot radius, wall radius at the rim, rim, nesting pitch


def wall_r(z):
    return R0 + (RT - R0) * z / ZT


def cup_outer(z0=0.0, foot=True):
    """Outer wall bottom to rim: recessed foot, printed wall, rolled rim bead."""
    p = []
    if foot:
        p += [(0.0, z0 + 0.0085, 'sw_paper', 0.5), (0.0268, z0 + 0.0085, 'sw_paper', 0.5), (0.027, z0 + 0.0003, 'sw_paper', 0.5), (0.0283, z0, 'sw_paper', 0.5)]
    p += [(R0, z0 + 0.0015, 'cup', 0.0), (wall_r(ZT - 0.001), z0 + ZT - 0.001, 'cup', 0.96)]
    return p


RIM = [(0.0445, 0.1068), (0.0454, 0.1080), (0.0457, 0.1097), (0.0452, 0.1114), (0.0442, 0.1121), (0.0434, 0.1113)]


def cup_body(name, mat, segs=24, loc=(0, 0, 0), rot=(0, 0, 0)):
    """A whole cup, walls 0.4 mm: outside, rim, inside wall a hair darker, the floor 9 mm up."""
    p = cup_outer() + [(r, z, 'sw_paper', 0.5) for r, z in RIM]
    p += [(wall_r(0.104) - 0.0004, 0.104, 'sw_inner', 0.5), (wall_r(0.009) - 0.0004, 0.009, 'sw_inner', 0.5), (0.0, 0.009, 'sw_inner', 0.5)]
    return lathe2(name, p, mat, segs, loc, rot)


def lid_mat():
    m = bpy.data.materials.get('lid_white')
    if not m:
        m = material('lid_white', color=(0.93, 0.93, 0.91), roughness=0.4); m.use_backface_culling = False   # thin shell, both sides
    return m


def lid_profile(R=0.0457):
    """White polystyrene domed sip lid, z from the cup's rim bead centre: skirt over the bead, channel, dome."""
    return [(R + 0.0010, -0.0050), (R + 0.0015, -0.0010), (R + 0.0013, 0.0014), (R + 0.0003, 0.0029), (R - 0.0030, 0.0028),
            (R - 0.0045, 0.0006), (R - 0.0062, 0.0006), (R - 0.0076, 0.0040), (R - 0.0100, 0.0112), (R - 0.0135, 0.0138), (0.012, 0.0148), (0.0, 0.0150)]


def lid(name, mat, slot_mat, R=0.0457, segs=24, loc=(0, 0, 0), rot=(0, 0, 0)):
    """One lid with its raised sip platform and slot, joined into one mesh named `name`, origin at the bead centre."""
    o = lathe2(name, [(r, z, 'sw_white', 0.5) for r, z in lid_profile(R)], mat, segs)
    plat = box(name + '_sip', (0.022, 0.011, 0.004), (0, -(R - 0.019), 0.0150), mat, bevel=0.0018, segments=2)
    slot = box(name + '_slot', (0.010, 0.0026, 0.0008), (0, -(R - 0.0165), 0.0170), slot_mat)
    for p in (plat, slot):
        p.parent = o
    join_children(o)
    o.location = loc; o.rotation_euler = rot
    return o


def join_children(o):
    parts = [o] + [c for c in o.children_recursive if c.type == 'MESH']
    for p in parts:
        bpy.context.view_layer.objects.active = p
        for md in list(p.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
    if len(parts) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.join()
    return o


def coffee_liquid():
    return bpy.data.materials.get('coffee_liquid') or material('coffee_liquid', color=(0.055, 0.025, 0.01), roughness=0.06)


# ---------- merge ----------
def hook_root(o):
    while o is not None:
        if o.name.startswith(KEEP) or o.name in HOOKS:
            return o
        o = o.parent
    return None


def group_of(o):
    """The nearest named empty above o (e.g. the stirrer tumbler's separate 'basket' root), else ''."""
    p = o.parent
    while p is not None:
        if p.type == 'EMPTY':
            return p.name
        p = p.parent
    return ''


def merge():
    """Join meshes by (group, material) for few draw calls; hook nodes (take_*, stack_*, lever, band, liquid, lid,
    sleeve) each become one mesh of their own, so the game can hide, move or hand them out."""
    for nm in [o.name for o in bpy.context.scene.objects if o.type == 'MESH' and (o.name.startswith(KEEP) or o.name in HOOKS)]:
        root = bpy.data.objects.get(nm)
        if root is not None and hook_root(root.parent) is None:
            join_children(root)
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and not hook_root(o)]:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
        groups.setdefault((group_of(o), o.data.materials[0].name if o.data.materials else ''), []).append(o)
    for (g, name), objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = (g + '_' if g else '') + (name or 'mesh')


# ---------- assets ----------
def coffee_cup(m):
    """12 oz paper hot cup, origin at its base centre: printed wall, rolled rim, darker inside. Child nodes the game
    hides per step: liquid (coffee 1 cm under the rim), sleeve (kraft corrugated), lid (white domed sip lid)."""
    ink = A(0.5, 'cup_print')
    cup_body('cup', ink, segs=28)
    zl = 0.099; ri = wall_r(zl) - 0.0004
    lathe2('liquid', [(0.0, -0.0004, 'sw_paper', 0.5), (ri * 0.7, -0.0003, 'sw_paper', 0.5), (ri - 0.0012, 0.0, 'sw_paper', 0.5), (ri - 0.0001, 0.0011, 'sw_paper', 0.5)][::-1],
           coffee_liquid(), 28, (0, 0, zl))
    za, zb = 0.032, 0.086
    lathe2('sleeve', [(wall_r(za) + 0.0003, za, 'sw_kraft', 0.5), (wall_r(za) + 0.0019, za, 'sleeve', 0.0), (wall_r(zb) + 0.0019, zb, 'sleeve', 1.0),
                      (wall_r(zb) + 0.0003, zb, 'sw_kraft', 0.5), (wall_r(za) + 0.0003, za + 0.0001, 'sw_kraft', 0.5)], ink, 28)
    lid('lid', lid_mat(), coffee_liquid(), segs=28, loc=(0, 0, 0.1097))


def tower(m):
    """Insulated thermal coffee tower on its stand (Fetco Luxus type, 1.5 gal): black stand with a back pillar and a
    drip tray with a slotted grille, cylindrical body with a black base collar, a printed wrap band (COFFEE; a twin
    band_decaf node carries DECAF), black top collar with a level window, domed lid and carry handle; Tomlinson-style
    faucet with a grey push-down lever. Origin: centre of the base underside."""
    pc = material('powder_black', color=(0.025, 0.025, 0.028), roughness=0.5)
    pb = material('abs_black', color=(0.018, 0.018, 0.02), roughness=0.3)
    grey = material('abs_grey', color=(0.72, 0.73, 0.74), roughness=0.35)
    band = A(0.45, 'band_print')
    BY = 0.06                       # body axis, behind the tray
    # base tray, grille pocket at the front, grille of bars
    base = box('base', (0.23, 0.34, 0.022), (0, 0, 0.011), pb, bevel=0.008, segments=3)
    carve(base, box('pocket', (0.17, 0.17, 0.02), (0, -0.085, 0.024), None, bevel=0.01, segments=2))
    box('pocket_floor_film', (0.15, 0.15, 0.0004), (0, -0.085, 0.0142), dried())          # brown dried pool under the grille
    box('grille_frame_f', (0.164, 0.006, 0.006), (0, -0.167, 0.017), pb, bevel=0.001)
    box('grille_frame_b', (0.164, 0.006, 0.006), (0, -0.003, 0.017), pb, bevel=0.001)
    for sx in (-1, 1):
        box('grille_frame_s', (0.006, 0.158, 0.006), (sx * 0.079, -0.085, 0.017), pb, bevel=0.001)
    for k in range(11):
        box('grille_bar', (0.152, 0.004, 0.005), (0, -0.157 + k * 0.0144, 0.0165), pb, bevel=0.0008)
    blob('grille_pool', 0.03, 0.022, (0.004, -0.09, 0.0192), dried(), 11)
    for k in range(5):
        blob('drip_spot', 0.004 + 0.002 * (k % 2), 0.003, (random.Random(k).uniform(-0.05, 0.05), -0.15 + 0.013 * k, 0.0192), dried(), 30 + k)
    rnd = random.Random(3)
    for k in range(26):             # sugar grains along the tray's front lip and in the corners
        box('sugar', (0.0011, 0.0009, 0.0007), (rnd.uniform(-0.1, 0.1), rnd.uniform(-0.168, -0.16) if k < 18 else rnd.uniform(0.0, 0.14), 0.0224), grey).rotation_euler = (0, 0, rnd.uniform(0, 3))
    # stand: pillar at the back, cradle ring under the body
    p = box('pillar', (0.17, 0.11, 0.236), (0, 0.105, 0.022 + 0.118), pb, bevel=0.012, segments=3)
    lathe2('cradle', [(0.0, 0.255, 'sw_white', 0.5), (0.104, 0.255, 'sw_white', 0.5), (0.109, 0.258, 'sw_white', 0.5), (0.109, 0.293, 'sw_white', 0.5), (0.1035, 0.296, 'sw_white', 0.5)], pb, 40, (0, BY, 0))
    # body shell, band, top collar, lid, handle
    lathe2('shell', [(0.1035, 0.296, 'sw_white', 0.5), (0.1035, 0.499, 'sw_white', 0.5)], pc, 40, (0, BY, 0))
    bp = [(0.1035, 0.353, 'band_coffee', 0.0), (0.1043, 0.355, 'band_coffee', 0.0), (0.1043, 0.495, 'band_coffee', 1.0), (0.1035, 0.497, 'band_coffee', 1.0)]
    lathe2('band', bp, band, 40, (0, BY, 0))
    lathe2('band_decaf', [(r, z, 'band_decaf', v) for r, z, _, v in bp], band, 40, (0, BY, 0))
    lathe2('collar', [(0.1035, 0.499, 'sw_white', 0.5), (0.108, 0.502, 'sw_white', 0.5), (0.108, 0.53, 'sw_white', 0.5), (0.104, 0.536, 'sw_white', 0.5),
                      (0.096, 0.538, 'sw_white', 0.5), (0.088, 0.548, 'sw_white', 0.5), (0.06, 0.556, 'sw_white', 0.5), (0.034, 0.558, 'sw_white', 0.5), (0.0, 0.558, 'sw_white', 0.5)], pb, 40, (0, BY, 0))
    lathe2('brew_cap', [(0.03, 0.557, 'sw_white', 0.5), (0.03, 0.563, 'sw_white', 0.5), (0.027, 0.566, 'sw_white', 0.5), (0.0, 0.566, 'sw_white', 0.5)], pc, 24, (0, BY, 0))
    carton('lcd', 0.036, 0.002, 0.014, C('lcd'), band, (0, BY - 0.1083, 0.509))
    for y in (BY - 0.07, BY + 0.07):
        box('handle_post', (0.018, 0.016, 0.03), (0, y, 0.555 + 0.012), pb, bevel=0.005)
    box('handle_grip', (0.022, 0.17, 0.016), (0, BY, 0.585), pb, bevel=0.007, segments=3)
    # faucet: shank out of the base collar, barrel, nozzle; lever on its pivot at the barrel top
    y_f = BY - 0.109
    cyl('faucet_shank', 0.011, 0.03, (0, y_f - 0.006, 0.275), pb, verts=16, rotation=(R(90), 0, 0))
    cyl('faucet_barrel', 0.0125, 0.07, (0, y_f - 0.024, 0.266), pb, verts=20, bevel=0.002)
    cyl('faucet_nozzle', 0.0075, 0.012, (0, y_f - 0.024, 0.225), pb, verts=16, r2=0.0055)
    blob('nozzle_drip', 0.004, 0.0025, (0, y_f - 0.024, 0.2192), dried(), 5, z=-0.0006)
    box('faucet_drip_run', (0.003, 0.0006, 0.02), (0.006, y_f - 0.0368, 0.245), dried(), bevel=0.0003)
    empty('fill_spout', (0, y_f - 0.024, 0.218))
    empty('fill_point', (0, -0.085, 0.0195))
    piv = (0, y_f - 0.024, 0.302)
    # built round the pivot at the origin, then moved there: the node's origin is the pivot (press = rotate about X)
    lv = box('lever', (0.016, 0.062, 0.012), (0, -0.03, 0.004), grey, bevel=0.004, segments=2)
    parts = [box('lever_paddle', (0.04, 0.016, 0.022), (0, -0.064, -0.002), grey, bevel=0.006, segments=2),
             cyl('lever_hub', 0.009, 0.026, (0, 0, 0), pb, verts=14, rotation=(0, R(90), 0)),
             blob('lever_sticky', 0.011, 0.005, (0, -0.064, 0.0112), dried(), 8)]
    for q in parts:
        q.parent = lv
    at_pivot(lv, piv); lv.rotation_euler = (R(8), 0, 0)


def set_uv(o, key):
    """Point every UV of o at a flat atlas swatch (boxes and cylinders that should be one printed colour)."""
    me = o.data; ul = me.uv_layers.active or me.uv_layers.new(); u, v = mid(key)
    for l in ul.data:
        l.uv = (u, v)
    return o


def disc(name, r, key, mat, loc=(0, 0, 0), rot=(0, 0, 0), segs=16, spin=0.0):
    """A flat printed disc (foil lid), UVs planar into an atlas rect."""
    u0, v0, u1, v1 = RECT[key]
    verts = [(0, 0, 0)] + [(r * math.cos(TAU * k / segs), r * math.sin(TAU * k / segs), 0) for k in range(segs)]
    uv = lambda x, y: (u0 + (u1 - u0) * (0.5 + 0.5 * (x * math.cos(spin) - y * math.sin(spin)) / r), v0 + (v1 - v0) * (0.5 + 0.5 * (x * math.sin(spin) + y * math.cos(spin)) / r))
    faces, uvs = [], []
    for k in range(segs):
        a, b = 1 + k, 1 + (k + 1) % segs
        faces.append((0, a, b)); uvs.append([uv(*verts[0][:2]), uv(*verts[a][:2]), uv(*verts[b][:2])])
    return mk(name, verts, faces, uvs, mat, loc, rot)


def card(name, w, h, t, key, mat, loc, rot=(0, 0, 0), portrait=False):
    """A printed flat thing (packet, flattened sleeve) standing on its base centre; portrait turns the print 90
    degrees so a landscape label reads up the long side."""
    import mathutils
    if portrait:
        o = carton(name, h, t, w, RECT[key], mat)
        o.data.transform(mathutils.Matrix.Translation((0, 0, h / 2 - w / 2)) @ mathutils.Matrix.Translation((0, 0, w / 2)) @ mathutils.Matrix.Rotation(R(90), 4, 'Y') @ mathutils.Matrix.Translation((0, 0, -w / 2)))
    else:
        o = carton(name, w, t, h, RECT[key], mat)
    o.location = loc; o.rotation_euler = rot
    return o


def drop(o, others, step=0.0015, limit=0.3):
    """Lower o until it touches one of others, then back off a step: dropped onto a heap, no sliding."""
    from mathutils.bvhtree import BVHTree
    trees = [world_bvh(x) for x in others] + [world_bvh(c) for x in others for c in x.children if c.type == 'MESH']
    for _ in range(int(limit / step)):
        bpy.context.view_layer.update()
        b = world_bvh(o)
        if any(b.overlap(t) for t in trees):
            o.location.z += step; return True
        o.location.z -= step
    return False


def bin_box(name, w, d, h, mat, loc, wall=0.002):
    b = box(name, (w, d, h), (loc[0], loc[1], loc[2] + h / 2), mat, bevel=0.006, segments=3)
    carve(b, box(name + '_in', (w - 2 * wall, d - 2 * wall, h), (loc[0], loc[1], loc[2] + wall + h / 2), None, bevel=0.005, segments=2))
    return b


def creamer_cup(name, key, mat, ink, loc, rot=(0, 0, 0), segs=10):
    """Portion creamer thimble, 3.5 x 2.5 cm, foil lid printed (half-and-half / vanilla). Origin at its base."""
    o = lathe2(name, [(0.0, 0.0, 'sw_white', 0.5), (0.0122, 0.0, 'sw_white', 0.5), (0.0166, 0.0225, 'sw_white', 0.5), (0.0182, 0.0228, 'sw_white', 0.5),
                      (0.0182, 0.0238, 'sw_white', 0.5), (0.0, 0.0238, 'sw_white', 0.5)], mat, segs)
    f = disc(name + '_foil', 0.0181, key, ink, (0, 0, 0.0240), segs=segs, spin=random.Random(name).uniform(0, TAU))
    f.parent = o
    o.location = loc; o.rotation_euler = rot
    return o


def settle(active, passive, frames=140, floor=0.002):
    """Drop active objects onto passive ones with Blender rigid bodies (convex hulls, tight margins) and keep where
    they come to rest: a real heap, not a stack of balanced towers."""
    import mathutils
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    starts = {o.name: o.matrix_world.copy() for o in active}
    pads = []
    for o in passive:                                # thin triangle-soup floors let small things tunnel: put a thick pad under each
        bb = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
        x0, x1 = min(v.x for v in bb), max(v.x for v in bb); y0, y1 = min(v.y for v in bb), max(v.y for v in bb); z0 = min(v.z for v in bb)
        pads.append(box('__pad', (x1 - x0, y1 - y0, 0.2), ((x0 + x1) / 2, (y0 + y1) / 2, z0 + floor - 0.1)))
    passive = list(passive) + pads
    bpy.ops.rigidbody.world_add()
    w = scene.rigidbody_world; w.substeps_per_frame = 40; w.solver_iterations = 40
    w.point_cache.frame_start, w.point_cache.frame_end = 1, frames
    for o, kind in [(o, 'PASSIVE') for o in passive] + [(o, 'ACTIVE') for o in active]:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.rigidbody.object_add(type=kind)
        rb = o.rigid_body; rb.collision_shape = 'MESH' if kind == 'PASSIVE' else 'CONVEX_HULL'
        rb.use_margin = True; rb.collision_margin = 0.0003; rb.friction = 0.7; rb.restitution = 0.05
        rb.mass = 0.015; rb.linear_damping = 0.3; rb.angular_damping = 0.3
    for f in range(1, frames + 1):
        scene.frame_set(f)
    for o in active + passive:
        mw = o.matrix_world.copy()
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.rigidbody.object_remove(); o.matrix_world = mw
    bpy.ops.rigidbody.world_remove(); scene.frame_set(1)
    for p in pads:
        bpy.data.objects.remove(p)
    lo = min(min((o.matrix_world @ mathutils.Vector(c)).z for c in o.bound_box) for o in passive[:len(passive) - len(pads)])
    for o in active:                                 # anything that still escaped goes back where it started
        if o.matrix_world.translation.z < lo - 0.01 or o.matrix_world.translation.length > 50:
            print('SETTLE escaped', o.name); o.matrix_world = starts[o.name]


def at_pivot(o, piv):
    """Keep o's mesh where it was built (relative to the origin) and move its origin onto the pivot point."""
    import mathutils
    o.data.transform(mathutils.Matrix.Translation(o.location)); o.location = piv


def nudge_up(o, others, step=0.0005, limit=0.05):
    """Raise o until it no longer intersects others (things dropped onto a heap)."""
    for _ in range(int(limit / step)):
        bpy.context.view_layer.update()
        b = world_bvh(o)
        if not any(b.overlap(world_bvh(x)) for x in others):
            return
        o.location.z += step


def stack_cups(name, n, segs=14):
    """n nested cups mouth up as one mesh (the bottom cup whole, then each cup's top 11 mm and rim bead above the one
    below), ending in the top cup's inside so the stack still reads when its top cup (a take_ node) is gone."""
    p = cup_outer() + [(r, z, 'sw_paper', 0.5) for r, z in RIM]
    for k in range(1, n):
        z = k * P_NEST
        p += [(0.0430, (k - 1) * P_NEST + 0.1119, 'cup', 0.9), (0.0457, z + 0.1097, 'cup', 0.97)]
    z = (n - 1) * P_NEST
    p += [(0.0445, z + 0.1121, 'sw_paper', 0.5), (0.0434, z + 0.1113, 'sw_paper', 0.5), (wall_r(0.104) - 0.0004, z + 0.104, 'sw_inner', 0.5),
          (wall_r(0.009) - 0.0004, z + 0.009, 'sw_inner', 0.5), (0.0, z + 0.009, 'sw_inner', 0.5)]
    return lathe2(name, p, A(0.5, 'cup_print'), segs)


def cup_rack(m):
    """Angled cup rack (after the Fort Bragg counter): 15 mm oak side panels cut away at the front, a thin back, per
    tier a seat board square to the 20 degree lean and a collar board with two round cut-outs; four stacks of 12 oz
    cups mouth up, each top cup a take_cup node, the rest a stack_ node. One stack shorter, one top crushed."""
    wood = oak()
    for sx in (-1, 1):
        prism('side', [(-0.13, 0.0), (0.106, 0.0), (0.106, 0.55), (0.0, 0.55), (-0.13, 0.30)], 0.015, sx * 0.1425, wood)
    b = box('back', (0.27, 0.006, 0.53), (0, 0.103, 0.275), wood, bevel=0.001); uv_grain(b)
    b = box('front_rail', (0.27, 0.015, 0.03), (0, -0.115, 0.015), wood, bevel=0.002); uv_grain(b)
    t = R(20); ax = (0, math.sin(t), math.cos(t))
    at = lambda B, d: (B[0] + d * ax[0], B[1] + d * ax[1], B[2] + d * ax[2])
    tiers = [(-0.045, 0.035), (-0.065, 0.262)]
    counts = [16, 16, 17, 11]
    ink = A(0.5, 'cup_print')
    k = 0
    for ti, (by, bz) in enumerate(tiers):
        seat = box('seat', (0.27, 0.12, 0.012), at((0, by, bz), -0.0062), wood, bevel=0.002); seat.rotation_euler = (-t, 0, 0); uv_grain(seat)
        col = box('collar', (0.27, 0.10, 0.012), at((0, by, bz), 0.15), wood, bevel=0.002); col.rotation_euler = (-t, 0, 0)
        for sx in (-1, 1):
            c = cyl('hole', 0.0475, 0.05, (sx * 0.0675, 0, 0), None, verts=24); c.parent = col
            carve(col, c)
        uv_grain(col)
        for sx in (-1, 1):
            n = counts[k]; B = (sx * 0.0675, by, bz)
            st = stack_cups(f'stack_{k}', n - 1, segs=12)
            cp = cup_body('take_cup' + ('' if k == 0 else f'00{k}'), ink, segs=16)
            rnd = random.Random(k)
            deform(cp, rnd.uniform(0, TAU), 0.0015, 0.09, 0.4)                       # every rim a little dented
            if k == 1:                                                                # the top two cups of one stack crushed in
                deform(cp, -math.pi / 2, 0.007, 0.07)
                deform(st, -math.pi / 2, 0.005, (n - 2) * P_NEST + 0.07)
            st.location = B; st.rotation_euler = (-t, 0, 0)
            cp.location = at(B, (n - 1) * P_NEST); cp.rotation_euler = (-t, 0, rnd.uniform(0, TAU) * 0)
            k += 1
    bpy.context.view_layer.update()
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH'], 'cup-rack')


def lid_stack(name, n, R, segs=16):
    """n domed lids nested at 6 mm as one mesh: the bottom lid's underside, each skirt edge, the top lid's dome."""
    lp = lid_profile(R)
    p = [(R + 0.0004, -0.0052, 'sw_white', 0.5), (R - 0.0060, -0.0001, 'sw_white', 0.5), (R - 0.0100, 0.0105, 'sw_white', 0.5), (0.0, 0.0143, 'sw_white', 0.5)][::-1]
    for k in range(n - 1):
        z = k * 0.006
        p += [(R + 0.0010, z - 0.005, 'sw_white', 0.5), (R + 0.0015, z + 0.0008, 'sw_white', 0.5)]
    z = (n - 1) * 0.006
    p += [(r, z + zz, 'sw_white', 0.5) for r, zz in lp]
    return lathe2(name, p, lid_mat(), segs)


def lid_bin(m):
    """Open black PP bin of white domed sip lids, two short nested stacks standing on edge back to back (9.0 and
    8.7 cm, domes outward, take_lid / take_lid001 at their ends) and one loose lid lying upside down on top."""
    pp = material('pp_black', color=(0.02, 0.02, 0.022), roughness=0.55)
    W, D, H = 0.16, 0.12, 0.09
    b = box('bin', (W, D, H), (0, 0, H / 2), pp, bevel=0.008, segments=3)
    carve(b, box('bin_in', (W - 0.006, D - 0.006, 0.2), (0, 0, 0.003 + 0.1), None, bevel=0.006, segments=2))
    for i, (R_, n, sx) in enumerate(((0.0457, 9, -1), (0.0442, 7, 1))):
        zc = 0.003 + R_ + 0.0016
        st = lid_stack(f'stack_{i}', n - 1, R_)
        st.location = (sx * 0.006, 0, zc); st.rotation_euler = (0, sx * R(90), 0)
        tk = lid('take_lid' + ('' if i == 0 else '001'), lid_mat(), pp, R=R_, segs=16)
        tk.location = (sx * (0.006 + (n - 1) * 0.006), 0, zc); tk.rotation_euler = (R(90) * 0 + (0 if sx > 0 else 0), sx * R(90), 0)
    lo = lid('loose_lid', lid_mat(), pp, R=0.0457, segs=14)
    lo.location = (-0.022, 0.006, 0.095); lo.rotation_euler = (R(184), R(-5), R(30))
    nudge_up(lo, [o for o in bpy.context.scene.objects if o.type == 'MESH' and o is not lo])
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH'], 'lid-bin')


def condiment_riser(m):
    """Three-tier blond-oak riser (15 mm boards: stepped side panels, back, shelves at 2 / 18 / 34 cm with front lips).
    Top: two creamer pump bottles (take_creamer_pump*, pump_point* at the nozzles) on a sticky ring. Middle: four
    glossy bins, orange / blue, of sweetener packets (take_sugar_packet*) and portion creamers (take_creamer*), a
    slot of flattened kraft sleeves behind them (take_sleeve). Bottom: lid-bin space on the left, napkins on the right
    (take_napkin), one pulled out in a clump; packets spilled."""
    wood, ink = oak(), A(0.6, 'riser_print')
    white = material('pp_white', color=(0.94, 0.94, 0.92), roughness=0.3)
    cols = [material('bin_orange', color=(0.86, 0.26, 0.05), roughness=0.15), material('bin_blue', color=(0.07, 0.33, 0.78), roughness=0.15)]
    for sx in (-1, 1):
        prism('side', [(-0.125, 0.0), (0.125, 0.0), (0.125, 0.50), (-0.06, 0.50), (-0.06, 0.215), (-0.105, 0.215), (-0.105, 0.07), (-0.125, 0.07)], 0.015, sx * 0.1925, wood)
    for name, size, loc in (('back', (0.37, 0.015, 0.50), (0, 0.1175, 0.25)), ('shelf0', (0.37, 0.235, 0.015), (0, -0.0075, 0.0125)),
                            ('shelf1', (0.37, 0.215, 0.015), (0, 0.0025, 0.1725)), ('shelf2', (0.37, 0.17, 0.015), (0, 0.025, 0.3325)),
                            ('lip0', (0.37, 0.012, 0.03), (0, -0.119, 0.035)), ('lip1', (0.37, 0.012, 0.03), (0, -0.099, 0.195)), ('lip2', (0.37, 0.012, 0.03), (0, -0.054, 0.355))):
        uv_grain(box(name, size, loc, wood, bevel=0.0015, segments=2))
    rnd = random.Random(21)
    # middle tier: bins of packets and creamers
    Z1 = 0.18
    pks = ['pk_white', 'pk_brown', 'pk_pink', 'pk_blue', 'pk_yellow']
    for i, x in enumerate((-0.139, -0.046, 0.046, 0.139)):
        y = -0.051
        bin_box(f'bin{i}', 0.088, 0.08, 0.06, cols[i % 2], (x, y, Z1))
        if i % 2 == 0:
            for c in range(3):                           # a bed of packets lying flat under the standing ones
                card('packet_bed', 0.06, 0.035, 0.003, rnd.choice(pks), ink, (x + rnd.uniform(-0.01, 0.01), y - 0.02 + 0.02 * c, Z1 + 0.002 + 0.0032 * c), (R(-90), 0, R(rnd.uniform(-10, 10))))
            for c in range(2):
                for r in range(5 - (i == 2)):
                    card('packet', 0.06, 0.035, 0.003, rnd.choice(pks), ink, (x - 0.019 + 0.038 * c + rnd.uniform(-0.002, 0.002), y - 0.026 + 0.0135 * r, Z1 + 0.0125),
                         (R(-12 + rnd.uniform(-4, 4)), 0, R(rnd.uniform(-4, 4))), portrait=True)
            tk = card('take_sugar_packet' + ('' if i == 0 else '001'), 0.06, 0.035, 0.003, rnd.choice(pks), ink, (x + 0.004, y + 0.004, Z1 + 0.074), (R(-90 + 8), 0, R(rnd.uniform(-20, 20))))
        else:
            cups = []
            for c in range(7):                       # tipped in from above and left to settle (rigid bodies)
                nm = ('take_creamer' + ('' if i == 1 else '001')) if c == 6 else 'creamer'
                cc = creamer_cup(nm, 'foil_half' if c % 2 else 'foil_van', white, ink, (x + rnd.uniform(-0.015, 0.015), y + rnd.uniform(-0.012, 0.012), Z1 + 0.02 + 0.03 * c),
                                 (R(rnd.uniform(-50, 50)), R(rnd.uniform(-50, 50)), rnd.uniform(0, TAU)))
                join_children(cc); cups.append(cc)
            settle(cups, [bpy.data.objects[f'bin{i}']])
    # sleeves standing in a slot behind the bins (two cleats), front one is take_sleeve
    for yy in (-0.006, 0.062):
        uv_grain(box('cleat', 0.15, 0.008, 0.012) if False else box('cleat', (0.15, 0.008, 0.012), (-0.095, yy, Z1 + 0.006), wood, bevel=0.001))
    for k in range(18):
        nm = 'take_sleeve' if k == 0 else 'sleeve_flat'
        card(nm, 0.058, 0.122, 0.0026, 'sleeve', ink, (-0.095 + rnd.uniform(-0.002, 0.002), 0.0 + 0.0031 * k, Z1), (R(-6), 0, R(rnd.uniform(-1.5, 1.5))), portrait=True)
    # top tier: pump bottles on a sticky ring
    Z2 = 0.34
    for i, (x, lab, cap) in enumerate(((-0.075, 'btl_vanilla', 'sw_red'), (0.075, 'btl_hazel', 'sw_red'))):
        nm = 'take_creamer_pump' + ('' if i == 0 else '001')
        body = lathe2(nm, [(0.0, 0.0, 'sw_white', 0.5), (0.036, 0.0, 'sw_white', 0.5), (0.04, 0.006, 'sw_white', 0.5), (0.04, 0.15, 'sw_white', 0.5), (0.034, 0.175, 'sw_white', 0.5),
                           (0.02, 0.19, 'sw_white', 0.5), (0.016, 0.196, 'sw_white', 0.5), (0.016, 0.2, 'sw_white', 0.5), (0.0, 0.2, 'sw_white', 0.5)], ink, 24)
        lb = lathe2(nm + '_lbl', [(0.0404, 0.03, lab, 0.0), (0.0404, 0.14, lab, 1.0)], ink, 24, repeat=2)
        col = lathe2(nm + '_collar', [(0.0, 0.199, cap, 0.5), (0.019, 0.199, cap, 0.5), (0.019, 0.214, cap, 0.5), (0.0, 0.214, cap, 0.5)], ink, 16)
        stem = lathe2(nm + '_stem', [(0.005, 0.213, 'sw_white', 0.5), (0.005, 0.232, 'sw_white', 0.5)], ink, 10)
        head = set_uv(box(nm + '_head', (0.024, 0.05, 0.02), (0, -0.01, 0.242), ink, bevel=0.005, segments=2), cap)
        noz = set_uv(cyl(nm + '_nozzle', 0.004, 0.026, (0, -0.045, 0.239), ink, verts=10, rotation=(R(90), 0, 0)), cap)
        for q in (body, lb):
            for v in q.data.vertices:
                v.co.x *= 1.15; v.co.y *= 0.85
        for q in (lb, col, stem, head, noz):
            q.parent = body
        e = empty('pump_point' + ('' if i == 0 else '001'), (0, -0.058, 0.236)); e.parent = body
        body.location = (x, 0.025, Z2)
        set_uv(ring_film('sticky_ring', 0.034, 0.05, 0, TAU * 0.8, (x + 0.004, 0.02, Z2), ink, 40 + i), 'sw_creamer')
    # bottom tier: napkins and a pulled-out clump; spilled packets
    Z0 = 0.02
    for k in range(20):
        nm = 'take_napkin' if k == 19 else 'napkin'
        set_uv(box(nm, (0.13, 0.125, 0.0014), (0.1 + rnd.uniform(-0.003, 0.003), -0.035 + rnd.uniform(-0.003, 0.003), Z0 + 0.0008 + 0.0015 * k), ink, bevel=0.0006, segments=1), 'sw_paper').rotation_euler = (0, 0, R(rnd.uniform(-2, 2)))
    clump = pillow('napkin_clump', 0.11, 0.09, 0.03, RECT['sw_paper'], ink, (0.085, -0.115, Z0 + 0.03), (R(70), R(10), R(-15)), crimp=0.02, nx=6, nz=6)
    nudge_up(clump, [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(('lip0', 'shelf0', 'napkin'))])
    card('packet_spill', 0.06, 0.035, 0.003, 'pk_pink', ink, (0.0, -0.095, Z0), (R(-90), 0, R(25)))
    card('packet_spill', 0.06, 0.035, 0.003, 'pk_blue', ink, (0.13, -0.16, 0.0), (R(-90), 0, R(-50)))
    disc('foil_peeled', 0.018, 'foil_half', ink, (-0.07, -0.15, 0.0004), spin=1.0)
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(('side', 'napkin', 'packet', 'sleeve_flat'))], 'riser')


def hot_water_box(m):
    """Hot-water dispenser (Bunn H-series type, small): black powder-coat box, chrome bezel round a printed black front
    panel, push-back chrome lever on a housing with an orange HOT sticker (corner lifting), short chrome spout with
    limescale, red ready lamp, hinged fill lid on top, black drip tray in front with water spots. Hooks: fill_spout,
    fill_point, lever (origin on its pivot), cord_exit at the back bottom."""
    pc = material('powder_black', color=(0.025, 0.025, 0.028), roughness=0.5)
    chrome = m['chrome']; ink = A(0.4, 'hw_print')
    lamp = material('emiss_lamp', color=(0.9, 0.05, 0.03), roughness=0.3)
    b = lamp.node_tree.nodes['Principled BSDF']; b.inputs['Emission Color'].default_value = (1, 0.05, 0.02, 1); b.inputs['Emission Strength'].default_value = 6
    W, D, H, FY = 0.185, 0.26, 0.40, -0.12
    box('body', (W, D, H), (0, FY + D / 2, H / 2), pc, bevel=0.004, segments=2)
    for (w, h, x, z) in ((W - 0.004, 0.012, 0, H - 0.008), (W - 0.004, 0.012, 0, 0.062), (0.012, H - 0.07, -W / 2 + 0.008, 0.231), (0.012, H - 0.07, W / 2 - 0.008, 0.231)):
        box('bezel', (w, 0.004, h), (x, FY - 0.002, z), chrome, bevel=0.0015, segments=2)
    card('panel', 0.16, 0.316, 0.001, 'hw_panel', ink, (0, FY - 0.0005, 0.07))
    cyl('lamp', 0.0045, 0.004, (0.06, FY - 0.0022, 0.36), lamp, verts=12, rotation=(R(90), 0, 0))
    # lever housing with sticker, spout, lever on its pivot
    box('lever_housing', (0.03, 0.022, 0.024), (0, FY - 0.011, 0.236), pc, bevel=0.004)
    cyl('spout_h', 0.0055, 0.04, (0, FY - 0.02, 0.206), chrome, verts=14, rotation=(R(90), 0, 0))
    cyl('spout_v', 0.0055, 0.022, (0, FY - 0.04, 0.198), chrome, verts=14)
    sc = set_uv(lathe2('limescale', [(0.0068, 0.0, 'scale', 0.5), (0.0062, -0.003, 'scale', 0.5), (0.0035, -0.0042, 'scale', 0.5), (0.0, -0.0044, 'scale', 0.5)][::-1][::-1], ink, 12, (0, FY - 0.04, 0.187)), 'scale')
    empty('fill_spout', (0, FY - 0.04, 0.1825))
    # push-back lever standing up from the housing, the orange HOT flag stuck on its top (as in the photo)
    lv = box('lever', (0.009, 0.006, 0.05), (0, 0, 0.025), chrome, bevel=0.002)
    hub = cyl('lever_hub', 0.006, 0.026, (0, 0, 0), chrome, verts=12, rotation=(0, R(90), 0))
    flag = card('sticker', 0.022, 0.033, 0.0006, 'hw_sticker', ink, (0, -0.0035, 0.03))
    v = max(flag.data.vertices, key=lambda v: v.co.x + v.co.z - v.co.y * 10); v.co.y -= 0.003      # corner lifting
    for q in (hub, flag):
        q.parent = lv
    at_pivot(lv, (0, FY - 0.03, 0.236)); lv.rotation_euler = (R(-8), 0, 0)
    # fill lid on top, drip tray in front
    lathe2('fill_lid', [(0.036, H + 0.0, 'sw_white', 0.5), (0.036, H + 0.004, 'sw_white', 0.5), (0.033, H + 0.006, 'sw_white', 0.5), (0.0, H + 0.006, 'sw_white', 0.5)], chrome, 28, (0, 0.04, 0))
    cyl('fill_knob', 0.009, 0.014, (0, 0.04, H + 0.013), pc, verts=14, bevel=0.003)
    box('fill_hinge', (0.03, 0.008, 0.006), (0, 0.078, H + 0.003), chrome, bevel=0.002)
    tray = box('tray', (0.17, 0.085, 0.04), (0, FY - 0.0425, 0.02), pc, bevel=0.005, segments=2)
    carve(tray, box('tray_well', (0.15, 0.065, 0.01), (0, FY - 0.0425, 0.04), None, bevel=0.003))
    for k in range(7):
        box('tray_rib', (0.148, 0.003, 0.004), (0, FY - 0.072 + k * 0.0098, 0.0376), pc)
    card('tray_spots', 0.146, 0.062, 0.0003, 'tray_spots', ink, (0, FY - 0.0425, 0.0351), (R(-90), 0, 0))
    empty('fill_point', (0, FY - 0.04, 0.0374))
    cyl('cord_grommet', 0.006, 0.01, (0.05, FY + D + 0.004, 0.025), pc, verts=12, rotation=(R(90), 0, 0))
    empty('cord_exit', (0.05, FY + D + 0.009, 0.025))
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(('bezel',))], 'hot-water')


def stirrer_tumbler(m):
    """Thick-based clear tumbler of ~44 white stir straws fanned in three rings (none crossing), take_stirrer pulled
    up proud, three lying beside it on a sticky ring. A separate root node 'basket' (offset -0.35, +0.2 in three.js)
    holds a round wicker basket heaped with 30 foil-lidded creamer thimbles, dropped one by one so none intersect;
    take_creamer_cup is the top one; three leak a white smear."""
    glass = bpy.data.materials.get('glass') or material('glass', color=(0.9, 0.95, 0.95), roughness=0.05, alpha=0.25)
    white = material('pp_white', color=(0.95, 0.95, 0.94), roughness=0.35)
    ink = A(0.35, 'foil_print')
    lathe2('tumbler', [(0.0, 0.0, 'sw_white', 0.5), (0.0365, 0.0, 'sw_white', 0.5), (0.038, 0.002, 'sw_white', 0.5), (0.041, 0.1, 'sw_white', 0.5), (0.0398, 0.1012, 'sw_white', 0.5),
                       (0.0385, 0.0998, 'sw_white', 0.5), (0.0355, 0.014, 'sw_white', 0.5), (0.03, 0.012, 'sw_white', 0.5), (0.0, 0.0115, 'sw_white', 0.5)], glass, 32)
    ring_film('sticky', 0.036, 0.046, R(30), R(330), (0.004, -0.003, 0.0), glass, 4)
    rnd = random.Random(9); straws = []
    for ring, (n, rb, rr, off) in enumerate(((24, 0.026, 0.0335, 0.0), (14, 0.0165, 0.0235, 0.5), (6, 0.007, 0.0135, 0.25))):
        for k in range(n):
            a = TAU * (k + off) / n + rnd.uniform(-0.03, 0.03)
            z0, z1 = 0.0125, 0.1
            p0 = (rb * math.cos(a), rb * math.sin(a), z0); p1 = (rr * math.cos(a), rr * math.sin(a), z1)
            d = [p1[i] - p0[i] for i in range(3)]; L = math.sqrt(sum(c * c for c in d)); d = [c / L for c in d]
            lift = 0.025 if (ring == 2 and k == 0) else 0.0
            ln = 0.19
            c = [p0[i] + d[i] * ln / 2 for i in range(3)]; c[2] += lift
            o = cyl('take_stirrer' if lift else 'straw', 0.0026, ln, tuple(c), white, verts=6)
            o.rotation_euler = (math.atan2(-d[1], d[2]) * 0 + 0, 0, 0)
            import mathutils
            o.rotation_euler = mathutils.Vector((0, 0, 1)).rotation_difference(mathutils.Vector(d)).to_euler()
            straws.append(o)
    for k in range(3):
        o = cyl('straw_loose', 0.0026, 0.19, (0.09 + 0.008 * k, -0.02 + 0.012 * k, 0.0026 + (0.0052 if k == 2 else 0)), white, verts=6, rotation=(R(90), 0, R(70 + 9 * k)))
    # the basket, its own root node
    root = empty('basket', (-0.35, -0.2, 0))
    wick = bpy.data.materials.get('wicker_weave') or wicker()
    prof = [(0.058, 0.0), (0.075, 0.068), (0.0785, 0.0715), (0.077, 0.075), (0.073, 0.072), (0.057, 0.008), (0.0, 0.008)]
    acc, pts = 0.0, []
    for i, (r, z) in enumerate(prof):
        if i:
            acc += math.hypot(r - prof[i - 1][0], z - prof[i - 1][1])
        pts.append((r, z, (0, 0, 1, 1), acc / 0.05))
    bk = lathe2('basket_weave', [(0.0, 0.0, (0, 0, 1, 1), -0.2)] + pts, wick, 40, uscale=9.0)
    bk.location = (-0.35, -0.2, 0)
    heap = [bk]
    cups = []
    for k in range(30):                              # spaced out in a loose spiral column above the basket
        a = k * 2.4; rr = 0.03 + 0.012 * (k % 3)
        cc = creamer_cup('take_creamer_cup' if k == 29 else 'creamer', 'foil_half' if rnd.random() < 0.6 else 'foil_van', white, ink,
                         (-0.35 + rr * math.cos(a), -0.2 + rr * math.sin(a), 0.03 + 0.03 * k), (R(rnd.uniform(-40, 40)), R(rnd.uniform(-40, 40)), rnd.uniform(0, TAU)))
        join_children(cc); cups.append(cc)
    settle(cups, [bk])
    heap += cups
    for k in range(3):
        heap.append(blob('creamer_smear', 0.009, 0.005, (-0.35 + 0.05 * math.cos(k * 2.1), -0.2 + 0.05 * math.sin(k * 2.1), 0.0085), white, 60 + k, z=0.0008))
    bpy.context.view_layer.update()
    for o in heap:                                   # everything in the basket hangs off its own root node
        mw = o.matrix_world.copy(); o.parent = root; o.matrix_world = mw
    overlaps(straws + [bpy.data.objects['tumbler']], 'straws')
    overlaps([o for o in heap if o.name != 'creamer_smear' and not o.name.startswith('creamer_smear')], 'creamers')


def pixels(name, arr, non_color=False):
    """A packed Blender image from a float (H, W, 4) array (bottom row first)."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(arr.astype('float32').ravel()); img.pack()
    return img


def quartz_top(W, D):
    """White quartz with what a self-serve counter collects: partial coffee rings (cup feet, 6 cm), sugar grit by the
    towers and riser, a faint rag-wipe swirl in the gloss; colour and roughness maps at 1024 x 256 over the top."""
    import numpy as np
    w, h = 1024, 256
    xs = (np.arange(w) + 0.5) / w * W - W / 2; ys = (np.arange(h) + 0.5) / h * D - D / 2
    X, Y = np.meshgrid(xs, ys)
    col = np.ones((h, w, 3)) * np.array([0.86, 0.86, 0.84]); rough = np.full((h, w), 0.17)
    rnd = random.Random(14)
    for (cx, cy, rr) in [(1.45, -0.03, 0.17)]:      # wipe swirl and grime round the hole and in front of the towers
        pass
    for k in range(3):
        x0, y0 = rnd.uniform(-1.2, 1.2), rnd.uniform(-0.3, 0.3)
        rad = np.hypot(X - x0, Y - y0)
        rough += 0.025 * np.sin(rad * 140 + k) * np.exp(-((rad - 0.35) / 0.25) ** 2)
    stain = np.zeros((h, w))
    spots = [(rnd.uniform(-0.75, 0.45), rnd.uniform(-0.25, -0.02)) for _ in range(9)] + [(rnd.uniform(1.15, 1.32), rnd.uniform(-0.2, 0.15)) for _ in range(4)]
    for (cx, cy) in spots:
        rr = rnd.uniform(0.027, 0.031); a0 = rnd.uniform(0, TAU); span = rnd.uniform(3.2, 5.6)
        ang = (np.arctan2(Y - cy, X - cx) - a0) % TAU
        arc = np.clip(1 - np.abs(ang - span / 2) / (span / 2), 0, 1) ** 0.5
        d = np.abs(np.hypot(X - cx, Y - cy) - rr)
        stain = np.maximum(stain, rnd.uniform(0.35, 0.8) * arc * np.exp(-(d / 0.0016) ** 2))
    for _ in range(5):                                # dried drips: small soft blots
        cx, cy = rnd.uniform(-0.7, 0.4), rnd.uniform(-0.3, 0.05)
        stain = np.maximum(stain, 0.5 * np.exp(-(np.hypot(X - cx, (Y - cy) * 1.6) / 0.004) ** 2))
    col *= 1 - stain[..., None] * np.array([0.20, 0.32, 0.45])
    rough += 0.18 * stain
    grit = np.zeros((h, w))
    for _ in range(900):
        i = int(rnd.uniform(0.3, 0.7) * h) if rnd.random() < 0.8 else rnd.randrange(h)
        j = int((rnd.uniform(-0.7, 1.1) + W / 2) / W * w)
        grit[i, j] = rnd.uniform(0.5, 1)
        if rnd.random() < 0.15:
            col[i, j] *= np.array([0.85, 0.75, 0.6])  # a raw-sugar grain
    rough += 0.45 * grit; col += 0.08 * grit[..., None]
    rgba = lambda a: np.dstack([a, np.ones((h, w))]) if a.ndim == 3 else np.dstack([a, a, a, np.ones((h, w))])
    m = bpy.data.materials.new('quartz_top'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = pixels('quartz_color', rgba(np.clip(col, 0, 1)))
    tr = nt.nodes.new('ShaderNodeTexImage'); tr.image = pixels('quartz_rough', rgba(np.clip(rough, 0.05, 0.9)), True)
    nt.links.new(tc.outputs['Color'], b.inputs['Base Color']); nt.links.new(tr.outputs['Color'], b.inputs['Roughness'])
    return m


def plinth_mat(L):
    """Charcoal toe-kick with shoe scuffs (grey streaks and black rubber marks in the bottom 5 cm)."""
    import numpy as np
    w, h = 1024, 32
    col = np.full((h, w), 0.10); rnd = random.Random(5)
    for _ in range(70):
        j0 = rnd.randrange(w); ln = rnd.randint(4, 30); i0 = rnd.randint(0, int(h * 0.5))
        col[i0:i0 + rnd.randint(1, 2), j0:j0 + ln] = rnd.choice([0.2, 0.24, 0.04, 0.03])
    m = bpy.data.materials.new('plinth_scuffed'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.6
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = pixels('plinth_color', np.dstack([col, col, col * 1.05, np.ones((h, w))]))
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


def coffee_station(m):
    """The self-serve coffee counter, bare (everything that stands on it is its own model now): 3 cm white quartz top
    with coffee rings, sugar grit and a rag-wipe swirl in its gloss; four vertical-grain walnut laminate front panels
    and walnut ends; black carcass; recessed charcoal plinth, scuffed. Near the right end a 20 cm waste hole: black
    ABS grommet (1 cm lip, 3 mm proud, stained brown on the tower side) over a dark cut-out, the black slim bin and its
    liner 15 cm down inside. A dried drip trail runs down the front edge below the towers. The wicker cookie basket
    keeps its take_cookie* nodes. Hook: bin_opening at the hole's centre on the top surface."""
    T, W, D = 0.94, 3.23, 0.66
    HX, HY = 1.45, -0.03
    absb = material('abs_black', color=(0.02, 0.02, 0.022), roughness=0.4)
    wood = walnut()
    top = box('top', (W, D, 0.03), (0, 0, T - 0.015), quartz_top(W, D), bevel=0.003, segments=2)
    carve(top, cyl('hole', 0.1, 0.1, (HX, HY, T), None, verts=48))
    apply_uv_top(top, W, D)
    car = box('carcass', (3.164, 0.60, 0.80), (0, 0.0, 0.51), absb)
    carve(car, box('cavity', (0.27, 0.43, 0.835), (1.435, -0.03, 0.5325), None))
    pw = (3.2 - 3 * 0.003) / 4
    for k in range(4):
        uv_grain(box('panel', (pw, 0.018, 0.795), (-1.6 + pw / 2 + k * (pw + 0.003), -0.309, 0.5075), wood, bevel=0.0015, segments=2), tile=1.0, g=2)
    for sx in (-1, 1):
        uv_grain(box('end_panel', (0.018, 0.62, 0.795), (sx * 1.591, -0.009, 0.5075), wood, bevel=0.0015, segments=2), tile=1.0, g=2)
    pl = box('plinth', (3.1, 0.55, 0.11), (0, 0.02, 0.055), plinth_mat(3.1))
    for mod in list(pl.modifiers):
        pass
    me = pl.data; ul = me.uv_layers.active
    for p_ in me.polygons:
        for li in p_.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            ul.data[li].uv = (co.x / 3.1 + 0.5, co.z / 0.11 + 0.5)
    # the waste hole: grommet, stain, bin and liner below
    lathe2('grommet', [(0.098, T - 0.045, 'sw_white', 0.5), (0.1, T - 0.045, 'sw_white', 0.5), (0.1, T, 'sw_white', 0.5), (0.11, T, 'sw_white', 0.5), (0.1112, T + 0.0015, 'sw_white', 0.5),
                       (0.11, T + 0.003, 'sw_white', 0.5), (0.0992, T + 0.003, 'sw_white', 0.5), (0.098, T + 0.0018, 'sw_white', 0.5), (0.098, T - 0.045 + 0.0001, 'sw_white', 0.5)], absb, 48, (HX, HY, 0))
    ring_film('rim_stain', 0.1005, 0.1085, R(135), R(235), (HX, HY, T + 0.003), dried(), 3)
    bin_box('bin', 0.26, 0.40, 0.67, absb, (1.435, -0.03, 0.12), wall=0.003)
    bag = liner('bag', 0.26, 0.40, 0.79, 0.05, 7); bag.location = (1.435, -0.03, 0); bag.data.materials[0] = absb
    box('bag_inner', (0.25, 0.39, 0.003), (1.435, -0.03, 0.45), absb)
    empty('bin_opening', (HX, HY, T))
    # dried drip trail down the front edge below the towers
    dx = -0.47
    blob('drip_top', 0.006, 0.004, (dx, -0.322, T + 0.0002), dried(), 2)
    box('drip_edge', (0.0042, 0.0004, 0.028), (dx, -0.3302, T - 0.015), dried())
    box('drip_panel', (0.0034, 0.0004, 0.09), (dx + 0.001, -0.3182, 0.905 - 0.045), dried())
    o = blob('drip_bead', 0.0032, 0.004, (dx + 0.001, -0.3184, 0.905 - 0.091), dried(), 4); o.rotation_euler = (R(90), 0, 0)
    # cookie basket, left of the hole, cookies settled in by rigid bodies
    wick = bpy.data.materials.get('wicker_weave') or wicker()
    prof = [(0.105, 0.0), (0.13, 0.065), (0.1335, 0.0685), (0.132, 0.071), (0.128, 0.067), (0.103, 0.006), (0.0, 0.006)]
    acc, pts = 0.0, []
    for i, (r, z) in enumerate(prof):
        acc += math.hypot(r - prof[i - 1][0], z - prof[i - 1][1]) if i else 0
        pts.append((r, z, (0, 0, 1, 1), acc / 0.05))
    bk = lathe2('cookie_basket', [(0.0, 0.0, (0, 0, 1, 1), -0.2)] + pts, wick, 40, (1.1, -0.19, T), uscale=16.0)
    bk.scale = (1.3, 0.85, 1)
    lab = atlas('products-1k'); rnd = random.Random(5); cookies = []
    for n in range(9):
        c = pillow('cookie', 0.11, 0.09, 0.022, P('cookie-wrap'), lab, (1.1 + rnd.uniform(-0.06, 0.06), -0.19 + rnd.uniform(-0.03, 0.03), T + 0.03 + 0.03 * n),
                   (R(rnd.uniform(70, 110)), R(rnd.uniform(-20, 20)), rnd.uniform(0, 3)), crimp=0.012, axis='x', nx=6, nz=6)
        c.name = 'take_cookie' if n == 0 else f'take_cookie.{n:03d}'
        cookies.append(c)
    settle(cookies, [bk])
    overlaps(cookies + [bk], 'cookies')


ASSETS = {
    'hotel-coffee-station': (coffee_station, [dict(distance=3.4, height=1.7, target=(0, 0, 0.75), yaw=10), dict(distance=0.75, height=1.4, target=(1.3, -0.12, 0.92), yaw=20)]),
    'hotel-coffee-cup': (coffee_cup, [dict(distance=0.42, height=0.28, target=(0, 0, 0.06), yaw=20), dict(distance=0.2, height=0.22, target=(0, 0, 0.1), yaw=25)]),
    'hotel-coffee-tower': (tower, [dict(distance=1.2, height=0.6, target=(0, 0, 0.3), yaw=30), dict(distance=0.45, height=0.32, target=(0, -0.06, 0.2), yaw=35)]),
    'hotel-cup-rack': (cup_rack, [dict(distance=1.1, height=0.75, target=(0, 0, 0.28), yaw=25), dict(distance=0.42, height=0.62, target=(0.05, 0, 0.45), yaw=20)]),
    'hotel-lid-bin': (lid_bin, [dict(distance=0.6, height=0.4, target=(0, 0, 0.05), yaw=25), dict(distance=0.28, height=0.25, target=(0, 0, 0.07), yaw=35)]),
    'hotel-condiment-riser': (condiment_riser, [dict(distance=1.3, height=0.9, target=(0, 0, 0.25), yaw=20), dict(distance=0.5, height=0.45, target=(0.0, 0, 0.2), yaw=15)]),
    'hotel-hot-water-box': (hot_water_box, [dict(distance=1.1, height=0.6, target=(0, 0, 0.2), yaw=30), dict(distance=0.4, height=0.3, target=(0, -0.13, 0.2), yaw=35)]),
    'hotel-stirrer-tumbler': (stirrer_tumbler, [dict(distance=1.0, height=0.6, target=(-0.17, -0.1, 0.06), yaw=15), dict(distance=0.35, height=0.32, target=(-0.33, -0.2, 0.04), yaw=10)]),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, views = ASSETS[name]
        reset()
        build(kit(mats()))
        merge()
        for o in bpy.context.scene.objects:          # twin variant nodes: show the default one in the shots
            o.hide_render = o.name.endswith('_decaf')
        for i, v in enumerate(views):
            preview(os.path.join(SHOTS, name + ('' if i == 0 else '-close') + '.png'), samples=32, **v)
        export(os.path.join(OUT, name + '.glb'), name)

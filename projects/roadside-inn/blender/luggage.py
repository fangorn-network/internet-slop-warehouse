# SPDX-License-Identifier: CC0-1.0
# Round-1 luggage: the brass birdcage bellman's cart (lobby entrance) and the player's 2-wheel soft-side carry-on.
# Brass is real metal PBR with a generated wear map (bright where hands polish it at 0.9-1.15 m, browner and rougher low
# down and at the cast joints, fingerprint smudges): tubes carry UV v = height / 2 m so the map lands by height.
# Wear on fabric/rubber (pale worn carpet, scuffed bumper, scuffed bag corners, scraped wheel housings) is vertex
# colour (glTF COLOR_0, multiplied into the base colour). Textures: ambientCG Fabric004 (nylon 2x2 basket weave) and
# Fabric026 (rib carpet), CC0, ingested by ingestion/ambientcg/ingest.mjs luggage (batches/luggage/provenance.json).
# Origin at floor centre; front faces Blender -Y (three.js +Z).
#   blender -b --python projects/roadside-inn/blender/luggage.py -- [asset ...]     (default: both)
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, export, preview, carve
from sofa import uv_real, apply_mods, select_only, world_bvh
from props import mk, lathe
from lobby import OUT, SHOTS

R = math.radians
TAU = math.tau
NYLON = {'color': 'acg-luggage-nylon-color.jpg', 'normal': 'acg-luggage-nylon-normal.jpg', 'roughness': 'acg-luggage-nylon-roughness.jpg'}
DECK = {'color': 'acg-luggage-deck-carpet-color.jpg', 'normal': 'acg-luggage-deck-carpet-normal.jpg', 'roughness': 'acg-luggage-deck-carpet-roughness.jpg'}


# ---------- materials ----------
def vcol_mat(name, color=None, maps=None, rough=0.6, metal=0.0, normal_strength=1.0):
    """Principled material whose base colour is multiplied by the mesh's colour attribute (glTF COLOR_0)."""
    m = material(name, color=color or (1, 1, 1), roughness=rough, metallic=metal, maps=maps, normal_strength=normal_strength)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
    link = b.inputs['Base Color'].links
    if link:                                   # texture x vertex colour
        src = link[0].from_socket
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(src, mix.inputs[6]); nt.links.new(ca.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], b.inputs['Base Color'])
    else:                                      # flat colour lives in the vertex colours
        nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    return m


def noise2(h, w, cells, seed, wrap_u=True):
    """Smooth value noise (h x w), `cells` lattice cells across the width, tileable across u."""
    rng = np.random.default_rng(seed)
    ch = max(2, int(cells * h / w)); g = rng.random((ch + 1, cells))
    y = np.linspace(0, ch, h, endpoint=False); x = np.linspace(0, cells, w, endpoint=False)
    y0 = y.astype(int); x0 = x.astype(int); fy = y - y0; fx = x - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    x1 = (x0 + 1) % cells
    a = g[y0][:, x0]; b = g[y0][:, x1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy[:, None]) + (c * (1 - fx) + d * fx) * fy[:, None]


def brass_mat():
    """Polished solid brass, worn: one colour and one roughness map, v = height / 2 m (0.95 m in the map = hand height).
    u 0-0.88 wraps a tube's circumference; casting joints map their own UVs low (tarnished)."""
    if 'brass_worn' in bpy.data.materials:
        return bpy.data.materials['brass_worn']
    H, W = 1024, 256
    z = (np.arange(H) + 0.5) / H * 2.0                                       # metres up
    knots = [(0, .78), (.35, .72), (.62, .42), (.82, .14), (.92, .03), (1.12, .03), (1.3, .14), (1.5, .22), (2, .26)]
    tz = np.interp(z, [k[0] for k in knots], [k[1] for k in knots])[:, None]
    n1 = noise2(H, W, 6, 1); n2 = noise2(H, W, 24, 2); n3 = noise2(H, W, 64, 3)
    t = np.clip(tz + 0.32 * (n1 - .5) * (0.4 + tz) + 0.18 * (n2 - .5) + 0.06 * (n3 - .5), 0, 1)
    spots = np.clip((noise2(H, W, 90, 7) - 0.8) * 5, 0, 1) * np.clip(tz * 1.2, 0, 1)      # reddish dezincified specks
    polished = np.array([0.91, 0.74, 0.40]); tarn = np.array([0.40, 0.27, 0.11]); rust = np.array([0.52, 0.22, 0.09])
    col = polished * (1 - t[..., None]) + tarn * t[..., None]
    col = col * (1 - spots[..., None] * .7) + rust * spots[..., None] * .7
    rough = 0.15 + 0.24 * t + 0.10 * spots + 0.025 * (noise2(H, W, 3, 9) - .5)
    # wipe streaks run along the tube (v), fingerprints only where hands go
    streak = noise2(H, W, 90, 11)[:, :]; rough += 0.03 * (streak - .5)
    rng = random.Random(5)
    yy, xx = np.mgrid[0:H, 0:W]
    for _ in range(46):
        cz = rng.uniform(0.86, 1.18); cu = rng.uniform(0, 0.88)
        py, px = cz / 2 * H, cu * W; ry, rx = rng.uniform(5, 9), rng.uniform(12, 22)
        dx = np.minimum(abs(xx - px), W - abs(xx - px))
        d = ((yy - py) / ry) ** 2 + (dx / rx) ** 2
        ring = np.exp(-d * 1.5) * (0.6 + 0.4 * np.sin(np.sqrt(d) * 9) ** 2)          # whorl ridges
        rough += 0.13 * ring
    rough = np.clip(rough, 0.1, 0.6)

    def img(name, rgb):
        im = bpy.data.images.new(name, W, H, alpha=False)
        px = np.ones((H, W, 4), np.float32); px[..., :3] = rgb
        im.pixels.foreach_set(px.ravel()); im.pack(); return im
    m = bpy.data.materials.new('brass_worn'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0
    c = nt.nodes.new('ShaderNodeTexImage'); c.image = img('brass_wear_color', col)        # linear floats -> sRGB on save
    r = nt.nodes.new('ShaderNodeTexImage'); r.image = img('brass_wear_rough', rough[..., None].repeat(3, 2))
    r.image.colorspace_settings.name = 'Non-Color'
    nt.links.new(c.outputs['Color'], b.inputs['Base Color']); nt.links.new(r.outputs['Color'], b.inputs['Roughness'])
    return m


# ---------- geometry helpers ----------
def tube(name, pts, r, mat, segs=16, closed=False, vfn=None, u_span=0.88):
    """Sweep a circle along pts (rotation-minimising frames). UV: u around (0..u_span), v = vfn(point, arclength)."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    vfn = vfn or (lambda p, s: p.z / 2.0)
    tan = []
    for i in range(n):
        a = pts[(i - 1) % n] if (closed or i > 0) else pts[i]; b = pts[(i + 1) % n] if (closed or i < n - 1) else pts[i]
        tan.append((b - a).normalized())
    N = tan[0].orthogonal().normalized(); frames = []
    for i in range(n):
        N = (N - N.dot(tan[i]) * tan[i]).normalized(); frames.append((N, tan[i].cross(N)))
    s = [0.0]
    for i in range(1, n):
        s.append(s[-1] + (pts[i] - pts[i - 1]).length)
    verts, faces, uvs = [], [], []
    for i, p in enumerate(pts):
        Nn, B = frames[i]
        for j in range(segs + 1):
            a = TAU * j / segs; verts.append(tuple(p + r * (math.cos(a) * Nn + math.sin(a) * B)))
    rings = n if not closed else n + 1
    for i in range(rings - 1):
        i2 = (i + 1) % n
        for j in range(segs):
            a, b = i * (segs + 1) + j, i2 * (segs + 1) + j
            faces.append((a, a + 1, b + 1, b))
            v1, v2 = vfn(pts[i], s[i]), vfn(pts[i2], s[i2] if i2 else s[-1] + (pts[0] - pts[-1]).length)
            uvs.append([(u_span * j / segs, v1), (u_span * (j + 1) / segs, v1), (u_span * (j + 1) / segs, v2), (u_span * j / segs, v2)])
    o = mk(name, verts, faces, uvs, mat)
    o.data.shade_smooth(); o.data.use_auto_smooth = True; o.data.auto_smooth_angle = R(60)
    return o


def uv_height(o, v0=None, scale=0.3):
    """Planar brass parts: v from height (or fixed v0 band), u from x+y so the map's noise varies along them."""
    apply_mods(o)
    me = o.data; ul = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap'); mw = o.matrix_world
    for p in me.polygons:
        for li in p.loop_indices:
            w = mw @ me.vertices[me.loops[li].vertex_index].co
            ul.data[li].uv = ((((w.x + w.y * 0.7) / scale) % 1) * 0.88, (v0 + w.z * 0.15) if v0 is not None else w.z / 2)


def set_vcol(o, fn=None):
    """Colour attribute 'Col' on every vertex: fn(world position, local position) -> (r, g, b); white without fn."""
    apply_mods(o)
    me = o.data
    a = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = a
    mw = o.matrix_world
    for i, v in enumerate(me.vertices):
        c = fn(mw @ v.co, v.co) if fn else (1, 1, 1)
        a.data[i].color = (*c, 1)


def subdiv(o, cuts):
    select_only(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=cuts); bpy.ops.object.mode_set(mode='OBJECT')


def bevel(o, w, seg=2, angle=None):
    mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = w; mod.segments = seg
    if angle:
        mod.limit_method = 'ANGLE'; mod.angle_limit = R(angle)
    else:
        mod.limit_method = 'NONE'
    apply_mods(o); return o


def join(objs, name):
    select_only(objs[0])
    for o in objs[1:]:
        o.select_set(True)
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o


def set_origin(o, p):
    bpy.context.scene.cursor.location = p; select_only(o); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = (0, 0, 0)


def merge_keep(hooks):
    """Join meshes by material, except hook nodes (kept whole, with their children joined in)."""
    keep = set()
    for h in hooks:
        for c in [h] + list(h.children_recursive):
            keep.add(c.name)
        kids = [c for c in h.children_recursive if c.type == 'MESH']
        if h.type == 'MESH' and kids:
            for k in kids:
                k.parent = None
            mw = h.matrix_world.copy(); join([h] + kids, h.name)
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name not in keep]:
        apply_mods(o); groups.setdefault(o.data.materials[0].name, []).append(o)
    for name, objs in groups.items():
        join(objs, name) if len(objs) > 1 else setattr(objs[0], 'name', name)


def overlaps(objs, ignore=()):
    """Report mesh pairs whose surfaces intersect (BVH), skipping pairs whose names match an ignore rule."""
    bv = {o.name: world_bvh(o) for o in objs}; hits = []
    for i, a in enumerate(objs):
        for b in objs[i + 1:]:
            if any(x in a.name and y in b.name or x in b.name and y in a.name for x, y in ignore):
                continue
            if bv[a.name].overlap(bv[b.name]):
                hits.append((a.name, b.name))
    print('OVERLAPS', hits)
    return hits


# ---------- the brass birdcage cart ----------
X_UP, Y_UP, DECK_Z, R_TUBE = 0.49, 0.25, 0.33, 0.019     # 1.5 in uprights


def wheel(name, r, w, loc, rub, steel, axis='y', hub=0.62):
    """Cushion tyre on a pressed steel hub, axle along `axis`."""
    h = w / 2
    tyre = lathe(name + '_tyre', [(r * hub, -h * 0.8), (r * 0.9, -h), (r * 0.98, -h * 0.75), (r, -h * 0.3), (r, h * 0.3), (r * 0.98, h * 0.75), (r * 0.9, h), (r * hub, h * 0.8)], rub, segs=40, caps=False)
    disc = lathe(name + '_hub', [(0.0, -h * 0.55), (r * 0.2, -h * 0.55), (r * 0.28, -h * 0.35), (r * hub * 1.01, -h * 0.75), (r * hub * 1.01, h * 0.75), (r * 0.28, h * 0.35), (r * 0.2, h * 0.55), (0.0, h * 0.55)], steel, segs=24, caps=False)
    nut = cyl(name + '_axle', 0.008, w + 0.016, (0, 0, 0), steel, verts=10)
    o = join([tyre, disc, nut], name)
    o.rotation_euler = (R(90), 0, 0) if axis == 'y' else (0, R(90), 0)
    o.location = loc; apply_mods(o)
    select_only(o); bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return o


def luggage_cart(build_view=None):
    brass = brass_mat()
    carpet = vcol_mat('deck_carpet', maps=DECK, rough=1.0, normal_strength=1.2)
    rub = vcol_mat('grey_rubber', rough=0.85)
    steel = material('zinc_steel', color=(0.62, 0.63, 0.64), roughness=0.33, metallic=1.0)
    parts = []
    # deck: carpet-wrapped plywood, 107 x 57, top at 33 cm
    deck = box('carpet', (1.07, 0.57, 0.03), (0, 0, DECK_Z - 0.015), carpet)
    subdiv(deck, 14); bevel(deck, 0.005, 2, angle=30); uv_real(deck, 0.22)
    rng = random.Random(3)

    def worn(w, l):          # pale in the middle where bags are dragged on, darker under the uprights and at the edges
        d = math.exp(-((w.x / 0.33) ** 2 + (w.y / 0.17) ** 2) * 1.4)
        return [min(1, 0.5 + 0.32 * d + rng.uniform(-0.03, 0.03))] * 3
    set_vcol(deck, worn)
    # brass skirt channel under the deck edge
    for sx, sy, lx, ly in ((0, -0.2835, 1.064, 0.003), (0, 0.2835, 1.064, 0.003), (-0.5335, 0, 0.003, 0.567), (0.5335, 0, 0.003, 0.567)):
        s = box('skirt', (lx, ly, 0.05), (sx, sy, 0.2745), brass); bevel(s, 0.001, 1); uv_height(s)
    # steel cross members under the deck (where the casters bolt)
    for x in (-0.4, 0.36):
        box('crossbar', (0.06, 0.55, 0.025), (x, 0, 0.2875), steel)
    # wrap-around rubber bumper on the deck edge (rounded rectangle, 4 cm cord)
    hx, hy, rc = 0.543, 0.293, 0.045
    path = []
    for cx, cy, a0 in ((hx - rc, hy - rc, 0), (-hx + rc, hy - rc, 90), (-hx + rc, -hy + rc, 180), (hx - rc, -hy + rc, 270)):
        for k in range(7):
            a = R(a0 + 90 * k / 6); path.append((cx + rc * math.cos(a), cy + rc * math.sin(a), 0.0))
    bump = tube('bumper', path, 0.018, rub, segs=12, closed=True, vfn=lambda p, s: s)
    bump.scale = (1, 1, 1.15); apply_mods(bump); select_only(bump); bpy.ops.object.transform_apply(scale=True)
    bump.location.z = 0.300; bpy.ops.object.transform_apply(location=True)
    scuffs = [(rng.uniform(-0.6, 0.6), rng.choice((-0.3, 0.3)), rng.uniform(0.02, 0.07)) for _ in range(9)] + [(sx * 0.55, sy * 0.3, 0.09) for sx in (-1, 1) for sy in (-1, 1)]

    def scuffed(w, l):       # grey rubber, black scuff marks where it meets door frames and walls (corners, outer face)
        k = 0.12
        for sx, sy, sr in scuffs:
            d = math.hypot(w.x - sx, w.y - sy) / sr
            if d < 1 and abs(w.z - 0.30) < 0.012 + 0.008 * (1 - d):
                k *= 0.35 + 0.65 * d
        return (k, k, k * 1.03)
    set_vcol(bump, scuffed)
    # the birdcage: two arched side frames whose tops lean in and meet in a cast hub
    tubes = []
    for side, ys in (('front', -1), ('back', 1)):
        p = [(X_UP, ys * Y_UP, DECK_Z + 0.002)] + [(X_UP, ys * Y_UP, z) for z in (0.6, 0.9, 1.1, 1.3)]
        for k in range(1, 30):
            th = math.pi * k / 30
            p.append((X_UP * math.cos(th), ys * (Y_UP - 0.228 * math.sin(th) ** 1.6), 1.3 + 0.48 * math.sin(th)))
        p += [(-X_UP, ys * Y_UP, z) for z in (1.3, 1.1, 0.9, 0.6, DECK_Z + 0.002)]
        tubes.append(tube('arch_' + side, p, R_TUBE, brass, segs=20))
    # push bars at both ends, hand height, with cast tee sleeves on the uprights
    for x in (-X_UP, X_UP):
        L = 2 * (Y_UP - 0.012)
        tubes.append(tube('push_bar', [(x, -L / 2, 1.0), (x, L / 2, 1.0)], R_TUBE, brass, segs=20, vfn=lambda p, s: 0.4 + s / 2.4))
        for ys in (-1, 1):
            tee = lathe('tee', [(0.0213, -0.03), (0.0235, -0.027), (0.024, 0.027), (0.0213, 0.03)], brass, loc=(x, ys * Y_UP, 1.0), segs=20, caps=False)
            uv_height(tee, v0=0.12)
            boss = lathe('tee_boss', [(0.0213, 0.0), (0.0225, 0.004), (0.0225, 0.016), (0.0213, 0.02)], brass, loc=(x, ys * (Y_UP - 0.034), 1.0), rot=(R(90 * ys), 0, 0), segs=20, caps=False)
            uv_height(boss, v0=0.1)
            # flared base ferrule bolted through the deck
            fer = lathe('ferrule', [(0.034, 0.0), (0.034, 0.006), (0.03, 0.012), (0.0245, 0.03), (0.0235, 0.055), (0.0213, 0.06)], brass, loc=(x, ys * Y_UP, DECK_Z), segs=24, caps=False)
            uv_height(fer, v0=0.05)
    # crown hub, finial, garment bar on a stem
    hub = lathe('hub', [(0.0, 1.745), (0.036, 1.745), (0.042, 1.752), (0.042, 1.808), (0.036, 1.815), (0.012, 1.817), (0.0, 1.817)], brass, segs=28)
    uv_height(hub, v0=0.62)
    fin = lathe('finial', [(0.0, 1.816), (0.009, 1.816), (0.006, 1.83), (0.012, 1.838), (0.022, 1.855), (0.019, 1.872), (0.009, 1.882), (0.0, 1.884)], brass, segs=24)
    uv_height(fin, v0=0.7)
    stem = tube('hanger_stem', [(0, 0, 1.745), (0, 0, 1.645)], 0.007, brass, segs=12)
    bar = tube('hanger_bar', [(-0.3, 0, 1.635), (0.3, 0, 1.635)], 0.0095, brass, segs=14, vfn=lambda p, s: 0.62 + s / 3)
    tee2 = lathe('hanger_tee', [(0.0, -0.016), (0.012, -0.016), (0.012, 0.016), (0.0, 0.016)], brass, loc=(0, 0, 1.635), rot=(R(90), 0, 0), segs=16)
    uv_height(tee2, v0=0.6)
    for x in (-0.31, 0.31):
        ball = lathe('hanger_ball', [(0.0, -0.018), (0.008, -0.016), (0.015, -0.008), (0.016, 0.0), (0.015, 0.008), (0.008, 0.016), (0.0, 0.018)], brass, loc=(x, 0, 1.635), rot=(0, R(90), 0), segs=16)
        uv_height(ball, v0=0.66)
    # 2 fixed 8 in wheels (pushing end, +X) on steel rigid brackets
    for ys in (-1, 1):
        y = ys * 0.205
        wheel('wheel_fixed', 0.10, 0.045, (0.36, y, 0.10), rub, steel)
        for dy in (-0.031, 0.031):
            leg = box('rigid_leg', (0.05, 0.004, 0.179), (0.36, y + dy, 0.1795), steel); bevel(leg, 0.002, 1)
        box('rigid_plate', (0.11, 0.09, 0.006), (0.36, y, 0.272), steel)
    # 2 swivel 5 in casters (leading end, -X): riser block fixed to the deck, fork + wheel = caster_* hook
    hooks = []
    for nm, ys, yaw in (('caster_l', 1, 4), ('caster_r', -1, 86)):          # one turned sideways
        x, y = -0.40, ys * 0.20
        box('riser', (0.085, 0.075, 0.09), (x, y, 0.23), steel)
        head = cyl(nm, 0.03, 0.012, (x, y, 0.179), steel, verts=20)
        race = cyl('race', 0.024, 0.006, (x, y, 0.17), steel, verts=20)
        top = box('fork_top', (0.07, 0.06, 0.005), (x - 0.012, y, 0.165), steel)
        parts_c = [race, top]
        for dy in (-0.026, 0.026):
            lg = box('fork_leg', (0.03, 0.004, 0.11), (x - 0.03, y + dy, 0.112), steel); lg.rotation_euler = (0, R(-14), 0)
            apply_mods(lg); select_only(lg); bpy.ops.object.transform_apply(rotation=True); parts_c.append(lg)
        wh = wheel(nm + '_wheel', 0.06, 0.035, (x - 0.045, y, 0.06), rub, steel)
        head = join([head] + parts_c + [wh], nm)
        set_origin(head, (x, y, 0.185))
        head.rotation_euler = (0, 0, R(yaw)); hooks.append(head)
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and not o.data.color_attributes:
            set_vcol(o)
    for o in bpy.context.scene.objects:            # rubber parts carry their grey in the vertex colours
        if o.type == 'MESH' and o.name != 'bumper':
            me = o.data; a = me.color_attributes['Col']
            for poly in me.polygons:
                if me.materials[poly.material_index].name == 'grey_rubber':
                    for vi in poly.vertices:
                        a.data[vi].color = (0.15, 0.15, 0.155, 1)
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH'],
             ignore=[('arch', 'hub'), ('arch', 'tee'), ('arch', 'ferrule'), ('push_bar', 'tee'), ('push_bar', 'arch'), ('wheel', 'rigid_leg'), ('riser', 'caster'), ('rigid_leg', 'rigid_plate'), ('skirt', 'skirt'), ('hanger', 'hub'), ('hanger', 'hanger'),
                     ('bumper', 'carpet'), ('bumper', 'skirt'), ('carpet', 'ferrule'), ('carpet', 'arch'), ('tee', 'tee'), ('finial', 'hub')])
    grab = bpy.data.objects.new('grab', None); grab.location = (X_UP, 0, 1.0); bpy.context.scene.collection.objects.link(grab)
    deck_e = bpy.data.objects.new('deck', None); deck_e.location = (0, 0, DECK_Z); bpy.context.scene.collection.objects.link(deck_e)
    merge_keep(hooks)


# ---------- the roller bag ----------
def bag_shell(name, x0, x1, y0, y1, z0, z1, mat, bulge_y=0.0, bulge_x=0.006, seed=0, cuts=6, bev=0.022, notch=False):
    """A soft-side panel block: beveled box, subdivided, faces pushed out like stuffed nylon over a frame."""
    o = box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat)
    if notch:
        notch_body(o)
    subdiv(o, cuts); bevel(o, bev, 2, angle=30)
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    hx, hy, hz = (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2
    rng = random.Random(seed)
    for v in o.data.vertices:
        p = v.co; ux, uy, uz = (p.x) / hx, (p.y) / hy, (p.z) / hz          # local, centred
        fz = max(0, 1 - uz * uz); fx = max(0, 1 - ux * ux); fy = max(0, 1 - uy * uy)
        p.y += bulge_y * math.copysign(1, uy) * fx * fz * (abs(uy) > 0.6)
        p.x += bulge_x * math.copysign(1, ux) * fy * fz * (abs(ux) > 0.6)
        p += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.0006
    smooth(o, 35); uv_real(o, 0.016)
    return o


def notch_body(o):
    """The wheel housings take the back-bottom corners: cut them out of the soft body."""
    for xs in (-1, 1):
        carve(o, box('notch', (0.08, 0.2, 0.2), (xs * 0.168, 0.145, 0.006), None))
    return o


def piping(name, x0, x1, z0, z1, y, mat, r=0.0035, rc=0.03, axis='y'):
    """Piping cord along a rounded rectangle in the XZ plane at depth y."""
    pts = []
    for cx, cz, a0 in ((x1 - rc, z1 - rc, 0), (x0 + rc, z1 - rc, 90), (x0 + rc, z0 + rc, 180), (x1 - rc, z0 + rc, 270)):
        for k in range(6):
            a = R(a0 + 90 * k / 5); pts.append((cx + rc * math.cos(a), y, cz + rc * math.sin(a)))
    return tube(name, pts, r, mat, segs=6, closed=True, vfn=lambda p, s: s * 10)


def zip_pull(name, loc, alu, black, rot=0.0, hang=0.0):
    """Metal slider with a dangling pull tab (+ a short black cord loop)."""
    sl = box(name, (0.012, 0.006, 0.02), (0, 0, 0), alu); bevel(sl, 0.002, 1)
    tab = box(name + '_tab', (0.009, 0.002, 0.028), (0, -0.004, -0.02), alu); bevel(tab, 0.001, 1)
    cord = tube(name + '_cord', [(0, -0.005, -0.033), (0.005, -0.006, -0.045), (0, -0.007, -0.055), (-0.005, -0.006, -0.045), (0, -0.005, -0.033)], 0.0016, black, segs=5)
    o = join([sl, tab, cord], name)
    o.rotation_euler = (R(hang), 0, rot); o.location = loc
    select_only(o); bpy.ops.object.transform_apply(location=True, rotation=True)
    return o


def roller_bag(build_view=None):
    nylon = vcol_mat('nylon_1680d', maps=NYLON, rough=0.75, normal_strength=0.6)
    black = vcol_mat('black_pu', rough=0.5)
    alu = material('anodised_alu', color=(0.6, 0.61, 0.63), roughness=0.3, metallic=1.0)
    paper = material('tag_paper', color=(0.86, 0.85, 0.80), roughness=0.85)
    X0, X1, Z0, Z1 = -0.175, 0.175, 0.022, 0.55
    # main body (back half, deep), expansion gusset band, front lid with the pocket
    body = bag_shell('body', X0, X1, -0.03, 0.112, Z0, Z1, nylon, bulge_y=0.004, seed=1, notch=True, cuts=5)
    gus = bag_shell('gusset', X0 + 0.004, X1 - 0.004, -0.06, -0.026, Z0 + 0.004, Z1 - 0.004, nylon, bulge_y=0, bulge_x=0.004, seed=2, cuts=4, bev=0.02)
    lid = bag_shell('lid', X0, X1, -0.105, -0.056, Z0, Z1, nylon, bulge_y=0.008, seed=3, cuts=5)
    pocket = bag_shell('pocket', -0.145, 0.145, -0.122, -0.098, 0.1, 0.47, nylon, bulge_y=0.006, bulge_x=0.002, seed=4, cuts=4, bev=0.016)
    # a crease across the pocket (diagonal, pressed in)
    for v in pocket.data.vertices:
        if v.co.y < 0:
            d = (v.co.x * 0.5 - (v.co.z - 0.02)) / 0.012
            v.co.y += 0.0035 * math.exp(-d * d)
    # piping on every panel edge
    for y in (-0.03, 0.112):
        piping('piping', X0 + 0.003, X1 - 0.003, Z0 + 0.003, Z1 - 0.003, y, black, rc=0.024)
    for y in (-0.056, -0.105):
        piping('piping', X0 + 0.003, X1 - 0.003, Z0 + 0.003, Z1 - 0.003, y, black, rc=0.024)
    piping('piping', -0.143, 0.143, 0.102, 0.468, -0.122, black, r=0.003, rc=0.018)
    # perimeter zip (lid to gusset) and expansion zip (gusset to body): coil tape bands in the seams
    for y in (-0.058, -0.028):
        z = tube('zip_coil', [(p[0] * 1.004, y, p[2]) for p in
                 [(X1 - 0.025 + 0.025 * math.cos(R(a)), 0, Z1 - 0.025 + 0.025 * math.sin(R(a))) for a in range(0, 91, 18)] +
                 [(X0 + 0.025 + 0.025 * math.cos(R(a)), 0, Z1 - 0.025 + 0.025 * math.sin(R(a))) for a in range(90, 181, 18)] +
                 [(X0 + 0.025 + 0.025 * math.cos(R(a)), 0, Z0 + 0.025 + 0.025 * math.sin(R(a))) for a in range(180, 271, 18)] +
                 [(X1 - 0.025 + 0.025 * math.cos(R(a)), 0, Z0 + 0.025 + 0.025 * math.sin(R(a))) for a in range(270, 361, 18)]],
                 0.003, black, segs=6, closed=True, vfn=lambda p, s: s * 30)
    zip_pull('pull', (-0.03, -0.058, Z1 + 0.004), alu, black, rot=R(90), hang=-80)
    zip_pull('pull', (0.04, -0.058, Z1 + 0.004), alu, black, rot=R(90), hang=-70)
    zip_pull('pull', (0.112, -0.127, 0.455), alu, black, hang=-8)
    tube('pocket_zip', [(-0.13, -0.124, 0.455), (0.13, -0.124, 0.455)], 0.0025, black, segs=6, vfn=lambda p, s: s * 30)
    # top carry handle: padded webbing strap between two moulded end caps
    caps = [box('top_cap', (0.028, 0.034, 0.012), (x, 0.03, Z1 + 0.003), black) for x in (-0.075, 0.075)]
    for c in caps:
        bevel(c, 0.004, 2)
    strap = tube('grab_top', [(-0.075, 0.03, Z1 + 0.008), (-0.06, 0.03, Z1 + 0.022), (-0.03, 0.03, Z1 + 0.03), (0.03, 0.03, Z1 + 0.03), (0.06, 0.03, Z1 + 0.022), (0.075, 0.03, Z1 + 0.008)], 0.009, black, segs=8)
    strap.scale = (1, 1.6, 0.75); select_only(strap); bpy.ops.object.transform_apply(scale=True)
    strap.location.y -= 0.03 * 0.6
    select_only(strap); bpy.ops.object.transform_apply(location=True)
    set_origin(strap, (0, 0.03, Z1 + 0.03))
    # side handle (+X side) with the blank airline tag on a loop
    for z in (0.2, 0.38):
        c = box('side_cap', (0.012, 0.034, 0.028), (X1 + 0.004, 0.035, z), black); bevel(c, 0.004, 2)
    side = tube('side_handle', [(X1 + 0.008, 0.035, 0.205), (X1 + 0.02, 0.035, 0.23), (X1 + 0.026, 0.035, 0.29), (X1 + 0.02, 0.035, 0.35), (X1 + 0.008, 0.035, 0.375)], 0.008, black, segs=8)
    side.scale = (0.75, 1.6, 1); select_only(side); bpy.ops.object.transform_apply(scale=True)
    side.location = (side.location.x + (X1 + 0.02) * 0.25, 0.035 - 0.035 * 1.6, 0)
    select_only(side); bpy.ops.object.transform_apply(location=True)
    loop = tube('tag_loop', [(X1 + 0.028, 0.035, 0.29), (X1 + 0.034, 0.03, 0.27), (X1 + 0.036, 0.03, 0.24), (X1 + 0.034, 0.035, 0.22)], 0.0012, paper, segs=5)
    tag = box('tag', (0.0015, 0.055, 0.105), (X1 + 0.036, 0.034, 0.165), paper); tag.rotation_euler = (R(4), R(-6), 0)
    bevel(tag, 0.0006, 1)
    # back: the handle channel cover and the moulded handle housing on top
    chan = bag_shell('channel', -0.13, 0.13, 0.106, 0.129, 0.12, 0.53, nylon, bulge_y=0.002, bulge_x=0, seed=6, cuts=3, bev=0.006)
    housing = box('handle_housing', (0.29, 0.042, 0.02), (0, 0.104, Z1 + 0.004), black); bevel(housing, 0.006, 2)
    # wheel housings: moulded shells over the back-bottom corners, wheels recessed in them
    for xs in (-1, 1):
        hs = box('wheel_housing', (0.052, 0.09, 0.115), (xs * 0.152, 0.085, 0.0575), black)
        bevel(hs, 0.01, 2)
        carve(hs, cyl('cut', 0.041, 0.032, (xs * 0.152, 0.095, 0.035), None, verts=28, rotation=(0, R(90), 0)))
        carve(hs, box('cut2', (0.034, 0.06, 0.05), (xs * 0.152, 0.13, 0.02), None))
        smooth(hs, 35)
    skid = box('skid_plate', (0.248, 0.012, 0.075), (0, 0.117, 0.05), black); bevel(skid, 0.004, 2)
    for xs in (-1, 1):                         # front feet / bottom corner guards
        f = box('foot', (0.04, 0.035, 0.024), (xs * 0.13, -0.075, 0.012), black); bevel(f, 0.006, 2)
    wheels = []
    for nm, xs in (('wheel_l', -1), ('wheel_r', 1)):          # three.js left = Blender -X
        w = lathe(nm, [(0.012, -0.012), (0.03, -0.012), (0.0345, -0.0095), (0.035, -0.004), (0.035, 0.004), (0.0345, 0.0095), (0.03, 0.012), (0.012, 0.012)], black, segs=28, caps=True)
        hubc = lathe(nm + '_hub', [(0.0, -0.0125), (0.012, -0.0125), (0.012, 0.0125), (0.0, 0.0125)], alu, segs=16)
        spokes = [box(nm + '_spoke', (0.004, 0.044, 0.02), (0, 0, 0), black) for _ in range(3)]
        for k, s in enumerate(spokes):
            s.rotation_euler = (0, 0, R(60 * k)); apply_mods(s); select_only(s); bpy.ops.object.transform_apply(rotation=True)
        w = join([w, hubc] + spokes, nm)
        w.rotation_euler = (0, R(90), 0); w.location = (xs * 0.152, 0.095, 0.035)
        select_only(w); bpy.ops.object.transform_apply(location=False, rotation=True)
        wheels.append(w)
    # telescoping handle: two aluminium tubes in the back channel + grip bar; origin at its retracted position
    tubes = [tube('handle_tube', [(x, 0.116, 0.14), (x, 0.116, 0.548)], 0.0075, alu, segs=10, vfn=lambda p, s: s) for x in (-0.1, 0.1)]
    grip = tube('handle_grip', [(-0.112, 0.116, 0.546), (-0.106, 0.116, 0.558), (-0.085, 0.116, 0.565), (0.085, 0.116, 0.565), (0.106, 0.116, 0.558), (0.112, 0.116, 0.546)], 0.011, black, segs=10, vfn=lambda p, s: s)
    grip.scale = (1, 1.25, 0.8); set_origin(grip, (0, 0.116, 0.556)); select_only(grip); bpy.ops.object.transform_apply(scale=True)
    btn = box('handle_button', (0.03, 0.012, 0.004), (0, 0.116, 0.573), black); bevel(btn, 0.0015, 1)
    handle = join(tubes + [grip, btn], 'handle')
    set_origin(handle, (0, 0.116, 0.556))
    # wear: paler scuffed fabric on the corners and bottom edges; scraped grey on the housings and feet
    rng = random.Random(9)

    def corner_scuff(w, l):
        ex = max(0, (abs(w.x) - 0.15) / 0.025); ez = max(max(0, (0.06 - w.z) / 0.04), max(0, (w.z - 0.52) / 0.03))
        k = 0.82 + 0.16 * min(1, ex * ez * 1.4) + rng.uniform(-0.02, 0.02)
        return (k, k, k * 1.02)

    def scraped(w, l):
        k = 0.055 + (0.16 if w.z < 0.03 or (w.y > 0.12 and w.z < 0.07) else 0) * rng.uniform(0.5, 1)
        return (k, k, k)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH':
            continue
        mn = o.data.materials[0].name
        set_vcol(o, corner_scuff if mn == 'nylon_1680d' else scraped if o.name.startswith(('wheel_housing', 'foot', 'skid')) else
                 (lambda w, l: (0.05, 0.05, 0.055)) if mn == 'black_pu' else None)
    for o in [handle] + wheels:                # joined with aluminium parts: those stay white
        me = o.data; a = me.color_attributes['Col']
        for poly in me.polygons:
            if me.materials[poly.material_index].name == 'anodised_alu':
                for vi in poly.vertices:
                    a.data[vi].color = (1, 1, 1, 1)
    overlaps([o for o in bpy.context.scene.objects if o.type == 'MESH'],
             ignore=[('body', 'gusset'), ('gusset', 'lid'), ('lid', 'pocket'), ('piping', ''), ('zip', ''), ('pull', ''), ('cap', ''),
                     ('handle', 'channel'), ('handle', 'body'), ('handle', 'housing'), ('channel', 'body'), ('wheel_housing', 'body'),
                     ('skid', 'body'), ('foot', ''), ('tag_loop', 'side_handle'), ('side_handle', 'body')])
    merge_keep([handle, strap] + wheels)


ASSETS = {
    'hotel-luggage-cart-brass': (luggage_cart, [dict(distance=4.0, height=1.5, target=(0, 0, 0.9), yaw=35),
                                                dict(distance=0.9, height=1.15, target=(0.49, -0.1, 0.95), yaw=60),
                                                dict(distance=1.0, height=0.5, target=(-0.4, -0.1, 0.22), yaw=20)]),
    'hotel-roller-bag': (roller_bag, [dict(distance=1.6, height=0.9, target=(0, 0, 0.3), yaw=35),
                                      dict(distance=0.9, height=0.35, target=(0.0, 0.08, 0.14), yaw=150),
                                      dict(distance=0.75, height=0.6, target=(0.05, -0.05, 0.35), yaw=-30)]),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, views = ASSETS[name]
        reset()
        build()
        for i, v in enumerate(views):
            preview(os.path.join(SHOTS, f'{name}-{i}.png'), samples=48, **v)
        for img in bpy.data.images:              # ponytail: 1K scans are overkill at 1.6 cm (nylon) / 22 cm (carpet) tiles
            if img.name.startswith('acg-') and max(img.size) > 512:
                img.scale(512, 512); img.pack()
        export(os.path.join(OUT, name + '.glb'), name)

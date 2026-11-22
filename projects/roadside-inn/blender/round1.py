# SPDX-License-Identifier: CC0-1.0
# Set pipeline round 1 (2026-11-22), room 212 king bedroom and bath: guest-room wastebasket, hooded toilet-tissue
# holder with roll and spare, towel bar with two hung bath towels, swing-arm reading sconce, blackout drapes on a
# pelmet track. Briefs: artifacts/roadside-inn/briefs/hotel-*.md. Hooks are named per brief.
# Textures: ambientCG Fabric031 (drape), Fabric020 (terry), Fabric032 (voile), CC0, ingested as parts/acg/acg-room-*
# (ingestion/ambientcg/batches/room); generated maps (quilt emboss, scuffs, towel bands, water spots) are written to
# labels/r1-*.png by this script; the band print by round1-labels.mjs.
#   node projects/roadside-inn/blender/round1-labels.mjs
#   blender -b --python projects/roadside-inn/blender/round1.py -- [asset ...]     (default: all)
import bpy, bmesh, math, os, sys, random
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, export, mats, empty, image, REPO
from props import mk, lathe
from kit21 import shot, mat
from sofa import uv_real, apply_mods, touching

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'assets')
SHOTS = os.environ.get('R1_SHOTS') or os.path.join(HERE, '..', '..', '..', 'artifacts', 'roadside-inn', 'blender')
LAB = os.path.join(HERE, 'labels')
R = math.radians
TAU = math.tau


# ---------------------------------------------------------------- generated maps
def save_map(name, rgb, alpha=None):
    """Write an (h, w, 3) float array (0-1, top row first) to labels/<name>.png and return the Blender image."""
    h, w, _ = rgb.shape
    a = np.ones((h, w, 1)) if alpha is None else alpha[..., None]
    px = np.concatenate([np.clip(rgb, 0, 1), a], 2)[::-1].astype(np.float32)
    path = os.path.join(LAB, name + '.png')
    im = bpy.data.images.new(name, w, h); im.pixels.foreach_set(px.ravel())
    im.filepath_raw = path; im.file_format = 'PNG'; im.save()
    return path


def blur(a, r):
    """Cheap wrap-around box blur (tileable)."""
    for ax in (0, 1):
        a = sum(np.roll(a, k, ax) for k in range(-r, r + 1)) / (2 * r + 1)
    return a


def noise(h, w, scale, seed):
    """Tileable value noise: random lattice, blurred."""
    rng = np.random.default_rng(seed)
    a = rng.random((h, w))
    return blur(blur(a, scale), scale)


def normal_from_height(hgt, strength):
    gx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * strength
    gy = (np.roll(hgt, 1, 0) - np.roll(hgt, -1, 0)) * strength
    n = np.stack([-gx, -gy, np.ones_like(hgt)], 2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def quilt_map():
    """Embossed quilted tissue: a diamond lattice of pressed lines with pillowed cells and fibre noise (tileable)."""
    n = 256
    y, x = np.mgrid[0:n, 0:n] / n * 8                          # 8 x 8 cells per tile
    d1 = np.abs(((x + y) % 1) - 0.5); d2 = np.abs(((x - y) % 1) - 0.5)
    hgt = np.minimum(d1, d2)                                     # 0 on the pressed lines
    hgt = np.sqrt(np.clip(hgt * 2, 0, 1)) + 0.25 * noise(n, n, 1, 3) + 0.1 * noise(n, n, 4, 4)
    return save_map('r1-quilt-normal', normal_from_height(hgt, 2.5))


def spots_map(seed=5):
    """Chrome roughness: polished (0.1) with water spots and wipe smears (to 0.4). Linear values in R=G=B."""
    n = 256; rng = np.random.default_rng(seed)
    r = np.full((n, n), 0.1)
    yy, xx = np.mgrid[0:n, 0:n]
    for _ in range(70):                                          # dried drops: rings, a little rougher at the rim
        cx, cy, rad = rng.integers(0, n), rng.integers(0, n), rng.uniform(1.5, 6)
        d = np.hypot(((xx - cx + n / 2) % n) - n / 2, ((yy - cy + n / 2) % n) - n / 2)
        r += 0.18 * np.exp(-((d - rad) / 1.0) ** 2) + 0.06 * (d < rad)
    smear = noise(n, n, 12, seed + 1)
    r += 0.25 * np.clip((smear - 0.52) * 6, 0, 1)
    r = np.clip(r, 0.06, 0.45)
    return save_map(f'r1-spots-rough{seed}', np.repeat(r[..., None], 3, 2))


def bin_map():
    """Wastebasket body colour, v laid out by bin_body(): v 0-0.5 outer wall (floor to rim), 0.5-0.55 rim,
    0.55-0.95 inner wall (rim down), 0.95-1 inner floor. Charcoal PP, pale scuff streaks low on the outside, a dust
    line round the inside of the base."""
    w, h = 512, 512; rng = np.random.default_rng(11)
    base = np.array([0.055, 0.056, 0.06])
    img = np.ones((h, w, 3)) * base
    img *= (0.92 + 0.16 * noise(h, w, 3, 12))[..., None]
    v = 1 - (np.arange(h) + 0.5) / h                              # row 0 is the top of the image: v = 1
    for _ in range(90):                                          # scuffs: short near-horizontal streaks, low outside
        z = rng.uniform(0.0, 0.14)                               # height on the outer wall (m)
        row = int((1 - z / 0.30 * 0.5) * h); col = rng.integers(0, w)
        ln, th = rng.integers(8, 50), rng.integers(1, 3)
        ang = rng.uniform(-0.15, 0.15)
        for k in range(ln):
            rr, cc = row + int(k * ang), (col + k) % w
            img[max(0, rr - th):rr + th, cc] += 0.012 + 0.025 * rng.random()
    img = blur(img, 1)
    dust = np.clip(1 - np.abs(v - 0.95) / 0.03, 0, 1) ** 1.5      # the inside corner of the base
    dust = dust[:, None] * (0.6 + 0.8 * noise(h, w, 2, 13))
    img = img * (1 - 0.5 * dust[..., None]) + np.array([0.33, 0.31, 0.28]) * 0.5 * dust[..., None]
    return save_map('r1-bin-color', img)


def towel_map(seed):
    """Towel colour on UV (u across the folded width, v along the towel, 0-1 = 1.37 m): grey-white #eeeceb terry,
    a woven dobby band 6 cm from each hem (flat-woven, a touch brighter with fine ribs), faint pilling and wear."""
    w, h = 128, 1024; rng = np.random.default_rng(seed)
    base = np.array([0.855, 0.84, 0.83])                        # #eeeceb, linear
    img = np.ones((h, w, 3)) * base
    img *= (0.95 + 0.06 * noise(h, w, 2, seed))[..., None]
    v = 1 - (np.arange(h) + 0.5) / h
    L = 1.37
    for c in (0.06 / L, 1 - 0.06 / L):
        band = np.abs(v - c) < 0.025 / L
        rib = (np.sin(v * L * 2400) > 0.3) & band
        img[band] = np.array([0.9, 0.89, 0.88])
        img[rib] *= 0.93
        edge = (np.abs(np.abs(v - c) - 0.025 / L) < 0.0018)
        img[edge] *= 0.9
    hem = (v < 0.012 / L) | (v > 1 - 0.012 / L)                  # the stitched hem
    img[hem] *= 0.94
    pills = rng.random((h, w)) > 0.996
    img[pills] *= 0.9
    return save_map(f'r1-towel-color{seed}', img)


def drape_maps():
    """Tint ambientCG Fabric031 (grey large weave) to the room's grey-blue (#6f7d8c), keeping its slubs."""
    src = bpy.data.images.load(os.path.join(REPO, 'parts', 'acg', 'acg-room-drape-color.jpg'), check_existing=True)
    w, h = src.size
    a = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
    lum = a.mean(2, keepdims=True); lum /= lum.mean()
    tint = np.array([0.159, 0.205, 0.262])                      # #6f7d8c in linear
    return save_map('r1-drape-color', lum * (tint * 1.25 + 0.03))


def pbr(name, color=(0.8, 0.8, 0.8), color_map=None, normal_map=None, rough=0.6, rough_map=None, metal=0.0,
        scale=(1, 1), color_scaled=True, normal_strength=1.0, alpha=1.0, vcol=False, max_px=0):
    """Principled material; maps tile at `scale` (u, v repeats per UV unit) through one mapping node (exported as
    KHR_texture_transform). color_scaled=False keeps the colour map on raw UVs (a print laid out on the part).
    vcol multiplies the base colour by the mesh's colour attribute (exported as COLOR_0, three.js multiplies too)."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND'
    coord = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale[0], scale[1], 1); nt.links.new(coord.outputs['UV'], mp.inputs['Vector'])

    def tex(path, non_color, scaled=True):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(path, check_existing=True)
        if non_color:
            t.image.colorspace_settings.name = 'Non-Color'
        if max_px and t.image.size[0] > max_px:                  # brief texture budget: a downscaled copy in labels/
            t.image.scale(max_px, max_px)
            t.image.filepath_raw = os.path.join(LAB, f'r1-{max_px}-' + os.path.splitext(os.path.basename(path))[0] + '.png')
            t.image.file_format = 'PNG'; t.image.save()
        if scaled:
            nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        return t
    if color_map:
        c = tex(color_map, False, color_scaled).outputs['Color']
        if vcol:
            va = nt.nodes.new('ShaderNodeVertexColor'); mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
            mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
            nt.links.new(c, mx.inputs[6]); nt.links.new(va.outputs['Color'], mx.inputs[7]); c = mx.outputs[2]
        nt.links.new(c, b.inputs['Base Color'])
    if rough_map:
        nt.links.new(tex(rough_map, True).outputs['Color'], b.inputs['Roughness'])
    if normal_map:
        n = nt.nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value = normal_strength
        nt.links.new(tex(normal_map, True).outputs['Color'], n.inputs['Color']); nt.links.new(n.outputs['Normal'], b.inputs['Normal'])
    return m


def acg_h(role):
    return os.path.join(REPO, 'parts', 'acg', f'acg-hotel-brushed-steel-{role}.jpg')


def acg(n, role):
    return os.path.join(REPO, 'parts', 'acg', f'acg-room-{n}-{role}.jpg')


# ---------------------------------------------------------------- helpers
def grid_mesh(name, P, mat_, uv=None, closed_u=False):
    """Quad grid from P[i][j] (rows i, columns j) with optional UV[i][j]."""
    rows, cols = len(P), len(P[0])
    verts = [p for row in P for p in row]
    faces, uvs = [], []
    cu = cols if closed_u else cols - 1
    for i in range(rows - 1):
        for j in range(cu):
            j2 = (j + 1) % cols
            a, b, c, d = i * cols + j, i * cols + j2, (i + 1) * cols + j2, (i + 1) * cols + j
            faces.append((a, b, c, d))
            if uv:
                ub = uv[i][j2][0] if j2 or not closed_u else 1.0
                uc = uv[i + 1][j2][0] if j2 or not closed_u else 1.0
                uvs.append([uv[i][j], (ub, uv[i][j2][1]), (uc, uv[i + 1][j2][1]), uv[i + 1][j]])
    o = mk(name, verts, faces, uvs if uv else None, mat_)
    o.data.shade_smooth()
    return o


def rrect(a, b, r, N, phase=0.0):
    """N points round a rounded rectangle (half sizes a, b, corner radius r), even by arc length, starting at the
    front centre (0, -b), counter-clockwise. Returns (points, outward normals)."""
    r = min(r, a - 1e-4, b - 1e-4)
    segs = [('l', (0, -b), (a - r, -b)), ('c', (a - r, -b + r), -math.pi / 2), ('l', (a, -b + r), (a, b - r)),
            ('c', (a - r, b - r), 0), ('l', (a - r, b), (-a + r, b)), ('c', (-a + r, b - r), math.pi / 2),
            ('l', (-a, b - r), (-a, -b + r)), ('c', (-a + r, -b + r), math.pi), ('l', (-a + r, -b), (0, -b))]
    lens = [math.dist(s[1], s[2]) if s[0] == 'l' else r * math.pi / 2 for s in segs]
    P, Nn = [], []
    tot = sum(lens)
    for k in range(N):
        s_ = ((k + phase) / N) * tot
        for seg, ln in zip(segs, lens):
            if s_ <= ln or seg is segs[-1]:
                f = s_ / ln if ln else 0
                if seg[0] == 'l':
                    (x0, y0), (x1, y1) = seg[1], seg[2]
                    P.append((x0 + (x1 - x0) * f, y0 + (y1 - y0) * f))
                    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1
                    Nn.append((dy / L, -dx / L))
                else:
                    (cx, cy), a0 = seg[1], seg[2]; t = a0 + f * math.pi / 2
                    P.append((cx + r * math.cos(t), cy + r * math.sin(t))); Nn.append((math.cos(t), math.sin(t)))
                break
            s_ -= ln
    return P, Nn


def keep_merge(keep):
    """Join meshes by material, except the hook nodes in `keep` and everything parented under them."""
    def kept(o):
        while o is not None:
            if o.name in keep:
                return True
            o = o.parent
        return False
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and not kept(o)]:
        apply_mods(o)
        groups.setdefault(o.data.materials[0].name if o.data.materials else 'mesh', []).append(o)
    for name, g in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in g:
            o.select_set(True)
        bpy.context.view_layer.objects.active = g[0]
        if len(g) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = name


def join(parts, name):
    for p in parts:
        apply_mods(p)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    return o


def set_origin(o, p):
    bpy.context.scene.cursor.location = p
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = (0, 0, 0)


def under(child, parent):
    child.parent = parent; child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


def check_clear(pairs):
    """BVH overlap check (sofa.py's touching()) for parts that must not intersect; prints, doesn't fix."""
    for a, b in pairs:
        if touching(a, [b]):
            print(f'OVERLAP {a.name} x {b.name}')


# ---------------------------------------------------------------- 1. wastebasket
def wastebasket(m):
    """13-qt guest-room wastebasket: one-piece moulded charcoal PP, 27 x 20 top tapering to 23 x 16, 30 cm, 2.5 mm
    wall, rolled 8 mm rim; a white LDPE liner folded 4 cm over the rim, one corner hanging lower."""
    H, N = 0.30, 36
    half = lambda z, d: (0.115 + 0.02 * z / H + d, 0.08 + 0.02 * z / H + d, 0.05 + 0.012 * z / H + d)
    # (offset from the outer wall, z, v): outside up from the floor, over the rolled rim, down the inside, the floor
    prof = [(-0.008, 0.0, 0.0), (-0.002, 0.0008, 0.004), (0.0, 0.006, 0.01), (0.0, 0.05, 0.083), (0.0, 0.14, 0.233),
            (0.0, H - 0.014, 0.477), (0.003, H - 0.011, 0.49), (0.0075, H - 0.008, 0.5), (0.0085, H - 0.004, 0.51),
            (0.006, H - 0.0005, 0.52), (0.001, H, 0.53), (-0.0025, H - 0.004, 0.55), (-0.0025, 0.14, 0.75),
            (-0.0025, 0.012, 0.93), (-0.007, 0.0035, 0.95), (-0.016, 0.0028, 0.96)]
    rnd = random.Random(7)
    dent = [rnd.uniform(-0.0006, 0.0006) for _ in range(N)]     # a moulding is never perfectly even
    P, UV = [], []
    for d, z, v in prof:
        a, b, r = half(z, d)
        pts, nrm = rrect(a, b, r, N)
        P.append([(x + nx * dent[k] * (0.2 < z / H < 0.95), y + ny * dent[k] * (0.2 < z / H < 0.95), z) for k, ((x, y), (nx, ny)) in enumerate(zip(pts, nrm))])
        UV.append([(k / N, v) for k in range(N)])
    for row_uv in UV:
        row_uv.append((1.0, row_uv[0][1]))
    body = grid_mesh('bin_body', P, None, UV, closed_u=True)
    bm = bmesh.new(); bm.from_mesh(body.data)                   # floor caps, inside and out
    bm.verts.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active
    rings = [([bm.verts[ring * N + k] for k in range(N)], up, v) for ring, up, v in ((0, False, 0.0), (len(prof) - 1, True, 0.99))]
    for vs, up, v in rings:
        f = bm.faces.new(vs if up else vs[::-1])
        for l in f.loops:
            l[uvl].uv = (0.5, v)
    bm.to_mesh(body.data); bm.free()
    body.data.materials.append(pbr('bin_pp', color_map=bin_map(), rough=0.55))
    smooth(body, 50)
    # liner: inside down the wall, over the rim, a crumpled 4 cm skirt outside; one corner sags to 7 cm
    lp = [(-0.0075, 0.03), (-0.008, 0.10), (-0.0065, 0.2), (-0.006, H - 0.03), (-0.0045, H - 0.004), (0.0, H + 0.0045), (0.0055, H + 0.004),
          (0.0115, H - 0.001), (0.0135, H - 0.02), (0.0145, H - 0.04)]
    ph = [rnd.uniform(0, TAU) for _ in range(4)]
    LP, LUV = [], []
    for i, (d, z) in enumerate(lp):
        a, b, r = half(min(z, H), d)
        pts, nrm = rrect(a, b, r, N, phase=0.0)
        row = []
        for k, ((x, y), (nx, ny)) in enumerate(zip(pts, nrm)):
            t = k / N
            wob = 0.0025 * math.sin(TAU * 5 * t + ph[0]) + 0.0015 * math.sin(TAU * 11 * t + ph[1]) + 0.001 * math.sin(TAU * 19 * t + ph[2])
            zz = z
            if i >= 8:                                           # the skirt: uneven hem, corner at k ~ N*0.37 lower
                fall = (i - 7) / 2
                zz -= fall * (0.012 * math.sin(TAU * 3 * t + ph[3]) + 0.03 * math.exp(-((t - 0.37) / 0.07) ** 2))
            if i <= 3:                                           # inside: the bag hangs off the wall in soft bulges
                wob = -abs(wob) * 1.6 - 0.002 * (i < 2)
            elif i < 5:
                wob = -abs(wob) * 0.4
            else:
                wob = abs(wob) * (1.0 if i >= 7 else 0.2)
            if i >= 7:                                           # crumple: sharp little creases in the folded film
                wob += rnd.uniform(0, 0.0025); zz += rnd.uniform(-0.002, 0.002)
            row.append((x + nx * wob, y + ny * wob, zz))
        LP.append(row); LUV.append([(k / N, i / (len(lp) - 1)) for k in range(N)] + [(1.0, i / (len(lp) - 1))])
    liner = grid_mesh('bin_liner', LP, None, LUV, closed_u=True)
    bm = bmesh.new(); bm.from_mesh(liner.data); bm.verts.ensure_lookup_table()
    f0 = [bm.verts[k] for k in range(N)]; c = bm.verts.new((0, 0, 0.012))
    for k in range(N):
        bm.faces.new((c, f0[(k + 1) % N], f0[k]))
    bm.to_mesh(liner.data); bm.free()
    liner.data.materials.append(pbr('liner_ldpe', color=(0.86, 0.87, 0.86), rough=0.35, alpha=0.68))
    smooth(liner, 35)
    check_clear([(liner, body)])
    empty('bin_opening', (0, 0, H))


# ---------------------------------------------------------------- 2. toilet-tissue holder
def tp_holder(m):
    """Surface-mount hooded single-roll holder: rectangular chrome back plate on concealed screws, two side cheeks,
    a curved hood over the roll, a chrome-plated spring roller; a quilted roll with a V-folded tail; a banded spare roll
    (second root, for the tank lid). Wall at y = 0, +Z (three.js) = Blender -Y out of the wall."""
    ch = pbr('chrome_spotted', color=(0.92, 0.92, 0.93), metal=1.0, rough_map=spots_map(5), scale=(3, 3))
    tissue = pbr('tissue', color=(0.93, 0.93, 0.915), normal_map=quilt_map(), rough=0.9, scale=(40, 11), normal_strength=0.6)
    prn = pbr('roll_print', color_map=os.path.join(LAB, 'r1-print.png'), rough=0.8)
    W, ay, az, rr = 0.16, -0.062, -0.012, 0.0575              # roll axis 62 mm out, 12 mm below the plate centre
    plate = box('tp_plate', (W, 0.004, 0.09), (0, -0.002, 0), ch, bevel=0.003, segments=2)
    # the hood: a 1 mm sheet, flat top from the wall then round over the roll, ending in a rolled lip below the axis
    hr = rr + 0.007
    pts = [(0.0, az + hr)] + [(ay - hr * math.sin(t), az + hr * math.cos(t)) for t in [R(a) for a in range(0, 88, 8)]]
    P = [[(x, y, z) for x in np.linspace(-W / 2, W / 2, 9)] for (y, z) in pts]
    hood = grid_mesh('tp_hood', P, ch)
    sol = hood.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.0012; sol.offset = 1
    bv = hood.modifiers.new('b', 'BEVEL'); bv.width = 0.0005; bv.segments = 1
    ly, lz = pts[-1]
    lip = cyl('tp_lip', 0.0018, W, (0, ly + 0.0005, lz), ch, verts=10, rotation=(0, R(90), 0))
    for sx in (-1, 1):                                           # the side cheeks: D-shaped 1.5 mm plates
        cheek = [(0.0, az + hr)] + pts[1:] + [(0.0, lz)]
        me_v = [(sx * (W / 2 - 0.0008), y, z) for (y, z) in cheek]
        o = mk('tp_cheek', me_v, [list(range(len(me_v)))], None, ch)
        s2 = o.modifiers.new('s', 'SOLIDIFY'); s2.thickness = 0.0015; s2.offset = 0
        cyl('tp_socket', 0.006, 0.006, (sx * (W / 2 - 0.004), ay, az), ch, verts=16, rotation=(0, R(90), 0))
    for sx in (-1, 1):                                           # concealed-screw bosses on the plate face (a rust freckle on one)
        cyl('tp_screw', 0.0035, 0.0015, (sx * 0.06, -0.0045, 0.03), ch, verts=12, rotation=(R(90), 0, 0))
    rust = pbr('rust_freckle', color=(0.28, 0.12, 0.04), rough=0.8)
    rf = cyl('tp_rust', 0.0009, 0.0003, (0.0612, -0.0054, 0.0292), rust, verts=6, rotation=(R(90), 0, 0))
    rf.data.materials[0] = ch                                     # ponytail: freckle too small to earn a 4th material; reads as a dull dot via spots map
    # the roller: chrome-plated ABS tube through the core, spring ends in the sockets
    roller = cyl('tp_roller', 0.0105, W - 0.01, (0, ay, az), ch, verts=16, rotation=(0, R(90), 0))
    # roll: quilted outer surface, end faces showing the wound layers (print atlas core strip), kraft core
    L = 0.1
    side = lathe('roll_side', [(rr, -L / 2), (rr, L / 2)], tissue, segs=48, caps=False)
    for v in side.data.vertices:                                  # a wound roll is never round: soft flats, a slight crown
        a = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.008 * math.sin(3 * a + 0.7) + 0.004 * math.sin(7 * a) - 0.006 * (abs(v.co.z) / (L / 2)) ** 4
        v.co.x *= k; v.co.y *= k
    ends = []
    for s in (-1, 1):
        prof = [(0.0215, s * L / 2), (rr * 0.995, s * L / 2)] if s > 0 else [(rr * 0.995, s * L / 2), (0.0215, s * L / 2)]
        e = lathe('roll_end', prof, tissue, segs=48, caps=False); ends.append(e)
    core_in = lathe('roll_core', [(0.0205, -L / 2 - 0.0005), (0.0205, L / 2 + 0.0005)], prn, segs=24, caps=False, rect=(0, 0.02, 1, 0.48))
    core_rim = lathe('roll_core_rim', [(0.0205, L / 2 + 0.0005), (0.0218, L / 2 + 0.0005)], prn, segs=24, caps=False, rect=(0, 0.02, 1, 0.48))
    core_rim2 = lathe('roll_core_rim', [(0.0218, -L / 2 - 0.0005), (0.0205, -L / 2 - 0.0005)], prn, segs=24, caps=False, rect=(0, 0.02, 1, 0.48))
    for f in core_in.data.polygons:                               # seen from inside: flip the normals
        f.flip()
    roll = join([side] + ends + [core_in, core_rim, core_rim2], 'take_roll')
    roll.rotation_euler = (0, R(90), 0); roll.location = (0, ay, az)
    roll['kind'] = 'toilet paper'
    # the tail: off the front of the roll, 8 cm down, folded to a V point (housekeeping fold: both corners turned back)
    tw = L - 0.004; rows = []
    for i in range(13):
        t = i / 12
        if i <= 4:                                                # over the top-front of the roll, onto the front
            a = R(50 - 12.5 * i); rq = rr * 1.012 + 0.0008             # just proud of the wound surface (and its 1 % flats)
            y, z = -rq * math.cos(a), rq * math.sin(a)
        else:
            y, z = -rr * 1.012 - 0.0008 - 0.0015 * (i - 4) ** 0.7, -0.0105 * (i - 4)
        rows.append((y, z))
    TP = []
    for i, (y, z) in enumerate(rows):
        r_ = []
        for j, x in enumerate(np.linspace(-tw / 2, tw / 2, 9)):
            f = abs(x) / (tw / 2)
            zz = z
            if i == 12:                                           # the V: corners folded back, point at the middle
                zz = rows[11][1] - 0.035 * (1 - f) - 0.002
            r_.append((x, y + 0.0007 * math.sin(i * 1.3 + j), zz))
        TP.append(r_)
    tail = grid_mesh('roll_tail', TP, tissue, [[(j / 8 * 0.25, i / 12 * 0.6) for j in range(9)] for i in range(13)])
    fold = []                                                     # the turned-back corner triangles, behind the sheet
    for sx in (-1, 1):
        zb = rows[11][1]
        tri = [(sx * tw / 2, rows[11][0] + 0.0012, zb), (sx * 0.002, rows[11][0] + 0.0012, zb - 0.034), (sx * 0.002, rows[11][0] + 0.0012, zb)]
        o = mk('roll_tail_fold', tri, [(0, 1, 2) if sx > 0 else (0, 2, 1)], [[(0.1, 0.1), (0.2, 0.0), (0.2, 0.1)]], tissue); fold.append(o)
    tail = join([tail] + fold, 'roll_tail')
    s3 = tail.modifiers.new('s', 'SOLIDIFY'); s3.thickness = 0.0005
    apply_mods(tail)
    set_origin(tail, (0, -rr, 0))
    tail.location.y += ay; tail.location.z += az
    under(tail, roll)
    # spare roll: upright, origin at its base, at three.js offset (+0.48, +0.12, +0.40) = Blender (0.48, -0.40, 0.12)
    sp = lathe('take_roll_spare', [(0.0205, 0.0), (0.055, 0.0), (0.0555, 0.003), (0.0555, 0.097), (0.055, 0.1), (0.0205, 0.1)], tissue, segs=40, caps=False)
    for v in sp.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.01 * math.sin(2 * a + 1.2)
        v.co.x *= k; v.co.y *= k
    band = lathe('spare_band', [(0.0562, 0.02), (0.0562, 0.08)], prn, segs=40, caps=False, rect=(0, 0.52, 1, 0.98))
    for v in band.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.01 * math.sin(2 * a + 1.2)
        v.co.x *= k; v.co.y *= k
    sc = lathe('spare_core', [(0.0205, 0.1), (0.0205, 0.0)], prn, segs=24, caps=False, rect=(0, 0.02, 1, 0.48))
    sp = join([sp, band, sc], 'take_roll_spare')
    sp.location = (0.48, -0.40, 0.12); sp.rotation_euler = (0, 0, R(23)); sp['kind'] = 'toilet paper'
    check_clear([(roll, roller), (roll, hood), (roll, plate)])


# ---------------------------------------------------------------- 3. towel bar + towels
def towel(name, x0, seed, front_len, back_len, corner, bar_y):
    """A bath towel folded in thirds lengthwise (68 -> 23 cm) and hung doubled over the 19 mm bar: back panel up
    the wall side, over the bar, front panel down; terry ~3 layers thick, panels pressing together below the bar,
    soft vertical waves, hems at different heights, one corner lower."""
    rnd = random.Random(seed)
    W, t = 0.225, 0.009                                           # folded width, folded thickness
    rb = 0.0095 + t / 2 + 0.0008                                  # mid-surface radius round the bar
    ph = [rnd.uniform(0, TAU) for _ in range(6)]
    # path along the towel (s from the back hem up, round the bar, down the front)
    path = []
    nb, nt, nf = 16, 9, 18
    for i in range(nb):                                           # back panel, hem (bottom) up to the bar
        f = i / nb; z = -back_len * (1 - f)
        path.append(('b', z))
    for i in range(nt + 1):
        path.append(('t', math.pi * i / nt))
    for i in range(1, nf + 1):
        f = i / nf; path.append(('f', -front_len * f))
    cols = 10
    P, UV = [], []
    s_acc = 0.0; prev = None
    for kind, val in path:
        row = []
        for j in range(cols + 1):
            u = j / cols; x = (u - 0.5) * W
            if kind == 't':
                a = val                                           # 0 = wall side, pi = room side, over the top
                y, z = bar_y + rb * math.cos(a), rb * math.sin(a)
                x *= 0.94                                         # bunched a little on the bar
            else:
                z = val
                depth = -z                                        # metres below the bar
                L = front_len if kind == 'f' else back_len
                gap = (rb - t / 2 - 0.0006) * math.exp(-depth / 0.05) + t / 2 + 0.0006
                sgn = 1 if kind == 'b' else -1
                wave = 0.006 * math.sin(TAU * u * 1.6 + ph[0] + depth * 3) * min(1, depth / 0.12)
                if kind == 'f':
                    wave += 0.003 * math.sin(TAU * u * 3.1 + ph[1]) * min(1, depth / 0.3) - 0.01 * max(0, depth / L - 0.75) * (1 + math.sin(TAU * u + ph[3]))
                    wave = min(wave, 0.0)                         # the front only bellies out, never into the back
                    wave -= 0.004 * math.sin(math.pi * u) * min(1, depth / 0.25)
                else:
                    wave = max(wave, 0.0) * 0.5 + 0.0025 * math.sin(math.pi * u) * min(1, depth / 0.25)
                y = bar_y + sgn * gap + wave
                x *= 0.94 + 0.06 * min(1, depth / 0.15)          # spreads to its width below the gather
                z += corner * (u - 0.5) * (depth / L) ** 3 + 0.004 * math.sin(TAU * u + ph[2]) * (depth / L) ** 2
            row.append((x0 + x, y, z))
        if prev is not None:
            s_acc += math.dist(prev, row[cols // 2])
        prev = row[cols // 2]
        P.append(row); UV.append([(j / cols, s_acc) for j in range(cols + 1)])
    tot = s_acc
    for row in UV:
        for j, (u, s_) in enumerate(row):
            row[j] = (u, s_ / tot)
    o = grid_mesh(name, P, None, UV)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = t; sol.offset = 0; sol.use_rim = True
    apply_mods(o)
    o.data.materials.append(pbr('terry', color_map=towel_map(1), color_scaled=False,
                                normal_map=acg('terry', 'normal'), rough_map=acg('terry', 'roughness'),
                                scale=(W / 0.16, tot / 0.16), normal_strength=1.3))
    smooth(o, 70)
    return o


def towel_bar(m):
    """24 in brushed stainless towel bar on two 7 cm posts with 6 cm round flanges (concealed set screws, a small
    hole under each post), two white terry bath towels hung doubled. Wall at y = 0; origin at the flanges' back face,
    bar centre height."""
    st = pbr('steel_spotted', color=(0.75, 0.75, 0.76), metal=1.0, rough_map=spots_map(8), scale=(2, 2))
    by = -0.07
    for sx in (-1, 1):
        x = sx * 0.305
        lathe('flange', [(0.0, 0.0), (0.03, 0.0), (0.03, -0.004), (0.026, -0.009), (0.012, -0.012), (0.0, -0.012)], st,
              loc=(x, 0, 0), rot=(R(90), 0, 0), segs=32)
        cyl('post', 0.0105, 0.06, (x, -0.04, 0), st, verts=20, rotation=(R(90), 0, 0))
        lathe('post_cap', [(0.0, 0.0), (0.013, 0.0), (0.0135, 0.012), (0.013, 0.024), (0.0, 0.024)], st,
              loc=(x, by + 0.012, 0), rot=(R(90), 0, 0), segs=24)
        cyl('set_screw', 0.0018, 0.001, (x, -0.04, -0.0105), st, verts=8)
    bar = cyl('bar', 0.0095, 0.61 - 0.026, (0, by, 0), st, verts=24, rotation=(0, R(90), 0))
    a = towel('take_towel', -0.135, 3, 0.70, 0.66, 0.025, by)
    b = towel('take_towel001', 0.128, 4, 0.715, 0.68, -0.006, by)
    for o in (a, b):
        set_origin(o, (o.location.x + (-0.135 if o is a else 0.128), by, 0))
    check_clear([(a, b), (a, bar), (b, bar)])
    empty('hang_point', (0, by, 0.0095))


# ---------------------------------------------------------------- 4. swing-arm sconce
def sconce(m):
    """Swing-arm reading sconce, hardwired: 12 x 20 cm rounded brushed-nickel back plate with a white rocker, a
    vertical swivel knuckle, a 12 mm two-section arm (elbow knuckle at 18 cm), a short drop through the spider of a
    22 x 18 cm white linen drum, diffuser disc underneath, LED bulb inside. Origin: plate back face, centre."""
    ni = pbr('nickel_brushed', color=(0.72, 0.7, 0.66), metal=1.0, color_map=acg_h('color'), normal_map=acg_h('normal'), rough_map=acg_h('roughness'), scale=(4, 4), normal_strength=0.5, max_px=512)
    shade_m = mats()['lampshade']                                 # named "lampshade": put()'s glow finds it
    sw_m = mat('switch_white', color=(0.9, 0.89, 0.86), roughness=0.4)
    plate = box('plate', (0.12, 0.018, 0.2), (0, -0.009, 0), ni, bevel=0.012, segments=4)
    smooth(plate, 35)
    box('plate_back', (0.112, 0.004, 0.192), (0, -0.0015, 0), ni, bevel=0.01, segments=3)
    sw = box('switch', (0.014, 0.008, 0.026), (0, -0.022, -0.06), sw_m, bevel=0.002, segments=2)
    sw.rotation_euler = (R(4), 0, 0)                              # the rocker sits pressed one way
    set_origin(sw, (0, -0.026, -0.06))
    box('switch_bezel', (0.022, 0.003, 0.034), (0, -0.019, -0.06), sw_m, bevel=0.0015, segments=2)
    # knuckle bracket on the plate: two ears and a vertical pin (arm_pivot, rotates about Blender Z = three.js Y)
    kz, ky = 0.05, -0.034
    for dz in (-0.022, 0.022):
        box('ear', (0.022, 0.018, 0.006), (0, -0.026, kz + dz), ni, bevel=0.002)
    pivot = empty('arm_pivot', (0, ky, kz))
    parts = [cyl('knuckle', 0.009, 0.038, (0, ky, kz), ni, verts=20, bevel=0.001)]
    droop = R(5)                                                  # a little loose: rests 5 degrees down
    L1, L2 = 0.18, 0.17
    def along(d):                                                 # point d metres out along the drooping arm
        return (0, ky - d * math.cos(droop), kz - d * math.sin(droop))
    e1 = along(L1)
    a1 = cyl('arm1', 0.006, L1 - 0.016, along(L1 / 2), ni, verts=12, rotation=(R(90) - droop, 0, 0))
    parts += [a1, cyl('elbow', 0.0085, 0.03, e1, ni, verts=18, bevel=0.001)]
    e2 = (0, e1[1] - L2 * math.cos(droop), e1[2] - L2 * math.sin(droop))
    parts.append(cyl('arm2', 0.006, L2 - 0.012, ((e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2, (e1[2] + e2[2]) / 2), ni, verts=12, rotation=(R(90) - droop, 0, 0)))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0068, segments=14, ring_count=8, location=e2)
    k = bpy.context.object; k.data.materials.append(ni); smooth(k); parts.append(k)
    # drop to the socket; shade hangs below it on a spider
    top = e2[2] - 0.035                                           # shade top ring
    parts.append(cyl('drop', 0.0045, e2[2] - (top - 0.03), (e2[0], e2[1], (e2[2] + top - 0.03) / 2), ni, verts=10))
    sx_, sy_ = e2[0], e2[1]
    parts.append(cyl('washer', 0.013, 0.003, (sx_, sy_, top), ni, verts=16))
    parts.append(cyl('socket', 0.016, 0.04, (sx_, sy_, top - 0.03), sw_m, verts=16))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, segments=16, ring_count=10, location=(sx_, sy_, top - 0.075))
    bulb = bpy.context.object; bulb.scale = (1, 1, 1.15); bulb.data.materials.append(shade_m); smooth(bulb); parts.append(bulb)
    Rs, Hs = 0.11, 0.18
    shade = lathe('shade', [(Rs, top - Hs), (Rs, top)], shade_m, loc=(sx_, sy_, 0), segs=40, caps=False)
    for v in shade.data.vertices:                                 # stretched linen on wire rings: tiny sag between ribs
        a = math.atan2(v.co.y, v.co.x); mid = 1 - abs((v.co.z - (top - Hs / 2)) / (Hs / 2))
        f = 1 - 0.003 * mid
        v.co.x *= f; v.co.y *= f
    s4 = shade.modifiers.new('s', 'SOLIDIFY'); s4.thickness = 0.0015; s4.offset = -1
    parts.append(shade)
    for z in (top, top - Hs):
        bpy.ops.mesh.primitive_torus_add(major_radius=Rs - 0.001, minor_radius=0.0016, major_segments=40, minor_segments=5, location=(sx_, sy_, z))
        ring = bpy.context.object; ring.data.materials.append(shade_m); parts.append(ring)
    for i in range(3):                                            # spider struts from the washer to the top ring
        a = TAU * i / 3 + 0.3
        p0 = (sx_ + 0.012 * math.cos(a), sy_ + 0.012 * math.sin(a)); p1 = (sx_ + (Rs - 0.004) * math.cos(a), sy_ + (Rs - 0.004) * math.sin(a))
        L = math.dist(p0, p1)
        s = cyl('strut', 0.0012, L, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, top), ni, verts=6, rotation=(0, R(90), a))
        parts.append(s)
    parts.append(cyl('diffuser', Rs - 0.004, 0.002, (sx_, sy_, top - Hs + 0.004), shade_m, verts=40))
    arm = join(parts, 'sconce_arm')
    set_origin(arm, pivot.location)
    under(arm, pivot)
    lp = empty('light_point', (sx_, sy_, top - 0.075)); under(lp, pivot)
    check_clear([(arm, plate)])


# ---------------------------------------------------------------- 5. blackout drapes
def pleat_sheet(name, flat_w, drop, z_top, n_folds, spacing_open, spacing_closed, depth_max, y0, seed, mat_, dir_=1,
                cols_per=5, rows=26, lead_fade=0.0, fray=False, crease=False):
    """A pinch-pleated panel hung from carriers: the fabric between neighbouring carriers bulges alternately to the
    room and to the wall (a half-sine), deeper when gathered. Built at the open spacing; shape key 'closed' at the
    drawn spacing. x runs from the outer (wall-end) edge, the node's origin, along dir_. Returns the object."""
    rnd = random.Random(seed)
    seg_len = flat_w / n_folds
    def amp_for(s):                                               # half-sine of width s and arc length seg_len
        lo, hi = 0.0, seg_len
        for _ in range(40):
            A = (lo + hi) / 2
            n = 24; L = sum(math.dist((s * k / n, A * math.sin(math.pi * k / n)), (s * (k + 1) / n, A * math.sin(math.pi * (k + 1) / n))) for k in range(n))
            lo, hi = (A, hi) if L < seg_len else (lo, A)
        return min(A, depth_max)
    ph = [rnd.uniform(0, TAU) for _ in range(5)]
    fa = [rnd.uniform(0.7, 1.25) for _ in range(n_folds)]          # no two folds alike
    def build(s):
        A0 = amp_for(s)
        P, UV, VC = [], [], []
        for i in range(rows + 1):
            v = i / rows; z = z_top - drop * v                     # top row first
            row, uvr = [], []
            sway = 0.012 * math.sin(ph[0] + v * 2.2) * v          # the hem swings a little off plumb
            for k in range(n_folds):
                for c in range(cols_per if k < n_folds - 1 else cols_per + 1):
                    t = c / cols_per
                    sgn = 1 if k % 2 == 0 else -1
                    # below the stiff pleat header the folds round out and vary fold to fold
                    A = A0 * (0.75 + 0.25 * min(1, v * 8)) * (fa[k] ** min(1, v * 4)) * (1 + 0.15 * math.sin(k * 1.7 + ph[1] + v * 3) * v)
                    g = 1 - ((k + t) / n_folds) ** 4                     # flare fades out: the leading edge hangs plumb
                    x = (k + t) * s * (1 + g * (0.07 * v + 0.04 * v * math.sin(k * 0.9 + ph[2])))
                    y = y0 + sgn * A * math.sin(math.pi * t)
                    zz = z
                    zc = z - (z_top - drop + 1.15)
                    if crease and abs(zc) < 0.15 and k >= n_folds - 2:   # where it is always grabbed: pressed flatter
                        y = y0 + (y - y0) * (1 - 0.45 * math.cos(zc / 0.15 * math.pi / 2))
                    if v > 0.97:                                    # hem: weighted, a slight wave
                        zz += 0.004 * math.sin(k * 2.3 + t * 3 + ph[3])
                    row.append((dir_ * x, y + sway * 0.3, zz))
                    uvr.append((((k + t) * seg_len) / flat_w, 1 - v))
            P.append(row); UV.append(uvr)
        return P, UV
    P, UV = build(spacing_open)
    o = grid_mesh(name, P, mat_, UV)
    if dir_ < 0:
        for f in o.data.polygons:
            f.flip()
    if lead_fade:                                                  # sun-faded band along the leading edge (vertex colour)
        ca = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for vi, v in enumerate(o.data.vertices):
            u = UV[vi // len(P[0])][vi % len(P[0])][0]
            dist = (1 - u) * flat_w                                 # metres from the leading edge (flat)
            f = 1.0 if dist < lead_fade * 0.6 else (0.84 + 0.16 * max(0, 1 - (dist - lead_fade * 0.6) / (lead_fade * 0.4)))
            ca.data[vi].color = (f, f, f * 0.98, 1)
    o.shape_key_add(name='Basis')
    sk = o.shape_key_add(name='closed')
    P2, _ = build(spacing_closed)
    flat = [p for row in P2 for p in row]
    for vi, p in enumerate(flat):
        sk.data[vi].co = p
    return o


def drapes(m):
    """Blackout drapes on a ceiling track behind a painted pelmet box (260 x 22 x 20 at the ceiling): two lined
    pinch-pleated panels (150 cm flat, 45 gathered / 130 drawn, 285 drop, hem 1 cm off a 295 ceiling's floor) and a
    voile sheer on the wall-side track. Origin: drape track centre at the ceiling face (z = 0); wall at y = +0.13;
    room at -Y. Panels authored open (gathered) with a 'closed' shape key."""
    face = pbr('drape_face', color_map=drape_maps(), normal_map=acg('drape', 'normal'), rough_map=acg('drape', 'roughness'),
               scale=(1.5 / 0.6, 2.85 / 0.6), normal_strength=1.0, vcol=True)
    white = mat('drape_white', color=(0.9, 0.9, 0.88), roughness=0.62)   # blackout backing and the pelmet paint
    sheer = pbr('voile', color=(0.92, 0.92, 0.9), normal_map=acg('voile', 'normal'), rough_map=acg('voile', 'roughness'),
                scale=(5.2 / 0.25, 2.85 / 0.25), normal_strength=0.6, alpha=0.6)
    alu = mat('track_alu', color=(0.8, 0.8, 0.82), roughness=0.35, metallic=1.0)
    WALL, TW = 0.13, 2.6
    # pelmet box: front board, end returns, top against the ceiling (all 18 mm painted MDF)
    box('pelmet_front', (TW + 0.036, 0.018, 0.2), (0, -0.099, -0.1), white, bevel=0.002)
    for sx in (-1, 1):
        box('pelmet_end', (0.018, 0.229, 0.2), (sx * (TW / 2 + 0.009), WALL - 0.229 / 2 - 0.0005, -0.1), white, bevel=0.002)
    box('pelmet_top', (TW, 0.21, 0.012), (0, WALL - 0.105 - 0.009, -0.006), white)
    for y in (0.0, 0.085):                                        # the two tracks (aluminium C-profile) and carriers
        box('track', (TW - 0.04, 0.022, 0.016), (0, y, -0.02), alu, bevel=0.0015)
    zt = -0.09                                                    # fabric top (the carriers' hooks)
    drop = 2.95 - 0.01 + zt                                       # hem 1 cm off the floor
    panels = {}
    for side, dir_ in (('left', 1), ('right', -1)):
        ox = -dir_ * TW / 2 + dir_ * 0.02
        reach = TW / 2 - 0.02 - 0.01                              # closed: leading edge 1 cm short of centre = 2 cm slit
        p = pleat_sheet(f'open_drapes_{side}', 1.5, drop, zt, 12, 0.45 / 12, reach / 12, 0.05, 0.0, 3 if side == 'left' else 9,
                        face, dir_, lead_fade=0.10, crease=True)
        back = pleat_sheet(f'drape_backing_{side}', 1.5, drop, zt, 12, 0.45 / 12, reach / 12, 0.05, 0.0,
                           3 if side == 'left' else 9, white, dir_, crease=True)
        for kb in back.data.shape_keys.key_blocks:                # the lining: 4 mm behind the face, toward the wall
            for d in kb.data:
                d.co.y += 0.004
        for f in back.data.polygons:
            f.flip()
        back.parent = p
        p.location = (ox, 0, 0)
        if side == 'right':                                       # frayed hem at the outer corner: a few loose threads
            th = []
            for i in range(5):
                x = dir_ * (0.01 + 0.012 * i); z0 = zt - drop
                v = [(x, -0.002, z0 + 0.002), (x + 0.0012, -0.002, z0 + 0.002), (x + 0.004 * math.sin(i), -0.003, z0 - 0.012 - 0.006 * (i % 3))]
                th.append(mk('fray', v, [(0, 1, 2)], [[(0.5, 0.0)] * 3], face))
            fr = join(th, 'drape_fray')
            ca = fr.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            for d in ca.data:
                d.color = (0.84, 0.84, 0.82, 1)
            fr.parent = p; fr.location = (0, 0, 0)
        g = empty(f'grab_{side}', (ox + dir_ * 0.45, -0.02, zt - drop + 1.15))
        under(g, p)
        g['closed_offset'] = [dir_ * (reach - 0.45), 0.0, 0.0]   # three.js: add offset * morph weight (local x) to follow
        panels[side] = p
    sh = pleat_sheet('open_sheer', 5.2, drop - 0.005, zt, 26, 0.5 / 26, 2.56 / 26, 0.02, 0.085, 21, sheer, 1, cols_per=4, rows=20)
    sh.location = (-TW / 2 + 0.02, 0, 0)
    bpy.context.view_layer.update()
    check_clear([(panels['left'], sh), (panels['right'], sh)])


# ---------------------------------------------------------------- previews
def preview_pair(name, far, close, wall=None):
    """Far and close shots; wall=(y, z0, z1) stands a painted wall plane behind wall-hung things for the shots only."""
    w = None
    if wall:
        y, z0, z1 = wall
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y + 0.0005, (z0 + z1) / 2), rotation=(R(90), 0, 0))
        w = bpy.context.object; w.scale = (4, z1 - z0, 1)
        w.data.materials.append(mat('__wall', color=(0.62, 0.6, 0.56), roughness=0.85))
    shot(os.path.join(SHOTS, name + '.png'), **far)
    shot(os.path.join(SHOTS, name + '-close.png'), **close)
    if w:
        bpy.data.objects.remove(w)


ASSETS = {
    'hotel-room-wastebasket': (wastebasket, set(), dict(cam=(0.55, -0.9, 0.75), target=(0, 0, 0.15)), dict(cam=(0.12, -0.3, 0.42), target=(0, 0, 0.24))),
    'hotel-tp-holder': (tp_holder, {'take_roll', 'take_roll_spare', 'roll_tail'}, dict(cam=(0.5, -1.0, 0.25), target=(0.22, -0.2, 0.0), floor=False),
                        dict(cam=(0.12, -0.3, -0.08), target=(0, -0.06, -0.04), floor=False)),
    'hotel-towel-bar-towels': (towel_bar, {'take_towel', 'take_towel001'}, dict(cam=(0.6, -1.4, 0.0), target=(0, -0.05, -0.3), floor=False),
                               dict(cam=(0.25, -0.35, 0.05), target=(0.1, -0.07, -0.08), floor=False)),
    'hotel-swing-arm-sconce': (sconce, {'sconce_arm', 'switch'}, dict(cam=(0.6, -0.9, 0.2), target=(0, -0.2, -0.02), floor=False),
                               dict(cam=(0.15, -0.25, -0.02), target=(0, -0.02, -0.04), floor=False)),
    'hotel-blackout-drapes': (drapes, {'open_drapes_left', 'open_drapes_right', 'open_sheer', 'drape_backing_left', 'drape_backing_right', 'drape_fray'},
                              dict(cam=(0.8, -5.6, -1.5), target=(0, 0, -1.5)),
                              dict(cam=(-0.75, -0.55, -1.75), target=(-1.15, 0, -1.85), floor=False)),
}

WALLS = {'hotel-tp-holder': (0, -0.6, 0.4), 'hotel-towel-bar-towels': (0, -1.0, 0.5), 'hotel-swing-arm-sconce': (0, -0.6, 0.5),
         'hotel-blackout-drapes': (0.13, -2.95, 0.0)}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, keep, far, close = ASSETS[name]
        reset()
        build(mats())
        keep_merge(keep)
        preview_pair(name, far, close, WALLS.get(name))
        export(os.path.join(OUT, name + '.glb'), name)

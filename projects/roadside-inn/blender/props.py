# SPDX-License-Identifier: CC0-1.0
# Lived-in lobby props with printed labels: the sundry market (cooler and shelf), snack vending, the coffee counter,
# the business center (monitors, keyboards, mice, printer), the communal table's pop-up power, wall outlets, a brochure
# rack, newspapers, a takeaway coffee cup, a phone, an area rug and the entry mat. Labels come from labels/*.png
# (drawn by labels.mjs; every brand invented), mapped by the UV rects in labels/*.json.
# Origin at floor center; front faces Blender -Y (three.js +Z).
#   node projects/roadside-inn/blender/labels.mjs
#   blender -b --python projects/roadside-inn/blender/props.py -- [asset ...]     (default: all)
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, preview, mats, image
from lobby import kit, flat, merge, OUT, SHOTS
import desk

HERE = os.path.dirname(__file__)
LAB = os.path.join(HERE, 'labels')
RECT = {a: json.load(open(os.path.join(LAB, a + '.json'))) for a in ('products', 'print', 'lobby')}
R = math.radians
TAU = math.tau


# ---------- materials ----------
def atlas(file, rough=0.35, emit=0.0, name=None):
    """Material printed from a label atlas (labels/<file>.png)."""
    name = name or f'{file}_{emit}'
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(LAB, file + '.png'), check_existing=True)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if emit:
        nt.links.new(tx.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
    return m


def textile(name, color_file, normal_scale=10.0, rough=1.0):
    """A printed textile: its own colour map on UV 0-1, the corridor carpet's pile normal tiled on top."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(color_file, check_existing=True)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    coord = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (normal_scale, normal_scale, 1)
    nt.links.new(coord.outputs['UV'], mp.inputs['Vector'])
    nm = nt.nodes.new('ShaderNodeTexImage'); nm.image = image('acg-hotel-carpet-normal.jpg'); nm.image.colorspace_settings.name = 'Non-Color'
    nt.links.new(mp.outputs['Vector'], nm.inputs['Vector'])
    nn = nt.nodes.new('ShaderNodeNormalMap'); nn.inputs['Strength'].default_value = 1.0
    nt.links.new(nm.outputs['Color'], nn.inputs['Color']); nt.links.new(nn.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m


def plastic(name, color, alpha=1.0, rough=0.12):
    return bpy.data.materials.get(name) or material(name, color=color, roughness=rough, alpha=alpha)


# ---------- mesh builders with UVs ----------
def mk(name, verts, faces, uvs, mat, loc=(0, 0, 0), rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs is not None:
        ul = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            for k, li in enumerate(p.loop_indices):
                ul.data[li].uv = uvs[p.index][k]
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if mat:
        me.materials.append(mat)
    o.location = loc; o.rotation_euler = rot
    return o


def lathe(name, prof, mat, loc=(0, 0, 0), segs=24, rect=None, caps=True, rot=(0, 0, 0), smooth_angle=50):
    """Revolve a (radius, z) profile, bottom to top. With rect, the side wraps that atlas rect once around (u) and
    bottom-to-top along the profile (v); u = 0.75 faces -Y, the front, where labels.mjs prints the brand."""
    n = len(prof); verts, faces, uvs = [], [], []
    for r, z in prof:
        for j in range(segs + 1):
            a = TAU * j / segs; verts.append((r * math.cos(a), r * math.sin(a), z))
    zs = [z for _, z in prof]; z0, z1 = min(zs), max(zs)
    u0, v0, u1, v1 = rect or (0, 0, 1, 1)
    for i in range(n - 1):
        for j in range(segs):
            a = i * (segs + 1) + j
            faces.append((a, a + 1, a + segs + 2, a + segs + 1))
            fz = lambda k: v0 + (v1 - v0) * (prof[k][1] - z0) / max(1e-6, z1 - z0)
            fu = lambda jj: u0 + (u1 - u0) * jj / segs
            uvs.append([(fu(j), fz(i)), (fu(j + 1), fz(i)), (fu(j + 1), fz(i + 1)), (fu(j), fz(i + 1))])
    if caps:
        for k, top in ((0, False), (n - 1, True)):
            r, z = prof[k]
            if r <= 1e-5:
                continue
            c = len(verts); verts.append((0, 0, z)); base = k * (segs + 1)
            for j in range(segs):
                faces.append((c, base + j, base + j + 1) if top else (c, base + j + 1, base + j))
                uvs.append([(u0, v0)] * 3)
    o = mk(name, verts, faces, uvs, mat, loc, rot)
    o.data.shade_smooth(); o.data.use_auto_smooth = True; o.data.auto_smooth_angle = R(smooth_angle)
    return o


def pillow(name, w, h, d, rect, mat, loc=(0, 0, 0), rot=(0, 0, 0), crimp=0.07, axis='z', nx=8, nz=10):
    """A sealed snack bag or wrapper: two puffed sheets in XZ meeting at flat crimped seals (top and bottom, or the
    ends when axis='x'). Front (-Y) shows the atlas rect, the back shows it mirrored."""
    verts, faces, uvs = [], [], []
    u0, v0, u1, v1 = rect
    for side in (-1, 1):
        base = len(verts)
        for i in range(nz + 1):
            for j in range(nx + 1):
                u, v = j / nx, i / nz
                along, across = (v, u) if axis == 'z' else (u, v)
                c = crimp / (h if axis == 'z' else w)
                seal = 0.0 if along < c or along > 1 - c else math.sin(math.pi * (along - c) / (1 - 2 * c)) ** 0.35
                f = math.sin(math.pi * across) ** 0.45 * seal
                pinch = 1 - 0.06 * f                                   # the sheets pull in as the bag puffs
                x = (u - 0.5) * w * (pinch if axis == 'z' else 1)
                z = v * h if axis == 'z' else 0.5 * h + (v - 0.5) * h * pinch
                verts.append((x, side * (0.0006 + d / 2 * f), z))
        for i in range(nz):
            for j in range(nx):
                a = base + i * (nx + 1) + j; b, c2, dd = a + 1, a + nx + 2, a + nx + 1
                if side < 0:
                    faces.append((a, b, c2, dd)); uu = [j, j + 1, j + 1, j]
                else:
                    faces.append((a, dd, c2, b)); uu = [j, j, j + 1, j + 1]
                vv = [i, i, i + 1, i + 1] if side < 0 else [i, i + 1, i + 1, i]
                uvs.append([(u0 + (u1 - u0) * ((q / nx) if side < 0 else 1 - q / nx), v0 + (v1 - v0) * p / nz) for q, p in zip(uu, vv)])
    o = mk(name, verts, faces, uvs, mat, loc, rot)
    o.data.shade_smooth()
    return o


def carton(name, w, d, h, rect, mat, loc=(0, 0, 0), rot=(0, 0, 0), side_rect=None, top_rect=None):
    """A printed box: front and back show the rect; sides, top and bottom sample a strip of its edge colour."""
    u0, v0, u1, v1 = rect
    sw = (u1 - u0) * min(1, d / w); sh = (v1 - v0) * min(1, d / h)
    x, y = w / 2, d / 2
    F = [((-x, -y, 0), (x, -y, 0), (x, -y, h), (-x, -y, h)), ((x, y, 0), (-x, y, 0), (-x, y, h), (x, y, h)),
         ((x, -y, 0), (x, y, 0), (x, y, h), (x, -y, h)), ((-x, y, 0), (-x, -y, 0), (-x, -y, h), (-x, y, h)),
         ((-x, -y, h), (x, -y, h), (x, y, h), (-x, y, h)), ((-x, y, 0), (x, y, 0), (x, -y, 0), (-x, -y, 0))]
    full = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    sr = side_rect or (u0 + sw * 0.1, v0, u0 + sw, v1)
    side = [(sr[0], sr[1]), (sr[2], sr[1]), (sr[2], sr[3]), (sr[0], sr[3])]
    top = [(u0, v1 - sh), (u1, v1 - sh), (u1, v1 - sh * 0.1), (u0, v1 - sh * 0.1)]
    if top_rect:
        a0, b0, a1, b1 = top_rect; top = [(a0, b0), (a1, b0), (a1, b1), (a0, b1)]
    U = [full, full, side, side, top, top if not top_rect else side]
    verts = [p for f in F for p in f]
    return mk(name, verts, [tuple(range(4 * i, 4 * i + 4)) for i in range(6)], U, mat, loc, rot)


def P(k):            # a product label rect
    return RECT['products'][k]


def Q(k):            # a print rect
    return RECT['print'][k]


def L(k):            # a lobby print rect (coffee bar, bins, desk paperwork)
    return RECT['lobby'][k]


# ---------- the products themselves ----------
def can(name, lab, mat_lab, loc, tall=False):
    h = 0.157 if tall else 0.122
    alu = material('aluminium', color=(0.8, 0.81, 0.83), roughness=0.25, metallic=1.0) if 'aluminium' not in bpy.data.materials else bpy.data.materials['aluminium']
    x, y, z = loc
    lathe(name + '_lbl', [(0.033, 0.01), (0.033, h - 0.014)], mat_lab, (x, y, z), segs=20, rect=P(lab), caps=False)
    # aluminium only below and above the printed band (a full sleeve at r 0.0331 covered the label)
    lathe(name + '_alu', [(0.0, 0.0), (0.026, 0.0), (0.033, 0.01)], alu, (x, y, z), segs=20, caps=False)
    lathe(name + '_top', [(0.033, h - 0.014), (0.027, h - 0.002), (0.028, h), (0.0, h - 0.002)], alu, (x, y, z), segs=20, caps=False)


BOTTLE = [(0.0, 0.0), (0.03, 0.0), (0.034, 0.008), (0.034, 0.14), (0.03, 0.17), (0.018, 0.2), (0.0135, 0.215), (0.0135, 0.222)]


def bottle(name, lab, mat_lab, body, cap, loc, label=(0.06, 0.13)):
    x, y, z = loc
    lathe(name + '_pet', BOTTLE, body, (x, y, z), segs=16)
    lathe(name + '_lbl', [(0.0345, label[0]), (0.0345, label[1])], mat_lab, (x, y, z), segs=16, rect=P(lab), caps=False)
    cyl(name + '_cap', 0.015, 0.02, (x, y, z + 0.231), cap, verts=12)


def gable(name, lab, mat_lab, loc, rot=0):
    """A pint milk carton with its gable top and fin."""
    x, y, z = loc; w = 0.07
    carton(name, w, w, 0.1, P(lab), mat_lab, (x, y, z), (0, 0, rot))
    white = flat((0.95, 0.95, 0.93), 0.5, 'carton_white')
    roof = [(-w / 2, -w / 2, 0.1), (w / 2, -w / 2, 0.1), (w / 2, 0, 0.13), (-w / 2, 0, 0.13), (w / 2, w / 2, 0.1), (-w / 2, w / 2, 0.1)]
    mk(name + '_roof', roof, [(0, 1, 2, 3), (3, 2, 4, 5), (0, 3, 5), (1, 4, 2)], None, white, (x, y, z), (0, 0, rot))
    box(name + '_fin', (w, 0.004, 0.018), (x, y, z + 0.139), white).rotation_euler = (0, 0, rot)


def cupnoodle(name, lab, mat_lab, loc):
    lathe(name, [(0.038, 0.0), (0.048, 0.085)], mat_lab, loc, segs=20, rect=P(lab), caps=False)
    lathe(name + '_lid', [(0.0, 0.0), (0.05, 0.0), (0.05, 0.004), (0.0, 0.004)], flat((0.93, 0.92, 0.88), 0.4, 'paper_lid'), (loc[0], loc[1], loc[2] + 0.085), segs=20)
    lathe(name + '_bot', [(0.0, 0.0), (0.038, 0.0)], flat((0.93, 0.92, 0.88), 0.4, 'paper_lid'), loc, segs=20)


def takeaway_cup(name, mat_lab, loc, lid=True, sleeve=True, rot=0):
    """A 12 oz hot cup: printed paper, a kraft sleeve, a black sip lid."""
    x, y, z = loc
    lathe(name, [(0.0, 0.0), (0.028, 0.0), (0.029, 0.004), (0.04, 0.115), (0.041, 0.118)], mat_lab, (x, y, z), segs=24, rect=P('cup-white'), rot=(0, 0, rot))
    if sleeve:
        lathe(name + '_slv', [(0.0335, 0.035), (0.0375, 0.088)], mat_lab, (x, y, z), segs=24, rect=P('cup-sleeve'), caps=False, rot=(0, 0, rot))
    if lid:
        lid_m = plastic('lid_black', (0.02, 0.02, 0.022), rough=0.35)
        lathe(name + '_lid', [(0.0, 0.122), (0.03, 0.122), (0.034, 0.128), (0.04, 0.128), (0.043, 0.12), (0.043, 0.113)], lid_m, (x, y, z), segs=24, caps=False)
        lathe(name + '_lidc', [(0.0, 0.0), (0.03, 0.0)], lid_m, (x, y, z + 0.122), segs=24, caps=False)
        box(name + '_sip', (0.012, 0.004, 0.002), (x + 0.032 * math.sin(rot), y - 0.032 * math.cos(rot), z + 0.129), flat((0.0, 0.0, 0.0), 0.5, 'sip_hole')).rotation_euler = (0, 0, rot)


def receptacle(name, loc, up=False, plate=True):
    """US duplex receptacle on a white Decora plate. Wall mount faces -Y; up=True lies flat facing +Z."""
    white = flat((0.94, 0.93, 0.9), 0.35, 'outlet_white'); slot = flat((0.02, 0.02, 0.02), 0.6, 'outlet_slot')
    x, y, z = loc
    parts = []
    if plate:
        parts.append(box(name + '_plate', (0.07, 0.006, 0.115), (0, -0.003, 0), white, bevel=0.002, segments=2))
    for dz in (0.0195, -0.0195):
        parts.append(box(name + '_face', (0.034, 0.005, 0.034), (0, -0.0085, dz), white, bevel=0.003, segments=2))
        for dx in (-0.0065, 0.0065):
            parts.append(box(name + '_slot', (0.0018 if dx < 0 else 0.0018, 0.001, 0.0075 if dx < 0 else 0.0062), (dx, -0.0112, dz + 0.004), slot))
        parts.append(box(name + '_gnd', (0.0045, 0.001, 0.0045), (0, -0.0112, dz - 0.008), slot, bevel=0.0015, segments=2))
    parts.append(cyl(name + '_screw', 0.0028, 0.002, (0, -0.0065, 0), white, verts=10, rotation=(R(90), 0, 0)))
    for p in parts:
        lx, ly, lz = p.location
        if up:   # rotate the wall layout to lie face-up: wall -Y becomes +Z
            p.location = (x + lx, y + lz, z - ly); p.rotation_euler = (p.rotation_euler[0] + R(-90), p.rotation_euler[1], p.rotation_euler[2])
        else:
            p.location = (x + lx, y + ly, z + lz)
    return parts


# ---------- assets ----------
def market_cooler(m):
    """Two-door glass merchandiser, 1.35 m: black frame, lit header, five LED-lit shelves of spring water, sports
    drinks, energy cans, sodas, juices, sweet tea, pint milks and cold brew, faced two and three deep."""
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
    glass = material('door_glass', color=(0.75, 0.82, 0.85), roughness=0.03, alpha=0.12)
    for i, x in enumerate((-W / 4, W / 4)):
        box(f'door_frame{i}_l', (0.035, 0.03, H - 0.36), (x - W / 4 + 0.02, -D / 2 + 0.015, 0.14 + (H - 0.36) / 2), m['black'])
        box(f'door_frame{i}_t', (W / 2, 0.03, 0.035), (x, -D / 2 + 0.015, H - 0.24), m['black'])
        box(f'door_frame{i}_b', (W / 2, 0.03, 0.035), (x, -D / 2 + 0.015, 0.16), m['black'])
        box(f'glass{i}', (W / 2 - 0.05, 0.008, H - 0.42), (x, -D / 2 + 0.015, 0.14 + (H - 0.36) / 2), glass)
        box(f'handle{i}', (0.025, 0.04, 0.7), (x + (W / 4 - 0.06) * (1 if i == 0 else -1), -D / 2 - 0.02, 1.1), m['brushed'])
    lab = atlas('products')
    pet = {
        'water': plastic('pet_water', (0.75, 0.88, 0.97), 0.35, 0.05), 'cola': plastic('pet_cola', (0.12, 0.04, 0.02), 1.0),
        'lemon': plastic('pet_lemon', (0.78, 0.92, 0.7), 0.5, 0.05), 'oj': plastic('pet_oj', (0.95, 0.5, 0.05), 1.0),
        'apple': plastic('pet_apple', (0.75, 0.42, 0.08), 1.0), 'tea': plastic('pet_tea', (0.55, 0.25, 0.06), 1.0),
        'sports': plastic('pet_sports', (0.25, 0.55, 0.95), 1.0),
    }
    caps = {k: flat(c, 0.4, f'cap_{k}') for k, c in (('blue', (0.05, 0.25, 0.75)), ('red', (0.7, 0.05, 0.05)), ('green', (0.1, 0.5, 0.15)),
                                                     ('orange', (0.95, 0.55, 0.05)), ('white', (0.92, 0.92, 0.9)), ('black', (0.03, 0.03, 0.03)))}
    shelves = [0.2, 0.55, 0.9, 1.22, 1.52]
    for z in shelves[1:]:
        box('shelf', (W - 0.1, D - 0.14, 0.012), (0, 0.02, z), m['steel'])
        box('price_rail', (W - 0.1, 0.006, 0.03), (0, -D / 2 + 0.08, z - 0.006), flat((0.95, 0.95, 0.95), 0.5, 'rail'))
    rnd = random.Random(7)
    deep = lambda n, step: [-0.22 + k * step for k in range(n)]
    x0, x1 = -W / 2 + 0.1, W / 2 - 0.07
    # bottom: spring water, three deep
    x = x0
    while x < x1:
        for y in deep(3, 0.1):
            bottle('water', 'bottle-water', lab, pet['water'], caps['blue'], (x, y, 0.2 + 0.006))
        x += 0.074
    # sports drinks and energy cans
    x = x0
    for k in range(16):
        if x > x1: break
        if k < 7:
            for y in deep(3, 0.1): bottle('sport', 'bottle-sports', lab, pet['sports'], caps['white'], (x, y, 0.556))
            x += 0.074
        else:
            for y in deep(4, 0.075): can('volt', 'can-energy', lab, (x, y, 0.556), tall=True)
            x += 0.07
    # sodas: bottles of cola and lemon-lime, cans of orange, root beer, diet
    x = x0; plan = ['cola'] * 4 + ['lemon'] * 3 + ['can-orange', 'can-orange', 'can-rootbeer', 'can-rootbeer', 'can-diet', 'can-diet']
    for kind in plan:
        if x > x1: break
        if kind.startswith('can'):
            for y in deep(4, 0.075): can('soda', kind, lab, (x, y, 0.906))
            x += 0.07
        else:
            for y in deep(3, 0.1): bottle('soda', f'bottle-{kind}', lab, pet[kind], caps['red' if kind == 'cola' else 'green'], (x, y, 0.906))
            x += 0.074
    # juices and sweet tea
    x = x0; plan = ['oj'] * 6 + ['apple'] * 4 + ['tea'] * 6
    for kind in plan:
        if x > x1: break
        for y in deep(3, 0.1): bottle('juice', {'oj': 'bottle-oj', 'apple': 'bottle-apple', 'tea': 'bottle-tea'}[kind], lab, pet[kind], caps['orange' if kind != 'tea' else 'black'], (x, y, 1.226))
        x += 0.074
    # pint milks and cold brew
    x = x0
    for k in range(18):
        if x > x1: break
        if k < 10:
            for y in deep(3, 0.09): gable('milk', 'milk' if k < 6 else 'milk-choc', lab, (x, y + 0.02, 1.526), rot=R(rnd.uniform(-3, 3)))
            x += 0.078
        else:
            for y in deep(4, 0.075): can('brew', 'can-coldbrew', lab, (x, y, 1.526))
            x += 0.07
    carton('prices', W - 0.12, 0.002, 0.026, P('market-price'), lab, (0, -D / 2 + 0.076, shelves[3] - 0.02))


def market_shelf(m):
    """Sundry shelving, 1.2 m: dark laminate case; top shelf of chip and snack bags, then candy and granola bars, then
    pain relievers, toiletries and travel essentials (blister cards), and microwave cups, cookies and crackers."""
    W, D, H = 1.2, 0.42, 1.65
    box('back', (W, 0.02, H), (0, D / 2 - 0.01, H / 2), m['laminate_dark'])
    for x in (-W / 2 + 0.01, W / 2 - 0.01):
        box('side', (0.02, D, H), (x, 0, H / 2), m['laminate_dark'])
    box('kick', (W, D, 0.1), (0, 0, 0.05), m['laminate_dark'])
    lab = atlas('products')
    rnd = random.Random(11)
    rows = (0.1, 0.48, 0.86, 1.24)
    for z in rows:
        box('shelf', (W - 0.04, D - 0.02, 0.02), (0, 0, z + 0.01), m['laminate_dark'])
        carton('price', W - 0.06, 0.002, 0.028, P('market-price'), lab, (0, -D / 2 + 0.006, z - 0.004))
    x0, x1 = -W / 2 + 0.06, W / 2 - 0.06
    # top: bags, two deep, leaning back
    x = x0; bags = ['chips-salt', 'chips-salt', 'chips-bbq', 'chips-sco', 'chips-jalapeno', 'puffs', 'pretzels', 'trailmix', 'gummies', 'popcorn']
    for k in bags:
        if x + 0.065 > x1: break
        for y in (-0.12, 0.0, 0.12):
            pillow('bag', 0.125, 0.18, 0.045, P(k), lab, (x + 0.062, y, 1.26), (R(-10 + rnd.uniform(-3, 3)), 0, R(rnd.uniform(-4, 4))))
        x += 0.13
    # candy and granola bars standing on edge, three deep, then crackers and cookies
    x = x0
    for k in ['bar-choc', 'bar-caramel', 'bar-wafer', 'bar-mint', 'bar-granola', 'bar-protein']:
        for y in (-0.15, -0.12, -0.09, -0.06, -0.03):
            pillow('bar', 0.14, 0.045, 0.012, P(k), lab, (x + 0.07, y, 0.87 + 0.0), (R(-6), 0, 0), crimp=0.012, axis='x', nx=10, nz=4)
        x += 0.15
    for k, n in (('cookies', 2), ('crackers', 2)):
        for i in range(n):
            if x + 0.045 > x1: break
            for y in (-0.15, -0.09, -0.03, 0.03):
                carton('box', 0.08, 0.03, 0.105, P(k), lab, (x + 0.045, y, 0.87))
            x += 0.09
    # medicine cartons and toiletries; blister cards in front
    x = x0
    for k in ['ibuprofen', 'ibuprofen', 'acetaminophen', 'antacid', 'coldmed', 'bandages', 'toothpaste', 'podsbox']:
        for y in (-0.16, -0.12, -0.08, -0.04):
            carton('med', 0.065, 0.022, 0.085, P(k), lab, (x + 0.035, y, 0.49))
        x += 0.075
    for k in ['toothbrush', 'razor', 'deodorant', 'cable', 'stainpen']:
        if x + 0.05 > x1: break
        for y in (-0.16, -0.14, -0.12):
            carton('card', 0.09, 0.008, 0.13, P(k), lab, (x + 0.05, y, 0.49), (R(-8), 0, 0))
        x += 0.1
    # microwave cups (stacked) and more crackers
    x = x0
    for k in ['cup-mac', 'cup-mac', 'cup-soup', 'cup-soup', 'cup-noodle', 'cup-noodle']:
        for y in (-0.13, -0.02, 0.09):
            cupnoodle('cup', k, lab, (x + 0.05, y, 0.12)); cupnoodle('cup', k, lab, (x + 0.05, y, 0.209))
        x += 0.105
    while x + 0.045 < x1:
        for y in (-0.15, -0.09, -0.03, 0.03):
            carton('box', 0.08, 0.03, 0.105, P('crackers' if int(x * 10) % 2 else 'cookies'), lab, (x + 0.045, y, 0.12))
        x += 0.09


def snack_vending(m):
    """Glass-front snack machine: six trays of spiral coils loaded with chips, pretzels, candy and granola bars;
    price strips, keypad with tap-to-pay reader, display, delivery bin."""
    cab = box('cabinet', (0.98, 0.86, 1.85), (0, 0, 0.925), m['black'])
    from common import carve
    carve(cab, box('cavity', (0.66, 0.42, 1.34), (-0.13, -0.24, 1.12), None))
    box('window', (0.64, 0.01, 1.32), (-0.13, -0.432, 1.12), material('vend_glass', color=(0.6, 0.7, 0.75), roughness=0.02, alpha=0.14))
    box('interior', (0.66, 0.02, 1.34), (-0.13, -0.035, 1.12), material('vend_back', color=(0.85, 0.85, 0.82), roughness=0.6))
    box('bay_light', (0.6, 0.02, 0.012), (-0.13, -0.42, 1.78), m['lit_white'])
    lab = atlas('products-1k')
    rows = [['bar-choc', 'bar-caramel', 'bar-wafer', 'bar-granola', 'bar-mint'], ['bar-protein', 'bar-choc', 'bar-caramel', 'cookies', 'crackers'],
            ['chips-salt', 'chips-bbq', 'chips-sco', 'puffs', 'pretzels'], ['chips-jalapeno', 'trailmix', 'gummies', 'popcorn', 'chips-salt'],
            ['chips-bbq', 'pretzels', 'puffs', 'chips-sco', 'trailmix'], ['popcorn', 'chips-salt', 'gummies', 'chips-bbq', 'pretzels']]
    for row, items in enumerate(reversed(rows)):
        z = 0.52 + row * 0.215
        box(f'tray{row}', (0.62, 0.36, 0.008), (-0.13, -0.24, z), m['steel'])
        carton(f'price{row}', 0.62, 0.002, 0.024, P('vend-price'), lab, (-0.13, -0.425, z - 0.022))
        for i, k in enumerate(items):
            x = -0.4 + i * 0.135
            bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.003, major_segments=20, minor_segments=5, location=(x, -0.27, z + 0.05), rotation=(R(90), 0, 0))
            coil = bpy.context.object; coil.scale = (1, 1, 3.5); coil.data.materials.append(m['steel'])
            for d, y in enumerate((-0.39, -0.32, -0.25)):
                if k.startswith('bar'):
                    pillow('bar', 0.12, 0.04, 0.012, P(k), lab, (x, y, z + 0.06), (R(-4), 0, 0), crimp=0.01, axis='x', nx=6, nz=2)
                elif k in ('cookies', 'crackers'):
                    carton('box', 0.075, 0.028, 0.1, P(k), lab, (x, y, z + 0.006))
                else:
                    pillow('bag', 0.105, 0.15, 0.04, P(k), lab, (x, y, z + 0.008), (R(-6), 0, R((d % 2) * 3 - 1.5)), nx=6, nz=6)
    box('keypad_panel', (0.22, 0.01, 0.5), (0.36, -0.432, 1.2), m['charcoal'])
    for r_ in range(4):
        for c in range(3):
            box('key', (0.045, 0.01, 0.03), (0.3 + c * 0.06, -0.44, 1.05 + r_ * 0.06), m['steel'], bevel=0.003)
    carton('display', 0.16, 0.004, 0.045, L('vend-display'), atlas('lobby', emit=1.2, rough=0.2, name='vend_lcd'), (0.36, -0.44, 1.338))
    box('reader', (0.09, 0.02, 0.12), (0.36, -0.445, 0.9), m['black'], bevel=0.008)
    box('reader_lit', (0.05, 0.004, 0.012), (0.36, -0.456, 0.94), m['led_blue'])
    box('coin', (0.03, 0.01, 0.08), (0.36, -0.44, 1.45), m['steel'])
    box('bin', (0.62, 0.03, 0.17), (-0.13, -0.43, 0.24), m['charcoal'], bevel=0.01)
    carton('header', 0.98, 0.01, 0.16, P('vend-header'), lab, (0, -0.437, 1.67))


def credenza(m, L, D=0.62, doors=4, name='cred'):
    """Formula Blue millwork base: white solid-surface carcass on a recessed plinth, oak slab doors with hairline
    reveals and finger-pull gaps, a quartz top (surface at 0.94). Front -Y."""
    box(name + '_carcass', (L, D - 0.02, 0.8), (0, 0.01, 0.5), m['solid'], bevel=0.004)
    box(name + '_plinth', (L - 0.08, D - 0.1, 0.1), (0, 0.02, 0.05), m['charcoal'])
    dw = (L - 0.06) / doors
    for i in range(doors):
        box(name + '_door', (dw - 0.006, 0.02, 0.7), (-L / 2 + 0.03 + dw * (i + 0.5), -D / 2 - 0.004, 0.48), m['oak'], bevel=0.002)
    box(name + '_pull', (L - 0.06, 0.012, 0.03), (0, -D / 2 + 0.006, 0.855), flat((0.02, 0.02, 0.02), 0.8, 'reveal'))
    box(name + '_top', (L + 0.03, D + 0.04, 0.04), (0, 0, 0.92), m['quartz'], bevel=0.004)


def coffee_station(m):
    m = dict(m); m['oak_small'] = flat((0.56, 0.4, 0.25), 0.45, 'oak_finish')
    """Self-serve coffee bar (front -Y), after the brand's lobby photos: an oak-and-white credenza; three black thermal
    servers on brew stands with drip grates and sight gauges (coffee, dark roast, decaf); a hot water tower; an oak cup
    caddy with nested printed cups, lids and sleeves; an oak condiment organizer with sugar packets and two big creamer
    bottles; a creamer-cup bowl, stir sticks, a tea chest, napkins and a basket of wrapped cookies."""
    LEN = 3.2
    credenza(m, LEN)
    lab = atlas('products-1k'); lob = atlas('lobby', rough=0.4)
    T0 = 0.94
    gauge = material('sight_glass', color=(0.12, 0.06, 0.02), roughness=0.05)
    for i, (x, k) in enumerate(zip((-1.38, -1.08, -0.78), ('server-coffee', 'server-bold', 'server-decaf'))):
        for sx in (-0.085, 0.085):
            box(f'stand_leg{i}', (0.02, 0.24, 0.11), (x + sx, 0.06, T0 + 0.055), m['black'])
        box(f'stand_top{i}', (0.2, 0.25, 0.012), (x, 0.06, T0 + 0.114), m['black'])
        box(f'grate{i}', (0.17, 0.2, 0.01), (x, 0.02, T0 + 0.005), m['steel'])
        for g in range(7):
            box('slot', (0.15, 0.006, 0.002), (x, -0.06 + g * 0.026, T0 + 0.011), m['black'])
        body = box(f'server{i}', (0.19, 0.22, 0.4), (x, 0.06, T0 + 0.32), m['black'], bevel=0.03, segments=4); smooth(body)
        box(f'server_lid{i}', (0.16, 0.18, 0.03), (x, 0.06, T0 + 0.535), m['steel'], bevel=0.012)
        box(f'handle{i}', (0.13, 0.025, 0.025), (x, 0.06, T0 + 0.575), m['black'], bevel=0.008)
        for hx in (-0.06, 0.06):
            box('handle_post', (0.02, 0.02, 0.03), (x + hx, 0.06, T0 + 0.555), m['black'])
        carton(f'label{i}', 0.15, 0.003, 0.07, L(k), lob, (x, -0.051, T0 + 0.33))
        box(f'gauge{i}', (0.014, 0.004, 0.22), (x + 0.075, -0.051, T0 + 0.33), gauge)
        box(f'tap{i}', (0.03, 0.05, 0.03), (x, -0.06, T0 + 0.145), m['steel'], bevel=0.006)
        box(f'tap_lever{i}', (0.018, 0.012, 0.06), (x, -0.085, T0 + 0.18), m['black'], bevel=0.005).rotation_euler = (R(-15), 0, 0)
    # hot water tower
    x = -0.5
    tw = box('hotwater', (0.14, 0.24, 0.48), (x, 0.06, T0 + 0.24), m['black'], bevel=0.02, segments=3); smooth(tw)
    carton('hotwater_label', 0.08, 0.003, 0.11, L('hot-water'), lob, (x, -0.061, T0 + 0.3))
    box('hw_tap', (0.03, 0.05, 0.025), (x, -0.08, T0 + 0.12), m['steel'], bevel=0.006)
    box('hw_lever', (0.016, 0.012, 0.05), (x, -0.1, T0 + 0.15), flat((0.75, 0.05, 0.04), 0.4, 'red_lever'), bevel=0.004)
    box('hw_grate', (0.12, 0.12, 0.01), (x, -0.06, T0 + 0.005), m['steel'])
    # oak cup caddy: three wells of nested cups (mouth down) and a lid stack
    box('cup_caddy', (0.44, 0.2, 0.07), (-0.08, 0.04, T0 + 0.035), m['oak_small'], bevel=0.004)
    for j in range(3):
        for k in range(12):
            lathe(f'cupstack{j}', [(0.041, 0.0), (0.04, 0.003), (0.029, 0.114), (0.0, 0.115)], lab, (-0.22 + j * 0.1, 0.04, T0 + 0.07 + 0.115 + k * 0.012), segs=20, rect=P('cup-white'), caps=False, rot=(R(180), 0, R(k * 17)))
    lid_m = plastic('lid_black', (0.02, 0.02, 0.022), rough=0.35)
    for k in range(22):
        lathe('lidstack', [(0.0, 0.0), (0.043, 0.0), (0.043, 0.006), (0.034, 0.012), (0.0, 0.012)], lid_m, (0.08, 0.04, T0 + 0.07 + k * 0.005), segs=20)
    for k in range(14):
        carton('sleeves', 0.1, 0.004, 0.055, P('cup-sleeve'), lab, (0.25, 0.1 + k * 0.006, T0), (R(-70), 0, 0))
    # oak condiment organizer, built from 8 mm boards like the real one (a solid block with packets sunk into it
    # clipped): a packet tray in front, sugar standing in five bins leaning on the back wall; behind it an open-front
    # cubby box with napkins and wrapped stirrers inside and the creamer bottles on top
    oak, t = m['oak_small'], 0.008
    ox, oy, OW, OD = 0.62, -0.06, 0.46, 0.18
    box('tray_floor', (OW, OD, t), (ox, oy, T0 + t / 2), oak)
    box('tray_lip', (OW, t, 0.035), (ox, oy - OD / 2 + t / 2, T0 + 0.0175), oak, bevel=0.002)
    box('tray_back', (OW, t, 0.06), (ox, oy + OD / 2 - t / 2, T0 + 0.03), oak, bevel=0.002)
    for sx in (-1, 1):
        box('tray_side', (t, OD - 2 * t, 0.06), (ox + sx * (OW - t) / 2, oy, T0 + 0.03), oak, bevel=0.002)
    bw = (OW - 2 * t) / 5
    for k in range(1, 5):
        box('tray_divider', (0.005, OD - 2 * t, 0.048), (ox - OW / 2 + t + k * bw, oy, T0 + t + 0.024), oak)
    for c_, k in enumerate(('sugar-white', 'sugar-raw', 'sugar-pink', 'sugar-blue', 'sugar-yellow')):
        r_ = random.Random(c_)
        for n in range(r_.randint(7, 11)):      # some bins run lower than others
            carton('packet', 0.045, 0.003, 0.062, P(k), lab, (ox - OW / 2 + t + (c_ + 0.5) * bw + r_.uniform(-0.004, 0.004), oy + OD / 2 - t - 0.019 - n * 0.011, T0 + t),
                   (R(-15), 0, R(r_.uniform(-3, 3))))
    cy_, CD, CH, cw_ = 0.135, 0.17, 0.27, OW
    box('cubby_bottom', (cw_, CD, t), (ox, cy_, T0 + t / 2), oak)
    box('cubby_top', (cw_, CD, t), (ox, cy_, T0 + CH - t / 2), oak, bevel=0.002)
    box('cubby_back', (cw_ - 2 * t, t, CH - 2 * t), (ox, cy_ + CD / 2 - t / 2, T0 + CH / 2), flat((0.3, 0.2, 0.12), 0.7, 'oak_back'))
    for sx in (-1, 0, 1):
        box('cubby_side', (t, CD, CH - 2 * t), (ox + sx * (cw_ - t) / 2, cy_, T0 + CH / 2), oak, bevel=0.002 if sx else 0)
    nap = flat((0.95, 0.94, 0.9), 0.9, 'napkin')
    for n in range(14):                          # folded napkins, a little askew
        box('napkin_fold', (0.17, 0.12, 0.0045), (ox - 0.115 + math.sin(n * 2.1) * 0.004, cy_ - 0.01 + math.cos(n * 1.3) * 0.004, T0 + t + 0.0025 + n * 0.0047), nap, bevel=0.0015).rotation_euler = (0, 0, R(math.sin(n) * 2))
    wrap = flat((0.93, 0.9, 0.84), 0.8, 'stir_wrap')
    for n in range(36):                          # paper-wrapped stirrers lying in a loose pile
        row, layer = n % 12, n // 12
        st = box('stirrer', (0.19, 0.006, 0.003), (ox + 0.115, cy_ - 0.055 + row * 0.0095, T0 + t + 0.0016 + layer * 0.0031), wrap)
        st.rotation_euler = (0, 0, R(math.sin(n * 1.7) * 2.5))
    white_btl = flat((0.95, 0.95, 0.93), 0.3, 'bottle_white')
    for n, (bx, k) in enumerate(((0.52, 'creamer-bottle'), (0.72, 'creamer-bottle-2'))):
        z0 = T0 + CH
        btl = lathe(f'creamer_btl{n}', [(0.0, 0.0), (0.04, 0.0), (0.045, 0.01), (0.045, 0.16), (0.03, 0.2), (0.016, 0.215), (0.0, 0.215)], white_btl, (bx, cy_, z0), segs=24)
        lbl = lathe(f'creamer_lbl{n}', [(0.0458, 0.03), (0.0458, 0.14)], lob, (bx, cy_, z0), segs=24, rect=L(k), caps=False)
        cap = cyl(f'creamer_cap{n}', 0.019, 0.025, (bx, cy_, z0 + 0.227), m['charcoal'] if n else flat((0.36, 0.25, 0.2), 0.4, 'cap_brown'), verts=16)
        bpy.context.view_layer.update(); take(btl, 'creamer', [lbl, cap])
    # creamer cups resting in the bowl: a ring of six round one in the middle on its flat bottom, four more lying on
    # top of them (they never share space)
    lathe('creamer_bowl', [(0.0, 0.0), (0.06, 0.0), (0.11, 0.07), (0.105, 0.07), (0.055, 0.006), (0.0, 0.006)], m['ceramic'], (1.0, -0.04, T0), segs=32, caps=False)
    rnd = random.Random(5)
    cups = [(0, 0, 0.0)] + [(math.cos(k * 1.047 + 0.3) * 0.038, math.sin(k * 1.047 + 0.3) * 0.038, 0.0) for k in range(6)]
    cups += [(math.cos(k * 1.571 + 0.8) * 0.02, math.sin(k * 1.571 + 0.8) * 0.02, 0.025) for k in range(4)]
    for n, (dx, dy, dz) in enumerate(cups):
        cx, cy, cz = 1.0 + dx, -0.04 + dy, T0 + 0.006 + dz
        tilt = (R(rnd.uniform(-6, 6)), R(rnd.uniform(-6, 6)), 0) if dz else (0, 0, 0)
        cup = lathe('creamer', [(0.0, 0.0), (0.0125, 0.0), (0.0175, 0.022), (0.0, 0.022)], flat((0.95, 0.95, 0.94), 0.4, 'creamer_cup'), (cx, cy, cz), segs=12, rot=tilt)
        k_ = P('creamer' if n % 3 else 'creamer-vanilla'); lid = carton('creamer_lid', 0.035, 0.035, 0.0012, k_, lab, (0, 0, 0.022), (0, 0, rnd.uniform(0, 3)), side_rect=k_[:2] * 2, top_rect=k_)
        lid.parent = cup
    cyl('stir_cup', 0.035, 0.11, (0.3, -0.16, T0 + 0.055), m['steel'], verts=20)
    for k in range(14):
        st = box('stir', (0.004, 0.0015, 0.18), (0.3 + math.cos(k) * 0.012, -0.16 + math.sin(k * 1.7) * 0.012, T0 + 0.1), flat((0.85, 0.72, 0.5), 0.8, 'stir_wood'))
        st.rotation_euler = (R(math.sin(k) * 8), R(math.cos(k * 1.3) * 8), 0)
    take(carton('tea', 0.2, 0.12, 0.08, P('tea-box'), lab, (1.0, 0.2, T0)), 'tea box')
    box('napkins', (0.13, 0.13, 0.05), (0.98, -0.21, T0 + 0.025), flat((0.95, 0.94, 0.9), 0.9, 'napkin'), bevel=0.004)
    basket = lathe('basket', [(0.0, 0.0), (0.14, 0.0), (0.17, 0.08), (0.165, 0.08), (0.135, 0.006), (0.0, 0.006)], material('wicker', color=(0.55, 0.38, 0.2), roughness=0.85), (1.36, 0.04, T0), segs=36, caps=False)
    basket.scale = (1.3, 0.85, 1)
    for n in range(9):
        a = n * 2.1; rr = 0.04 + (n % 3) * 0.04
        take(pillow('cookie', 0.11, 0.09, 0.022, P('cookie-wrap'), lab, (1.36 + math.cos(a) * rr * 1.3, 0.04 + math.sin(a) * rr * 0.8, T0 + 0.02 + 0.012 * (n // 3)),
               (R(rnd.uniform(70, 100)), R(rnd.uniform(-15, 15)), rnd.uniform(0, 3)), crimp=0.012, axis='x', nx=6, nz=6), 'cookie')


def bag_mat():
    return bpy.data.materials.get('bag_black') or material('bag_black', color=(0.008, 0.008, 0.01), roughness=0.55)


def coffee_board(m):
    """Black merchandising pegboard behind the coffee bar, printed with the slogan and today's roasts, in an oak frame.
    Origin at the wall's floor line; the face looks -Y."""
    W, H, zc = 3.0, 1.3, 1.62
    carton('board', W, 0.012, H, L('coffee-board'), atlas('lobby', rough=0.7, name='pegboard'), (0, 0, zc - H / 2))
    for (w, h, x, z) in ((W + 0.1, 0.05, 0, zc + H / 2 + 0.025), (W + 0.1, 0.05, 0, zc - H / 2 - 0.025), (0.05, H, -W / 2 - 0.025, zc), (0.05, H, W / 2 + 0.025, zc)):
        box('frame', (w, 0.03, h), (x, 0.0, z), m['oak'], bevel=0.003)


def liner(name, w, d, z_top, sag, seed):
    """A black trash bag folded over a rim of w x d: an uneven skirt, a few centimetres deep, hanging just outside."""
    rnd = random.Random(seed); verts, faces = [], []
    N = 64
    ph = [rnd.uniform(0, TAU) for _ in range(3)]
    drape = lambda t: 0.012 * math.sin(TAU * 3 * t + ph[0]) + 0.008 * math.sin(TAU * 7 * t + ph[1]) + 0.004 * math.sin(TAU * 13 * t + ph[2])
    per = 2 * (w + d)
    for k in range(N):
        s_ = per * k / N
        if s_ < w: x, y = -w / 2 + s_, -d / 2
        elif s_ < w + d: x, y = w / 2, -d / 2 + (s_ - w)
        elif s_ < 2 * w + d: x, y = w / 2 - (s_ - w - d), d / 2
        else: x, y = -w / 2, d / 2 - (s_ - 2 * w - d)
        out = 0.005 + 0.003 * math.sin(TAU * 5 * k / N + ph[1]); nx_ = (x / (w / 2)) * out if abs(abs(x) - w / 2) < 1e-6 else 0; ny_ = (y / (d / 2)) * out if abs(abs(y) - d / 2) < 1e-6 else 0
        verts += [(x * 0.97, y * 0.97, z_top - 0.03), (x + nx_ * 0.4, y + ny_ * 0.4, z_top + 0.004), (x + nx_, y + ny_, z_top - sag + drape(k / N))]
    for k in range(N):
        a, b = k * 3, ((k + 1) % N) * 3
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2)]
    o = mk(name, verts, faces, None, bag_mat())
    o.data.shade_smooth()
    return o


def waste_cabinet(m):
    """Built-in waste station matching the coffee credenza (0.9 m): two openings in the quartz top over lined bins,
    trash and recycle plates on the doors, a crumpled napkin and a cup lid caught at the rim."""
    W = 0.9
    credenza(m, W, doors=2, name='waste')
    top = [o for o in bpy.context.scene.objects if o.name.startswith('waste_top')][0]
    carcass = [o for o in bpy.context.scene.objects if o.name.startswith('waste_carcass')][0]
    from common import carve
    for i, x in enumerate((-0.2, 0.2)):
        carve(top, box('hole', (0.22, 0.17, 0.1), (x, -0.04, 0.92), None, bevel=0.04, segments=4))
        g = box(f'grommet{i}', (0.236, 0.186, 0.004), (x, -0.04, 0.94), m['steel'], bevel=0.04, segments=4)
        carve(g, box('gcut', (0.21, 0.16, 0.1), (x, -0.04, 0.94), None, bevel=0.035, segments=4))
        carve(carcass, box('ccut', (0.22, 0.17, 0.5), (x, -0.04, 0.8), None))
        for sx, sy in ((1, 0), (-1, 0), (0, 1), (0, -1)):      # the liner lines the opening down to the bag
            box('hole_liner', (0.004 if sx else 0.21, 0.004 if sy else 0.16, 0.12), (x + sx * 0.106, -0.04 + sy * 0.081, 0.88), bag_mat())
        box(f'bag_inner{i}', (0.21, 0.16, 0.36), (x, -0.04, 0.66), bag_mat())
        carton(f'plate{i}', 0.15, 0.003, 0.045, L('bin-trash' if i == 0 else 'bin-recycle'), atlas('lobby', rough=0.4), (x, -0.336, 0.76))
    pillow('napkin_ball', 0.07, 0.06, 0.05, (0.01, 0.01, 0.02, 0.02), flat((0.93, 0.92, 0.88), 0.95, 'napkin'), (-0.17, -0.05, 0.865), (R(30), R(20), 0.6), crimp=0.03, nx=5, nz=5)
    lid_m = plastic('lid_black', (0.02, 0.02, 0.022), rough=0.35)
    lathe('tossed_lid', [(0.0, 0.0), (0.043, 0.0), (0.043, 0.006), (0.034, 0.012), (0.0, 0.012)], lid_m, (0.22, -0.03, 0.85), segs=20, rot=(R(35), 0, 0))


def waste_bin(m):
    """Lobby wastebasket, 0.32 x 0.32 x 0.62: oak-laminate box, open top with a brushed steel rim, black liner
    folded over and sagging unevenly."""
    W, H = 0.32, 0.62
    from common import carve
    body = box('bin_body', (W, W, H - 0.04), (0, 0, 0.02 + (H - 0.04) / 2), m['oak'], bevel=0.006)
    carve(body, box('bin_hollow', (W - 0.03, W - 0.03, H), (0, 0, H / 2 + 0.06), None))
    box('bin_foot', (W - 0.03, W - 0.03, 0.02), (0, 0, 0.01), m['charcoal'])
    rim = box('bin_rim', (W + 0.01, W + 0.01, 0.025), (0, 0, H - 0.0125), m['brushed'], bevel=0.004)
    carve(rim, box('rim_cut', (W - 0.03, W - 0.03, 0.1), (0, 0, H - 0.0125), None))
    box('bin_bag', (W - 0.035, W - 0.035, 0.02), (0, 0, H - 0.25), bag_mat())
    for sx, sy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        box('bag_wall', (0.004 if sx else W - 0.035, 0.004 if sy else W - 0.035, 0.24), (sx * (W - 0.035) / 2, sy * (W - 0.035) / 2, H - 0.13), bag_mat())
    liner('bag_skirt', W + 0.012, W + 0.012, H, 0.05, 3)


def bell(m, loc):
    x, y, z = loc
    cyl('bell_base', 0.042, 0.014, (x, y, z + 0.007), m['black'], verts=28, bevel=0.003)
    lathe('bell_dome', [(0.0, 0.052), (0.012, 0.051), (0.03, 0.044), (0.039, 0.03), (0.041, 0.016), (0.041, 0.014)], m['chrome'], (x, y, z), segs=32, caps=False)
    cyl('bell_plunger', 0.003, 0.014, (x, y, z + 0.058), m['chrome'], verts=10)
    cyl('bell_knob', 0.008, 0.005, (x, y, z + 0.067), m['chrome'], verts=14, bevel=0.002)


def take(o, noun, parts=()):
    """Mark o as something you can pick up in the game (take_<noun>), its small parts parented to it so it lifts out
    whole. merge() keeps it out of the material groups."""
    o.name = 'take_' + noun.replace(' ', '_')
    for p in parts:
        p.parent = o; p.matrix_parent_inverse = o.matrix_world.inverted()
    return o


def tent(name, rect, mat, loc, w=0.14, h=0.09, yaw=0.0, noun='tent card'):
    """A folded tent card: printed face to -Y, a plain back, joined at the fold. Pick-up-able."""
    x, y, z = loc
    a = R(18)
    f = carton(name, w, 0.001, h / math.cos(a), rect, mat, (x, y - 0.028, z), (-a, 0, yaw))
    b = carton(name + '_back', w, 0.001, h / math.cos(a), (rect[0], rect[1], rect[0] + 0.002, rect[1] + 0.002), mat, (x, y + 0.028, z), (a, 0, yaw))
    bpy.context.view_layer.update()
    return take(f, noun, [b])


APPLE = [(0.0, 0.006), (0.01, 0.002), (0.022, 0.0), (0.033, 0.008), (0.04, 0.022), (0.041, 0.036), (0.038, 0.05), (0.031, 0.061), (0.02, 0.067), (0.009, 0.066), (0.0, 0.058)]


def apple(name, loc, col, seed, rot=(0, 0, 0)):
    """An apple: lathed with its real profile (dimpled at both ends), five faint lobes, a skin that varies, a stem."""
    rnd = random.Random(seed)
    o = lathe(name, APPLE, flat(tuple(max(0, c + rnd.uniform(-0.05, 0.05)) for c in col), 0.32, f'apple_skin{seed % 4}'), loc, segs=28, rot=rot)
    k = rnd.uniform(0, 6.28)
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x); r = math.hypot(v.co.x, v.co.y)
        lobe = 1 + 0.035 * math.cos(5 * a + k) * min(1, v.co.z / 0.03) + rnd.uniform(-0.004, 0.004)
        v.co.x *= lobe; v.co.y *= lobe
    st = cyl(name + '_stem', 0.0018, 0.018, (loc[0], loc[1], loc[2] + 0.064), flat((0.27, 0.17, 0.08), 0.8, 'stem'), verts=6)
    st.rotation_euler = (R(rnd.uniform(-25, 25)), R(rnd.uniform(-25, 25)), 0)
    bpy.context.view_layer.update()
    return take(o, 'apple', [st])


def pen(m, name, loc, rot, seed=0):
    """A ballpoint, 0.14 m: printed navy barrel, chrome tip cone and click button, a clip. Built along +Z from its tip."""
    lob = atlas('lobby', rough=0.35)
    x, y, z = loc
    barrel = lathe(name, [(0.0035, 0.012), (0.0048, 0.03), (0.0048, 0.12), (0.0042, 0.128)], lob, (0, 0, 0), segs=12, rect=L('pen-barrel'))
    tip = lathe(name + '_tip', [(0.0, 0.0), (0.0008, 0.0015), (0.0035, 0.012)], m['chrome'], (0, 0, 0), segs=10, caps=False)
    btn = lathe(name + '_btn', [(0.003, 0.128), (0.003, 0.138), (0.0, 0.14)], m['chrome'], (0, 0, 0), segs=10, caps=False)
    clip = box(name + '_clip', (0.0025, 0.0016, 0.045), (0, 0.0055, 0.105), m['chrome'])
    for p in (tip, btn, clip):
        p.parent = barrel
    barrel.location = loc; barrel.rotation_euler = rot
    bpy.context.view_layer.update()
    return take(barrel, 'pen')


def pen_cup(m, loc, n=4, seed=1):
    """A brushed steel pen cup (thin wall, open) with ballpoints standing in it, leaning on the rim."""
    x, y, z = loc
    lathe('pen_cup', [(0.0, 0.0), (0.032, 0.0), (0.032, 0.095), (0.0295, 0.095), (0.0295, 0.004), (0.0, 0.004)], m['brushed'], loc, segs=24)
    rnd = random.Random(seed)
    for k in range(n):
        a = k * 2.4 + rnd.uniform(-0.3, 0.3); lean = R(rnd.uniform(9, 15))
        pen(m, f'cup_pen{k}', (x + math.cos(a) * 0.012, y + math.sin(a) * 0.012, z + 0.005), (lean * math.sin(a) * -1, lean * math.cos(a), rnd.uniform(0, 6)))


def encoder(m, loc, lob):
    """Key-card encoder: a black wedge with a top slot, status LED and a card half in it."""
    x, y, z = loc
    b = box('enc_body', (0.12, 0.17, 0.065), (x, y, z + 0.0325), m['black'], bevel=0.012); smooth(b)
    box('enc_slot', (0.064, 0.004, 0.006), (x, y - 0.02, z + 0.064), flat((0.0, 0.0, 0.0), 0.9, 'slot_dark'))
    box('enc_led', (0.008, 0.004, 0.004), (x + 0.04, y - 0.086, z + 0.05), flat((0.1, 0.9, 0.3), 0.5, 'led_green'))
    carton('enc_card', 0.054, 0.0008, 0.06, L('keycard'), lob, (x, y - 0.02, z + 0.04))


def desk_gear(m, lob, T):
    """What every pod has: the encoder, receipt printer and the guest's card terminal (the pod model only has its
    monitor)."""
    encoder(m, (0.35, 0.12, T), lob)
    desk.receipt_printer(m, (0.58, 0.16, T), receipt=(L('receipt'), atlas('lobby', rough=0.6), carton))
    desk.card_terminal(m, (0.42, -0.25, T))


def desk_items(m):
    """Dana's pod (origin at the pod's floor center, top at 1.08; guests at -Y): the encoder with a card in it, the
    receipt printer, the card terminal, a call bell, a bowl of apples, the Wi-Fi tent card, a registration card with a
    pen on it, key-card sleeves and blank cards, ballpoints in a cup, a potted succulent, her mug, a stapler and a
    sticky note. Pens, apples, the mug, the stapler and the cards can be picked up (take_*)."""
    T = 1.08
    lob = atlas('lobby', rough=0.6)
    desk_gear(m, lob, T)
    bell(m, (0.62, -0.3, T))
    lathe('apple_bowl', [(0.0, 0.0), (0.06, 0.0), (0.13, 0.06), (0.135, 0.065), (0.125, 0.066), (0.055, 0.008), (0.0, 0.008)], m['ceramic'], (-0.36, -0.27, T), segs=36, caps=False)
    for n, (dx, dy, dz, col) in enumerate(((-0.045, -0.025, 0.008, (0.62, 0.08, 0.06)), (0.045, -0.005, 0.009, (0.55, 0.72, 0.16)), (0.0, 0.05, 0.01, (0.7, 0.12, 0.07)),
                                           (-0.005, 0.0, 0.056, (0.58, 0.74, 0.18)), (0.055, -0.06, 0.02, (0.65, 0.06, 0.05)))):
        apple(f'apple{n}', (-0.36 + dx, -0.27 + dy, T + dz), col, n, rot=(R(10 * (n % 3 - 1)), R(8 * (n % 2)), n * 1.3))
    tent('tent_wifi', L('tent-wifi'), lob, (-0.02, -0.35, T), w=0.15, h=0.1)
    rc = carton('reg_card', 0.1, 0.135, 0.0006, L('reg-card'), lob, (0.2, -0.3, T), (0, 0, R(-8)), side_rect=(L('reg-card')[0],) * 2 + (L('reg-card')[0] + 0.001,) * 2, top_rect=L('reg-card'))
    take(rc, 'registration card')
    pen(m, 'reg_pen', (0.17, -0.34, T + 0.0055), (0, R(90), R(30)))
    rnd = random.Random(4)
    for k in range(6):
        carton('sleeve', 0.075, 0.105, 0.0012, L('key-sleeve'), lob, (0.12 + rnd.uniform(-0.003, 0.003), 0.26, T + k * 0.0013), (0, 0, R(rnd.uniform(-3, 3))), side_rect=(L('key-sleeve')[0],) * 2 + (L('key-sleeve')[0] + 0.001,) * 2, top_rect=L('key-sleeve'))
    for k in range(4):
        c = carton('card', 0.054, 0.086, 0.0008, L('keycard'), lob, (0.23 + k * 0.012, 0.3, T + k * 0.0009), (0, 0, R(90 + k * 6)), side_rect=(L('keycard')[0],) * 2 + (L('keycard')[0] + 0.001,) * 2, top_rect=L('keycard'))
        if k == 3: take(c, 'key card')
    pen_cup(m, (-0.62, -0.25, T))
    cyl('pot', 0.045, 0.075, (0.08, -0.06, T + 0.0375), flat((0.62, 0.6, 0.57), 0.9, 'concrete_pot'), verts=24, bevel=0.004)
    cyl('soil', 0.04, 0.004, (0.08, -0.06, T + 0.072), flat((0.12, 0.08, 0.05), 1.0, 'soil'), verts=20)
    for k in range(14):
        a = k * 2.4; rr = 0.006 + 0.0022 * k; tilt = 20 + 4 * k
        bpy.ops.mesh.primitive_cone_add(radius1=0.011, radius2=0.002, depth=0.04 - 0.001 * k, vertices=8,
                                        location=(0.08 + math.cos(a) * rr, -0.06 + math.sin(a) * rr, T + 0.084), rotation=(0, R(min(tilt, 75)), a))
        lf = bpy.context.object; lf.scale = (1, 0.45, 1); lf.data.materials.append(flat((0.36, 0.52, 0.42), 0.6, 'succulent')); lf.data.shade_smooth()
    mug = lathe('mug', [(0.0, 0.0), (0.038, 0.0), (0.04, 0.005), (0.04, 0.095), (0.037, 0.095), (0.035, 0.012), (0.0, 0.012)], flat((0.1, 0.17, 0.33), 0.15, 'mug_navy'), (-0.56, 0.22, T), segs=28, caps=False)
    cof = cyl('mug_coffee', 0.035, 0.002, (-0.56, 0.22, T + 0.07), flat((0.08, 0.04, 0.02), 0.1, 'coffee_surface'), verts=20)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.025, minor_radius=0.006, location=(-0.6, 0.22, T + 0.05), rotation=(R(90), 0, R(90)))
    h = bpy.context.object; h.scale = (1, 1, 1.25); h.data.materials.append(flat((0.1, 0.17, 0.33), 0.15, 'mug_navy'))
    bpy.context.view_layer.update(); take(mug, 'mug', [cof, h])
    sb = box('stapler_base', (0.04, 0.15, 0.012), (0.56, 0.32, T + 0.006), m['black'], bevel=0.004)
    sa = box('stapler_arm', (0.036, 0.14, 0.022), (0.56, 0.315, T + 0.026), m['black'], bevel=0.008); sa.rotation_euler = (R(2), 0, 0)
    bpy.context.view_layer.update(); take(sb, 'stapler', [sa])
    # her keyboard and mouse, staff side in front of the monitor (affords.js: where hands go, what a key sounds like)
    keyboard(atlas('print'), (-0.25, 0.27, T), R(183))   # legends toward her (staff at +Y)
    mouse(m, (0.02, 0.28, T + 0.003), R(174))
    carton('sticky', 0.06, 0.06, 0.0006, L('sticky'), lob, (0.0, 0.05, T), (0, 0, R(12)), side_rect=(L('sticky')[0],) * 2 + (L('sticky')[0] + 0.001,) * 2, top_rect=L('sticky'))


def desk_closed(m):
    """The unattended pod: its encoder, receipt printer and card terminal, a 'please see next agent' tent, ballpoints
    in a cup, a stack of registration cards and the desk phone (handset down, a lit line button)."""
    T = 1.08
    lob = atlas('lobby', rough=0.6)
    desk_gear(m, lob, T)
    tent('tent_next', L('next-agent'), lob, (0.0, -0.33, T), w=0.2, h=0.08)
    pen_cup(m, (-0.62, -0.25, T), n=3, seed=5)
    for k in range(12):
        carton('reg_stack', 0.1, 0.135, 0.0006, L('reg-card'), lob, (-0.1 + k * 0.0004, 0.28, T + k * 0.0007), (0, 0, R(3)), side_rect=(L('reg-card')[0],) * 2 + (L('reg-card')[0] + 0.001,) * 2, top_rect=L('reg-card'))
    desk.desk_phone(m, (0.1, 0.2, T))


def tv_remote(m):
    """A hotel TV remote, 0.18 m: a rounded black body with a printed button face (power, number pad, volume and
    channel rockers, arrows). Origin under its middle, the face up, the IR end (power) toward +Y."""
    body = box('remote', (0.048, 0.18, 0.018), (0, 0, 0.009), m['black'], bevel=0.008, segments=4); smooth(body)
    # rotated -90 about X, the card's height runs +Y from where it starts: start at the bottom end
    carton('remote_face', 0.04, 0.0005, 0.165, L('remote-face'), atlas('lobby', rough=0.45), (0, -0.0825, 0.0182), (R(-90), 0, 0))
    box('ir_window', (0.02, 0.004, 0.008), (0, 0.0905, 0.009), flat((0.05, 0.0, 0.0), 0.05, 'ir_red'))   # the power end points at the TV


def laser_mfp(m, loc):
    """Office laser multifunction, 0.42 x 0.4 x 0.36 m: light-grey body with a dark scanner lid and document feeder
    (an original waiting in it), an output bay cut into the body with printed sheets, an angled touch panel, two paper
    cassettes with finger pulls, side vents and a power LED. loc is the middle of its footprint on the desk."""
    from common import carve
    x, y, z = loc
    grey = material('printer_gray', color=(0.8, 0.8, 0.78), roughness=0.45) if 'printer_gray' not in bpy.data.materials else bpy.data.materials['printer_gray']
    dark = flat((0.09, 0.09, 0.1), 0.5, 'printer_dark')
    body = box('mfp_body', (0.42, 0.4, 0.26), (x, y, z + 0.13), grey, bevel=0.012)
    carve(body, box('mfp_bay', (0.34, 0.36, 0.07), (x, y - 0.05, z + 0.225), None))           # the output bay
    box('mfp_bay_floor', (0.33, 0.34, 0.004), (x, y - 0.05, z + 0.19), dark)
    for k in range(4):
        box('mfp_sheet', (0.216, 0.28, 0.0012), (x + 0.01 * (k % 2), y - 0.04, z + 0.193 + k * 0.0013), flat((0.97, 0.97, 0.96), 0.7, 'paper')).rotation_euler = (0, 0, R(k * 1.5 - 2))
    box('mfp_scanner', (0.42, 0.4, 0.06), (x, y, z + 0.29), grey, bevel=0.01)
    box('mfp_lid', (0.4, 0.38, 0.022), (x, y + 0.005, z + 0.331), dark, bevel=0.006)
    box('mfp_adf', (0.3, 0.16, 0.035), (x - 0.02, y + 0.08, z + 0.36), dark, bevel=0.008)
    box('mfp_adf_tray', (0.24, 0.2, 0.006), (x - 0.02, y - 0.05, z + 0.352), dark).rotation_euler = (R(-8), 0, 0)
    box('mfp_original', (0.216, 0.18, 0.0012), (x - 0.02, y - 0.05, z + 0.357), flat((0.97, 0.97, 0.96), 0.7, 'paper')).rotation_euler = (R(-8), 0, 0)
    panel = box('mfp_panel', (0.16, 0.08, 0.018), (x + 0.12, y - 0.19, z + 0.3), dark, bevel=0.005); panel.rotation_euler = (R(35), 0, 0)
    sc = box('mfp_screen', (0.1, 0.05, 0.002), (0, 0, 0.0095), flat((0.1, 0.35, 0.7), 0.15, 'mfp_lcd')); sc.parent = panel
    sc.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (0.2, 0.45, 0.9, 1)
    sc.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.5
    for k in range(2):                         # paper cassettes
        zc = z + 0.035 + k * 0.07
        box('mfp_seam', (0.4, 0.003, 0.004), (x, y - 0.2, zc + 0.033), dark)
        box('mfp_pull', (0.1, 0.006, 0.014), (x, y - 0.2, zc), dark, bevel=0.004)
    for k in range(7):                         # side vents
        box('mfp_vent', (0.003, 0.18, 0.006), (x + 0.211, y + 0.02, z + 0.06 + k * 0.016), dark)
    box('mfp_power', (0.01, 0.004, 0.01), (x + 0.18, y - 0.2, z + 0.24), flat((0.1, 0.9, 0.3), 0.5, 'led_green'))


def business_center(m):
    """Open business center counter, 1.9 m: oak top on a white base; two 24-inch monitors on stands (one at the sign-in
    screen, one with a boarding pass), keyboards with keycaps and legends, mice on pads, a laser printer with paper,
    a hotel notepad and pen, the power grommet with plugs."""
    W, D = 1.9, 0.65
    top = box('top', (W, D, 0.035), (0, 0, 0.745), m['oak'], bevel=0.003); uv_box(top, 0.8)
    for x in (-W / 2 + 0.02, W / 2 - 0.02):
        box('panel', (0.035, D - 0.04, 0.73), (x, 0, 0.365), m['white_paint'])
    box('modesty', (W - 0.06, 0.02, 0.45), (0, D / 2 - 0.04, 0.5), m['white_paint'])
    pr = atlas('print'); scr = atlas('print', emit=1.6, rough=0.15, name='screen_lit')
    for i, (x, screen) in enumerate(((-0.55, 'screen-login'), (0.15, 'screen-boarding'))):
        monitor(m, scr, screen, (x, 0.14, 0.7625), R(-4 + i * 7))
        keyboard(pr, (x - 0.02, -0.12, 0.7625), R(2 - i * 4))
        box('pad', (0.24, 0.2, 0.003), (x + 0.3, -0.12, 0.764), m['charcoal'], bevel=0.002)
        mouse(m, (x + 0.3, -0.12, 0.7655), R(-8 + i * 14))
    # printer
    laser_mfp(m, (0.7, 0.08, 0.765))
    box('panel_lcd', (0.07, 0.004, 0.035), (0.6, -0.112, 0.97), m['lit_white'])
    box('panel_btn', (0.012, 0.004, 0.012), (0.66, -0.112, 0.97), m['led_blue'])
    # notepad, pen, grommet with two plugs
    carton('notepad', 0.15, 0.002, 0.2, Q('notepad'), pr, (-0.76, -0.28, 0.7635), (R(-90), 0, R(12)))
    box('notepad_pad', (0.15, 0.2, 0.008), (-0.76 - 0.1 * math.sin(R(12)), -0.18 + 0.0 , 0.7585), flat((0.97, 0.97, 0.95), 0.8, 'paper')).rotation_euler = (0, 0, R(12))
    cyl('pen', 0.0045, 0.14, (-0.68, -0.2, 0.768), m['black'], verts=10, rotation=(0, R(90), R(30)))
    cyl('grommet', 0.03, 0.006, (-0.2, 0.25, 0.765), m['black'], verts=16)


def monitor(m, scr, screen, loc, yaw):
    x, y, z = loc
    parts = [box('mon_panel', (0.56, 0.018, 0.335), (0, 0, 0.32), m['black'], bevel=0.004),
             box('mon_back', (0.42, 0.03, 0.24), (0, 0.022, 0.31), m['black'], bevel=0.02, segments=4),
             carton('mon_screen', 0.545, 0.001, 0.307, Q(screen), scr, (0, -0.0095, 0.32 - 0.1535)),
             box('mon_chin_logo', (0.03, 0.001, 0.006), (0, -0.0096, 0.163), m['steel']),
             box('mon_neck', (0.05, 0.03, 0.22), (0, 0.06, 0.13), m['steel']),
             box('mon_base', (0.24, 0.18, 0.012), (0, 0.04, 0.006), m['steel'], bevel=0.004)]
    smooth(parts[1])
    for p in parts:
        lx, ly, lz = p.location
        p.location = (x + lx * math.cos(yaw) - ly * math.sin(yaw), y + lx * math.sin(yaw) + ly * math.cos(yaw), z + lz)
        p.rotation_euler = (p.rotation_euler[0], p.rotation_euler[1], p.rotation_euler[2] + yaw)


ROWS = [['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Del'],
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BS'], ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
        ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'], ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift2'], ['Ctrl', 'Win', 'Alt', '', 'Alt', 'Fn', 'Ctrl']]
WIDTH = {'BS': 2, 'Tab': 1.5, '\\': 1.5, 'Caps': 1.75, 'Enter': 2.25, 'Shift': 2.25, 'Shift2': 2.75, 'Ctrl': 1.25, 'Win': 1.25, 'Alt': 1.25, '': 6.25, 'Fn': 1.25}


def keyboard(mat, loc, yaw):
    """A compact keyboard (layout mirrors labels.mjs): one mesh, every face UV-projected from above onto the drawn
    keyboard, so each keycap carries its legend."""
    U = 0.019; KW, KD = 15.4 * U, 5.6 * U
    u0, v0, u1, v1 = Q('keyboard')
    verts, faces, uvs = [], [], []

    def uv(px, py):   # keyboard-space (x right, y back) -> atlas
        return (u0 + (u1 - u0) * (px + KW / 2) / KW, v0 + (v1 - v0) * (py + KD / 2) / KD)

    def frustum(x0, y0, x1, y1, zb, zt, inset):
        b = len(verts)
        pts = [(x0, y0, zb), (x1, y0, zb), (x1, y1, zb), (x0, y1, zb), (x0 + inset, y0 + inset, zt), (x1 - inset, y0 + inset, zt), (x1 - inset, y1 - inset, zt), (x0 + inset, y1 - inset, zt)]
        verts.extend(pts)
        for f in ((4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            faces.append(tuple(b + k for k in f)); uvs.append([uv(pts[k][0], pts[k][1]) for k in f])
    frustum(-KW / 2, -KD / 2, KW / 2, KD / 2, 0.0, 0.012, 0.004)            # case, slightly wedged by the inset
    for ri, row in enumerate(ROWS):
        x = 0.0
        for k in row:
            wu = 1.1 if ri == 0 else WIDTH.get(k, 1)
            px0 = -KW / 2 + (0.2 + x) * U + 0.0007; px1 = px0 + wu * U - 0.0014
            py1 = KD / 2 - (0.2 + ri * 0.9) * U - 0.0007; py0 = py1 - 0.84 * U + 0.0014
            frustum(px0, py0, px1, py1, 0.012, 0.0205 - ri * 0.0006, 0.0016)
            x += wu
    o = mk('keyboard', verts, faces, uvs, mat)
    o.location = loc; o.rotation_euler = (R(2.5), 0, yaw)
    return o


def mouse(m, loc, yaw):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12, location=(loc[0], loc[1], loc[2]))
    o = bpy.context.object; o.name = 'mouse'; o.scale = (0.031, 0.056, 0.019); o.rotation_euler = (0, 0, yaw)
    for v in o.data.vertices:
        if v.co.z < 0: v.co.z *= 0.15
        if v.co.y > 0: v.co.x *= 1 - 0.18 * v.co.y
    o.data.materials.append(m['black']); smooth(o)
    box('wheel', (0.004, 0.014, 0.006), (loc[0] - 0.035 * math.sin(yaw), loc[1] + 0.035 * math.cos(yaw) - 0.05, loc[2] + 0.018), m['charcoal']).rotation_euler = (0, 0, yaw)


def communal_table(m):
    """Bar-height communal table, 3.2 m: light oak slab, black steel trestle legs and a stretcher, four flush pop-up
    power modules down the middle, each with two US receptacles and USB-A/USB-C ports."""
    L, D, H = 3.2, 0.9, 1.05
    top = box('top', (L, D, 0.045), (0, 0, H - 0.0225), m['oak'], bevel=0.004); uv_box(top, 0.8)
    for x in (-L / 2 + 0.3, L / 2 - 0.3):
        box('leg_post', (0.08, 0.08, H - 0.1), (x, 0, (H - 0.1) / 2 + 0.05), m['steel_black'])
        box('leg_foot', (0.08, D - 0.12, 0.05), (x, 0, 0.025), m['steel_black'])
        box('leg_head', (0.08, D - 0.12, 0.05), (x, 0, H - 0.07), m['steel_black'])
    box('stretcher', (L - 0.6, 0.06, 0.06), (0, 0, 0.32), m['steel_black'])
    for i, x in enumerate((-1.2, -0.4, 0.4, 1.2)):
        box(f'power{i}', (0.3, 0.12, 0.006), (x, 0, H + 0.003), m['brushed'], bevel=0.002, segments=2)
        box(f'power_in{i}', (0.28, 0.1, 0.002), (x, 0, H + 0.0062), m['black'])
        for k, dx in enumerate((-0.085, -0.025)):
            receptacle('rec', (x + dx, 0.0, H + 0.0072), up=True, plate=False)
        for dx, w in ((0.045, 0.014), (0.075, 0.009), (0.1, 0.009)):
            box('usb', (w, 0.006, 0.0015), (x + dx, 0, H + 0.0075), m['steel'] if w > 0.01 else m['charcoal'], bevel=0.0012, segments=2)
        box('usb_led', (0.004, 0.004, 0.001), (x + 0.12, 0, H + 0.0075), m['led_blue'])


def outlet(m):
    """Duplex wall outlet on a Decora plate, 0.3 m above the floor (origin on the floor at the wall, faces -Y)."""
    receptacle('rec', (0, 0, 0.3))


def brochure_rack(m):
    """Floor-standing literature rack: black steel frame, four tiers of clear acrylic pockets holding local brochures
    (caverns, dinner cruise, Route 66, float trips, living history, outlets, scenic byway, rewards)."""
    st = m['steel_black']
    box('base', (0.36, 0.3, 0.012), (0, 0.02, 0.006), st, bevel=0.004)
    for x in (-0.16, 0.16):
        box('upright', (0.02, 0.03, 1.42), (x, 0.08, 0.72), st)
    box('back_panel', (0.32, 0.006, 1.2), (0, 0.095, 0.8), st)
    acrylic = material('acrylic', color=(0.85, 0.9, 0.92), roughness=0.03, alpha=0.18)
    pr = atlas('print')
    covers = ['brochure-caverns', 'brochure-lake', 'brochure-66', 'brochure-float', 'brochure-village', 'brochure-outlets', 'brochure-byway', 'brochure-rewards']
    for t_ in range(4):
        z = 0.3 + t_ * 0.3
        for c in range(2):
            x = -0.075 + c * 0.15
            box('pocket_front', (0.135, 0.004, 0.11), (x, -0.02, z + 0.055), acrylic)
            box('pocket_bottom', (0.135, 0.06, 0.004), (x, 0.01, z), acrylic)
            for n in range(5):
                carton('brochure', 0.1, 0.003, 0.21, Q(covers[t_ * 2 + c]), pr, (x, 0.0 + n * 0.006, z + 0.003), (R(-14), 0, R((n - 2) * 0.6)))
    carton('header', 0.32, 0.004, 0.06, Q('brochure-rewards'), pr, (0, 0.09, 1.4))


def newspaper(m, which='news-1', loc=(0, 0, 0), yaw=0.0):
    """A broadsheet folded in half, front page up; the fold toward +Y."""
    u0, v0, u1, v1 = Q(which)
    vm = (v0 + v1) / 2
    w, d, t_ = 0.3, 0.205, 0.006
    paper = (u0 + 0.002, vm - 0.004, u0 + 0.004, vm - 0.002)
    return carton('newspaper', w, d, t_, paper, atlas('print', rough=0.85, name='newsprint'), loc, (0, 0, yaw), side_rect=paper, top_rect=(u0, vm, u1, v1))


def newspaper_single(m):
    o = newspaper(m, 'news-1')
    o.rotation_euler = (0, 0, 0)


def newspaper_stack(m):
    """Complimentary morning papers: two titles, the second fanned across the first."""
    # as left by whoever read last: the second title fanned across the first at an angle, its top copy askew
    rnd = random.Random(3)
    for k in range(5):
        newspaper(m, 'news-1', (rnd.uniform(-0.004, 0.004), rnd.uniform(-0.004, 0.004), k * 0.0062), R(rnd.uniform(-2, 2)))
    for k in range(4):
        newspaper(m, 'news-2', (0.17 + rnd.uniform(-0.004, 0.004), 0.06 + rnd.uniform(-0.004, 0.004), 0.031 + k * 0.0062), R(27 + rnd.uniform(-2, 2)))
    newspaper(m, 'news-2', (0.2, 0.09, 0.031 + 4 * 0.0062), R(38))


def coffee_cup(m):
    """A guest's half-finished takeaway coffee: printed cup, sleeve and lid."""
    takeaway_cup('cup', atlas('products'), (0, 0, 0), rot=R(30))


def phone(m):
    """A smartphone left face-up, lock screen lit, a charging cable plugged in at the bottom (cable runs to -Y)."""
    body = box('phone', (0.072, 0.15, 0.008), (0, 0, 0.004), m['black'], bevel=0.006, segments=4); smooth(body)
    carton('screen_img', 0.064, 0.0004, 0.14, Q('phone-screen'), atlas('print', emit=0.9, rough=0.1, name='phone_lit'), (0, -0.07, 0.0084), (R(-90), 0, 0))
    box('camera', (0.02, 0.02, 0.002), (0.018, 0.05, -0.0005), m['charcoal'], bevel=0.004)
    box('plug', (0.012, 0.025, 0.005), (0, -0.085, 0.004), material('cable_white', color=(0.93, 0.93, 0.92), roughness=0.4), bevel=0.002)


def area_rug(m):
    """Low-pile area rug, 3.6 x 4.4 m: gray-and-navy geometric pattern with a navy border, bound edge."""
    W, D = 3.6, 4.4
    rug = textile('rug_geo', os.path.join(LAB, 'rug.png'), normal_scale=14)
    r = box('rug', (W, D, 0.01), (0, 0, 0.005), rug, bevel=0.004, segments=2)
    apply_uv_top(r, W, D)


def entry_mat(m):
    """Walk-off entry mat, 3.0 x 1.5 m: charcoal ribbed carpet with the inn's logo, a beveled black rubber border."""
    W, D = 3.0, 1.5
    mat = textile('mat_logo', os.path.join(LAB, 'print.png'), normal_scale=40, rough=1.0)
    field = box('mat', (W - 0.08, D - 0.08, 0.008), (0, 0, 0.004), mat)
    u0, v0, u1, v1 = Q('mat-logo')
    apply_uv_top(field, W - 0.08, D - 0.08, (u0, v0, u1, v1))
    rubber = material('mat_rubber', color=(0.03, 0.03, 0.03), roughness=0.7)
    for (w, d, x, y) in ((W, 0.04, 0, -D / 2 + 0.02), (W, 0.04, 0, D / 2 - 0.02), (0.04, D, -W / 2 + 0.02, 0), (0.04, D, W / 2 - 0.02, 0)):
        box('border', (w, d, 0.006), (x, y, 0.003), rubber, bevel=0.003, segments=2)


def apply_uv_top(o, W, D, rect=(0, 0, 1, 1)):
    """Planar UVs from above over a W x D footprint into rect."""
    for mod in list(o.modifiers):
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=mod.name)
    u0, v0, u1, v1 = rect
    me = o.data; ul = me.uv_layers.active or me.uv_layers.new()
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            ul.data[li].uv = (u0 + (u1 - u0) * (co.x / W + 0.5), v0 + (v1 - v0) * (co.y / D + 0.5))


ASSETS = {
    'hotel-market-cooler': (market_cooler, dict(distance=2.4, height=1.4, target=(0, 0, 1.0), yaw=15)),
    'hotel-market-shelf': (market_shelf, dict(distance=1.9, height=1.3, target=(0, 0, 0.8), yaw=15)),
    'hotel-snack-vending': (snack_vending, dict(distance=2.6, height=1.4, target=(0, 0, 1.0), yaw=15)),
    'hotel-coffee-station': (coffee_station, dict(distance=2.6, height=1.6, target=(0.0, 0, 1.0), yaw=10)),
    'hotel-coffee-board': (coffee_board, dict(distance=3.6, height=1.6, target=(0, 0, 1.6), yaw=0)),
    'hotel-tv-remote': (tv_remote, dict(distance=0.4, height=0.3, target=(0, 0, 0.0), yaw=15)),
    'hotel-waste-cabinet': (waste_cabinet, dict(distance=1.5, height=1.5, target=(0, 0, 0.7), yaw=15)),
    'hotel-waste-bin': (waste_bin, dict(distance=1.1, height=1.1, target=(0, 0, 0.4), yaw=20)),
    'hotel-desk-items': (desk_items, dict(distance=1.3, height=1.7, target=(0, 0, 1.1), yaw=0)),
    'hotel-desk-closed': (desk_closed, dict(distance=1.3, height=1.7, target=(0, 0, 1.1), yaw=0)),
    'hotel-business-center': (business_center, dict(distance=1.9, height=1.5, target=(-0.2, 0, 0.85), yaw=10)),
    'hotel-communal-table': (communal_table, dict(distance=1.4, height=1.7, target=(-0.4, 0, 1.0), yaw=10)),
    'hotel-outlet': (outlet, dict(distance=0.35, height=0.35, target=(0, 0, 0.3), yaw=15)),
    'hotel-brochure-rack': (brochure_rack, dict(distance=1.8, height=1.3, target=(0, 0, 0.8), yaw=15)),
    'hotel-newspaper-stack': (newspaper_stack, dict(distance=1.0, height=0.6, target=(0.16, 0, 0.02), yaw=0)),
    'hotel-newspaper': (newspaper_single, dict(distance=0.6, height=0.45, target=(0, 0, 0.0), yaw=0)),
    'hotel-coffee-cup': (coffee_cup, dict(distance=0.45, height=0.2, target=(0, 0, 0.06), yaw=10)),
    'hotel-phone': (phone, dict(distance=0.35, height=0.25, target=(0, 0, 0.0), yaw=10)),
    'hotel-area-rug': (area_rug, dict(distance=5.0, height=3.0, target=(0, 0, 0.0), yaw=20)),
    'hotel-entry-mat': (entry_mat, dict(distance=3.2, height=2.2, target=(0, 0, 0.0), yaw=0)),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, view = ASSETS[name]
        reset()
        build(kit(mats()))
        merge()
        preview(os.path.join(SHOTS, name + '.png'), samples=24, **view)
        export(os.path.join(OUT, name + '.glb'), name)

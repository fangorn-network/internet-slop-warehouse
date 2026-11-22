# SPDX-License-Identifier: CC0-1.0
# Hotel furniture and fixtures, one GLB each. Origin at floor center; front faces Blender -Y (three.js +Z).
#   blender -b --python projects/roadside-inn/blender/furniture.py -- [asset ...]     (default: all)
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, preview, mats, carve, empty, parent_keep

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'assets')
SHOTS = os.path.join(HERE, '..', '..', '..', 'artifacts', 'roadside-inn', 'blender')
R = math.radians


def headboard(m):
    """Wall-mounted walnut panel with a channel-tufted navy upholstered center and two reading sconces."""
    box('panel', (3.6, 0.04, 1.35), (0, 0.0, 0.5 + 0.675), m['walnut'], bevel=0.006)
    for i in range(4):                                         # horizontal channels
        c = box(f'channel{i}', (2.1, 0.07, 0.19), (0, -0.05, 0.62 + i * 0.195), m['navy_fabric'], bevel=0.035, segments=4)
        smooth(c)
    for x in (-1.25, 1.25):
        box('sconce_plate', (0.1, 0.02, 0.16), (x, -0.03, 1.33), m['steel'], bevel=0.004)
        arm = box('sconce_head', (0.16, 0.1, 0.08), (x, -0.09, 1.33), m['steel'], bevel=0.01)
        box('sconce_led', (0.12, 0.06, 0.005), (x, -0.1, 1.288), m['led'])


def nightstand(m):
    w, d, h = 0.52, 0.42, 0.56
    body = box('body', (w, d, h - 0.06), (0, 0, 0.06 + (h - 0.06) / 2), m['walnut'], bevel=0.006)
    uv_box(body, 1)
    carve(body, box('shelf_cut', (w - 0.06, d, 0.16), (0, -0.04, 0.17), None))
    box('drawer_gap', (w - 0.04, 0.004, 0.004), (0, -d / 2 - 0.001, 0.4), m['charcoal'])
    box('pull', (0.16, 0.02, 0.012), (0, -d / 2 - 0.012, 0.47), m['steel'], bevel=0.004)
    for x in (-w / 2 + 0.03, w / 2 - 0.03):
        for y in (-d / 2 + 0.03, d / 2 - 0.03):
            box('foot', (0.03, 0.03, 0.06), (x, y, 0.03), m['black'])


def table_lamp(m):
    cyl('base', 0.085, 0.03, (0, 0, 0.015), m['charcoal'], bevel=0.005)
    cyl('body', 0.07, 0.24, (0, 0, 0.15), m['ceramic'], r2=0.045)
    cyl('stem', 0.008, 0.16, (0, 0, 0.35), m['steel'])
    shade = cyl('shade', 0.19, 0.24, (0, 0, 0.47), m['lampshade'], verts=48, r2=0.15)
    import bmesh                                               # open the top and bottom caps
    bm = bmesh.new(); bm.from_mesh(shade.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES_ONLY')
    bm.to_mesh(shade.data); bm.free()
    mod = shade.modifiers.new('solid', 'SOLIDIFY'); mod.thickness = 0.004
    cyl('bulb', 0.03, 0.06, (0, 0, 0.44), m['led'])


def credenza_tv(m):
    """2.4 m walnut credenza, walnut wall panel behind, 55-inch TV (its 'screen' material is swapped in game)."""
    L = 2.4
    top = box('top', (L, 0.5, 0.035), (0, 0, 0.755), m['walnut'], bevel=0.006)
    body = box('body', (L - 0.04, 0.46, 0.6), (0, 0.01, 0.43), m['walnut'], bevel=0.004)
    uv_box(top, 1); uv_box(body, 1)
    for i in range(3):
        x = -L / 3 + i * L / 3
        box(f'gap{i}', (0.004, 0.004, 0.56), (x + L / 6, -0.222, 0.43), m['charcoal'])
        box(f'pull{i}', (0.18, 0.018, 0.012), (x, -0.235, 0.66), m['steel'], bevel=0.004)
    for x in (-L / 2 + 0.06, L / 2 - 0.06):
        for y in (-0.18, 0.2):
            cyl('leg', 0.015, 0.13, (x, y, 0.065), m['black'], verts=12)
    box('wall_panel', (L + 0.2, 0.025, 0.95), (0, 0.24, 0.8 + 0.475), m['walnut_dark'], bevel=0.004)
    tv_w, tv_h = 1.24, 0.71
    box('tv_body', (tv_w + 0.02, 0.035, tv_h + 0.02), (0, 0.2, 1.25), m['black'], bevel=0.006)
    s = box('tv_screen', (tv_w, 0.002, tv_h), (0, 0.181, 1.25), m['screen'])


def desk(m):
    box('top', (1.3, 0.6, 0.035), (0, 0, 0.74), m['walnut'], bevel=0.005)
    ped = box('pedestal', (0.42, 0.56, 0.68), (0.42, 0, 0.38), m['walnut'], bevel=0.004)
    uv_box(ped, 1)
    for z in (0.5, 0.25):
        box('gap', (0.4, 0.004, 0.004), (0.42, -0.282, z + 0.12), m['charcoal'])
        box('pull', (0.14, 0.018, 0.012), (0.42, -0.29, z + 0.2), m['steel'], bevel=0.004)
    for y in (-0.26, 0.26):                                   # steel sled leg
        box('leg', (0.03, 0.03, 0.72), (-0.6, y, 0.36), m['charcoal'], bevel=0.004)
    box('foot', (0.03, 0.55, 0.03), (-0.6, 0, 0.015), m['charcoal'], bevel=0.004)
    box('rail', (0.03, 0.55, 0.03), (-0.6, 0, 0.705), m['charcoal'], bevel=0.004)
    box('outlet', (0.16, 0.06, 0.04), (-0.35, 0.22, 0.775), m['black'], bevel=0.006)


def closet(m):
    """Open closet with shelf, chrome rail, wooden hangers, slatted luggage bench."""
    for x in (-0.49, 0.49):
        box('side', (0.03, 0.58, 2.0), (x, 0, 1.0), m['walnut'], bevel=0.004)
    box('back', (1.0, 0.02, 2.0), (0, 0.28, 1.0), m['walnut_dark'])
    box('shelf', (0.96, 0.56, 0.025), (0, 0, 1.68), m['walnut'], bevel=0.004)
    box('cap', (1.02, 0.6, 0.03), (0, 0, 2.0), m['walnut'], bevel=0.004)
    cyl('rail', 0.012, 0.95, (0, 0, 1.55), m['chrome'], rotation=(0, R(90), 0))
    for i, x in enumerate((-0.3, -0.12, 0.08, 0.28)):
        h = box(f'hanger{i}', (0.012, 0.4, 0.05), (x, 0, 1.47), m['walnut'], bevel=0.006)
        cyl(f'hook{i}', 0.003, 0.08, (x, 0, 1.53), m['chrome'], verts=8)
    for j in range(6):
        box(f'slat{j}', (0.95, 0.07, 0.02), (0, -0.22 + j * 0.088, 0.46), m['walnut'], bevel=0.004)
    for x in (-0.44, 0.44):
        for y in (-0.24, 0.24):
            box('bench_leg', (0.03, 0.03, 0.45), (x, y, 0.225), m['charcoal'])
    box('iron_board', (0.03, 0.32, 1.1), (0.45, 0.2, 0.62), m['white_paint'], bevel=0.01)


def microfridge(m):
    """Walnut surround, black mini fridge (door on a hinge pivot named fridge_door), stainless microwave."""
    for x in (-0.3, 0.3):
        box('side', (0.03, 0.56, 1.55), (x, 0, 0.775), m['walnut'], bevel=0.004)
    box('top', (0.63, 0.58, 0.03), (0, 0, 1.55), m['walnut'], bevel=0.004)
    box('back', (0.6, 0.02, 1.55), (0, 0.27, 0.775), m['walnut_dark'])
    box('fridge', (0.5, 0.5, 0.82), (0, 0.01, 0.43), m['black'], bevel=0.01)
    hinge = empty('fridge_door', (-0.25, -0.25, 0.43))
    door = box('door', (0.5, 0.035, 0.82), (0, -0.258, 0.43), m['charcoal'], bevel=0.012)
    handle = box('handle', (0.02, 0.03, 0.36), (0.21, -0.29, 0.55), m['steel'], bevel=0.006)
    parent_keep(door, hinge); parent_keep(handle, hinge)
    mw = box('microwave', (0.52, 0.38, 0.3), (0, 0.04, 1.02), m['steel'], bevel=0.008)
    box('mw_window', (0.32, 0.005, 0.2), (-0.07, -0.152, 1.02), m['glass_dark'], bevel=0.004)
    box('mw_panel', (0.1, 0.005, 0.24), (0.18, -0.152, 1.02), m['black'])
    for r in range(4):
        for c in range(3):
            box('key', (0.02, 0.004, 0.014), (0.155 + c * 0.025, -0.156, 0.97 + r * 0.025), m['steel'])
    box('mw_display', (0.07, 0.004, 0.02), (0.18, -0.156, 1.105), m['led'])


def ptac(m):
    """Packaged terminal air conditioner: beige housing, real louver fins on top, control panel."""
    box('housing', (1.06, 0.26, 0.42), (0, 0, 0.31), m['beige_plastic'], bevel=0.012)
    for i in range(14):
        fin = box(f'fin{i}', (0.66, 0.08, 0.006), (-0.15, -0.06, 0.505 + 0.0), m['beige_plastic'])
        fin.location.y = -0.11 + i * 0.016; fin.rotation_euler = (R(35), 0, 0)
    box('front_grille', (0.68, 0.01, 0.2), (-0.15, -0.131, 0.27), m['charcoal'])
    for i in range(10):
        box(f'slot{i}', (0.66, 0.012, 0.008), (-0.15, -0.137, 0.185 + i * 0.018), m['beige_plastic'])
    box('panel', (0.22, 0.01, 0.16), (0.38, -0.131, 0.38), m['white_paint'], bevel=0.004)
    for i, c in enumerate(('led', 'charcoal', 'charcoal')):
        box(f'btn{i}', (0.03, 0.008, 0.018), (0.32 + i * 0.05, -0.138, 0.4), m[c])


def vanity(m):
    """Floating quartz vanity with an undermount basin, chrome single-lever faucet, backlit mirror."""
    top = box('counter', (1.4, 0.56, 0.12), (0, 0, 0.84), m['quartz'], bevel=0.008)
    carve(top, box('basin_cut', (0.48, 0.34, 0.2), (0, -0.02, 0.84), None, bevel=0.06, segments=4))
    box('basin', (0.5, 0.36, 0.01), (0, -0.02, 0.785), m['ceramic'])
    cyl('faucet_base', 0.025, 0.04, (0, 0.2, 0.92), m['chrome'])
    cyl('faucet_column', 0.016, 0.2, (0, 0.2, 1.02), m['chrome'])
    box('spout', (0.03, 0.16, 0.025), (0, 0.13, 1.11), m['chrome'], bevel=0.01)
    box('lever', (0.012, 0.07, 0.012), (0.03, 0.22, 1.13), m['chrome'], bevel=0.004)
    box('mirror_glow', (1.32, 0.012, 1.02), (0, 0.27, 1.62), m['led'])
    box('mirror', (1.2, 0.01, 0.9), (0, 0.26, 1.62), m['mirror'])
    for i, (x, c) in enumerate(((-0.52, 'ceramic'), (-0.45, 'ceramic'), (-0.38, 'ceramic'))):
        cyl(f'bottle{i}', 0.018, 0.1, (x, -0.08, 0.95), material(f'bottle{i}', color=(0.78, 0.86 - i * 0.04, 0.72), roughness=0.3))
    t = box('towel', (0.28, 0.14, 0.09), (0.5, -0.05, 0.945), material('towel', color=(0.97, 0.97, 0.96), roughness=1), bevel=0.04, segments=4)
    smooth(t)


def toilet(m):
    c = m['ceramic']
    b = cyl('pedestal', 0.15, 0.36, (0, 0.05, 0.18), c, r2=0.12); b.scale = (1, 1.25, 1)
    bowl = cyl('bowl', 0.2, 0.1, (0, -0.02, 0.37), c, verts=48); bowl.scale = (1, 1.3, 1)
    carve(bowl, cyl('bowl_cut', 0.16, 0.2, (0, -0.03, 0.43), None, verts=48))
    seat = cyl('seat', 0.2, 0.025, (0, -0.02, 0.43), c, verts=48); seat.scale = (1, 1.32, 1)
    carve(seat, cyl('seat_cut', 0.12, 0.1, (0, -0.04, 0.43), None, verts=48))
    box('tank', (0.44, 0.19, 0.36), (0, 0.24, 0.58), c, bevel=0.03, segments=4)
    box('tank_lid', (0.46, 0.21, 0.03), (0, 0.24, 0.775), c, bevel=0.01)
    box('lever', (0.06, 0.02, 0.015), (-0.17, 0.13, 0.7), m['chrome'], bevel=0.004)


def tub_shower(m):
    """Alcove tub (length along X), chrome shower set, curved rod and a softly folded curtain on the room side."""
    tub = box('tub', (1.55, 0.78, 0.5), (0, 0, 0.25), m['ceramic'], bevel=0.02)
    carve(tub, box('tub_cut', (1.4, 0.62, 0.5), (0, 0.0, 0.52), None, bevel=0.08, segments=4))
    cyl('drain', 0.03, 0.005, (-0.62, 0, 0.115), m['chrome'])
    cyl('spout', 0.02, 0.14, (-0.75, 0.33, 0.62), m['chrome'], rotation=(R(90), 0, 0))
    cyl('valve', 0.06, 0.02, (-0.75, 0.38, 1.0), m['chrome'], rotation=(R(90), 0, 0))
    cyl('riser', 0.012, 0.9, (-0.62, 0.38, 1.45), m['chrome'])
    cyl('head', 0.06, 0.03, (-0.62, 0.32, 1.92), m['chrome'], rotation=(R(70), 0, 0))
    for x in (-0.3, 0.3):
        cyl('grab_bar', 0.016, 0.6, (x, 0.37, 1.0), m['chrome'], rotation=(0, R(90), 0))
    # curved rod: a 1 in tube on an arc along the open front, flanged to the two end walls (x = +-0.775) at 5 cm
    # inside the tub's front edge, bowing 15 cm out at the middle (the "crescent" rod every reference shows)
    zr, ye, yc, xe = 1.95, -0.30, -0.45, 0.775
    c = (xe ** 2 + ye ** 2 - yc ** 2) / (2 * (ye - yc))           # arc centre (0, c) through both ends and the bow
    Rr = c - yc
    a0 = math.atan2(ye - c, xe)
    arc = lambda a: (Rr * math.cos(a), c + Rr * math.sin(a))
    angs = [-(math.pi / 2) + (a0 + math.pi / 2) * (1 - 2 * i / 48) for i in range(49)]   # from +x end through -y to -x end
    pts = [arc(a) for a in angs]
    curve = bpy.data.curves.new('rod', 'CURVE'); curve.dimensions = '3D'; curve.bevel_depth = 0.0125; curve.bevel_resolution = 3
    sp = curve.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts):
        p.co = (x, y, zr, 1)
    rod = bpy.data.objects.new('rod', curve); bpy.context.scene.collection.objects.link(rod); curve.materials.append(m['chrome'])
    bpy.context.view_layer.objects.active = rod
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    rod.select_set(True); bpy.ops.object.convert(target='MESH'); smooth(rod, 50)
    for sx in (-1, 1):                                            # wall flanges, 7 cm, on the end walls
        cyl('rod_flange', 0.035, 0.012, (sx * (xe - 0.006), ye, zr), m['chrome'], verts=32, bevel=0.003, rotation=(0, R(90), 0))
    # the curtain: pushed to the +x end, gathered in deep folds along the arc, hanging from C-rings on the rod; hem
    # stops above the tub rim (a liner would hang inside)
    cur_m = material('curtain', color=(0.95, 0.95, 0.94), roughness=0.9,
                     maps={'normal': 'acg-room-voile-normal.jpg', 'roughness': 'acg-room-voile-roughness.jpg'}, uv_scale=6)
    nring, s_end = 10, 0.62                                       # 10 rings over the first 0.62 m of arc from the wall
    a_of = lambda s: -(math.pi / 2) + (a0 + math.pi / 2) - s / Rr  # arc angle at arc length s from the +x end
    ztop, zhem = zr - 0.034, 0.56                              # top hem threaded on the ring wire
    rows, cols = 22, nring * 6
    verts, faces, uvs = [], [], []
    for i in range(rows + 1):
        v = i / rows; z = ztop - (ztop - zhem) * v
        for j in range(cols + 1):
            t = j / cols; s = 0.015 + t * s_end
            a = a_of(s); x, y = arc(a)
            k = int(t * nring); f = t * nring - k
            amp = 0.045 * math.sin(math.pi * f) * (1 if k % 2 == 0 else -1) * (0.8 + 0.2 * v) * (0.85 + 0.15 * math.sin(k * 2.1))
            amp += 0.015 * v * math.sin(t * 9 + 1.3)               # the free part sways off the ring line
            nx, ny = math.cos(a), math.sin(a)                     # outward normal of the arc
            verts.append((x + nx * amp, y + ny * amp, z + (0.006 * math.sin(j * 1.7) if i == rows else 0)))
            uvs.append((t * 1.8, 1 - v))
    W = cols + 1
    for i in range(rows):
        for j in range(cols):
            faces.append((i * W + j, i * W + j + 1, (i + 1) * W + j + 1, (i + 1) * W + j))
    me = bpy.data.meshes.new('curtain'); me.from_pydata(verts, [], faces); me.update()
    ul = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            ul.data[li].uv = uvs[me.loops[li].vertex_index]
    cur = bpy.data.objects.new('curtain', me); bpy.context.scene.collection.objects.link(cur); me.materials.append(cur_m)
    sol = cur.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = 0.002
    smooth(cur)
    rings = []
    for r_ in range(nring):                                       # C-rings: round the rod, through the curtain's top hem
        s = 0.015 + r_ * s_end / nring
        a = a_of(s); x, y = arc(a)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.024, minor_radius=0.0022, major_segments=20, minor_segments=6,
                                         location=(x, y, zr - 0.012), rotation=(R(90), 0, a))
        ring = bpy.context.object; ring.name = 'curtain_ring'; ring.data.materials.append(m['chrome']); rings.append(ring)
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    for r_ in rings:
        r_.select_set(True)
    bpy.context.view_layer.objects.active = rings[0]; bpy.ops.object.join()


def front_desk(m):
    """Lobby front desk, long axis X, guests on -Y side: white raised-panel front, quartz top, LED cove, work surface."""
    L = 4.6
    box('body', (L, 0.7, 1.05), (0, 0, 0.525), m['white_paint'], bevel=0.006)
    for i in range(6):
        x = -L / 2 + 0.38 + i * (L - 0.76) / 5
        box(f'panel{i}', (0.62, 0.025, 0.72), (x, -0.36, 0.52), m['white_paint'], bevel=0.012, segments=3)
    box('top', (L + 0.12, 0.88, 0.05), (0, -0.06, 1.08), m['quartz'], bevel=0.008)
    box('cove', (L, 0.02, 0.02), (0, -0.37, 0.99), m['led'])
    box('kick', (L, 0.02, 0.02), (0, -0.37, 0.03), m['led'])
    box('work', (L, 0.5, 0.78), (0, 0.6, 0.39), m['walnut'], bevel=0.004)
    for x in (-1.4, 0, 1.4):
        mon = box('monitor', (0.5, 0.03, 0.31), (x, 0.32, 1.38), m['black'], bevel=0.006); mon.rotation_euler = (R(-8), 0, 0)
        box('stand', (0.06, 0.06, 0.18), (x, 0.36, 1.18), m['charcoal'])
    box('card_reader', (0.09, 0.15, 0.05), (0.7, -0.15, 1.13), m['black'], bevel=0.01)
    bell = cyl('bell', 0.05, 0.035, (-0.6, -0.25, 1.125), m['brass'], verts=32); cyl('bell_button', 0.008, 0.02, (-0.6, -0.25, 1.15), m['brass'])



def drum_pendant(m):
    """Large drum pendant: dark fabric drum, white diffuser underneath, ceiling canopy and cable (1 m tall overall)."""
    shade = cyl('drum', 0.42, 0.32, (0, 0, 0.16), material('drum_fabric', color=(0.12, 0.11, 0.1), roughness=0.95), verts=64)
    carve(shade, cyl('drum_cut', 0.4, 0.34, (0, 0, 0.14), None, verts=64))
    cyl('diffuser', 0.4, 0.01, (0, 0, 0.02), m['led'], verts=64)
    cyl('cable', 0.004, 0.7, (0, 0, 0.67), m['black'], verts=8)
    cyl('canopy', 0.07, 0.03, (0, 0, 1.01), m['white_paint'])


def luggage_cart(m):
    """Brass bellhop cart with carpeted deck and top hanging rail."""
    deck = box('deck', (1.1, 0.6, 0.08), (0, 0, 0.24), m['brass'], bevel=0.01)
    box('carpet', (1.04, 0.54, 0.02), (0, 0, 0.29), material('cart_carpet', color=(0.45, 0.07, 0.08), roughness=1))
    for x in (-0.5, 0.5):
        cyl('post', 0.016, 1.65, (x, 0, 1.1), m['brass'])
    cyl('top_rail', 0.016, 1.0, (0, 0, 1.92), m['brass'], rotation=(0, R(90), 0))
    for x in (-0.45, 0.45):
        for y in (-0.24, 0.24):
            cyl('caster', 0.07, 0.04, (x, y, 0.08), m['black'], rotation=(R(90), 0, 0))


def lobby_sofa(m):
    """Modern track-arm sofa in beige tweed, 2.3 m, on walnut block feet (lounge photo 1)."""
    tweed = m['beige_fabric']
    for x in (-1.08, 1.08):
        a = box('arm', (0.16, 0.9, 0.62), (x, 0, 0.39), tweed, bevel=0.03, segments=4); smooth(a)
    b = box('base', (2.0, 0.9, 0.24), (0, 0, 0.2), tweed, bevel=0.02, segments=3); smooth(b)
    back = box('back', (2.0, 0.2, 0.5), (0, 0.35, 0.57), tweed, bevel=0.04, segments=4); smooth(back)
    for i, x in enumerate((-0.5, 0.5)):
        c = box(f'seat{i}', (0.98, 0.72, 0.16), (x, -0.07, 0.4), tweed, bevel=0.05, segments=5); smooth(c)
        k = box(f'back_cushion{i}', (0.96, 0.18, 0.42), (x, 0.22, 0.68), tweed, bevel=0.07, segments=5); smooth(k)
        k.rotation_euler = (math.radians(-8), 0, 0)
    for x in (-1.1, 1.1):
        for y in (-0.38, 0.38):
            box('foot', (0.05, 0.05, 0.08), (x, y, 0.04), m['walnut'])


def accent_chair(m, color):
    """Upholstered accent chair with tapered walnut legs (room corner, lobby groupings)."""
    fab = material('chair_fabric', color=color, roughness=0.95, maps={'normal': 'ph-store-cotton-normal.jpg', 'roughness': 'ph-store-cotton-roughness.jpg'}, normal_strength=0.9, uv_scale=6)
    seat = box('seat', (0.68, 0.64, 0.14), (0, -0.02, 0.44), fab, bevel=0.05, segments=5); smooth(seat)
    back = box('back', (0.7, 0.14, 0.46), (0, 0.27, 0.72), fab, bevel=0.06, segments=5); smooth(back)
    back.rotation_euler = (math.radians(-12), 0, 0)
    for x in (-0.36, 0.36):
        a = box('arm', (0.1, 0.6, 0.24), (x, 0.0, 0.58), fab, bevel=0.04, segments=4); smooth(a)
    box('apron', (0.7, 0.62, 0.08), (0, 0, 0.34), fab, bevel=0.02)
    for x in (-0.3, 0.3):
        for y in (-0.26, 0.26):
            leg = cyl('leg', 0.022, 0.32, (x, y, 0.15), m['walnut'], verts=12, r2=0.014)
            leg.rotation_euler = (math.radians(8 if y > 0 else -8), math.radians(-6 if x < 0 else 6), 0)



def breakfast_bar(m):
    """Hot breakfast bar (front -Y): chafing dishes, flip waffle maker (indicator material waffle_light), cereal and juice."""
    L = 3.4
    box('base', (L, 0.72, 0.88), (0, 0, 0.44), m['charcoal'], bevel=0.006)
    box('top', (L + 0.04, 0.78, 0.04), (0, 0, 0.9), m['quartz'], bevel=0.006)
    for i, (x, food) in enumerate(((-1.25, (0.95, 0.75, 0.2)), (-0.6, (0.45, 0.2, 0.08)))):
        box(f'chafer{i}', (0.56, 0.36, 0.14), (x, 0.05, 0.99), m['steel'], bevel=0.01)
        box(f'food{i}', (0.5, 0.3, 0.03), (x, 0.05, 1.065), material(f'food{i}', color=food, roughness=0.85))
        lid = cyl(f'lid{i}', 0.18, 0.5, (x, 0.13, 1.12), m['steel'], verts=32)
        lid.rotation_euler = (0, math.radians(90), 0); lid.scale = (0.45, 1, 1)
    box('waffle_base', (0.32, 0.32, 0.1), (0.05, 0.05, 0.97), m['black'], bevel=0.02)
    box('waffle_lid', (0.3, 0.3, 0.06), (0.05, 0.05, 1.05), m['black'], bevel=0.025)
    box('waffle_handle', (0.06, 0.24, 0.03), (0.25, 0.05, 1.06), m['black'], bevel=0.01)
    box('waffle_light', (0.03, 0.01, 0.02), (-0.08, -0.115, 0.98), material('waffle_light', color=(0.2, 1.0, 0.5), roughness=0.4))
    for k in range(6):
        cyl(f'batter{k}', 0.035, 0.06, (0.35 + (k % 3) * 0.08, -0.15 + (k // 3) * 0.08, 0.95), m['ceramic'], r2=0.03, verts=12)
    for i, cereal in enumerate(((0.7, 0.45, 0.15), (0.85, 0.65, 0.1), (0.35, 0.18, 0.08))):
        x = 0.78 + i * 0.19
        box(f'disp_base{i}', (0.17, 0.17, 0.14), (x, 0.18, 0.99), m['charcoal'], bevel=0.01)
        cyl(f'disp_tube{i}', 0.07, 0.36, (x, 0.18, 1.24), material(f'tube{i}', color=(0.85, 0.9, 0.92), roughness=0.05, alpha=0.3), verts=24)
        cyl(f'cereal{i}', 0.065, 0.24, (x, 0.18, 1.18), material(f'cereal{i}', color=cereal, roughness=0.95), verts=24)
    box('juice', (0.42, 0.34, 0.56), (1.45, 0.12, 1.2), m['steel'], bevel=0.01)
    for i, c in enumerate(((1.0, 0.45, 0.05), (0.4, 0.05, 0.3))):
        box(f'tank{i}', (0.16, 0.01, 0.28), (1.36 + i * 0.18, -0.055, 1.3), material(f'juice{i}', color=c, roughness=0.15, alpha=0.85))
    for k in range(10):
        cyl(f'plate{k}', 0.13, 0.012, (-1.55, -0.18, 0.93 + k * 0.014), m['ceramic'], verts=24)


def ice_machine(m):
    box('bin', (0.6, 0.62, 1.1), (0, 0, 0.55), m['steel'], bevel=0.01)
    box('head', (0.6, 0.66, 0.5), (0, 0, 1.35), m['steel'], bevel=0.01)
    box('dispense_bay', (0.34, 0.12, 0.3), (0, -0.28, 0.75), m['charcoal'], bevel=0.01)
    box('chute', (0.1, 0.06, 0.06), (0, -0.28, 0.92), m['black'])
    box('grate', (0.32, 0.1, 0.02), (0, -0.28, 0.61), m['steel'])
    box('push', (0.12, 0.02, 0.06), (0, -0.335, 1.0), m['black'], bevel=0.01)
    for i in range(12):
        box(f'vent{i}', (0.5, 0.01, 0.012), (0, -0.335, 1.18 + i * 0.022), m['charcoal'])
    box('badge', (0.24, 0.005, 0.07), (0, -0.333, 1.5), material('ice_badge', color=(0.07, 0.25, 0.6), roughness=0.4))


def ice_bucket(m):
    b = cyl('bucket', 0.12, 0.22, (0, 0, 0.11), m['steel'], r2=0.1, verts=32, bevel=0.004)
    carve(b, cyl('bucket_cut', 0.11, 0.22, (0, 0, 0.13), None, r2=0.09, verts=32))
    cyl('liner', 0.112, 0.01, (0, 0, 0.215), material('liner', color=(0.9, 0.92, 0.95), roughness=0.3, alpha=0.6), verts=32)


def elevator_car(m):
    """Car interior (2.3 x 3.3, door on -Y): brushed steel walls, handrail, walnut-look floor, light panel, button panel."""
    terrazzo = material('car_terrazzo', maps={'color': 'acg-hotel-terrazzo-color.jpg', 'normal': 'acg-hotel-terrazzo-normal.jpg', 'roughness': 'acg-hotel-terrazzo-roughness.jpg'})
    brushed = material('car_brushed', metallic=1.0, maps={'color': 'acg-hotel-brushed-steel-color.jpg', 'normal': 'acg-hotel-brushed-steel-normal.jpg', 'roughness': 'acg-hotel-brushed-steel-roughness.jpg'})
    f = box('floor', (2.2, 3.2, 0.02), (0, 0, 0.0), terrazzo); uv_box(f, 0.8)
    for x in (-1.12, 1.12):
        w = box('side', (0.02, 3.2, 2.4), (x, 0, 1.2), brushed); uv_box(w, 0.6)
    w = box('rear', (2.2, 0.02, 2.4), (0, 1.62, 1.2), brushed); uv_box(w, 0.6)
    box('rear_panel', (1.6, 0.01, 1.6), (0, 1.605, 1.3), m['walnut'])
    for x in (-1.08, 1.08):
        cyl('rail', 0.02, 2.8, (x, 0, 0.92), m['steel'], rotation=(math.radians(90), 0, 0))
    cyl('rail_rear', 0.02, 2.0, (0, 1.57, 0.92), m['steel'], rotation=(0, math.radians(90), 0))
    box('ceiling', (2.2, 3.2, 0.03), (0, 0, 2.4), m['white_paint'])
    box('light', (1.6, 0.4, 0.01), (0, 0, 2.38), m['led'])
    box('front_return', (0.5, 0.02, 2.4), (0.85, -1.6, 1.2), m['steel'])
    box('front_return_l', (0.5, 0.02, 2.4), (-0.85, -1.6, 1.2), m['steel'])
    box('button_panel', (0.02, 0.22, 0.55), (1.1, -1.25, 1.15), m['charcoal'])
    for i, z in enumerate((1.0, 1.1, 1.2)):
        cyl(f'button{i}', 0.022, 0.01, (1.09, -1.25, z), m['steel'], rotation=(0, math.radians(90), 0), verts=16)


def treadmill(m):
    """Treadmill, running toward -Y (console at -Y)."""
    box('deck', (0.8, 1.8, 0.2), (0, 0.1, 0.12), m['black'], bevel=0.02)
    box('belt', (0.55, 1.6, 0.012), (0, 0.15, 0.225), material('belt', color=(0.02, 0.02, 0.02), roughness=0.9))
    for x in (-0.37, 0.37):
        u = box('upright', (0.05, 0.05, 1.25), (x, -0.72, 0.8), m['charcoal'], bevel=0.008); u.rotation_euler = (math.radians(-12), 0, 0)
        box('handle', (0.04, 0.4, 0.04), (x, -0.55, 1.05), m['steel'], bevel=0.008)
    con = box('console', (0.78, 0.18, 0.32), (0, -0.88, 1.4), m['charcoal'], bevel=0.02); con.rotation_euler = (math.radians(30), 0, 0)
    sc = box('display', (0.34, 0.01, 0.14), (0, -0.82, 1.43), material('treadmill_screen', color=(0.1, 0.5, 0.9), roughness=0.3)); sc.rotation_euler = (math.radians(30), 0, 0)


def exercise_bike(m):
    box('frame_base', (0.5, 1.1, 0.06), (0, 0, 0.05), m['charcoal'], bevel=0.01)
    post = box('seat_post', (0.06, 0.06, 0.75), (0, 0.32, 0.45), m['charcoal'], bevel=0.008); post.rotation_euler = (math.radians(12), 0, 0)
    s = box('seat', (0.22, 0.3, 0.08), (0, 0.38, 0.86), m['black'], bevel=0.03); smooth(s)
    front = box('front_post', (0.08, 0.08, 1.0), (0, -0.38, 0.55), m['charcoal'], bevel=0.01); front.rotation_euler = (math.radians(-15), 0, 0)
    cyl('flywheel', 0.25, 0.06, (0, -0.28, 0.32), m['black'], rotation=(0, math.radians(90), 0), verts=40)
    box('handlebar', (0.5, 0.05, 0.05), (0, -0.52, 1.08), m['steel'], bevel=0.015)
    box('console', (0.2, 0.06, 0.14), (0, -0.5, 1.15), m['charcoal'], bevel=0.01)
    for x in (-0.12, 0.12):
        box('pedal', (0.1, 0.05, 0.02), (x, -0.12, 0.35), m['black'])


def dumbbell_rack(m):
    for z in (0.35, 0.7):
        box('shelf', (1.4, 0.35, 0.04), (0, 0, z), m['steel'], bevel=0.006)
    for x in (-0.68, 0.68):
        box('end', (0.04, 0.35, 0.8), (x, 0, 0.4), m['charcoal'], bevel=0.006)
    for row in range(2):
        for i in range(6):
            r = 0.05 + i * 0.007
            x = -0.55 + i * 0.22
            for dx in (-0.09, 0.09):
                cyl('plate', r, 0.05, (x + dx, 0, 0.39 + row * 0.35 + r), m['black'], rotation=(0, math.radians(90), 0), verts=6)
            cyl('grip', 0.015, 0.14, (x, 0, 0.39 + row * 0.35 + r), m['steel'], rotation=(0, math.radians(90), 0), verts=12)


def pool_chaise(m):
    """Pool lounge chair, length along Y (head at +Y), white aluminum frame and navy sling."""
    sling = material('sling', color=(0.05, 0.14, 0.25), roughness=0.9)
    frame = material('alu', color=(0.9, 0.9, 0.88), roughness=0.35, metallic=0.4)
    box('seat', (0.62, 1.25, 0.03), (0, -0.2, 0.33), sling)
    back = box('back', (0.62, 0.75, 0.03), (0, 0.425 + 0.375 * math.cos(math.radians(40)), 0.33 + 0.375 * math.sin(math.radians(40))), sling)
    back.rotation_euler = (math.radians(40), 0, 0)              # hinged at the seat's head end, rising toward +Y
    for x in (-0.33, 0.33):
        cyl('rail', 0.018, 1.3, (x, -0.2, 0.33), frame, rotation=(math.radians(90), 0, 0), verts=12)
        for y in (-0.8, 0.4):
            cyl('leg', 0.018, 0.33, (x, y, 0.165), frame, verts=12)
    for i in range(2):
        cyl('wheel', 0.05, 0.03, (0.33 - i * 0.66, 0.45, 0.05), m['black'], rotation=(0, math.radians(90), 0), verts=16)


def pool_rail(m):
    """Stainless pool handrail pair bending down into the water (water at -Y side, deck at +Y)."""
    import bpy as _b
    from mathutils import Vector
    steel = m['chrome']
    for x in (-0.3, 0.3):
        curve = _b.data.curves.new('rail', 'CURVE'); curve.dimensions = '3D'
        sp = curve.splines.new('BEZIER'); pts = [(x, 0.35, 0.0), (x, 0.3, 0.85), (x, 0.0, 0.95), (x, -0.25, 0.5), (x, -0.3, -0.9)]
        sp.bezier_points.add(len(pts) - 1)
        for bp, p in zip(sp.bezier_points, pts):
            bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
        curve.bevel_depth = 0.022; curve.bevel_resolution = 4
        o = _b.data.objects.new('rail', curve); _b.context.scene.collection.objects.link(o)
        o.data.materials.append(steel)
        _b.context.view_layer.objects.active = o
        for ob in _b.context.selected_objects: ob.select_set(False)
        o.select_set(True); _b.ops.object.convert(target='MESH')
        cyl('flange', 0.05, 0.01, (x, 0.35, 0.005), steel)


def housekeeping_cart(m):
    """Housekeeping cart, long axis X: three shelves of linens and supplies, a blue linen bag at +X."""
    frame = m['charcoal']
    for z in (0.12, 0.6, 1.05):
        box('shelf', (1.2, 0.5, 0.05), (0, 0, z), material('cart_shelf', color=(0.2, 0.2, 0.2), roughness=0.6), bevel=0.01)
    for x in (-0.58, 0.58):
        for y in (-0.23, 0.23):
            box('post', (0.03, 0.03, 1.1), (x, y, 0.6), frame)
            cyl('caster', 0.05, 0.04, (x, y, 0.05), m['black'], rotation=(math.radians(90), 0, 0), verts=16)
    towel = material('towels', color=(0.97, 0.97, 0.96), roughness=1)
    for i in range(5):
        for j in range(3):
            t = box(f'towel{i}{j}', (0.2, 0.36, 0.08), (-0.45 + i * 0.22, 0, 0.67 + j * 0.085), towel, bevel=0.03, segments=3); smooth(t)
    for i, c in enumerate(((0.15, 0.45, 0.85), (0.2, 0.6, 0.25), (0.95, 0.75, 0.1), (0.9, 0.9, 0.9))):
        cyl(f'bottle{i}', 0.04, 0.22, (-0.4 + i * 0.25, 0.05, 1.19), material(f'supply{i}', color=c, roughness=0.3), verts=16)
    bag = box('linen_bag', (0.45, 0.45, 0.72), (0.85, 0, 0.48), material('bag', color=(0.1, 0.18, 0.4), roughness=0.95), bevel=0.06, segments=4); smooth(bag)
    box('bag_hoop', (0.47, 0.47, 0.03), (0.85, 0, 0.85), m['steel'])


def room_door(m):
    """Guest room door in its frame (front -Y = corridor). Leaf on hinge pivot 'door_leaf' at -X; lock LED material 'lock_led'."""
    trim = m['white_paint']
    for x in (-0.53, 0.53):
        box('jamb', (0.06, 0.2, 2.15), (x, 0, 1.075), trim, bevel=0.006)
    box('head', (1.12, 0.2, 0.06), (0, 0, 2.13), trim, bevel=0.006)
    hinge = empty('door_leaf', (-0.5, 0, 0))
    leaf = box('leaf', (1.0, 0.045, 2.1), (0, 0, 1.05), m['walnut'], bevel=0.004)
    lock = box('lock', (0.06, 0.03, 0.16), (0.4, -0.04, 0.98), m['black'], bevel=0.006)
    ledm = material('lock_led', color=(0.8, 0.05, 0.05), roughness=0.4)
    led = box('led', (0.012, 0.01, 0.012), (0.4, -0.056, 1.1), ledm)
    handle = box('handle', (0.13, 0.04, 0.025), (0.36, -0.06, 0.92), m['steel'], bevel=0.008)
    peep = cyl('peephole', 0.008, 0.02, (0, -0.03, 1.55), m['steel'], rotation=(math.radians(90), 0, 0), verts=12)
    for x in (-0.47,):
        for z in (0.3, 1.05, 1.8):
            cyl('hinge', 0.012, 0.1, (x, -0.02, z), m['steel'], verts=12)
    box('closer', (0.3, 0.05, 0.05), (-0.25, 0.04, 1.98), m['steel'], bevel=0.01)
    for o in (leaf, lock, led, handle, peep):
        parent_keep(o, hinge)


def shelving_unit(m):
    """Lobby decor shelving (lounge photo 3): walnut frame, colored niches, vases, books, small plants."""
    W, D, H = 1.8, 0.4, 2.0
    for x in (-W / 2, 0, W / 2):
        box('upright', (0.03, D, H), (x, 0, H / 2), m['walnut'], bevel=0.004)
    for z in (0.02, 0.45, 0.9, 1.35, 1.8, H):
        box('shelf', (W + 0.03, D, 0.025), (0, 0, z), m['walnut'], bevel=0.004)
    niches = [((-0.45, 0.67), (0.18, 0.55, 0.45)), ((0.45, 1.12), (0.12, 0.32, 0.42)), ((-0.45, 1.57), (0.85, 0.75, 0.6))]
    for (x, z), c in niches:
        box('niche_back', (0.86, 0.01, 0.42), (x, D / 2 - 0.01, z), material(f'niche{z}', color=c, roughness=0.8))
    vase = lambda n, x, z, c, r, h: cyl(n, r, h, (x, 0, z + h / 2), material(n + 'm', color=c, roughness=0.2), r2=r * 0.6, verts=24)
    vase('vase1', -0.65, 0.47, (0.65, 0.1, 0.06), 0.06, 0.24); vase('vase2', 0.3, 0.92, (0.9, 0.88, 0.85), 0.07, 0.3)
    vase('vase3', -0.2, 1.37, (0.08, 0.2, 0.35), 0.05, 0.2); vase('vase4', 0.65, 1.82, (0.85, 0.65, 0.15), 0.06, 0.16)
    for i, c in enumerate(((0.6, 0.1, 0.1), (0.1, 0.2, 0.4), (0.85, 0.8, 0.7), (0.2, 0.35, 0.2), (0.3, 0.2, 0.15))):
        box(f'book{i}', (0.04, 0.24, 0.26 - i * 0.015), (0.55 + i * 0.045, 0, 0.475 + (0.26 - i * 0.015) / 2), material(f'bk{i}', color=c, roughness=0.7))
    for x, z in ((-0.3, 0.92), (0.2, 1.82)):
        cyl('pot', 0.06, 0.1, (x, 0, z + 0.05), m['ceramic'], r2=0.05)
        for k in range(6):
            leaf = box('leaf', (0.015, 0.05, 0.14), (x + math.cos(k) * 0.03, math.sin(k) * 0.03, z + 0.16), material('leafg', color=(0.1, 0.3, 0.08), roughness=0.6))
            leaf.rotation_euler = (math.cos(k * 1.7) * 0.4, math.sin(k * 1.7) * 0.4, k)
    box('bowl', (0.3, 0.2, 0.06), (0.4, 0, 1.4), material('bowl', color=(0.75, 0.6, 0.35), roughness=0.3, metallic=0.6), bevel=0.03, segments=4)


def floor_lamp(m):
    """Arched brass floor lamp base with a linen drum shade (shade material 'lampshade')."""
    cyl('base', 0.16, 0.03, (0, 0, 0.015), m['charcoal'], bevel=0.006)
    cyl('pole', 0.012, 1.45, (0, 0, 0.75), m['brass'], verts=12)
    shade = cyl('shade', 0.24, 0.3, (0, 0, 1.55), m['lampshade'], verts=48, r2=0.22)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(shade.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES_ONLY')
    bm.to_mesh(shade.data); bm.free()
    shade.modifiers.new('solid', 'SOLIDIFY').thickness = 0.004
    cyl('bulb', 0.035, 0.07, (0, 0, 1.5), m['led'])



def centerpiece(m):
    """Lobby centerpiece: round walnut pedestal table, glass vase, a big arrangement of flowers and greens."""
    cyl('top', 0.6, 0.04, (0, 0, 0.76), m['walnut'], verts=64, bevel=0.006)
    cyl('pedestal', 0.09, 0.7, (0, 0, 0.4), m['walnut'], verts=24, r2=0.06)
    cyl('foot', 0.32, 0.05, (0, 0, 0.025), m['walnut'], verts=48, bevel=0.01)
    cyl('vase', 0.1, 0.32, (0, 0, 0.94), material('vase_glass', color=(0.75, 0.82, 0.8), roughness=0.05, alpha=0.4), verts=32, r2=0.13)
    greens = material('greens', color=(0.08, 0.22, 0.07), roughness=0.6)
    petals = [material(f'petal{i}', color=c, roughness=0.6) for i, c in enumerate(((0.85, 0.82, 0.78), (0.8, 0.25, 0.2), (0.85, 0.6, 0.15), (0.6, 0.3, 0.55)))]
    for k in range(26):
        a = rnd.random() * 6.28; t = rnd.random()
        x, y, z = math.cos(a) * 0.25 * t, math.sin(a) * 0.25 * t, 1.25 + rnd.random() * 0.3
        cyl(f'stem{k}', 0.004, z - 1.0, (x * 0.5, y * 0.5, 1.0 + (z - 1.0) / 2), greens, verts=6).rotation_euler = (-y * 0.9, x * 0.9, 0)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045 + rnd.random() * 0.03, location=(x, y, z), segments=12, ring_count=8)
        f = bpy.context.object; f.name = f'bloom{k}'; f.scale = (1, 1, 0.6); f.data.materials.append(petals[k % 4]); smooth(f)
    for k in range(18):
        a = rnd.random() * 6.28
        lf = box(f'leaf{k}', (0.05, 0.16, 0.006), (math.cos(a) * 0.18, math.sin(a) * 0.18, 1.12 + rnd.random() * 0.15), greens, bevel=0.003)
        lf.rotation_euler = (rnd.random() - 0.5, 0.6, a)


def lattice_pendant(m):
    """Lattice sphere pendant (lobby photo 2): open geodesic shell of struts, warm glow inside."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.45, location=(0, 0, 0.45))
    shell = bpy.context.object; shell.name = 'lattice'
    wf = shell.modifiers.new('wire', 'WIREFRAME'); wf.thickness = 0.018; wf.use_even_offset = True
    shell.data.materials.append(material('lattice_gold', color=(0.75, 0.6, 0.25), roughness=0.35, metallic=0.8))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 0.45)); g = bpy.context.object; g.name = 'glow'; g.data.materials.append(m['led'])
    cyl('cable', 0.004, 0.6, (0, 0, 1.2), m['black'], verts=8)
    cyl('canopy', 0.07, 0.03, (0, 0, 1.51), m['white_paint'])


ASSETS = {
    'hotel-headboard': (headboard, dict(distance=4.2, height=1.4, target=(0, 0, 1.1))),
    'hotel-nightstand': (nightstand, dict(distance=1.5, height=0.9, target=(0, 0, 0.3))),
    'hotel-table-lamp': (table_lamp, dict(distance=1.2, height=0.7, target=(0, 0, 0.32))),
    'hotel-credenza-tv': (credenza_tv, dict(distance=3.6, height=1.4, target=(0, 0, 0.9))),
    'hotel-desk': (desk, dict(distance=2.2, height=1.3, target=(0, 0, 0.45))),
    'hotel-closet': (closet, dict(distance=3.0, height=1.5, target=(0, 0, 1.0))),
    'hotel-microfridge': (microfridge, dict(distance=2.4, height=1.3, target=(0, 0, 0.8))),
    'hotel-ptac': (ptac, dict(distance=1.8, height=0.9, target=(0, 0, 0.3))),
    'hotel-vanity': (vanity, dict(distance=2.6, height=1.5, target=(0, 0, 1.1))),
    'hotel-toilet': (toilet, dict(distance=1.6, height=1.1, target=(0, 0, 0.4))),
    'hotel-tub-shower': (tub_shower, dict(distance=3.2, height=1.6, target=(0, 0, 0.9))),
    'hotel-front-desk': (front_desk, dict(distance=5.5, height=1.8, target=(0, 0, 0.8))),
    'hotel-drum-pendant': (drum_pendant, dict(distance=2.2, height=0.4, target=(0, 0, 0.4))),
    'hotel-luggage-cart': (luggage_cart, dict(distance=3.0, height=1.4, target=(0, 0, 1.0))),
    'hotel-lobby-sofa': (lobby_sofa, dict(distance=3.4, height=1.3, target=(0, 0, 0.45))),
    'hotel-accent-chair-green': (lambda m: accent_chair(m, (0.1, 0.19, 0.035)), dict(distance=1.9, height=1.1, target=(0, 0, 0.45))),
    'hotel-accent-chair-mustard': (lambda m: accent_chair(m, (0.5, 0.26, 0.025)), dict(distance=1.9, height=1.1, target=(0, 0, 0.45))),
    'hotel-breakfast-bar': (breakfast_bar, dict(distance=3.8, height=1.7, target=(0, 0, 0.95))),
    'hotel-ice-machine': (ice_machine, dict(distance=2.2, height=1.3, target=(0, 0, 0.9))),
    'hotel-ice-bucket': (ice_bucket, dict(distance=0.8, height=0.5, target=(0, 0, 0.1))),
    'hotel-elevator-car': (elevator_car, dict(distance=1.0, height=1.5, target=(0, 1, 1.2), yaw=0)),
    'hotel-treadmill': (treadmill, dict(distance=3.0, height=1.5, target=(0, 0, 0.7))),
    'hotel-exercise-bike': (exercise_bike, dict(distance=2.4, height=1.3, target=(0, 0, 0.6))),
    'hotel-dumbbell-rack': (dumbbell_rack, dict(distance=2.4, height=1.2, target=(0, 0, 0.45))),
    'hotel-pool-chaise': (pool_chaise, dict(distance=2.6, height=1.3, target=(0, 0, 0.35))),
    'hotel-pool-rail': (pool_rail, dict(distance=2.0, height=1.0, target=(0, 0, 0.4))),
    'hotel-housekeeping-cart': (housekeeping_cart, dict(distance=2.8, height=1.4, target=(0, 0, 0.65))),
    'hotel-room-door': (room_door, dict(distance=3.0, height=1.4, target=(0, 0, 1.1))),
    'hotel-shelving-unit': (shelving_unit, dict(distance=3.0, height=1.4, target=(0, 0, 1.0))),
    'hotel-floor-lamp': (floor_lamp, dict(distance=2.6, height=1.3, target=(0, 0, 0.9))),
    'hotel-centerpiece': (centerpiece, dict(distance=2.6, height=1.6, target=(0, 0, 0.9))),
    'hotel-lattice-pendant': (lattice_pendant, dict(distance=2.6, height=0.6, target=(0, 0, 0.6))),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, view = ASSETS[name]
        reset()
        build(mats())
        preview(os.path.join(SHOTS, name + '.png'), samples=32, **view)
        export(os.path.join(OUT, name + '.glb'), name)

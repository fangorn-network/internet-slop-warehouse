# SPDX-License-Identifier: CC0-1.0
# The lobby sofa, built to not look built: every cushion is inflated by Blender's cloth simulation (crowned tops,
# pinched seams, no two alike), the seats sag where people sit, and the
# upholstery is Poly Haven's poly-wool herringbone (CC0) at its real 27 cm repeat. Origin at floor center; front faces
# Blender -Y (three.js +Z).
#   blender -b --python projects/roadside-inn/blender/sofa.py -- [asset ...]     (default: all)
import bpy, bmesh, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, export, preview, mats
from lobby import kit, flat, merge, OUT, SHOTS

R = math.radians
TILE = 0.27                                   # herringbone repeat, metres
WOOL = {'color': 'ph-hotel-herringbone-color.jpg', 'normal': 'ph-hotel-herringbone-normal.jpg', 'roughness': 'ph-hotel-herringbone-roughness.jpg'}
LABELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'labels')
# light cool-grey heathered weave: melange colour (prints.mjs heather.jpg) under the herringbone's weave relief
HEATHER = {'color': os.path.join(LABELS, 'heather.jpg'), 'normal': WOOL['normal'], 'roughness': WOOL['roughness']}
# navy ogee-lattice jacquard (prints.mjs pillow.png), one 0.27 m tile = 3 x 2 ogees
JACQUARD = {'color': os.path.join(LABELS, 'pillow.png'), 'normal': WOOL['normal'], 'roughness': WOOL['roughness']}


def heather():
    return bpy.data.materials.get('heather_grey') or material('heather_grey', maps=HEATHER, roughness=1.0, normal_strength=1.5)


def jacquard():
    return bpy.data.materials.get('pillow_jacquard') or material('pillow_jacquard', maps=JACQUARD, normal_strength=0.9)


def lean_dent(o, depth, w, h, z0=-0.04):
    """Where backs lean: push the front face (local -Y) of a back cushion in, deepest a little below the middle."""
    d = max(-v.co.y for v in o.data.vertices)
    for v in o.data.vertices:
        if v.co.y < 0:
            v.co.y += depth * (-v.co.y / d) * math.exp(-(v.co.x / (w * 0.32)) ** 2) * math.exp(-((v.co.z - z0) / (h * 0.35)) ** 2)
    return o


def select_only(o):
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o


def uv_real(o, tile=TILE):
    """Cube-projected UVs at real size: one texture repeat per `tile` metres on every face."""
    select_only(o)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=tile, correct_aspect=False, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def apply_mods(o):
    select_only(o)
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def cushion(name, size, loc, mat, rot=(0, 0, 0), puff=1.0, seed=0, frames=14, cuts=(18, 12, 4), sag=None):
    """A box cushion inflated with cloth pressure: the faces crown, the edges and corners pull in and wrinkle like a
    sewn gusset. `sag` = (depth, radius) presses a sitting hollow into the top. Returns the applied mesh."""
    w, d, h = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); o = bpy.context.object; o.name = name
    o.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    # even quads all over (x, y, z cuts) so the cloth has room to fold
    for axis, n in zip(range(3), cuts):
        edges = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co)[axis]) > 1e-6]
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=n, use_grid_fill=True)
    rnd = random.Random(seed)
    for v in bm.verts:                         # a stuffed cushion is never a perfect box
        v.co.x += rnd.uniform(-0.002, 0.002); v.co.y += rnd.uniform(-0.002, 0.002)
    bm.to_mesh(o.data); bm.free()
    cl = o.modifiers.new('cloth', 'CLOTH'); s = cl.settings
    s.quality = 6; s.mass = 0.3
    s.tension_stiffness = s.compression_stiffness = 40; s.shear_stiffness = 20; s.bending_stiffness = 0.6
    s.use_pressure = True; s.uniform_pressure_force = 6.0 * puff; s.pressure_factor = 1.0
    s.effector_weights.gravity = 0.0
    cl.point_cache.frame_start, cl.point_cache.frame_end = 1, frames
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, frames
    for f in range(1, frames + 1):
        sc.frame_set(f)
    apply_mods(o); sc.frame_set(1)
    if sag:                                    # where people sit: a soft hollow, deepest in the middle of the top
        depth, radius = sag
        top = max(v.co.z for v in o.data.vertices)
        for v in o.data.vertices:
            r = math.hypot(v.co.x / (w / 2), (v.co.y + d * 0.08) / (d / 2))
            if v.co.z > 0 and r < 1.2:
                v.co.z -= depth * max(0, 1 - (r / 1.2) ** 2) * (v.co.z / top)
    o.location = loc; o.rotation_euler = rot
    uv_real(o)
    o.data.materials.append(mat); o.data.shade_smooth()
    return o


def foam_cushion(name, size, loc, mat, crown=0.018, bulge=0.012, seed=0, sag=None, cuts=(20, 14, 4)):
    """A firm foam seat cushion (it keeps its volume, unlike the stuffed ones): crowned top and bottom, sides bulging
    a little at the middle, corners softened by subdivision, faint puckering along the seams, an optional sitting
    hollow (depth, radius) in the top."""
    w, d, h = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); o = bpy.context.object; o.name = name
    o.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    for axis, n in zip(range(3), cuts):
        edges = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co)[axis]) > 1e-6]
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=n, use_grid_fill=True)
    rnd = random.Random(seed); ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    for v in bm.verts:
        u, q, t = v.co.x / (w / 2), v.co.y / (d / 2), v.co.z / (h / 2)
        top = abs(t) > 0.999
        if top:
            v.co.z += math.copysign(crown, t) * (1 - u * u) * (1 - q * q)
        side = 1 - t * t                       # sides bulge most halfway up
        v.co.x += math.copysign(bulge * side * (1 - q * q), u) if abs(u) > 0.999 else 0
        v.co.y += math.copysign(bulge * side * (1 - u * u), q) if abs(q) > 0.999 else 0
        edge = max(abs(u), abs(q))             # puckers where the top panel meets the boxing
        if edge > 0.9 and abs(t) > 0.8:
            v.co.z += 0.0025 * math.sin(v.co.x * 61 + ph[0]) * math.sin(v.co.y * 53 + ph[1]) * (edge - 0.9) * 10
    bm.to_mesh(o.data); bm.free()
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    apply_mods(o)
    if sag:
        depth, _ = sag
        for v in o.data.vertices:
            r = math.hypot(v.co.x / (w / 2), (v.co.y + d * 0.08) / (d / 2))
            if v.co.z > 0 and r < 1.2:
                v.co.z -= depth * max(0, 1 - (r / 1.2) ** 2) * min(1, v.co.z / (h / 2))
    o.location = loc
    uv_real(o); o.data.materials.append(mat); o.data.shade_smooth()
    return o


def soft_box(name, size, loc, mat, bevel=0.035, seed=0, lump=0.003):
    """Upholstered frame part (arm, back, deck): a well-rounded box whose faces are never dead flat."""
    o = box(name, size, loc, mat, bevel=bevel, segments=5)
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    apply_mods(o)
    rnd = random.Random(seed); ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    for v in o.data.vertices:                 # broad, low undulation: stretched fabric over padding
        v.co += v.normal * lump * (math.sin(v.co.x * 7 + ph[0]) * math.sin(v.co.y * 9 + ph[1]) + 0.5 * math.sin(v.co.z * 11 + ph[2]))
    uv_real(o); o.data.shade_smooth()
    return o


def lobby_sofa(m):
    """Contract lobby sofa, 2.1 x 0.92 x 0.84 m: square track arms, a tight back with two loose back cushions, two
    seat cushions worn into a slight hollow, piped seams, a dark walnut plinth on short feet, and two navy throw
    pillows leaning in the corners. Grey poly-wool herringbone throughout."""
    wool = heather()
    W, D = 2.1, 0.92
    plinth = box('plinth', (W - 0.02, D - 0.04, 0.07), (0, 0.0, 0.095), stain(), bevel=0.008); smooth(plinth)
    for x in (-W / 2 + 0.07, W / 2 - 0.07):
        for y in (-D / 2 + 0.07, D / 2 - 0.07):
            box('foot', (0.05, 0.05, 0.06), (x, y, 0.03), stain(), bevel=0.004)
    soft_box('deck', (W - 0.3, D - 0.06, 0.2), (0, 0.0, 0.23), wool, seed=1)
    for i, x in enumerate((-W / 2 + 0.085, W / 2 - 0.085)):
        soft_box(f'arm{i}', (0.17, D, 0.5), (x, 0.0, 0.38), wool, bevel=0.045, seed=2 + i)
    soft_box('back', (W - 0.3, 0.18, 0.56), (0, D / 2 - 0.09, 0.53), wool, bevel=0.05, seed=4)
    cw = (W - 0.34) / 2
    seats, backs = [], []
    for i, x in enumerate((-cw / 2 - 0.005, cw / 2 + 0.005)):
        seats.append(foam_cushion(f'seat{i}', (cw, D - 0.24, 0.13), (x, -0.08, 0.4), wool, crown=0.022, bulge=0.018, seed=10 + i, sag=(0.032, 1)))
        b = cushion(f'backc{i}', (cw - 0.01, 0.16, 0.42), (x, D / 2 - 0.25, 0.7), wool, rot=(R(-13), 0, 0), seed=20 + i, puff=1.15)
        backs.append(lean_dent(b, 0.035 + 0.01 * i, cw, 0.42))
    frame = backs + [o for o in bpy.context.scene.objects if o.name.startswith(('arm', 'back'))]
    placed = []
    for i, (x, rz, ry) in enumerate(((-W / 2 + 0.38, 9, -6), (W / 2 - 0.4, -12, 7))):
        placed.append(throw_pillow(f'pillow{i}', jacquard(), (x, D / 2 - 0.3, 0.8), (R(-25), R(ry), R(rz)), 30 + i, frame + placed, seats))


def stain():
    """Dark walnut stain. (The hotel's 'walnut' veneer map is a pale grey wood: on legs and plinths it read as grey.)"""
    return flat((0.15, 0.085, 0.045), 0.4, 'walnut_stain')


def fabric(name, color, normal=1.2):
    """A coloured upholstery fabric with the herringbone's real weave (normal and roughness only)."""
    return bpy.data.materials.get(name) or material(name, color=color, maps={'normal': WOOL['normal'], 'roughness': WOOL['roughness']}, normal_strength=normal)


def bend(o, curve_y=0.0, wrap=0.0):
    """Curve a panel: lean its top back (curve_y, metres at the top) and wrap its sides forward (wrap, at the edges)."""
    zs = [v.co.z for v in o.data.vertices]; xs = [v.co.x for v in o.data.vertices]
    z0, z1, hw = min(zs), max(zs), max(abs(x) for x in xs) or 1
    for v in o.data.vertices:
        t = (v.co.z - z0) / ((z1 - z0) or 1)
        v.co.y += curve_y * t * t - wrap * (v.co.x / hw) ** 2


def taper_leg(name, r0, r1, length, base, top, mat):
    """A tapered round leg from base (x, y, z) to top (x, y, z)."""
    import mathutils
    a, b = mathutils.Vector(base), mathutils.Vector(top)
    o = cyl(name, r0, length, ((a + b) / 2)[:], mat, verts=14, r2=r1)   # cone: radius1 at the base end
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    return o


def bar_stool(m):
    """Counter stool, seat 0.76 m, after the brand's communal tables: a firm foam seat and an upholstered back panel in
    cobalt herringbone, tapered walnut legs splayed out, wooden rungs and a brushed kick plate where heels rest."""
    cob = fabric('stool_cobalt', (0.02, 0.1, 0.36))
    foam_cushion('seat', (0.44, 0.42, 0.075), (0, -0.01, 0.74), cob, crown=0.01, bulge=0.006, seed=40, cuts=(14, 14, 3))
    box('seat_pan', (0.4, 0.38, 0.02), (0, -0.01, 0.69), stain(), bevel=0.006)
    bk = foam_cushion('back', (0.42, 0.05, 0.22), (0, 0.2, 0.96), cob, crown=0.006, bulge=0.004, seed=41, cuts=(14, 3, 8))
    bk.rotation_euler = (R(-12), 0, 0)
    for x in (-0.15, 0.15):
        taper_leg('back_post', 0.012, 0.012, 0.3, (x, 0.18, 0.7), (x, 0.215, 0.98), stain())
    legs = []
    for x in (-1, 1):
        for y in (-1, 1):
            base, top = (x * 0.2, y * 0.2, 0.0), (x * 0.155, y * 0.155, 0.69)
            taper_leg('leg', 0.013, 0.019, 0.7, base, top, stain()); legs.append((base, top))
    for (x0, y0, z), (x1, y1, _) in ((( -0.185, -0.185, 0.26), (0.185, -0.185, 0)), ((-0.185, 0.185, 0.26), (0.185, 0.185, 0)), ((-0.185, -0.185, 0.3), (-0.185, 0.185, 0)), ((0.185, -0.185, 0.3), (0.185, 0.185, 0))):
        taper_leg('rung', 0.009, 0.009, math.hypot(x1 - x0, y1 - y0), (x0, y0, z), (x1, y1, z), stain())
    box('kick_plate', (0.36, 0.03, 0.004), (0, -0.19, 0.27), m['brushed'], bevel=0.0015)
    for x in (-1, 1):
        for y in (-1, 1):
            cyl('glide', 0.014, 0.008, (x * 0.2, y * 0.2, 0.004), m['black'], verts=12)


def task_chair(m):
    """Business-center task chair, seat 0.47 m: a waterfall-front foam seat and a contoured back (lumbar curve, sides
    wrapping) in charcoal herringbone, padded T-arms, a seat mechanism with its lever, a gas lift in a bellows sleeve,
    a tapered five-star base on twin-wheel casters."""
    char = fabric('chair_charcoal', (0.035, 0.037, 0.042))
    seat = foam_cushion('seat', (0.48, 0.46, 0.075), (0, 0, 0.475), char, crown=0.012, bulge=0.008, seed=50, cuts=(14, 14, 3))
    for v in seat.data.vertices:              # waterfall front edge
        if v.co.y < -0.15: v.co.z -= (v.co.y + 0.15) ** 2 * 1.6
    box('seat_shell', (0.44, 0.42, 0.025), (0, 0, 0.425), m['black'], bevel=0.008)
    back = foam_cushion('back', (0.44, 0.06, 0.5), (0, 0.24, 0.83), char, crown=0.008, bulge=0.006, seed=51, cuts=(14, 3, 14))
    bend(back, curve_y=0.06, wrap=0.04)
    for v in back.data.vertices:              # lumbar: the lower third pushes forward
        t = (v.co.z + 0.25) / 0.5
        v.co.y -= 0.025 * math.exp(-((t - 0.3) / 0.15) ** 2)
    box('back_shell', (0.4, 0.02, 0.44), (0, 0.285, 0.83), m['black'], bevel=0.01).rotation_euler = (R(-6), 0, 0)
    box('spine', (0.06, 0.03, 0.32), (0, 0.28, 0.56), m['black'], bevel=0.008).rotation_euler = (R(8), 0, 0)
    box('mechanism', (0.2, 0.22, 0.05), (0, 0.02, 0.39), m['black'], bevel=0.006)
    cyl('lever', 0.006, 0.12, (0.15, 0.04, 0.39), m['black'], verts=8, rotation=(0, R(90), 0))
    cyl('lever_knob', 0.012, 0.03, (0.215, 0.04, 0.39), m['black'], verts=10, rotation=(0, R(90), 0))
    cyl('gas_rod', 0.014, 0.12, (0, 0, 0.32), m['chrome'], verts=14)
    cyl('gas_sleeve', 0.026, 0.16, (0, 0, 0.18), m['black'], verts=16)
    for k in range(6):                        # bellows rings on the sleeve
        cyl('bellow', 0.029, 0.006, (0, 0, 0.12 + k * 0.022), m['black'], verts=16)
    cyl('hub', 0.045, 0.05, (0, 0, 0.1), m['black'], verts=16, bevel=0.006)
    for k in range(5):
        a = k * 2 * math.pi / 5 + math.pi / 2
        arm = box('star', (0.3, 0.045, 0.032), (math.cos(a) * 0.17, math.sin(a) * 0.17, 0.085), m['black'], bevel=0.008)
        arm.rotation_euler = (0, R(-4), a)
        cx, cy = math.cos(a) * 0.31, math.sin(a) * 0.31
        box('caster_body', (0.03, 0.05, 0.03), (cx, cy, 0.055), m['black'], bevel=0.008).rotation_euler = (0, 0, a)
        for s_ in (-1, 1):                    # twin wheels
            cyl('wheel', 0.024, 0.012, (cx + math.cos(a + math.pi / 2) * 0.012 * s_, cy + math.sin(a + math.pi / 2) * 0.012 * s_, 0.024), m['charcoal'], verts=16, rotation=(R(90), 0, a + math.pi / 2))
    for x in (-0.255, 0.255):
        box('arm_post', (0.03, 0.04, 0.2), (x, 0.03, 0.56), m['black'], bevel=0.006)
        box('arm_bracket', (0.06, 0.04, 0.02), (x * 0.92, 0.03, 0.46), m['black'], bevel=0.004)
        pad = foam_cushion('arm_pad', (0.07, 0.24, 0.03), (x, 0.0, 0.675), m['black'], crown=0.004, bulge=0.002, seed=int(x * 100) + 60, cuts=(4, 10, 2))


def world_bvh(o):
    from mathutils.bvhtree import BVHTree
    bpy.context.view_layer.update()
    mw = o.matrix_world
    return BVHTree.FromPolygons([mw @ v.co for v in o.data.vertices], [p.vertices[:] for p in o.data.polygons])


def touching(o, others):
    b = world_bvh(o)
    return any(b.overlap(world_bvh(x)) for x in others)


def nudge(o, others, direction, until_clear=True, step=0.004, limit=0.4):
    """Slide o along direction: until it is clear of others, or (until_clear=False) until it would touch them."""
    import mathutils
    d = mathutils.Vector(direction) * step
    for _ in range(int(limit / step)):
        hit = touching(o, others)
        if until_clear and not hit: return
        if not until_clear and hit: o.location -= d; return
        o.location += d


def throw_pillow(name, mat, loc, rot, seed, lean_on, sit_on, size=0.45):
    """A down-blend throw pillow: a thin slab inflated hard (pointed, dog-eared corners), a karate-chop crease in the
    top and the top flopping forward, so it slumps instead of standing like a board. Set against what it leans on and
    let down onto the seat, never into either."""
    p = cushion(name, (size, 0.05, size), (0, 0, 0), mat, seed=seed, puff=3.2, frames=22, cuts=(16, 3, 16))
    rnd = random.Random(seed); side = rnd.uniform(-0.02, 0.02)
    for v in p.data.vertices:
        t = max(0.0, v.co.z / (size / 2))          # 0 at the middle, 1 at the top edge
        v.co.y -= 0.06 * t * t                     # the top flops forward
        v.co.x += side * t * t                     # and a little to one side
        v.co.z -= 0.045 * math.exp(-(v.co.x / 0.08) ** 2) * t ** 1.5   # the chop
    p.location = loc; p.rotation_euler = rot
    nudge(p, lean_on, (0, -1, 0))                  # off the back cushions
    nudge(p, sit_on, (0, 0, -1), until_clear=False)   # down onto the seat
    nudge(p, lean_on, (0, -1, 0))
    return p


def sectional(m):
    """L-shaped modular sectional by the lounge TV: light-grey woven upholstery (herringbone weave), firm foam seats
    worn into a hollow, cloth-inflated back cushions, navy and cobalt throw pillows slumped in the corners, brushed
    square legs. Main run 2.7 m along X; the chaise returns 1.65 m forward (-Y) on the +X end."""
    g = heather()
    L, D, CD = 2.7, 0.95, 1.65
    soft_box('base', (L - 0.94, D, 0.24), (-0.47, 0, 0.22), g, bevel=0.02, seed=70)
    soft_box('back', (L, 0.2, 0.46), (0, D / 2 - 0.1, 0.57), g, bevel=0.04, seed=71)
    soft_box('arm_l', (0.16, D, 0.6), (-L / 2 + 0.08, 0, 0.4), g, bevel=0.04, seed=72)
    cx, cy = L / 2 - 0.16 - 0.43, -(CD - D) / 2
    soft_box('chaise_base', (0.94, CD, 0.24), (L / 2 - 0.47 - 0.08, cy, 0.22), g, bevel=0.02, seed=73)
    soft_box('chaise_arm', (0.16, CD, 0.6), (L / 2 - 0.08, cy, 0.4), g, bevel=0.04, seed=74)
    seats, backs = [], []
    for i, x in enumerate((-0.79, 0.01)):          # two seats between the left arm and the chaise
        seats.append(foam_cushion(f'seat{i}', (0.79, 0.7, 0.14), (x, -0.07, 0.41), g, crown=0.022, bulge=0.018, seed=75 + i, sag=(0.03 + 0.008 * i, 1)))
        b = cushion(f'backc{i}', (0.78, 0.16, 0.4), (x, D / 2 - 0.25, 0.7), g, rot=(R(-13), 0, 0), seed=77 + i, puff=1.15)
        backs.append(lean_dent(b, 0.04 - 0.008 * i, 0.78, 0.4))
    seats.append(foam_cushion('chaise_seat', (0.85, CD - 0.26, 0.14), (cx, cy - 0.1, 0.41), g, crown=0.022, bulge=0.018, seed=79, sag=(0.022, 1)))
    backs.append(lean_dent(cushion('chaise_backc', (0.84, 0.16, 0.4), (cx, D / 2 - 0.25, 0.7), g, rot=(R(-13), 0, 0), seed=80, puff=1.15), 0.025, 0.84, 0.4))
    navy, cobalt = fabric('pillow_navy2', (0.02, 0.035, 0.1), 1.0), jacquard()
    frame = backs + [o for o in bpy.context.scene.objects if o.name.startswith(('arm_l', 'chaise_arm', 'back'))]
    placed = []
    # one in the left corner; two piled in the chaise corner, the second leaning on the first
    # patterned pair in the corners, a plain navy one leaning on the chaise pair (as in the Formula Blue lobby photos)
    for i, (x, mat, rz, ry) in enumerate(((-0.93, cobalt, 8, -7), (1.0, cobalt, -10, 8), (0.7, navy, 6, -5))):
        p = throw_pillow(f'pillow{i}', mat, (x, D / 2 - 0.3, 0.8), (R(-24), R(ry), R(rz)), 90 + i, frame + placed, seats)
        placed.append(p)
    for x, y in ((-L / 2 + 0.06, D / 2 - 0.06), (-L / 2 + 0.06, -D / 2 + 0.06), (L / 2 - 0.06, D / 2 - 0.06),
                 (L / 2 - 0.06, -CD + D / 2 + 0.06), (L / 2 - 0.88, -CD + D / 2 + 0.06), (0.4, D / 2 - 0.06)):
        box('leg', (0.035, 0.035, 0.1), (x, y, 0.05), m['brushed'])


ASSETS = {
    'hotel-lobby-sofa-2': (lobby_sofa, dict(distance=3.2, height=1.4, target=(0, 0, 0.45), yaw=25)),
    'hotel-bar-stool': (bar_stool, dict(distance=1.7, height=1.2, target=(0, 0, 0.55), yaw=25)),
    'hotel-sectional': (sectional, dict(distance=4.6, height=2.0, target=(0.2, -0.3, 0.4))),
    'hotel-task-chair': (task_chair, dict(distance=1.8, height=1.2, target=(0, 0, 0.55), yaw=25)),
}

def clips(name):
    """B1 check: no throw pillow may intersect any cushion, the frame or another pillow (BVH, modifiers applied)."""
    obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in obs: apply_mods(o)
    bad = [(p.name, o.name) for p in obs if p.name.startswith('pillow') for o in obs if o is not p and touching(p, [o])]
    assert not bad, f'{name}: pillows clip {bad}'
    print(f'CLEAR {name}: pillows touch nothing')


CLOSE = {
    'hotel-lobby-sofa-2': dict(distance=1.1, height=1.05, target=(0.55, 0.1, 0.6), yaw=15),
    'hotel-sectional': dict(distance=1.3, height=1.1, target=(0.9, 0.1, 0.6), yaw=10),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, view = ASSETS[name]
        reset()
        build(kit(mats()))
        clips(name)
        merge()
        preview(os.path.join(SHOTS, name + '.png'), samples=48, **view)
        if name in CLOSE:                          # fabric and print up close
            preview(os.path.join(SHOTS, name + '-close.png'), samples=48, **CLOSE[name])
        export(os.path.join(OUT, name + '.glb'), name)

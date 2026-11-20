# SPDX-License-Identifier: CC0-1.0
# Front-desk gear, built after real hardware (every brand invented; faces printed from labels/desk.png, drawn with
# its key layout labels/desk.json by prints.mjs):
#   receipt_printer  TM-T88-class thermal printer, 145 x 195 x 148 mm: clamshell cover, paper exit with tear bar,
#                    control strip with LED and feed key, rocker switch, power and USB cables at the back.
#   card_terminal    countertop PIN pad (Desk/3500 class, 187 x 82 mm) on a swivel stand, tilted 35 deg at the guest.
#   desk_phone       IP desk phone (8841 class, 257 x 229 x 40 mm) on its foot, handset in a left cradle, coiled cord.
#   monitor24        slim 24-inch monitor: 7 mm bezels, 18 mm chin, rear housing, post and plate stand, a live PMS.
# Each is built flat in its own frame (face up, +Y = top of the print) and then placed.
import bpy, math, os, json
from mathutils import Matrix, Vector
from common import material, box, cyl, smooth

LAB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'labels')
DESK = json.load(open(os.path.join(LAB, 'desk.json')))
R = math.radians


def mat(name, **kw):
    return bpy.data.materials.get(name) or material(name, **kw)


def plastic():
    return mat('gear_plastic', color=(0.03, 0.031, 0.034), roughness=0.55)


def face_mat(lit=False):
    name = 'desk_lit' if lit else 'desk_face'
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(LAB, 'desk.png'), check_existing=True)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.12 if lit else 0.45
    if lit:
        nt.links.new(tx.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 0.7
    return m


def apply(o):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)
    return o


def project(o, rect, to_print):
    """UV every loop from the vertex's (x, y) through to_print(x, y) -> (u, v) in print space (v down) into rect."""
    apply(o)
    u0, v0, u1, v1 = rect
    ul = o.data.uv_layers.get('UVMap') or o.data.uv_layers.new(name='UVMap')
    mw = o.matrix_world
    for p in o.data.polygons:
        for li in p.loop_indices:
            co = mw @ o.data.vertices[o.data.loops[li].vertex_index].co
            u, v = to_print(co.x, co.y)
            ul.data[li].uv = (u0 + (u1 - u0) * min(1, max(0, u)), v1 - (v1 - v0) * min(1, max(0, v)))
    return o


def key(name, x0, y0, x1, y1, z, h, m, inset=0.0008):
    """A key cap: a frustum standing on z, h tall, its top inset a little (in the device's flat frame)."""
    xa, xb, ya, yb = min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1)
    v = [(xa, ya, z), (xb, ya, z), (xb, yb, z), (xa, yb, z), (xa + inset, ya + inset, z + h), (xb - inset, ya + inset, z + h), (xb - inset, yb - inset, z + h), (xa + inset, yb - inset, z + h)]
    f = [(4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); me.materials.append(m)
    return o


def place(parts, loc, rot=(0, 0, 0)):
    M = Matrix.Translation(loc) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bpy.context.view_layer.update()
    for p in parts:
        p.matrix_world = M @ p.matrix_world
    return parts


def cable(name, pts, r=0.0022):
    """A cable through world points (a smooth curve with a round section), converted to mesh."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 1; cu.resolution_u = 1 if len(pts) > 50 else 6   # a dense helix needs no subdivision
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat('cable', color=(0.014, 0.014, 0.016), roughness=0.5))
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects: ob.select_set(False)
    o.select_set(True); bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def grommet(at):
    """A desk cable grommet: a black ring with a dark brush-filled hole the cables drop into."""
    x, y, z = at
    cyl('grommet_ring', 0.03, 0.003, (x, y, z + 0.0015), mat('grommet', color=(0.02, 0.02, 0.022), roughness=0.45), verts=24, bevel=0.001)
    cyl('grommet_hole', 0.024, 0.001, (x, y, z + 0.0031), mat('slot_dark', color=(0.01, 0.01, 0.01), roughness=0.9), verts=20)


# ---------- receipt printer ----------
def receipt_printer(m, loc, yaw=math.pi, receipt=None):
    """TM-T88-class thermal printer, front (paper exit, switch) toward -Y before yaw; yaw pi turns it to the clerk."""
    W, D, H = 0.145, 0.195, 0.148
    g = plastic(); parts = []
    parts.append(box('rp_base', (W, D, 0.074), (0, 0, 0.037), g, bevel=0.003))
    parts.append(box('rp_cover', (W - 0.0006, D - 0.058, 0.0735), (0, -D / 2 + 0.058 + (D - 0.058) / 2, 0.0742 + 0.0367), g, bevel=0.005, segments=4))
    parts.append(box('rp_nose', (W - 0.0006, 0.046, 0.0725), (0, -D / 2 + 0.023, 0.0742 + 0.03625), g, bevel=0.003))
    parts.append(box('rp_exit_body', (W - 0.006, 0.0124, 0.054), (0, -D / 2 + 0.052, 0.0742 + 0.027), g))   # solid under the shallow paper exit
    parts.append(box('rp_exit_floor', (0.118, 0.0118, 0.004), (0, -D / 2 + 0.052, 0.128), mat('slot_dark', color=(0.01, 0.01, 0.01), roughness=0.9)))
    parts.append(box('rp_tear_bar', (0.116, 0.0015, 0.007), (0, -D / 2 + 0.0445, 0.1425), m['steel']))
    for k in range(29):                                            # the tear bar's teeth
        parts.append(box('rp_tooth', (0.0016, 0.0012, 0.002), (-0.056 + k * 0.004, -D / 2 + 0.0445, 0.1465), m['steel']))
    parts.append(box('rp_strip', (0.026, 0.056, 0.004), (W / 2 - 0.017, -D / 2 + 0.094, 0.147), g, bevel=0.0015))
    parts.append(box('rp_led', (0.004, 0.004, 0.0015), (W / 2 - 0.017, -D / 2 + 0.076, 0.1495), m['led_blue']))
    parts.append(cyl('rp_feed', 0.0055, 0.003, (W / 2 - 0.017, -D / 2 + 0.104, 0.1495), m['charcoal'], verts=16))
    badge = box('rp_badge', (0.124, 0.0006, 0.064), (0, -D / 2 - 0.0003, 0.04), face_mat())
    apply(badge); ul = badge.data.uv_layers.get('UVMap') or badge.data.uv_layers.new(name='UVMap'); u0, v0, u1, v1 = DESK['rect']['printer']
    for p in badge.data.polygons:
        for li in p.loop_indices:
            co = badge.data.vertices[badge.data.loops[li].vertex_index].co
            ul.data[li].uv = (u0 + (u1 - u0) * (co.x / 0.124 + 0.5), v0 + (v1 - v0) * (co.z / 0.064 + 0.5))
    parts.append(badge)
    parts.append(box('rp_switch_well', (0.02, 0.003, 0.014), (W / 2 - 0.022, -D / 2 - 0.0012, 0.03), mat('slot_dark', color=(0.01, 0.01, 0.01), roughness=0.9)))
    sw = box('rp_rocker', (0.016, 0.004, 0.01), (W / 2 - 0.022, -D / 2 - 0.0028, 0.03), m['black'], bevel=0.001); sw.rotation_euler = (R(8), 0, 0); parts.append(sw)
    if receipt:                                                    # the last receipt, torn half off and curling
        rect, rmat, carton = receipt
        parts.append(carton('receipt', 0.078, 0.0004, 0.07, rect, rmat, (0, -D / 2 + 0.052, 0.128), (R(-16), 0, 0)))
        parts.append(carton('receipt_curl', 0.078, 0.0004, 0.04, rect, rmat, (0, -D / 2 + 0.033, 0.195), (R(-70), 0, 0)))
    place(parts, loc, (0, 0, yaw))
    # power and USB leave the back and trail off the desk's rear edge
    c, s = math.cos(yaw), math.sin(yaw)
    w = lambda x, y, z: (loc[0] + x * c - y * s, loc[1] + x * s + y * c, loc[2] + z)
    cable('rp_power', [w(-0.04, D / 2, 0.02), w(-0.04, D / 2 + 0.03, 0.006), w(-0.02, D / 2 + 0.08, 0.004), w(0.0, D / 2 + 0.12, 0.004), w(0.005, D / 2 + 0.125, -0.01)])
    cable('rp_usb', [w(0.03, D / 2, 0.025), w(0.032, D / 2 + 0.025, 0.006), w(0.02, D / 2 + 0.08, 0.004), w(0.01, D / 2 + 0.118, 0.004), w(0.008, D / 2 + 0.122, -0.01)], r=0.0018)
    grommet(w(0.005, D / 2 + 0.12, 0))


# ---------- card terminal on its swivel stand ----------
def card_terminal(m, loc, yaw=0.0):
    W, L, t0, t1 = 0.082, 0.187, 0.03, 0.046            # keypad end thinner than the screen end
    g = plastic(); face, lit = face_mat(), face_mat(True)
    body = box('term_body', (W, L, 1), (0, 0, 0), g, bevel=0.0, segments=1)
    apply(body)
    for v in body.data.vertices:                         # wedge: unit box -> t0 at -Y, t1 at +Y
        v.co.z = 0 if v.co.z < 0 else t0 + (t1 - t0) * (v.co.y + L / 2) / L
    bv = body.modifiers.new('bv', 'BEVEL'); bv.width = 0.007; bv.segments = 3; bv.limit_method = 'ANGLE'; apply(body); smooth(body)
    top = lambda y: t0 + (t1 - t0) * (y + L / 2) / L
    to_local = lambda u, v: (-W / 2 + u * W, L / 2 - v * L)
    to_print = lambda x, y: ((x + W / 2) / W, (L / 2 - y) / L)
    # the face: an inset printed panel over the whole top, the screen behind glass, raised keys
    pf = box('term_face', (W - 0.008, L - 0.008, 0.001), (0, 0, 0), face, bevel=0.0)
    apply(pf)
    for v in pf.data.vertices: v.co.z = top(v.co.y) + (0.0004 if v.co.z > 0 else -0.0004)
    project(pf, DESK['rect']['term'], to_print)
    parts = [body, pf]
    sx0, sy0 = to_local(*DESK['keys']['term_screen'][:2]); sx1, sy1 = to_local(*DESK['keys']['term_screen'][2:])
    scr = key('term_screen', sx0, sy0, sx1, sy1, top((sy0 + sy1) / 2) + 0.0002, 0.0006, lit, inset=0.0)
    project(scr, DESK['rect']['term'], to_print); parts.append(scr)
    for i, (u0, v0, u1, v1) in enumerate(DESK['keys']['term']):
        x0, y0 = to_local(u0, v0); x1, y1 = to_local(u1, v1)
        k = key(f'term_key{i}', x0, y0, x1, y1, top((y0 + y1) / 2), 0.0028, face, inset=0.0012)
        project(k, DESK['rect']['term'], to_print); parts.append(k)
    parts.append(box('term_chip_slot', (0.06, 0.004, 0.003), (0, -L / 2 + 0.001, 0.012), mat('slot_dark', color=(0.01, 0.01, 0.01), roughness=0.9)))
    # tilt toward the guest on the cradle, then stand it on the post
    place(parts, (0, 0, 0), (R(35), 0, 0))
    cradle = box('term_cradle', (0.07, 0.11, 0.006), (0, 0, -0.004), g, bevel=0.002); place([cradle], (0, 0, 0), (R(35), 0, 0)); parts.append(cradle)
    place(parts, (0, 0, 0.115))
    parts += [cyl('term_base', 0.058, 0.012, (0, 0, 0.006), g, verts=32, bevel=0.003),
              cyl('term_post', 0.013, 0.1, (0, 0, 0.062), m['charcoal'], verts=16),
              cyl('term_swivel', 0.02, 0.012, (0, 0, 0.108), g, verts=20, bevel=0.002)]
    place(parts, loc, (0, 0, yaw))
    c, s = math.cos(yaw), math.sin(yaw)
    w = lambda x, y, z: (loc[0] + x * c - y * s, loc[1] + x * s + y * c, loc[2] + z)
    cable('term_cable', [w(0, 0.05, 0.003), w(0.01, 0.12, 0.002), w(0.04, 0.2, 0.002), w(0.05, 0.3, 0.002)], r=0.002)


# ---------- desk phone ----------
def desk_phone(m, loc, yaw=math.pi):
    """IP desk phone: built for a user at -Y; yaw pi turns its face to the clerk at +Y."""
    W, L, T = 0.257, 0.229, 0.03
    g = plastic(); face, lit = face_mat(), face_mat(True)
    # print right = local -X, print top = local +Y (built facing up; the tilt leans +Y away from the user at -Y)
    to_print = lambda x, y: ((x + W / 2) / W, (L / 2 - y) / L)
    to_local = lambda u, v: (-W / 2 + u * W, L / 2 - v * L)
    body = box('ph_body', (W, L, T), (0, 0, T / 2), g, bevel=0.012, segments=4); smooth(body)
    back = box('ph_back', (W - 0.06, L - 0.07, 0.022), (0, 0.01, -0.008), g, bevel=0.01, segments=3); smooth(back)
    pf = box('ph_face', (W - 0.014, L - 0.014, 0.001), (0, 0, T + 0.0002), face); project(pf, DESK['rect']['phone'], to_print)
    parts = [body, back, pf]
    sx0, sy0 = to_local(*DESK['keys']['phone_screen'][:2]); sx1, sy1 = to_local(*DESK['keys']['phone_screen'][2:])
    scr = key('ph_screen', sx0, sy0, sx1, sy1, T + 0.0005, 0.0006, lit, inset=0.0); project(scr, DESK['rect']['phone'], to_print); parts.append(scr)
    for i, (u0, v0, u1, v1) in enumerate(DESK['keys']['phone']):
        x0, y0 = to_local(u0, v0); x1, y1 = to_local(u1, v1)
        k = key(f'ph_key{i}', x0, y0, x1, y1, T, 0.003, face, inset=0.0015); project(k, DESK['rect']['phone'], to_print); parts.append(k)
    # the handset in its cradle on the user's left (print left = local -X): ear and mouth cups down, the grip arching up
    HL = 0.215
    hs = box('ph_handset', (0.052, HL, 0.026), (0, 0, 0), g, bevel=0.011, segments=4)
    sub = hs.modifiers.new('sub', 'SUBSURF'); sub.levels = 2; apply(hs)
    for v in hs.data.vertices:
        t = v.co.y / (HL / 2)
        v.co.z += 0.012 * (1 - t * t)
        if abs(t) > 0.72: v.co.x *= 1.12; v.co.z -= 0.004 * (abs(t) - 0.72) / 0.28
    smooth(hs); hs.location = (-W / 2 + 0.036, 0, T + 0.016); parts.append(hs)
    # foot: hinged at the back, opening toward the user's far side
    foot = box('ph_foot', (0.19, 0.12, 0.008), (0, 0.055, -0.004), g, bevel=0.003)
    place([foot], (0, 0.03, -0.02), (R(-48), 0, 0)); parts.append(foot)
    tilt = R(48)                                         # the far edge (+Y) up: the face leans toward the user (-Y)
    place(parts, (0, 0, 0), (tilt, 0, 0))
    bpy.context.view_layer.update()
    lowest = min((p.matrix_world @ v.co).z for p in parts for v in p.data.vertices)
    place(parts, (0, 0, -lowest))
    place(parts, loc, (0, 0, yaw))
    # coiled cord from the handset's mouth end down to the jack on the body's lower left side
    bpy.context.view_layer.update()
    ends = sorted((hs.matrix_world @ v.co for v in hs.data.vertices), key=lambda p: p.z)
    a = min(ends, key=lambda p: (p - (body.matrix_world @ Vector((-W / 2, -L / 2, 0)))).length)
    b = body.matrix_world @ Vector((-W / 2 + 0.004, -L / 2 + 0.03, 0.006))
    ctrl = (a + b) / 2 + Vector((0, 0, -0.03)); ctrl.z = max(ctrl.z, loc[2] + 0.008)
    pts, coils, r = [], 70, 0.0055
    for i in range(coils * 10 + 1):
        t = i / (coils * 10)
        c = (1 - t) ** 2 * a + 2 * (1 - t) * t * ctrl + t * t * b
        d = (2 * (1 - t) * (ctrl - a) + 2 * t * (b - ctrl)).normalized()
        n = d.cross(Vector((0, 0, 1))); n = n.normalized() if n.length > 1e-4 else Vector((1, 0, 0))
        bb = d.cross(n)
        ang = t * coils * math.tau
        p = c + r * (math.cos(ang) * n + math.sin(ang) * bb)
        p.z = max(p.z, loc[2] + 0.0018)
        pts.append(p[:])
    cable('ph_cord', pts, r=0.0016)


# ---------- 24-inch monitor ----------
def monitor24(m, loc, yaw=math.pi, tilt=6):
    """Slim 24-inch office monitor: the screen faces -Y before yaw (yaw pi turns it to the clerk)."""
    PW, PH, PT = 0.541, 0.322, 0.009
    g = mat('monitor_black', color=(0.018, 0.018, 0.02), roughness=0.4)
    lift = 0.105                                          # bottom of the panel above the desk
    parts = [box('mon_panel', (PW, PT, PH), (0, 0, PH / 2), g, bevel=0.002)]
    aw, ah = PW - 0.014, PH - 0.007 - 0.018
    scr = box('mon_screen', (aw, 0.0006, ah), (0, -PT / 2 - 0.0002, 0.018 + ah / 2), face_mat(True))
    apply(scr); u0, v0, u1, v1 = DESK['rect']['pms']; ul = scr.data.uv_layers.get('UVMap') or scr.data.uv_layers.new(name='UVMap')
    for p in scr.data.polygons:
        for li in p.loop_indices:
            co = scr.data.vertices[scr.data.loops[li].vertex_index].co
            ul.data[li].uv = (u0 + (u1 - u0) * (co.x / aw + 0.5), v0 + (v1 - v0) * (co.z / ah + 0.5))
    parts.append(scr)
    parts.append(box('mon_logo', (0.024, 0.0005, 0.004), (0, -PT / 2 - 0.0003, 0.009), m['steel']))
    hous = box('mon_housing', (0.36, 0.034, 0.21), (0, PT / 2 + 0.016, 0.14), g, bevel=0.016, segments=4); smooth(hous); parts.append(hous)
    for k in range(9):                                    # vent slots on the housing's top
        parts.append(box('mon_vent', (0.02, 0.012, 0.0015), (-0.12 + k * 0.03, PT / 2 + 0.018, 0.2445), mat('slot_dark', color=(0.01, 0.01, 0.01), roughness=0.9)))
    place(parts, (0, 0, lift), (R(-tilt), 0, 0))
    parts += [box('mon_post', (0.05, 0.02, 0.24), (0, 0.075, 0.12), m['steel'], bevel=0.004),
              box('mon_plate', (0.23, 0.17, 0.008), (0, 0.035, 0.004), m['steel'], bevel=0.0035, segments=3),
              box('mon_hinge', (0.07, 0.04, 0.05), (0, 0.055, lift + 0.14), g, bevel=0.008)]
    place(parts, loc, (0, 0, yaw))
    c, s = math.cos(yaw), math.sin(yaw)
    w = lambda x, y, z: (loc[0] + x * c - y * s, loc[1] + x * s + y * c, loc[2] + z)
    cable('mon_power', [w(0.03, 0.04, lift + 0.08), w(0.03, 0.09, lift + 0.03), w(0.035, 0.1, 0.01), w(0.05, 0.15, 0.004), w(0.06, 0.2, 0.004), w(0.062, 0.205, -0.01)])
    cable('mon_video', [w(-0.03, 0.04, lift + 0.08), w(-0.03, 0.095, lift + 0.03), w(-0.02, 0.1, 0.008), w(0.02, 0.16, 0.004), w(0.05, 0.2, 0.004), w(0.054, 0.2, -0.01)], r=0.0026)
    grommet(w(0.058, 0.2, 0))

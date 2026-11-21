# SPDX-License-Identifier: CC0-1.0
# The switchback egress stair, built like a commercial stair tower: steel C-channel stringers, closed steel risers,
# concrete-filled pan treads with aluminium nosings and black anti-slip inserts, a concrete-filled landing with a
# channel fascia and a post, a continuous wall handrail on brackets (bottom and top extensions, returns to the wall)
# and picket guards with their own handrails on both inner edges, continuing along the floor-2 well edge.
# Same rise/run and footprint as world.js buildStairs(): 9 risers of 1.6/9 per flight over 4.5 m (0.5 m treads).
#   flight A: x 9.57..10.7, climbs north z -2 -> -6.5 (y 0 -> 1.6); landing y 1.6, z -8.43..-6.5;
#   flight B: x 10.8..11.93, climbs south z -6.5 -> -2 (y 1.6 -> 3.2).
# Origin: the stairwell floor centre, world (10.75, 0, -4.75); Blender x = X - 10.75, y = -Z - 4.75, z = Y.
#   blender -b --python projects/roadside-inn/blender/stair.py
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, uv_box, export, preview, mats, smooth
from lobby import kit, merge, OUT, SHOTS

RISE, RUN, N = 1.6 / 9, 0.5, 9
XW_A, XW_B = 9.57 - 10.75, 11.93 - 10.75          # wall faces (local x)
XI_A, XI_B = 10.705 - 10.75, 10.795 - 10.75        # inner stringer outer faces
STR_W = 0.05                                        # stringer channel width (web + flange)
CON = {'color': 'ph-hotel-concrete-color.jpg', 'normal': 'ph-hotel-concrete-normal.jpg', 'roughness': 'ph-hotel-concrete-roughness.jpg'}


def M():
    g = bpy.data.materials.get
    return {
        'steel': g('stair_steel') or material('stair_steel', color=(0.075, 0.08, 0.088), roughness=0.42),
        'rail': g('stair_rail') or material('stair_rail', color=(0.05, 0.052, 0.058), roughness=0.3),
        'conc': g('stair_concrete') or material('stair_concrete', maps=CON, roughness=0.85),
        'alu': g('stair_nosing') or material('stair_nosing', color=(0.72, 0.73, 0.75), roughness=0.35, metallic=1.0),
        'grit': g('stair_grit') or material('stair_grit', color=(0.02, 0.02, 0.022), roughness=1.0),
    }


class Flight:
    """d = horizontal distance up the flight from its first riser; h = height above floor 1."""
    def __init__(self, name, base, sign, y0, x_lo, x_hi):
        self.name, self.base, self.sign, self.y0, self.x_lo, self.x_hi = name, base, sign, y0, x_lo, x_hi

    def y(self, d):                       # local Blender y for distance d
        return self.y0 + self.sign * d

    def nose(self, d):                    # the nosing line through every tread's front edge
        return self.base + RISE * (1 + d / RUN)


A = Flight('A', 0.0, 1, -2.75, XW_A, XI_A)        # world Z = -2 - d  ->  y = d - 2.75
B = Flight('B', 1.6, -1, 1.75, XI_B, XW_B)        # world Z = -6.5 + d -> y = 1.75 - d


def prism(name, prof, x0, x1, f, mat):
    """Extrude a side profile [(d, h)] across x0..x1 in flight f's frame."""
    n = len(prof)
    v = [(x, f.y(d), h) for x in (x0, x1) for d, h in prof]
    faces = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], faces); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); me.materials.append(mat)
    return o


def stringer(f, x_out, inward, m, top_end, bottom_end):
    """C-channel: a web plate under the nosing line, flanges along its top and bottom edges facing out."""
    D = 0.3                                                  # vertical depth of the channel
    off = 0.055                                              # top edge above the nosing line
    land_top = f.base + RISE * N                             # where the flight arrives
    d_top = RUN * (N - 1)                                    # last nosing
    top = lambda d: min(f.nose(d) + off, land_top + off)
    d_b0 = RUN * ((f.base + D - off - f.base) / RISE - 1)    # bottom edge meets the lower floor
    d_b1 = RUN * ((top_end - f.base + D - off) / RISE - 1)   # bottom edge meets the upper slab's underside
    prof = [(0, f.base), (0, top(0)), (d_top, top(d_top)), (4.5, land_top + off), (4.5, top_end), (d_b1, top_end), (max(d_b0, 0.02), f.base)]
    xw0, xw1 = sorted((x_out, x_out + inward * 0.008))
    parts = [prism(f'str{f.name}_web', prof, xw0, xw1, f, m['steel'])]
    edge_top = [(0, top(0)), (d_top, top(d_top)), (4.5, land_top + off)]
    edge_bot = [(max(d_b0, 0.02), f.base), (d_b1, top_end)]
    xf0, xf1 = sorted((x_out, x_out + inward * STR_W))
    for k, edge in (('top', edge_top), ('bot', edge_bot)):
        prof_f = edge + [(d, h - 0.009) for d, h in reversed(edge)]
        parts.append(prism(f'str{f.name}_fl{k}', prof_f, xf0, xf1, f, m['steel']))
    return parts


def treads(f, m):
    x0, x1 = f.x_lo + STR_W, f.x_hi - STR_W                 # between the two stringers
    out = []
    for i in range(N):
        top = f.base + RISE * (i + 1)
        d0, d1 = RUN * i, RUN * (i + 1)
        w = x1 - x0; cx = (x0 + x1) / 2
        fill = box(f'tread{f.name}{i}', (w, d1 - d0 - 0.02, 0.04), (cx, f.y((d0 + d1 + 0.02) / 2), top - 0.02), m['conc'], bevel=0.002, segments=1)
        uv_box(fill, 0.5); out.append(fill)
        out.append(box(f'pan{f.name}{i}', (w, d1 - d0 + 0.005, 0.006), (cx, f.y((d0 + d1) / 2), top - 0.043), m['steel']))
        # aluminium nosing: a 75 mm top leg over the front edge and a 25 mm face leg, two black grit inserts
        out.append(box(f'nose{f.name}{i}', (w, 0.075, 0.006), (cx, f.y(d0 + 0.0375 - 0.012), top - 0.002), m['alu'], bevel=0.0015, segments=1))
        out.append(box(f'noseface{f.name}{i}', (w, 0.004, 0.028), (cx, f.y(d0 - 0.012), top - 0.016), m['alu']))
        for k in range(2):
            out.append(box(f'grit{f.name}{i}', (w - 0.03, 0.016, 0.0015), (cx, f.y(d0 + 0.006 + k * 0.026), top + 0.0012), m['grit']))
        # closed riser plate behind the nosing face
        lo = f.base + RISE * i
        out.append(box(f'riser{f.name}{i}', (w, 0.005, top - 0.046 - lo), (cx, f.y(d0 - 0.008), lo + (top - 0.046 - lo) / 2), m['steel']))
    return out


def rail_path(name, pts, m, r=0.02, mat='rail'):
    """A welded pipe rail through local points (mitred corners)."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o); o.data.materials.append(m[mat])
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects: ob.select_set(False)
    o.select_set(True); bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def bracket(m, at, wall_x):
    """Wall bracket: a round wall plate, an arm out to the rail's underside, a saddle."""
    x, y, z = at
    side = 1 if wall_x < x else -1
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.008, vertices=16, location=(wall_x + side * 0.004, y, z - 0.06), rotation=(0, math.radians(90), 0))
    bpy.context.object.data.materials.append(m['rail'])
    box('br_arm', (abs(x - wall_x), 0.012, 0.012), ((x + wall_x) / 2, y, z - 0.06), m['rail'])
    box('br_post', (0.012, 0.012, 0.04), (x, y, z - 0.04), m['rail'])


def wall_rail(m):
    """One continuous wall handrail: flight A's wall, round the landing on three walls, flight B's wall, with a sloped
    one-tread extension at the bottom, 0.3 m level at the top, and both ends returned to the wall."""
    H, xo = 0.9, 0.084                                             # rail height above the nosing line; centre off the wall
    xa, xb, yn = XW_A + xo, XW_B - xo, 3.68 - xo                    # 3.68 = north wall face (z -8.43)
    ya = lambda d: A.y(d); yb = lambda d: B.y(d)
    pts = [(XW_A, ya(-0.5), H), (xa, ya(-0.5), H),                 # return into the wall at the bottom
           (xa, ya(4.0), A.nose(4.0) + H), (xa, yn, A.nose(4.0) + H), (xb, yn, A.nose(4.0) + H),
           (xb, yb(-0.5), A.nose(4.0) + H), (xb, yb(4.0), B.nose(4.0) + H), (xb, yb(4.3), B.nose(4.0) + H), (XW_B, yb(4.3), B.nose(4.0) + H)]
    rail_path('wall_rail', pts, m)
    for d in (0.4, 1.9, 3.4):
        bracket(m, (xa, ya(d), A.nose(d) + H), XW_A)
        bracket(m, (xb, yb(d), B.nose(d) + H), XW_B)
    bracket(m, (xa, ya(5.5), A.nose(4.0) + H), XW_A); bracket(m, (xb, yb(-1.2), A.nose(4.0) + H), XW_B)
    # the north-wall run gets brackets off the north wall
    for x in (-0.6, 0.6):
        box('br_arm', (0.012, xo, 0.012), (x, yn + xo / 2, A.nose(4.0) + H - 0.06), m['rail'])
        box('br_post', (0.012, 0.012, 0.04), (x, yn, A.nose(4.0) + H - 0.04), m['rail'])


def guard(f, x_line, toward, m, extra_top=0.0):
    """Picket guard on a flight's inner edge: a bottom rail on the stringer, 13 mm square pickets under 100 mm apart, a
    flat top rail at 1.07 m above the nosing line, newel posts at both ends, and a round handrail at 0.9 m on brackets
    on the tread side."""
    off, G, H = 0.055, 1.07, 0.9
    d_end = 4.5 + extra_top
    gh = lambda d: min(f.nose(d), f.base + RISE * N) + G
    bh = lambda d: min(f.nose(d), f.base + RISE * N) + off
    for d in (0.0, d_end):                                          # newels, standing on what is under them
        top, z0 = gh(d) + 0.03, f.base if d == 0 else f.base + RISE * N
        box(f'newel{f.name}', (0.05, 0.05, top - z0), (x_line, f.y(d), (top + z0) / 2), m['rail'], bevel=0.003)
    d = 0.09
    while d < d_end - 0.05:
        b, t = bh(d), gh(d) - 0.012
        box(f'picket{f.name}', (0.013, 0.013, t - b), (x_line, f.y(d), (b + t) / 2), m['rail'])
        d += 0.098
    knees = [0.0, RUN * (N - 1), d_end]
    for k0, k1 in zip(knees, knees[1:]):                           # flat-bar top and bottom rails, segment by segment
        for hfun, nm in ((gh, 'top'), (bh, 'bot')):
            L = math.hypot(k1 - k0, hfun(k1) - hfun(k0))
            o = box(f'g{nm}{f.name}', (0.05 if nm == 'top' else 0.03, L, 0.012), (x_line, f.y((k0 + k1) / 2), (hfun(k0) + hfun(k1)) / 2), m['rail'])
            o.rotation_euler = (f.sign * math.atan2(hfun(k1) - hfun(k0), k1 - k0), 0, 0)
    xr = x_line + toward * 0.075                                    # the handrail, toward the treads
    hh = lambda d: min(f.nose(d), f.base + RISE * N) + H
    pts = [(xr, f.y(k), hh(k)) for k in knees]
    rail_path(f'handrail{f.name}', pts, m)
    for d in (0.5, 2.25, 4.0):
        box('hr_arm', (0.075, 0.012, 0.012), ((x_line + xr) / 2, f.y(d), hh(d) - 0.05), m['rail'])
        box('hr_post', (0.012, 0.012, 0.035), (xr, f.y(d), hh(d) - 0.035), m['rail'])
    return pts


def stair(m):
    s = M()
    for f, x_out_in, x_out_wall in ((A, XI_A, XW_A), (B, XI_B, XW_B)):
        top_end = f.base + RISE * N - 0.2                            # underside of the slab the flight lands on
        stringer(f, x_out_in, -1 if f is A else 1, s, top_end, None)       # inner: flanges toward the well
        stringer(f, x_out_wall, 1 if f is A else -1, s, top_end, None)     # outer: flanges toward the wall
        treads(f, s)
    # landing: a concrete-filled pan wall to wall, a channel fascia on its open edge, a post under the corner
    land = box('landing', (XW_B - XW_A, 3.68 - 1.75, 0.04), (0, (3.68 + 1.75) / 2, 1.58), s['conc'], bevel=0.002, segments=1); uv_box(land, 0.5)
    box('landing_pan', (XW_B - XW_A, 3.68 - 1.75, 0.008), (0, (3.68 + 1.75) / 2, 1.556), s['steel'])
    box('landing_fascia', (XW_B - XW_A, 0.009, 0.25), (0, 1.75 - 0.0045, 1.6 - 0.125), s['steel'])
    box('landing_beam', (XW_B - XW_A, 0.05, 0.2), (0, 3.6, 1.45), s['steel'])
    box('landing_post', (0.08, 0.08, 1.4), (0, 1.8, 0.7), s['steel'], bevel=0.003)
    box('landing_nose', (XI_A - XW_A - 2 * STR_W, 0.075, 0.006), ((XW_A + XI_A) / 2, 1.75 + 0.0255, 1.598), s['alu'])
    # floor-2 edge fascia where flight B lands
    box('top_fascia', (XW_B - XI_B, 0.009, 0.25), ((XI_B + XW_B) / 2, A.y(0.75) + 0.0, 3.2 - 0.125), s['steel'])
    wall_rail(s)
    guard(A, XI_A - 0.02, -1, s)                                    # A's treads lie at -x of its inner stringer
    guard(B, XI_B + 0.02, 1, s, extra_top=0.93)                    # B's guard runs on along the floor-2 well edge


if __name__ == '__main__':
    reset()
    stair(kit(mats()))
    merge()
    export(os.path.join(OUT, 'hotel-stair.glb'), 'hotel-stair')     # export first: previews are slow on a busy machine
    preview(os.path.join(SHOTS, 'hotel-stair.png'), distance=6.5, height=4.5, target=(0, 0.5, 1.5), yaw=200, samples=12)
    preview(os.path.join(SHOTS, 'hotel-stair-close.png'), distance=1.4, height=1.0, target=(-0.6, -2.0, 0.4), yaw=150, samples=16)

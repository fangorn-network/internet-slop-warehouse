# SPDX-License-Identifier: CC0-1.0
# Formula Blue lobby pieces (the current Holiday Inn Express prototype): open check-in pods (the sectional is in sofa.py),
# navy lounge chairs, a bar-height oak communal table with stools, the sundry market (glass-door cooler, shelves) and
# the open business center. Origin at floor center; front faces Blender -Y (three.js +Z).
#   blender -b --python projects/roadside-inn/blender/lobby.py -- [asset ...]     (default: all)
import bpy, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, material, box, cyl, smooth, uv_box, export, preview, mats

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'assets')
SHOTS = os.path.join(HERE, '..', '..', '..', 'artifacts', 'roadside-inn', 'blender')
R = math.radians
OAK = {'color': 'ph-hotel-oak-color.jpg', 'normal': 'ph-hotel-oak-normal.jpg', 'roughness': 'ph-hotel-oak-roughness.jpg'}
COT = {'normal': 'ph-store-cotton-normal.jpg', 'roughness': 'ph-store-cotton-roughness.jpg'}


def kit(m):
    """Formula Blue palette on top of the hotel's shared materials."""
    m['oak'] = material('oak', maps=OAK, uv_scale=1.0)
    m['solid'] = material('solid_surface', color=(0.93, 0.93, 0.92), roughness=0.28)          # white Corian-style shell
    m['gray_fabric'] = material('gray_fabric', color=(0.1, 0.11, 0.125), roughness=0.95, maps=COT, normal_strength=0.8, uv_scale=6)
    m['navy'] = material('navy_fabric', color=(0.025, 0.05, 0.13), roughness=0.95, maps=COT, normal_strength=0.8, uv_scale=6)
    m['cobalt'] = material('cobalt_fabric', color=(0.02, 0.12, 0.42), roughness=0.9, maps=COT, normal_strength=0.8, uv_scale=6)
    m['vinyl'] = material('navy_vinyl', color=(0.03, 0.06, 0.16), roughness=0.35)
    m['brushed'] = material('brushed_metal', color=(0.62, 0.63, 0.65), roughness=0.32, metallic=1.0)
    m['steel_black'] = material('black_steel', color=(0.03, 0.03, 0.035), roughness=0.45, metallic=0.7)
    m['laminate_dark'] = material('dark_laminate', color=(0.07, 0.07, 0.08), roughness=0.45)
    m['led_blue'] = material('led_blue', color=(0.1, 0.35, 1.0), roughness=0.5)
    e = m['led_blue'].node_tree.nodes['Principled BSDF']
    e.inputs['Emission Color'].default_value = (0.15, 0.4, 1.0, 1); e.inputs['Emission Strength'].default_value = 6.0
    m['lit_white'] = material('lit_panel', color=(1, 1, 1), roughness=0.5)
    e = m['lit_white'].node_tree.nodes['Principled BSDF']
    e.inputs['Emission Color'].default_value = (0.95, 0.97, 1.0, 1); e.inputs['Emission Strength'].default_value = 3.0
    return m


def flat(color, rough=0.45, name=None):
    name = name or f'c{color}'
    return bpy.data.materials.get(name) or material(name, color=color, roughness=rough)   # one material per name


def checkin_pod(m):
    """Standalone check-in pod, 1.5 m: white solid-surface shell with rounded corners, cobalt LED washing the floor from
    under the toe kick and under the top's overhang, a navy inlay band. Staff side (+Y): monitor, keycard encoder,
    receipt printer (see props.py). Guest side: card terminal."""
    W, D, H = 1.5, 0.72, 1.04
    body = box('shell', (W, D, H - 0.1), (0, 0, 0.1 + (H - 0.1) / 2), m['solid'], bevel=0.05, segments=6); smooth(body)
    box('plinth', (W - 0.12, D - 0.12, 0.1), (0, 0, 0.05), m['charcoal'])
    box('toe_led', (W - 0.14, 0.012, 0.012), (0, -(D - 0.12) / 2 - 0.008, 0.012), m['led_blue'])
    top = box('top', (W + 0.08, D + 0.12, 0.04), (0, -0.04, H + 0.02), m['solid'], bevel=0.015, segments=4); smooth(top)
    box('lip_led', (W - 0.04, 0.012, 0.01), (0, -D / 2 - 0.07, H - 0.008), m['led_blue'])
    box('band', (W + 0.004, D + 0.004, 0.05), (0, 0, 0.62), m['navy'])
    # staff side
    box('work', (W - 0.2, 0.3, 0.025), (0, D / 2 - 0.12, 0.76), m['solid'])
    import desk
    desk.monitor24(m, (-0.25, 0.1, H + 0.04))          # slim 24-inch, its PMS facing the clerk (blender/desk.py)
    # the encoder, receipt printer, card terminal and pen cup are desk props (props.py desk_items / desk_closed)


def lounge_chair(m):
    """Structured lounge chair: squared navy shell, loose seat cushion, thin brushed-metal frame legs."""
    n = m['navy']
    seat = box('seat', (0.66, 0.66, 0.13), (0, -0.02, 0.43), n, bevel=0.04, segments=5); smooth(seat)
    shell = box('back', (0.74, 0.1, 0.44), (0, 0.32, 0.66), n, bevel=0.03, segments=4); smooth(shell)
    shell.rotation_euler = (R(-6), 0, 0)
    for x in (-0.35, 0.35):
        a = box('arm', (0.08, 0.72, 0.28), (x, 0.0, 0.5), n, bevel=0.03, segments=4); smooth(a)
    box('apron', (0.74, 0.72, 0.06), (0, 0, 0.34), n, bevel=0.01)
    for x in (-0.33, 0.33):          # sled runners
        box('runner', (0.02, 0.66, 0.02), (x, 0, 0.01), m['brushed'])
        for y in (-0.31, 0.31):
            box('post', (0.02, 0.02, 0.31), (x, y, 0.165), m['brushed'])






ASSETS = {
    'hotel-checkin-pod': (checkin_pod, dict(distance=3.0, height=1.6, target=(0, 0, 0.7))),
    'hotel-lounge-chair-navy': (lounge_chair, dict(distance=1.9, height=1.1, target=(0, 0, 0.45))),
}

KEEP = ('take_', 'drawer_', 'door_', 'btn_', 'node_', 'outlet_', 'usb_', 'fridge_door')   # interactive nodes the game finds by name


def take_root(o):
    while o is not None:
        if o.name.startswith(KEEP):
            return o
        o = o.parent
    return None


def merge():
    """Join every mesh that shares a material: the cooler's 250 bottles become a handful of draw calls in three.js.
    Things you can pick up (objects named take_<noun>, with their parts parented to them) stay separate: each is
    joined into one mesh of its own, which the game lifts out as a loose prop."""
    for root in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(KEEP)]:
        parts = [root] + [c for c in root.children_recursive if c.type == 'MESH']
        for o in parts:
            bpy.context.view_layer.objects.active = o
            for mod in list(o.modifiers):
                bpy.ops.object.modifier_apply(modifier=mod.name)
        if len(parts) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in parts:
                o.select_set(True)
            bpy.context.view_layer.objects.active = root
            bpy.ops.object.join()
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and not take_root(o)]:
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        groups.setdefault(o.data.materials[0].name if o.data.materials else '', []).append(o)
    for name, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = name or 'mesh'


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in argv or ASSETS:
        build, view = ASSETS[name]
        reset()
        build(kit(mats()))
        merge()
        preview(os.path.join(SHOTS, name + '.png'), samples=24, **view)
        export(os.path.join(OUT, name + '.glb'), name)

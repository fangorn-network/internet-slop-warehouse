# SPDX-License-Identifier: CC0-1.0
# Hotel king bed: upholstered box spring, beveled mattress, cloth-simulated duvet and bed scarf, four soft pillows.
# Head of the bed is +Y in Blender (-Z in three.js). Footprint 1.93 x 2.03 m, origin at floor center.
import bpy, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import reset, out_path, material, box, smooth, uv_box, export, preview

reset()
W, L = 1.93, 2.03
cotton = {'normal': 'ph-store-cotton-normal.jpg', 'roughness': 'ph-store-cotton-roughness.jpg'}
linen = material('linen', color=(0.92, 0.92, 0.9), roughness=0.95, maps=cotton, normal_strength=0.35, uv_scale=3)
skirt = material('skirt', color=(0.33, 0.31, 0.29), roughness=0.95, maps=cotton, normal_strength=0.6, uv_scale=4)
scarf_mat = material('scarf', color=(0.11, 0.19, 0.33), roughness=0.9, maps=cotton, normal_strength=0.8, uv_scale=5)
walnut = material('walnut', maps={'color': 'ph-hotel-walnut-color.jpg', 'normal': 'ph-hotel-walnut-normal.jpg', 'roughness': 'ph-hotel-walnut-roughness.jpg'})

base = box('base', (W, L, 0.30), (0, 0, 0.06 + 0.15), skirt, bevel=0.02)
uv_box(base, 2)
for x in (-W / 2 + 0.08, W / 2 - 0.08):
    for y in (-L / 2 + 0.08, L / 2 - 0.08):
        box('leg', (0.06, 0.06, 0.06), (x, y, 0.03), walnut)
mattress = box('mattress', (W, L, 0.28), (0, 0, 0.36 + 0.14), linen, bevel=0.06, segments=5)
uv_box(mattress, 1)
smooth(mattress)
top = 0.64


def drape(name, size, z, y, mat, frames, colliders, cuts, thickness=0.02, wrinkle=0.0):
    """A cloth plane dropped onto the colliders and simulated; returns the settled mesh."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y, z))
    cloth = bpy.context.object
    cloth.name = name
    cloth.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=cuts)
    bpy.ops.uv.unwrap()
    bpy.ops.object.mode_set(mode='OBJECT')
    for c in colliders:
        if not any(m.type == 'COLLISION' for m in c.modifiers):
            c.modifiers.new('collision', 'COLLISION')
            c.collision.thickness_outer = 0.004
    sim = cloth.modifiers.new('cloth', 'CLOTH')
    sim.settings.quality = 6
    sim.settings.mass = 0.4
    sim.settings.tension_stiffness = 20
    sim.settings.bending_stiffness = 0.6
    sim.collision_settings.distance_min = 0.006
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, frames
    sim.point_cache.frame_end = frames
    for f in range(1, frames + 1):
        scene.frame_set(f)
    bpy.context.view_layer.objects.active = cloth
    bpy.ops.object.modifier_apply(modifier=sim.name)
    if wrinkle:
        wob = cloth.modifiers.new('wrinkle', 'DISPLACE'); wob.strength = wrinkle
        wob.texture = bpy.data.textures.new(name + '-w', 'CLOUDS'); wob.texture.noise_scale = 0.12
    thick = cloth.modifiers.new('solidify', 'SOLIDIFY')
    thick.thickness = thickness
    thick.offset = 1.0                                  # grow upward, away from the mattress
    sub = cloth.modifiers.new('subsurf', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 1
    cloth.data.materials.append(mat)
    smooth(cloth)
    return cloth

# The duvet covers the foot two-thirds of the bed and falls over the sides and foot.
duvet = drape('duvet', (W + 0.5, 1.75), top + 0.12, -L / 2 + 0.75, linen, 50, [mattress, base], 48, thickness=0.05, wrinkle=0.012)
# Turned-down sheet band where the duvet ends, then the scarf across the foot.
fold = box('fold', (W + 0.04, 0.32, 0.05), (0, -L / 2 + 1.62, top + 0.03), linen, bevel=0.02, segments=4)
smooth(fold)
scarf = drape('scarf', (W + 0.4, 0.5), top + 0.3, -L / 2 + 0.42, scarf_mat, 45, [duvet, mattress, base], 30, thickness=0.008)

# Pillows: subdivided boxes pulled toward ellipsoids, leaning on the headboard (two rows).
for i, (x, y, z, tilt) in enumerate([(-0.47, L / 2 - 0.2, top + 0.2, 68), (0.47, L / 2 - 0.2, top + 0.2, 68), (-0.47, L / 2 - 0.45, top + 0.12, 22), (0.47, L / 2 - 0.45, top + 0.12, 22)]):
    # Bevel first so subdivision keeps the rectangle; a gentle cast puffs the middle.
    p = box(f'pillow{i}', (0.86, 0.5, 0.17), (x, y, z), linen, bevel=0.07, segments=2)
    mod = p.modifiers.new('sub', 'SUBSURF'); mod.levels = 2
    cast = p.modifiers.new('cast', 'CAST'); cast.factor = 0.22; cast.use_x = False; cast.use_y = False
    wob = p.modifiers.new('wobble', 'DISPLACE'); wob.strength = 0.01
    wob.texture = bpy.data.textures.new(f'n{i}', 'CLOUDS'); wob.texture.noise_scale = 0.15
    p.rotation_euler = (math.radians(tilt), 0, math.radians((i % 2 - 0.5) * 4))
    smooth(p)
    # Rest it on the mattress: drop until its lowest evaluated point sinks 2 cm into the top.
    bpy.context.view_layer.update()
    ev = p.evaluated_get(bpy.context.evaluated_depsgraph_get())
    lowest = min((ev.matrix_world @ v.co).z for v in ev.to_mesh().vertices)
    p.location.z += (top - 0.02) - lowest

preview(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'artifacts', 'roadside-inn', 'blender-bed.png'), distance=3.6, height=1.7, target=(0, 0, 0.45), yaw=40)
export(out_path(os.path.join(os.path.dirname(__file__), '..', 'assets', 'hotel-king-bed.glb')), 'hotel-king-bed')

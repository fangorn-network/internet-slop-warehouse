# SPDX-License-Identifier: CC0-1.0
# Shared helpers for the hotel's Blender asset scripts. Run each script with:
#   blender -b --python projects/roadside-inn/blender/<asset>.py -- <out.glb>
# Blender is Z-up with +Y "back": glTF export turns +Y into -Z, so a bed's head at +Y faces three.js -Z.
import bpy, bmesh, os, sys, math

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HAVEN = os.path.join(REPO, 'parts', 'haven')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'


def out_path(default):
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return os.path.abspath(argv[0] if argv else default)


def image(name):
    path = os.path.join(REPO, 'parts', 'acg', name) if name.startswith('acg-') else os.path.join(HAVEN, name)
    img = bpy.data.images.load(path, check_existing=True)
    return img


def material(name, color=(0.8, 0.8, 0.8), roughness=0.6, metallic=0.0, maps=None, normal_strength=1.0, uv_scale=1.0, alpha=1.0):
    """Principled material. maps = {'color': file, 'normal': file, 'roughness': file} from parts/haven/."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if alpha < 1.0:                                   # exported as glTF alphaMode BLEND
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    maps = maps or {}
    mapping = None
    if maps and uv_scale != 1.0:
        coord = nt.nodes.new('ShaderNodeTexCoord')
        mapping = nt.nodes.new('ShaderNodeMapping')
        mapping.inputs['Scale'].default_value = (uv_scale, uv_scale, 1)
        nt.links.new(coord.outputs['UV'], mapping.inputs['Vector'])

    def tex(file, non_color):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = image(file)
        if non_color:
            t.image.colorspace_settings.name = 'Non-Color'
        if mapping:
            nt.links.new(mapping.outputs['Vector'], t.inputs['Vector'])
        return t
    if 'color' in maps:
        nt.links.new(tex(maps['color'], False).outputs['Color'], bsdf.inputs['Base Color'])
    if 'roughness' in maps:
        nt.links.new(tex(maps['roughness'], True).outputs['Color'], bsdf.inputs['Roughness'])
    if 'normal' in maps:
        n = nt.nodes.new('ShaderNodeNormalMap')
        n.inputs['Strength'].default_value = normal_strength
        nt.links.new(tex(maps['normal'], True).outputs['Color'], n.inputs['Color'])
        nt.links.new(n.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def box(name, size, location, mat=None, bevel=0.0, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'NONE'
    if mat:
        o.data.materials.append(mat)
    return o


def smooth(o, angle=40):
    o.data.shade_smooth()
    o.data.use_auto_smooth = True                 # Blender 4.0: needed by the weighted-normal modifier
    o.data.auto_smooth_angle = math.radians(angle)
    mod = o.modifiers.new('normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return o


def uv_box(o, scale=1.0):
    """Cube-project UVs so tiling textures read at a consistent real-world size."""
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=1.0 / scale)
    bpy.ops.object.mode_set(mode='OBJECT')


def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def preview(path, distance=4.0, height=1.6, target=(0, 0, 0.5), yaw=35, samples=96):
    """Cycles studio render lit by the hotel's day sky: a quick look at the asset before it goes into the game."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('preview'); scene.world = world; world.use_nodes = True
    env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(HAVEN, 'ph-hotel-farm-sky.hdr'))
    world.node_tree.links.new(env.outputs['Color'], world.node_tree.nodes['Background'].inputs['Color'])
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); floor = bpy.context.object
    floor.data.materials.append(material('floor', color=(0.35, 0.33, 0.3), roughness=0.9)); floor.name = '__floor'
    a = math.radians(yaw)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.location = (math.sin(a) * distance, -math.cos(a) * distance, height)
    scene.collection.objects.link(cam); scene.camera = cam
    track = cam.constraints.new('TRACK_TO'); tgt = bpy.data.objects.new('tgt', None); tgt.location = target
    scene.collection.objects.link(tgt); track.target = tgt
    scene.render.engine = 'CYCLES'; scene.cycles.samples = samples; scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = 640, 480
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(floor); bpy.data.objects.remove(cam); bpy.data.objects.remove(tgt)
    print(f'PREVIEW {path}')


def export(path, name):
    """Apply every modifier, parent everything under one root named `name`, export a self-contained GLB."""
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes:
        for ob in bpy.context.selected_objects:
            ob.select_set(False)
        apply_all(o)
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    for o in list(bpy.context.scene.objects):
        if o is not root and o.parent is None and o.type in ('MESH', 'EMPTY'):
            o.parent = root
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=88, export_extras=True)
    tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
    print(f'EXPORTED {path} meshes={len(meshes)} tris~{tris}')


# ---------- shared kit for the furniture scripts ----------
def mats():
    """The hotel's common materials, created once per scene."""
    cot = {'normal': 'ph-store-cotton-normal.jpg', 'roughness': 'ph-store-cotton-roughness.jpg'}
    wal = {'color': 'ph-hotel-walnut-color.jpg', 'normal': 'ph-hotel-walnut-normal.jpg', 'roughness': 'ph-hotel-walnut-roughness.jpg'}
    m = {
        'walnut': material('walnut', maps=wal),
        'walnut_dark': material('walnut_dark', maps=wal, uv_scale=0.7),     # same veneer, larger grain
        'navy_fabric': material('navy_fabric', color=(0.09, 0.14, 0.27), roughness=0.95, maps=cot, normal_strength=0.8, uv_scale=6),
        'beige_fabric': material('beige_fabric', color=(0.42, 0.36, 0.27), roughness=0.95, maps=cot, normal_strength=0.8, uv_scale=6),
        'ceramic': material('ceramic', color=(0.95, 0.95, 0.94), roughness=0.08),
        'quartz': material('quartz', color=(0.93, 0.93, 0.91), roughness=0.22),
        'chrome': material('chrome', color=(0.9, 0.9, 0.92), roughness=0.08, metallic=1.0),
        'steel': material('steel', color=(0.72, 0.73, 0.75), roughness=0.35, metallic=1.0),
        'black': material('black_plastic', color=(0.03, 0.03, 0.035), roughness=0.4),
        'charcoal': material('charcoal', color=(0.12, 0.12, 0.13), roughness=0.6),
        'beige_plastic': material('beige_plastic', color=(0.86, 0.85, 0.8), roughness=0.45),
        'white_paint': material('white_paint', color=(0.93, 0.92, 0.89), roughness=0.5),
        'brass': material('brass', color=(0.83, 0.66, 0.36), roughness=0.25, metallic=1.0),
        'mirror': material('mirror', color=(0.95, 0.95, 0.95), roughness=0.02, metallic=1.0),
        'screen': material('screen', color=(0.01, 0.01, 0.012), roughness=0.12),      # the game swaps this for a live canvas
        'glass_dark': material('glass_dark', color=(0.02, 0.02, 0.025), roughness=0.05),
        'lampshade': material('lampshade', color=(0.95, 0.91, 0.82), roughness=0.95, maps=cot, normal_strength=0.4, uv_scale=8),
        'led': material('led_warm', color=(1.0, 0.92, 0.78), roughness=0.5),
    }
    em = m['led'].node_tree.nodes['Principled BSDF']
    em.inputs['Emission Color'].default_value = (1.0, 0.9, 0.75, 1)
    em.inputs['Emission Strength'].default_value = 4.0
    return m


def cyl(name, r, h, location, mat=None, verts=32, bevel=0.0, rotation=(0, 0, 0), r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=location, rotation=rotation)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, vertices=verts, location=location, rotation=rotation)
    o = bpy.context.object
    o.name = name
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 3; mod.limit_method = 'ANGLE'
    if mat:
        o.data.materials.append(mat)
    smooth(o, 50)
    return o


def carve(target, cutter):
    """Boolean-difference `cutter` out of `target`, then delete the cutter (basins, recesses, grooves)."""
    mod = target.modifiers.new('carve', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    for m in list(target.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter)
    return target


def empty(name, location):
    """A named pivot the game can animate (fridge door hinge, etc.)."""
    e = bpy.data.objects.new(name, None)
    e.location = location
    bpy.context.scene.collection.objects.link(e)
    return e


def parent_keep(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()

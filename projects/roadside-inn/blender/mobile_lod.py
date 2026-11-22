# SPDX-License-Identifier: CC0-1.0
# Phone variants of the heaviest lobby props: the same GLB with its dense smooth meshes (upholstery, cushions, cables,
# bottle lathes, extrusions) decimated, and every texture at most 512 px. Names, materials and take_/open_ nodes are
# kept, so the game treats <id>-mobile exactly like <id>; assets.js loads it on the phone tier (MOBILE_LOD).
# Box clutter (products, paper, prints, labels) is never decimated: collapsing a carton's 12 triangles wrecks it.
#   cd projects/roadside-inn && blender -b --python blender/mobile_lod.py -- hotel-bar-stool hotel-task-chair ...
import bpy, sys, math
ids = sys.argv[sys.argv.index('--') + 1:]
SKIP = ('products', 'paper', 'print', 'lobby', 'label', 'lid', 'napkin')
MIN_TRIS, KEEP_AT_LEAST = 2500, 2000            # meshes under MIN_TRIS stay; others go down to ~30 %, never below 2000
tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
for id in ids:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f'assets/{id}.glb')
    before = after = 0
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH':
            continue
        n = tris(o); before += n
        mat = (o.data.materials[0].name if o.data.materials else '').lower()
        if n > MIN_TRIS and not any(s in mat for s in SKIP):
            bpy.context.view_layer.objects.active = o
            for s in bpy.context.selected_objects: s.select_set(False)
            o.select_set(True)
            if o.data.has_custom_normals:
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
            mod = o.modifiers.new('lod', 'DECIMATE'); mod.ratio = max(0.3, KEEP_AT_LEAST / n)
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.ops.object.shade_smooth()
            o.data.use_auto_smooth = True; o.data.auto_smooth_angle = math.radians(40)
        after += tris(o)
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > 512:
            k = 512 / max(w, h); img.scale(max(1, round(w * k)), max(1, round(h * k))); img.pack()
    out = f'assets/{id}-mobile.glb'
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88, export_extras=True)
    print(f'MOBILE {out} tris {before} -> {after}')

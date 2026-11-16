# SPDX-License-Identifier: CC0-1.0
# Re-export a GLB with every texture scaled to at most N pixels (geometry and materials unchanged).
#   blender -b --python shrink_textures.py -- in.glb out.glb 1024
import bpy, sys
src, dst, size = sys.argv[sys.argv.index('--') + 1:][:3]
size = int(size)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > size:
        k = size / max(w, h)
        img.scale(max(1, round(w * k)), max(1, round(h * k)))
        img.pack()                       # keep the resized pixels for export
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88)
print('SHRUNK', dst, [img.size[:] for img in bpy.data.images])

"""Builds the nine Anduin workflow stations in Blender (5.x) and exports one GLB per module.

Run inside Blender:  exec(open(r"<repo>/design/blender/build_modules.py").read())
Then call build_all() and export_all(r"<repo>/public/3d").

Scene organisation follows design/references/ui-3.json: CAMERA, LIGHTS, STAGE and MODULE_01_INTAKE ...
MODULE_09_PDF_QA_EXPORT. Each module has one root empty (origin at the base centre), principal geometry,
optional PROP_* parts used for hover cues in the web app, and shared materials. Interface text and contract
excerpts are not baked into meshes; only object identity marks (W, PDF, quote marks, arrows) are modelled.
Geometry is an interpretation of the single-view reference stills in design/components-3d/.
"""
import math
import bpy
import bmesh
from mathutils import Vector

# ---------------------------------------------------------------- materials
PALETTE = {
    "blue_resin": dict(color=(0.07, 0.36, 0.95), rough=0.12, transmission=0.35, coat=1.0),
    "blue_deep": dict(color=(0.03, 0.18, 0.62), rough=0.2, coat=0.8),
    "mint_resin": dict(color=(0.30, 0.82, 0.74), rough=0.18, coat=0.8),
    "mint_glow": dict(color=(0.45, 0.95, 0.88), rough=0.3, emission=0.6),
    "white": dict(color=(0.93, 0.95, 0.98), rough=0.35),
    "paper": dict(color=(0.97, 0.98, 1.0), rough=0.55),
    "line_gray": dict(color=(0.72, 0.76, 0.82), rough=0.6),
    "line_blue": dict(color=(0.28, 0.62, 0.98), rough=0.5),
    "line_mint": dict(color=(0.35, 0.85, 0.72), rough=0.5),
    "cream": dict(color=(0.88, 0.85, 0.78), rough=0.55),
    "screen": dict(color=(0.03, 0.05, 0.09), rough=0.08, coat=1.0),
    "screen_blue": dict(color=(0.25, 0.55, 1.0), rough=0.4, emission=1.2),
    "screen_mint": dict(color=(0.45, 0.95, 0.85), rough=0.4, emission=1.2),
    "glass": dict(color=(0.85, 0.93, 1.0), rough=0.02, transmission=1.0, alpha=0.35),
    "red": dict(color=(0.89, 0.18, 0.2), rough=0.3, coat=0.5),
    "navy": dict(color=(0.02, 0.07, 0.3), rough=0.15, coat=1.0),
    "gray": dict(color=(0.55, 0.6, 0.68), rough=0.4),
}


def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    p = PALETTE[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*p["color"], 1)
    b.inputs["Roughness"].default_value = p.get("rough", 0.4)
    if "Transmission Weight" in b.inputs:
        b.inputs["Transmission Weight"].default_value = p.get("transmission", 0.0)
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = p.get("coat", 0.0)
    if p.get("emission"):
        b.inputs["Emission Color"].default_value = (*p["color"], 1)
        b.inputs["Emission Strength"].default_value = p["emission"]
    if p.get("alpha") is not None:
        b.inputs["Alpha"].default_value = p["alpha"]
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    m.diffuse_color = (*p["color"], 1)
    return m


# ---------------------------------------------------------------- primitives
def _link(obj, parent, coll):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def rbox(name, size, loc, parent, coll, material, bevel=0.06, rot=(0, 0, 0), segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = min(bevel, min(size) * 0.49)
        m.segments = segments
        m.limit_method = "NONE"
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    o.data.materials.append(mat(material))
    bpy.ops.object.shade_smooth()
    return _link(o, parent, coll)


def cyl(name, r, depth, loc, parent, coll, material, rot=(0, 0, 0), verts=40, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    o.data.materials.append(mat(material))
    bpy.ops.object.shade_smooth()
    return _link(o, parent, coll)


def torus(name, R, r, loc, parent, coll, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=20, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    o.data.materials.append(mat(material))
    bpy.ops.object.shade_smooth()
    return _link(o, parent, coll)


def sphere(name, r, loc, parent, coll, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=32, ring_count=16, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.location = loc
    o.data.materials.append(mat(material))
    bpy.ops.object.shade_smooth()
    return _link(o, parent, coll)


def glyph(name, text, size, loc, parent, coll, material, rot=(90, 0, 0), extrude=0.02, font_bold=True):
    bpy.ops.object.text_add(location=(0, 0, 0))
    o = bpy.context.active_object
    o.data.body = text
    o.data.size = size
    o.data.extrude = extrude
    o.data.align_x = "CENTER"
    o.data.align_y = "CENTER"
    if font_bold:
        for path in ("C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
            try:
                o.data.font = bpy.data.fonts.load(path, check_existing=True)
                break
            except Exception:
                pass
    o.name = name
    o.rotation_euler = [math.radians(a) for a in rot]
    o.location = loc
    o.data.materials.append(mat(material))
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    o.name = name
    return _link(o, parent, coll)


def tube(name, points, radius, parent, coll, material):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 6
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    o = bpy.data.objects.new(name, curve)
    coll.objects.link(o)
    o.data.materials.append(mat(material))
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects:
        s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    if parent:
        o.parent = parent
    return o


def sheet_lines(prefix, w, h, loc, parent, coll, rows=6, accents=(), rot=(-10, 0, 0), thickness=0.03, paper="paper"):
    """A sheet with rounded corners and inset text bars (gray, with optional blue/mint accent rows)."""
    root = bpy.data.objects.new(prefix, None)
    coll.objects.link(root)
    root.parent = parent
    root.location = loc
    root.rotation_euler = [math.radians(a) for a in rot]
    rbox(prefix + "_paper", (w, thickness, h), (0, 0, 0), root, coll, paper, bevel=0.035)
    top = h / 2 - h * 0.16
    for i in range(rows):
        frac = 0.62 if i % 3 == 2 else 0.78
        col = dict(accents).get(i, "line_gray")
        rbox(f"{prefix}_line{i}", (w * frac, 0.012, h * 0.045), (-w * (1 - frac) / 2 + w * 0.0, -thickness / 2 - 0.004, top - i * h * 0.12), root, coll, col, bevel=0.01)
    return root


def new_module(name, x=0.0):
    coll = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    root = bpy.data.objects.new(name.replace("MODULE_", "ROOT_"), None)
    coll.objects.link(root)
    root.location = (x, 0, 0)
    return root, coll


def base(root, coll, w=2.2, d=1.6, h=0.18):
    return rbox(root.name + "_BASE", (w, d, h), (0, 0, h / 2), root, coll, "white", bevel=0.09)


# ---------------------------------------------------------------- modules
def m01_intake(x=0):
    root, c = new_module("MODULE_01_INTAKE", x)
    tray = bpy.data.objects.new("TRAY", None)
    c.objects.link(tray)
    tray.parent = root
    # open box tray: floor + four walls in blue resin
    rbox("tray_floor", (1.5, 1.1, 0.1), (0, 0, 0.05), tray, c, "blue_resin", bevel=0.04)
    rbox("tray_back", (1.5, 0.1, 0.55), (0, 0.5, 0.32), tray, c, "blue_resin", bevel=0.04)
    rbox("tray_front", (1.5, 0.1, 0.38), (0, -0.5, 0.24), tray, c, "blue_resin", bevel=0.04)
    rbox("tray_left", (0.1, 1.1, 0.48), (-0.7, 0, 0.28), tray, c, "blue_resin", bevel=0.04)
    rbox("tray_right", (0.1, 1.1, 0.48), (0.7, 0, 0.28), tray, c, "blue_resin", bevel=0.04)
    for i in range(3):
        sheet_lines(f"sheet{i}", 1.0, 1.25, (-0.12 + i * 0.08, 0.15 - i * 0.12, 0.72 + i * 0.03), tray, c, rows=6, rot=(-14 + i * 3, 0, -6 + i * 4))
    prop = bpy.data.objects.new("PROP_sheet", None)
    c.objects.link(prop)
    prop.parent = tray
    sheet_lines("sheet_top", 1.0, 1.25, (0.05, -0.12, 0.8), prop, c, rows=6, rot=(-18, 0, 2))
    tile = rbox("upload_tile", (0.72, 0.28, 0.72), (0.62, -0.55, 0.42), tray, c, "mint_resin", bevel=0.12)
    glyph("upload_arrow", "↑", 0.75, (0.62, -0.7, 0.4), tray, c, "white", rot=(90, 0, 0), extrude=0.05)
    return root


def m02_source(x=0):
    root, c = new_module("MODULE_02_SOURCE_QUALITY", x)
    rbox("holder", (1.8, 1.0, 0.22), (0, 0, 0.11), root, c, "blue_resin", bevel=0.08)
    word = sheet_lines("word_sheet", 0.95, 1.2, (-0.42, 0.1, 0.8), root, c, rows=6, rot=(-10, 0, 10))
    rbox("word_badge", (0.36, 0.06, 0.36), (-0.2, -0.06, 0.32), word, c, "blue_deep", bevel=0.06)
    glyph("word_W", "W", 0.28, (-0.2, -0.1, 0.32), word, c, "white", rot=(90, 0, 0))
    pdf = sheet_lines("pdf_sheet", 0.95, 1.2, (0.48, 0.2, 0.82), root, c, rows=6, rot=(-10, 0, -10))
    rbox("pdf_badge", (0.42, 0.06, 0.3), (0.1, -0.06, 0.32), pdf, c, "red", bevel=0.06)
    glyph("pdf_text", "PDF", 0.16, (0.1, -0.1, 0.32), pdf, c, "white", rot=(90, 0, 0))
    lens = bpy.data.objects.new("PROP_lens", None)
    c.objects.link(lens)
    lens.parent = root
    lens.location = (0.05, -0.55, 0.62)
    torus("lens_ring", 0.32, 0.06, (0, 0, 0), lens, c, "blue_resin", rot=(90, 0, 0))
    cyl("lens_glass", 0.3, 0.02, (0, 0, 0), lens, c, "glass", rot=(90, 0, 0))
    cyl("lens_handle", 0.07, 0.55, (0.42, -0.05, -0.38), lens, c, "blue_resin", rot=(0, 135, 0), bevel=0.02)
    return root


def m03_map(x=0):
    root, c = new_module("MODULE_03_DOCUMENT_MAP", x)
    nodes = [(-0.55, 0.2, 1.2, "blue_resin"), (0.0, 0.25, 1.55, "mint_resin"), (0.55, 0.15, 1.15, "blue_resin"), (-0.15, -0.05, 0.6, "mint_resin"), (-0.75, -0.2, 0.45, "blue_resin")]
    pos = []
    for i, (nx, ny, nz, m) in enumerate(nodes):
        name = "PROP_node" if i == 1 else f"node{i}"
        rbox(name, (0.38, 0.38, 0.38), (nx, ny, nz), root, c, m, bevel=0.07)
        pos.append(Vector((nx, ny, nz)))
    for a, b in [(0, 1), (1, 2), (0, 3), (3, 4)]:
        pa, pb = pos[a], pos[b]
        mid = Vector((pa.x, pa.y, pb.z)) if a == 0 and b == 3 else Vector((pa.x, pa.y, pa.z + 0.0))
        tube(f"link{a}{b}", [pa, Vector((pa.x, pa.y, (pa.z + pb.z) / 2 + 0.25)), Vector((pb.x, pb.y, (pa.z + pb.z) / 2 + 0.25)), pb], 0.035, root, c, "gray")
    card = sheet_lines("outline_slab", 0.85, 0.95, (0.6, -0.35, 0.55), root, c, rows=5, accents=[(0, "line_blue"), (1, "line_blue"), (3, "line_blue")], rot=(-12, 0, -10), thickness=0.08, paper="white")
    return root


def m04_review(x=0):
    root, c = new_module("MODULE_04_LEGAL_REVIEW", x)
    # keyboard base
    rbox("kb_base", (2.0, 1.45, 0.24), (0, -0.1, 0.12), root, c, "blue_resin", bevel=0.1)
    rbox("kb_deck", (1.55, 0.78, 0.06), (0.05, -0.38, 0.27), root, c, "blue_deep", bevel=0.04)
    keys = bpy.data.objects.new("keys", None)
    c.objects.link(keys)
    keys.parent = root
    for r in range(4):
        for k in range(6):
            rbox(f"key_{r}_{k}", (0.16, 0.16, 0.11), (-0.42 + k * 0.19 + (r % 2) * 0.04, -0.66 + r * 0.17, 0.35 + r * 0.01), keys, c, "cream", bevel=0.035)
    rbox("key_space", (0.95, 0.16, 0.1), (0.0, -0.84, 0.34), keys, c, "cream", bevel=0.04)
    for i in range(3):
        rbox(f"key_side_l{i}", (0.2, 0.16, 0.12), (-0.78, -0.72 + i * 0.2, 0.35), keys, c, "blue_resin", bevel=0.04)
        rbox(f"key_side_r{i}", (0.24, 0.16, 0.12), (0.85, -0.7 + i * 0.2, 0.35), keys, c, "blue_resin", bevel=0.04)
    # CRT
    crt = bpy.data.objects.new("CRT", None)
    c.objects.link(crt)
    crt.parent = root
    crt.location = (-0.05, 0.38, 0.28)
    rbox("crt_back", (1.05, 0.8, 0.9), (0, 0.45, 0.62), crt, c, "blue_resin", bevel=0.18)
    rbox("crt_body", (1.45, 0.62, 1.12), (0, -0.05, 0.66), crt, c, "blue_resin", bevel=0.14)
    rbox("crt_bezel", (1.22, 0.06, 0.9), (0, -0.37, 0.7), crt, c, "blue_deep", bevel=0.1)
    rbox("crt_screen", (1.04, 0.06, 0.74), (0, -0.4, 0.72), crt, c, "screen", bevel=0.1)
    rbox("crt_neck", (0.6, 0.3, 0.14), (0, -0.3, 0.06), crt, c, "blue_deep", bevel=0.05)
    for i, xo in enumerate((-0.18, 0.12, 0.24)):
        cyl(f"knob{i}", 0.055, 0.06, (xo, -0.42, 0.13), crt, c, "gray" if i else "navy", rot=(90, 0, 0))
    prop = bpy.data.objects.new("PROP_quote", None)
    c.objects.link(prop)
    prop.parent = crt
    prop.location = (0, -0.44, 0.72)
    glyph("quote_mark", "“", 0.42, (-0.33, 0, 0.12), prop, c, "screen_mint", rot=(90, 0, 0), extrude=0.01)
    rbox("bar_blue", (0.62, 0.02, 0.08), (0.03, 0, 0.02), prop, c, "screen_blue", bevel=0.03)
    rbox("bar_mint", (0.55, 0.02, 0.08), (0.0, 0, -0.13), prop, c, "screen_mint", bevel=0.03)
    rbox("bar_small", (0.14, 0.02, 0.05), (-0.29, 0, -0.27), prop, c, "screen_mint", bevel=0.02)
    # coiled cable around the front-left corner
    pts = []
    turns = 26
    for i in range(turns * 14 + 1):
        t = i / (turns * 14)
        ang = math.radians(200 - 150 * t)
        cx, cy = -0.4 + 1.05 * math.cos(ang), -0.25 + 0.95 * math.sin(ang)
        tang = Vector((-math.sin(ang), math.cos(ang), 0))
        nrm = Vector((math.cos(ang), math.sin(ang), 0))
        phase = 2 * math.pi * turns * t
        off = nrm * math.cos(phase) * 0.09 + Vector((0, 0, 1)) * math.sin(phase) * 0.09
        pts.append(Vector((cx, cy, 0.13)) + off)
    tube("cable", pts, 0.03, root, c, "cream")
    # source sheet with magnifier
    doc = sheet_lines("source_sheet", 0.95, 1.2, (1.0, 0.65, 0.95), root, c, rows=7, accents=[(3, "line_blue"), (5, "line_mint")], rot=(-8, 0, -14))
    rbox("sheet_stand", (0.7, 0.35, 0.22), (1.05, 0.5, 0.36), root, c, "white", bevel=0.06)
    lens = bpy.data.objects.new("lens", None)
    c.objects.link(lens)
    lens.parent = root
    lens.location = (1.25, 0.25, 1.0)
    torus("lens_ring", 0.3, 0.055, (0, 0, 0), lens, c, "blue_resin", rot=(90, 0, -18))
    cyl("lens_glass", 0.28, 0.02, (0, 0, 0), lens, c, "glass", rot=(90, 0, -18))
    cyl("lens_handle", 0.065, 0.5, (0.35, -0.1, -0.38), lens, c, "blue_resin", rot=(0, 135, 0), bevel=0.02)
    return root


def m05_report(x=0):
    root, c = new_module("MODULE_05_DECISION_REPORT", x)
    sheet_lines("report", 1.0, 1.3, (0.35, 0.45, 0.85), root, c, rows=7, rot=(-10, 0, -8))
    stamp = bpy.data.objects.new("PROP_stamp", None)
    c.objects.link(stamp)
    stamp.parent = root
    stamp.location = (-0.35, -0.15, 0)
    rbox("stamp_pad", (0.9, 0.7, 0.2), (0, 0, 0.1), stamp, c, "blue_resin", bevel=0.05)
    cyl("stamp_neck", 0.11, 0.35, (0, 0, 0.38), stamp, c, "navy")
    sphere("stamp_knob", 0.24, (0, 0, 0.72), stamp, c, "navy", scale=(1, 1, 1.1))
    bubble = rbox("bubble", (0.8, 0.22, 0.6), (0.55, -0.35, 0.55), root, c, "mint_resin", bevel=0.18)
    for i in range(3):
        sphere(f"dot{i}", 0.06, (0.33 + i * 0.22, -0.48, 0.56), root, c, "white")
    return root


def m06_annotation(x=0):
    root, c = new_module("MODULE_06_ANNOTATION", x)
    rbox("slab", (1.5, 1.2, 0.16), (-0.35, 0, 0.5), root, c, "white", bevel=0.06, rot=(18, 0, 0))
    sel = bpy.data.objects.new("selection", None)
    c.objects.link(sel)
    sel.parent = root
    sel.location = (-0.35, -0.05, 0.58)
    sel.rotation_euler = (math.radians(18), 0, 0)
    for i in range(4):
        rbox(f"slab_line{i}", (0.95 if i % 2 else 1.1, 0.06, 0.02), (-0.05, 0.4 - i * 0.2, 0.04), sel, c, "line_blue" if 1 <= i <= 2 else "line_gray", bevel=0.01)
    rbox("sel_box", (1.15, 0.5, 0.02), (0, -0.05, 0.05), sel, c, "glass", bevel=0.02)
    pen = bpy.data.objects.new("PROP_stylus", None)
    c.objects.link(pen)
    pen.parent = root
    pen.location = (0.2, 0.0, 1.1)
    pen.rotation_euler = (0, math.radians(-50), math.radians(35))
    cyl("stylus_body", 0.075, 1.1, (0, 0, 0), pen, c, "blue_resin", bevel=0.03)
    bpy.ops.mesh.primitive_cone_add(radius1=0.075, depth=0.18, location=(0, 0, -0.64))
    tip = bpy.context.active_object
    tip.name = "stylus_tip"
    tip.rotation_euler = (math.radians(180), 0, 0)
    tip.data.materials.append(mat("navy"))
    _link(tip, pen, c)
    for i, (m, shape) in enumerate([("mint_resin", "box"), ("blue_resin", "ring"), ("blue_resin", "check")]):
        chip = rbox(f"chip{i}", (0.65, 0.1, 0.28), (0.85, -0.2 - i * 0.05, 0.95 - i * 0.33), root, c, "white", bevel=0.07)
        if shape == "box":
            rbox(f"chip{i}_mark", (0.14, 0.05, 0.14), (0.62, -0.27, 0.95), root, c, m, bevel=0.03)
        elif shape == "ring":
            torus(f"chip{i}_mark", 0.07, 0.022, (0.62, -0.32, 0.62), root, c, m, rot=(90, 0, 0))
        else:
            rbox(f"chip{i}_mark", (0.15, 0.05, 0.15), (0.62, -0.37, 0.29), root, c, m, bevel=0.03)
    return root


def m07_form(x=0):
    root, c = new_module("MODULE_07_FORM_PREVIEW", x)
    rbox("frame", (1.2, 0.3, 1.45), (0, 0.15, 0.75), root, c, "blue_resin", bevel=0.14, rot=(-8, 0, 0))
    rbox("panel", (1.0, 0.1, 1.25), (0, -0.02, 0.76), root, c, "white", bevel=0.08, rot=(-8, 0, 0))
    for i in range(2):
        rbox(f"field{i}", (0.7, 0.06, 0.1), (0, -0.09, 1.18 - i * 0.2), root, c, "line_gray", bevel=0.03, rot=(-8, 0, 0))
    torus("radio0", 0.07, 0.025, (-0.28, -0.1, 0.62), root, c, "mint_resin", rot=(82, 0, 0))
    sphere("radio1", 0.08, (-0.28, -0.12, 0.42), root, c, "mint_resin", scale=(1, 0.5, 1))
    rbox("line_a", (0.3, 0.05, 0.06), (0.05, -0.1, 0.62), root, c, "line_gray", bevel=0.02, rot=(-8, 0, 0))
    rbox("line_b", (0.3, 0.05, 0.06), (0.05, -0.12, 0.42), root, c, "line_gray", bevel=0.02, rot=(-8, 0, 0))
    rbox("toggle", (0.18, 0.06, 0.12), (0.33, -0.1, 0.62), root, c, "white", bevel=0.04, rot=(-8, 0, 0))
    rbox("PROP_field", (0.18, 0.08, 0.14), (0.33, -0.14, 0.42), root, c, "mint_resin", bevel=0.05, rot=(-8, 0, 0))
    return root


def m08_responses(x=0):
    root, c = new_module("MODULE_08_RESPONSES", x)
    rbox("panel_back", (1.3, 0.2, 0.8), (-0.1, 0.35, 0.75), root, c, "blue_resin", bevel=0.1, rot=(-12, 0, 0))
    for i in range(2):
        rbox(f"field_tile{i}", (0.85, 0.1, 0.2), (-0.1, 0.22, 0.95 - i * 0.3), root, c, "white", bevel=0.06, rot=(-12, 0, 0))
    rbox("keypad", (1.6, 1.0, 0.24), (0, -0.25, 0.12), root, c, "cream", bevel=0.1)
    for r in range(4):
        for k in range(7):
            name = "PROP_key" if (r, k) == (2, 3) else f"pkey_{r}_{k}"
            rbox(name, (0.16, 0.16, 0.1), (-0.58 + k * 0.19, -0.6 + r * 0.2, 0.3), root, c, "white", bevel=0.035)
    pen = bpy.data.objects.new("pencil", None)
    c.objects.link(pen)
    pen.parent = root
    pen.location = (0.62, 0.2, 0.95)
    pen.rotation_euler = (0, math.radians(-20), math.radians(20))
    cyl("pencil_body", 0.07, 1.0, (0, 0, 0), pen, c, "mint_resin", bevel=0.02)
    return root


def m09_export(x=0):
    root, c = new_module("MODULE_09_PDF_QA_EXPORT", x)
    for i in range(2):
        sheet_lines(f"pdf_sheet{i}", 0.95, 1.2, (-0.25 + i * 0.12, 0.35 - i * 0.12, 0.75), root, c, rows=6, rot=(-10, 0, 6 - i * 4))
    rbox("pdf_badge", (0.5, 0.06, 0.34), (-0.18, 0.12, 0.98), root, c, "red", bevel=0.06, rot=(-10, 0, 2))
    glyph("pdf_text", "PDF", 0.2, (-0.18, 0.07, 0.98), root, c, "white", rot=(80, 0, 2))
    lens = bpy.data.objects.new("lens", None)
    c.objects.link(lens)
    lens.parent = root
    lens.location = (0.62, -0.05, 1.05)
    torus("lens_ring", 0.3, 0.055, (0, 0, 0), lens, c, "blue_resin", rot=(90, 0, 10))
    cyl("lens_glass", 0.28, 0.02, (0, 0, 0), lens, c, "glass", rot=(90, 0, 10))
    cyl("lens_handle", 0.065, 0.5, (0.32, -0.1, -0.38), lens, c, "blue_resin", rot=(0, 135, 0), bevel=0.02)
    arrow = bpy.data.objects.new("PROP_arrow", None)
    c.objects.link(arrow)
    arrow.parent = root
    arrow.location = (0.25, -0.5, 0.42)
    rbox("arrow_tile", (0.75, 0.35, 0.75), (0, 0, 0), arrow, c, "blue_resin", bevel=0.13)
    glyph("arrow_glyph", "↓", 0.75, (0, -0.19, -0.02), arrow, c, "white", rot=(90, 0, 0), extrude=0.05)
    return root


BUILDERS = [m01_intake, m02_source, m03_map, m04_review, m05_report, m06_annotation, m07_form, m08_responses, m09_export]


def clear_modules():
    for coll in list(bpy.data.collections):
        if coll.name.startswith("MODULE_"):
            for o in list(coll.objects):
                bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.collections.remove(coll)
    for o in list(bpy.data.objects):
        if o.name in ("Cube",) and o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)


def setup_studio():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.resolution_x = 800
    sc.render.resolution_y = 800
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.82, 0.88, 0.96, 1)
    bg.inputs["Strength"].default_value = 0.55
    lights = bpy.data.collections.get("LIGHTS") or bpy.data.collections.new("LIGHTS")
    if lights.name not in sc.collection.children:
        sc.collection.children.link(lights)
    for name, loc, energy, size in [("KEY", (-4, -5, 6), 900, 5), ("FILL", (5, -3, 3), 350, 6), ("RIM", (0, 5, 5), 500, 4)]:
        light = bpy.data.objects.get(name)
        if not light:
            data = bpy.data.lights.new(name, "AREA")
            light = bpy.data.objects.new(name, data)
            lights.objects.link(light)
        light.data.energy = energy
        light.data.size = size
        light.location = loc
        light.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cams = bpy.data.collections.get("CAMERA") or bpy.data.collections.new("CAMERA")
    if cams.name not in sc.collection.children:
        sc.collection.children.link(cams)
    cam = bpy.data.objects.get("Camera")
    if cam:
        for c in cam.users_collection:
            c.objects.unlink(cam)
        cams.objects.link(cam)
        cam.data.lens = 50
        sc.camera = cam


def frame_module(root):
    """Places the camera at the shared elevated three-quarter view around one module."""
    cam = bpy.context.scene.camera
    target = root.matrix_world.translation + Vector((0, 0, 0.75))
    cam.location = target + Vector((-2.4, -5.6, 2.9))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    for coll in bpy.data.collections:
        if coll.name.startswith("MODULE_"):
            coll.hide_render = not any(o == root for o in coll.objects)


def build_all(spacing=4.0):
    clear_modules()
    setup_studio()
    roots = [b(x=i * spacing) for i, b in enumerate(BUILDERS)]
    return [r.name for r in roots]


def export_all(out_dir):
    import os

    os.makedirs(out_dir, exist_ok=True)
    done = []
    for coll in sorted([c for c in bpy.data.collections if c.name.startswith("MODULE_")], key=lambda c: c.name):
        root = next(o for o in coll.objects if o.name.startswith("ROOT_"))
        saved = root.location.copy()
        root.location = (0, 0, 0)
        bpy.ops.object.select_all(action="DESELECT")
        for o in coll.objects:
            o.select_set(True)
        n = coll.name.split("_")[1]
        path = os.path.join(out_dir, f"module-{n}.glb")
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_format="GLB", export_draco_mesh_compression_enable=True, export_yup=True, export_cameras=False, export_lights=False)
        root.location = saved
        done.append((path, os.path.getsize(path)))
    return done

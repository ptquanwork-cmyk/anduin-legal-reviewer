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


def node(name, parent, coll, loc=(0, 0, 0), rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    coll.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    return o


def round_poly(pts, radius, seg=6):
    """Fillets the corners of a closed 2D polygon; radius is one value or one per corner (0 keeps it sharp)."""
    radii = radius if isinstance(radius, (list, tuple)) else [radius] * len(pts)
    out = []
    for i, p in enumerate(pts):
        p, a, b = Vector(p), Vector(pts[i - 1]), Vector(pts[(i + 1) % len(pts)])
        u, v = a - p, b - p
        half = u.angle(v) / 2
        if radii[i] <= 0 or half > math.pi / 2 - 1e-3:
            out.append(p)
            continue
        d = min(radii[i] / math.tan(half), u.length / 2, v.length / 2)
        r = d * math.tan(half)
        u.normalize()
        v.normalize()
        c = p + (u + v).normalized() * (r / math.sin(half))
        t1, t2 = p + u * d - c, p + v * d - c
        a1 = math.atan2(t1.y, t1.x)
        sweep = (math.atan2(t2.y, t2.x) - a1 + math.pi) % (2 * math.pi) - math.pi
        out += [c + Vector((math.cos(a1 + sweep * k / seg), math.sin(a1 + sweep * k / seg))) * r for k in range(seg + 1)]
    # adjoining fillets can meet in one point (pill ends); drop the duplicate
    out = [q for k, q in enumerate(out) if (q - out[k - 1]).length > 1e-6]
    return [(q.x, q.y) for q in out]


def _mesh_obj(name, bm, parent, coll, material, loc, rot, bevel, segments=3):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    me.materials.append(mat(material))
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segments
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(40)
        m.harden_normals = True
    return o


def prism(name, outline, depth, loc, parent, coll, material, rot=(0, 0, 0), bevel=0.02):
    """Extrudes a closed 2D outline (x, z) by depth along y; the front face looks towards -y like the sheets."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in outline]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in outline]
    bm.faces.new(front)
    bm.faces.new(back[::-1])
    for i in range(len(outline)):
        j = (i + 1) % len(outline)
        bm.faces.new((front[i], front[j], back[j], back[i]))
    return _mesh_obj(name, bm, parent, coll, material, loc, rot, bevel)


def rect(w, h):
    return [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]


def rslab(name, w, h, t, r, loc, parent, coll, material, rot=(0, 0, 0), bevel=None):
    """Slab with rounded corners (w across, h up, t deep): sheets, tiles, badges, panels."""
    return prism(name, round_poly(rect(w, h), r), t, loc, parent, coll, material, rot, min(t * 0.4, 0.05) if bevel is None else bevel)


def tray(name, w, d, h_front, h_back, wall, floor, r, loc, parent, coll, material, bevel=0.04):
    """Open tray with thick rounded walls; the rim slopes from the back wall down to the front."""
    outer = round_poly(rect(w, d), r, seg=8)
    inner = round_poly(rect(w - 2 * wall, d - 2 * wall), r - wall, seg=8)
    rim = lambda y: h_front + (h_back - h_front) * (y + d / 2) / d
    bm = bmesh.new()
    ob = [bm.verts.new((x, y, 0)) for x, y in outer]
    ot = [bm.verts.new((x, y, rim(y))) for x, y in outer]
    it = [bm.verts.new((x, y, rim(y))) for x, y in inner]
    ib = [bm.verts.new((x, y, floor)) for x, y in inner]
    for i in range(len(outer)):
        j = (i + 1) % len(outer)
        for lo, hi in ((ob, ot), (ot, it), (it, ib)):
            bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bm.faces.new(ib)
    bm.faces.new(ob[::-1])
    return _mesh_obj(name, bm, parent, coll, material, loc, (0, 0, 0), bevel)


def lathe(name, profile, loc, parent, coll, material, verts=48):
    """Revolves an (r, z) profile around z; a radius of 0 closes that end."""
    bm = bmesh.new()
    ring = lambda r, z: [bm.verts.new((r * math.cos(2 * math.pi * k / verts), r * math.sin(2 * math.pi * k / verts), z)) for k in range(verts)] if r > 0 else [bm.verts.new((0, 0, z))]
    rings = [ring(r, z) for r, z in profile]
    for a, b in zip(rings, rings[1:]):
        for k in range(verts):
            q = (k + 1) % verts
            if len(a) == 1:
                bm.faces.new((a[0], b[q], b[k]))
            elif len(b) == 1:
                bm.faces.new((a[k], a[q], b[0]))
            else:
                bm.faces.new((a[k], a[q], b[q], b[k]))
    for end in (rings[0], rings[-1]):
        if len(end) > 1:
            bm.faces.new(end)
    return _mesh_obj(name, bm, parent, coll, material, loc, (0, 0, 0), 0)


def arrow_outline(w=0.46, h=0.5, shaft=0.2, head=0.24, down=False):
    """Block arrow (up, or down) with softened corners, as on the upload and download tiles."""
    s = -1 if down else 1
    pts = [(-shaft / 2, -h / 2), (shaft / 2, -h / 2), (shaft / 2, h / 2 - head), (w / 2, h / 2 - head), (0, h / 2), (-w / 2, h / 2 - head), (-shaft / 2, h / 2 - head)]
    return round_poly([(x, s * z) for x, z in pts], [0.03, 0.03, 0.02, 0.035, 0.05, 0.035, 0.02], seg=5)


def magnifier(name, loc, R, parent, coll, turn=0, handle=1.2):
    """Chunky lens ring with glass, a darker collar and a handle pointing down-right."""
    lens = node(name, parent, coll, loc, (0, 0, turn))
    part = name.removeprefix("PROP_")  # only the group carries the hover-cue prefix
    tor = R * 0.2
    torus(part + "_ring", R, tor, (0, 0, 0), lens, coll, "blue_resin", rot=(90, 0, 0))
    cyl(part + "_glass", R, 0.02, (0, 0, 0), lens, coll, "glass", rot=(90, 0, 0))
    d = Vector((math.sqrt(0.5), 0, -math.sqrt(0.5)))
    cyl(part + "_collar", tor * 1.2, 0.14, d * (R + tor + 0.04), lens, coll, "blue_deep", rot=(0, 135, 0), bevel=0.02)
    cyl(part + "_handle", tor * 1.05, R * handle, d * (R + tor + 0.08 + R * handle / 2), lens, coll, "blue_resin", rot=(0, 135, 0), bevel=0.03)
    return lens


def sheet_lines(prefix, w, h, loc, parent, coll, rows=6, accents=(), rot=(-10, 0, 0), thickness=0.06, paper="paper", radius=0.1):
    """A sheet with rounded corners and inset pill-shaped text bars (gray, with optional blue/mint accent rows)."""
    root = node(prefix, parent, coll, loc, rot)
    rslab(prefix + "_paper", w, h, thickness, radius, (0, 0, 0), root, coll, paper)
    top = h / 2 - h * 0.16
    for i in range(rows):
        frac = 0.62 if i % 3 == 2 else 0.78
        col = dict(accents).get(i, "line_gray")
        rslab(f"{prefix}_line{i}", w * frac, h * 0.05, 0.016, h * 0.025, (-w * 0.39 + w * frac / 2, -thickness / 2 - 0.004, top - i * h * 0.12), root, coll, col, bevel=0.006)
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
    tray_root = node("TRAY", root, c)
    # thick open tray, back wall higher than the front, holding a fanned stack of sheets
    tray("tray", 1.9, 1.3, 0.42, 0.62, 0.13, 0.12, 0.24, (0, 0.05, 0), tray_root, c, "blue_resin")
    for i in range(3):
        sheet_lines(f"sheet{i}", 1.0, 1.3, (-0.3 + i * 0.12, 0.32 - i * 0.12, 0.86 - i * 0.025), tray_root, c, rows=6, rot=(-12 + i * 2, -6 + i * 3, -14))
    prop = node("PROP_sheet", tray_root, c)
    sheet_lines("sheet_top", 1.0, 1.3, (0.08, -0.06, 0.78), prop, c, rows=6, rot=(-8, 2, -14))
    up = node("upload", tray_root, c, (0.55, -0.7, 0.4), (0, 0, -16))
    rslab("upload_tile", 0.8, 0.8, 0.3, 0.18, (0, 0, 0), up, c, "mint_resin", bevel=0.06)
    prism("upload_arrow", arrow_outline(), 0.08, (0, -0.17, 0), up, c, "white")
    return root


def m02_source(x=0):
    root, c = new_module("MODULE_02_SOURCE_QUALITY", x)
    tray("holder", 2.1, 1.1, 0.3, 0.42, 0.12, 0.1, 0.22, (0, 0, 0), root, c, "blue_resin")
    sheet_lines("word_back", 0.92, 1.2, (-0.45, 0.22, 0.78), root, c, rows=6, rot=(-10, -4, -10))
    word = sheet_lines("word_sheet", 0.92, 1.2, (-0.34, 0.08, 0.74), root, c, rows=6, rot=(-10, -4, -10))
    rslab("word_badge", 0.46, 0.44, 0.08, 0.08, (-0.06, -0.06, 0.22), word, c, "blue_deep")
    glyph("word_W", "W", 0.34, (-0.06, -0.105, 0.22), word, c, "white", rot=(90, 0, 0))
    pdf = sheet_lines("pdf_sheet", 0.92, 1.2, (0.45, 0.2, 0.78), root, c, rows=6, rot=(-10, 5, -14))
    rslab("pdf_badge", 0.58, 0.4, 0.08, 0.08, (0.02, -0.06, 0.22), pdf, c, "red")
    glyph("pdf_text", "PDF", 0.2, (0.02, -0.105, 0.22), pdf, c, "white", rot=(90, 0, 0))
    magnifier("PROP_lens", (0.12, -0.58, 0.68), 0.34, root, c, turn=-14)
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
    rbox("kb_base", (2.3, 1.5, 0.26), (0.05, -0.1, 0.13), root, c, "blue_resin", bevel=0.12)
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
    # CRT: wide rounded body, deep bezel and a large rounded screen
    crt = node("CRT", root, c, (-0.1, 0.38, 0.28))
    rbox("crt_back", (1.25, 0.8, 1.0), (0, 0.45, 0.68), crt, c, "blue_resin", bevel=0.22)
    rbox("crt_body", (1.8, 0.62, 1.3), (0, -0.05, 0.73), crt, c, "blue_resin", bevel=0.18)
    rslab("crt_bezel", 1.58, 1.12, 0.06, 0.18, (0, -0.37, 0.78), crt, c, "blue_deep")
    rslab("crt_screen", 1.34, 0.9, 0.06, 0.15, (0, -0.4, 0.8), crt, c, "screen")
    rbox("crt_neck", (0.6, 0.3, 0.14), (0, -0.3, 0.06), crt, c, "blue_deep", bevel=0.05)
    for i, xo in enumerate((0.4, 0.55, 0.68)):
        cyl(f"knob{i}", 0.055, 0.06, (xo, -0.42, 0.15), crt, c, "gray" if i else "navy", rot=(90, 0, 0))
    prop = node("PROP_quote", crt, c, (0, -0.44, 0.8))
    glyph("quote_mark", "“", 0.48, (-0.45, 0, 0.16), prop, c, "screen_mint", rot=(90, 0, 0), extrude=0.01)
    rbox("bar_blue", (0.78, 0.02, 0.09), (0.06, 0, 0.03), prop, c, "screen_blue", bevel=0.03)
    rbox("bar_mint", (0.68, 0.02, 0.09), (0.01, 0, -0.14), prop, c, "screen_mint", bevel=0.03)
    rbox("bar_small", (0.18, 0.02, 0.055), (-0.42, 0, -0.3), prop, c, "screen_mint", bevel=0.02)
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
    # source sheet on its stand, spread to the right of the monitor, with a magnifier in front
    sheet_lines("source_sheet", 0.95, 1.2, (1.15, 0.85, 0.85), root, c, rows=7, accents=[(3, "line_blue"), (5, "line_mint")], rot=(-8, 0, -18))
    rbox("sheet_stand", (0.72, 0.36, 0.24), (1.17, 0.75, 0.12), root, c, "white", bevel=0.06)
    magnifier("lens", (1.45, 0.3, 0.95), 0.3, root, c, turn=-18)
    return root


def m05_report(x=0):
    root, c = new_module("MODULE_05_DECISION_REPORT", x)
    sheet_lines("report", 1.15, 1.5, (0.3, 0.4, 0.8), root, c, rows=6, rot=(-8, 0, -20), thickness=0.14, paper="white", radius=0.12)
    stamp = node("PROP_stamp", root, c, (-0.42, -0.22, 0), (0, 0, -18))
    rbox("stamp_pad", (0.98, 0.8, 0.24), (0, 0, 0.12), stamp, c, "blue_deep", bevel=0.07)
    rbox("stamp_plate", (0.8, 0.64, 0.08), (0, 0, 0.27), stamp, c, "blue_resin", bevel=0.035)
    cyl("stamp_collar", 0.23, 0.13, (0, 0, 0.365), stamp, c, "gray", bevel=0.03)
    # turned handle: narrow neck flaring into a bulb
    lathe("stamp_handle", [(0.19, 0), (0.15, 0.04), (0.12, 0.12), (0.13, 0.22), (0.19, 0.31), (0.26, 0.41), (0.29, 0.51), (0.27, 0.61), (0.2, 0.68), (0.1, 0.715), (0, 0.725)], (0, 0, 0.42), stamp, c, "navy")
    bubble = node("bubble", root, c, (0.62, -0.38, 0.5), (0, 0, -20))
    w, h = 0.92, 0.62
    outline = [(-w / 2, -h / 2), (-w / 2 + 0.3, -h / 2), (-w / 2 + 0.2, -h / 2 - 0.2), (-w / 2 + 0.52, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    prism("bubble_body", round_poly(outline, [0.18, 0.05, 0.03, 0.08, 0.18, 0.18, 0.18]), 0.26, (0, 0, 0), bubble, c, "mint_resin", bevel=0.06)
    for i in range(3):
        sphere(f"dot{i}", 0.085, (-0.24 + i * 0.24, -0.15, 0.0), bubble, c, "white", scale=(1, 0.55, 1))
    return root


def m06_annotation(x=0):
    root, c = new_module("MODULE_06_ANNOTATION", x)
    # upright source slab on a blue backing, with a selection around three lines
    rslab("backing", 1.32, 1.5, 0.12, 0.14, (-0.36, 0.2, 0.74), root, c, "blue_resin", rot=(-10, 0, 0))
    doc = node("doc", root, c, (-0.26, 0.06, 0.78), (-10, 0, 0))
    t = 0.14
    f = -t / 2 - 0.004
    rslab("doc_slab", 1.3, 1.5, t, 0.14, (0, 0, 0), doc, c, "white")
    for i, (z, w) in enumerate([(0.52, 0.95), (0.37, 0.8), (-0.45, 0.95), (-0.6, 0.72)]):
        rslab(f"doc_line{i}", w, 0.07, 0.016, 0.035, (-0.48 + w / 2, f, z), doc, c, "line_gray", bevel=0.006)
    rslab("sel_fill", 0.98, 0.5, 0.012, 0.03, (0, f, -0.04), doc, c, "line_blue", bevel=0.004)
    for i, (z, w) in enumerate([(0.1, 0.8), (-0.04, 0.8), (-0.18, 0.6)]):
        rslab(f"sel_line{i}", w, 0.07, 0.016, 0.035, (-0.4 + w / 2, f - 0.008, z), doc, c, "blue_deep", bevel=0.006)
    for name, size, loc in [("top", (1.0, 0.02, 0.025), (0, f - 0.01, 0.21)), ("bottom", (1.0, 0.02, 0.025), (0, f - 0.01, -0.29)),
                            ("left", (0.025, 0.02, 0.52), (-0.49, f - 0.01, -0.04)), ("right", (0.025, 0.02, 0.52), (0.49, f - 0.01, -0.04))]:
        rbox(f"sel_{name}", size, loc, doc, c, "blue_deep", bevel=0.008)
    for i, (sx, sz) in enumerate([(-0.49, 0.21), (0.49, 0.21), (-0.49, -0.29), (0.49, -0.29)]):
        sphere(f"sel_handle{i}", 0.04, (sx, f - 0.02, sz), doc, c, "blue_deep")
    # marker resting its tip on the selection's top-right corner
    pen = node("PROP_stylus", doc, c, (0.49, f - 0.06, 0.21))
    pen.rotation_euler = Vector((0.55, -0.35, 0.8)).to_track_quat("Z", "Y").to_euler()
    bpy.ops.mesh.primitive_cone_add(radius1=0.015, radius2=0.085, depth=0.22, location=(0, 0, 0))
    tip = bpy.context.active_object
    tip.name = "stylus_tip"
    tip.location = (0, 0, 0.11)
    tip.data.materials.append(mat("navy"))
    bpy.ops.object.shade_smooth()
    _link(tip, pen, c)
    cyl("stylus_body", 0.09, 0.75, (0, 0, 0.595), pen, c, "blue_resin", bevel=0.02)
    cyl("stylus_cap", 0.095, 0.24, (0, 0, 1.09), pen, c, "navy", bevel=0.045)
    # field chips linked to the source
    for i in range(3):
        chip = node(f"chip{i}", root, c, (0.98, -0.04, 1.2 - i * 0.48), (-10, 0, 0))
        rslab(f"chip{i}_body", 0.8, 0.4, 0.14, 0.12, (0, 0, 0), chip, c, "white")
        rslab(f"chip{i}_line", 0.32, 0.07, 0.016, 0.035, (0.12, -0.076, 0), chip, c, "line_gray", bevel=0.006)
        rbox(f"chip{i}_link", (0.2, 0.06, 0.06), (-0.49, 0, 0), chip, c, "line_gray", bevel=0.02)
        if i == 0:
            rslab("chip0_mark", 0.18, 0.18, 0.05, 0.045, (-0.21, -0.08, 0), chip, c, "mint_resin")
        elif i == 1:
            torus("chip1_mark", 0.08, 0.026, (-0.21, -0.08, 0), chip, c, "blue_resin", rot=(90, 0, 0))
        else:
            rslab("chip2_mark", 0.19, 0.19, 0.05, 0.045, (-0.21, -0.08, 0), chip, c, "blue_deep")
            tube("chip2_check", [(-0.265, -0.11, 0.0), (-0.23, -0.11, -0.045), (-0.155, -0.11, 0.05)], 0.017, chip, c, "white")
    return root


def m07_form(x=0):
    root, c = new_module("MODULE_07_FORM_PREVIEW", x)
    # wide form panel on a thicker blue frame with a raised top bar; turned so the frame's right side shows, as in the still
    form = node("form", root, c, (0, 0, 0), (0, 0, -46))
    rslab("frame", 1.7, 1.34, 0.3, 0.18, (0.02, 0.12, 0.71), form, c, "blue_resin", bevel=0.07)
    rslab("top_bar", 1.2, 0.34, 0.2, 0.14, (0.06, 0.17, 1.38), form, c, "blue_resin", bevel=0.07)  # set back, standing above the frame
    panel = node("panel", form, c, (-0.03, -0.09, 0.66))
    rslab("panel_slab", 1.6, 1.32, 0.16, 0.16, (0, 0, 0), panel, c, "white", bevel=0.06)
    f = -0.08  # front face of the panel
    rslab("well0", 1.2, 0.17, 0.03, 0.05, (-0.04, f, 0.42), panel, c, "line_gray", bevel=0.01)
    well = node("PROP_field", panel, c, (-0.04, f, 0.15))
    rslab("well1", 1.2, 0.17, 0.03, 0.05, (0, 0, 0), well, c, "line_gray", bevel=0.01)
    for i, z in enumerate((-0.13, -0.43)):
        cyl(f"radio{i}", 0.11, 0.08, (-0.54, f - 0.03, z), panel, c, "mint_resin", rot=(90, 0, 0), bevel=0.03)
        rslab(f"line{i}", 0.46, 0.1, 0.03, 0.05, (-0.08, f, z), panel, c, "line_gray", bevel=0.01)
        rslab(f"button{i}", 0.24, 0.24, 0.08, 0.06, (0.4, f - 0.03, z), panel, c, "mint_resin", bevel=0.035)
    # the selected radio and button have lighter faces
    cyl("radio0_face", 0.074, 0.02, (-0.54, f - 0.075, -0.13), panel, c, "mint_glow", rot=(90, 0, 0))
    rslab("button0_face", 0.17, 0.17, 0.02, 0.045, (0.4, f - 0.075, -0.13), panel, c, "mint_glow", bevel=0.006)
    return root


def m08_responses(x=0):
    root, c = new_module("MODULE_08_RESPONSES", x)
    kb = node("keyboard", root, c, (0, 0, 0), (0, 0, 6))
    # panels standing behind the keyboard: blue back panel, pale panel, blue field panel with two input bars
    for name, w, h, t, px, py, m in [("panel_back", 1.4, 0.98, 0.14, -0.2, 1.1, "blue_resin"), ("panel_pale", 1.7, 1.36, 0.1, 0.1, 0.94, "white"), ("panel_field", 1.6, 1.16, 0.14, 0.12, 0.78, "blue_resin")]:
        stand = node(name, kb, c, (px, py, 0), (-6, 0, 0))
        rslab(name + "_slab", w, h, t, 0.14, (0, 0, h / 2), stand, c, m, bevel=0.05)
    for i in range(2):  # on the field panel, the last stand
        rslab(f"field_bar{i}", 1.12, 0.18, 0.06, 0.09, (0.04, -0.08, 0.94 - i * 0.26), stand, c, "white", bevel=0.02)
    # cream keyboard (3 x 6 tall keys) in an open tray on a thin blue base
    rslab("kb_base", 2.58, 1.43, 0.08, 0.26, (0, 0, 0.04), kb, c, "blue_resin", rot=(90, 0, 0), bevel=0.03)
    tray("kb_tray", 2.44, 1.3, 0.36, 0.36, 0.14, 0.18, 0.22, (0, 0, 0.07), kb, c, "cream", bevel=0.05)
    for r in range(3):
        for k in range(6):
            key = node("PROP_key" if (r, k) == (0, 2) else f"key_{r}_{k}", kb, c, (-0.85 + k * 0.34, -0.3 + r * 0.3, 0.25))
            rbox(f"cap_{r}_{k}", (0.3, 0.26, 0.34), (0, 0, 0.16), key, c, "cream", bevel=0.06)
            rbox(f"dash_{r}_{k}", (0.09, 0.024, 0.012), (0, 0, 0.332), key, c, "line_gray", bevel=0.008)
    # mint pen with a cap and clip, its tip resting on a key
    pen = node("pen", kb, c, (0.53, 0.03, 0.585))
    pen.rotation_euler = Vector((0.5, 0.25, 0.83)).to_track_quat("Z", "Y").to_euler()
    lathe("pen_lead", [(0, 0), (0.028, 0.045), (0.046, 0.09)], (0, 0, 0), pen, c, "navy")
    lathe("pen_wood", [(0.044, 0.088), (0.113, 0.29)], (0, 0, 0), pen, c, "cream")
    cyl("pen_body", 0.116, 0.6, (0, 0, 0.59), pen, c, "mint_resin", bevel=0.015)
    cyl("pen_ring", 0.12, 0.045, (0, 0, 0.912), pen, c, "white")
    cyl("pen_cap", 0.125, 0.4, (0, 0, 1.134), pen, c, "mint_resin", bevel=0.08)
    clip = node("pen_clip", pen, c, (0, 0, 0), (0, 0, 115))
    rslab("pen_clip_bar", 0.085, 0.36, 0.045, 0.04, (0, 0.145, 1.11), clip, c, "mint_resin", bevel=0.016)
    return root


def m09_export(x=0):
    root, c = new_module("MODULE_09_PDF_QA_EXPORT", x)
    sheet_lines("pdf_sheet0", 1.0, 1.3, (-0.38, 0.32, 0.8), root, c, rows=6, rot=(-8, 0, -12))
    front = sheet_lines("pdf_sheet1", 1.0, 1.3, (-0.24, 0.16, 0.76), root, c, rows=7, rot=(-8, 0, -12))
    rslab("pdf_badge", 0.58, 0.38, 0.1, 0.08, (-0.06, -0.07, 0.16), front, c, "red")
    glyph("pdf_text", "PDF", 0.22, (-0.06, -0.125, 0.16), front, c, "white", rot=(90, 0, 0))
    magnifier("lens", (0.55, -0.12, 0.92), 0.38, root, c, turn=-14)
    arrow = node("PROP_arrow", root, c, (0.08, -0.55, 0.36), (0, 0, -12))
    rslab("arrow_tile", 0.84, 0.68, 0.3, 0.16, (0, 0, 0), arrow, c, "blue_resin", bevel=0.06)
    prism("arrow_glyph", arrow_outline(0.44, 0.46, 0.18, 0.22, down=True), 0.08, (0, -0.17, 0), arrow, c, "white")
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

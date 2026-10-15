"""Anduin Legal Reviewer worker: Word -> PDF conversion and typed decisions (Laya).

Converter: LibreOffice when installed (container), otherwise Microsoft Word through COM (Windows host).
Access: requests must carry a valid Supabase session token of a signed-in app user (verified against the
project's Auth API), or the WORKER_TOKEN shared secret when one is configured. Contract text is treated as
data: the caller chooses the fixed question set; nothing in the text can select a command, model or path.
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
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
UNSUPPORTED = "documents with embedded objects, imported content or linked data are not accepted"


def _reject(detail: str):
    raise HTTPException(status_code=415, detail=detail)


def _local(name: str) -> str:
    return name.rsplit("}", 1)[-1]


def _attr(el, name: str):
    return next((v for k, v in el.attrib.items() if _local(k) == name), None)


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


def _content_types(src) -> tuple[dict, dict]:
    if "[Content_Types].xml" not in src.namelist():
        _reject("not a valid .docx package")
    defaults, overrides = {}, {}
    for el in _parse("[Content_Types].xml", src.read("[Content_Types].xml")):
        kind, ctype = _local(el.tag), (_attr(el, "ContentType") or "").strip()
        if kind == "Default":
            defaults[(_attr(el, "Extension") or "").lower()] = ctype
        elif kind == "Override":
            overrides[(_attr(el, "PartName") or "").lstrip("/").lower()] = ctype
    return defaults, overrides


def _local_ns(tag: str) -> str:
    return tag[1:].split("}", 1)[0] if tag.startswith("{") else ""


def _clean_rels(name: str, root) -> bytes:
    """Drops every external or absolute target (remote templates, OLE links, frames, linked images, file: and UNC
    paths) except http(s)/mailto hyperlinks, however the attributes are written; rejects non-allowlisted types."""
    for rel in list(root):
        target = (_attr(rel, "Target") or "").strip()
        kind = (_attr(rel, "Type") or "").strip().rsplit("/", 1)[-1]
        external = (_attr(rel, "TargetMode") or "").strip().lower() == "external" or bool(ABSOLUTE.match(target))
        if external:
            if not (kind == HYPERLINK and SAFE_LINK.match(target)):
                root.remove(rel)
        elif kind not in SAFE_RELS:
            _reject(UNSUPPORTED)
    ET.register_namespace("", _local_ns(root.tag))
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _check_fields(root):
    """Every field instruction (simple or complex, nested, any namespace) must start with an allowlisted keyword."""

    def check(instr: str):
        word = (instr.strip().split() or [""])[0].upper()
        if word and not word.startswith("=") and word not in SAFE_FIELDS:
            _reject(UNSUPPORTED)

    stack: list = []  # one instruction buffer per open complex field; None once its instruction has ended
    for el in root.iter():
        tag = _local(el.tag)
        if tag in ("fldData", "mailMerge", "altChunk", "subDoc", "object"):
            _reject(UNSUPPORTED)
        elif tag == "fldSimple":
            check(_attr(el, "instr") or "")
        elif tag == "fldChar":
            kind = _attr(el, "fldCharType")
            if kind == "begin":
                stack.append([])
            elif kind in ("separate", "end") and stack:
                if stack[-1] is not None:
                    check("".join(stack[-1]))
                    stack[-1] = None
                if kind == "end":
                    stack.pop()
        elif tag == "instrText":
            if not stack:
                check(el.text or "")
            elif stack[-1] is not None:
                stack[-1].append(el.text or "")
    for buf in stack:
        if buf is not None:
            check("".join(buf))


def sanitize_docx(data: bytes) -> bytes:
    """Uploaded documents are untrusted. Content types (not file names) decide how each part is checked: XML parts are
    parsed without DTDs, relationship parts lose external targets and must use allowlisted types, every XML part's
    fields must be allowlisted, and only image/font binaries are kept. Anything else rejects the package."""
    import io
    import zipfile

    try:
        src = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        _reject("not a valid .docx package")
    defaults, overrides = _content_types(src)
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst:
        for name in src.namelist():
            if name.endswith("/"):
                continue
            body = src.read(name)
            if name == "[Content_Types].xml":
                if "macroenabled" in body.decode("utf-8", "replace").lower():
                    _reject("macro-enabled documents are not accepted")
            else:
                ext = name.rsplit(".", 1)[-1].lower() if "." in name.rsplit("/", 1)[-1] else ""
                ctype = overrides.get(name.lower()) or defaults.get(ext, "")
                if ctype.endswith("relationships+xml") or ext == "rels":
                    body = _clean_rels(name, _parse(name, body))
                elif ctype.endswith(("+xml", "/xml")):
                    _check_fields(_parse(name, body))
                elif not SAFE_BINARY.match(ctype):
                    _reject(UNSUPPORTED)
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

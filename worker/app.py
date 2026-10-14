"""Anduin Legal Reviewer worker: Word -> PDF conversion and typed decisions (Laya).

Converter: LibreOffice when installed (container), otherwise Microsoft Word through COM (Windows host).
Access: requests must carry a valid Supabase session token of a signed-in app user (verified against the
project's Auth API), or the WORKER_TOKEN shared secret when one is configured. Contract text is treated as
data: the caller chooses the fixed question set; nothing in the text can select a command, model or path.
"""
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

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
_verified: dict[str, float] = {}


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


def _valid_session(token: str) -> bool:
    """Verifies an app user's access token with Supabase Auth; positive results are cached for 5 minutes."""
    now = time.time()
    if _verified.get(token, 0) > now:
        return True
    if not (SUPABASE_URL and SUPABASE_KEY):
        return False
    req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            ok = res.status == 200 and bool(json.loads(res.read()).get("id"))
    except Exception:
        ok = False
    if ok:
        if len(_verified) > 5000:
            _verified.clear()
        _verified[token] = now + 300
    return ok


def auth(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    if TOKEN and token == TOKEN:
        return
    if not token or not _valid_session(token):
        raise HTTPException(status_code=401, detail="unauthorized")


def _converter():
    if shutil.which("soffice"):
        return "libreoffice"
    if os.name == "nt" and Path(os.environ.get("ProgramFiles", "C:/Program Files"), "Microsoft Office").exists():
        return "microsoft-word"
    return None


@app.get("/health")
def health():
    return {"decision_agent": state["status"], "error": state["error"], "converter": _converter() or "missing"}


def _word_to_pdf(src: Path, out: Path):
    # Word COM through PowerShell; one conversion at a time because Word automation is single-instance.
    script = (
        "$ErrorActionPreference='Stop';"
        "$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0;"
        "try{$d=$w.Documents.Open($env:SRC,$false,$true,$false);$d.SaveAs2($env:OUT,17);$d.Close(0)}finally{$w.Quit()}"
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
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "source.docx"
        out = Path(tmp) / "source.pdf"
        src.write_bytes(data)
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

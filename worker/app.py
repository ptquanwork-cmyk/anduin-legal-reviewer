"""Anduin Legal Reviewer worker: Word -> PDF conversion (LibreOffice) and typed decisions (Laya).

Endpoints other than /health require `Authorization: Bearer $WORKER_TOKEN` when WORKER_TOKEN is set.
Contract text is treated as data: the caller chooses the fixed question set; nothing in the text
can select a command, model or file path.
"""
import os
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

TOKEN = os.environ.get("WORKER_TOKEN", "")
MAX_BYTES = 20 * 1024 * 1024
app = FastAPI(title="anduin-legal-worker")

state = {"router": None, "status": "loading", "error": None, "loaded_at": None}


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


def auth(authorization: str = Header(default="")):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health():
    try:
        converter = subprocess.run(["soffice", "--version"], capture_output=True, text=True, timeout=30).stdout.strip() or "missing"
    except (OSError, subprocess.SubprocessError):
        converter = "missing"
    return {"decision_agent": state["status"], "error": state["error"], "converter": converter}


@app.post("/convert", dependencies=[Depends(auth)])
async def convert(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    if not data.startswith(b"PK"):
        raise HTTPException(status_code=415, detail="expected a .docx file")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "source.docx"
        src.write_bytes(data)
        started = time.time()
        if not shutil.which("soffice"):
            raise HTTPException(status_code=503, detail="converter not installed")
        proc = subprocess.run(
            ["soffice", "--headless", "--norestore", f"-env:UserInstallation=file://{tmp}/profile",
             "--convert-to", "pdf", "--outdir", tmp, str(src)],
            capture_output=True, text=True, timeout=120,
        )
        out = Path(tmp) / "source.pdf"
        if proc.returncode != 0 or not out.exists():
            raise HTTPException(status_code=422, detail=f"conversion failed: {proc.stderr[-400:]}")
        return Response(
            out.read_bytes(),
            media_type="application/pdf",
            headers={"x-converter": "libreoffice", "x-elapsed-ms": str(int((time.time() - started) * 1000))},
        )


class DecideRequest(BaseModel):
    state: str = Field(max_length=60000)
    questions: dict
    model: str | None = Field(default=None, pattern="^(english|multilingual)$")
    max_len: int = Field(default=1024, ge=128, le=8192)


@app.post("/decide", dependencies=[Depends(auth)])
def decide(req: DecideRequest):
    if state["status"] != "ready":
        raise HTTPException(status_code=503, detail=f"decision agent {state['status']}")
    started = time.time()
    kwargs = {"max_len": req.max_len}
    if req.model:
        kwargs["model"] = req.model
    result = state["router"].predict(req.state, req.questions, **kwargs)
    result["elapsed_ms"] = int((time.time() - started) * 1000)
    return result

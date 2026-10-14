"""Runs the worker on this machine behind a Cloudflare quick tunnel and publishes its URL to Supabase.

Usage (from the repository root):
    laya\\.venv\\Scripts\\python.exe worker\\run_local.py

- Reads SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from .env.supabase.local (public values).
- Creates worker/.worker-secret on first run (git-ignored). Only its SHA-256 hash is stored in Supabase
  (seeded by the project owner), and only the holder of this file can change the published worker URL.
- Restarts the tunnel if it exits and publishes each new https://*.trycloudflare.com address.
"""
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PORT = 7860


def load_env():
    env = {}
    for line in (ROOT / ".env.supabase.local").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*\"?([^\"]*)\"?\s*$", line)
        if m:
            env[m.group(1)] = m.group(2)
    return env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_PUBLISHABLE_KEY"]


def rpc(url, key, name, payload):
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/{name}",
        data=json.dumps(payload).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        return json.loads(res.read() or b"null")


def cloudflared():
    for p in (shutil.which("cloudflared"), r"C:\Program Files (x86)\cloudflared\cloudflared.exe", r"C:\Program Files\cloudflared\cloudflared.exe"):
        if p and Path(p).exists():
            return p
    sys.exit("cloudflared not found. Install it with: winget install --id Cloudflare.cloudflared")


def main():
    sb_url, sb_key = load_env()
    secret_file = HERE / ".worker-secret"
    if not secret_file.exists():
        secret_file.write_text(secrets.token_hex(32), encoding="utf-8")
    secret = secret_file.read_text(encoding="utf-8").strip()
    # The endpoint accepts this secret only if its SHA-256 hash was seeded in Supabase out of band
    # (see supabase/migrations/20261015020000_worker_endpoint_hardening.sql); otherwise publishing is refused.

    env = {**os.environ, "SUPABASE_URL": sb_url, "SUPABASE_PUBLISHABLE_KEY": sb_key, "PYTHONUTF8": "1"}
    api = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(PORT)], cwd=HERE, env=env)
    print(f"worker listening on http://127.0.0.1:{PORT}", flush=True)

    try:
        while True:
            tunnel = subprocess.Popen([cloudflared(), "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{PORT}"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
            threading.Thread(target=publish, args=(tunnel, sb_url, sb_key, secret), daemon=True).start()
            tunnel.wait()
            if api.poll() is not None:
                raise SystemExit("worker process exited")
            print("tunnel exited; restarting in 5 s", flush=True)
            time.sleep(5)
    finally:
        api.terminate()


def publish(tunnel, sb_url, sb_key, secret):
    """Publishes the tunnel address, then watches it: quick tunnels can silently lose their hostname."""
    public = None
    for line in tunnel.stdout:
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if m:
            public = m.group(0)
            break
    if not public:
        return
    threading.Thread(target=lambda: [None for _ in tunnel.stdout], daemon=True).start()  # keep draining logs
    for _ in range(20):  # wait until the hostname resolves at the edge before publishing it
        if healthy(public):
            break
        time.sleep(3)
    ok = rpc(sb_url, sb_key, "set_worker_url", {"p_secret": secret, "p_url": public})
    print(f"tunnel {public} published={bool(ok)}", flush=True)
    failures = 0
    while tunnel.poll() is None:
        time.sleep(60)
        failures = 0 if healthy(public) else failures + 1
        if failures >= 2:
            print(f"tunnel {public} stopped answering; recreating", flush=True)
            tunnel.terminate()
            return


def healthy(public):
    try:
        with urllib.request.urlopen(f"{public}/health", timeout=10) as res:
            return res.status == 200
    except Exception:
        return False


if __name__ == "__main__":
    main()

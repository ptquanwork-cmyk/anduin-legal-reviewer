"""Checks the /semantic rate limits without calling Codex. Run from the worker folder: python test_semantic_quota.py"""
from fastapi import HTTPException

import app


def blocked(user):
    try:
        app.take_semantic_quota(user)
        return False
    except HTTPException as exc:
        assert exc.status_code == 429
        return True


def reset():
    app._user_calls.clear()
    app._global_calls.clear()


reset()
assert not any(blocked("a") for _ in range(app.SEMANTIC_PER_USER))
assert blocked("a"), "per-user cap"
assert not blocked("b"), "other users unaffected"

reset()
assert not any(blocked(f"u{i}") for i in range(app.SEMANTIC_GLOBAL))
assert blocked("fresh"), "global cap across users"
assert "fresh" not in app._user_calls, "a rejected call records nothing"
print("semantic quota ok")

# Background jobs are capped overall and per user (429), and finished results are dropped after being fetched.
import time as _t

from fastapi import HTTPException as _H

app._jobs.clear()
slow = lambda: (_t.sleep(0.5), ("json", {}))[1]
ids = [app._start_job("u1", slow)["job"] for _ in range(app.MAX_RUNNING_PER_USER)]
try:
    app._start_job("u1", slow)
    raise AssertionError("per-user job cap")
except _H as e:
    assert e.status_code == 429
for i in range(app.MAX_RUNNING - app.MAX_RUNNING_PER_USER):
    app._start_job(f"other{i}", slow)
try:
    app._start_job("u2", slow)
    raise AssertionError("global job cap")
except _H as e:
    assert e.status_code == 429
_t.sleep(1)
assert app.job_status(ids[0], "u1") == {} and "fetched" in app._jobs[ids[0]]
try:
    app.job_status(ids[1], "someone-else")
    raise AssertionError("jobs are private")
except _H as e:
    assert e.status_code == 404
print("job limits ok")

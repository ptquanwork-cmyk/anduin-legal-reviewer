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

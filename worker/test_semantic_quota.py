"""Checks the /semantic rate limits without calling Codex. Run from the worker folder: python test_semantic_quota.py"""
from fastapi import HTTPException

import app


def blocked(token):
    try:
        app._semantic_quota(f"Bearer {token}")
        return False
    except HTTPException as exc:
        assert exc.status_code == 429
        return True


app._semantic_calls.clear()
assert not any(blocked("a") for _ in range(app.SEMANTIC_PER_SESSION))
assert blocked("a"), "per-session cap"
assert not blocked("b"), "other sessions unaffected"

app._semantic_calls.clear()
tokens = [f"t{i}" for i in range(app.SEMANTIC_GLOBAL)]
assert not any(blocked(t) for t in tokens)
assert blocked("fresh"), "global cap across sessions"
print("semantic quota ok")

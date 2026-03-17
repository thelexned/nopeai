#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$ROOT_DIR"

shopt -s nullglob
wheels=(python/dist/nopeai-*.whl)
shopt -u nullglob

if [ "${#wheels[@]}" -eq 0 ]; then
  echo "No built wheel found in python/dist" >&2
  exit 1
fi

python3 -m venv "$TMP_DIR/venv"
"$TMP_DIR/venv/bin/python" -m pip install --quiet --disable-pip-version-check --no-deps "${wheels[0]}"
"$TMP_DIR/venv/bin/python" - <<'PY'
from nopeai import PermissionDeniedError, createPermissionEngine

engine = createPermissionEngine(
    [
        {
            "role": "agent",
            "action": "call_tool",
            "resource_type": "tool",
            "resource_id": "search",
            "effect": "allow",
        }
    ]
)

assert engine.can(
    {"id": "agent_1", "roles": ["agent"]},
    "call_tool",
    {"type": "tool", "id": "search"},
) is True
assert PermissionDeniedError is not None

print("Python package smoke test passed")
PY

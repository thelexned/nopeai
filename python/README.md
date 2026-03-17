# nopeai for Python

`nopeai` is a tiny, dependency-free permission engine for AI agents.

## Install

```bash
pip install nopeai
```

## Usage

```python
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

agent = {"id": "agent_1", "roles": ["agent"]}
tool = {"type": "tool", "id": "search"}

assert engine.can(agent, "call_tool", tool) is True

try:
    engine.authorize(agent, "call_tool", {"type": "tool", "id": "email"})
except PermissionDeniedError as error:
    print(error.decision["reason"])
```

## Included Examples

```python
from nopeai.examples import examples, sample_agents, sample_resources

assert examples["tools"].can(
    sample_agents["agent"],
    "call_tool",
    sample_resources["search_tool"],
) is True

assert examples["tenant"].can(
    sample_agents["finance"],
    "read",
    sample_resources["invoice"],
) is True
```


## Validation

Inputs are validated before rule evaluation:

- `createPermissionEngine(rules)` validates each rule shape and `effect` value (`"allow"` or `"deny"`).
- `can`, `authorize`, and `explain` validate `agent`, `action`, `resource`, and `context`.

Validation raises explicit exceptions: `ValidationError`, `RuleValidationError`, `AgentValidationError`, `ResourceValidationError`, `ActionValidationError`, and `ContextValidationError`.

`PermissionDeniedError` is reserved for authorization denials, so callers can distinguish malformed input from valid deny decisions.


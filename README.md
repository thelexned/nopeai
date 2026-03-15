# PermitAI

PermitAI is a very small, dependency-free permission system for AI agents.

It is designed to run in-process and answer a single question quickly: is this
agent allowed to do this action on this resource?

The repository contains two matching implementations:

- Python using only the standard library
- TypeScript with no npm dependencies

## Design Principles

- Default deny
- Deny overrides allow
- Plain objects and plain functions
- No policy language
- No network calls
- No persistence
- No framework integration
- Small enough to embed directly into an app or agent runtime

## Repository Layout

```text
.
├── README.md
├── python
│   ├── src
│   │   ├── engine.py
│   │   ├── errors.py
│   │   ├── examples.py
│   │   ├── init.py
│   │   └── types.py
│   └── tests
│       └── test_engine.py
└── typescript
    ├── src
    │   ├── engine.ts
    │   ├── errors.ts
    │   ├── examples.ts
    │   ├── index.ts
    │   └── types.ts
    └── tests
        └── engine.test.ts
```

## API

Both implementations expose the same logical API:

- `createPermissionEngine(rules)`
- `can(agent, action, resource, context?) -> boolean`
- `authorize(agent, action, resource, context?)`
- `explain(agent, action, resource, context?) -> decision`

Rule fields:

- `role`
- `action`
- `resource_type`
- optional `resource_id`
- `effect` as `"allow"` or `"deny"`
- optional `condition(agent, action, resource, context)`

Wildcards:

- `role=""`
- `action=""`
- `resource_type=""`
- `resource_id="*"`

Evaluation order:

1. Find all matching rules
2. If any matching rule is `deny`, deny
3. Else if any matching rule is `allow`, allow
4. Otherwise deny

## Python Usage

```python
import sys
sys.path.insert(0, "python/src")

from engine import createPermissionEngine
from errors import PermissionDeniedError

rules = [
    {
        "role": "agent",
        "action": "call_tool",
        "resource_type": "tool",
        "resource_id": "search",
        "effect": "allow",
    },
    {
        "role": "agent",
        "action": "call_tool",
        "resource_type": "tool",
        "resource_id": "email",
        "effect": "deny",
    },
]

engine = createPermissionEngine(rules)

agent = {"id": "agent_1", "roles": ["agent"]}
search_tool = {"type": "tool", "id": "search"}
email_tool = {"type": "tool", "id": "email"}

assert engine.can(agent, "call_tool", search_tool) is True
assert engine.can(agent, "call_tool", email_tool) is False

try:
    engine.authorize(agent, "call_tool", email_tool)
except PermissionDeniedError as error:
    print(error.decision["reason"])
```

## TypeScript Usage

```ts
import { createPermissionEngine, PermissionDeniedError } from "./typescript/src/index.ts";

const rules = [
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "search",
    effect: "allow" as const,
  },
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "email",
    effect: "deny" as const,
  },
];

const engine = createPermissionEngine(rules);

const agent = { id: "agent_1", roles: ["agent"] };
const searchTool = { type: "tool", id: "search" };
const emailTool = { type: "tool", id: "email" };

console.log(engine.can(agent, "call_tool", searchTool)); // true
console.log(engine.can(agent, "call_tool", emailTool)); // false

try {
  engine.authorize(agent, "call_tool", emailTool);
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.log(error.decision.reason);
  }
}
```

## Tool Example

Standard tools are modeled as resources:

```python
{"type": "tool", "id": "search"}
{"type": "tool", "id": "email"}
```

Example rule:

```python
{
    "role": "agent",
    "action": "call_tool",
    "resource_type": "tool",
    "resource_id": "search",
    "effect": "allow",
}
```

## MCP Server Example

MCP servers are modeled as:

```python
{"type": "mcp_server", "id": "github"}
{"type": "mcp_server", "id": "slack"}
```

Example rule:

```python
{
    "role": "agent",
    "action": "connect_mcp_server",
    "resource_type": "mcp_server",
    "resource_id": "github",
    "effect": "allow",
}
```

## MCP Tool Example

MCP tools are modeled as:

```python
{"type": "mcp_tool", "id": "github.create_issue"}
{"type": "mcp_tool", "id": "github.delete_repo"}
```

Example rules:

```python
{
    "role": "support",
    "action": "call_mcp_tool",
    "resource_type": "mcp_tool",
    "resource_id": "github.create_issue",
    "effect": "allow",
}

{
    "role": "support",
    "action": "call_mcp_tool",
    "resource_type": "mcp_tool",
    "resource_id": "github.delete_repo",
    "effect": "deny",
}
```

## Tenant Condition Example

Conditions let a rule depend on runtime context or metadata:

```python
{
    "role": "finance",
    "action": "read",
    "resource_type": "invoice",
    "effect": "allow",
    "condition": lambda agent, action, resource, context:
        agent["metadata"].get("tenant_id") == resource["metadata"].get("tenant_id"),
}
```

## Running Tests

Python:

```bash
python3 python/tests/test_engine.py
```

TypeScript:

```bash
node typescript/tests/engine.test.ts
```

## Design Tradeoffs

- Kept the rule model intentionally small, so there is no policy DSL or parser.
- Used plain object rules instead of classes to keep embedding friction low.
- `explain()` returns only the matched rules and a simple reason string, which is enough for debugging without introducing audit logging or persistence.
- Python uses a flat `src` directory with standard-library typing helpers only; TypeScript runs directly in Node without a separate test framework or npm toolchain.

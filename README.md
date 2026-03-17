# nopeai

`nopeai` is a tiny, dependency-free permission engine for AI agents.

It answers one question, fast:

`can this agent do this action to this resource?`

If you want a small permission layer for tools, MCP servers, invoices, tenant
data, or other agent-facing resources, `nopeai` gives you a plain-object API
with default deny and deny-overrides-allow behavior.

## Why `nopeai`

- Small enough to embed directly into an agent runtime or app
- No database, network calls, DSL, or framework lock-in
- Same mental model in TypeScript and Python
- Default deny, with explicit deny rules always winning
- Easy to audit because the rules are just data

## Quick Example

```ts
import { createPermissionEngine } from "nopeai";

const engine = createPermissionEngine([
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "search",
    effect: "allow",
  },
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "email",
    effect: "deny",
  },
]);

const agent = { id: "agent_1", roles: ["agent"] };

engine.can(agent, "call_tool", { type: "tool", id: "search" }); // true
engine.can(agent, "call_tool", { type: "tool", id: "email" }); // false
```

The Python version works the same way:

```python
from nopeai import createPermissionEngine

engine = createPermissionEngine(
    [
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
)

agent = {"id": "agent_1", "roles": ["agent"]}

assert engine.can(agent, "call_tool", {"type": "tool", "id": "search"}) is True
assert engine.can(agent, "call_tool", {"type": "tool", "id": "email"}) is False
```

## How It Works

Rules are plain objects with these fields:

- `role`
- `action`
- `resource_type`
- optional `resource_id`
- `effect` as `"allow"` or `"deny"`
- optional `condition(agent, action, resource, context)`

Evaluation order:

1. Find matching rules.
2. If any match is `deny`, deny.
3. Else if any match is `allow`, allow.
4. Otherwise deny.

Wildcards:

- `role=""`
- `action=""`
- `resource_type=""`
- `resource_id="*"`

## How to Install

Install the TypeScript package with your preferred JavaScript package manager:

```bash
npm install nopeai
pnpm add nopeai
yarn add nopeai
bun add nopeai
```

Install the Python package with `pip` or `uv`:

```bash
pip install nopeai
uv add nopeai
```


## Validation

Both engines validate inputs before rule evaluation. Validation failures are explicit errors (not authorization denials):

- Rule validation at `createPermissionEngine(...)` time
- Runtime validation for `agent`, `action`, `resource`, and `context` on `can`, `authorize`, and `explain`

TypeScript validation errors:

- `ValidationError` (base)
- `RuleValidationError`
- `AgentValidationError`
- `ResourceValidationError`
- `ActionValidationError`
- `ContextValidationError`

Python validation errors:

- `ValidationError` (base)
- `RuleValidationError`
- `AgentValidationError`
- `ResourceValidationError`
- `ActionValidationError`
- `ContextValidationError`

Use these to distinguish malformed input from `PermissionDeniedError` (which represents a valid deny decision).

## API

Both implementations expose the same logical API:

- `createPermissionEngine(rules)`
- `can(agent, action, resource, context?) -> boolean`
- `authorize(agent, action, resource, context?)`
- `explain(agent, action, resource, context?) -> decision`

## TypeScript

```ts
import {
  PermissionDeniedError,
  createPermissionEngine,
  examples,
  sampleAgents,
  sampleResources,
} from "nopeai";

const engine = createPermissionEngine([
  {
    role: "support",
    action: "call_mcp_tool",
    resource_type: "mcp_tool",
    resource_id: "github.create_issue",
    effect: "allow",
  },
]);

console.log(
  engine.can(
    sampleAgents.support,
    "call_mcp_tool",
    sampleResources.createIssueTool
  )
); // true

console.log(
  examples.tools.can(sampleAgents.agent, "call_tool", sampleResources.searchTool)
); // true

try {
  engine.authorize(
    sampleAgents.support,
    "call_mcp_tool",
    sampleResources.deleteRepoTool
  );
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.log(error.decision.reason);
  }
}
```

## Python

```python
from nopeai import PermissionDeniedError, createPermissionEngine
from nopeai.examples import examples, sample_agents, sample_resources

engine = createPermissionEngine(
    [
        {
            "role": "finance",
            "action": "read",
            "resource_type": "invoice",
            "effect": "allow",
            "condition": lambda agent, action, resource, context: agent["metadata"].get(
                "tenant_id"
            )
            == resource["metadata"].get("tenant_id"),
        }
    ]
)

assert engine.can(
    sample_agents["finance"],
    "read",
    sample_resources["invoice"],
) is True

assert examples["mcp"].can(
    sample_agents["support"],
    "call_mcp_tool",
    sample_resources["delete_repo_tool"],
) is False

try:
    engine.authorize(
        sample_agents["agent"],
        "call_tool",
        sample_resources["email_tool"],
    )
except PermissionDeniedError as error:
    print(error.decision["reason"])
```

## Included Examples

The package ships example engines, rule sets, agents, and resources so you can
prototype quickly.

TypeScript:

- `examples`
- `exampleRules`
- `sampleAgents`
- `sampleResources`

Python:

- `nopeai.examples.examples`
- `nopeai.examples.example_rules`
- `nopeai.examples.sample_agents`
- `nopeai.examples.sample_resources`

## Framework Integration Examples

Yes. `nopeai` is framework-agnostic, so it works with LangChain, LangGraph,
and PydanticAI. The integration point is the same in each stack: call
`authorize(...)` right before executing a tool.

### LangChain (TypeScript)

```ts
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { createPermissionEngine } from "nopeai";

const permissions = createPermissionEngine([
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "web_search",
    effect: "allow",
  },
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "send_email",
    effect: "deny",
  },
]);

const identity = { id: "assistant_1", roles: ["agent"] };

export const webSearch = tool(
  async ({ query }) => {
    permissions.authorize(identity, "call_tool", { type: "tool", id: "web_search" });
    return `Search results for: ${query}`;
  },
  {
    name: "web_search",
    description: "Search the web for recent information",
    schema: z.object({ query: z.string() }),
  }
);
```

### LangGraph (TypeScript)

In LangGraph, the cleanest pattern is a dedicated tool-dispatch node that
applies authorization for every selected tool.

```ts
import { createPermissionEngine } from "nopeai";

const permissions = createPermissionEngine([
  { role: "support", action: "call_tool", resource_type: "tool", effect: "allow" },
  {
    role: "support",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "delete_account",
    effect: "deny",
  },
]);

type State = {
  agent: { id: string; roles: string[] };
  nextToolId: string;
  input: Record<string, unknown>;
};

export function toolNode(state: State) {
  permissions.authorize(state.agent, "call_tool", {
    type: "tool",
    id: state.nextToolId,
  });

  // execute selected tool here only after authorize(...) passes
  return { ...state };
}
```

### PydanticAI (Python)

```python
from nopeai import PermissionDeniedError, createPermissionEngine
from pydantic_ai import Agent

permissions = createPermissionEngine(
    [
        {
            "role": "assistant",
            "action": "call_tool",
            "resource_type": "tool",
            "resource_id": "weather_api",
            "effect": "allow",
        },
        {
            "role": "assistant",
            "action": "call_tool",
            "resource_type": "tool",
            "resource_id": "payments_api",
            "effect": "deny",
        },
    ]
)

identity = {"id": "assistant_1", "roles": ["assistant"]}
assistant = Agent("openai:gpt-4o-mini")


def authorize_tool(tool_id: str) -> None:
    permissions.authorize(identity, "call_tool", {"type": "tool", "id": tool_id})


@assistant.tool
def weather(city: str) -> str:
    authorize_tool("weather_api")
    return f"Weather for {city}: sunny"


@assistant.tool
def charge_card(amount: float) -> str:
    authorize_tool("payments_api")
    return f"Charged {amount}"


try:
    authorize_tool("payments_api")
except PermissionDeniedError as error:
    print(error.decision["reason"])  # deny_rule_matched
```

## Development

If you are working from this repository instead of the published packages:

```bash
npm install
python3 -m pip install -r python/requirements-dev.txt
```

Run tests:

```bash
npm test
```

Build publishable artifacts:

```bash
npm run build:typescript
npm run build:python
```

## Publishing

`nopeai` is published to:

- `npm` from `typescript/package.json`
- `PyPI` from `python/pyproject.toml`

Releases use one shared version number across both packages.

1. Update both package versions together.
2. Push a Git tag in the format `vX.Y.Z`.
3. GitHub Actions validates the tag, runs tests, builds both packages, smoke
   tests the artifacts, and publishes them.
4. Trusted publishing must be configured once in npm and PyPI.

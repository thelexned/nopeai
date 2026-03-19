# nopeai for TypeScript

`nopeai` is a tiny, dependency-free permission engine for AI agents.

## Install

```bash
npm install @lexnede/nopeai
```

## Usage

```ts
import { PermissionDeniedError, createPermissionEngine } from "@lexnede/nopeai";

const engine = createPermissionEngine([
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "search",
    effect: "allow",
  },
]);

const agent = { id: "agent_1", roles: ["agent"] };
const tool = { type: "tool", id: "search" };

console.log(engine.can(agent, "call_tool", tool)); // true

try {
  engine.authorize(agent, "call_tool", { type: "tool", id: "email" });
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.log(error.decision.reason);
  }
}
```

## Included Examples

```ts
import { examples, sampleAgents, sampleResources } from "@lexnede/nopeai";

console.log(
  examples.tools.can(sampleAgents.agent, "call_tool", sampleResources.searchTool)
); // true

console.log(
  examples.tenant.can(sampleAgents.finance, "read", sampleResources.invoice)
); // true
```

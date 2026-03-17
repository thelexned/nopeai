import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const moduleUrl = pathToFileURL(resolve("typescript/dist/index.js")).href;
const { PermissionDeniedError, createPermissionEngine } = await import(moduleUrl);

const engine = createPermissionEngine([
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "search",
    effect: "allow",
  },
]);

const allowed = engine.can(
  { id: "agent_1", roles: ["agent"] },
  "call_tool",
  { type: "tool", id: "search" }
);

if (!allowed) {
  throw new Error("Built TypeScript package denied a known allowed action");
}

if (typeof PermissionDeniedError !== "function") {
  throw new Error("Built TypeScript package did not export PermissionDeniedError");
}

console.log("TypeScript package smoke test passed");

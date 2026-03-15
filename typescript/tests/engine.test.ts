import { createPermissionEngine } from "../src/index.ts";
import { PermissionDeniedError } from "../src/errors.ts";

type Agent = {
  id: string;
  roles: string[];
  metadata?: Record<string, unknown>;
};

type Resource = {
  type: string;
  id: string;
  metadata?: Record<string, unknown>;
};

type Rule = {
  role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  effect: "allow" | "deny";
  condition?: (
    agent: Agent,
    action: string,
    resource: Resource,
    context: Record<string, unknown>
  ) => boolean;
};

const tests: Array<{ name: string; fn: () => void }> = [];

function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeAgent(
  id = "agent_1",
  roles: string[] = ["agent"],
  metadata: Record<string, unknown> = {}
): Agent {
  return { id, roles, metadata };
}

function makeResource(
  type: string,
  id: string,
  metadata: Record<string, unknown> = {}
): Resource {
  return { type, id, metadata };
}

function rule(
  role: string,
  action: string,
  resourceType: string,
  effect: "allow" | "deny",
  resourceId?: string,
  condition?: Rule["condition"]
): Rule {
  const item: Rule = {
    role,
    action,
    resource_type: resourceType,
    effect,
  };
  if (resourceId !== undefined) {
    item.resource_id = resourceId;
  }
  if (condition !== undefined) {
    item.condition = condition;
  }
  return item;
}

const agent = makeAgent();
const supportAgent = makeAgent("support_1", ["agent", "support"]);
const searchTool = makeResource("tool", "search");
const emailTool = makeResource("tool", "email");
const githubServer = makeResource("mcp_server", "github");
const slackServer = makeResource("mcp_server", "slack");
const createIssueTool = makeResource("mcp_tool", "github.create_issue");
const deleteRepoTool = makeResource("mcp_tool", "github.delete_repo");
const invoice = makeResource("invoice", "inv_1", { tenant_id: "tenant_a" });

test("1 default deny", () => {
  const engine = createPermissionEngine([]);
  assert(engine.can(agent, "read", searchTool) === false, "expected default deny");
});

test("2 allow rule works", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "tool", "allow", "search"),
  ]);
  assert(engine.can(agent, "read", searchTool) === true, "expected allow");
});

test("3 deny rule works", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "tool", "deny", "search"),
  ]);
  assert(engine.can(agent, "read", searchTool) === false, "expected deny");
});

test("4 deny overrides allow", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "tool", "allow", "search"),
    rule("agent", "read", "tool", "deny", "search"),
  ]);
  assert(engine.can(agent, "read", searchTool) === false, "expected deny override");
});

test("5 wildcard role", () => {
  const engine = createPermissionEngine([
    rule("", "read", "tool", "allow", "search"),
  ]);
  assert(engine.can(agent, "read", searchTool) === true, "expected wildcard role");
});

test("6 wildcard action", () => {
  const engine = createPermissionEngine([
    rule("agent", "", "tool", "allow", "search"),
  ]);
  assert(engine.can(agent, "write", searchTool) === true, "expected wildcard action");
});

test("7 wildcard resource type", () => {
  const engine = createPermissionEngine([rule("agent", "read", "", "allow")]);
  assert(
    engine.can(agent, "read", searchTool) === true,
    "expected wildcard resource type"
  );
});

test("8 wildcard resource id", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "tool", "allow", "*"),
  ]);
  assert(engine.can(agent, "read", emailTool) === true, "expected wildcard id");
});

test("9 condition returning true matches", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "invoice", "allow", undefined, (_agent, _action, _resource, context) => {
      return context.ok === true;
    }),
  ]);
  assert(engine.can(agent, "read", invoice, { ok: true }) === true, "expected condition true");
});

test("10 condition returning false blocks rule", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "invoice", "allow", undefined, (_agent, _action, _resource, context) => {
      return context.ok === true;
    }),
  ]);
  assert(
    engine.can(agent, "read", invoice, { ok: false }) === false,
    "expected condition false to block"
  );
});

test("11 multiple agent roles work", () => {
  const engine = createPermissionEngine([
    rule("support", "call_mcp_tool", "mcp_tool", "allow", "github.create_issue"),
  ]);
  assert(
    engine.can(supportAgent, "call_mcp_tool", createIssueTool) === true,
    "expected support role to match"
  );
});

test("12 authorize throws PermissionDeniedError", () => {
  const engine = createPermissionEngine([]);
  let didThrow = false;
  try {
    engine.authorize(agent, "read", searchTool);
  } catch (error) {
    didThrow = error instanceof PermissionDeniedError;
  }
  assert(didThrow, "expected PermissionDeniedError");
});

test("13 explain returns decision details", () => {
  const engine = createPermissionEngine([
    rule("agent", "read", "tool", "allow", "search"),
  ]);
  const decision = engine.explain(agent, "read", searchTool);
  assert(decision.allowed === true, "expected allowed");
  assert(decision.effect === "allow", "expected allow effect");
  assert(decision.reason === "allow_rule_matched", "expected allow reason");
  assert(decision.matched_rules.length === 1, "expected one matched rule");
});

test("14 agent can call search tool", () => {
  const engine = createPermissionEngine([
    rule("agent", "call_tool", "tool", "allow", "search"),
  ]);
  assert(engine.can(agent, "call_tool", searchTool) === true, "expected search call");
});

test("15 agent cannot call email tool", () => {
  const engine = createPermissionEngine([
    rule("agent", "call_tool", "tool", "deny", "email"),
  ]);
  assert(engine.can(agent, "call_tool", emailTool) === false, "expected email deny");
});

test("16 agent can connect to github MCP server", () => {
  const engine = createPermissionEngine([
    rule("agent", "connect_mcp_server", "mcp_server", "allow", "github"),
  ]);
  assert(
    engine.can(agent, "connect_mcp_server", githubServer) === true,
    "expected github connect"
  );
});

test("17 agent cannot connect to slack MCP server", () => {
  const engine = createPermissionEngine([
    rule("agent", "connect_mcp_server", "mcp_server", "deny", "slack"),
  ]);
  assert(
    engine.can(agent, "connect_mcp_server", slackServer) === false,
    "expected slack deny"
  );
});

test("18 support can call github.create_issue", () => {
  const engine = createPermissionEngine([
    rule("support", "call_mcp_tool", "mcp_tool", "allow", "github.create_issue"),
  ]);
  assert(
    engine.can(supportAgent, "call_mcp_tool", createIssueTool) === true,
    "expected create_issue allow"
  );
});

test("19 support cannot call github.delete_repo", () => {
  const engine = createPermissionEngine([
    rule("support", "call_mcp_tool", "mcp_tool", "deny", "github.delete_repo"),
  ]);
  assert(
    engine.can(supportAgent, "call_mcp_tool", deleteRepoTool) === false,
    "expected delete_repo deny"
  );
});

test("20 finance can read invoice only if tenant matches", () => {
  const financeAgent = makeAgent("finance_1", ["finance"], { tenant_id: "tenant_a" });
  const otherFinanceAgent = makeAgent("finance_2", ["finance"], { tenant_id: "tenant_b" });
  const engine = createPermissionEngine([
    rule("finance", "read", "invoice", "allow", undefined, (agentArg, _action, resourceArg) => {
      return agentArg.metadata?.tenant_id === resourceArg.metadata?.tenant_id;
    }),
  ]);
  assert(engine.can(financeAgent, "read", invoice) === true, "expected tenant match allow");
  assert(
    engine.can(otherFinanceAgent, "read", invoice) === false,
    "expected tenant mismatch deny"
  );
});

let passed = 0;

for (const item of tests) {
  item.fn();
  passed += 1;
}

console.log(`${passed} TypeScript tests passed`);

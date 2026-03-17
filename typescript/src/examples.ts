import { createPermissionEngine } from "./engine.js";

const toolRules = [
  {
    role: "agent",
    action: "call_tool",
    resource_type: "tool",
    resource_id: "search",
    effect: "allow" as const,
  },
  {
    role: "agent",
    action: "send_email",
    resource_type: "tool",
    resource_id: "email",
    effect: "deny" as const,
  },
];

const mcpRules = [
  {
    role: "agent",
    action: "connect_mcp_server",
    resource_type: "mcp_server",
    resource_id: "github",
    effect: "allow" as const,
  },
  {
    role: "support",
    action: "call_mcp_tool",
    resource_type: "mcp_tool",
    resource_id: "github.create_issue",
    effect: "allow" as const,
  },
  {
    role: "support",
    action: "call_mcp_tool",
    resource_type: "mcp_tool",
    resource_id: "github.delete_repo",
    effect: "deny" as const,
  },
];

const tenantRules = [
  {
    role: "finance",
    action: "read",
    resource_type: "invoice",
    effect: "allow" as const,
    condition: (agent: { metadata?: Record<string, unknown> }, _action: string, resource: { metadata?: Record<string, unknown> }) =>
      agent.metadata?.tenant_id === resource.metadata?.tenant_id,
  },
];

export const sampleAgents = {
  agent: { id: "agent_1", roles: ["agent"] },
  support: { id: "support_1", roles: ["agent", "support"] },
  finance: {
    id: "finance_1",
    roles: ["finance"],
    metadata: { tenant_id: "tenant_a" },
  },
};

export const sampleResources = {
  searchTool: { type: "tool", id: "search" },
  emailTool: { type: "tool", id: "email" },
  githubServer: { type: "mcp_server", id: "github" },
  createIssueTool: { type: "mcp_tool", id: "github.create_issue" },
  deleteRepoTool: { type: "mcp_tool", id: "github.delete_repo" },
  invoice: {
    type: "invoice",
    id: "inv_1",
    metadata: { tenant_id: "tenant_a" },
  },
};

export const exampleRules = {
  tools: toolRules,
  mcp: mcpRules,
  tenant: tenantRules,
};

export const examples = {
  tools: createPermissionEngine(toolRules),
  mcp: createPermissionEngine(mcpRules),
  tenant: createPermissionEngine(tenantRules),
};

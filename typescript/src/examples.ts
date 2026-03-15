import { createPermissionEngine } from "./engine.ts";

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

export const examples = {
  tools: createPermissionEngine(toolRules),
  mcp: createPermissionEngine(mcpRules),
  tenant: createPermissionEngine(tenantRules),
};

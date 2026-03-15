from engine import createPermissionEngine


tool_rules = [
    {
        "role": "agent",
        "action": "call_tool",
        "resource_type": "tool",
        "resource_id": "search",
        "effect": "allow",
    },
    {
        "role": "agent",
        "action": "send_email",
        "resource_type": "tool",
        "resource_id": "email",
        "effect": "deny",
    },
]

mcp_rules = [
    {
        "role": "agent",
        "action": "connect_mcp_server",
        "resource_type": "mcp_server",
        "resource_id": "github",
        "effect": "allow",
    },
    {
        "role": "support",
        "action": "call_mcp_tool",
        "resource_type": "mcp_tool",
        "resource_id": "github.create_issue",
        "effect": "allow",
    },
    {
        "role": "support",
        "action": "call_mcp_tool",
        "resource_type": "mcp_tool",
        "resource_id": "github.delete_repo",
        "effect": "deny",
    },
]

tenant_rules = [
    {
        "role": "finance",
        "action": "read",
        "resource_type": "invoice",
        "effect": "allow",
        "condition": lambda agent, action, resource, context: agent.get(
            "metadata", {}
        ).get("tenant_id")
        == resource.get("metadata", {}).get("tenant_id"),
    }
]


examples = {
    "tools": createPermissionEngine(tool_rules),
    "mcp": createPermissionEngine(mcp_rules),
    "tenant": createPermissionEngine(tenant_rules),
}

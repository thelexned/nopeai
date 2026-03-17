from .engine import createPermissionEngine


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

sample_agents = {
    "agent": {"id": "agent_1", "roles": ["agent"]},
    "support": {"id": "support_1", "roles": ["agent", "support"]},
    "finance": {
        "id": "finance_1",
        "roles": ["finance"],
        "metadata": {"tenant_id": "tenant_a"},
    },
}

sample_resources = {
    "search_tool": {"type": "tool", "id": "search"},
    "email_tool": {"type": "tool", "id": "email"},
    "github_server": {"type": "mcp_server", "id": "github"},
    "create_issue_tool": {"type": "mcp_tool", "id": "github.create_issue"},
    "delete_repo_tool": {"type": "mcp_tool", "id": "github.delete_repo"},
    "invoice": {
        "type": "invoice",
        "id": "inv_1",
        "metadata": {"tenant_id": "tenant_a"},
    },
}

example_rules = {
    "tools": tool_rules,
    "mcp": mcp_rules,
    "tenant": tenant_rules,
}

examples = {
    "tools": createPermissionEngine(tool_rules),
    "mcp": createPermissionEngine(mcp_rules),
    "tenant": createPermissionEngine(tenant_rules),
}

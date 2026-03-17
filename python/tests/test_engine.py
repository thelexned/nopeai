import nopeai as init_module
from nopeai import PermissionDeniedError, createPermissionEngine
from nopeai import examples as examples_module
from nopeai import types as types_module


def run_tests():
    def make_agent(agent_id="agent_1", roles=None, metadata=None):
        return {
            "id": agent_id,
            "roles": roles or ["agent"],
            "metadata": metadata or {},
        }

    def make_resource(resource_type, resource_id, metadata=None):
        return {
            "type": resource_type,
            "id": resource_id,
            "metadata": metadata or {},
        }

    def rule(
        role,
        action,
        resource_type,
        effect,
        resource_id=None,
        condition=None,
    ):
        item = {
            "role": role,
            "action": action,
            "resource_type": resource_type,
            "effect": effect,
        }
        if resource_id is not None:
            item["resource_id"] = resource_id
        if condition is not None:
            item["condition"] = condition
        return item

    agent = make_agent()
    search_tool = make_resource("tool", "search")
    email_tool = make_resource("tool", "email")
    github_server = make_resource("mcp_server", "github")
    slack_server = make_resource("mcp_server", "slack")
    create_issue_tool = make_resource("mcp_tool", "github.create_issue")
    delete_repo_tool = make_resource("mcp_tool", "github.delete_repo")
    invoice = make_resource("invoice", "inv_1", {"tenant_id": "tenant_a"})

    # 1 default deny
    engine = createPermissionEngine([])
    assert engine.can(agent, "read", search_tool) is False

    # 2 allow rule works
    engine = createPermissionEngine(
        [rule("agent", "read", "tool", "allow", resource_id="search")]
    )
    assert engine.can(agent, "read", search_tool) is True

    # 3 deny rule works
    engine = createPermissionEngine(
        [rule("agent", "read", "tool", "deny", resource_id="search")]
    )
    assert engine.can(agent, "read", search_tool) is False

    # 4 deny overrides allow
    engine = createPermissionEngine(
        [
            rule("agent", "read", "tool", "allow", resource_id="search"),
            rule("agent", "read", "tool", "deny", resource_id="search"),
        ]
    )
    assert engine.can(agent, "read", search_tool) is False

    # 5 wildcard role
    engine = createPermissionEngine(
        [rule("", "read", "tool", "allow", resource_id="search")]
    )
    assert engine.can(agent, "read", search_tool) is True

    # 6 wildcard action
    engine = createPermissionEngine(
        [rule("agent", "", "tool", "allow", resource_id="search")]
    )
    assert engine.can(agent, "write", search_tool) is True

    # 7 wildcard resource type
    engine = createPermissionEngine([rule("agent", "read", "", "allow")])
    assert engine.can(agent, "read", search_tool) is True

    # 8 wildcard resource id
    engine = createPermissionEngine(
        [rule("agent", "read", "tool", "allow", resource_id="*")]
    )
    assert engine.can(agent, "read", email_tool) is True

    # 9 condition returning true matches
    engine = createPermissionEngine(
        [
            rule(
                "agent",
                "read",
                "invoice",
                "allow",
                condition=lambda agent, action, resource, context: context["ok"] is True,
            )
        ]
    )
    assert engine.can(agent, "read", invoice, {"ok": True}) is True

    # 10 condition returning false blocks rule
    assert engine.can(agent, "read", invoice, {"ok": False}) is False

    # 11 multiple agent roles work
    support_agent = make_agent(roles=["agent", "support"])
    engine = createPermissionEngine(
        [rule("support", "call_mcp_tool", "mcp_tool", "allow", "github.create_issue")]
    )
    assert engine.can(support_agent, "call_mcp_tool", create_issue_tool) is True

    # 12 authorize throws PermissionDeniedError
    engine = createPermissionEngine([])
    try:
        engine.authorize(agent, "read", search_tool)
        raise AssertionError("Expected PermissionDeniedError")
    except PermissionDeniedError:
        pass

    # 13 explain returns decision details
    engine = createPermissionEngine(
        [rule("agent", "read", "tool", "allow", resource_id="search")]
    )
    decision = engine.explain(agent, "read", search_tool)
    assert decision["allowed"] is True
    assert decision["effect"] == "allow"
    assert decision["reason"] == "allow_rule_matched"
    assert len(decision["matched_rules"]) == 1

    # 14 agent can call search tool
    engine = createPermissionEngine(
        [rule("agent", "call_tool", "tool", "allow", resource_id="search")]
    )
    assert engine.can(agent, "call_tool", search_tool) is True

    # 15 agent cannot call email tool
    engine = createPermissionEngine(
        [rule("agent", "call_tool", "tool", "deny", resource_id="email")]
    )
    assert engine.can(agent, "call_tool", email_tool) is False

    # 16 agent can connect to github MCP server
    engine = createPermissionEngine(
        [
            rule(
                "agent",
                "connect_mcp_server",
                "mcp_server",
                "allow",
                resource_id="github",
            )
        ]
    )
    assert engine.can(agent, "connect_mcp_server", github_server) is True

    # 17 agent cannot connect to slack MCP server
    engine = createPermissionEngine(
        [
            rule(
                "agent",
                "connect_mcp_server",
                "mcp_server",
                "deny",
                resource_id="slack",
            )
        ]
    )
    assert engine.can(agent, "connect_mcp_server", slack_server) is False

    # 18 support can call github.create_issue
    engine = createPermissionEngine(
        [
            rule(
                "support",
                "call_mcp_tool",
                "mcp_tool",
                "allow",
                resource_id="github.create_issue",
            )
        ]
    )
    assert engine.can(support_agent, "call_mcp_tool", create_issue_tool) is True

    # 19 support cannot call github.delete_repo
    engine = createPermissionEngine(
        [
            rule(
                "support",
                "call_mcp_tool",
                "mcp_tool",
                "deny",
                resource_id="github.delete_repo",
            )
        ]
    )
    assert engine.can(support_agent, "call_mcp_tool", delete_repo_tool) is False

    # 20 finance can read invoice only if tenant matches
    finance_agent = make_agent(
        agent_id="finance_1",
        roles=["finance"],
        metadata={"tenant_id": "tenant_a"},
    )
    other_finance_agent = make_agent(
        agent_id="finance_2",
        roles=["finance"],
        metadata={"tenant_id": "tenant_b"},
    )
    engine = createPermissionEngine(
        [
            rule(
                "finance",
                "read",
                "invoice",
                "allow",
                condition=lambda agent, action, resource, context: agent["metadata"].get(
                    "tenant_id"
                )
                == resource["metadata"].get("tenant_id"),
            )
        ]
    )
    assert engine.can(finance_agent, "read", invoice) is True
    assert engine.can(other_finance_agent, "read", invoice) is False

    # 21 authorize returns true when allowed
    engine = createPermissionEngine(
        [rule("agent", "read", "tool", "allow", resource_id="search")]
    )
    assert engine.authorize(agent, "read", search_tool) is True

    # 22 exported example engines behave as documented
    assert examples_module.examples["tools"].can(agent, "call_tool", search_tool) is True
    assert examples_module.examples["tools"].can(agent, "send_email", email_tool) is False
    assert (
        examples_module.examples["mcp"].can(
            agent, "connect_mcp_server", github_server
        )
        is True
    )
    assert (
        examples_module.examples["mcp"].can(
            support_agent, "call_mcp_tool", create_issue_tool
        )
        is True
    )
    assert (
        examples_module.examples["mcp"].can(
            support_agent, "call_mcp_tool", delete_repo_tool
        )
        is False
    )
    assert examples_module.examples["tenant"].can(finance_agent, "read", invoice) is True

    # 23 package init exposes the public API
    assert init_module.__all__ == ["createPermissionEngine", "PermissionDeniedError"]
    assert init_module.createPermissionEngine is createPermissionEngine
    assert init_module.PermissionDeniedError is PermissionDeniedError

    # 24 types module loads the runtime typing surface
    assert types_module.Effect is not None
    assert types_module.Context is not None
    assert types_module.Agent is not None
    assert types_module.Resource is not None
    assert types_module.Condition is not None
    assert types_module.Rule is not None
    assert types_module.Decision is not None

    print("24 Python tests passed")


if __name__ == "__main__":
    run_tests()

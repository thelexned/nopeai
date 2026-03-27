from .errors import (
    ActionValidationError,
    AgentValidationError,
    ContextValidationError,
    PermissionDeniedError,
    ResourceValidationError,
    RuleValidationError,
)


def _is_dict(value):
    return isinstance(value, dict)


def _validate_rule(rule, index):
    if not _is_dict(rule):
        raise RuleValidationError(f"rules[{index}]", f"Rule at index {index} must be a dict")

    if not isinstance(rule.get("role"), str):
        raise RuleValidationError(f"rules[{index}].role", "Rule role must be a string")
    if not isinstance(rule.get("action"), str):
        raise RuleValidationError(f"rules[{index}].action", "Rule action must be a string")
    if not isinstance(rule.get("resource_type"), str):
        raise RuleValidationError(
            f"rules[{index}].resource_type", "Rule resource_type must be a string"
        )

    resource_id = rule.get("resource_id")
    if resource_id is not None and not isinstance(resource_id, str):
        raise RuleValidationError(
            f"rules[{index}].resource_id", "Rule resource_id must be a string when provided"
        )

    if rule.get("effect") not in ("allow", "deny"):
        raise RuleValidationError(
            f"rules[{index}].effect", "Rule effect must be either 'allow' or 'deny'"
        )

    condition = rule.get("condition")
    if condition is not None and not callable(condition):
        raise RuleValidationError(
            f"rules[{index}].condition", "Rule condition must be callable when provided"
        )


def _validate_agent(agent):
    if not _is_dict(agent):
        raise AgentValidationError("agent", "Agent must be a dict")

    if not isinstance(agent.get("id"), str):
        raise AgentValidationError("agent.id", "Agent id must be a string")

    roles = agent.get("roles")
    if not isinstance(roles, list) or not all(isinstance(role, str) for role in roles):
        raise AgentValidationError("agent.roles", "Agent roles must be a list of strings")

    metadata = agent.get("metadata")
    if metadata is not None and not _is_dict(metadata):
        raise AgentValidationError("agent.metadata", "Agent metadata must be a dict")


def _validate_resource(resource):
    if not _is_dict(resource):
        raise ResourceValidationError("resource", "Resource must be a dict")

    if not isinstance(resource.get("type"), str):
        raise ResourceValidationError("resource.type", "Resource type must be a string")

    if not isinstance(resource.get("id"), str):
        raise ResourceValidationError("resource.id", "Resource id must be a string")

    metadata = resource.get("metadata")
    if metadata is not None and not _is_dict(metadata):
        raise ResourceValidationError("resource.metadata", "Resource metadata must be a dict")


def _validate_action(action):
    if not isinstance(action, str):
        raise ActionValidationError("Action must be a string")


def _validate_context(context):
    if not _is_dict(context):
        raise ContextValidationError("Context must be a dict")


def _matches_role(rule_role, agent_roles):
    return rule_role == "" or rule_role in agent_roles


def _matches_action(rule_action, action):
    return rule_action == "" or rule_action == action


def _matches_resource_type(rule_resource_type, resource_type):
    return rule_resource_type == "" or rule_resource_type == resource_type


def _matches_resource_id(rule, resource_id):
    rule_resource_id = rule.get("resource_id")
    return (
        rule_resource_id is None
        or rule_resource_id == "*"
        or rule_resource_id == resource_id
    )


def _matches_condition(rule, agent, action, resource, context):
    condition = rule.get("condition")
    return condition is None or bool(condition(agent, action, resource, context))


def _matches_rule(rule, agent, action, resource, context):
    return (
        _matches_role(rule["role"], agent["roles"])
        and _matches_action(rule["action"], action)
        and _matches_resource_type(rule["resource_type"], resource["type"])
        and _matches_resource_id(rule, resource["id"])
        and _matches_condition(rule, agent, action, resource, context)
    )


class PermissionEngine:
    def __init__(self, rules):
        self._rules = list(rules)

    def can(self, agent, action, resource, context=None):
        return self.explain(agent, action, resource, context)["allowed"]

    def authorize(self, agent, action, resource, context=None):
        decision = self.explain(agent, action, resource, context)
        if not decision["allowed"]:
            raise PermissionDeniedError(action, resource, decision)
        return True

    def explain(self, agent, action, resource, context=None):
        _validate_agent(agent)
        _validate_action(action)
        _validate_resource(resource)
        ctx = context or {}
        _validate_context(ctx)

        matched_rules = [
            rule
            for rule in self._rules
            if _matches_rule(rule, agent, action, resource, ctx)
        ]

        if any(rule["effect"] == "deny" for rule in matched_rules):
            return {
                "allowed": False,
                "effect": "deny",
                "reason": "deny_rule_matched",
                "matched_rules": matched_rules,
            }

        if any(rule["effect"] == "allow" for rule in matched_rules):
            return {
                "allowed": True,
                "effect": "allow",
                "reason": "allow_rule_matched",
                "matched_rules": matched_rules,
            }

        return {
            "allowed": False,
            "effect": "deny",
            "reason": "default_deny",
            "matched_rules": [],
        }


def createPermissionEngine(rules):
    if not isinstance(rules, list):
        raise RuleValidationError("rules", "Rules must be a list")

    for index, rule in enumerate(rules):
        _validate_rule(rule, index)

    return PermissionEngine(rules)

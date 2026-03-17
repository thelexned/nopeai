from .errors import PermissionDeniedError


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
        ctx = context or {}
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
    return PermissionEngine(rules)

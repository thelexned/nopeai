import { PermissionDeniedError } from "./errors.ts";
import type { Agent, Context, Decision, Resource, Rule } from "./types.ts";

function matchesRole(ruleRole: string, agentRoles: string[]): boolean {
  return ruleRole === "" || agentRoles.includes(ruleRole);
}

function matchesAction(ruleAction: string, action: string): boolean {
  return ruleAction === "" || ruleAction === action;
}

function matchesResourceType(ruleResourceType: string, resourceType: string): boolean {
  return ruleResourceType === "" || ruleResourceType === resourceType;
}

function matchesResourceId(rule: Rule, resourceId: string): boolean {
  return (
    rule.resource_id === undefined ||
    rule.resource_id === "*" ||
    rule.resource_id === resourceId
  );
}

function matchesCondition(
  rule: Rule,
  agent: Agent,
  action: string,
  resource: Resource,
  context: Context
): boolean {
  return rule.condition === undefined || Boolean(rule.condition(agent, action, resource, context));
}

function matchesRule(
  rule: Rule,
  agent: Agent,
  action: string,
  resource: Resource,
  context: Context
): boolean {
  return (
    matchesRole(rule.role, agent.roles) &&
    matchesAction(rule.action, action) &&
    matchesResourceType(rule.resource_type, resource.type) &&
    matchesResourceId(rule, resource.id) &&
    matchesCondition(rule, agent, action, resource, context)
  );
}

class PermissionEngine {
  private readonly rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = [...rules];
  }

  can(agent: Agent, action: string, resource: Resource, context: Context = {}): boolean {
    return this.explain(agent, action, resource, context).allowed;
  }

  authorize(
    agent: Agent,
    action: string,
    resource: Resource,
    context: Context = {}
  ): true {
    const decision = this.explain(agent, action, resource, context);
    if (!decision.allowed) {
      throw new PermissionDeniedError(action, resource, decision);
    }
    return true;
  }

  explain(
    agent: Agent,
    action: string,
    resource: Resource,
    context: Context = {}
  ): Decision {
    const matchedRules = this.rules.filter((rule) =>
      matchesRule(rule, agent, action, resource, context)
    );

    if (matchedRules.some((rule) => rule.effect === "deny")) {
      return {
        allowed: false,
        effect: "deny",
        reason: "deny_rule_matched",
        matched_rules: matchedRules,
      };
    }

    if (matchedRules.some((rule) => rule.effect === "allow")) {
      return {
        allowed: true,
        effect: "allow",
        reason: "allow_rule_matched",
        matched_rules: matchedRules,
      };
    }

    return {
      allowed: false,
      effect: "deny",
      reason: "default_deny",
      matched_rules: [],
    };
  }
}

export function createPermissionEngine(rules: Rule[]): PermissionEngine {
  return new PermissionEngine(rules);
}

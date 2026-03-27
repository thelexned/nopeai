import {
  ActionValidationError,
  AgentValidationError,
  ContextValidationError,
  PermissionDeniedError,
  ResourceValidationError,
  RuleValidationError,
} from "./errors.js";
import type {
  Agent,
  Context,
  Decision,
  PermissionEngine,
  Resource,
  Rule,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRule(rule: Rule, index: number): void {
  if (!isRecord(rule)) {
    throw new RuleValidationError(`rules[${index}]`, `Rule at index ${index} must be an object`);
  }

  if (typeof rule.role !== "string") {
    throw new RuleValidationError(`rules[${index}].role`, "Rule role must be a string");
  }
  if (typeof rule.action !== "string") {
    throw new RuleValidationError(`rules[${index}].action`, "Rule action must be a string");
  }
  if (typeof rule.resource_type !== "string") {
    throw new RuleValidationError(
      `rules[${index}].resource_type`,
      "Rule resource_type must be a string"
    );
  }
  if (rule.resource_id !== undefined && typeof rule.resource_id !== "string") {
    throw new RuleValidationError(
      `rules[${index}].resource_id`,
      "Rule resource_id must be a string when provided"
    );
  }
  if (rule.effect !== "allow" && rule.effect !== "deny") {
    throw new RuleValidationError(
      `rules[${index}].effect`,
      "Rule effect must be either 'allow' or 'deny'"
    );
  }
  if (rule.condition !== undefined && typeof rule.condition !== "function") {
    throw new RuleValidationError(
      `rules[${index}].condition`,
      "Rule condition must be a function when provided"
    );
  }
}

function validateAgent(agent: Agent): void {
  if (!isRecord(agent)) {
    throw new AgentValidationError("agent", "Agent must be an object");
  }
  if (typeof agent.id !== "string") {
    throw new AgentValidationError("agent.id", "Agent id must be a string");
  }
  if (!Array.isArray(agent.roles) || !agent.roles.every((role) => typeof role === "string")) {
    throw new AgentValidationError("agent.roles", "Agent roles must be an array of strings");
  }
  if (agent.metadata !== undefined && !isRecord(agent.metadata)) {
    throw new AgentValidationError("agent.metadata", "Agent metadata must be an object");
  }
}

function validateResource(resource: Resource): void {
  if (!isRecord(resource)) {
    throw new ResourceValidationError("resource", "Resource must be an object");
  }
  if (typeof resource.type !== "string") {
    throw new ResourceValidationError("resource.type", "Resource type must be a string");
  }
  if (typeof resource.id !== "string") {
    throw new ResourceValidationError("resource.id", "Resource id must be a string");
  }
  if (resource.metadata !== undefined && !isRecord(resource.metadata)) {
    throw new ResourceValidationError("resource.metadata", "Resource metadata must be an object");
  }
}

function validateAction(action: string): void {
  if (typeof action !== "string") {
    throw new ActionValidationError("Action must be a string");
  }
}

function validateContext(context: Context): void {
  if (!isRecord(context)) {
    throw new ContextValidationError("Context must be an object");
  }
}

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

class PermissionEngineImpl implements PermissionEngine {
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
    validateAgent(agent);
    validateAction(action);
    validateResource(resource);
    validateContext(context);

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
  if (!Array.isArray(rules)) {
    throw new RuleValidationError("rules", "Rules must be an array");
  }
  rules.forEach((rule, index) => validateRule(rule, index));
  return new PermissionEngineImpl(rules);
}

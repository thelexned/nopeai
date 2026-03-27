import type { Decision, Resource } from "./types.js";

export class ValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class RuleValidationError extends ValidationError {
  constructor(field: string, message: string) {
    super(field, message);
    this.name = "RuleValidationError";
  }
}

export class AgentValidationError extends ValidationError {
  constructor(field: string, message: string) {
    super(field, message);
    this.name = "AgentValidationError";
  }
}

export class ResourceValidationError extends ValidationError {
  constructor(field: string, message: string) {
    super(field, message);
    this.name = "ResourceValidationError";
  }
}

export class ActionValidationError extends ValidationError {
  constructor(message: string) {
    super("action", message);
    this.name = "ActionValidationError";
  }
}

export class ContextValidationError extends ValidationError {
  constructor(message: string) {
    super("context", message);
    this.name = "ContextValidationError";
  }
}

export class PermissionDeniedError extends Error {
  action: string;
  resource: Resource;
  decision: Decision;

  constructor(action: string, resource: Resource, decision: Decision) {
    super(`Permission denied for action '${action}' on ${resource.type}:${resource.id}`);
    this.name = "PermissionDeniedError";
    this.action = action;
    this.resource = resource;
    this.decision = decision;
  }
}

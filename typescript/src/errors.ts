import type { Decision, Resource } from "./types.js";

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

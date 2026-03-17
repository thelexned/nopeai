export type Effect = "allow" | "deny";

export type Context = Record<string, unknown>;

export type Agent = {
  id: string;
  roles: string[];
  metadata?: Record<string, unknown>;
};

export type Resource = {
  type: string;
  id: string;
  metadata?: Record<string, unknown>;
};

export type Condition = (
  agent: Agent,
  action: string,
  resource: Resource,
  context: Context
) => boolean;

export type Rule = {
  role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  effect: Effect;
  condition?: Condition;
};

export type Decision = {
  allowed: boolean;
  effect: Effect;
  reason: string;
  matched_rules: Rule[];
};

export type PermissionEngine = {
  can(agent: Agent, action: string, resource: Resource, context?: Context): boolean;
  authorize(agent: Agent, action: string, resource: Resource, context?: Context): true;
  explain(agent: Agent, action: string, resource: Resource, context?: Context): Decision;
};

from typing import Any, Callable, Dict, List, Literal, TypedDict

try:
    from typing import NotRequired
except ImportError:
    class NotRequired:
        def __class_getitem__(cls, item):
            return item


Context = Dict[str, Any]
Effect = Literal["allow", "deny"]


class Agent(TypedDict):
    id: str
    roles: List[str]
    metadata: NotRequired[Dict[str, Any]]


class Resource(TypedDict):
    type: str
    id: str
    metadata: NotRequired[Dict[str, Any]]


Condition = Callable[[Agent, str, Resource, Context], bool]


class Rule(TypedDict):
    role: str
    action: str
    resource_type: str
    effect: Effect
    resource_id: NotRequired[str]
    condition: NotRequired[Condition]


class Decision(TypedDict):
    allowed: bool
    effect: Effect
    reason: str
    matched_rules: List[Rule]

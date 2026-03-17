class ValidationError(Exception):
    def __init__(self, field, message):
        super().__init__(message)
        self.field = field


class RuleValidationError(ValidationError):
    pass


class AgentValidationError(ValidationError):
    pass


class ResourceValidationError(ValidationError):
    pass


class ActionValidationError(ValidationError):
    def __init__(self, message):
        super().__init__("action", message)


class ContextValidationError(ValidationError):
    def __init__(self, message):
        super().__init__("context", message)


class PermissionDeniedError(Exception):
    def __init__(self, action, resource, decision):
        message = (
            f"Permission denied for action '{action}' on "
            f"{resource['type']}:{resource['id']}"
        )
        super().__init__(message)
        self.action = action
        self.resource = resource
        self.decision = decision

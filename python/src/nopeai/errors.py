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

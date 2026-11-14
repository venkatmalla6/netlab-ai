"""Custom exception classes."""

from __future__ import annotations

from typing import Any, Optional


class NetlabError(Exception):
    """Base exception for NETLAB AI."""

    def __init__(self, message: str = "An unexpected error occurred", status_code: int = 500, details: Optional[Any] = None) -> None:
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class AIProviderError(NetlabError):
    """Raised when an AI provider fails."""

    def __init__(self, message: str = "AI provider error", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=502, details=details)


class AIProviderUnavailableError(AIProviderError):
    """Raised when no AI provider is available."""

    def __init__(self, message: str = "No AI provider is currently available") -> None:
        super().__init__(message=message)


class EVENGError(NetlabError):
    """Raised when EVE-NG interaction fails."""

    def __init__(self, message: str = "EVE-NG error", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=502, details=details)


class VMwareError(NetlabError):
    """Raised when VMware interaction fails."""

    def __init__(self, message: str = "VMware error", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=502, details=details)


class DeviceConnectionError(NetlabError):
    """Raised when device connection fails."""

    def __init__(self, message: str = "Failed to connect to device", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=503, details=details)


class NotFoundError(NetlabError):
    """Raised when a resource is not found."""

    def __init__(self, resource: str = "Resource", resource_id: Any = None) -> None:
        msg = f"{resource} not found"
        if resource_id is not None:
            msg = f"{resource} with id '{resource_id}' not found"
        super().__init__(message=msg, status_code=404)


class ValidationError(NetlabError):
    """Raised for custom validation errors."""

    def __init__(self, message: str = "Validation error", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=422, details=details)

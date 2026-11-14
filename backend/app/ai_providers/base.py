"""Abstract base class for AI providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Optional


class AIProvider(ABC):
    """Interface every AI provider must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str | AsyncIterator[str]:
        """Send chat messages and return the assistant reply.

        When *stream* is True, return an async iterator yielding text chunks.
        When *stream* is False, return the full response string.
        """
        ...

    @abstractmethod
    async def available(self) -> bool:
        """Return True if the provider is reachable and configured."""
        ...

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """Return a list of models offered by this provider."""
        ...

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator
from pydantic import BaseModel


class AgentConfig(BaseModel):
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    system_prompt: str = ""
    tools: list[str] = []


class BaseAgent(ABC):
    """Base class for all agents"""

    def __init__(self, config: AgentConfig):
        self.config = config

    @abstractmethod
    async def run(self, message: str, context: dict = None) -> str:
        """Execute agent with a message"""
        pass

    @abstractmethod
    async def stream(
        self, message: str, context: dict = None
    ) -> AsyncGenerator[str, None]:
        """Stream agent response"""
        pass

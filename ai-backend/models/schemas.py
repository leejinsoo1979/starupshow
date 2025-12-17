from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: Optional[datetime] = None


class AgentConfig(BaseModel):
    id: Optional[str] = None
    name: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    system_prompt: str = ""
    tools: list[str] = []
    metadata: dict[str, Any] = {}


class ToolConfig(BaseModel):
    name: str
    description: str
    enabled: bool = True
    config: dict[str, Any] = {}


class AgentRunResult(BaseModel):
    output: str
    intermediate_steps: list[dict] = []
    tokens_used: Optional[int] = None
    execution_time: Optional[float] = None


class DeployedAgent(BaseModel):
    id: str
    name: str
    model: str
    system_prompt: str
    tools: list[str]
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

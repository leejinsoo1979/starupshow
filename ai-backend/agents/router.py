"""
Agent API Router
Provides REST endpoints for agent execution with support for
both legacy and LangGraph-based executors
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal, Optional
import json

from .executor import AgentExecutor
from .langgraph_executor import (
    LangGraphAgentExecutor,
    DocsAgentExecutor,
    SheetAgentExecutor,
    EmailAgentExecutor,
    MultiAgentExecutor,
    create_agent_executor,
)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================
class ChatMessage(BaseModel):
    role: str
    content: str


class AgentRunRequest(BaseModel):
    message: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    system_prompt: str = ""
    tools: list[str] = []
    chat_history: list[ChatMessage] = []
    stream: bool = False
    context: dict = Field(default_factory=dict)  # Additional context


class AgentRunResponse(BaseModel):
    output: str
    intermediate_steps: list[dict] = []
    tool_calls_count: int = 0
    metadata: dict = Field(default_factory=dict)
    error: str | None = None


class SpecializedAgentRequest(BaseModel):
    message: str
    model: str | None = None  # Use default model for agent type if not specified
    temperature: float = 0.7
    chat_history: list[ChatMessage] = []
    context: dict = Field(default_factory=dict)
    thread_id: str | None = None  # For memory persistence


class StreamEvent(BaseModel):
    type: Literal["token", "tool_start", "tool_end", "error", "done"]
    content: str | None = None
    tool: str | None = None
    input: dict | None = None
    output: str | None = None
    message: str | None = None


# ============================================
# Legacy Endpoints (backward compatible)
# ============================================
@router.post("/run", response_model=AgentRunResponse)
async def run_agent(request: AgentRunRequest):
    """Execute an agent with the given configuration (legacy endpoint)"""
    try:
        executor = AgentExecutor(
            model=request.model,
            temperature=request.temperature,
            system_prompt=request.system_prompt,
            tool_names=request.tools,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_agent(request: AgentRunRequest):
    """Stream agent response (legacy endpoint)"""
    try:
        executor = AgentExecutor(
            model=request.model,
            temperature=request.temperature,
            system_prompt=request.system_prompt,
            tool_names=request.tools,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for chunk in executor.stream(
                message=request.message,
                chat_history=history,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LangGraph Endpoints
# ============================================
@router.post("/v2/run", response_model=AgentRunResponse)
async def run_agent_v2(request: AgentRunRequest):
    """Execute agent using LangGraph executor"""
    try:
        executor = LangGraphAgentExecutor(
            model=request.model,
            temperature=request.temperature,
            system_prompt=request.system_prompt,
            tool_names=request.tools,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/v2/stream")
async def stream_agent_v2(request: AgentRunRequest):
    """Stream agent response using LangGraph executor with detailed events"""
    try:
        executor = LangGraphAgentExecutor(
            model=request.model,
            temperature=request.temperature,
            system_prompt=request.system_prompt,
            tool_names=request.tools,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for event in executor.stream(
                message=request.message,
                chat_history=history,
                context=request.context,
            ):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Specialized Agent Endpoints
# ============================================
@router.post("/docs/run", response_model=AgentRunResponse)
async def run_docs_agent(request: SpecializedAgentRequest):
    """Execute document-specialized agent"""
    try:
        executor = DocsAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
            thread_id=request.thread_id,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/docs/stream")
async def stream_docs_agent(request: SpecializedAgentRequest):
    """Stream document-specialized agent response"""
    try:
        executor = DocsAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for event in executor.stream(
                message=request.message,
                chat_history=history,
                context=request.context,
                thread_id=request.thread_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sheet/run", response_model=AgentRunResponse)
async def run_sheet_agent(request: SpecializedAgentRequest):
    """Execute spreadsheet-specialized agent"""
    try:
        executor = SheetAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
            thread_id=request.thread_id,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sheet/stream")
async def stream_sheet_agent(request: SpecializedAgentRequest):
    """Stream spreadsheet-specialized agent response"""
    try:
        executor = SheetAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for event in executor.stream(
                message=request.message,
                chat_history=history,
                context=request.context,
                thread_id=request.thread_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email/run", response_model=AgentRunResponse)
async def run_email_agent(request: SpecializedAgentRequest):
    """Execute email-specialized agent"""
    try:
        executor = EmailAgentExecutor(
            model=request.model or "grok-3-fast",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
            thread_id=request.thread_id,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email/stream")
async def stream_email_agent(request: SpecializedAgentRequest):
    """Stream email-specialized agent response"""
    try:
        executor = EmailAgentExecutor(
            model=request.model or "grok-3-fast",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for event in executor.stream(
                message=request.message,
                chat_history=history,
                context=request.context,
                thread_id=request.thread_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multi/run", response_model=AgentRunResponse)
async def run_multi_agent(request: SpecializedAgentRequest):
    """Execute multi-capability agent with all tools"""
    try:
        executor = MultiAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
            thread_id=request.thread_id,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multi/stream")
async def stream_multi_agent(request: SpecializedAgentRequest):
    """Stream multi-capability agent response"""
    try:
        executor = MultiAgentExecutor(
            model=request.model or "gpt-4o",
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        async def generate():
            async for event in executor.stream(
                message=request.message,
                chat_history=history,
                context=request.context,
                thread_id=request.thread_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Factory Endpoint
# ============================================
@router.post("/create/{agent_type}/run", response_model=AgentRunResponse)
async def run_custom_agent(
    agent_type: Literal["general", "docs", "sheet", "email", "multi"],
    request: SpecializedAgentRequest,
):
    """Create and run a specialized agent by type"""
    try:
        executor = create_agent_executor(
            agent_type=agent_type,
            model=request.model,
            temperature=request.temperature,
        )

        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

        result = await executor.run(
            message=request.message,
            chat_history=history,
            context=request.context,
            thread_id=request.thread_id,
        )

        return AgentRunResponse(
            output=result["output"],
            intermediate_steps=result.get("intermediate_steps", []),
            tool_calls_count=result.get("tool_calls_count", 0),
            metadata=result.get("metadata", {}),
            error=result.get("error"),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Utility Endpoints
# ============================================
@router.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            # OpenAI
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "recommended_for": ["docs", "sheet", "multi"]},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "recommended_for": ["quick_tasks"]},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider": "openai", "recommended_for": ["complex_analysis"]},
            # Anthropic
            {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic", "recommended_for": ["docs", "analysis"]},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "provider": "anthropic", "recommended_for": ["quick_tasks"]},
            # xAI
            {"id": "grok-3-mini", "name": "Grok 3 Mini", "provider": "xai", "recommended_for": ["email"]},
            {"id": "grok-3-fast", "name": "Grok 3 Fast", "provider": "xai", "recommended_for": ["email", "quick_tasks"]},
            {"id": "grok-4-1-fast", "name": "Grok 4.1 Fast", "provider": "xai", "recommended_for": ["email", "analysis"]},
            # Ollama (local)
            {"id": "ollama/llama3.2", "name": "Llama 3.2 (Local)", "provider": "ollama", "recommended_for": ["offline", "privacy"]},
            {"id": "ollama/mistral", "name": "Mistral (Local)", "provider": "ollama", "recommended_for": ["offline", "privacy"]},
        ]
    }


@router.get("/agents")
async def list_agent_types():
    """List available specialized agent types"""
    return {
        "agents": [
            {
                "type": "general",
                "name": "General Agent",
                "description": "일반적인 작업을 처리하는 범용 에이전트",
                "default_model": "gpt-4o",
                "tools": ["user-defined"],
            },
            {
                "type": "docs",
                "name": "Documents Agent",
                "description": "문서 생성, 검색, 분석 전문 에이전트",
                "default_model": "gpt-4o",
                "tools": ["ai_docs_create", "ai_docs_search", "ai_docs_get", "ai_docs_analyze", "ai_docs_update", "ai_docs_list", "ai_docs_delete"],
            },
            {
                "type": "sheet",
                "name": "Spreadsheet Agent",
                "description": "스프레드시트 데이터 관리 및 분석 전문 에이전트",
                "default_model": "gpt-4o",
                "tools": ["ai_sheet_create", "ai_sheet_get", "ai_sheet_add_rows", "ai_sheet_update_cell", "ai_sheet_analyze", "ai_sheet_query", "ai_sheet_add_column", "ai_sheet_list"],
            },
            {
                "type": "email",
                "name": "Email Agent",
                "description": "이메일 관리 및 AI 분석 전문 에이전트",
                "default_model": "grok-3-fast",
                "tools": ["email_get", "email_list", "email_analyze", "email_translate", "email_draft_reply", "email_search", "email_mark_read", "email_summarize_inbox"],
            },
            {
                "type": "multi",
                "name": "Multi-capability Agent",
                "description": "모든 도구를 사용할 수 있는 종합 에이전트",
                "default_model": "gpt-4o",
                "tools": ["all"],
            },
        ]
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "features": {
            "langgraph": True,
            "streaming": True,
            "specialized_agents": True,
            "memory": True,
        }
    }

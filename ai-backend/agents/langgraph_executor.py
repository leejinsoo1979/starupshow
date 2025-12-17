"""
LangGraph-based Agent Executor
Advanced agent execution with state management, conditional routing, and multi-step workflows
"""
from typing import TypedDict, Annotated, Sequence, Literal, Any, AsyncGenerator
from datetime import datetime
import json
import operator

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from config import get_settings
from tools.registry import get_tools_by_names, get_all_tools

settings = get_settings()


# ============================================
# State Definition
# ============================================
class AgentState(TypedDict):
    """State maintained throughout agent execution"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    context: dict  # Additional context (project_id, team_id, etc.)
    tool_calls_count: int
    last_tool_result: str | None
    error: str | None
    metadata: dict  # Execution metadata


# ============================================
# LLM Factory
# ============================================
def create_llm(
    model: str = "gpt-4o",
    temperature: float = 0.7,
    streaming: bool = True,
) -> ChatOpenAI | ChatAnthropic:
    """Create LLM instance based on model name"""

    if model.startswith("claude"):
        return ChatAnthropic(
            model=model,
            temperature=temperature,
            api_key=settings.anthropic_api_key,
            streaming=streaming,
        )
    elif model.startswith("grok"):
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.xai_api_key,
            base_url="https://api.x.ai/v1",
            streaming=streaming,
        )
    elif model.startswith("ollama"):
        # Local Ollama model
        model_name = model.replace("ollama/", "")
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            base_url="http://localhost:11434/v1",
            api_key="ollama",
            streaming=streaming,
        )
    else:
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.openai_api_key,
            streaming=streaming,
        )


# ============================================
# LangGraph Agent Executor
# ============================================
class LangGraphAgentExecutor:
    """
    Advanced agent executor using LangGraph

    Features:
    - State-based execution with checkpointing
    - Multi-model support (OpenAI, Claude, Grok, Ollama)
    - Tool execution with error handling
    - Streaming support
    - Execution history and metadata
    - Conditional routing
    - Max iterations control
    """

    def __init__(
        self,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        system_prompt: str = "",
        tool_names: list[str] | None = None,
        max_iterations: int = 10,
        enable_memory: bool = False,
    ):
        self.model_name = model
        self.temperature = temperature
        self.system_prompt = system_prompt or self._default_system_prompt()
        self.max_iterations = max_iterations
        self.enable_memory = enable_memory

        # Get tools
        if tool_names:
            self.tools = get_tools_by_names(tool_names)
        else:
            self.tools = []

        # Create LLM with tools bound
        self.llm = create_llm(model, temperature)
        if self.tools:
            self.llm_with_tools = self.llm.bind_tools(self.tools)
        else:
            self.llm_with_tools = self.llm

        # Create graph
        self.graph = self._build_graph()

        # Memory saver for checkpointing
        self.memory = MemorySaver() if enable_memory else None

    def _default_system_prompt(self) -> str:
        """Default system prompt for the agent"""
        return """당신은 스타트업 운영을 돕는 AI 어시스턴트입니다.

주요 역할:
1. 문서 관리: 문서 생성, 검색, 분석, 요약
2. 스프레드시트: 데이터 분석, 쿼리, 통계 계산
3. 이메일: 이메일 분석, 번역, 답장 작성

도구를 효과적으로 사용하여 사용자의 요청을 처리하세요.
항상 한국어로 응답하세요."""

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""

        # Define the graph
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("agent", self._agent_node)
        workflow.add_node("tools", self._tool_node)
        workflow.add_node("error_handler", self._error_handler_node)

        # Set entry point
        workflow.set_entry_point("agent")

        # Add conditional edges
        workflow.add_conditional_edges(
            "agent",
            self._should_continue,
            {
                "continue": "tools",
                "end": END,
                "error": "error_handler",
            }
        )

        # Tools go back to agent
        workflow.add_edge("tools", "agent")

        # Error handler ends
        workflow.add_edge("error_handler", END)

        # Compile with or without memory
        if self.memory:
            return workflow.compile(checkpointer=self.memory)
        return workflow.compile()

    async def _agent_node(self, state: AgentState) -> dict:
        """Main agent node - calls LLM and decides next action"""
        messages = state["messages"]

        # Add system message if not present
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=self.system_prompt)] + list(messages)

        try:
            response = await self.llm_with_tools.ainvoke(messages)

            return {
                "messages": [response],
                "tool_calls_count": state.get("tool_calls_count", 0),
                "error": None,
                "metadata": {
                    **state.get("metadata", {}),
                    "last_response_time": datetime.now().isoformat(),
                }
            }
        except Exception as e:
            return {
                "error": f"LLM 호출 오류: {str(e)}",
                "metadata": {
                    **state.get("metadata", {}),
                    "error_time": datetime.now().isoformat(),
                }
            }

    async def _tool_node(self, state: AgentState) -> dict:
        """Tool execution node"""
        messages = state["messages"]
        last_message = messages[-1]

        if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
            return {"last_tool_result": None}

        tool_results = []
        tool_calls_count = state.get("tool_calls_count", 0)

        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]

            # Find and execute tool
            tool = next((t for t in self.tools if t.name == tool_name), None)

            if tool:
                try:
                    # Execute tool
                    result = await tool.ainvoke(tool_args)
                    tool_results.append(
                        ToolMessage(
                            content=str(result),
                            tool_call_id=tool_id,
                            name=tool_name,
                        )
                    )
                    tool_calls_count += 1
                except Exception as e:
                    tool_results.append(
                        ToolMessage(
                            content=f"도구 실행 오류: {str(e)}",
                            tool_call_id=tool_id,
                            name=tool_name,
                        )
                    )
            else:
                tool_results.append(
                    ToolMessage(
                        content=f"알 수 없는 도구: {tool_name}",
                        tool_call_id=tool_id,
                        name=tool_name,
                    )
                )

        last_result = tool_results[-1].content if tool_results else None

        return {
            "messages": tool_results,
            "tool_calls_count": tool_calls_count,
            "last_tool_result": last_result,
            "metadata": {
                **state.get("metadata", {}),
                "last_tool_execution": datetime.now().isoformat(),
            }
        }

    async def _error_handler_node(self, state: AgentState) -> dict:
        """Handle errors gracefully"""
        error = state.get("error", "Unknown error")

        error_message = AIMessage(
            content=f"죄송합니다. 처리 중 오류가 발생했습니다: {error}\n다시 시도해주세요."
        )

        return {
            "messages": [error_message],
            "metadata": {
                **state.get("metadata", {}),
                "error_handled": True,
                "error_handled_time": datetime.now().isoformat(),
            }
        }

    def _should_continue(self, state: AgentState) -> Literal["continue", "end", "error"]:
        """Determine if agent should continue, end, or handle error"""

        # Check for errors
        if state.get("error"):
            return "error"

        messages = state["messages"]
        if not messages:
            return "end"

        last_message = messages[-1]

        # Check max iterations
        if state.get("tool_calls_count", 0) >= self.max_iterations:
            return "end"

        # If there are tool calls, continue to tools
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "continue"

        # Otherwise, end
        return "end"

    async def run(
        self,
        message: str,
        chat_history: list[dict] | None = None,
        context: dict | None = None,
        thread_id: str | None = None,
    ) -> dict:
        """
        Execute agent and return response

        Args:
            message: User message
            chat_history: Previous conversation history
            context: Additional context (project_id, team_id, etc.)
            thread_id: Thread ID for memory persistence

        Returns:
            dict with output, intermediate_steps, and metadata
        """
        # Build initial messages
        messages = self._format_history(chat_history or [])
        messages.append(HumanMessage(content=message))

        # Initial state
        initial_state: AgentState = {
            "messages": messages,
            "context": context or {},
            "tool_calls_count": 0,
            "last_tool_result": None,
            "error": None,
            "metadata": {
                "start_time": datetime.now().isoformat(),
                "model": self.model_name,
                "thread_id": thread_id,
            }
        }

        # Config for memory
        config = {}
        if self.memory and thread_id:
            config["configurable"] = {"thread_id": thread_id}

        # Execute graph
        final_state = await self.graph.ainvoke(initial_state, config)

        # Extract response
        messages = final_state["messages"]
        last_ai_message = None
        intermediate_steps = []

        for msg in messages:
            if isinstance(msg, AIMessage):
                last_ai_message = msg
            elif isinstance(msg, ToolMessage):
                intermediate_steps.append({
                    "tool": msg.name,
                    "output": msg.content[:500],  # Truncate for response
                })

        return {
            "output": last_ai_message.content if last_ai_message else "",
            "intermediate_steps": intermediate_steps,
            "tool_calls_count": final_state.get("tool_calls_count", 0),
            "metadata": final_state.get("metadata", {}),
            "error": final_state.get("error"),
        }

    async def stream(
        self,
        message: str,
        chat_history: list[dict] | None = None,
        context: dict | None = None,
        thread_id: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream agent response with events

        Yields events:
        - {"type": "token", "content": "..."} - Token from LLM
        - {"type": "tool_start", "tool": "...", "input": {...}} - Tool execution start
        - {"type": "tool_end", "tool": "...", "output": "..."} - Tool execution end
        - {"type": "error", "message": "..."} - Error occurred
        - {"type": "done", "output": "..."} - Final output
        """
        messages = self._format_history(chat_history or [])
        messages.append(HumanMessage(content=message))

        initial_state: AgentState = {
            "messages": messages,
            "context": context or {},
            "tool_calls_count": 0,
            "last_tool_result": None,
            "error": None,
            "metadata": {
                "start_time": datetime.now().isoformat(),
                "model": self.model_name,
                "thread_id": thread_id,
            }
        }

        config = {}
        if self.memory and thread_id:
            config["configurable"] = {"thread_id": thread_id}

        try:
            final_output = ""

            async for event in self.graph.astream_events(
                initial_state,
                config,
                version="v2",
            ):
                event_type = event.get("event")

                if event_type == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        final_output += chunk.content
                        yield {
                            "type": "token",
                            "content": chunk.content,
                        }

                elif event_type == "on_tool_start":
                    yield {
                        "type": "tool_start",
                        "tool": event["name"],
                        "input": event["data"].get("input", {}),
                    }

                elif event_type == "on_tool_end":
                    output = event["data"].get("output", "")
                    if hasattr(output, "content"):
                        output = output.content
                    yield {
                        "type": "tool_end",
                        "tool": event["name"],
                        "output": str(output)[:500],
                    }

            yield {
                "type": "done",
                "output": final_output,
            }

        except Exception as e:
            yield {
                "type": "error",
                "message": str(e),
            }

    def _format_history(self, history: list[dict]) -> list[BaseMessage]:
        """Convert chat history to LangChain message format"""
        messages = []
        for msg in history:
            role = msg.get("role", "")
            content = msg.get("content", "")

            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
            elif role == "system":
                messages.append(SystemMessage(content=content))

        return messages


# ============================================
# Specialized Agent Executors
# ============================================
class DocsAgentExecutor(LangGraphAgentExecutor):
    """Specialized agent for document operations"""

    def __init__(self, model: str = "gpt-4o", **kwargs):
        tool_names = [
            "ai_docs_create",
            "ai_docs_search",
            "ai_docs_get",
            "ai_docs_analyze",
            "ai_docs_update",
            "ai_docs_list",
            "ai_docs_delete",
        ]

        system_prompt = """당신은 문서 관리 전문 AI 어시스턴트입니다.

주요 기능:
- 문서 생성: 분석, 요약, 보고서, 회의록 등 다양한 유형의 문서 작성
- 문서 검색: 키워드 기반 문서 검색
- 문서 분석: AI 기반 문서 내용 분석 및 요약
- 문서 관리: 문서 수정, 삭제, 목록 조회

사용자의 요청에 따라 적절한 도구를 사용하여 문서 작업을 수행하세요.
항상 작업 결과를 명확하게 설명해주세요."""

        super().__init__(
            model=model,
            system_prompt=system_prompt,
            tool_names=tool_names,
            **kwargs,
        )


class SheetAgentExecutor(LangGraphAgentExecutor):
    """Specialized agent for spreadsheet operations"""

    def __init__(self, model: str = "gpt-4o", **kwargs):
        tool_names = [
            "ai_sheet_create",
            "ai_sheet_get",
            "ai_sheet_add_rows",
            "ai_sheet_update_cell",
            "ai_sheet_analyze",
            "ai_sheet_query",
            "ai_sheet_add_column",
            "ai_sheet_list",
        ]

        system_prompt = """당신은 스프레드시트 및 데이터 분석 전문 AI 어시스턴트입니다.

주요 기능:
- 시트 생성: 새로운 스프레드시트 생성 및 컬럼 정의
- 데이터 관리: 행 추가, 셀 업데이트, 컬럼 추가
- 데이터 분석: 통계 분석, 트렌드 분석, 이상치 탐지
- 자연어 쿼리: 자연어로 데이터 질문에 답변

데이터 분석 시 구체적인 수치와 인사이트를 제공하세요.
복잡한 분석 결과는 이해하기 쉽게 설명해주세요."""

        super().__init__(
            model=model,
            system_prompt=system_prompt,
            tool_names=tool_names,
            **kwargs,
        )


class EmailAgentExecutor(LangGraphAgentExecutor):
    """Specialized agent for email operations"""

    def __init__(self, model: str = "grok-3-fast", **kwargs):
        tool_names = [
            "email_get",
            "email_list",
            "email_analyze",
            "email_translate",
            "email_draft_reply",
            "email_search",
            "email_mark_read",
            "email_summarize_inbox",
        ]

        system_prompt = """당신은 이메일 관리 및 분석 전문 AI 어시스턴트입니다.

주요 기능:
- 이메일 조회: 이메일 목록 및 상세 내용 조회
- 이메일 분석: 긴급도, 감정, 액션 아이템 분석
- 이메일 번역: 다국어 이메일 번역
- 답장 작성: 적절한 톤의 답장 초안 작성
- 받은 편지함 요약: 전체 받은 편지함 요약

이메일 분석 시 중요도와 필요한 조치를 명확히 제시하세요.
답장 작성 시 상황에 맞는 적절한 톤을 사용하세요."""

        super().__init__(
            model=model,
            system_prompt=system_prompt,
            tool_names=tool_names,
            **kwargs,
        )


class MultiAgentExecutor(LangGraphAgentExecutor):
    """Agent with all available tools for complex tasks"""

    def __init__(self, model: str = "gpt-4o", **kwargs):
        # Get all available tools
        all_tools = get_all_tools()
        tool_names = [t.name for t in all_tools]

        system_prompt = """당신은 스타트업 운영의 모든 영역을 지원하는 종합 AI 어시스턴트입니다.

사용 가능한 도구 영역:
1. 문서 관리 (ai_docs_*): 문서 생성, 검색, 분석, 수정
2. 스프레드시트 (ai_sheet_*): 데이터 분석, 쿼리, 통계
3. 이메일 (email_*): 이메일 분석, 번역, 답장 작성
4. 웹 검색 (web_search_tool): 웹 정보 검색
5. 계산기 (calculator_tool): 수학 계산

복잡한 작업은 여러 도구를 조합하여 처리하세요.
각 단계의 진행 상황을 명확히 설명해주세요.
항상 한국어로 응답하세요."""

        super().__init__(
            model=model,
            system_prompt=system_prompt,
            tool_names=tool_names,
            max_iterations=15,  # More iterations for complex tasks
            **kwargs,
        )


# ============================================
# Factory Function
# ============================================
def create_agent_executor(
    agent_type: str = "general",
    model: str | None = None,
    **kwargs,
) -> LangGraphAgentExecutor:
    """
    Factory function to create specialized agent executors

    Args:
        agent_type: Type of agent (general, docs, sheet, email, multi)
        model: Model to use (defaults based on agent_type)
        **kwargs: Additional arguments for executor

    Returns:
        LangGraphAgentExecutor instance
    """
    agent_configs = {
        "general": (LangGraphAgentExecutor, "gpt-4o"),
        "docs": (DocsAgentExecutor, "gpt-4o"),
        "sheet": (SheetAgentExecutor, "gpt-4o"),
        "email": (EmailAgentExecutor, "grok-3-fast"),
        "multi": (MultiAgentExecutor, "gpt-4o"),
    }

    if agent_type not in agent_configs:
        raise ValueError(f"Unknown agent type: {agent_type}")

    agent_class, default_model = agent_configs[agent_type]
    model = model or default_model

    return agent_class(model=model, **kwargs)

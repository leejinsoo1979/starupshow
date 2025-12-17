from typing import Any, AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
try:
    from langchain.agents import AgentExecutor as LangChainExecutor, create_openai_tools_agent
except ImportError:
    from langchain_core.runnables import RunnablePassthrough as LangChainExecutor
    create_openai_tools_agent = None
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import get_settings
from tools.registry import get_tools_by_names

settings = get_settings()


class AgentExecutor:
    """Main agent executor using LangChain"""

    def __init__(
        self,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        system_prompt: str = "",
        tool_names: list[str] = None,
    ):
        self.model_name = model
        self.temperature = temperature
        self.system_prompt = system_prompt or "You are a helpful AI assistant."
        self.tool_names = tool_names or []

        self.llm = self._create_llm()
        self.tools = get_tools_by_names(self.tool_names)
        self.agent = self._create_agent()

    def _create_llm(self):
        """Create LLM based on model name"""
        if self.model_name.startswith("claude"):
            return ChatAnthropic(
                model=self.model_name,
                temperature=self.temperature,
                api_key=settings.anthropic_api_key,
            )
        elif self.model_name.startswith("grok"):
            return ChatOpenAI(
                model=self.model_name,
                temperature=self.temperature,
                api_key=settings.xai_api_key,
                base_url="https://api.x.ai/v1",
            )
        else:
            return ChatOpenAI(
                model=self.model_name,
                temperature=self.temperature,
                api_key=settings.openai_api_key,
            )

    def _create_agent(self):
        """Create LangChain agent"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        if self.tools:
            agent = create_openai_tools_agent(self.llm, self.tools, prompt)
            return LangChainExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                handle_parsing_errors=True,
                max_iterations=10,
            )
        return None

    async def run(
        self,
        message: str,
        chat_history: list[dict] = None,
        context: dict = None,
    ) -> dict:
        """Execute agent and return response"""
        history = self._format_history(chat_history or [])

        if self.agent:
            result = await self.agent.ainvoke({
                "input": message,
                "chat_history": history,
            })
            return {
                "output": result["output"],
                "intermediate_steps": self._format_steps(result.get("intermediate_steps", [])),
            }
        else:
            # No tools, just use LLM directly
            messages = [SystemMessage(content=self.system_prompt)]
            messages.extend(history)
            messages.append(HumanMessage(content=message))

            response = await self.llm.ainvoke(messages)
            return {
                "output": response.content,
                "intermediate_steps": [],
            }

    async def stream(
        self,
        message: str,
        chat_history: list[dict] = None,
        context: dict = None,
    ) -> AsyncGenerator[str, None]:
        """Stream agent response"""
        history = self._format_history(chat_history or [])

        if self.agent:
            async for event in self.agent.astream_events(
                {"input": message, "chat_history": history},
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yield chunk.content
        else:
            messages = [SystemMessage(content=self.system_prompt)]
            messages.extend(history)
            messages.append(HumanMessage(content=message))

            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    yield chunk.content

    def _format_history(self, history: list[dict]) -> list:
        """Convert chat history to LangChain format"""
        messages = []
        for msg in history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        return messages

    def _format_steps(self, steps: list) -> list[dict]:
        """Format intermediate steps for response"""
        formatted = []
        for action, observation in steps:
            formatted.append({
                "tool": action.tool,
                "input": action.tool_input,
                "output": str(observation),
            })
        return formatted

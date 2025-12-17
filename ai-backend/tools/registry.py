from typing import Dict, List
from langchain_core.tools import BaseTool

# Global tool registry
_tools: Dict[str, BaseTool] = {}


def register_tool(tool: BaseTool) -> None:
    """Register a tool in the global registry"""
    _tools[tool.name] = tool


def get_tool(name: str) -> BaseTool | None:
    """Get a tool by name"""
    return _tools.get(name)


def get_all_tools() -> List[BaseTool]:
    """Get all registered tools"""
    return list(_tools.values())


def get_tools_by_names(names: List[str]) -> List[BaseTool]:
    """Get tools by their names"""
    return [_tools[name] for name in names if name in _tools]


def list_tool_names() -> List[str]:
    """List all registered tool names"""
    return list(_tools.keys())


def list_tools_info() -> List[dict]:
    """List all tools with their info"""
    return [
        {
            "name": tool.name,
            "description": tool.description,
        }
        for tool in _tools.values()
    ]

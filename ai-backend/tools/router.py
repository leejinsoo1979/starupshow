from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .registry import list_tools_info, get_tool

router = APIRouter()


class ToolExecuteRequest(BaseModel):
    name: str
    args: dict = {}


class ToolExecuteResponse(BaseModel):
    result: str
    success: bool


@router.get("/")
async def list_tools():
    """List all available tools"""
    return {"tools": list_tools_info()}


@router.post("/execute", response_model=ToolExecuteResponse)
async def execute_tool(request: ToolExecuteRequest):
    """Execute a specific tool"""
    try:
        tool = get_tool(request.name)
        if not tool:
            raise HTTPException(status_code=404, detail=f"Tool '{request.name}' not found")

        result = await tool.ainvoke(request.args)
        return ToolExecuteResponse(result=str(result), success=True)

    except HTTPException:
        raise
    except Exception as e:
        return ToolExecuteResponse(result=str(e), success=False)


@router.get("/{tool_name}")
async def get_tool_info(tool_name: str):
    """Get information about a specific tool"""
    tool = get_tool(tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    return {
        "name": tool.name,
        "description": tool.description,
        "args_schema": tool.args_schema.schema() if tool.args_schema else None,
    }

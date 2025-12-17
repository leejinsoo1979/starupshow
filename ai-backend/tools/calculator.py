import math
from langchain_core.tools import tool

from .registry import register_tool


@tool
def calculator_tool(expression: str) -> str:
    """
    Evaluate a mathematical expression.

    Args:
        expression: A mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(3.14)")

    Returns:
        The result of the calculation
    """
    try:
        # Safe math functions
        safe_dict = {
            "abs": abs,
            "round": round,
            "min": min,
            "max": max,
            "sum": sum,
            "pow": pow,
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "log": math.log,
            "log10": math.log10,
            "exp": math.exp,
            "pi": math.pi,
            "e": math.e,
        }

        # Evaluate expression
        result = eval(expression, {"__builtins__": {}}, safe_dict)
        return str(result)

    except Exception as e:
        return f"Calculation error: {str(e)}"


# Register the tool
register_tool(calculator_tool)

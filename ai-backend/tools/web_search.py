from langchain_core.tools import tool
from tavily import TavilyClient
from duckduckgo_search import DDGS

from config import get_settings
from .registry import register_tool

settings = get_settings()


@tool
def web_search_tool(query: str, max_results: int = 5) -> str:
    """
    Search the web for information.

    Args:
        query: The search query
        max_results: Maximum number of results to return (default: 5)

    Returns:
        Search results as formatted text
    """
    try:
        # Try Tavily first
        if settings.tavily_api_key:
            client = TavilyClient(api_key=settings.tavily_api_key)
            response = client.search(query, max_results=max_results)

            results = []
            for r in response.get("results", []):
                results.append(f"**{r['title']}**\n{r['content']}\nURL: {r['url']}\n")

            return "\n---\n".join(results) if results else "No results found."

        # Fallback to DuckDuckGo
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

            formatted = []
            for r in results:
                formatted.append(f"**{r['title']}**\n{r['body']}\nURL: {r['href']}\n")

            return "\n---\n".join(formatted) if formatted else "No results found."

    except Exception as e:
        return f"Search error: {str(e)}"


# Register the tool
register_tool(web_search_tool)

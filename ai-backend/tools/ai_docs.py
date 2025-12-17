"""
AI Docs Tool - 문서 생성, 검색, 분석 도구
project_documents 테이블 연동
"""
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Literal, Optional
import json

from config import get_settings
from .registry import register_tool
from utils.supabase import get_supabase_client

settings = get_settings()

# LLM for document analysis
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.3,
    api_key=settings.openai_api_key,
)


@tool
def ai_docs_create(
    project_id: str,
    title: str,
    content: str,
    doc_type: Literal["analysis", "summary", "report", "research", "transcript", "meeting_notes", "deliverable", "other"] = "report",
    summary: Optional[str] = None,
    tags: Optional[list[str]] = None,
    source_url: Optional[str] = None,
    source_type: Optional[str] = None,
) -> str:
    """
    Create a new document in the project.

    Args:
        project_id: Project ID to create document in
        title: Document title
        content: Document content (markdown supported)
        doc_type: Type of document (analysis, summary, report, research, transcript, meeting_notes, deliverable, other)
        summary: Optional short summary for list views
        tags: Optional list of tags
        source_url: Optional source URL (e.g., YouTube URL)
        source_type: Optional source type (youtube, web, document, etc.)

    Returns:
        Created document info or error message
    """
    try:
        client = get_supabase_client()

        # Auto-generate summary if not provided
        if not summary and len(content) > 200:
            try:
                summary_prompt = ChatPromptTemplate.from_messages([
                    ("system", "주어진 문서의 핵심 내용을 2-3문장으로 요약해주세요. 요약만 출력하세요."),
                    ("human", "{content}")
                ])
                chain = summary_prompt | llm
                result = chain.invoke({"content": content[:3000]})
                summary = result.content[:500]
            except Exception:
                summary = content[:200] + "..."

        # Create document
        doc_data = {
            "project_id": project_id,
            "title": title,
            "content": content,
            "summary": summary,
            "doc_type": doc_type,
            "tags": tags or [],
            "source_url": source_url,
            "source_type": source_type,
            "created_by_type": "agent",
            "status": "published",
            "metadata": {},
        }

        result = client.table("project_documents").insert(doc_data).execute()

        if result.data:
            doc = result.data[0]
            return json.dumps({
                "success": True,
                "document": {
                    "id": doc["id"],
                    "title": doc["title"],
                    "doc_type": doc["doc_type"],
                    "summary": doc.get("summary"),
                    "created_at": doc["created_at"],
                },
                "message": f"문서 '{title}'가 성공적으로 생성되었습니다."
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "문서 생성 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"문서 생성 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_search(
    project_id: str,
    query: str,
    doc_type: Optional[str] = None,
    limit: int = 10,
) -> str:
    """
    Search documents in a project by keyword.

    Args:
        project_id: Project ID to search in
        query: Search keyword
        doc_type: Optional filter by document type
        limit: Maximum number of results (default: 10)

    Returns:
        List of matching documents
    """
    try:
        client = get_supabase_client()

        # Build query
        db_query = (
            client.table("project_documents")
            .select("id, title, summary, doc_type, tags, status, created_at")
            .eq("project_id", project_id)
            .eq("status", "published")
        )

        if doc_type:
            db_query = db_query.eq("doc_type", doc_type)

        # Text search using ilike for simple matching
        db_query = db_query.or_(f"title.ilike.%{query}%,content.ilike.%{query}%")
        db_query = db_query.order("created_at", desc=True).limit(limit)

        result = db_query.execute()

        if not result.data:
            return json.dumps({
                "success": True,
                "documents": [],
                "count": 0,
                "message": f"'{query}'에 대한 검색 결과가 없습니다."
            }, ensure_ascii=False)

        return json.dumps({
            "success": True,
            "documents": result.data,
            "count": len(result.data),
            "query": query,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"검색 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_get(doc_id: str) -> str:
    """
    Get a document by ID with full content.

    Args:
        doc_id: Document ID

    Returns:
        Document with full content
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("project_documents")
            .select("*")
            .eq("id", doc_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "문서를 찾을 수 없습니다."}, ensure_ascii=False)

        return json.dumps({
            "success": True,
            "document": result.data,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"문서 조회 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_analyze(doc_id: str, analysis_type: Literal["summary", "key_points", "action_items", "sentiment", "full"] = "summary") -> str:
    """
    Analyze a document using AI.

    Args:
        doc_id: Document ID to analyze
        analysis_type: Type of analysis (summary, key_points, action_items, sentiment, full)

    Returns:
        AI analysis results
    """
    try:
        client = get_supabase_client()

        # Get document
        result = (
            client.table("project_documents")
            .select("id, title, content, doc_type")
            .eq("id", doc_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "문서를 찾을 수 없습니다."}, ensure_ascii=False)

        doc = result.data
        content = doc["content"][:8000]  # Limit content for analysis

        # Build analysis prompt based on type
        prompts = {
            "summary": """다음 문서를 3-5문장으로 핵심 내용을 요약해주세요.

문서 제목: {title}
문서 내용:
{content}

요약:""",
            "key_points": """다음 문서에서 핵심 포인트를 5-7개 추출해주세요. 불릿 포인트로 정리해주세요.

문서 제목: {title}
문서 내용:
{content}

핵심 포인트:""",
            "action_items": """다음 문서에서 필요한 액션 아이템(할 일)을 추출해주세요. 우선순위와 함께 정리해주세요.

문서 제목: {title}
문서 내용:
{content}

액션 아이템:""",
            "sentiment": """다음 문서의 전반적인 톤과 감정을 분석해주세요. (긍정/부정/중립, 긴급성, 중요도 등)

문서 제목: {title}
문서 내용:
{content}

분석:""",
            "full": """다음 문서를 종합적으로 분석해주세요:
1. 핵심 요약 (3-5문장)
2. 주요 포인트 (5-7개)
3. 액션 아이템 (있다면)
4. 톤/감정 분석
5. 추가 인사이트

문서 제목: {title}
문서 유형: {doc_type}
문서 내용:
{content}

분석 결과:""",
        }

        prompt = ChatPromptTemplate.from_template(prompts.get(analysis_type, prompts["summary"]))
        chain = prompt | llm

        analysis = chain.invoke({
            "title": doc["title"],
            "content": content,
            "doc_type": doc["doc_type"],
        })

        return json.dumps({
            "success": True,
            "document_id": doc_id,
            "document_title": doc["title"],
            "analysis_type": analysis_type,
            "analysis": analysis.content,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"분석 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_update(
    doc_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    summary: Optional[str] = None,
    tags: Optional[list[str]] = None,
    status: Optional[Literal["draft", "published", "archived"]] = None,
) -> str:
    """
    Update an existing document.

    Args:
        doc_id: Document ID to update
        title: New title (optional)
        content: New content (optional)
        summary: New summary (optional)
        tags: New tags (optional)
        status: New status (optional)

    Returns:
        Update result
    """
    try:
        client = get_supabase_client()

        # Build update data
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if content is not None:
            update_data["content"] = content
        if summary is not None:
            update_data["summary"] = summary
        if tags is not None:
            update_data["tags"] = tags
        if status is not None:
            update_data["status"] = status

        if not update_data:
            return json.dumps({"success": False, "error": "업데이트할 내용이 없습니다."}, ensure_ascii=False)

        result = (
            client.table("project_documents")
            .update(update_data)
            .eq("id", doc_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "message": "문서가 업데이트되었습니다.",
                "updated_fields": list(update_data.keys()),
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "업데이트 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"업데이트 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_list(
    project_id: str,
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> str:
    """
    List documents in a project.

    Args:
        project_id: Project ID
        doc_type: Filter by document type (optional)
        status: Filter by status (optional)
        limit: Number of results (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        List of documents
    """
    try:
        client = get_supabase_client()

        query = (
            client.table("project_documents")
            .select("id, title, summary, doc_type, tags, status, created_at, updated_at")
            .eq("project_id", project_id)
        )

        if doc_type:
            query = query.eq("doc_type", doc_type)
        if status:
            query = query.eq("status", status)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        return json.dumps({
            "success": True,
            "documents": result.data or [],
            "count": len(result.data or []),
            "offset": offset,
            "limit": limit,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"목록 조회 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_docs_delete(doc_id: str) -> str:
    """
    Delete a document (actually archives it).

    Args:
        doc_id: Document ID to delete

    Returns:
        Deletion result
    """
    try:
        client = get_supabase_client()

        # Soft delete by changing status to archived
        result = (
            client.table("project_documents")
            .update({"status": "archived"})
            .eq("id", doc_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "message": "문서가 보관함으로 이동되었습니다.",
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "삭제 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"삭제 오류: {str(e)}"}, ensure_ascii=False)


# Register all tools
register_tool(ai_docs_create)
register_tool(ai_docs_search)
register_tool(ai_docs_get)
register_tool(ai_docs_analyze)
register_tool(ai_docs_update)
register_tool(ai_docs_list)
register_tool(ai_docs_delete)

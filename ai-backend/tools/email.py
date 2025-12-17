"""
Email Tool - 이메일 분석, 번역, 답장 작성 도구
email_messages, email_drafts 테이블 연동
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

# Use Grok for email analysis (same as frontend)
llm = ChatOpenAI(
    model="grok-4-1-fast",
    temperature=0.3,
    api_key=settings.xai_api_key,
    base_url="https://api.x.ai/v1",
)

# Fallback to OpenAI if Grok not available
llm_fallback = ChatOpenAI(
    model="gpt-4o",
    temperature=0.3,
    api_key=settings.openai_api_key,
)


def _get_llm():
    """Get appropriate LLM (Grok preferred, fallback to OpenAI)"""
    if settings.xai_api_key:
        return llm
    return llm_fallback


@tool
def email_get(email_id: str) -> str:
    """
    Get email details by ID.

    Args:
        email_id: Email message ID

    Returns:
        Email details including subject, body, sender, etc.
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("email_messages")
            .select("*")
            .eq("id", email_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "이메일을 찾을 수 없습니다."}, ensure_ascii=False)

        email = result.data
        return json.dumps({
            "success": True,
            "email": {
                "id": email["id"],
                "subject": email["subject"],
                "from_address": email["from_address"],
                "from_name": email["from_name"],
                "to_addresses": email["to_addresses"],
                "body_text": email["body_text"],
                "body_html": email["body_html"],
                "received_at": email["received_at"],
                "is_read": email["is_read"],
                "is_starred": email["is_starred"],
                "has_attachments": email["has_attachments"],
                "attachments": email["attachments"],
                "ai_summary": email.get("ai_summary"),
                "ai_priority": email.get("ai_priority"),
                "ai_category": email.get("ai_category"),
            }
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"이메일 조회 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_list(
    account_id: str,
    folder: str = "INBOX",
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> str:
    """
    List emails in a folder.

    Args:
        account_id: Email account ID
        folder: Folder name (INBOX, Sent, etc.)
        unread_only: Only return unread emails
        limit: Number of results
        offset: Pagination offset

    Returns:
        List of emails
    """
    try:
        client = get_supabase_client()

        query = (
            client.table("email_messages")
            .select("id, subject, from_address, from_name, snippet, received_at, is_read, is_starred, has_attachments, ai_priority, ai_category")
            .eq("account_id", account_id)
            .eq("folder", folder)
            .eq("is_trash", False)
        )

        if unread_only:
            query = query.eq("is_read", False)

        query = query.order("received_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        return json.dumps({
            "success": True,
            "emails": result.data or [],
            "count": len(result.data or []),
            "folder": folder,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"이메일 목록 조회 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_analyze(
    email_id: str,
    analysis_type: Literal["full", "summary", "urgency", "action_items", "sender", "reply_needed"] = "full",
) -> str:
    """
    Analyze an email using AI.

    Args:
        email_id: Email ID to analyze
        analysis_type: Type of analysis
            - full: 종합 분석 (이메일의 모든 측면)
            - summary: 핵심 요약
            - urgency: 긴급도 분석
            - action_items: 필요한 액션 추출
            - sender: 발신자 분석
            - reply_needed: 답장 필요 여부

    Returns:
        AI analysis results
    """
    try:
        client = get_supabase_client()

        # Get email
        result = (
            client.table("email_messages")
            .select("*")
            .eq("id", email_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "이메일을 찾을 수 없습니다."}, ensure_ascii=False)

        email = result.data
        body = email.get("body_text") or email.get("body_html", "")[:5000]

        prompts = {
            "full": """이메일을 종합적으로 분석해주세요:

**발신자**: {from_name} <{from_address}>
**제목**: {subject}
**수신일**: {received_at}

**내용**:
{body}

다음 형식으로 분석해주세요:

## 1. 이 메일이 뭔지
(한 줄로 핵심 요약)

## 2. 발신자 분석
- 누구인가
- 신뢰도 (높음/보통/낮음/주의)
- 근거

## 3. 요청 사항
(발신자가 원하는 것이 무엇인지)

## 4. 내가 해야 할 일
(구체적인 액션 아이템)

## 5. 비즈니스 조언
(이 메일에 대응하는 전략적 조언)""",

            "summary": """이메일을 2-3문장으로 핵심만 요약해주세요.

**제목**: {subject}
**발신자**: {from_name} <{from_address}>

**내용**:
{body}

요약:""",

            "urgency": """이메일의 긴급도를 분석해주세요.

**제목**: {subject}
**발신자**: {from_name}
**내용**:
{body}

긴급도 (urgent/high/normal/low) 와 그 이유를 한 줄로 답변:""",

            "action_items": """이메일에서 필요한 액션 아이템을 추출해주세요.

**제목**: {subject}
**내용**:
{body}

액션 아이템 (우선순위 순):""",

            "sender": """발신자를 분석해주세요.

**이름**: {from_name}
**이메일**: {from_address}
**제목**: {subject}
**내용 일부**:
{body}

발신자 분석:
1. 누구인가 (역할/회사)
2. 신뢰도 판단
3. 주의할 점""",

            "reply_needed": """이 이메일에 답장이 필요한지 판단해주세요.

**제목**: {subject}
**발신자**: {from_name}
**내용**:
{body}

답장 필요 여부 (필요/불필요) 와 이유를 한 줄로:""",
        }

        prompt = ChatPromptTemplate.from_template(prompts.get(analysis_type, prompts["full"]))
        chain = prompt | _get_llm()

        analysis = chain.invoke({
            "subject": email.get("subject", "(제목 없음)"),
            "from_name": email.get("from_name", "알 수 없음"),
            "from_address": email.get("from_address", ""),
            "received_at": email.get("received_at", ""),
            "body": body[:4000],
        })

        # Update AI fields in database
        try:
            update_data = {}
            if analysis_type in ["full", "summary"]:
                update_data["ai_summary"] = analysis.content[:500]
            if analysis_type in ["full", "urgency"]:
                # Extract priority from analysis
                content_lower = analysis.content.lower()
                if "urgent" in content_lower or "긴급" in content_lower:
                    update_data["ai_priority"] = "urgent"
                elif "high" in content_lower or "높음" in content_lower:
                    update_data["ai_priority"] = "high"
                elif "low" in content_lower or "낮음" in content_lower:
                    update_data["ai_priority"] = "low"
                else:
                    update_data["ai_priority"] = "normal"

            if update_data:
                client.table("email_messages").update(update_data).eq("id", email_id).execute()
        except Exception:
            pass  # Ignore update errors

        return json.dumps({
            "success": True,
            "email_id": email_id,
            "subject": email.get("subject"),
            "analysis_type": analysis_type,
            "analysis": analysis.content,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"분석 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_translate(
    email_id: str,
    target_language: str = "ko",
) -> str:
    """
    Translate an email to target language.

    Args:
        email_id: Email ID to translate
        target_language: Target language code (ko, en, ja, zh, etc.)

    Returns:
        Translated email content
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("email_messages")
            .select("subject, body_text, body_html")
            .eq("id", email_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "이메일을 찾을 수 없습니다."}, ensure_ascii=False)

        email = result.data
        body = email.get("body_text") or email.get("body_html", "")

        language_names = {
            "ko": "한국어",
            "en": "English",
            "ja": "日本語",
            "zh": "中文",
            "es": "Español",
            "fr": "Français",
            "de": "Deutsch",
        }

        target_name = language_names.get(target_language, target_language)

        prompt = ChatPromptTemplate.from_template("""다음 이메일을 {target_language}로 번역해주세요.
번역문만 출력하세요. 다른 설명은 하지 마세요.

**제목**: {subject}

**본문**:
{body}

번역 ({target_language}):""")

        chain = prompt | _get_llm()

        translation = chain.invoke({
            "subject": email.get("subject", ""),
            "body": body[:6000],
            "target_language": target_name,
        })

        return json.dumps({
            "success": True,
            "email_id": email_id,
            "original_subject": email.get("subject"),
            "target_language": target_language,
            "translation": translation.content,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"번역 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_draft_reply(
    email_id: str,
    reply_type: Literal["formal", "friendly", "brief", "detailed", "decline", "accept"] = "formal",
    key_points: Optional[str] = None,
    language: str = "ko",
) -> str:
    """
    Generate a reply draft for an email.

    Args:
        email_id: Email ID to reply to
        reply_type: Type of reply
            - formal: 공식적인 답장
            - friendly: 친근한 답장
            - brief: 간단한 답장
            - detailed: 상세한 답장
            - decline: 정중한 거절
            - accept: 수락/동의
        key_points: Optional key points to include
        language: Response language (ko, en, etc.)

    Returns:
        Generated reply draft
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("email_messages")
            .select("*")
            .eq("id", email_id)
            .single()
            .execute()
        )

        if not result.data:
            return json.dumps({"success": False, "error": "이메일을 찾을 수 없습니다."}, ensure_ascii=False)

        email = result.data
        body = email.get("body_text") or email.get("body_html", "")[:3000]

        reply_instructions = {
            "formal": "공식적이고 비즈니스적인 톤으로 답장을 작성해주세요.",
            "friendly": "친근하고 따뜻한 톤으로 답장을 작성해주세요.",
            "brief": "핵심만 간단히 답장을 작성해주세요. 3-5문장 이내.",
            "detailed": "상세하고 포괄적인 답장을 작성해주세요.",
            "decline": "정중하게 거절하는 답장을 작성해주세요. 거절 이유와 대안을 제시하세요.",
            "accept": "수락/동의하는 답장을 작성해주세요. 다음 단계를 제안하세요.",
        }

        prompt = ChatPromptTemplate.from_template("""원본 이메일에 대한 답장을 작성해주세요.

**원본 이메일**
발신자: {from_name} <{from_address}>
제목: {subject}
내용:
{body}

**답장 지시사항**
스타일: {reply_instruction}
언어: {language}
{key_points_instruction}

**답장 (제목과 본문 포함)**:""")

        chain = prompt | _get_llm()

        key_points_text = f"포함할 핵심 포인트: {key_points}" if key_points else ""

        reply = chain.invoke({
            "from_name": email.get("from_name", ""),
            "from_address": email.get("from_address", ""),
            "subject": email.get("subject", ""),
            "body": body,
            "reply_instruction": reply_instructions.get(reply_type, reply_instructions["formal"]),
            "language": "한국어" if language == "ko" else language,
            "key_points_instruction": key_points_text,
        })

        # Save as draft
        try:
            draft_data = {
                "account_id": email.get("account_id"),
                "user_id": email.get("account_id"),  # Will need proper user_id
                "reply_to_message_id": email_id,
                "is_reply": True,
                "subject": f"Re: {email.get('subject', '')}",
                "to_addresses": [{"email": email.get("from_address"), "name": email.get("from_name")}],
                "body_text": reply.content,
                "ai_generated": True,
                "ai_prompt": f"reply_type: {reply_type}, key_points: {key_points}",
                "status": "draft",
            }
            # Note: This might fail due to user_id constraint, that's ok
            client.table("email_drafts").insert(draft_data).execute()
        except Exception:
            pass  # Ignore save errors

        return json.dumps({
            "success": True,
            "email_id": email_id,
            "reply_type": reply_type,
            "draft": reply.content,
            "to": email.get("from_address"),
            "subject": f"Re: {email.get('subject', '')}",
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"답장 생성 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_search(
    account_id: str,
    query: str,
    folder: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    Search emails by keyword.

    Args:
        account_id: Email account ID
        query: Search keyword
        folder: Optional folder filter
        limit: Max results

    Returns:
        Matching emails
    """
    try:
        client = get_supabase_client()

        # Build search query
        db_query = (
            client.table("email_messages")
            .select("id, subject, from_address, from_name, snippet, received_at, folder")
            .eq("account_id", account_id)
            .eq("is_trash", False)
        )

        if folder:
            db_query = db_query.eq("folder", folder)

        # Search in subject and body
        db_query = db_query.or_(f"subject.ilike.%{query}%,body_text.ilike.%{query}%,from_address.ilike.%{query}%")
        db_query = db_query.order("received_at", desc=True).limit(limit)

        result = db_query.execute()

        return json.dumps({
            "success": True,
            "emails": result.data or [],
            "count": len(result.data or []),
            "query": query,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"검색 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_mark_read(email_id: str, is_read: bool = True) -> str:
    """
    Mark email as read or unread.

    Args:
        email_id: Email ID
        is_read: True to mark as read, False for unread

    Returns:
        Update result
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("email_messages")
            .update({"is_read": is_read})
            .eq("id", email_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "message": "읽음으로 표시됨" if is_read else "안읽음으로 표시됨",
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "업데이트 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"업데이트 오류: {str(e)}"}, ensure_ascii=False)


@tool
def email_summarize_inbox(account_id: str, days: int = 7) -> str:
    """
    Generate AI summary of recent inbox activity.

    Args:
        account_id: Email account ID
        days: Number of days to summarize (default: 7)

    Returns:
        AI-generated inbox summary
    """
    try:
        client = get_supabase_client()
        from datetime import datetime, timedelta

        # Get recent emails
        since_date = (datetime.now() - timedelta(days=days)).isoformat()

        result = (
            client.table("email_messages")
            .select("subject, from_name, from_address, snippet, received_at, is_read, ai_priority")
            .eq("account_id", account_id)
            .eq("folder", "INBOX")
            .gte("received_at", since_date)
            .order("received_at", desc=True)
            .limit(50)
            .execute()
        )

        emails = result.data or []

        if not emails:
            return json.dumps({
                "success": True,
                "summary": f"최근 {days}일간 수신된 이메일이 없습니다.",
                "count": 0,
            }, ensure_ascii=False)

        # Prepare summary data
        email_list = []
        for e in emails:
            email_list.append(f"- [{e.get('ai_priority', 'normal')}] {e.get('from_name', e['from_address'])}: {e.get('subject', '(제목 없음)')}")

        prompt = ChatPromptTemplate.from_template("""최근 {days}일간 받은 이메일을 요약해주세요.

총 {count}개 이메일:
{email_list}

다음 형식으로 요약해주세요:

## 받은 편지함 요약

### 주요 이메일 (중요도 순)
(가장 중요한 3-5개)

### 카테고리별 분류
- 업무 관련:
- 뉴스레터/프로모션:
- 기타:

### 액션 필요 항목
(답장이 필요하거나 조치가 필요한 것들)

### 추천 사항
(이메일 관리에 대한 조언)""")

        chain = prompt | _get_llm()

        summary = chain.invoke({
            "days": days,
            "count": len(emails),
            "email_list": "\n".join(email_list[:30]),
        })

        # Save summary
        try:
            client.table("email_summaries").insert({
                "user_id": account_id,  # Will need proper user_id
                "account_id": account_id,
                "summary_type": "custom",
                "period_start": since_date,
                "period_end": datetime.now().isoformat(),
                "total_emails": len(emails),
                "unread_count": len([e for e in emails if not e.get("is_read")]),
                "urgent_count": len([e for e in emails if e.get("ai_priority") == "urgent"]),
                "summary_text": summary.content,
            }).execute()
        except Exception:
            pass

        return json.dumps({
            "success": True,
            "days": days,
            "total_emails": len(emails),
            "unread_count": len([e for e in emails if not e.get("is_read")]),
            "summary": summary.content,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"요약 오류: {str(e)}"}, ensure_ascii=False)


# Register all tools
register_tool(email_get)
register_tool(email_list)
register_tool(email_analyze)
register_tool(email_translate)
register_tool(email_draft_reply)
register_tool(email_search)
register_tool(email_mark_read)
register_tool(email_summarize_inbox)

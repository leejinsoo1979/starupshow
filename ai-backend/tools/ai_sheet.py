"""
AI Sheet Tool - 스프레드시트 데이터 분석 및 조작 도구
sheets 테이블 연동
"""
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Literal, Optional, Any
import json
import statistics
from datetime import datetime

from config import get_settings
from .registry import register_tool
from utils.supabase import get_supabase_client

settings = get_settings()

# LLM for data analysis
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.2,
    api_key=settings.openai_api_key,
)


def _extract_column_values(rows: list[dict], column_id: str) -> list[Any]:
    """Extract values from a specific column"""
    return [row.get(column_id) for row in rows if row.get(column_id) is not None]


def _calculate_statistics(values: list) -> dict:
    """Calculate basic statistics for numeric values"""
    numeric_values = [v for v in values if isinstance(v, (int, float))]
    if not numeric_values:
        return {"error": "No numeric values found"}

    return {
        "count": len(numeric_values),
        "sum": sum(numeric_values),
        "mean": statistics.mean(numeric_values),
        "median": statistics.median(numeric_values),
        "min": min(numeric_values),
        "max": max(numeric_values),
        "stdev": statistics.stdev(numeric_values) if len(numeric_values) > 1 else 0,
    }


@tool
def ai_sheet_create(
    team_id: str,
    name: str,
    description: Optional[str] = None,
    columns: Optional[list[dict]] = None,
    project_id: Optional[str] = None,
) -> str:
    """
    Create a new spreadsheet.

    Args:
        team_id: Team ID
        name: Sheet name
        description: Optional description
        columns: Column definitions [{"id": "col1", "name": "Column 1", "type": "text"}, ...]
            Types: text, number, date, select, multiselect, checkbox, url, email
        project_id: Optional project ID to link

    Returns:
        Created sheet info
    """
    try:
        client = get_supabase_client()

        # Default columns if not provided
        if not columns:
            columns = [
                {"id": "col_a", "name": "A", "type": "text", "width": 150},
                {"id": "col_b", "name": "B", "type": "text", "width": 150},
                {"id": "col_c", "name": "C", "type": "text", "width": 150},
            ]

        sheet_data = {
            "team_id": team_id,
            "name": name,
            "description": description,
            "columns": columns,
            "rows": [],
            "project_id": project_id,
            "settings": {"frozen_columns": 0, "frozen_rows": 0},
        }

        result = client.table("sheets").insert(sheet_data).execute()

        if result.data:
            sheet = result.data[0]
            return json.dumps({
                "success": True,
                "sheet": {
                    "id": sheet["id"],
                    "name": sheet["name"],
                    "columns": sheet["columns"],
                    "created_at": sheet["created_at"],
                },
                "message": f"시트 '{name}'가 생성되었습니다."
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "시트 생성 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"시트 생성 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_get(sheet_id: str) -> str:
    """
    Get a spreadsheet with all data.

    Args:
        sheet_id: Sheet ID

    Returns:
        Sheet with columns and rows
    """
    try:
        client = get_supabase_client()

        result = client.table("sheets").select("*").eq("id", sheet_id).single().execute()

        if not result.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        return json.dumps({
            "success": True,
            "sheet": result.data,
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"시트 조회 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_add_rows(sheet_id: str, rows: list[dict]) -> str:
    """
    Add rows to a spreadsheet.

    Args:
        sheet_id: Sheet ID
        rows: List of row data [{"col1": "value1", "col2": 123}, ...]

    Returns:
        Result with updated row count
    """
    try:
        client = get_supabase_client()

        # Get current sheet
        current = client.table("sheets").select("rows").eq("id", sheet_id).single().execute()

        if not current.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        current_rows = current.data.get("rows", [])

        # Add IDs to new rows
        import uuid
        for row in rows:
            if "id" not in row:
                row["id"] = str(uuid.uuid4())[:8]

        updated_rows = current_rows + rows

        # Update sheet
        result = (
            client.table("sheets")
            .update({"rows": updated_rows})
            .eq("id", sheet_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "added_count": len(rows),
                "total_rows": len(updated_rows),
                "message": f"{len(rows)}개 행이 추가되었습니다."
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "행 추가 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"행 추가 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_update_cell(sheet_id: str, row_id: str, column_id: str, value: Any) -> str:
    """
    Update a specific cell value.

    Args:
        sheet_id: Sheet ID
        row_id: Row ID
        column_id: Column ID
        value: New value

    Returns:
        Update result
    """
    try:
        client = get_supabase_client()

        # Get current sheet
        current = client.table("sheets").select("rows").eq("id", sheet_id).single().execute()

        if not current.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        rows = current.data.get("rows", [])

        # Find and update row
        updated = False
        for row in rows:
            if row.get("id") == row_id:
                row[column_id] = value
                updated = True
                break

        if not updated:
            return json.dumps({"success": False, "error": "행을 찾을 수 없습니다."}, ensure_ascii=False)

        # Save updated rows
        result = (
            client.table("sheets")
            .update({"rows": rows})
            .eq("id", sheet_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "message": f"셀이 업데이트되었습니다.",
                "row_id": row_id,
                "column_id": column_id,
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "셀 업데이트 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"셀 업데이트 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_analyze(
    sheet_id: str,
    analysis_type: Literal["summary", "statistics", "trends", "anomalies", "correlation"] = "summary",
    column_ids: Optional[list[str]] = None,
) -> str:
    """
    Analyze spreadsheet data using AI.

    Args:
        sheet_id: Sheet ID to analyze
        analysis_type: Type of analysis (summary, statistics, trends, anomalies, correlation)
        column_ids: Optional specific columns to analyze (default: all)

    Returns:
        AI analysis results
    """
    try:
        client = get_supabase_client()

        # Get sheet data
        result = client.table("sheets").select("*").eq("id", sheet_id).single().execute()

        if not result.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        sheet = result.data
        columns = sheet.get("columns", [])
        rows = sheet.get("rows", [])

        if not rows:
            return json.dumps({
                "success": False,
                "error": "분석할 데이터가 없습니다."
            }, ensure_ascii=False)

        # Filter columns if specified
        if column_ids:
            columns = [c for c in columns if c["id"] in column_ids]

        # Basic statistics for numeric columns
        stats_by_column = {}
        for col in columns:
            col_id = col["id"]
            values = _extract_column_values(rows, col_id)

            if col["type"] == "number" or all(isinstance(v, (int, float)) for v in values if v is not None):
                stats_by_column[col["name"]] = _calculate_statistics(values)
            else:
                # Count unique values for non-numeric
                value_counts = {}
                for v in values:
                    str_v = str(v)
                    value_counts[str_v] = value_counts.get(str_v, 0) + 1
                stats_by_column[col["name"]] = {
                    "type": "categorical",
                    "unique_count": len(value_counts),
                    "total_count": len(values),
                    "top_values": sorted(value_counts.items(), key=lambda x: -x[1])[:5]
                }

        # Prepare data summary for AI analysis
        data_preview = []
        for row in rows[:20]:  # First 20 rows
            row_data = {col["name"]: row.get(col["id"]) for col in columns}
            data_preview.append(row_data)

        # AI Analysis
        prompts = {
            "summary": """다음 스프레드시트 데이터를 분석하고 핵심 인사이트를 제공해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}
통계: {statistics}

데이터 샘플 (처음 20행):
{data_preview}

다음 내용을 포함해 분석해주세요:
1. 데이터 개요
2. 주요 발견 사항
3. 데이터 품질 이슈 (있다면)
4. 추천 액션""",

            "statistics": """다음 스프레드시트 데이터의 통계 분석을 수행해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}
기본 통계: {statistics}

데이터 샘플:
{data_preview}

다음 내용을 분석해주세요:
1. 각 컬럼별 상세 통계
2. 분포 특성
3. 이상치 가능성
4. 데이터 패턴""",

            "trends": """다음 스프레드시트 데이터에서 트렌드를 분석해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}
통계: {statistics}

데이터 샘플:
{data_preview}

다음을 분석해주세요:
1. 시간에 따른 변화 (날짜 컬럼이 있다면)
2. 증가/감소 트렌드
3. 패턴 및 주기성
4. 예측 가능한 미래 트렌드""",

            "anomalies": """다음 스프레드시트 데이터에서 이상치를 탐지해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}
통계: {statistics}

데이터 샘플:
{data_preview}

다음을 분석해주세요:
1. 통계적 이상치 (평균에서 크게 벗어난 값)
2. 데이터 입력 오류 가능성
3. 비정상적인 패턴
4. 추가 조사가 필요한 항목""",

            "correlation": """다음 스프레드시트 데이터에서 컬럼 간 상관관계를 분석해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}
통계: {statistics}

데이터 샘플:
{data_preview}

다음을 분석해주세요:
1. 컬럼 간 상관관계
2. 인과관계 가능성
3. 숨겨진 패턴
4. 비즈니스 인사이트""",
        }

        prompt = ChatPromptTemplate.from_template(prompts.get(analysis_type, prompts["summary"]))
        chain = prompt | llm

        analysis = chain.invoke({
            "sheet_name": sheet["name"],
            "columns": json.dumps([c["name"] for c in columns], ensure_ascii=False),
            "row_count": len(rows),
            "statistics": json.dumps(stats_by_column, ensure_ascii=False, default=str),
            "data_preview": json.dumps(data_preview, ensure_ascii=False, default=str),
        })

        # Save analysis result
        try:
            client.table("sheet_analyses").insert({
                "sheet_id": sheet_id,
                "analysis_type": analysis_type,
                "query": None,
                "results": {
                    "analysis": analysis.content,
                    "statistics": stats_by_column,
                },
                "model_used": "gpt-4o",
            }).execute()
        except Exception:
            pass  # Ignore save errors

        return json.dumps({
            "success": True,
            "sheet_name": sheet["name"],
            "analysis_type": analysis_type,
            "row_count": len(rows),
            "statistics": stats_by_column,
            "analysis": analysis.content,
        }, ensure_ascii=False, default=str)

    except Exception as e:
        return json.dumps({"success": False, "error": f"분석 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_query(sheet_id: str, query: str) -> str:
    """
    Query spreadsheet data with natural language.

    Args:
        sheet_id: Sheet ID
        query: Natural language query (e.g., "매출이 가장 높은 달", "총 비용 합계")

    Returns:
        Query results
    """
    try:
        client = get_supabase_client()

        # Get sheet data
        result = client.table("sheets").select("*").eq("id", sheet_id).single().execute()

        if not result.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        sheet = result.data
        columns = sheet.get("columns", [])
        rows = sheet.get("rows", [])

        if not rows:
            return json.dumps({"success": False, "error": "데이터가 없습니다."}, ensure_ascii=False)

        # Prepare data for LLM
        data_preview = []
        for row in rows[:50]:  # First 50 rows
            row_data = {col["name"]: row.get(col["id"]) for col in columns}
            data_preview.append(row_data)

        prompt = ChatPromptTemplate.from_template("""다음 스프레드시트 데이터에서 질문에 답해주세요.

시트 이름: {sheet_name}
컬럼: {columns}
총 행 수: {row_count}

데이터:
{data}

질문: {query}

정확한 데이터를 기반으로 답변해주세요. 계산이 필요하면 계산 과정도 보여주세요.""")

        chain = prompt | llm

        answer = chain.invoke({
            "sheet_name": sheet["name"],
            "columns": json.dumps([{"name": c["name"], "type": c["type"]} for c in columns], ensure_ascii=False),
            "row_count": len(rows),
            "data": json.dumps(data_preview, ensure_ascii=False, default=str),
            "query": query,
        })

        return json.dumps({
            "success": True,
            "query": query,
            "answer": answer.content,
            "data_rows_analyzed": min(len(rows), 50),
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"쿼리 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_add_column(
    sheet_id: str,
    name: str,
    column_type: Literal["text", "number", "date", "select", "checkbox", "url", "email"] = "text",
    options: Optional[list[str]] = None,
) -> str:
    """
    Add a new column to a spreadsheet.

    Args:
        sheet_id: Sheet ID
        name: Column name
        column_type: Column type
        options: Options for select type

    Returns:
        Result with new column info
    """
    try:
        client = get_supabase_client()

        # Get current columns
        current = client.table("sheets").select("columns").eq("id", sheet_id).single().execute()

        if not current.data:
            return json.dumps({"success": False, "error": "시트를 찾을 수 없습니다."}, ensure_ascii=False)

        columns = current.data.get("columns", [])

        # Generate column ID
        col_id = f"col_{len(columns) + 1}"

        new_column = {
            "id": col_id,
            "name": name,
            "type": column_type,
            "width": 150,
        }

        if options and column_type == "select":
            new_column["options"] = options

        columns.append(new_column)

        # Update
        result = (
            client.table("sheets")
            .update({"columns": columns})
            .eq("id", sheet_id)
            .execute()
        )

        if result.data:
            return json.dumps({
                "success": True,
                "column": new_column,
                "message": f"컬럼 '{name}'가 추가되었습니다."
            }, ensure_ascii=False)

        return json.dumps({"success": False, "error": "컬럼 추가 실패"}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"컬럼 추가 오류: {str(e)}"}, ensure_ascii=False)


@tool
def ai_sheet_list(team_id: str, include_archived: bool = False) -> str:
    """
    List all spreadsheets for a team.

    Args:
        team_id: Team ID
        include_archived: Include archived sheets

    Returns:
        List of sheets
    """
    try:
        client = get_supabase_client()

        query = (
            client.table("sheets")
            .select("id, name, description, created_at, updated_at, is_archived")
            .eq("team_id", team_id)
        )

        if not include_archived:
            query = query.eq("is_archived", False)

        query = query.order("updated_at", desc=True)
        result = query.execute()

        # Add row/column counts
        sheets = []
        for sheet in (result.data or []):
            sheet_detail = client.table("sheets").select("columns, rows").eq("id", sheet["id"]).single().execute()
            if sheet_detail.data:
                sheet["column_count"] = len(sheet_detail.data.get("columns", []))
                sheet["row_count"] = len(sheet_detail.data.get("rows", []))
            sheets.append(sheet)

        return json.dumps({
            "success": True,
            "sheets": sheets,
            "count": len(sheets),
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": f"목록 조회 오류: {str(e)}"}, ensure_ascii=False)


# Register all tools
register_tool(ai_sheet_create)
register_tool(ai_sheet_get)
register_tool(ai_sheet_add_rows)
register_tool(ai_sheet_update_cell)
register_tool(ai_sheet_analyze)
register_tool(ai_sheet_query)
register_tool(ai_sheet_add_column)
register_tool(ai_sheet_list)

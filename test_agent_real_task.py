#!/usr/bin/env python3
"""Test giving a REAL task to the Super Agent"""

from playwright.sync_api import sync_playwright
import time

def test_real_task():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})

        # Navigate to agents page
        print("1. Navigating to agents page...")
        page.goto('http://localhost:3000/dashboard-group/agents')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Click on "테스트 JARVIS" agent
        print("2. Clicking on 테스트 JARVIS...")
        jarvis_card = page.locator('text=테스트 JARVIS').first
        jarvis_card.click()
        time.sleep(3)

        # Click chat button
        print("3. Opening chat...")
        chat_btn = page.locator('button:has-text("채팅")').first
        if chat_btn.is_visible():
            chat_btn.click()
            time.sleep(1)

        # Find chat input
        page.evaluate('''() => {
            const el = document.querySelector('input[placeholder*="메시지"]');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
            }
        }''')
        time.sleep(0.5)

        input_el = page.locator('input[placeholder*="메시지"]').first

        # Test 1: Real task - Web search
        print("\n=== 테스트 1: 웹 검색 업무 ===")
        task1 = "오늘 대한민국 주요 뉴스 3개를 찾아서 요약해줘"
        print(f"   업무 지시: {task1}")
        input_el.fill(task1)
        input_el.press('Enter')
        print("   ⏳ 응답 대기 중 (20초)...")
        time.sleep(20)
        page.screenshot(path='/tmp/task_1_news.png', full_page=True)
        print("   ✅ 스크린샷 저장: /tmp/task_1_news.png")

        # Test 2: Real task - Data analysis
        print("\n=== 테스트 2: 데이터 분석 업무 ===")
        task2 = "현재 시스템에 등록된 에이전트 목록을 조회하고 각각의 상태를 알려줘"
        print(f"   업무 지시: {task2}")
        input_el.fill(task2)
        input_el.press('Enter')
        print("   ⏳ 응답 대기 중 (20초)...")
        time.sleep(20)
        page.screenshot(path='/tmp/task_2_agents.png', full_page=True)
        print("   ✅ 스크린샷 저장: /tmp/task_2_agents.png")

        # Test 3: Real task - Execute action
        print("\n=== 테스트 3: 실행 업무 ===")
        task3 = "내 캘린더에 오늘 오후 3시에 '팀 미팅' 일정을 추가해줘"
        print(f"   업무 지시: {task3}")
        input_el.fill(task3)
        input_el.press('Enter')
        print("   ⏳ 응답 대기 중 (20초)...")
        time.sleep(20)
        page.screenshot(path='/tmp/task_3_calendar.png', full_page=True)
        print("   ✅ 스크린샷 저장: /tmp/task_3_calendar.png")

        print("\n✅ 실제 업무 테스트 완료!")
        time.sleep(2)
        browser.close()

if __name__ == '__main__':
    test_real_task()

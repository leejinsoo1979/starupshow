#!/usr/bin/env python3
"""Test giving a task to the Super Agent"""

from playwright.sync_api import sync_playwright
import time

def test_agent_task():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})

        # Navigate to agents page
        print("1. Navigating to agents page...")
        page.goto('http://localhost:3000/dashboard-group/agents')
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # Click on "테스트 JARVIS" agent
        print("2. Looking for 테스트 JARVIS agent...")
        jarvis_card = page.locator('text=테스트 JARVIS').first
        if jarvis_card.is_visible():
            jarvis_card.click()
            print("   Clicked on 테스트 JARVIS")
        else:
            print("   Agent not found!")
            browser.close()
            return

        # Wait for loading to complete
        print("3. Waiting for agent to load...")
        time.sleep(3)
        try:
            page.wait_for_selector('text=로딩 중', state='hidden', timeout=15000)
        except:
            pass
        time.sleep(2)

        # Click "채팅" button to open chat
        print("4. Clicking 채팅 button...")
        chat_btn = page.locator('button:has-text("채팅")').first
        if chat_btn.is_visible():
            chat_btn.click()
            print("   Clicked 채팅 button!")
            time.sleep(2)

        page.screenshot(path='/tmp/task_1_chat_view.png', full_page=True)
        print("5. Chat view screenshot saved")

        # Find the chat input using placeholder
        print("6. Looking for chat input...")
        chat_input = page.locator('input[placeholder*="JARVIS에게 메시지"]')
        if not chat_input.is_visible():
            # Try another selector
            chat_input = page.locator('input[placeholder*="메시지 보내기"]')

        if chat_input.is_visible():
            print("7. Found chat input (input field)!")
            chat_input.click()
            time.sleep(0.3)
            chat_input.fill('안녕! 오늘 날짜가 뭐야?')
            time.sleep(0.5)
            page.screenshot(path='/tmp/task_2_input_filled.png')
            print("   Message typed")

            # Press Enter to send
            chat_input.press('Enter')
            print("8. Sent message!")

            # Wait for response
            print("9. Waiting for agent response...")
            time.sleep(10)

            page.screenshot(path='/tmp/task_3_response.png', full_page=True)
            print("   Response screenshot saved")
        else:
            # Try clicking "메시지 보내기" button first
            print("   Input not found, trying 메시지 보내기 button...")
            msg_btn = page.locator('button:has-text("메시지 보내기")').first
            if msg_btn.is_visible():
                msg_btn.click()
                print("   Clicked 메시지 보내기!")
                time.sleep(1)
                page.screenshot(path='/tmp/task_2_after_btn.png')

                # Now find input
                chat_input = page.locator('textarea, input[type="text"]').last
                if chat_input.is_visible():
                    chat_input.fill('안녕! 오늘 날짜가 뭐야?')
                    chat_input.press('Enter')
                    print("8. Sent message!")
                    time.sleep(10)
                    page.screenshot(path='/tmp/task_3_response.png', full_page=True)

        print("\n✅ Test completed!")
        time.sleep(2)
        browser.close()

if __name__ == '__main__':
    test_agent_task()

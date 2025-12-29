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
        else:
            print("   채팅 button not found, trying alternative...")
            # Try clicking on the chat icon/tab
            page.locator('text=채팅').first.click()
            time.sleep(2)

        page.screenshot(path='/tmp/task_1_chat_view.png', full_page=True)
        print("5. Chat view screenshot saved")

        # Scroll down to find the chat input
        print("6. Scrolling to chat input...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        # Find and fill chat input
        chat_input = page.locator('textarea[placeholder*="메시지"]').first
        if chat_input.is_visible():
            print("7. Found chat input!")
            chat_input.scroll_into_view_if_needed()
            time.sleep(0.5)
            chat_input.click()
            time.sleep(0.3)
            chat_input.fill('안녕! 오늘 날짜가 뭐야? 간단하게 알려줘.')
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
            print("   Chat input not visible after scrolling")
            page.screenshot(path='/tmp/task_2_no_input.png', full_page=True)

        print("\n✅ Test completed!")
        time.sleep(2)
        browser.close()

if __name__ == '__main__':
    test_agent_task()

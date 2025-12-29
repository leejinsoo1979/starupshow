#!/usr/bin/env python3
"""Test sending a task to the Super Agent via chat"""

from playwright.sync_api import sync_playwright
import time

def test_agent_chat():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})

        # Navigate to agents page
        print("1. Navigating to agents page...")
        page.goto('http://localhost:3000/dashboard-group/agents')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Click on "테스트 JARVIS" agent
        print("2. Looking for 테스트 JARVIS agent...")
        jarvis_card = page.locator('text=테스트 JARVIS').first
        if jarvis_card.is_visible():
            jarvis_card.click()
            print("   ✅ Clicked on 테스트 JARVIS")
        else:
            print("   ❌ Agent not found!")
            browser.close()
            return

        # Wait for agent page to load
        print("3. Waiting for agent to load...")
        time.sleep(3)
        try:
            page.wait_for_selector('text=로딩 중', state='hidden', timeout=15000)
        except:
            pass
        time.sleep(2)

        # Take screenshot of agent detail page
        page.screenshot(path='/tmp/chat_1_agent_detail.png', full_page=True)
        print("   Screenshot saved: /tmp/chat_1_agent_detail.png")

        # Try clicking "1:1 채팅하기" button first (opens dedicated chat)
        print("4. Looking for chat buttons...")
        one_on_one_btn = page.locator('button:has-text("1:1 채팅하기")').first
        chat_btn = page.locator('button:has-text("채팅")').first

        if one_on_one_btn.is_visible():
            print("   Found '1:1 채팅하기' button, clicking...")
            one_on_one_btn.click()
            time.sleep(2)
            page.screenshot(path='/tmp/chat_2_after_121.png', full_page=True)
        elif chat_btn.is_visible():
            print("   Found '채팅' button, clicking...")
            chat_btn.click()
            time.sleep(2)
            page.screenshot(path='/tmp/chat_2_after_chat.png', full_page=True)

        # Now find the chat input using JavaScript evaluation
        print("5. Finding chat input using JavaScript...")

        # Try to find and interact with input using JavaScript
        result = page.evaluate('''() => {
            // Try multiple selectors
            const selectors = [
                'input[placeholder*="메시지"]',
                'textarea[placeholder*="메시지"]',
                'input[type="text"]',
                'textarea',
                '[contenteditable="true"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el.offsetParent !== null) {  // Check if visible
                        return {
                            found: true,
                            selector: selector,
                            placeholder: el.placeholder || '',
                            tagName: el.tagName,
                            rect: el.getBoundingClientRect()
                        };
                    }
                }
            }
            return { found: false };
        }''')

        print(f"   JavaScript result: {result}")

        if result.get('found'):
            selector = result['selector']
            print(f"   ✅ Found input with selector: {selector}")

            # Scroll element into view and click using JavaScript
            page.evaluate(f'''() => {{
                const el = document.querySelector('{selector}');
                if (el) {{
                    el.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                    el.focus();
                }}
            }}''')
            time.sleep(0.5)

            # Now try to type using the selector
            input_el = page.locator(selector).first
            if input_el.is_visible():
                print("6. Typing message...")
                input_el.fill('안녕! 오늘 날짜가 뭐야?')
                time.sleep(0.5)
                page.screenshot(path='/tmp/chat_3_message_typed.png')
                print("   ✅ Message typed")

                # Press Enter to send
                input_el.press('Enter')
                print("7. Message sent!")

                # Wait for response
                print("8. Waiting for agent response (15 seconds)...")
                time.sleep(15)

                page.screenshot(path='/tmp/chat_4_response.png', full_page=True)
                print("   ✅ Response screenshot saved: /tmp/chat_4_response.png")
            else:
                print("   ⚠️ Input not visible after JavaScript focus")
                # Try direct JavaScript input
                page.evaluate(f'''() => {{
                    const el = document.querySelector('{selector}');
                    if (el) {{
                        el.value = '안녕! 오늘 날짜가 뭐야?';
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    }}
                }}''')
                time.sleep(0.5)
                page.screenshot(path='/tmp/chat_3_js_input.png')

                # Try to find and click send button
                send_btn = page.locator('button[type="submit"], button:has-text("보내기"), button:has(svg)').last
                if send_btn.is_visible():
                    send_btn.click()
                    print("   Clicked send button via JavaScript")
                    time.sleep(15)
                    page.screenshot(path='/tmp/chat_4_response.png', full_page=True)
        else:
            print("   ❌ No chat input found")
            # List all inputs on page for debugging
            all_inputs = page.evaluate('''() => {
                return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                    tagName: el.tagName,
                    type: el.type,
                    placeholder: el.placeholder,
                    visible: el.offsetParent !== null
                }));
            }''')
            print(f"   All inputs on page: {all_inputs}")

        print("\n✅ Test completed!")
        time.sleep(2)
        browser.close()

if __name__ == '__main__':
    test_agent_chat()

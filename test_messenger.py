from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Console 로그 캡처
    console_logs = []
    page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # 네트워크 요청 캡처
    api_calls = []
    all_requests = []
    def handle_request(request):
        all_requests.append(request.url)
        if '/api/chat' in request.url:
            api_calls.append({
                'url': request.url,
                'time': time.time()
            })
    page.on('request', handle_request)

    print("1. 메신저 페이지로 이동...")
    response = page.goto('http://localhost:3000/messenger', timeout=60000)
    print(f"   응답 상태: {response.status}")
    print(f"   최종 URL: {page.url}")

    print("\n2. 페이지 로드 대기 (최대 15초)...")
    try:
        page.wait_for_load_state('networkidle', timeout=15000)
        print("   ✅ networkidle 도달")
    except Exception as e:
        print(f"   ⚠️ networkidle 타임아웃: {e}")

    # 현재 URL 확인 (리다이렉트 체크)
    print(f"\n3. 현재 URL: {page.url}")

    # 페이지 내용 확인
    print("\n4. 페이지 HTML 일부:")
    html = page.content()
    print(f"   HTML 길이: {len(html)} bytes")
    
    # 로그인 페이지인지 확인
    if 'login' in page.url.lower() or 'sign' in page.url.lower():
        print("   ⚠️ 로그인 페이지로 리다이렉트됨!")
    
    # 주요 요소 확인
    body_text = page.locator('body').inner_text()
    print(f"   본문 텍스트 길이: {len(body_text)} chars")
    if body_text.strip():
        print(f"   본문 미리보기: {body_text[:200]}...")

    print("\n5. 10초 대기 후 API 호출 패턴 분석...")
    time.sleep(10)

    # API 호출 분석
    print(f"\n=== API 호출 분석 ===")
    chat_calls = [r for r in all_requests if '/api/chat' in r]
    print(f"총 /api/chat 호출 수: {len(chat_calls)}")
    
    if chat_calls:
        for i, call in enumerate(chat_calls[:10]):
            print(f"  {i+1}. {call}")

    if len(chat_calls) > 20:
        print("❌ 무한 루프 감지! API 호출이 너무 많음")
    elif len(api_calls) >= 2:
        intervals = []
        for i in range(1, min(len(api_calls), 10)):
            interval = api_calls[i]['time'] - api_calls[i-1]['time']
            intervals.append(interval)
        if intervals:
            avg_interval = sum(intervals) / len(intervals)
            print(f"평균 호출 간격: {avg_interval:.2f}초")
            if avg_interval < 1:
                print("❌ 호출 간격이 너무 짧음 - 무한 루프 가능성")
            else:
                print("✅ 정상 polling 패턴 (5초 간격 예상)")

    # 콘솔 에러 확인
    print(f"\n=== 콘솔 로그 ({len(console_logs)}개) ===")
    for log in console_logs[:15]:
        print(f"  {log}")

    # 스크린샷
    page.screenshot(path='/tmp/messenger_test.png', full_page=True)
    print(f"\n스크린샷 저장: /tmp/messenger_test.png")

    browser.close()
    print("\n테스트 완료!")

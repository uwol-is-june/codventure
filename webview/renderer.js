'use strict';
// webview 컨텍스트에서 실행. SPRITES, STAGE 는 index.html 인라인 스크립트에서 주입.
(function () {

  // ── TASK-03-5: 스테이지별 픽셀 배율 ────────────────────────────────────
  // 16px × 8 = 128px, 24px × 5 = 120px, 32px × 4 = 128px,
  // 40px × 3 = 120px, 48px × 2 = 96px  → 모두 128px canvas 안에서 중앙 정렬
  const STAGE_SCALE    = { 0: 8, 1: 8, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2 };
  const CANVAS_SIZE    = 128;
  const FRAME_INTERVAL = 800; // ms — 숨쉬기 주기

  // ── DOM ─────────────────────────────────────────────────────────────────
  const canvas = document.getElementById('c');
  const ctx    = canvas.getContext('2d');

  // ── 상태 ────────────────────────────────────────────────────────────────
  // SPRITES: 스테이지 인덱스 배열 (null = 미구현), STAGE: 초기 스테이지
  let stageIdx   = (typeof STAGE !== 'undefined') ? STAGE : 1;
  let frameIdx   = 0;
  let animId     = null;

  // ── TASK-03-4: drawSprite 공통 함수 ─────────────────────────────────────
  // 팔레트 컬러 인덱스 2D 배열을 canvas fillRect 로 그림.
  // index 0 은 투명 → 건너뜀.
  function drawSprite(frames, palette, fi, x, y, scale) {
    const frame = frames[fi];
    const size  = frame.length;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ci = frame[r][c];
        if (ci === 0) continue;
        ctx.fillStyle = palette[ci];
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }

  // ── TASK-03-6: Canvas 중앙 정렬 ─────────────────────────────────────────
  // 스프라이트 실제 렌더 크기(spriteSize × scale)를 128px canvas 중앙에 배치.
  function center(spriteSize, scale) {
    const offset = Math.floor((CANVAS_SIZE - spriteSize * scale) / 2);
    return { x: offset, y: offset };
  }

  function render() {
    const sprite = SPRITES[stageIdx];
    if (!sprite) { ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); return; }
    const scale = STAGE_SCALE[stageIdx] ?? 8;
    const size  = sprite.frames[0].length; // 16 (stage 0-2)
    const { x, y } = center(size, scale);
    drawSprite(sprite.frames, sprite.palette, frameIdx, x, y, scale);
  }

  // ── TASK-03-1: requestAnimationFrame 루프 ───────────────────────────────
  // 숨쉬기는 frame 0 ↔ 1 순환. 기쁨(frame 2) 등 특수 프레임은 별도 트리거.
  function startLoop() {
    if (animId !== null) cancelAnimationFrame(animId);
    let lastSwitch = performance.now(); // 재시작 직후 즉각 전환 방지

    function loop(ts) {
      if (ts - lastSwitch >= FRAME_INTERVAL) {
        const sprite      = SPRITES[stageIdx];
        const breathCount = sprite ? Math.min(sprite.frames.length, 2) : 1;
        frameIdx   = (frameIdx + 1) % breathCount;
        lastSwitch = ts;
        render();
      }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  // ── TASK-03-2: visibilitychange — 탭 비활성 시 루프 중단 ─────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopLoop(); } else { startLoop(); }
  });

  // ── TASK-04-1/2/3: XP 획득 토스트 ─────────────────────────────────────────
  const toastEl     = document.getElementById('toast');
  let toastAccum    = 0;  // TASK-04-3: 누적 XP
  let toastSource   = '';
  let toastHideTimer = null;
  let toastResetTimer = null;

  function showToast(amount, source) {
    // TASK-04-3: 진행 중 타이머 리셋 후 누적
    if (toastHideTimer !== null)  { clearTimeout(toastHideTimer);  toastHideTimer  = null; }
    if (toastResetTimer !== null) { clearTimeout(toastResetTimer); toastResetTimer = null; }
    toastAccum += amount;
    toastSource = source;

    toastEl.style.transition = 'none';
    toastEl.style.transform  = 'translateY(0)';
    toastEl.style.opacity    = '1';
    toastEl.textContent      = `+${toastAccum} XP (${toastSource})`;

    // 0.8초 표시 후 위로 사라짐
    toastHideTimer = setTimeout(() => {
      toastEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      toastEl.style.opacity    = '0';
      toastEl.style.transform  = 'translateY(-12px)';
      toastHideTimer = null;
      // 전환 완료 후 누적값 리셋
      toastResetTimer = setTimeout(() => {
        toastAccum      = 0;
        toastResetTimer = null;
      }, 350);
    }, 800);
  }

  // ── TASK-08-2: 부화 연출 ────────────────────────────────────────────────
  // Phase 1) 알 흔들림 3사이클 (frame 0↔1, 200ms 간격)
  // Phase 2) 흰색 오버레이 페이드인 400ms (알 위에)
  // Phase 3) stage 1로 전환 후 페이드아웃 400ms → startLoop()
  function hatch() {
    stopLoop();
    stageIdx = 0;
    frameIdx = 0;
    render();

    const WOBBLE_MS = 200;
    const FLASH_MS  = 400;

    let wobbles = 0;
    function nextWobble() {
      frameIdx = 1 - frameIdx;
      render();
      wobbles++;
      if (wobbles < 6) { setTimeout(nextWobble, WOBBLE_MS); }
      else              { flashIn(); }
    }
    setTimeout(nextWobble, WOBBLE_MS);

    function flashIn() {
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / FLASH_MS, 1);
        render();
        ctx.fillStyle = `rgba(255,255,255,${t})`;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        if (t < 1) { animId = requestAnimationFrame(tick); }
        else        { animId = null; stageIdx = 1; frameIdx = 0; flashOut(); }
      }
      animId = requestAnimationFrame(tick);
    }

    function flashOut() {
      const start = performance.now();
      function tick(now) {
        const t     = Math.min((now - start) / FLASH_MS, 1);
        const alpha = 1 - t;
        render();
        if (alpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }
        if (t < 1) { animId = requestAnimationFrame(tick); }
        else        { animId = null; render(); startLoop(); }
      }
      animId = requestAnimationFrame(tick);
    }
  }

  // ── STATE_UPDATE / XP_GAIN / HATCH 메시지 핸들러 ──────────────────────
  window.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case 'STATE_UPDATE': {
        const newStage = data.monster?.evolutionStage ?? stageIdx;
        if (newStage !== stageIdx) {
          stageIdx = newStage;
          frameIdx = 0;
        }
        render();
        break;
      }
      case 'XP_GAIN': {
        showToast(data.amount, data.source);
        break;
      }
      case 'HATCH': {
        hatch();
        break;
      }
    }
  });

  // ── 초기화 ───────────────────────────────────────────────────────────────
  render();
  startLoop();

})();

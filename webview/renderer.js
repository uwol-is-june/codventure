'use strict';
// webview 컨텍스트에서 실행. SPRITES, STAGE 는 index.html 인라인 스크립트에서 주입.
(function () {

  // ── 스테이지별 픽셀 배율 ────────────────────────────────────────────────
  // GROUND_Y=96 기준. 각 스테이지 논리 크기(px) × scale ≤ 96 이 되어야 함.
  // stage 0 (egg 16px): ×4=64  stage 1 (baby 16px): ×5=80
  // stage 2 (16px): ×5=80      stage 3 (rookie 24px): ×4=96
  // stage 4 (32px): ×3=96      stage 5 (40px): ×2=80   stage 6 (48px): ×2=96
  const STAGE_SCALE    = { 0: 4, 1: 5, 2: 5, 3: 4, 4: 3, 5: 2, 6: 2 };
  const CANVAS_SIZE    = 128;
  const GROUND_Y       = 96;   // 지면(풀밭 상단) y 좌표
  const FRAME_INTERVAL = 800;

  // ── DOM ─────────────────────────────────────────────────────────────────
  const canvas = document.getElementById('c');
  const ctx    = canvas.getContext('2d');

  // ── 상태 ────────────────────────────────────────────────────────────────
  let stageIdx = (typeof STAGE !== 'undefined') ? STAGE : 1;
  let frameIdx = 0;
  let animId   = null;

  // ── 배경: 언덕 높이맵 사전 계산 ──────────────────────────────────────────
  // 각 x 열이 GROUND_Y로부터 위로 몇 픽셀 솟았는지. 코사인 프로파일.
  const HILL_MAP = (function () {
    const map   = new Array(CANVAS_SIZE).fill(0);
    const hills = [
      [24,  20, 36],  // [중심x, 최고높이px, 반폭px]
      [80,  14, 28],
      [112, 18, 30],
    ];
    for (const [cx, peakH, hw] of hills) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const dx = Math.abs(x - cx);
        if (dx < hw) {
          const h = Math.round(peakH * Math.cos((dx / hw) * (Math.PI / 2)));
          if (h > map[x]) map[x] = h;
        }
      }
    }
    return map;
  }());

  // ── 배경 렌더링 ───────────────────────────────────────────────────────────
  function drawBackground() {
    // 하늘
    ctx.fillStyle = '#5BA8D4';
    ctx.fillRect(0, 0, CANVAS_SIZE, GROUND_Y);

    // 구름 (흰 직사각형 조합)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(7,  15, 13, 3);  ctx.fillRect(10, 12,  8, 3);
    ctx.fillRect(84,  9, 17, 3);  ctx.fillRect(88,  6, 10, 3);

    // 먼 언덕 실루엣
    ctx.fillStyle = '#4A8040';
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const h = HILL_MAP[x];
      if (h > 0) ctx.fillRect(x, GROUND_Y - h, 1, h);
    }

    // 지면 — 풀밭 (3단 색상으로 깊이감)
    ctx.fillStyle = '#52C452';
    ctx.fillRect(0, GROUND_Y,     CANVAS_SIZE, 3);
    ctx.fillStyle = '#3DAA3D';
    ctx.fillRect(0, GROUND_Y + 3, CANVAS_SIZE, 3);
    ctx.fillStyle = '#2E8E2E';
    ctx.fillRect(0, GROUND_Y + 6, CANVAS_SIZE, 3);

    // 지면 — 흙
    ctx.fillStyle = '#8B5E32';
    ctx.fillRect(0, GROUND_Y +  9, CANVAS_SIZE, 7);
    ctx.fillStyle = '#6B4228';
    ctx.fillRect(0, GROUND_Y + 16, CANVAS_SIZE, CANVAS_SIZE - GROUND_Y - 16);

    // 풀 터럭 (지면 경계선 위, 6px 간격)
    ctx.fillStyle = '#70DE70';
    for (let x = 3; x < CANVAS_SIZE; x += 6) {
      ctx.fillRect(x,     GROUND_Y - 4, 1, 4);
      ctx.fillRect(x - 2, GROUND_Y - 2, 1, 2);
      ctx.fillRect(x + 2, GROUND_Y - 2, 1, 2);
    }
  }

  // ── drawSprite ────────────────────────────────────────────────────────────
  // clearRect 없음 — render() 에서 일괄 처리
  function drawSprite(frames, palette, fi, x, y, scale) {
    const frame = frames[fi];
    const size  = frame.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ci = frame[r][c];
        if (ci === 0) continue;
        ctx.fillStyle = palette[ci];
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }

  // ── render ───────────────────────────────────────────────────────────────
  // 순서: clearRect → 배경 → 스프라이트 (전경)
  // 스프라이트 x: 수평 중앙. 스프라이트 y: GROUND_Y 위에 착지.
  function render() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawBackground();
    const sprite = SPRITES[stageIdx];
    if (!sprite) return;
    const scale   = STAGE_SCALE[stageIdx] ?? 4;
    const size    = sprite.frames[0].length;
    const spriteX = Math.floor((CANVAS_SIZE - size * scale) / 2);
    const spriteY = GROUND_Y - size * scale;
    drawSprite(sprite.frames, sprite.palette, frameIdx, spriteX, spriteY, scale);
  }

  // ── rAF 루프 (숨쉬기 애니메이션) ─────────────────────────────────────────
  function startLoop() {
    if (animId !== null) cancelAnimationFrame(animId);
    let lastSwitch = performance.now();

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

  // 탭 비활성 시 루프 중단
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopLoop(); } else { startLoop(); }
  });

  // ── XP 토스트 ─────────────────────────────────────────────────────────────
  const toastEl       = document.getElementById('toast');
  let toastAccum      = 0;
  let toastSource     = '';
  let toastHideTimer  = null;
  let toastResetTimer = null;

  function showToast(amount, source) {
    if (toastHideTimer  !== null) { clearTimeout(toastHideTimer);  toastHideTimer  = null; }
    if (toastResetTimer !== null) { clearTimeout(toastResetTimer); toastResetTimer = null; }
    toastAccum += amount;
    toastSource = source;

    toastEl.style.transition = 'none';
    toastEl.style.transform  = 'translateY(0)';
    toastEl.style.opacity    = '1';
    toastEl.textContent      = `+${toastAccum} XP (${toastSource})`;

    toastHideTimer = setTimeout(() => {
      toastEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      toastEl.style.opacity    = '0';
      toastEl.style.transform  = 'translateY(-12px)';
      toastHideTimer = null;
      toastResetTimer = setTimeout(() => {
        toastAccum      = 0;
        toastResetTimer = null;
      }, 350);
    }, 800);
  }

  // ── 부화 연출 ────────────────────────────────────────────────────────────
  // Phase 1) 알 흔들림 6회 (frame 0↔1, 200ms 간격)
  // Phase 2) 흰색 페이드인 400ms → stage 1 전환 → 페이드아웃 400ms → startLoop()
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

  // ── 메시지 핸들러 ─────────────────────────────────────────────────────────
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

}());

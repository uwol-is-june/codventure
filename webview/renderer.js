'use strict';
// webview 컨텍스트에서 실행. SPRITES, STAGE, ASSETS 는 index.html 인라인 스크립트에서 주입.
(function () {

  // ── 상수 ────────────────────────────────────────────────────────────────────
  const STAGE_SCALE        = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
  const CANVAS_SIZE        = 256;
  const TILE_SIZE          = 16;
  const MAP_W              = 16;
  const MAP_H              = 16;
  const T = { GRASS:0, DARK:1, PATH:2, TREE:3, FLOWER_Y:4, FLOWER_R:5, FLOWER_P:6 };
  const FRAME_INTERVAL     = 800;
  const EGG_WOBBLE_STEP_MS = 120;
  const EGG_WOBBLE_IDLE_MS = 3000;
  const EGG_WOBBLE_SEQ     = [1, 2, 1, 0, 4, 0];

  // ── DOM ──────────────────────────────────────────────────────────────────────
  const canvas = document.getElementById('c');
  canvas.width  = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ── SV 이미지 프리로드 ────────────────────────────────────────────────────────
  const IMG = {};
  let imgReady = false;

  function loadImages(callback) {
    if (typeof ASSETS === 'undefined') { callback(); return; }
    const keys = Object.keys(ASSETS);
    let loaded = 0;
    keys.forEach(key => {
      const img   = new Image();
      img.onload  = () => { loaded++; if (loaded === keys.length) { imgReady = true; callback(); } };
      img.onerror = () => { loaded++; if (loaded === keys.length) { imgReady = true; callback(); } };
      img.src     = ASSETS[key];
      IMG[key]    = img;
    });
    if (keys.length === 0) { imgReady = true; callback(); }
  }

  // ── HUD 상수 ─────────────────────────────────────────────────────────────────
  const STAGE_NAMES = ['알', '유아기', '유아기II', '성장기', '성숙기', '완전체', '궁극체'];
  const HUD_H = 30;
  const HUD_Y = CANVAS_SIZE - HUD_H;

  // ── 상태 ─────────────────────────────────────────────────────────────────────
  let stageIdx = (typeof STAGE     !== 'undefined') ? STAGE              : 1;
  let hudLevel = (typeof HUD_STATE !== 'undefined') ? HUD_STATE.level    : 0;
  let hudXp    = (typeof HUD_STATE !== 'undefined') ? HUD_STATE.xp       : 0;
  let hudXpMax = (typeof HUD_STATE !== 'undefined') ? HUD_STATE.xpMax    : 50;
  let isSad    = (typeof HUD_STATE !== 'undefined') ? (HUD_STATE.isSad ?? false) : false;
  let frameIdx = 0;
  let animId   = null;
  let charTile = { x: 6, y: 8 };

  // ── 타일 맵 (16×16) ──────────────────────────────────────────────────────────
  const R = T.FLOWER_R, Y = T.FLOWER_Y, P = T.FLOWER_P;
  const G = T.GRASS, D = T.DARK, TR = T.TREE;
  // 불규칙한 나무 경계 — 모서리가 안쪽으로 파고들어 자연스러운 숲 느낌
  let tileMap = [
    [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
    [TR, TR, TR,  D,  D,  D,  D,  D,  D,  D,  D,  D,  D, TR, TR, TR],
    [TR, TR,  D,  G,  G,  G,  G,  G,  G,  G,  G,  G,  G,  D, TR, TR],
    [TR,  D,  G,  G,  G,  Y,  Y,  G,  G,  G,  G,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  Y,  G,  G,  G,  G,  G,  G,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  G,  G,  G,  R,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  G,  G,  R,  R,  G,  G, TR, TR, TR],
    [TR,  D,  G,  G,  G,  D,  G,  G,  G,  G,  G,  G,  G,  G,  D, TR],
    [TR, TR,  G,  G,  D,  D,  G,  G,  G,  G,  G,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  D,  G,  G,  G,  G,  G,  G,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  G,  G,  G,  G,  D,  D,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  G,  G,  G,  G,  D,  G,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  P,  P,  G,  G,  G,  G,  G,  D, TR],
    [TR,  D,  G,  G,  G,  G,  G,  G,  P,  G,  G,  G,  G,  G,  D, TR],
    [TR, TR,  D,  D,  D,  D,  D,  D, TR,  D,  D,  D,  D, TR, TR, TR],
    [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
  ];

  // ── 데코레이션 오브젝트 ──────────────────────────────────────────────────────
  // key: "col,row" (tx,ty), sh>16 이면 아래 정렬 (SV 스타일)
  const DECORS = {
    '7,5':  { well: true },                              // 우물 (픽셀 아트)
    '8,5':  { sx:656, sy:464, sw:16, sh:16 },           // 물그릇
    '4,3':  { sx:624, sy:416, sw:16, sh:48 },           // 새집
    '3,10': { sx:592, sy:160, sw:16, sh:32 },           // 나무통
    '13,10':{ sx:384, sy: 32, sw:16, sh:32 },           // 그루터기
    '12,13':{ sx:  0, sy:880, sw:16, sh:16 },           // 주니모 인형
  };

  // ── 타일 렌더러 ───────────────────────────────────────────────────────────────
  // decoration.png HOUSE_PLANTS: y=688, 16×32 스프라이트
  // 상단 16×16 = 잎/꽃 canopy 부분
  const PLANT_SRC = {
    [T.FLOWER_Y]: { x:  64, y: 688 },  // HOUSE_PLANT_9
    [T.FLOWER_R]: { x: 128, y: 688 },  // HOUSE_PLANT_11
    [T.FLOWER_P]: { x: 192, y: 688 },  // HOUSE_PLANT_5
  };

  function drawTile(tx, ty, type) {
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    const S  = TILE_SIZE;

    // ── 베이스 텍스처 ──────────────────────────────────────────────────────────
    const baseImg = (() => {
      switch (type) {
        case T.DARK:   return imgReady ? IMG.dirt      : null;
        case T.PATH:   return imgReady ? IMG.sand      : null;
        case T.TREE:   return imgReady ? IMG.grassFall : null;
        default:       return imgReady ? IMG.grass     : null;
      }
    })();

    if (baseImg) {
      ctx.drawImage(baseImg, tx * 16, ty * 16, 16, 16, px, py, 16, 16);
    } else {
      // fallback 단색
      const colors = { [T.DARK]:'#4AAC28', [T.PATH]:'#C4A050', [T.TREE]:'#B87A30', default:'#5CBF36' };
      ctx.fillStyle = colors[type] ?? colors.default;
      ctx.fillRect(px, py, S, S);
    }

    // ── 타입별 오버레이 ────────────────────────────────────────────────────────
    switch (type) {
      case T.TREE: {
        if (imgReady && IMG.decoration) {
          // 위치 기반으로 요소 선택 → 자연스러운 숲 경계
          const v = (tx * 3 + ty * 7) % 8;
          if (v === 0) {
            // 그루터기 상단 (STUMP_SEAT 위쪽 16px)
            ctx.drawImage(IMG.decoration, 384, 32, 16, 16, px, py, 16, 16);
          } else if (v === 1) {
            // 식물 A (HOUSE_PLANT_3 — 넓은 잎)
            ctx.drawImage(IMG.decoration, 160, 688, 16, 16, px, py, 16, 16);
          } else if (v === 2) {
            // 식물 B (HOUSE_PLANT_7 — 다른 형태)
            ctx.drawImage(IMG.decoration, 224, 688, 16, 16, px, py, 16, 16);
          } else if (v === 3) {
            // 식물 C (HOUSE_PLANT_11)
            ctx.drawImage(IMG.decoration, 128, 688, 16, 16, px, py, 16, 16);
          }
          // v 4~7: 아무것도 없음 (grassFall 배경만)
        } else {
          const cx = px + 8, cy = py + 8;
          ctx.fillStyle = '#2A5C14';
          ctx.fillRect(cx-5, cy+1, 10, 6);
          ctx.fillRect(cx-3, cy-3, 6,  4);
          ctx.fillStyle = '#3E8428';
          ctx.fillRect(cx-4, cy,   8,  5);
          ctx.fillRect(cx-2, cy-4, 4,  4);
          ctx.fillStyle = '#58A82E';
          ctx.fillRect(cx-3, cy-3, 5,  4);
          ctx.fillStyle = '#72C040';
          ctx.fillRect(cx-2, cy-2, 2,  2);
          ctx.fillStyle = '#7C4818';
          ctx.fillRect(cx-1, cy+6, 2,  2);
        }
        break;
      }

      case T.FLOWER_Y:
      case T.FLOWER_R:
      case T.FLOWER_P: {
        const ps = PLANT_SRC[type];
        if (imgReady && IMG.decoration) {
          ctx.drawImage(IMG.decoration, ps.x, ps.y, 16, 16, px, py, 16, 16);
        } else {
          const c = type === T.FLOWER_Y ? '#FFE040' : type === T.FLOWER_R ? '#FF6868' : '#CC55EE';
          ctx.fillStyle = c;
          ctx.fillRect(px+7, py+7, 2, 2);
        }
        break;
      }

      // GRASS, DARK, PATH, SNOW: 베이스만으로 충분
    }
  }

  // ── 우물 픽셀 아트 (16×16 탑뷰) ─────────────────────────────────────────────
  function drawWell(px, py) {
    ctx.fillStyle = '#A89878'; ctx.fillRect(px+2,  py+4,  12, 8);  // 돌 본체
    ctx.fillStyle = '#786858'; ctx.fillRect(px+2,  py+10, 12, 2);  // 돌 하단 그림자
    ctx.fillStyle = '#C8B898'; ctx.fillRect(px+3,  py+4,   2, 2);  // 돌 하이라이트
    ctx.fillStyle = '#131825'; ctx.fillRect(px+4,  py+5,   8, 6);  // 어두운 구멍
    ctx.fillStyle = '#1E2EA8'; ctx.fillRect(px+5,  py+7,   3, 1);  // 물 반사
    ctx.fillStyle = '#C8AA70'; ctx.fillRect(px+2,  py+2,  12, 3);  // 나무 프레임
    ctx.fillStyle = '#6A4820'; ctx.fillRect(px+7,  py+0,   2, 5);  // 세로 기둥
    ctx.fillStyle = '#9A6830'; ctx.fillRect(px+8,  py+0,   1, 5);  // 기둥 하이라이트
  }

  // ── 데코레이션 오버레이 ───────────────────────────────────────────────────────
  function drawDecors() {
    for (const key of Object.keys(DECORS)) {
      const [tx, ty] = key.split(',').map(Number);
      const px = tx * TILE_SIZE;
      const py = ty * TILE_SIZE;
      const d  = DECORS[key];
      if (d.well) {
        drawWell(px, py);
      } else if (imgReady && IMG.decoration) {
        const { sx, sy, sw, sh } = d;
        // sh > TILE_SIZE 이면 아래 정렬 (기둥이 타일 바닥에 닿도록)
        ctx.drawImage(IMG.decoration, sx, sy, sw, sh,
                      px, py - (sh - TILE_SIZE), sw, sh);
      }
    }
  }

  // ── 배경: 타일맵 전체 렌더링 ──────────────────────────────────────────────────
  function drawBackground() {
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        drawTile(tx, ty, tileMap[ty][tx]);
      }
    }
    drawDecors();
    // 캐릭터 발그림자
    const sx = charTile.x * TILE_SIZE + 4;
    const sy = charTile.y * TILE_SIZE + TILE_SIZE - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx, sy, 8, 2);
  }

  // ── drawSprite ────────────────────────────────────────────────────────────────
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

  // ── drawSadOverlay (TASK-10.2) ────────────────────────────────────────────────
  // 눈물 픽셀을 스프라이트 위에 별도 레이어로 오버레이
  function drawSadOverlay(spriteX, spriteY, pixelSize, scale) {
    const TEAR_A = 'rgba(100,180,255,0.90)';  // 눈물 본체
    const TEAR_B = 'rgba(210,235,255,0.55)';  // 상단 하이라이트

    const eyeRow = Math.max(1, Math.floor(pixelSize * 0.32));
    const lCol   = Math.max(1, Math.floor(pixelSize * 0.28));
    const rCol   = Math.min(pixelSize - 2, Math.floor(pixelSize * 0.65));

    // 프레임마다 눈물이 한 픽셀씩 흘러내리는 애니메이션
    const drip = (frameIdx % 2 === 1) ? scale : 0;

    function drawTear(col, row) {
      const tx = spriteX + col * scale;
      const ty = spriteY + (row + 1) * scale + drip;
      ctx.fillStyle = TEAR_B;
      ctx.fillRect(tx, ty,         scale, scale);
      ctx.fillStyle = TEAR_A;
      ctx.fillRect(tx, ty + scale, scale, scale);
    }

    drawTear(lCol, eyeRow);
    if (pixelSize >= 8) drawTear(rCol, eyeRow);
  }

  // ── drawHud ───────────────────────────────────────────────────────────────────
  function drawHud() {
    // 반투명 배경
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, HUD_Y, CANVAS_SIZE, HUD_H);

    const fg = getComputedStyle(document.documentElement)
                 .getPropertyValue('--vscode-foreground').trim() || '#CCCCCC';

    // 레벨·단계명 텍스트
    ctx.font = 'bold 9px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = fg;
    ctx.fillText(`LV.${hudLevel}  ${STAGE_NAMES[stageIdx] ?? '???'}`, 5, HUD_Y + 4);

    // 진화 단계 점 (알~완전체 6단계)
    const DOT = 4;
    const GAP = 3;
    const N   = 6;
    let dx = CANVAS_SIZE - 5 - N * DOT - (N - 1) * GAP;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = stageIdx > i  ? '#FFD700'
                    : stageIdx === i ? '#FFFFFF'
                    : 'rgba(255,255,255,0.20)';
      ctx.fillRect(dx, HUD_Y + 6, DOT, DOT);
      dx += DOT + GAP;
    }

    // XP 바
    const barX  = 5;
    const barY  = HUD_Y + 19;
    const barW  = CANVAS_SIZE - 10;
    const barH  = 7;
    const ratio = hudXpMax > 0 ? Math.min(hudXp / hudXpMax, 1) : 0;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(barX, barY, barW, barH);

    if (ratio > 0) {
      ctx.fillStyle = ratio < 0.5 ? '#22CC44'
                    : ratio < 0.8 ? '#CCCC22'
                    : '#CC4422';
      ctx.fillRect(barX, barY, Math.max(1, Math.round(barW * ratio)), barH);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawBackground();
    const sprite = SPRITES[stageIdx];
    if (sprite) {
      const scale   = STAGE_SCALE[stageIdx] ?? 1;
      const size    = sprite.frames[0].length;
      const sw      = size * scale;
      const spriteX = charTile.x * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2);
      const spriteY = charTile.y * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2);
      drawSprite(sprite.frames, sprite.palette, frameIdx, spriteX, spriteY, scale);
      if (isSad && stageIdx > 0) drawSadOverlay(spriteX, spriteY, size, scale);
    }
    drawHud();
  }

  // ── 알 오뚜기 흔들림 ──────────────────────────────────────────────────────────
  let eggWobbleTimer = null;

  function stopEggWobble() {
    if (eggWobbleTimer !== null) { clearTimeout(eggWobbleTimer); eggWobbleTimer = null; }
  }

  function scheduleEggWobble() {
    stopEggWobble();
    eggWobbleTimer = setTimeout(runEggWobble, EGG_WOBBLE_IDLE_MS);
  }

  function runEggWobble() {
    eggWobbleTimer = null;
    if (stageIdx !== 0) return;
    let i = 0;
    function step() {
      if (stageIdx !== 0) return;
      frameIdx = EGG_WOBBLE_SEQ[i++];
      render();
      if (i < EGG_WOBBLE_SEQ.length) {
        eggWobbleTimer = setTimeout(step, EGG_WOBBLE_STEP_MS);
      } else {
        scheduleEggWobble();
      }
    }
    step();
  }

  // ── rAF 루프 ──────────────────────────────────────────────────────────────────
  function startLoop() {
    if (animId !== null) cancelAnimationFrame(animId);
    stopEggWobble();
    frameIdx = 0;

    if (stageIdx === 0) scheduleEggWobble();

    let lastSwitch = performance.now();
    function loop(ts) {
      if (stageIdx !== 0 && ts - lastSwitch >= FRAME_INTERVAL) {
        const sprite     = SPRITES[stageIdx];
        const frameCount = sprite ? Math.min(sprite.frames.length, 2) : 1;
        frameIdx   = (frameIdx + 1) % frameCount;
        lastSwitch = ts;
      }
      render();
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
    stopEggWobble();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopLoop(); } else { startLoop(); }
  });

  // ── XP 토스트 ─────────────────────────────────────────────────────────────────
  const toastEl       = document.getElementById('toast');
  let toastAccum      = 0;
  let toastSource     = '';
  let toastHideTimer  = null;
  let toastResetTimer = null;

  function showToast(amount, source) {
    if (cutscenePlaying) return;
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

  // ── 컷씬 플래그 (진화/레벨업 연출 중 XP 토스트 억제) ─────────────────────────────
  let cutscenePlaying = false;

  // ── 별 파티클 그리기 ──────────────────────────────────────────────────────────
  function drawStar(cx, cy, r) {
    ctx.fillRect(cx - r, cy, 2 * r + 1, 1);
    ctx.fillRect(cx, cy - r, 1, 2 * r + 1);
  }

  // ── 레벨업 파티클 연출 (TASK-6.2) ────────────────────────────────────────────
  // onDone: 연출 종료 후 콜백 (없으면 startLoop 호출)
  function playLevelUp(onDone) {
    stopLoop();
    cutscenePlaying = true;
    const DURATION = 1500;
    const start    = performance.now();

    const particles = Array.from({ length: 8 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 8,
      color: i % 2 === 0 ? '#FFD700' : '#FFFFFF',
    }));

    function tick(now) {
      const elapsed = now - start;
      const t       = Math.min(elapsed / DURATION, 1);

      // 0.3s마다 Y축 -4px 바운스 × 3회
      const bouncePhase    = elapsed / 300;
      const bounceIdx      = Math.floor(bouncePhase);
      const bounceFraction = bouncePhase - bounceIdx;
      const bounceY        = bounceIdx < 3 ? Math.round(-4 * Math.sin(bounceFraction * Math.PI)) : 0;

      const radius = t * 24;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawBackground();

      const sprite = SPRITES[stageIdx];
      if (sprite) {
        const scale   = STAGE_SCALE[stageIdx] ?? 1;
        const size    = sprite.frames[0].length;
        const sw      = size * scale;
        const spriteX = charTile.x * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2);
        const spriteY = charTile.y * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2) + bounceY;
        drawSprite(sprite.frames, sprite.palette, 0, spriteX, spriteY, scale);
      }

      // 별 파티클
      const cx    = charTile.x * TILE_SIZE + TILE_SIZE / 2;
      const cy    = charTile.y * TILE_SIZE + TILE_SIZE / 2;
      const alpha = Math.max(0, 1 - t * 1.5);
      ctx.globalAlpha = alpha;
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        drawStar(Math.round(cx + Math.cos(p.angle) * radius),
                 Math.round(cy + Math.sin(p.angle) * radius), 2);
      });
      ctx.globalAlpha = 1;

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        animId = null;
        cutscenePlaying = false;
        if (onDone) onDone(); else startLoop();
      }
    }

    animId = requestAnimationFrame(tick);
  }

  // ── 진화 전환 연출 (TASK-6.3) ────────────────────────────────────────────────
  // 1단계 0.5s: 흰빛 감싸기 → 2단계 1.0s: 스프라이트 교체 → 3단계 0.5s: 빛 걷히기 + 파티클
  function playEvolve(newStage) {
    stopLoop();
    cutscenePlaying = true;
    const P1 = 500, P2 = 1500, P3 = 2000;
    const start = performance.now();

    function spriteDims(idx) {
      const sp = SPRITES[idx];
      if (!sp) return null;
      const scale = STAGE_SCALE[idx] ?? 1;
      const size  = sp.frames[0].length;
      const sw    = size * scale;
      return { sp, scale,
        sx: charTile.x * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2),
        sy: charTile.y * TILE_SIZE + Math.floor((TILE_SIZE - sw) / 2),
      };
    }

    function tick(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawBackground();

      if (elapsed < P1) {
        // 1단계: 흰빛이 몬스터를 감싸며 실루엣만 남음
        const t = elapsed / P1;
        const d = spriteDims(stageIdx);
        if (d) drawSprite(d.sp.frames, d.sp.palette, 0, d.sx, d.sy, d.scale);
        ctx.fillStyle = `rgba(255,255,255,${t})`;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      } else if (elapsed < P2) {
        // 2단계: 새 스프라이트로 교체 (흰 화면 유지)
        if (stageIdx !== newStage) { stageIdx = newStage; frameIdx = 0; }
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      } else if (elapsed < P3) {
        // 3단계: 빛이 걷히며 등장
        if (stageIdx !== newStage) { stageIdx = newStage; frameIdx = 0; }
        const t = (elapsed - P2) / (P3 - P2);
        const d = spriteDims(stageIdx);
        if (d) drawSprite(d.sp.frames, d.sp.palette, 0, d.sx, d.sy, d.scale);
        ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      if (elapsed < P3) {
        animId = requestAnimationFrame(tick);
      } else {
        animId = null;
        // 3단계 종료 후 레벨업 파티클 → 대기 애니메이션
        playLevelUp(() => startLoop());
      }
    }

    animId = requestAnimationFrame(tick);
  }

  // ── 부화 연출 ─────────────────────────────────────────────────────────────────
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

  // ── 사운드 시스템 (TASK-10.4) ────────────────────────────────────────────────
  let soundEnabled = (typeof SOUND_ENABLED !== 'undefined') ? SOUND_ENABLED : false;
  let _audioCtx = null;

  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
    return _audioCtx;
  }

  function playNote(freq, when, dur, vol = 0.25) {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, when);
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(vol, when + 0.005);
      env.gain.setValueAtTime(vol, when + dur - 0.015);
      env.gain.linearRampToValueAtTime(0, when + dur);
      osc.connect(env);
      env.connect(ac.destination);
      osc.start(when);
      osc.stop(when + dur);
    } catch (e) {}
  }

  // XP 획득: 단음 '딩' (A5 880Hz, 80ms)
  function playDing() {
    if (!soundEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    playNote(880, ac.currentTime, 0.08, 0.18);
  }

  // 레벨업: 상승 4음 아르페지오 (C5→E5→G5→C6)
  function playLevelUpArpeggio() {
    if (!soundEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    const t = ac.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => playNote(f, t + i * 0.13, 0.18, 0.28));
  }

  // 진화/부화: 팡파르 8음 (G4→C5→E5→G5→C6→G5→A5→C6)
  function playEvolveFanfare() {
    if (!soundEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    const t = ac.currentTime;
    [392, 523, 659, 784, 1047, 784, 880, 1047].forEach((f, i) => playNote(f, t + i * 0.1, 0.14, 0.28));
  }

  // ── 메시지 핸들러 ─────────────────────────────────────────────────────────────
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
        if (data.level  !== undefined) hudLevel = data.level;
        if (data.xp     !== undefined) hudXp    = data.xp;
        if (data.xpMax  !== undefined) hudXpMax = data.xpMax;
        isSad = false;  // XP 획득 즉시 슬픈 표정 해제
        showToast(data.amount, data.source);
        playDing();
        break;
      }
      case 'SAD_STATE': {
        isSad = data.isSad ?? false;
        break;
      }
      case 'HATCH': {
        playEvolveFanfare();
        hatch();
        break;
      }
      case 'LEVEL_UP': {
        if (data.newLevel !== undefined) hudLevel = data.newLevel;
        if (data.xp       !== undefined) hudXp    = data.xp;
        if (data.xpMax    !== undefined) hudXpMax = data.xpMax;
        playLevelUpArpeggio();
        playLevelUp();
        break;
      }
      case 'EVOLVE': {
        if (data.newLevel !== undefined) hudLevel = data.newLevel;
        if (data.xp       !== undefined) hudXp    = data.xp;
        if (data.xpMax    !== undefined) hudXpMax = data.xpMax;
        playEvolveFanfare();
        playEvolve(data.newStage);
        break;
      }
      case 'SOUND_ENABLED': {
        soundEnabled = data.enabled ?? false;
        break;
      }
    }
  });

  // ── 방향키 이동 ───────────────────────────────────────────────────────────────
  const MOVE_DIR = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
  document.addEventListener('keydown', (e) => {
    const d = MOVE_DIR[e.key];
    if (!d) return;
    const nx = charTile.x + d[0];
    const ny = charTile.y + d[1];
    if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H &&
        tileMap[ny][nx] !== T.TREE) {
      charTile.x = nx;
      charTile.y = ny;
      render();
    }
  });

  // ── 초기화 ────────────────────────────────────────────────────────────────────
  loadImages(() => { render(); startLoop(); });

}());

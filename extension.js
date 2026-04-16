'use strict';
const vscode = require('vscode');

let panel = null;

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  // ── 상태바 (왼쪽, 애니메이션) ──────────────────────────────────────
  const sb = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -999);
  sb.command = 'pixelCat.show';
  sb.tooltip  = 'Click to visit your cat!';
  sb.text     = '=^･ω･^=';
  sb.show();
  context.subscriptions.push(sb);

  const sbFrames = ['=^･ω･^=', '=^♥♥^= ', '=^･ω･^=', '=^･ー･^='];
  let sbi = 0;
  const sbTimer = setInterval(() => {
    sb.text = sbFrames[sbi++ % sbFrames.length];
  }, 700);
  context.subscriptions.push({ dispose: () => clearInterval(sbTimer) });

  // ── 커맨드 ────────────────────────────────────────────────────────
  const open = () => openPanel(context);
  const send = (type) => {
    open();
    setTimeout(() => panel?.webview.postMessage({ type }), 150);
    // globalState에 상태 저장
    context.globalState.update('catState', type);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('pixelCat.show',  open),
    vscode.commands.registerCommand('pixelCat.food',  () => send('food')),
    vscode.commands.registerCommand('pixelCat.pet',   () => send('pet')),
    vscode.commands.registerCommand('pixelCat.sleep', () => send('sleep')),
  );
}

/** @param {vscode.ExtensionContext} context */
function openPanel(context) {
  if (panel) { panel.reveal(); return; }

  panel = vscode.window.createWebviewPanel(
    'pixelCat', '🐱 Nabi',
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getHTML();
  panel.onDidDispose(() => { panel = null; }, null, context.subscriptions);
  panel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'meow') vscode.window.showInformationMessage('🐱 Nyaa~!');
  }, null, context.subscriptions);
}

// ─────────────────────────────────────────────────────────────────
//  WEBVIEW HTML
// ─────────────────────────────────────────────────────────────────
function getHTML() {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#0d1117; overflow:hidden; }

body {
  display:flex; flex-direction:column;
  font-family: 'Courier New', monospace;
}

#topbar {
  padding: 10px 14px;
  color: #444;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e2530;
  flex-shrink: 0;
}
#catname { color: #e8942a; font-size: 13px; letter-spacing: 1px; }
#mood-label {
  color: #555;
  font-size: 11px;
  min-width: 80px;
  text-align: right;
  transition: color 0.4s;
}

#scene {
  flex: 1;
  position: relative;
  overflow: hidden;
}
canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  image-rendering: pixelated;
}

#btnbar {
  padding: 10px 14px;
  display: flex;
  gap: 8px;
  border-top: 1px solid #1e2530;
  background: #0d1117;
  flex-shrink: 0;
}
button {
  background: #161b22;
  color: #8b949e;
  border: 1px solid #2a3040;
  padding: 5px 14px;
  cursor: pointer;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}
button:hover { background:#21262d; color:#e8942a; border-color:#e8942a; }
button:active { transform: scale(0.95); }
#hint { color:#333; font-size:10px; margin-left:auto; align-self:center; }
</style>
</head>
<body>

<div id="topbar">
  <div id="catname">Nabi</div>
  <div id="mood-label">idle</div>
</div>

<div id="scene">
  <canvas id="c"></canvas>
</div>

<div id="btnbar">
  <button onclick="feed()">🐟 /food</button>
  <button onclick="pet()">🤚 /pet</button>
  <button onclick="goSleep()">💤 /sleep</button>
  <span id="hint">or use Cmd+Shift+P → Pixel Cat</span>
</div>

<script>
const vscode = acquireVsCodeApi();

// ── 캔버스 세팅 ──────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const moodEl = document.getElementById('mood-label');

let W = 0, H = 0;
function resize() {
  const s = document.getElementById('scene');
  W = canvas.width  = s.clientWidth;
  H = canvas.height = s.clientHeight;
}
resize();
window.addEventListener('resize', () => { resize(); });

// ── 픽셀아트 헬퍼 ────────────────────────────────────────────────
const PX = 4; // 1 스프라이트 픽셀 = 화면 4px

function px(cx, cy, color) {
  if (!color || color === 'none') return;
  ctx.fillStyle = color;
  ctx.fillRect(cx * PX, cy * PX, PX, PX);
}
function row(r, c1, c2, color) {
  for (let c = c1; c <= c2; c++) px(c, r, color);
}
function rect(c1, r1, c2, r2, color) {
  for (let r = r1; r <= r2; r++) row(r, c1, c2, color);
}

// ── 색상 팔레트 ──────────────────────────────────────────────────
const OG = '#e8942a'; // 주황 몸통
const LT = '#f7c97a'; // 밝은 얼굴
const PK = '#ffaaaa'; // 분홍 (귀 안, 코)
const GR = '#5cb870'; // 초록 눈동자
const DK = '#0d1117'; // 짙은 윤곽선
const WH = '#f0e8d0'; // 크림 배
const ST = '#b06820'; // 짙은 줄무늬
const FD = '#4a9eff'; // 생선 파란색
const ZC = '#7090b0'; // Zzz 색
const HT = '#ff6a88'; // 하트 색

// ── 기본 몸통 ────────────────────────────────────────────────────
function drawBody() {
  rect(2, 8, 11, 13, DK);
  rect(3, 9, 10, 12, OG);
  rect(4, 9,  9, 11, WH); // 배
  px(3, 10, ST); px(3, 11, ST);
  px(10, 10, ST); px(10, 11, ST);
  px(4, 9, ST);  px(9, 9, ST);
}

// ── 기본 머리 ────────────────────────────────────────────────────
// eyeType: 'open' | 'closed' | 'happy' | 'wide'
function drawHead(eyeType = 'open') {
  // 귀
  px(4, 1, DK); px(5, 1, DK);
  px(8, 1, DK); px(9, 1, DK);
  px(4, 2, OG); px(5, 2, PK); px(6, 2, DK);
  px(7, 2, DK); px(8, 2, PK); px(9, 2, OG);

  // 머리 윤곽 + 얼굴
  rect(3, 3, 10, 7, DK);
  rect(4, 4,  9, 6, LT);
  row(3, 4, 9, OG);  // 머리 위 = 주황
  row(7, 4, 9, WH);  // 턱 = 크림

  // 눈
  if (eyeType === 'open') {
    px(5, 4, GR); px(6, 4, GR);
    px(8, 4, GR); px(9, 4, GR);
    px(5, 5, DK); px(6, 5, DK);
    px(8, 5, DK); px(9, 5, DK);
  } else if (eyeType === 'closed') {
    row(5, 5, 6, DK);
    row(5, 8, 9, DK);
  } else if (eyeType === 'happy') {
    px(5, 4, DK); px(6, 5, DK);
    px(8, 4, DK); px(9, 5, DK);
  } else if (eyeType === 'wide') {
    px(5, 4, GR); px(6, 4, GR);
    px(8, 4, GR); px(9, 4, GR);
    px(5, 5, GR); px(6, 5, DK);
    px(8, 5, GR); px(9, 5, DK);
  }

  // 코 + 수염
  px(7, 6, PK);
  ctx.fillStyle = '#333';
  ctx.fillRect(3 * PX, 6 * PX + 1, 2 * PX, 1);
  ctx.fillRect(11 * PX, 6 * PX + 1, 2 * PX, 1);
}

// ── 다리 ─────────────────────────────────────────────────────────
// legPhase: 0=중립, 1=걷기A, 2=걷기B
function drawLegs(legPhase = 0) {
  if (legPhase === 0) {
    px(3, 13, DK); px(4, 13, OG); px(4, 14, DK); px(3, 14, DK);
    px(9, 13, DK); px(10, 13, OG); px(10, 14, DK); px(9, 14, DK);
  } else if (legPhase === 1) {
    px(3, 13, OG); px(3, 14, DK); px(2, 14, DK);
    px(9, 13, OG); px(10, 13, OG); px(11, 13, DK);
    px(10, 14, OG); px(11, 14, DK);
  } else {
    px(3, 13, OG); px(4, 13, OG); px(4, 14, OG); px(5, 14, DK);
    px(9, 13, OG); px(9, 14, DK); px(8, 14, DK);
  }
}

// ── 꼬리 ─────────────────────────────────────────────────────────
// swing: 0=오른쪽, 1=위, -1=왼쪽
function drawTail(swing = 0) {
  if (swing === 0) {
    px(11, 10, OG); px(11, 11, OG);
    px(12, 12, OG); px(12, 13, DK);
  } else if (swing === 1) {
    px(11, 9, OG); px(12, 8, OG);
    px(12, 9, OG); px(13, 8, DK);
  } else {
    px(11, 11, OG); px(10, 12, OG);
    px(10, 13, DK);
  }
}

// ── 상태별 드로잉 ────────────────────────────────────────────────
function drawWalk(frame) {
  const phase    = frame % 4;
  const legPhase = phase < 2 ? 1 : 2;
  const tailSwing = frame % 6 < 3 ? 0 : 1;
  const bob = phase < 2 ? 0 : 1;

  ctx.save();
  ctx.translate(0, bob * PX);
  drawBody();
  drawLegs(legPhase);
  drawTail(tailSwing);
  ctx.restore();
  drawHead('open');
}

function drawSit(frame) {
  const blink    = frame % 90 > 85;
  const tailSwing = Math.floor(frame / 20) % 3 - 1;
  drawBody();
  drawLegs(0);
  drawTail(tailSwing);
  drawHead(blink ? 'closed' : 'open');
}

function drawGroom(frame) {
  const lick = frame % 8;
  drawBody();
  drawLegs(0);
  drawTail(0);
  // 발 올리기
  if (lick < 4) {
    px(10, 5, OG); px(11, 4, OG); px(11, 5, DK);
  } else {
    px(10, 4, OG); px(11, 3, OG); px(11, 4, DK);
  }
  drawHead(lick < 4 ? 'closed' : 'open');
}

function drawSleeping(frame) {
  const breathe = frame % 40 < 20 ? 0 : 1;

  ctx.save();
  ctx.translate(0, breathe * PX);
  rect(2, 10, 12, 14, DK);
  rect(3, 11, 11, 13, OG);
  rect(4, 11,  9, 12, WH);
  px(3, 11, ST); px(10, 11, ST);

  // 잠든 머리
  rect(4, 7, 9, 9, DK);
  rect(5, 8, 8, 8, LT);
  row(8, 5, 6, DK);
  row(8, 8, 9, DK);
  ctx.restore();
}

function drawEat(frame) {
  const chew = frame % 6;
  drawBody();
  drawLegs(0);
  drawTail(1);

  // 생선
  row(12, 13, 15, FD);
  px(15, 12, FD); px(16, 12, FD);
  px(16, 13, FD); px(16, 14, FD);

  // 머리 살짝 앞으로
  ctx.save();
  ctx.translate(PX, 0);
  drawHead(chew < 3 ? 'wide' : 'closed');
  ctx.restore();
}

function drawHappy(frame) {
  const bounce = frame % 8 < 4 ? -1 : 0;
  ctx.save();
  ctx.translate(0, bounce * PX);
  drawBody();
  drawLegs(frame % 8 < 4 ? 1 : 2);
  drawTail(1);
  drawHead('happy');
  ctx.restore();
}

function drawCat(bx, by, state, frame, facingLeft) {
  ctx.save();
  ctx.translate(bx, by);
  if (facingLeft) {
    ctx.translate(14 * PX, 0);
    ctx.scale(-1, 1);
  }
  switch (state) {
    case 'walk':    drawWalk(frame);     break;
    case 'sit':     drawSit(frame);      break;
    case 'groom':   drawGroom(frame);    break;
    case 'sleep':   drawSleeping(frame); break;
    case 'eat':     drawEat(frame);      break;
    case 'happy':   drawHappy(frame);    break;
    default:        drawSit(0);
  }
  ctx.restore();
}

// ── 파티클 시스템 (하트, Zzz, 반짝) ─────────────────────────────
const particles = [];

function spawnParticle(type, sx, sy) {
  particles.push({
    type, x: sx, y: sy,
    vx: (Math.random() - 0.5) * 1.2,
    vy: -1 - Math.random() * 1.5,
    life: 1.0,
    size: type === 'z' ? 14 : 10,
  });
}

function tickParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy *= 0.98;
    p.life -= 0.018;
    if (p.life <= 0) { particles.splice(i, 1); continue; }

    ctx.globalAlpha = p.life * 0.9;
    ctx.font = p.size + 'px monospace';
    ctx.textBaseline = 'top';
    if      (p.type === 'z')      { ctx.fillStyle = ZC; ctx.fillText('z', p.x, p.y); }
    else if (p.type === 'heart')  { ctx.fillStyle = HT; ctx.fillText('♥', p.x, p.y); }
    else                          { ctx.fillStyle = '#ffd060'; ctx.fillText('✦', p.x, p.y); }
    ctx.globalAlpha = 1;
  }
}

// ── 배경 (픽셀아트 방) ──────────────────────────────────────────
function drawBG() {
  // 하늘 그라데이션
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(1, '#141822');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 별
  ctx.fillStyle = '#ffffff22';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137 + 17) % W;
    const sy = (i * 211 + 31) % (H * 0.6);
    const r  = i % 3 === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 바닥
  const floorY = H - 24;
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(0, floorY, W, 24);
  ctx.fillStyle = '#222840';
  ctx.fillRect(0, floorY, W, 3);
  ctx.fillStyle = '#1e2436';
  for (let fx = 0; fx < W; fx += 16) {
    ctx.fillRect(fx, floorY + 6, 2, 2);
  }

  return floorY;
}

// ── 상태 머신 ────────────────────────────────────────────────────
let catX       = 60;
let catState   = 'sit';
let catFrame   = 0;
let facingLeft = false;
let stateTimer = 0;
const SPEED    = 1.2;

function setMood(text, color = '#555') {
  moodEl.textContent = text;
  moodEl.style.color  = color;
}

function pickNextIdle() {
  const r = Math.random();
  if (r < 0.4) return 'walk';
  if (r < 0.7) return 'groom';
  return 'sit';
}

function startState(s) {
  catState = s;
  catFrame = 0;
  switch (s) {
    case 'walk':  stateTimer = 120 + Math.random() * 180; setMood('walking', '#4a8a5a');     break;
    case 'sit':   stateTimer = 100 + Math.random() * 160; setMood('sitting', '#888');         break;
    case 'groom': stateTimer = 100 + Math.random() * 80;  setMood('grooming ✧', '#a080d0');  break;
    case 'sleep': stateTimer = 9999;                       setMood('sleeping 💤', '#5070a0'); break;
    case 'eat':   stateTimer = 140;                        setMood('eating 🐟', '#4a9eff');   break;
    case 'happy': stateTimer = 100;                        setMood('happy ♥', '#ff6a88');     break;
  }
}

function tickState(floorY) {
  stateTimer--;
  catFrame++;

  const spriteH = 16 * PX;
  const catY    = floorY - spriteH + 4;

  if (catState === 'walk') {
    catX += facingLeft ? -SPEED : SPEED;
    const margin = 20;
    if (catX < margin)                    { catX = margin;                  facingLeft = false; }
    if (catX > W - 14 * PX - margin)     { catX = W - 14 * PX - margin;   facingLeft = true; }
    if (stateTimer <= 0) startState(Math.random() < 0.4 ? 'groom' : 'sit');
  } else if (catState === 'sit') {
    if (stateTimer <= 0) startState(pickNextIdle());
  } else if (catState === 'groom') {
    if (stateTimer <= 0) startState(Math.random() < 0.6 ? 'sit' : 'walk');
  } else if (catState === 'sleep') {
    if (catFrame % 60 === 0) spawnParticle('z', catX + 12 * PX, catY);
  } else if (catState === 'eat') {
    if (catFrame % 15 === 0) spawnParticle('sparkle', catX + 14 * PX, catY + 4 * PX);
    if (stateTimer <= 0) startState('sit');
  } else if (catState === 'happy') {
    if (catFrame % 10 === 0) spawnParticle('heart', catX + 7 * PX, catY);
    if (stateTimer <= 0) startState('sit');
  }

  ctx.save();
  ctx.translate(Math.round(catX), catY);
  drawCat(0, 0, catState, catFrame, facingLeft);
  ctx.restore();
}

// ── 메인 루프 ────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastTime < 1000 / 30) return; // ~30fps
  lastTime = ts;
  const floorY = drawBG();
  tickState(floorY);
  tickParticles();
}

startState('sit');
catX = W / 2 - 7 * PX;
requestAnimationFrame(loop);

// ── 커맨드 수신 (extension → webview) ───────────────────────────
function feed()    { startState('eat'); }
function pet()     { startState('happy'); }
function goSleep() { startState(catState === 'sleep' ? 'sit' : 'sleep'); }

window.addEventListener('message', e => {
  const { type } = e.data;
  if (type === 'food')  feed();
  if (type === 'pet')   pet();
  if (type === 'sleep') goSleep();
});

// ── 캔버스 클릭 → meow ──────────────────────────────────────────
canvas.addEventListener('click', e => {
  const r      = canvas.getBoundingClientRect();
  const mx     = e.clientX - r.left;
  const my     = e.clientY - r.top;
  const floorY = H - 24;
  const spriteH = 16 * PX;
  const catY   = floorY - spriteH + 4;
  if (mx > catX && mx < catX + 14 * PX && my > catY && my < catY + 16 * PX) {
    vscode.postMessage({ type: 'meow' });
    startState('happy');
  }
});
</script>
</body>
</html>`;
}

module.exports = { activate };

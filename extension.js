'use strict';
const vscode = require('vscode');

// ── globalState 데이터 구조 ───────────────────────────────────────
const DEFAULT_CAT_DATA = {
  version: 1,
  catType: null,       // 'knight' | 'mage' | 'cleric' | null
  xp: 0,
  level: 1,
  totalMinutes: 0,
  hp: 100,
};

function loadCatData(context) {
  let data = context.globalState.get('codventure.state');
  if (!data) {
    // 구버전 'catData' 키에서 마이그레이션
    const legacy = context.globalState.get('catData');
    data = Object.assign({}, DEFAULT_CAT_DATA, legacy || {});
    if (legacy) context.globalState.update('codventure.state', data);
  } else {
    data = Object.assign({}, DEFAULT_CAT_DATA, data);
  }
  // fire/water/grass → knight/mage/cleric 마이그레이션
  const MIGRATE = { fire: 'knight', water: 'mage', grass: 'cleric' };
  if (data.catType && MIGRATE[data.catType]) {
    data.catType = MIGRATE[data.catType];
    context.globalState.update('codventure.state', data);
  }
  return data;
}

function saveCatData(context, patch) {
  const current = loadCatData(context);
  const next = Object.assign({}, current, patch);
  context.globalState.update('codventure.state', next);
  return next;
}

// ── HP 시스템 ─────────────────────────────────────────────────────
const CLASS_HP_STATS = {
  knight: { maxHp: 120, drainMult: 0.7, restMult: 1.0, xpMult: 1.0 },
  mage:   { maxHp: 80,  drainMult: 1.3, restMult: 1.0, xpMult: 1.5 },
  cleric: { maxHp: 100, drainMult: 1.0, restMult: 2.0, xpMult: 1.0 },
};

function getHpStats(catType) {
  return CLASS_HP_STATS[catType] || { maxHp: 100, drainMult: 1.0, restMult: 1.0 };
}

function drainHP(context, provider, baseAmount) {
  const cur = loadCatData(context);
  if (!cur.catType) return;
  const { maxHp, drainMult } = getHpStats(cur.catType);
  const newHp   = Math.max(0, cur.hp - baseAmount * drainMult);
  const hpDelta = newHp - cur.hp;
  saveCatData(context, { hp: newHp });
  provider.sendHP(newHp, maxHp, hpDelta);
  provider._onStatusUpdate?.();
  if (newHp <= 0) {
    provider.startRest(true);
    vscode.window.showWarningMessage('너무 무리했습니다. 잠깐 쉬어가세요.');
  }
}

function recoverHP(context, provider, baseAmount) {
  const cur = loadCatData(context);
  if (!cur.catType) return;
  const { maxHp } = getHpStats(cur.catType);
  const newHp   = Math.min(maxHp, cur.hp + baseAmount);
  const hpDelta = newHp - cur.hp;
  saveCatData(context, { hp: newHp });
  provider.sendHP(newHp, maxHp, hpDelta);
  provider._onStatusUpdate?.();
}

function calcLevel(xp) {
  if (xp >= 7000) return 5;
  if (xp >= 3500) return 4;
  if (xp >= 1500) return 3;
  if (xp >= 500)  return 2;
  return 1;
}

function grantXP(context, provider, amount, onUpdate) {
  const current  = loadCatData(context);
  if (!current.catType) return;
  const { xpMult } = getHpStats(current.catType);
  const gained   = Math.round(amount * (xpMult || 1.0));
  const newXp    = current.xp + gained;
  const newLevel = calcLevel(newXp);
  const leveled  = newLevel > current.level;
  const next     = saveCatData(context, { xp: newXp, level: newLevel });
  provider.sendData({ xp: next.xp, level: next.level, xpGained: gained });
  if (leveled) {
    provider._sbLevelUpText  = `🎉 LEVEL UP! Lv.${newLevel}`;
    provider._sbLevelUpUntil = Date.now() + 3000;
    setTimeout(() => onUpdate?.(), 3100);
    provider.sendLevelUp(current.level, newLevel);
    vscode.window.showInformationMessage(`🎉 Nabi가 Lv.${newLevel}으로 성장했어요!`);
  }
  onUpdate?.();
}

class CatViewProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
    this._isResting = false;
    this._restTimer = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    const catData = loadCatData(this._context);
    webviewView.webview.html = getHTML(catData);

    webviewView.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'meow') vscode.window.showInformationMessage('🐱 Nyaa~!');
      if (msg.type === 'saveCatData') {
        const prev = loadCatData(this._context);
        saveCatData(this._context, msg.data);
        // 처음 catType 선택 시 HP를 클래스 maxHp로 초기화
        if (msg.data.catType && !prev.catType) {
          const { maxHp } = getHpStats(msg.data.catType);
          saveCatData(this._context, { hp: maxHp });
        }
        this._onDataSaved?.();
      }
      if (msg.type === 'rest_requested') {
        if (this._isResting) {
          this.endRest();
        } else {
          this.startRest();
        }
      }
      if (msg.type === 'ready') {
        const state = loadCatData(this._context);
        this._view?.webview.postMessage({ type: 'state_loaded', data: state });
      }
      if (msg.type === 'save_state') {
        if (msg.data && typeof msg.data === 'object') {
          this._context.globalState.update('codventure.state', msg.data);
        }
      }
    });
    webviewView.onDidDispose(() => { this._view = null; });
  }

  send(type) {
    this._view?.webview.postMessage({ type });
    this._context.globalState.update('catState', type);
  }

  sendData(patch) {
    this._view?.webview.postMessage({ type: 'xpUpdate', data: patch });
  }

  sendLevelUp(oldLevel, newLevel) {
    this._view?.webview.postMessage({ type: 'levelUp', level: newLevel, oldLevel });
  }

  sendHP(hp, maxHp, delta) {
    this._view?.webview.postMessage({ type: 'hp_changed', hp, maxHp, delta });
  }

  startRest(autoRest = false) {
    if (this._isResting) return;
    this._isResting = true;
    this._view?.webview.postMessage({ type: 'rest_start', autoRest });
    this._context.globalState.update('catState', 'rest_start');
    const { restMult } = getHpStats(loadCatData(this._context).catType);
    this._restTimer = setInterval(() => {
      recoverHP(this._context, this, 10 * restMult);
    }, 30_000);
  }

  endRest() {
    if (!this._isResting) return;
    this._isResting = false;
    if (this._restTimer) { clearInterval(this._restTimer); this._restTimer = null; }
    this.send('rest_end');
  }
}

// ── EventDetector ─────────────────────────────────────────────────
// VSCode 개발 행동(타이핑·빌드·커밋·에러)을 감지해 게임 이벤트로 변환
class EventDetector {
  constructor(context, provider, onStateChange) {
    this._context      = context;
    this._provider     = provider;
    this._onStateChange = onStateChange || (() => {});
    this._disposables  = [];

    this._codingTimer    = null;   // 30초 디바운스
    this._minuteTimer    = null;   // 분당 XP 타이머
    this._inactivityTimer = null;
    this._isCodingActive = false;
    this._lastActivityTime = Date.now();

    this._lastErrorCount = 0;
    this._buildCooldown  = false;
  }

  activate() {
    this._setupTypingDetection();
    this._setupBuildDetection();
    this._setupDiagnosticsDetection();
    this._setupGitCommitDetection();
    this._setupInactivityCheck();
  }

  // ── 타이핑 감지 ────────────────────────────────────────────────
  _setupTypingDetection() {
    this._disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (this._isIgnoredFile(e.document.uri.fsPath)) return;
        this._onTypingActivity();
      })
    );
  }

  _onTypingActivity() {
    this._lastActivityTime = Date.now();
    if (!this._isCodingActive) {
      this._isCodingActive = true;
      this._startMinuteTimer();
      this._provider._view?.webview.postMessage({ type: 'typing_start' });
    }
    clearTimeout(this._codingTimer);
    this._codingTimer = setTimeout(() => {
      this._isCodingActive = false;
      this._stopMinuteTimer();
      this._provider._view?.webview.postMessage({ type: 'typing_stop' });
    }, 30_000);
  }

  _startMinuteTimer() {
    if (this._minuteTimer) return;
    this._minuteTimer = setInterval(() => {
      if (!this._isCodingActive) return;
      const cur = loadCatData(this._context);
      saveCatData(this._context, { totalMinutes: cur.totalMinutes + 1 });
      grantXP(this._context, this._provider, 1, this._onStateChange);
      drainHP(this._context, this._provider, 0.5);
    }, 60_000);
  }

  _stopMinuteTimer() {
    if (this._minuteTimer) {
      clearInterval(this._minuteTimer);
      this._minuteTimer = null;
    }
  }

  // ── 빌드/테스트 감지 ───────────────────────────────────────────
  _setupBuildDetection() {
    this._disposables.push(
      vscode.tasks.onDidEndTaskProcess(e => {
        if (this._buildCooldown) return;
        const taskName = e.execution.task.name.toLowerCase();
        const isTest   = taskName.includes('test');
        const code     = e.exitCode;

        if (code === 0) {
          grantXP(this._context, this._provider, isTest ? 25 : 10, this._onStateChange);
          drainHP(this._context, this._provider, 3);
          this._provider.send('code');
          this._provider._view?.webview.postMessage({ type: 'scroll_boost' });
          this._buildCooldown = true;
          setTimeout(() => { this._buildCooldown = false; }, 10_000);
        } else if (code != null && code > 0) {
          drainHP(this._context, this._provider, 5);
          this._provider.send('monster_spawn');
        }
      })
    );
  }

  // ── 에러/버그 감지 ─────────────────────────────────────────────
  _setupDiagnosticsDetection() {
    const countErrors = () => {
      let n = 0;
      for (const [, diags] of vscode.languages.getDiagnostics()) {
        n += diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      }
      return n;
    };

    const check = () => {
      const total = countErrors();
      const prev  = this._lastErrorCount;
      this._lastErrorCount = total;

      if (total > prev) {
        this._provider.send('monster_spawn');  // 몬스터 종류는 TASK-04에서 결정
      } else if (total === 0 && prev > 0) {
        grantXP(this._context, this._provider, 20, this._onStateChange);
        this._provider.send('happy');
      }
    };

    this._disposables.push(vscode.languages.onDidChangeDiagnostics(() => check()));
    // 저장 시 명시적 재평가 (onDidChangeDiagnostics가 누락되는 경우 보완)
    this._disposables.push(vscode.workspace.onDidSaveTextDocument(() => check()));
  }

  // ── Git 커밋 감지 ──────────────────────────────────────────────
  _setupGitCommitDetection() {
    // 방법 B: VSCode Git 익스텐션 API 우선 사용
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (gitExt) {
      const api = (gitExt.isActive ? gitExt.exports : null)?.getAPI?.(1);
      if (api && api.repositories.length > 0) {
        const repo = api.repositories[0];
        let prevHead = repo.state.HEAD?.commit;
        this._disposables.push(
          repo.state.onDidChange(() => {
            const curr = repo.state.HEAD?.commit;
            if (curr && curr !== prevHead) {
              prevHead = curr;
              this._onCommit();
            }
          })
        );
        return;
      }
    }

    // 방법 A: .git/COMMIT_EDITMSG 파일 감시 (fallback)
    const watcher = vscode.workspace.createFileSystemWatcher('**/.git/COMMIT_EDITMSG');
    this._disposables.push(
      watcher.onDidChange(() => this._onCommit()),
      watcher.onDidCreate(() => this._onCommit()),
      watcher
    );
  }

  _onCommit() {
    grantXP(this._context, this._provider, 15, this._onStateChange);
    recoverHP(this._context, this._provider, 5);
    this._provider.send('flag_plant');
  }

  // ── 비활성 감지 ────────────────────────────────────────────────
  _setupInactivityCheck() {
    this._inactivityTimer = setInterval(() => {
      const elapsed = Date.now() - this._lastActivityTime;
      if (elapsed > 15 * 60_000 && this._isCodingActive) {
        this._isCodingActive = false;
        this._stopMinuteTimer();
      }
    }, 60_000);
  }

  // ── 유틸 ───────────────────────────────────────────────────────
  _isIgnoredFile(fsPath) {
    return /node_modules[\\/]|\.git[\\/]|[\\/]dist[\\/]/.test(fsPath);
  }

  dispose() {
    clearTimeout(this._codingTimer);
    this._stopMinuteTimer();
    if (this._inactivityTimer) clearInterval(this._inactivityTimer);
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
  }
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const provider = new CatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codventure', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  // ── 상태바 (왼쪽, 애니메이션) ──────────────────────────────────────
  const sb = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -999);
  sb.command = 'codventure.show';
  sb.tooltip  = 'Click to visit your cat!';
  sb.show();
  context.subscriptions.push(sb);

  const CLASS_LABELS = { knight: '기사', mage: '마법사', cleric: '성직자' };

  function updateStatusBar() {
    if (provider._sbLevelUpUntil && Date.now() < provider._sbLevelUpUntil) {
      sb.text = provider._sbLevelUpText;
      return;
    }
    const d = loadCatData(context);
    if (!d.catType) { sb.text = '⚔️ Codventure'; return; }
    const { maxHp } = getHpStats(d.catType);
    const hpPct    = d.hp / maxHp;
    const filled   = Math.max(0, Math.min(8, Math.round(hpPct * 8)));
    const hpBlocks = '█'.repeat(filled) + '░'.repeat(8 - filled);
    if (d.level >= 5) {
      const legendName = CLASS_LABELS[d.catType] || '모험가';
      sb.text = `👑 전설의 ${legendName} | ${hpBlocks} HP | ${d.xp} XP`;
      return;
    }
    const icon = hpPct <= 0.3 ? '⚠️' : '⚔️';
    sb.text = `${icon} Lv.${d.level} | ${hpBlocks} HP | ${d.xp} XP`;
  }
  updateStatusBar();
  provider._onDataSaved    = updateStatusBar;
  provider._onStatusUpdate = updateStatusBar;

  // ── EventDetector: 개발 행동 → 게임 이벤트 브릿지 ────────────────
  const detector = new EventDetector(context, provider, updateStatusBar);
  detector.activate();
  context.subscriptions.push({ dispose: () => detector.dispose() });

  // ── 커맨드 ────────────────────────────────────────────────────────
  // codventure.focus는 VSCode가 WebviewView id로 자동 생성하는 내장 커맨드
  const show = () => vscode.commands.executeCommand('codventure.focus');
  const send = (type) => {
    show();
    setTimeout(() => provider.send(type), 150);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('codventure.show',  show),
    vscode.commands.registerCommand('codventure.food',  () => { grantXP(context, provider, 5, updateStatusBar); send('food'); }),
    vscode.commands.registerCommand('codventure.pet',   () => { grantXP(context, provider, 5, updateStatusBar); send('pet'); }),
    vscode.commands.registerCommand('codventure.sleep', () => send('sleep')),
    vscode.commands.registerCommand('codventure.code',  () => send('code')),
  );
}

// ─────────────────────────────────────────────────────────────────
//  WEBVIEW HTML
// ─────────────────────────────────────────────────────────────────
function getHTML(catData) {
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
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-top: 1px solid #1e2530;
  background: #0d1117;
  flex-shrink: 0;
}
button {
  flex: 1 1 0;
  min-width: 0;
  background: #161b22;
  color: #8b949e;
  border: 1px solid #2a3040;
  padding: 5px 4px;
  cursor: pointer;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  transition: all 0.15s;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
button:hover { background:#21262d; color:#e8942a; border-color:#e8942a; }
button:active { transform: scale(0.95); }
#hint { color:#333; font-size:10px; width:100%; text-align:center; margin-top:2px; }
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
  <button onclick="goSleep()">💤 /sleep</button>
  <button onclick="startCode()">💻 /code</button>
  <button id="restBtn" onclick="toggleRest()">⛺ 쉬기</button>
  <span id="hint">or use Cmd+Shift+P → Codventure</span>
</div>

<script>
const __INITIAL_DATA__ = ${JSON.stringify(catData)};
const vscode = acquireVsCodeApi();

// ── 영속 데이터 (extension globalState 미러) ─────────────────────
let catData = __INITIAL_DATA__;

function persistCatData(patch) {
  Object.assign(catData, patch);
  vscode.postMessage({ type: 'saveCatData', data: patch });
}

// ── HP 시스템 상태 ────────────────────────────────────────────────
const HP_STATS = {
  knight: { maxHp: 120 },
  mage:   { maxHp: 80  },
  cleric: { maxHp: 100 },
};
let maxHp     = HP_STATS[catData.catType]?.maxHp ?? 100;
let targetHp  = catData.hp ?? maxHp;
let displayHp = targetHp;
let isResting = false;

let campfireAlpha = 0;
let campfireFrame = 0;
let showAutoRestMsg = false;
let departText = null;    // { alpha } — "출발!" 팝업
const campEmbers = [];    // 주황 불씨 파티클

// XP/HP 팝업
const xpPopups = [];
// 레벨업 연출
let levelUpAnim = null;   // { timer, maxTimer, newLevel }

// ── 횡스크롤 배경 상태 ─────────────────────────────────────────────
let scrollOffset     = 0;
let scrollSpeed      = 1.0;
let scrollBoostTimer = 0;       // 남은 부스트 프레임 (24 = 0.8s @ 30fps)
let zoneTrans        = null;    // { phase:'in'|'hold'|'out', alpha, hold, text } | null

// ── 직업 선택 모드 ────────────────────────────────────────────────
let classSelectMode  = catData.catType === null;
let classSelectFrame = 0;
let selectAnim       = null; // { type, frame } | null
let catScale         = 1;

const CLASS_INFO = [
  { type: 'knight', label: '기사',   desc: '튼튼한 탱커',   color: '#5870a8', statText: 'HP 120  소모×0.7' },
  { type: 'mage',   label: '마법사', desc: '고위험 고보상', color: '#7030d0', statText: 'HP 80   XP×1.5'   },
  { type: 'cleric', label: '성직자', desc: '회복 특화',      color: '#c8a020', statText: 'HP 100  회복×2.0' },
];
const CARDS = CLASS_INFO.map(c => ({ ...c, x: 0, y: 0, hoverY: 0, isHover: false }));

function updateCardPositions() {
  const cw = Math.floor(W / 3);
  for (let i = 0; i < CARDS.length; i++) {
    CARDS[i].x = Math.floor(cw * i + cw / 2);
    CARDS[i].y = Math.floor(H * 0.42);
  }
}

// ── 캔버스 세팅 ──────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const moodEl = document.getElementById('mood-label');

let W = 0, H = 0;
function resize() {
  const s = document.getElementById('scene');
  W = canvas.width  = s.clientWidth;
  H = canvas.height = s.clientHeight;
  if (classSelectMode) updateCardPositions();
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

// ── 직업 클래스 팔레트 ────────────────────────────────────────────
function getCharClass() { return catData.catType ?? 'knight'; }

const CLASS_PAL = {
  knight: { armor:'#5870a8', dark:'#303850', gold:'#c8a020',
            visor:'#1a2840', sword:'#c8d8e8', skin:'#f0c880', shield:'#3050a0' },
  mage:   { robe:'#5020a0', trim:'#7030d0', orb:'#60e0ff',
            staff:'#6a4020', dark:'#2a1060', skin:'#f0c880', hat:'#3a1070' },
  cleric: { robe:'#e8e0c0', trim:'#ffd060', cross:'#ffffff',
            hood:'#c8c090', holy:'#ffd060', skin:'#f0c880', dark:'#a09060' },
};

// ── 속성별 팔레트 (파티클용) ─────────────────────────────────────
const PALETTES = {
  knight: { particle: '⚔' },
  mage:   { particle: '✨' },
  cleric: { particle: '✦' },
  // 레거시 (구버전 globalState 호환)
  fire:  { body: '#e8521a', light: '#f89870', stripe: '#b03010', eye: '#ff4400', particle: '🔥' },
  water: { body: '#4a90d9', light: '#a0c8f0', stripe: '#2860a8', eye: '#00ccff', particle: '💧' },
  grass: { body: '#5ab84a', light: '#90d080', stripe: '#3a8030', eye: '#aaff44', particle: '🍃' },
};

// ── 색상 팔레트 (drawCat 호출 전 applyPalette()로 교체됨) ────────
let OG = '#e8942a';   // 몸통 — 속성별 교체
let LT = '#f7c97a';   // 밝은 얼굴 — 속성별 교체
const PK = '#ffaaaa'; // 분홍 (귀 안, 코) — 고정
let GR = '#d4a030';   // 눈동자 — 속성별 교체
const DK = '#0d1117'; // 짙은 윤곽선 — 고정
const WH = '#f0e8d0'; // 크림 배 — 고정
let ST = '#b06820';   // 줄무늬 — 속성별 교체
const FD = '#4a9eff'; // 생선 파란색
const ZC = '#7090b0'; // Zzz 색
const HT = '#ff6a88'; // 하트 색

function applyPalette(catType) {
  const pal = PALETTES[catType];
  if (!pal) return;
  OG = pal.body;
  LT = pal.light;
  GR = pal.eye;
  ST = pal.stripe;
}

// ── 판타지 캐릭터 스프라이트 ─────────────────────────────────────
// 공통 상수
const FR = '#252d3a'; // 노트북 프레임
const SC = '#0a1628'; // 화면
const CD = '#4aff70'; // 코드 줄
const KB = '#6a7880'; // 키보드

// ── Knight 스프라이트 ──────────────────────────────────────────
function drawKnight(state, frame, pal) {
  const { armor, dark, gold, visor, sword, skin, shield } = pal;
  const cycle = frame % 8;
  const legA  = cycle < 4;
  const bob   = state === 'walk_normal' ? -Math.abs(Math.sin(cycle / 8 * Math.PI * 2)) * 2 : 0;
  const breathe = Math.sin(frame / 30) * 0.5;

  ctx.save();

  if (state === 'walk_normal' || state === 'walk_tired' || state === 'walk_danger' || state === 'run') {
    const tiredOffset = (state === 'walk_tired') ? 1 : 0;
    const runBob = state === 'run' ? -Math.abs(Math.sin((frame % 4) / 4 * Math.PI * 2)) * 3 : bob;
    const xWobble = state === 'walk_danger' ? Math.sin(frame / 4 * Math.PI * 2) * 3 : 0;
    ctx.translate(xWobble, runBob + tiredOffset);
    // 투구
    rect(3, 0, 10, 1, armor);
    rect(2, 2, 11, 5, armor); rect(3, 2, 10, 5, armor);
    rect(3, 3, 10, 4, visor); // 바이저
    px(4, 3, '#ffffff88'); px(5, 3, '#ffffff44'); // 눈 하이라이트
    // 목+어깨
    rect(2, 6, 11, 7, armor); px(1, 6, armor); px(12, 6, armor);
    // 흉갑
    rect(3, 8, 10, 11, armor);
    px(4, 9, gold); px(6, 9, gold); px(8, 9, gold); px(10, 9, gold); // 금 장식
    row(10, 4, 9, dark); // 복부 경계
    // 방패 (왼쪽)
    rect(1, 7, 2, 11, shield); px(1, 7, dark); px(2, 7, dark); px(1, 11, dark); px(2, 11, dark);
    px(1, 9, gold); // 방패 문양
    // 검 (오른쪽)
    row(5, 12, 12, gold); // 날받이
    px(12, 4, sword); px(12, 5, sword); px(12, 6, sword);
    px(12, 7, sword); px(12, 8, sword); // 검날
    // 다리
    if (legA) {
      rect(3, 12, 5, 15, armor); px(3, 15, dark); px(4, 15, dark); px(5, 15, dark);
      rect(8, 12, 10, 13, armor); rect(8, 14, 10, 15, armor); px(8, 15, dark); px(9, 15, dark); px(10, 15, dark);
    } else {
      rect(3, 12, 5, 13, armor); rect(3, 14, 5, 15, armor); px(3, 15, dark); px(4, 15, dark); px(5, 15, dark);
      rect(8, 12, 10, 15, armor); px(8, 15, dark); px(9, 15, dark); px(10, 15, dark);
    }
  } else if (state === 'sit' || state === 'groom') {
    ctx.translate(0, breathe);
    // 투구
    rect(3, 0, 10, 1, armor); rect(2, 2, 11, 5, armor); rect(3, 3, 10, 4, visor);
    px(4, 3, '#ffffff88');
    // 어깨+흉갑
    rect(2, 6, 11, 11, armor); px(1, 6, armor); px(12, 6, armor);
    px(4, 9, gold); px(6, 9, gold); px(8, 9, gold);
    rect(1, 7, 2, 10, shield); px(1, 9, gold);
    row(5, 12, 12, gold);
    // 앉은 다리
    rect(3, 12, 10, 14, armor); rect(3, 15, 10, 15, dark);
    if (state === 'groom') {
      // 검 갈기 (앞으로 내밀기)
      const groomPhase = Math.floor(frame / 10) % 2;
      px(11, 8, sword); px(12, 7, sword); px(13, 6, sword);
      if (groomPhase === 0) { px(12, 9, gold); } else { px(11, 7, gold); }
    } else {
      px(12, 5, sword); px(12, 6, sword); px(12, 7, sword); px(12, 8, sword);
    }
  } else if (state === 'sleep') {
    ctx.translate(0, Math.sin(frame / 20) * 0.5);
    // 앉아서 쉬는 자세 — 투구 숙임
    rect(3, 2, 10, 3, armor); rect(3, 4, 10, 5, visor);
    rect(2, 6, 11, 11, armor); px(4, 9, gold); px(6, 9, gold);
    rect(1, 7, 2, 10, shield);
    // 방패 기댄 검
    px(12, 6, sword); px(12, 7, sword); px(12, 8, sword);
    // 앉은 다리 (오므린)
    rect(3, 12, 10, 15, armor);
  } else if (state === 'eat') {
    // 포션 마시기
    const drinkPhase = Math.floor(frame / 6) % 4;
    rect(3, 0, 10, 1, armor); rect(2, 2, 11, 5, armor); rect(3, 3, 10, 4, visor);
    rect(2, 6, 11, 11, armor); px(4, 9, gold);
    rect(1, 7, 2, 10, shield);
    rect(3, 12, 10, 15, armor);
    // 포션 병 (빨강)
    if (drinkPhase < 3) {
      px(11, 6, '#cc0000'); px(12, 7, '#ff3030'); px(12, 8, '#ff3030'); px(11, 9, '#cc0000');
    }
    if (drinkPhase === 2) { px(12, 5, '#ff8800'); } // 마시는 중
  } else if (state === 'happy' || state === 'flag_plant') {
    // 승리 포즈 / 깃발 꽂기
    const t = (frame % 12) / 12 * Math.PI * 2;
    const jumpY = state === 'happy' ? -Math.max(0, Math.sin(t)) * 2.5 * PX : 0;
    ctx.translate(0, jumpY);
    rect(3, 0, 10, 1, armor); rect(2, 2, 11, 5, armor); rect(3, 3, 10, 4, visor);
    rect(2, 6, 11, 11, armor); px(4, 9, gold); px(6, 9, gold);
    rect(1, 7, 2, 10, shield);
    rect(3, 12, 10, 15, armor);
    if (state === 'happy') {
      // 검 들어올리기
      px(12, 2, sword); px(12, 3, sword); px(12, 4, sword);
      px(12, 5, sword); row(5, 11, 13, gold);
    } else {
      // 깃발 꽂기 4단계
      const fp = Math.floor((36 - Math.max(0, stateTimer)) / 9);
      if (fp === 0) { px(12, 3, '#8b4020'); row(3, 10, 13, '#ff4020'); }       // 꺼내기
      else if (fp === 1) { px(12, 1, '#8b4020'); px(12, 2, '#8b4020'); row(1, 9, 13, '#ff4020'); px(10, 0, '#ffcc00'); } // 들기
      else { // 꽂기
        px(12, 0, '#8b4020'); px(12, 1, '#8b4020'); px(12, 2, '#8b4020');
        row(0, 9, 13, '#ff4020'); rect(9, 1, 13, 2, '#5870a8'); px(10, 0, '#ffcc00');
      }
    }
  } else if (state === 'code') {
    // 코딩 — 노트북 앞
    const phase = Math.floor(frame / 8) % 2;
    const cursor = Math.floor(frame / 15) % 2;
    rect(3, 0, 10, 1, armor); rect(2, 2, 11, 5, armor); rect(3, 3, 10, 4, visor);
    rect(2, 6, 11, 11, armor); px(4, 9, gold);
    rect(3, 12, 5, 14, armor); rect(8, 12, 10, 14, armor); // 앉은 다리
    // 노트북
    rect(11, 3, 17, 10, FR); rect(12, 4, 16, 9, SC);
    row(4, 12, 16, CD); row(6, 12, 15, CD); row(8, 12, 16, CD);
    if (cursor) px(16, 7, CD);
    rect(9, 11, 17, 12, KB);
    // 팔 타이핑
    if (phase === 0) { px(9, 11, armor); px(10, 11, armor); }
    else             { px(9, 10, armor); px(10, 10, armor); }
  }

  ctx.restore();
}

// ── Mage 스프라이트 ────────────────────────────────────────────
function drawMage(state, frame, pal) {
  const { robe, trim, orb, staff, dark, skin, hat } = pal;
  const cycle = frame % 8;
  const legA  = cycle < 4;
  const bob   = state === 'walk_normal' ? -Math.abs(Math.sin(cycle / 8 * Math.PI * 2)) * 2 : 0;
  const breathe = Math.sin(frame / 30) * 0.5;

  ctx.save();

  if (state === 'walk_normal' || state === 'walk_tired' || state === 'walk_danger' || state === 'run') {
    const tiredY = (state === 'walk_tired') ? 1 : 0;
    const runBob = state === 'run' ? -Math.abs(Math.sin((frame % 4) / 4 * Math.PI * 2)) * 3 : bob;
    const xWobble = state === 'walk_danger' ? Math.sin(frame / 4 * Math.PI * 2) * 3 : 0;
    ctx.translate(xWobble, runBob + tiredY);
    // 뾰족 모자
    px(6, 0, hat); px(5, 1, hat); px(6, 1, hat); px(7, 1, hat);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim); // 모자 챙
    // 얼굴
    rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark); // 눈
    px(6, 6, '#cc8888'); // 코
    // 로브 (걸을 때 좌우 흔들림)
    const robeSwing = legA ? 1 : -1;
    rect(2, 7, 11, 13, robe);
    row(7, 2, 11, trim); row(13, 2, 11, trim); // 로브 상하 테두리
    px(3 + robeSwing, 14, robe); rect(4, 14, 9, 15, robe); px(10 + robeSwing, 14, robe);
    px(3, 14, dark); px(10, 14, dark);
    // 지팡이 (오른쪽)
    px(12, 0, orb); px(11, 1, orb); px(12, 1, orb); // 구슬
    px(12, 2, staff); px(12, 3, staff); px(12, 4, staff);
    px(12, 5, staff); px(12, 6, staff); px(12, 7, staff); px(12, 8, staff);
  } else if (state === 'sit' || state === 'groom') {
    ctx.translate(0, breathe);
    px(6, 0, hat); px(5, 1, hat); px(6, 1, hat); px(7, 1, hat);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim);
    rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark);
    rect(2, 7, 11, 13, robe); row(7, 2, 11, trim);
    rect(3, 14, 10, 15, robe); row(14, 3, 10, dark);
    px(12, 1, orb); px(12, 2, staff); px(12, 3, staff);
    px(12, 4, staff); px(12, 5, staff); px(12, 6, staff);
    if (state === 'groom') {
      // 마법서 읽기
      const readPhase = Math.floor(frame / 15) % 2;
      rect(8, 10, 13, 12, '#e8d8a0'); // 책
      row(10, 9, 12, '#c8b880'); row(11, 9, 12, '#c8b880');
      if (readPhase) { px(8, 10, dark); } // 페이지 넘기기
    }
  } else if (state === 'sleep') {
    ctx.translate(0, Math.sin(frame / 20) * 0.5);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim);
    rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark);
    rect(2, 7, 11, 13, robe);
    rect(3, 14, 10, 15, robe);
    px(12, 3, staff); px(12, 4, staff); px(12, 5, staff);
  } else if (state === 'eat') {
    const drinkPhase = Math.floor(frame / 6) % 4;
    px(6, 0, hat); px(5, 1, hat); px(6, 1, hat); px(7, 1, hat);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim);
    rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 13, robe); rect(3, 14, 10, 15, robe);
    if (drinkPhase < 3) {
      px(11, 7, '#0044cc'); px(12, 8, '#3388ff'); px(12, 9, '#3388ff'); px(11, 10, '#0044cc');
    }
  } else if (state === 'happy' || state === 'flag_plant') {
    const t = (frame % 12) / 12 * Math.PI * 2;
    const jumpY = state === 'happy' ? -Math.max(0, Math.sin(t)) * 2.5 * PX : 0;
    ctx.translate(0, jumpY);
    px(6, 0, hat); px(5, 1, hat); px(6, 1, hat); px(7, 1, hat);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim);
    rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 13, robe); rect(3, 14, 10, 15, robe);
    if (state === 'happy') {
      // 지팡이 들어올림
      px(12, 0, orb); px(12, 1, orb); px(12, 2, staff); px(12, 3, staff);
    } else {
      const fp = Math.floor((36 - Math.max(0, stateTimer)) / 9);
      if (fp === 0) { px(12, 5, '#8b4020'); row(4, 9, 13, '#a030d0'); }
      else { px(12, 2, '#8b4020'); px(12, 3, '#8b4020'); row(2, 9, 13, '#a030d0'); rect(9, 3, 13, 4, trim); }
    }
  } else if (state === 'code') {
    const phase = Math.floor(frame / 8) % 2;
    const cursor = Math.floor(frame / 15) % 2;
    px(6, 0, hat); px(5, 1, hat); px(6, 1, hat); px(7, 1, hat);
    rect(4, 2, 9, 3, hat); row(3, 3, 10, trim);
    rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 12, robe); rect(3, 13, 10, 14, robe);
    rect(11, 3, 17, 10, FR); rect(12, 4, 16, 9, SC);
    row(4, 12, 16, CD); row(6, 12, 15, CD); row(8, 12, 16, CD);
    if (cursor) px(16, 7, CD);
    rect(9, 11, 17, 12, KB);
    if (phase === 0) { px(9, 11, robe); px(10, 11, robe); }
    else             { px(9, 10, robe); px(10, 10, robe); }
  }

  ctx.restore();
}

// ── Cleric 스프라이트 ──────────────────────────────────────────
function drawCleric(state, frame, pal) {
  const { robe, trim, cross, hood, holy, skin, dark } = pal;
  const cycle = frame % 8;
  const legA  = cycle < 4;
  const bob   = state === 'walk_normal' ? -Math.abs(Math.sin(cycle / 8 * Math.PI * 2)) * 2 : 0;
  const breathe = Math.sin(frame / 30) * 0.5;

  ctx.save();

  if (state === 'walk_normal' || state === 'walk_tired' || state === 'walk_danger' || state === 'run') {
    const tiredY = (state === 'walk_tired') ? 1 : 0;
    const runBob = state === 'run' ? -Math.abs(Math.sin((frame % 4) / 4 * Math.PI * 2)) * 3 : bob;
    const xWobble = state === 'walk_danger' ? Math.sin(frame / 4 * Math.PI * 2) * 3 : 0;
    ctx.translate(xWobble, runBob + tiredY);
    // 두건
    rect(3, 0, 10, 3, hood); px(2, 2, hood); px(11, 2, hood);
    // 얼굴
    rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark);
    px(6, 6, '#cc8888');
    // 흰 로브 (걸을 때 흔들림)
    const robeSwing = legA ? 1 : -1;
    rect(2, 7, 11, 13, robe); row(7, 2, 11, trim);
    // 금 십자가 (가슴)
    px(6, 9, trim); px(7, 9, trim); px(8, 9, trim);
    px(7, 8, trim); px(7, 10, trim);
    px(3 + robeSwing, 14, robe); rect(4, 14, 9, 15, robe); px(10 + robeSwing, 14, robe);
    px(3, 14, dark); px(10, 14, dark);
    // 황금 지팡이 (오른쪽)
    px(12, 2, trim); px(12, 3, trim); // 십자 머리
    px(11, 2, trim); px(13, 2, trim);
    px(12, 4, holy); px(12, 5, holy); px(12, 6, holy); px(12, 7, holy); px(12, 8, holy);
  } else if (state === 'sit' || state === 'groom') {
    ctx.translate(0, breathe);
    rect(3, 0, 10, 3, hood); rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark);
    rect(2, 7, 11, 13, robe); row(7, 2, 11, trim);
    px(6, 9, trim); px(7, 9, trim); px(8, 9, trim); px(7, 8, trim); px(7, 10, trim);
    rect(3, 14, 10, 15, robe); row(14, 3, 10, dark);
    px(12, 2, trim); px(11, 2, trim); px(13, 2, trim);
    px(12, 4, holy); px(12, 5, holy); px(12, 6, holy);
    if (state === 'groom') {
      // 기도 (두 손 합장)
      const prayPhase = Math.floor(frame / 20) % 2;
      rect(6, 11, 8, 12, skin); // 합장 손
      if (prayPhase) {
        ctx.globalAlpha = 0.5;
        rect(5, 10, 9, 13, trim); // 빛 효과
        ctx.globalAlpha = 1;
      }
    }
  } else if (state === 'sleep') {
    ctx.translate(0, Math.sin(frame / 20) * 0.5);
    rect(3, 0, 10, 3, hood); rect(3, 4, 10, 6, skin); px(4, 5, dark); px(8, 5, dark);
    rect(2, 7, 11, 13, robe);
    rect(3, 14, 10, 15, robe);
    px(12, 4, holy); px(12, 5, holy);
  } else if (state === 'eat') {
    const drinkPhase = Math.floor(frame / 6) % 4;
    rect(3, 0, 10, 3, hood); rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 13, robe); row(7, 2, 11, trim);
    px(6, 9, trim); px(7, 9, trim); px(7, 8, trim);
    rect(3, 14, 10, 15, robe);
    if (drinkPhase < 3) {
      px(11, 7, '#00aa44'); px(12, 8, '#00ee60'); px(12, 9, '#00ee60'); px(11, 10, '#00aa44');
    }
  } else if (state === 'happy' || state === 'flag_plant') {
    const t = (frame % 12) / 12 * Math.PI * 2;
    const jumpY = state === 'happy' ? -Math.max(0, Math.sin(t)) * 2.5 * PX : 0;
    ctx.translate(0, jumpY);
    rect(3, 0, 10, 3, hood); rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 13, robe); row(7, 2, 11, trim);
    px(6, 9, trim); px(7, 9, trim); px(7, 8, trim); px(7, 10, trim);
    rect(3, 14, 10, 15, robe);
    if (state === 'happy') {
      px(12, 1, trim); px(11, 1, trim); px(13, 1, trim);
      px(12, 2, holy); px(12, 3, holy); px(12, 4, holy);
    } else {
      const fp = Math.floor((36 - Math.max(0, stateTimer)) / 9);
      if (fp === 0) { px(12, 5, '#8b4020'); row(4, 9, 13, '#e8e0c0'); }
      else { px(12, 2, '#8b4020'); px(12, 3, '#8b4020'); row(2, 9, 13, '#e8e0c0'); rect(9, 3, 13, 4, trim); }
    }
  } else if (state === 'code') {
    const phase = Math.floor(frame / 8) % 2;
    const cursor = Math.floor(frame / 15) % 2;
    rect(3, 0, 10, 3, hood); rect(3, 4, 10, 6, skin);
    rect(2, 7, 11, 12, robe); row(7, 2, 11, trim); px(7, 9, trim);
    rect(3, 13, 10, 14, robe);
    rect(11, 3, 17, 10, FR); rect(12, 4, 16, 9, SC);
    row(4, 12, 16, CD); row(6, 12, 15, CD); row(8, 12, 16, CD);
    if (cursor) px(16, 7, CD);
    rect(9, 11, 17, 12, KB);
    if (phase === 0) { px(9, 11, robe); px(10, 11, robe); }
    else             { px(9, 10, robe); px(10, 10, robe); }
  }

  ctx.restore();
}

// ── 레벨별 외형 추가 ──────────────────────────────────────────
function drawClassExtras(cls, state, frame, pal) {
  const level = catData.level;
  if (level < 4 || state === 'sleep') return;
  if (cls === 'knight') {
    // Lv.4+: 황금 왕관 (투구 위)
    px(5, -1, '#ffd700'); px(7, -1, '#ffd700'); px(9, -1, '#ffd700');
    px(4, 0, '#c8a020'); px(6, 0, '#ffd700'); px(8, 0, '#ffd700'); px(10, 0, '#c8a020');
  } else if (cls === 'mage') {
    // Lv.4+: 모자에 별 장식
    px(6, 0, '#ffe060'); px(7, -1, '#ffff80');
  } else if (cls === 'cleric') {
    // Lv.4+: 두건에 성스러운 빛
    const glow = Math.sin(frame / 15) * 0.3 + 0.4;
    ctx.globalAlpha = glow;
    rect(4, 0, 9, 1, '#ffe0a0');
    ctx.globalAlpha = 1;
  }
}

function drawCharacter(bx, by, state, frame, facingLeft) {
  ctx.save();
  ctx.translate(bx, by);
  if (facingLeft) { ctx.translate(14 * PX, 0); ctx.scale(-1, 1); }
  const cls = getCharClass();
  const pal = CLASS_PAL[cls];
  const hpPct = displayHp / maxHp;

  let effectiveState = state;
  if (state === 'walk') {
    if (hpPct < 0.3)      effectiveState = 'walk_danger';
    else if (hpPct < 0.7) effectiveState = 'walk_tired';
    else                   effectiveState = 'walk_normal';
  }

  if (cls === 'knight')       drawKnight(effectiveState, frame, pal);
  else if (cls === 'mage')    drawMage(effectiveState, frame, pal);
  else                        drawCleric(effectiveState, frame, pal);

  drawClassExtras(cls, effectiveState, frame, pal);
  ctx.restore();
}

// 하위 호환용 — 기존 drawCat() 호출부에서 사용
function drawCat(bx, by, state, frame, facingLeft) {
  drawCharacter(bx, by, state, frame, facingLeft);
}

// ── HP 바 UI ────────────────────────────────────────────────────
function tickHP() {
  if (displayHp < targetHp) {
    // 회복: ease-out 애니메이션 (~0.5s at 30fps)
    displayHp += (targetHp - displayHp) * 0.08;
    if (targetHp - displayHp < 0.5) displayHp = targetHp;
  } else {
    // 소모: 즉각 반영
    displayHp = targetHp;
  }
}

function drawHPBar() {
  if (!catData.catType || classSelectMode) return;
  const bx = 12, by = 12, bw = 120, bh = 10;
  const pct = Math.max(0, displayHp / maxHp);
  // 테두리
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  // 배경
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(bx, by, bw, bh);
  // 채움
  const fw = Math.max(0, Math.round(pct * bw));
  ctx.fillStyle = pct >= 0.6 ? '#4aff70' : pct >= 0.3 ? '#ffcc00' : '#ff4444';
  if (fw > 0) ctx.fillRect(bx, by, fw, bh);
  // 수치 텍스트
  ctx.fillStyle = '#aaa';
  ctx.font = '10px monospace';
  ctx.fillText(Math.ceil(displayHp) + '/' + maxHp, bx + bw + 6, by + 8);
}

// ── 파티클 시스템 (하트, Zzz, 반짝) ─────────────────────────────
// ── 직업 선택 카드 렌더링 ────────────────────────────────────────
function drawClassCard(card, alpha, overrideX, overrideY) {
  const cw  = Math.floor(W / 3);
  const CW  = Math.max(50, cw - 10);
  const CH  = 98;
  const cx  = overrideX !== undefined ? overrideX : card.x;
  const cy  = (overrideY !== undefined ? overrideY : card.y) + card.hoverY;
  const bx  = Math.round(cx - CW / 2);
  const by  = Math.round(cy - CH / 2);

  ctx.save();
  ctx.globalAlpha = alpha;

  // 카드 배경
  ctx.fillStyle = '#161b22';
  ctx.fillRect(bx, by, CW, CH);
  ctx.strokeStyle = card.color + 'aa';
  ctx.lineWidth = card.isHover ? 2 : 1;
  ctx.strokeRect(bx, by, CW, CH);

  // 직업 스프라이트 (0.45× 스케일)
  const scale   = 0.45;
  const sprW    = Math.round(14 * PX * scale);
  const sprH    = Math.round(16 * PX * scale);
  const spriteTX = bx + Math.round((CW - sprW) / 2);
  const spriteTY = by + 6;
  ctx.save();
  ctx.translate(spriteTX, spriteTY);
  ctx.scale(scale, scale);
  const pal = CLASS_PAL[card.type];
  if (card.type === 'knight')     drawKnight('sit', classSelectFrame, pal);
  else if (card.type === 'mage')  drawMage('sit', classSelectFrame, pal);
  else                            drawCleric('sit', classSelectFrame, pal);
  ctx.restore();

  // 직업명
  ctx.fillStyle = card.color;
  ctx.font = `bold ${Math.min(11, Math.floor(CW / 7))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(card.label, cx, by + sprH + 10);

  // 설명
  ctx.fillStyle = '#888';
  ctx.font = `${Math.min(9, Math.floor(CW / 8))}px monospace`;
  ctx.fillText(card.desc, cx, by + sprH + 23);

  // 스탯
  ctx.fillStyle = '#666';
  ctx.fillText(card.statText, cx, by + sprH + 36);

  ctx.textAlign = 'left';
  ctx.restore();
}

const particles = [];

const CODE_SYMS = ['{}', '()', '<>', '//', '=>'];
function spawnParticle(type, sx, sy, sym = null) {
  const isGold = type === 'gold';
  const isDust = type === 'dust';
  const angle  = isGold ? Math.random() * Math.PI * 2 : 0;
  const speed  = isGold ? 1.5 + Math.random() * 2.5 : 1;
  particles.push({
    type, x: sx, y: sy,
    vx: isDust ? (Math.random() - 0.5) * 1.5 : isGold ? Math.cos(angle) * speed : (Math.random() - 0.5) * 1.2,
    vy: isDust ? -Math.random() * 0.8 : isGold ? Math.sin(angle) * speed : -1 - Math.random() * 1.5,
    life: isDust ? 0.6 : 1.0,
    size: type === 'z' ? 14 : type === 'gold' ? 13 : 10,
    sym: type === 'codebit' ? CODE_SYMS[Math.floor(Math.random() * CODE_SYMS.length)] : (type === 'attr' ? sym : null),
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
    if      (p.type === 'z')       { ctx.fillStyle = ZC;       ctx.fillText('z',    p.x, p.y); }
    else if (p.type === 'heart')   { ctx.fillStyle = HT;       ctx.fillText('♥',    p.x, p.y); }
    else if (p.type === 'codebit') { ctx.fillStyle = '#4aff70'; ctx.fillText(p.sym,  p.x, p.y); }
    else if (p.type === 'gold')    { ctx.fillStyle = '#ffd700'; ctx.fillText('✦',    p.x, p.y); }
    else if (p.type === 'attr')    {                            ctx.fillText(p.sym,  p.x, p.y); }
    else if (p.type === 'dust')    {
      ctx.fillStyle = '#808070';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    else                           { ctx.fillStyle = '#ffd060'; ctx.fillText('✦',    p.x, p.y); }
    ctx.globalAlpha = 1;
  }
}

// ── XP/HP 팝업 ──────────────────────────────────────────────────
function spawnXpPopup(text, color) {
  const floorY = H - 24;
  const catY   = floorY - 16 * PX + 4;
  xpPopups.push({ text, x: catX + 7 * PX, y: catY - 8, color, alpha: 1.0, dy: 0.6 });
}

function tickXpPopups() {
  for (let i = xpPopups.length - 1; i >= 0; i--) {
    const p = xpPopups[i];
    p.y    -= p.dy;
    p.alpha -= 0.02;
    if (p.alpha <= 0) { xpPopups.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha  = p.alpha;
    ctx.fillStyle    = p.color;
    ctx.font         = 'bold 11px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

// ── 직업 선택 화면 렌더링 ────────────────────────────────────────
function tickClassSelect(floorY) {
  classSelectFrame++;

  // 호버 Y 보간
  for (const card of CARDS) {
    const target = card.isHover ? -8 : 0;
    card.hoverY += (target - card.hoverY) * 0.18;
  }

  if (!selectAnim) {
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('직업을 선택하세요', W / 2, 14);
    ctx.textAlign = 'left';
    for (const card of CARDS) drawClassCard(card, 1);
    return;
  }

  const f = ++selectAnim.frame;

  if (f < 20) {
    // Phase 1: 선택 안 된 카드 페이드아웃
    const otherAlpha = 1 - f / 20;
    for (const card of CARDS) {
      drawClassCard(card, card.type === selectAnim.type ? 1 : otherAlpha);
    }
  } else if (f < 40) {
    // Phase 2: 선택된 카드를 화면 중앙으로 이동
    const t = (f - 20) / 20;
    const sel = CARDS.find(c => c.type === selectAnim.type);
    const ox = sel.x, oy = sel.y;
    drawClassCard(sel, 1, ox + (W / 2 - ox) * t, oy + (H / 2 - oy) * t);
  } else if (f < 65) {
    // Phase 3: 파티클 폭발
    if (f === 40) {
      for (let i = 0; i < 24; i++) spawnParticle('gold', W / 2, H / 2);
    }
    if (f % 3 === 0) {
      const sym = PALETTES[selectAnim.type]?.particle;
      for (let i = 0; i < 3; i++) {
        spawnParticle(sym ? 'attr' : 'gold', W / 2, H / 2, sym);
      }
    }
  } else if (f < 95) {
    // Phase 4: 캐릭터 줌인
    catScale = (f - 65) / 30;
    renderCharacterZoom(floorY);
  } else {
    catScale = 1;
    classSelectMode = false;
    selectAnim = null;
    persistCatData({ catType: catData.catType });
    vscode.postMessage({ type: 'save_state', data: Object.assign({}, catData) });
    startState('sit');
  }
}

function renderCharacterZoom(floorY) {
  const spriteH = 16 * PX;
  const cy = floorY - spriteH + 4;
  catX = W / 2 - 7 * PX;
  ctx.save();
  ctx.translate(catX + 7 * PX, cy + 16 * PX);
  ctx.scale(catScale, catScale);
  ctx.translate(-7 * PX, -16 * PX);
  drawCat(0, 0, 'sit', 0, false);
  ctx.restore();
}

// ── 횡스크롤 배경 헬퍼 ──────────────────────────────────────────

function getZone(level) {
  if (level >= 5) return 'castle';
  if (level >= 4) return 'wasteland';
  if (level >= 3) return 'mountain';
  if (level >= 2) return 'forest';
  return 'village';
}

function updateScrollSpeed() {
  if (isResting) { scrollSpeed = 0; return; }
  const hpPct = displayHp / maxHp;
  const base  = hpPct <= 0.3 ? 0.6 : 1.0;
  scrollSpeed = scrollBoostTimer > 0 ? 3.0 : base;
  if (scrollBoostTimer > 0) scrollBoostTimer--;
}

// ── Sky Layer (속도 × 0.1) ───────────────────────────────────────
function drawZoneSky(zone, off) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  const skies = {
    village:   ['#87ceeb', '#c8e6ff'],
    forest:    ['#0a1a18', '#142a25'],
    mountain:  ['#2a3040', '#506080'],
    wasteland: ['#2a0000', '#6a1000'],
    castle:    ['#000008', '#0a0018'],
  };
  const [top, bot] = skies[zone] ?? skies.village;
  grad.addColorStop(0, top);
  grad.addColorStop(1, bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (zone === 'village') {
    // 태양
    const sunX = ((W * 0.75 - off * 0.05) % W + W) % W;
    ctx.fillStyle = '#ffe060';
    ctx.beginPath(); ctx.arc(sunX, H * 0.18, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff080';
    ctx.beginPath(); ctx.arc(sunX, H * 0.18, 9, 0, Math.PI * 2); ctx.fill();
    // 구름 (2개, 서로 다른 속도)
    const c1x = ((W * 0.2 - off * 0.3) % W + W) % W;
    const c2x = ((W * 0.65 - off * 0.2) % W + W) % W;
    for (const [cx, cy, r] of [[c1x, H*0.15, 12],[c1x+14, H*0.13, 16],[c1x+28, H*0.15, 12],
                                [c2x, H*0.22, 10],[c2x+12, H*0.20, 14],[c2x+24, H*0.22, 10]]) {
      ctx.fillStyle = '#ffffffcc'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    }
  } else if (zone === 'forest') {
    // 별 + 초승달
    ctx.fillStyle = '#ffffff55';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + 17 - off * 0.05) % W;
      const sy = (i * 211 + 31) % (H * 0.55);
      ctx.beginPath(); ctx.arc((sx + W) % W, sy, i % 4 === 0 ? 1.5 : 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#c8d8e8';
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a1a18';
    ctx.beginPath(); ctx.arc(W * 0.8 + 6, H * 0.15 - 2, 10, 0, Math.PI * 2); ctx.fill();
  } else if (zone === 'mountain') {
    // 옅은 구름
    const c1x = ((W * 0.3 - off * 0.15) % W + W) % W;
    const c2x = ((W * 0.7 - off * 0.12) % W + W) % W;
    for (const [cx, cy, r] of [[c1x, H*0.25, 18],[c1x+20, H*0.22, 22],[c1x+40, H*0.25, 18],
                                [c2x, H*0.18, 14],[c2x+16, H*0.16, 18],[c2x+32, H*0.18, 14]]) {
      ctx.fillStyle = '#c0c8d055'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    }
  } else if (zone === 'wasteland') {
    // 붉은 먼지 줄기
    ctx.fillStyle = '#ff400018';
    for (let i = 0; i < 5; i++) {
      const dx = ((i * 80 - off * 0.4) % W + W) % W;
      ctx.fillRect(dx, H * 0.1 + i * 14, 60 + i * 10, 8);
    }
  } else if (zone === 'castle') {
    // 밝은 별
    ctx.fillStyle = '#ffffff88';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 97 + 11 - off * 0.03) % W;
      const sy = (i * 173 + 7) % (H * 0.6);
      ctx.beginPath(); ctx.arc((sx + W) % W, sy, i % 5 === 0 ? 2 : 1, 0, Math.PI*2); ctx.fill();
    }
    // 붉은 달
    const moonX = ((W * 0.15 - off * 0.04) % W + W) % W;
    ctx.fillStyle = '#cc2200cc';
    ctx.beginPath(); ctx.arc(moonX, H * 0.2, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff4400aa';
    ctx.beginPath(); ctx.arc(moonX, H * 0.2, 11, 0, Math.PI*2); ctx.fill();
  }
}

// ── Mid Layer (속도 × 0.5) ───────────────────────────────────────
function drawZoneMid(zone, off, floorY) {
  const midY = floorY;

  if (zone === 'village') {
    // 언덕
    const hillW = W * 1.2;
    const hx = -((off * 0.5) % hillW);
    for (let i = 0; i < 3; i++) {
      const bx = hx + i * hillW;
      ctx.fillStyle = '#5aab30';
      ctx.beginPath();
      ctx.ellipse(bx + hillW * 0.35, midY + 2, hillW * 0.4, 38, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#4a9020';
      ctx.beginPath();
      ctx.ellipse(bx + hillW * 0.72, midY + 4, hillW * 0.32, 28, 0, Math.PI, 0);
      ctx.fill();
    }
    // 소나무 실루엣 (tileW = 80)
    const tileW = 80;
    const baseX = -((off * 0.6) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      const h = 36 + (Math.round(x / tileW) % 3) * 8;
      ctx.fillStyle = '#2a6020';
      ctx.beginPath();
      ctx.moveTo(x + 10, midY - h);
      ctx.lineTo(x + 20, midY - h * 0.55);
      ctx.lineTo(x + 16, midY - h * 0.55);
      ctx.lineTo(x + 22, midY - h * 0.25);
      ctx.lineTo(x + 18, midY - h * 0.25);
      ctx.lineTo(x + 24, midY);
      ctx.lineTo(x, midY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (zone === 'forest') {
    // 울창한 나무 실루엣
    const tileW = 56;
    const baseX = -((off * 0.7) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      const seed = Math.abs(Math.round(x / tileW)) % 5;
      const h = 48 + seed * 12;
      ctx.fillStyle = seed % 2 === 0 ? '#1a3020' : '#223828';
      ctx.fillRect(x + 8, midY - h, 14, h);
      ctx.beginPath();
      ctx.ellipse(x + 15, midY - h, 18, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (zone === 'mountain') {
    // 바위 봉우리
    const tileW = 100;
    const baseX = -((off * 0.4) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      const seed = Math.abs(Math.round(x / tileW)) % 4;
      const peakH = 55 + seed * 18;
      const pw = 50 + seed * 10;
      ctx.fillStyle = '#4a5060';
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x + pw * 0.5, midY - peakH);
      ctx.lineTo(x + pw, midY);
      ctx.closePath();
      ctx.fill();
      // 설산 흰 부분
      ctx.fillStyle = '#d8e8f0';
      ctx.beginPath();
      ctx.moveTo(x + pw * 0.35, midY - peakH * 0.75);
      ctx.lineTo(x + pw * 0.5, midY - peakH);
      ctx.lineTo(x + pw * 0.65, midY - peakH * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  } else if (zone === 'wasteland') {
    // 마른 나무
    const tileW = 90;
    const baseX = -((off * 0.5) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      const seed = Math.abs(Math.round(x / tileW)) % 3;
      const h = 30 + seed * 12;
      ctx.fillStyle = '#5a3820';
      ctx.fillRect(x + 14, midY - h, 4, h);
      // 가지
      ctx.fillRect(x + 8,  midY - h * 0.7, 10, 3);
      ctx.fillRect(x + 14, midY - h * 0.5, 12, 3);
      if (seed === 0) ctx.fillRect(x + 6, midY - h * 0.85, 8, 3);
    }
    // 폐허 실루엣 (한 번만)
    const rx = ((W * 0.5 - off * 0.35) % W + W) % W;
    ctx.fillStyle = '#3a1808';
    ctx.fillRect(rx, midY - 45, 30, 45);
    ctx.fillRect(rx + 35, midY - 35, 20, 35);
    ctx.fillRect(rx - 5, midY - 20, 15, 20);
  } else if (zone === 'castle') {
    // 마왕성 실루엣 (반복 타일)
    const tileW = W;
    const baseX = -((off * 0.3) % tileW);
    for (let bx = baseX; bx < W + tileW; bx += tileW) {
      ctx.fillStyle = '#0a0010';
      // 성벽 기반
      ctx.fillRect(bx + 10, floorY - 50, W - 20, 50);
      // 첨탑들
      const towers = [[0.15, 80], [0.35, 65], [0.5, 90], [0.65, 70], [0.85, 75]];
      for (const [rx, th] of towers) {
        const tx = bx + rx * W;
        ctx.fillRect(tx - 12, floorY - th, 24, th);
        // 뾰족 지붕
        ctx.beginPath();
        ctx.moveTo(tx - 12, floorY - th);
        ctx.lineTo(tx, floorY - th - 20);
        ctx.lineTo(tx + 12, floorY - th);
        ctx.fill();
        // 창문 (붉은 빛)
        ctx.fillStyle = '#cc000044';
        ctx.fillRect(tx - 4, floorY - th + 14, 8, 10);
        ctx.fillStyle = '#0a0010';
      }
    }
  }
}

// ── Ground Layer (속도 × 1.0) ────────────────────────────────────
function drawZoneGround(zone, off, floorY) {
  const grounds = {
    village:   ['#4a8030', '#6aab40', '#3a6020'],
    forest:    ['#2a1a0a', '#3a2510', '#1a1008'],
    mountain:  ['#4a5060', '#606878', '#3a4050'],
    wasteland: ['#5a2810', '#7a3818', '#3a1808'],
    castle:    ['#1a1420', '#221830', '#120e18'],
  };
  const [main, top, dark] = grounds[zone] ?? grounds.village;

  ctx.fillStyle = main;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = top;
  ctx.fillRect(0, floorY, W, 3);

  if (zone === 'village') {
    // 꽃 도트 (빨강/노랑)
    const tileW = 36;
    const baseX = -((off * 1.0) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      const seed = Math.abs(Math.round(x / tileW)) % 3;
      ctx.fillStyle = seed === 0 ? '#ff4060' : seed === 1 ? '#ffe040' : '#ff80a0';
      ctx.fillRect(Math.round(x) + 4, floorY + 5, 4, 4);
      ctx.fillRect(Math.round(x) + 20, floorY + 8, 3, 3);
    }
  } else if (zone === 'forest') {
    // 이끼 패치
    const tileW = 44;
    const baseX = -((off * 1.0) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      ctx.fillStyle = '#1a3010';
      ctx.fillRect(Math.round(x) + 2, floorY + 4, 16, 5);
      ctx.fillRect(Math.round(x) + 26, floorY + 6, 10, 4);
    }
  } else if (zone === 'mountain') {
    // 돌 도트
    const tileW = 28;
    const baseX = -((off * 1.0) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(x) + 3, floorY + 5, 7, 5);
      ctx.fillRect(Math.round(x) + 16, floorY + 8, 5, 4);
    }
  } else if (zone === 'wasteland') {
    // 균열 선
    const tileW = 52;
    const baseX = -((off * 1.0) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(x) + 4, floorY + 4, 2, 10);
      ctx.fillRect(Math.round(x) + 5, floorY + 8, 14, 2);
      ctx.fillRect(Math.round(x) + 28, floorY + 5, 2, 8);
    }
  } else if (zone === 'castle') {
    // 보라 룬 도트
    const tileW = 60;
    const baseX = -((off * 1.0) % tileW);
    for (let x = baseX; x < W + tileW; x += tileW) {
      ctx.fillStyle = '#6020a044';
      ctx.fillRect(Math.round(x) + 5, floorY + 5, 6, 6);
      ctx.fillRect(Math.round(x) + 35, floorY + 8, 4, 4);
    }
  }
}

// ── 배경 (패럴랙스) ──────────────────────────────────────────────
function drawBG() {
  updateScrollSpeed();
  scrollOffset = (scrollOffset + scrollSpeed) % (W * 100 || 1);
  const floorY = H - 24;
  const zone   = getZone(catData.level);

  drawZoneSky(zone, scrollOffset * 0.1);
  drawZoneMid(zone, scrollOffset * 0.5, floorY);
  drawZoneGround(zone, scrollOffset, floorY);

  // 존 전환 오버레이
  if (zoneTrans) {
    if (zoneTrans.phase === 'in') {
      zoneTrans.alpha = Math.min(1, zoneTrans.alpha + 0.08);
      if (zoneTrans.alpha >= 1) { zoneTrans.phase = 'hold'; zoneTrans.hold = 12; }
    } else if (zoneTrans.phase === 'hold') {
      if (--zoneTrans.hold <= 0) zoneTrans.phase = 'out';
    } else {
      zoneTrans.alpha = Math.max(0, zoneTrans.alpha - 0.08);
      if (zoneTrans.alpha <= 0) { zoneTrans = null; }
    }
  }
  if (zoneTrans) {
    ctx.save();
    ctx.globalAlpha = zoneTrans.alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    if (zoneTrans.phase !== 'in') {
      ctx.globalAlpha = zoneTrans.alpha;
      ctx.fillStyle = '#ffe080';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zoneTrans.text, W / 2, H / 2);
    }
    ctx.restore();
  }

  return floorY;
}

// ── 모닥불 스프라이트 ────────────────────────────────────────────
function drawCampfire(cx, floorY, alpha, frame) {
  const flicker = Math.floor(frame / 3) % 2 === 0;
  const bx = Math.round(cx - 12);
  const by = floorY - 32;

  ctx.save();

  // 바닥 주황빛 글로우
  ctx.globalAlpha = alpha * 0.25;
  const glow = ctx.createRadialGradient(cx, floorY, 4, cx, floorY, 52);
  glow.addColorStop(0, '#ff6b35');
  glow.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 52, floorY - 52, 104, 72);

  ctx.globalAlpha = alpha;

  // 불씨 (베이스)
  ctx.fillStyle = '#e05010';
  ctx.fillRect(bx + 6, by + 18, 12, 6);

  // 불꽃 (2프레임 교차)
  if (flicker) {
    ctx.fillStyle = '#ff6b35'; ctx.fillRect(bx + 4, by + 11, 16,  7);
    ctx.fillStyle = '#f7c59f'; ctx.fillRect(bx + 8, by +  6,  8,  5);
    ctx.fillStyle = '#efefd0'; ctx.fillRect(bx + 10, by + 2,  4,  4);
  } else {
    ctx.fillStyle = '#ff6b35'; ctx.fillRect(bx + 4, by + 10, 16,  8);
    ctx.fillStyle = '#f7c59f'; ctx.fillRect(bx + 6, by +  4, 10,  6);
    ctx.fillStyle = '#efefd0'; ctx.fillRect(bx + 8, by +  0,  4,  4);
  }

  // 통나무
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(bx,      by + 24, 24, 8);
  ctx.fillStyle = '#6b3a1f'; ctx.fillRect(bx + 2,  by + 26, 20, 4);
  ctx.fillStyle = '#a07040'; ctx.fillRect(bx + 4,  by + 24,  4, 2);
  ctx.fillStyle = '#a07040'; ctx.fillRect(bx + 14, by + 24,  4, 2);

  ctx.restore();
}

function spawnEmber(x, y) {
  campEmbers.push({
    x, y,
    vx: (Math.random() - 0.5) * 1.6,
    vy: -0.8 - Math.random() * 1.4,
    life: 1.0,
    size: 2 + Math.random() * 2,
    color: Math.random() < 0.5 ? '#ff6b35' : '#ffd060',
  });
}

function tickEmbers() {
  for (let i = campEmbers.length - 1; i >= 0; i--) {
    const e = campEmbers[i];
    e.x  += e.vx;
    e.y  += e.vy;
    e.vy *= 0.99;
    e.life -= 0.022;
    if (e.life <= 0) { campEmbers.splice(i, 1); continue; }
    ctx.globalAlpha = e.life * 0.85;
    ctx.fillStyle = e.color;
    ctx.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
    ctx.globalAlpha = 1;
  }
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
  if (r < 0.35) return 'walk';
  if (r < 0.55) return 'groom';
  if (r < 0.75) return 'code';
  return 'sit';
}

function startState(s) {
  catState = s;
  catFrame = 0;
  switch (s) {
    case 'walk':  stateTimer = 120 + Math.random() * 180; setMood('walking', '#4a8a5a');      break;
    case 'sit':   stateTimer = 100 + Math.random() * 160; setMood('sitting', '#888');          break;
    case 'groom': stateTimer = 100 + Math.random() * 80;  setMood('grooming ✧', '#a080d0');   break;
    case 'sleep': stateTimer = 9999;                       setMood('sleeping 💤', '#5070a0');  break;
    case 'eat':   stateTimer = 140;                        setMood('eating 🐟', '#4a9eff');    break;
    case 'happy':      stateTimer = 100;                       setMood('victory! ♥', '#ff6a88'); break;
    case 'code':       stateTimer = 180; facingLeft = false;   setMood('coding 💻', '#4aff70');  break;
    case 'run':        stateTimer = 24;  facingLeft = false;   setMood('달려! ▶', '#ffaa00');    break;
    case 'flag_plant': stateTimer = 36;  facingLeft = false;   setMood('커밋! ⚑', '#aaffaa');   break;
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
    if (catFrame % 15 === 0) {
      const sym = catData.catType && PALETTES[catData.catType] && PALETTES[catData.catType].particle;
      spawnParticle(sym ? 'attr' : 'sparkle', catX + 14 * PX, catY + 4 * PX, sym);
    }
    if (stateTimer <= 0) startState('sit');
  } else if (catState === 'happy') {
    if (catFrame % 10 === 0) {
      const sym = catData.catType && PALETTES[catData.catType] && PALETTES[catData.catType].particle;
      spawnParticle(sym ? 'attr' : 'heart', catX + 7 * PX, catY, sym);
    }
    if (stateTimer <= 0) startState('sit');
  } else if (catState === 'code') {
    if (catFrame % 20 === 0) spawnParticle('codebit', catX + 10 * PX, catY - PX);
    if (stateTimer <= 0) startState('sit');
  } else if (catState === 'run') {
    catX += facingLeft ? -SPEED * 2.5 : SPEED * 2.5;
    const runMargin = 20;
    if (catX < runMargin)               { catX = runMargin;              facingLeft = false; }
    if (catX > W - 14 * PX - runMargin) { catX = W - 14 * PX - runMargin; facingLeft = true; }
    if (catFrame % 4 === 0) {
      const dustX = facingLeft ? catX + 14 * PX : catX;
      spawnParticle('dust', dustX, catY + 14 * PX);
    }
    if (stateTimer <= 0) startState('walk');
  } else if (catState === 'flag_plant') {
    if (stateTimer <= 0) startState('walk');
  }

  ctx.save();
  ctx.translate(Math.round(catX), catY);
  applyPalette(catData.catType);
  if (catData.level >= 5) {
    const lv5 = { fire: '#ffd700', water: '#c0e8ff', grass: '#d4ff70' };
    if (lv5[catData.catType]) OG = lv5[catData.catType];
  }
  drawCat(0, 0, catState, catFrame, facingLeft);
  ctx.restore();

  if (catData.level >= 5 && catFrame % 10 === 0) {
    const sym = catData.catType && PALETTES[catData.catType]?.particle;
    spawnParticle(sym ? 'attr' : 'sparkle', catX + 7 * PX, catY + 4 * PX, sym);
  }
}

// ── 메인 루프 ────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastTime < 1000 / 30) return; // ~30fps
  lastTime = ts;
  const floorY = drawBG();

  // 모닥불 (고양이 뒤에 그려야 하므로 cat 렌더 전에 배치)
  if (isResting || campfireAlpha > 0) {
    campfireAlpha = isResting
      ? Math.min(1, campfireAlpha + 0.04)   // 페이드인 ~0.8s
      : Math.max(0, campfireAlpha - 0.08);  // 페이드아웃
    if (isResting) {
      campfireFrame++;
      if (campfireFrame % 18 === 0) spawnEmber(W / 2, floorY - 30);
    }
    drawCampfire(W / 2, floorY, campfireAlpha, campfireFrame);
  }

  if (classSelectMode) {
    tickClassSelect(floorY);
  } else {
    tickState(floorY);
  }

  // 불씨 파티클 (고양이 위)
  tickEmbers();

  // "체력이 바닥났습니다…" 오버레이 (자동캠프 시)
  if (isResting && showAutoRestMsg && campfireAlpha > 0.5) {
    ctx.globalAlpha = Math.min(1, (campfireAlpha - 0.5) * 2);
    ctx.fillStyle = '#ff9966';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('체력이 바닥났습니다…', W / 2, floorY - 52);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // "출발!" 팝업
  if (departText) {
    ctx.globalAlpha = departText.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('출발!', W / 2, H / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
    departText.alpha -= 0.025;
    if (departText.alpha <= 0) departText = null;
  }

  // HP 30% 이하: 캐릭터 외곽 붉은 윤곽선 깜빡임
  if (!isResting && !classSelectMode && catData.catType && displayHp / maxHp <= 0.3 && catFrame % 30 < 15) {
    const catY = floorY - 16 * PX + 4;
    ctx.save();
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(catX) - 2, catY - 2, 14 * PX + 4, 16 * PX + 4);
    ctx.restore();
  }
  // HP 10% 이하: 화면 모서리 붉은 vignette
  if (!isResting && !classSelectMode && catData.catType && displayHp / maxHp <= 0.1) {
    const vignAlpha = 0.3 + Math.sin(catFrame / 10) * 0.1;
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, `rgba(180,0,0,${vignAlpha.toFixed(2)})`);
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);
  }

  tickHP();
  drawHPBar();
  tickParticles();
  tickXpPopups();

  // 레벨업 연출
  if (levelUpAnim) {
    levelUpAnim.timer--;
    const t   = levelUpAnim.timer;
    const max = levelUpAnim.maxTimer;
    // 흰색 플래시 (처음 ~3프레임)
    if (t > max - 4) {
      ctx.save();
      ctx.globalAlpha = (t - (max - 4)) / 3;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // "LEVEL UP!" 텍스트
    if (t <= max - 3) {
      const fadeOut = t < 25 ? t / 25 : 1;
      ctx.save();
      ctx.globalAlpha  = fadeOut;
      ctx.fillStyle    = '#ffd700';
      ctx.font         = 'bold 20px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ LEVEL UP! ✨', W / 2, H / 2 - 14);
      ctx.fillStyle = '#ffffcc';
      ctx.font      = '12px monospace';
      ctx.fillText('Lv.' + levelUpAnim.newLevel + '으로 성장했다!', W / 2, H / 2 + 12);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.restore();
    }
    if (levelUpAnim.timer <= 0) levelUpAnim = null;
  }
}

startState('sit');
catX = W / 2 - 7 * PX;
requestAnimationFrame(loop);
vscode.postMessage({ type: 'ready' });

// ── 커맨드 수신 (extension → webview) ───────────────────────────
function feed()          { startState('eat'); }
function pet()           { startState('happy'); }
function goSleep()       { startState(catState === 'sleep' ? 'sit' : 'sleep'); }
function startCode()     { startState('code'); }
function toggleRest()    { if (catData.catType) vscode.postMessage({ type: 'rest_requested' }); }

window.addEventListener('message', e => {
  const { type, data } = e.data;
  if (type === 'init')       { catData = data; classSelectMode = catData.catType === null; updateCardPositions(); }
  if (type === 'state_loaded') {
    Object.assign(catData, data);
    maxHp    = HP_STATS[catData.catType]?.maxHp ?? 100;
    targetHp = catData.hp ?? maxHp;
    displayHp = targetHp;
    classSelectMode = catData.catType === null;
    if (classSelectMode) updateCardPositions();
  }
  if (type === 'food')     feed();
  if (type === 'pet')      pet();
  if (type === 'sleep')    goSleep();
  if (type === 'code')     startCode();
  if (type === 'xpUpdate') {
    Object.assign(catData, data);
    if (data.xpGained && data.xpGained > 0) spawnXpPopup('+' + data.xpGained + ' XP', '#9b59b6');
  }
  if (type === 'levelUp') {
    const oldZone = getZone(e.data.oldLevel ?? (e.data.level - 1));
    const newZone = getZone(e.data.level);
    catData.level = e.data.level;
    startState('happy');
    const floorY = H - 24;
    const catY   = floorY - 16 * PX + 4;
    const sym    = catData.catType && PALETTES[catData.catType] && PALETTES[catData.catType].particle;
    for (let i = 0; i < 30; i++) {
      spawnParticle(sym ? 'attr' : 'gold', catX + 7 * PX, catY + 8 * PX, sym);
    }
    levelUpAnim = { timer: 60, maxTimer: 60, newLevel: e.data.level };
    if (newZone !== oldZone) {
      zoneTrans = { phase: 'in', alpha: 0, hold: 12, text: '새로운 땅에 발을 디뎠다' };
    }
  }
  if (type === 'flag_plant') startState('flag_plant');
  if (type === 'scroll_boost') {
    scrollBoostTimer = 24;
    if (!isResting) startState('run');
  }
  if (type === 'typing_start') {
    const interruptible = ['walk', 'sit', 'groom', 'code'];
    if (!isResting && !classSelectMode && interruptible.includes(catState)) {
      startState('walk');
    }
  }
  if (type === 'typing_stop') {
    if (!isResting && !classSelectMode && catState === 'walk') {
      startState('sit');
    }
  }
  if (type === 'hp_changed') {
    catData.hp = e.data.hp;
    maxHp      = e.data.maxHp;
    targetHp   = e.data.hp;
    if (targetHp < displayHp) displayHp = targetHp;
    if (e.data.delta !== undefined) {
      const d = Math.round(e.data.delta);
      if (Math.abs(d) >= 2) {
        spawnXpPopup((d > 0 ? '+' : '') + d + ' HP', d > 0 ? '#2ecc71' : '#e74c3c');
      }
    }
  }
  if (type === 'monster_spawn') { /* TASK-09 전 placeholder */ }
  if (type === 'rest_start') {
    isResting = true;
    campfireAlpha = 0;
    campfireFrame = 0;
    showAutoRestMsg = e.data.autoRest || false;
    startState('sleep');
    const btn = document.getElementById('restBtn');
    btn.textContent = '⚔️ 모험 재개';
    btn.style.background = '#1a1a2a';
    btn.style.borderColor = '#4a6aff';
    btn.style.color = '#4a6aff';
  }
  if (type === 'rest_end') {
    isResting = false;
    showAutoRestMsg = false;
    departText = { alpha: 1.0 };
    startState('sit');
    const btn = document.getElementById('restBtn');
    btn.textContent = '⛺ 쉬기';
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
});

// ── 직업 카드 hover 감지 ──────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (!classSelectMode || selectAnim) return;
  const r  = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const cw = Math.floor(W / 3);
  const CW = Math.max(50, cw - 10);
  const CH = 98;
  for (const card of CARDS) {
    const bx = card.x - CW / 2;
    const by = card.y - CH / 2;
    card.isHover = mx >= bx && mx <= bx + CW && my >= by && my <= by + CH;
  }
});

// ── 캔버스 클릭 ──────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  const r  = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  if (classSelectMode && !selectAnim) {
    const cw = Math.floor(W / 3);
    const CW = Math.max(50, cw - 10);
    const CH = 98;
    for (const card of CARDS) {
      const bx = card.x - CW / 2;
      const by = card.y - CH / 2;
      if (mx >= bx && mx <= bx + CW && my >= by && my <= by + CH) {
        catData.catType = card.type;
        selectAnim = { type: card.type, frame: 0 };
        catX = W / 2 - 7 * PX;
        return;
      }
    }
    return;
  }

  const floorY  = H - 24;
  const spriteH = 16 * PX;
  const catY    = floorY - spriteH + 4;
  if (mx > catX && mx < catX + 14 * PX && my > catY && my < catY + 16 * PX) {
    vscode.postMessage({ type: 'meow' });
    startState('happy');
  }
});
</script>
</body>
</html>`;
}

function deactivate() {
  // 상태는 saveCatData를 통해 변경 즉시 저장되므로 별도 flush 불필요
}

module.exports = { activate, deactivate };

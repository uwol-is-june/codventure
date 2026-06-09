'use strict';
const vscode = require('vscode');
const { EGG_PALETTE, EGG_FRAMES }                 = require('./src/sprites/egg');
const { BABY_PALETTE, BABY_FRAMES }               = require('./src/sprites/baby');
const { IN_TRAINING_PALETTE, IN_TRAINING_FRAMES } = require('./src/sprites/inTraining');
const { ROOKIE_PALETTE, ROOKIE_FRAMES }           = require('./src/sprites/rookie');
const { CHAMPION_PALETTE, CHAMPION_FRAMES }       = require('./src/sprites/champion');
const { ULTIMATE_PALETTE, ULTIMATE_FRAMES }       = require('./src/sprites/ultimate');
const { MEGA_PALETTE, MEGA_FRAMES }               = require('./src/sprites/mega');
const { getMonster, levelToStage, getSpriteIndex, thresholdFor, isSad } = require('./src/MonsterState');
const { XpTracker }                               = require('./src/XpTracker');

// stageIdx → sprite data
// 인덱스 = evolutionStage (0=알, 1=유아기, 2=유아기II, …)
const SPRITES = [
  { palette: EGG_PALETTE,         frames: EGG_FRAMES         },          // 0: 알
  { palette: BABY_PALETTE,        frames: BABY_FRAMES        },          // 1: 유아기
  { palette: IN_TRAINING_PALETTE, frames: IN_TRAINING_FRAMES },          // 2: 유아기 II
  { palette: ROOKIE_PALETTE,      frames: ROOKIE_FRAMES      },          // 3: 성장기
  { palette: CHAMPION_PALETTE,   frames: CHAMPION_FRAMES    },          // 4: 성숙기
  { palette: ULTIMATE_PALETTE,  frames: ULTIMATE_FRAMES    },          // 5: 완전체
  { palette: MEGA_PALETTE,      frames: MEGA_FRAMES        },          // 6: 궁극체
];

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) nonce += chars[Math.floor(Math.random() * chars.length)];
  return nonce;
}

class CodventureProvider {
  constructor(extensionUri, context) {
    this._extensionUri = extensionUri;
    this._context      = context;
    this._webviewView  = null;
  }

  // TASK-06-4: 범용 postMessage (XpTracker 에서도 사용)
  postMessage(msg) {
    if (this._webviewView) {
      this._webviewView.webview.postMessage(msg);
    }
  }

  resolveWebviewView(webviewView) {
    this._webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview'),
        vscode.Uri.joinPath(this._extensionUri, 'assets'),
      ],
    };

    const nonce       = getNonce();
    const rendererUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'renderer.js')
    );

    // TASK-06-4: globalState 에서 실제 스테이지 읽기
    const monster     = getMonster(this._context);
    const initStage   = getSpriteIndex(monster.species, levelToStage(monster.level));
    const spritesJson = JSON.stringify(SPRITES);
    const hudJson     = JSON.stringify({
      level:  monster.level,
      xp:     monster.xp,
      xpMax:  thresholdFor(monster.level),
      isSad:  isSad(monster),
    });

    const soundEnabled = vscode.workspace.getConfiguration('codventure').get('sound', false);

    const assetUri = (name) =>
      webviewView.webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'assets', name)
      ).toString();
    const assetsJson = JSON.stringify({
      grass:      assetUri('sv_grass.png'),
      dirt:       assetUri('sv_dirt.png'),
      sand:       assetUri('sv_sand.png'),
      grassFall:  assetUri('sv_grass_fall.png'),
      decoration: assetUri('sv_decoration.png'),
    });

    webviewView.webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           script-src ${webviewView.webview.cspSource} 'nonce-${nonce}';
           style-src 'unsafe-inline';
           img-src ${webviewView.webview.cspSource};">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    overflow: hidden;
    background: var(--vscode-sideBar-background);
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  canvas {
    display: block;
    width: min(100vw, 100vh);
    height: min(100vw, 100vh);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  #toast {
    position: absolute;
    bottom: 48px;
    width: 100%;
    text-align: center;
    font-family: monospace;
    font-size: 11px;
    pointer-events: none;
    opacity: 0;
    color: var(--vscode-charts-yellow);
  }
</style>
</head>
<body>
<canvas id="c" width="128" height="128"></canvas>
<div id="toast"></div>
<script nonce="${nonce}">
  const SPRITES      = ${spritesJson};
  const STAGE        = ${initStage};
  const ASSETS       = ${assetsJson};
  const HUD_STATE    = ${hudJson};
  const SOUND_ENABLED = ${soundEnabled};
</script>
<script src="${rendererUri}"></script>
</body>
</html>`;
  }
}

function activate(context) {
  const provider = new CodventureProvider(context.extensionUri, context);
  const tracker  = new XpTracker(context, provider);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codventure', provider)
  );

  // TASK-06-4: 파일 저장 → XpTracker.onSave() 위임
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => tracker.onSave())
  );

  // TASK-10.4: codventure.sound 설정 변경 시 웹뷰에 전달
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('codventure.sound')) {
        const enabled = vscode.workspace.getConfiguration('codventure').get('sound', false);
        provider.postMessage({ type: 'SOUND_ENABLED', enabled });
      }
    })
  );

  // TASK-10.2: 비활성 패널티 — 1시간마다 sad 상태 체크 후 웹뷰에 전송
  const sadCheckId = setInterval(() => {
    const m = getMonster(context);
    provider.postMessage({ type: 'SAD_STATE', isSad: isSad(m) });
  }, 3600000);
  context.subscriptions.push({ dispose: () => clearInterval(sadCheckId) });
}

function deactivate() {}

module.exports = { activate, deactivate };

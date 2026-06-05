'use strict';
const vscode = require('vscode');
const { EGG_PALETTE, EGG_FRAMES }                 = require('./src/sprites/egg');
const { BABY_PALETTE, BABY_FRAMES }               = require('./src/sprites/baby');
const { IN_TRAINING_PALETTE, IN_TRAINING_FRAMES } = require('./src/sprites/inTraining');
const { getMonster, levelToStage }                = require('./src/MonsterState');
const { XpTracker }                               = require('./src/XpTracker');

// stageIdx → sprite data
// 인덱스 = evolutionStage (0=알, 1=유아기, 2=유아기II, …)
const SPRITES = [
  { palette: EGG_PALETTE,         frames: EGG_FRAMES         },          // 0: 알
  { palette: BABY_PALETTE,        frames: BABY_FRAMES        },          // 1: 유아기
  { palette: IN_TRAINING_PALETTE, frames: IN_TRAINING_FRAMES },          // 2: 유아기 II
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
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'webview')],
    };

    const nonce       = getNonce();
    const rendererUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'renderer.js')
    );

    // TASK-06-4: globalState 에서 실제 스테이지 읽기
    const monster     = getMonster(this._context);
    const initStage   = levelToStage(monster.level);
    const spritesJson = JSON.stringify(SPRITES);

    webviewView.webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           script-src ${webviewView.webview.cspSource} 'nonce-${nonce}';
           style-src 'unsafe-inline';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--vscode-sideBar-background);
  }
  canvas {
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
  const SPRITES = ${spritesJson};
  const STAGE   = ${initStage};
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
}

function deactivate() {}

module.exports = { activate, deactivate };

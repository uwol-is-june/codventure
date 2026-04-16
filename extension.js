// pixel_cat — VSCode 익스텐션 진입점
// 고양이 상태를 관리하고 상태바 + Webview 패널을 통해 표시한다.

const vscode = require('vscode');

// 고양이 상태 정의
const CAT_STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  SITTING: 'sitting',
  GROOMING: 'grooming',
  SLEEPING: 'sleeping',
  EATING: 'eating',
};

/** @type {vscode.StatusBarItem} */
let statusBarItem;

/** @type {vscode.WebviewPanel | undefined} */
let catPanel;

/** 현재 고양이 상태 */
let catState = CAT_STATES.IDLE;

/**
 * 익스텐션 활성화 시 호출됨
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // 상태바 아이템 생성 (오른쪽 정렬, 낮은 우선순위)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    10
  );
  statusBarItem.text = '$(symbol-misc) 🐱 nyaa~';
  statusBarItem.tooltip = 'Pixel Cat — 클릭해서 열기';
  statusBarItem.command = 'pixel-cat.open';
  statusBarItem.show();

  // 커맨드 등록
  const commands = [
    vscode.commands.registerCommand('pixel-cat.open', () => openCatPanel(context)),
    vscode.commands.registerCommand('pixel-cat.food', () => feedCat()),
    vscode.commands.registerCommand('pixel-cat.pet', () => petCat()),
    vscode.commands.registerCommand('pixel-cat.sleep', () => sleepCat()),
  ];

  context.subscriptions.push(statusBarItem, ...commands);
}

/**
 * Webview 패널을 열거나 기존 패널을 포커스한다
 * @param {vscode.ExtensionContext} context
 */
function openCatPanel(context) {
  if (catPanel) {
    catPanel.reveal();
    return;
  }

  catPanel = vscode.window.createWebviewPanel(
    'pixelCat',
    'Pixel Cat',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  catPanel.webview.html = getCatHtml();

  // 패널이 닫히면 참조 해제
  catPanel.onDidDispose(() => {
    catPanel = undefined;
  });
}

/**
 * 고양이에게 먹이를 준다
 */
function feedCat() {
  catState = CAT_STATES.EATING;
  updateStatusBar('🐱🐟 냠냠...');
  sendStateToPanel(catState);
  vscode.window.showInformationMessage('고양이에게 생선을 줬다. 냠냠~');

  // 3초 후 idle 복귀
  setTimeout(() => {
    catState = CAT_STATES.IDLE;
    updateStatusBar('🐱 nyaa~');
    sendStateToPanel(catState);
  }, 3000);
}

/**
 * 고양이를 쓰다듬는다
 */
function petCat() {
  catState = CAT_STATES.GROOMING;
  updateStatusBar('🐱✨ 그루밍 중...');
  sendStateToPanel(catState);
  vscode.window.showInformationMessage('고양이를 쓰다듬었다. 골골~');

  setTimeout(() => {
    catState = CAT_STATES.SITTING;
    updateStatusBar('🐱 앉아있는 중');
    sendStateToPanel(catState);
  }, 3000);
}

/**
 * 고양이를 재운다
 */
function sleepCat() {
  catState = CAT_STATES.SLEEPING;
  updateStatusBar('🐱💤 zzz...');
  sendStateToPanel(catState);
  vscode.window.showInformationMessage('고양이가 잠들었다. zzz...');
}

/**
 * 상태바 텍스트를 업데이트한다
 * @param {string} text
 */
function updateStatusBar(text) {
  if (statusBarItem) {
    statusBarItem.text = text;
  }
}

/**
 * Webview 패널에 상태를 전송한다
 * @param {string} state
 */
function sendStateToPanel(state) {
  if (catPanel) {
    catPanel.webview.postMessage({ type: 'setState', state });
  }
}

/**
 * Webview에 표시할 HTML을 반환한다
 * Canvas로 고양이 픽셀아트를 렌더링한다
 * @returns {string}
 */
function getCatHtml() {
  return /* html */ `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Cat</title>
  <style>
    body {
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: monospace;
      color: #d4d4d4;
    }
    canvas {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      border: 1px solid #333;
    }
    #status {
      margin-top: 16px;
      font-size: 14px;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <canvas id="catCanvas" width="160" height="160"></canvas>
  <div id="status">idle</div>

  <script>
    const canvas = document.getElementById('catCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');

    // 픽셀 크기 (1픽셀 = 8px)
    const SCALE = 8;

    let currentState = 'idle';
    let frame = 0;
    let animInterval;

    // VSCode로부터 상태 메시지 수신
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'setState') {
        currentState = msg.state;
        statusEl.textContent = msg.state;
      }
    });

    // 캔버스 초기화
    function clearCanvas() {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 단일 픽셀 그리기 (픽셀 좌표 기준)
    function px(color, x, y) {
      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }

    // TODO: 실제 고양이 스프라이트 구현 (docs/features/animation.md 참고)
    // 임시: 간단한 placeholder 고양이 그리기
    function drawPlaceholderCat(frameIdx) {
      clearCanvas();

      const colors = {
        body: '#f5a623',
        outline: '#333',
        eye: '#222',
        nose: '#ff6b6b',
      };

      // 귀
      px(colors.body, 5, 3);
      px(colors.body, 6, 2);
      px(colors.body, 9, 2);
      px(colors.body, 10, 3);

      // 머리
      for (let y = 4; y <= 7; y++) {
        for (let x = 5; x <= 10; x++) {
          px(colors.body, x, y);
        }
      }

      // 눈 (frame에 따라 깜빡임)
      if (frameIdx % 8 !== 0) {
        px(colors.eye, 6, 5);
        px(colors.eye, 9, 5);
      } else {
        // 눈 깜빡임 — 가로선으로 표현
        px(colors.outline, 6, 5);
        px(colors.outline, 9, 5);
      }

      // 코
      px(colors.nose, 7, 6);
      px(colors.nose, 8, 6);

      // 몸통
      for (let y = 8; y <= 12; y++) {
        for (let x = 5; x <= 10; x++) {
          px(colors.body, x, y);
        }
      }

      // 꼬리 (frame에 따라 흔들림)
      const tailOffset = frameIdx % 4 < 2 ? 0 : 1;
      px(colors.body, 11, 11 + tailOffset);
      px(colors.body, 12, 10 + tailOffset);
      px(colors.body, 13, 9 + tailOffset);
    }

    // 애니메이션 루프
    function animate() {
      drawPlaceholderCat(frame);
      frame++;
    }

    // 60fps 기준 ~8fps 애니메이션
    animInterval = setInterval(animate, 120);
  </script>
</body>
</html>
  `;
}

/**
 * 익스텐션 비활성화 시 호출됨
 */
function deactivate() {
  if (catPanel) {
    catPanel.dispose();
  }
}

module.exports = { activate, deactivate };

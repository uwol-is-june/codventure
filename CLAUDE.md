# CLAUDE.md — Codventure

## 프로젝트 개요

VSCode 익스텐션. Explorer 사이드바 패널(WebviewView)에 콘텐츠를 렌더링한다.

## 기술 스택

| 항목 | 결정 |
|------|------|
| 언어 | JavaScript (Node.js / VSCode Extension API) |
| 렌더링 | HTML Canvas (Webview) |
| 의존성 | zero runtime dependencies |
| 상태 저장 | `ExtensionContext.globalState` |

## 파일 구조

- `extension.js` — 익스텐션 진입점 (activate/deactivate)
- `package.json` — 마켓플레이스 메타데이터 + contributes 정의

## 코드 컨벤션

- 주석: 한국어 OK
- 들여쓰기: 2스페이스, 세미콜론 있음
- WebviewView ID: `codventure`

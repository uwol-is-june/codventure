# CLAUDE.md — Codventure

## 프로젝트 개요

VSCode 안에서 코딩하면 판타지 캐릭터가 모험을 떠나는 횡스크롤 어드벤처 익스텐션.
캐릭터는 에디터 하단 상태바에 항상 표시되며, Explorer 사이드바 패널(캔버스)에서 볼 수 있다.
코드를 타이핑하면 캐릭터가 전진하고, 에러를 고치면 몬스터를 쓰러뜨린다.

**핵심 철학**: 코딩이 곧 모험이다. 개발자가 게임에 맞추지 않는다 — 게임이 개발자에게 맞춰진다.

---

## 기술 스택 및 아키텍처 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 언어 | TypeScript | 타입 안전성, VSCode API와의 자연스러운 통합 |
| 렌더링 | HTML Canvas (Webview) | 픽셀아트에 최적, 외부 의존성 없음 |
| 의존성 | zero dependencies | `node_modules` 없이 배포 가능 |
| 상태 저장 | `ExtensionContext.globalState` | VSCode 내장, 별도 DB 불필요 |
| 스프라이트 방식 | procedural drawing (Canvas 2D API) | PNG 파일 없이 코드로 픽셀 직접 묘사 |

### 아키텍처 흐름

```
src/extension.ts (activate)
  ├── StatusBarItem (Right)     → ⚔️ Lv.3 | ██████░░ HP | 1,240 XP, 클릭 시 패널 포커스
  ├── GameController.ts         → 전체 게임 상태 관리 (싱글턴)
  ├── EventDetector.ts          → VSCode 개발 행동 감지 → GameController로 이벤트 전달
  │     ├── onDidChangeTextDocument → 타이핑 감지
  │     ├── tasks.onDidEndTask      → 빌드/테스트 감지
  │     ├── git COMMIT_EDITMSG     → 커밋 감지
  │     └── onDidChangeDiagnostics → 에러/버그 감지
  ├── panel/GamePanel.ts        → WebviewViewProvider (Explorer 사이드바 패널)
  │     └── webview/
  │           ├── main.ts              → 메인 게임 루프 (Canvas)
  │           ├── game/StateMachine.ts → 애니메이션 상태 전환
  │           ├── renderer/            → CharacterRenderer, BackgroundRenderer, UIRenderer
  │           └── sprites/             → KnightSprite, MageSprite, ClericSprite
  └── storage/SaveManager.ts    → VSCode globalState 저장/로드
```

### 메시지 프로토콜 (Extension ↔ Webview)

```typescript
// Extension → Webview
type ExtensionMessage =
  | { type: 'xp_gained';    amount: number }
  | { type: 'hp_changed';   amount: number }
  | { type: 'monster_spawn'; monster: MonsterType }
  | { type: 'monster_defeat' }
  | { type: 'rest_start' }
  | { type: 'rest_end' }
  | { type: 'level_up';    newLevel: number }
  | { type: 'state_loaded'; state: GameState }

// Webview → Extension
type WebviewMessage =
  | { type: 'rest_requested' }
  | { type: 'ready' }
  | { type: 'save_state'; state: GameState }
```

---

## 현재 구현된 기능 체크리스트

- [x] 상태바에 캐릭터 표시
- [x] Explorer 사이드바 WebviewView 패널
- [x] Canvas 기반 렌더링 + 상태머신
- [x] 기본 파티클 시스템
- [x] 상태 영속성 (`globalState` 기반)
- [x] 마켓플레이스 배포 (v0.1.5)

---

## 앞으로 구현할 기능

### v0.2 (현재 진행)
- EventDetector — 타이핑/빌드/커밋/에러 감지 (TASK-05)
- HP 시스템 — 소모/회복/HP 바 UI (TASK-04)
- 휴식 시스템 — 캠프 씬 전환, 모닥불 연출 (TASK-06)
- 횡스크롤 배경 — 패럴랙스 3단, 존별 배경 (TASK-02)
- 캐릭터 렌더러 — 직업별 스프라이트, 9종 애니메이션 (TASK-03)
- 직업 선택 화면 — 최초 1회 (TASK-01)
- XP 팝업 & 레벨업 UI (TASK-07)
- 저장/로드 (TASK-08)

### v0.3
- 몬스터 & 전투 시스템 (TASK-09, TASK-10)

### v0.4
- 레벨별 캐릭터 진화 (TASK-11)
- 동료 시스템 (TASK-12)
- 마왕 이벤트 (TASK-13)

### v0.5
- 마켓플레이스 완성도 (README GIF, 설정값, 퍼포먼스 검증)

---

## 코드 컨벤션

- **주석**: 한국어 OK. 로직 설명은 한국어로 자유롭게 작성
- **스프라이트 드로잉**: `ctx.fillRect(x * scale, y * scale, scale, scale)` 패턴으로 픽셀 하나하나를 직접 그린다 (procedural). PNG 스프라이트시트 사용 금지
- **파일 구조**: `src/` — Extension 로직, `webview/` — Canvas 게임 로직으로 분리
- **포맷**: 들여쓰기 2스페이스, 세미콜론 있음
- **커맨드 ID**: `codventure.<action>` 형태 (예: `codventure.rest`)
- **상태바**: 오른쪽 정렬, priority 낮게 설정해 방해 최소화

---

## 문서 구조

| 파일 | 역할 |
|------|------|
| `docs/PLAN.md` | 기획안 — 설계 철학, 아키텍처, 데이터 모델, 버전별 목표 |
| `docs/TASK.md` | 현재 진행 태스크 목록 (v0.2), 의존성 순서, 완료 기준 |
| `docs/BACKLOG.md` | 추후 개발 요소 (v0.3~v0.5), 중요도 순 정렬 |
| `docs/features/` | 태스크별 1:1 세부 구현 스펙 (체크리스트, 코드 패턴) |

### docs/features/ 파일 목록 (TASK별 1:1 대응)

| 파일 | 태스크 |
|------|--------|
| `class-selection.md` | TASK-01 직업 선택 화면 |
| `background-scroll.md` | TASK-02 횡스크롤 배경 |
| `character-renderer.md` | TASK-03 캐릭터 렌더러 & 애니메이션 |
| `hp-system.md` | TASK-04 HP 시스템 |
| `event-detector.md` | TASK-05 EventDetector |
| `rest-system.md` | TASK-06 휴식 시스템 |
| `xp-levelup.md` | TASK-07 XP 팝업 & 레벨업 UI |
| `save-load.md` | TASK-08 저장/로드 |

**워크플로우**: TASK.md에서 현재 태스크 확인 → features/해당파일.md에서 세부 구현 스펙 참고 → 완료 후 체크리스트 업데이트

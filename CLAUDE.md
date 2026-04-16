# CLAUDE.md — pixel_cat

## 프로젝트 개요

VSCode 안에서 픽셀 고양이를 키우는 익스텐션.
고양이는 에디터 하단 상태바에 항상 표시되며, 별도 WebviewPanel(캔버스)에서 더 크게 볼 수 있다.
`/food`, `/pet`, `/sleep` 같은 커맨드로 고양이와 상호작용한다.

**목표**: 코딩할 때 옆에 있어주는 작은 동반자. 귀엽고, 가볍고, 방해되지 않아야 한다.

---

## 기술 스택 및 아키텍처 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 언어 | JavaScript (TypeScript 아님) | 빌드 스텝 없이 바로 실행, 단순함 유지 |
| 렌더링 | HTML Canvas (Webview) | 픽셀아트에 최적, 외부 의존성 없음 |
| 의존성 | zero dependencies | `node_modules` 없이 배포 가능 |
| 상태 저장 | `ExtensionContext.globalState` | VSCode 내장, 별도 DB 불필요 |
| 스프라이트 방식 | procedural drawing (Canvas 2D API) | PNG 파일 없이 코드로 픽셀 직접 묘사 |

### 아키텍처 흐름

```
extension.js (activate)
  ├── StatusBarItem  → 상태바에 고양이 이모지/텍스트 표시
  ├── WebviewPanel   → Canvas로 고양이 애니메이션 렌더링
  └── Commands       → /food, /pet, /sleep → 고양이 상태 변경
```

---

## 현재 구현된 기능 체크리스트

- [ ] 상태바에 고양이 표시
- [ ] Webview 패널 열기
- [ ] Canvas 기반 고양이 렌더링
- [ ] 걷기(walk) 애니메이션
- [ ] 앉기(sit) 애니메이션
- [ ] 그루밍(groom) 애니메이션
- [ ] 잠자기(sleep) 애니메이션
- [ ] 먹기(eat) 애니메이션
- [ ] `/food` 커맨드
- [ ] `/pet` 커맨드
- [ ] `/sleep` 커맨드
- [ ] 상태 영속성 (재시작 후에도 유지)

---

## 앞으로 구현할 기능

### v0.1 MVP
- 기본 5종 애니메이션 (걷기/앉기/그루밍/잠자기/먹기)
- 3개 커맨드 (`pixel-cat.food`, `pixel-cat.pet`, `pixel-cat.sleep`)
- 상태바 + Webview 패널 기본 동작

### v0.2
- 스프라이트 퀄리티 개선 (더 세밀한 픽셀아트)
- `globalState`로 상태 영속성 구현
- 배고픔/행복도 등 내부 스탯 시스템

### v0.3
- VSCode 마켓플레이스 배포
- 익스텐션 아이콘 (`icon.png`)
- README 스크린샷/GIF 추가

---

## 코드 컨벤션

- **주석**: 한국어 OK. 로직 설명은 한국어로 자유롭게 작성
- **스프라이트 드로잉**: `ctx.fillRect(x, y, scale, scale)` 패턴으로 픽셀 하나하나를 직접 그린다 (procedural). PNG 스프라이트시트 사용 금지
- **파일 구조**: 단일 `extension.js`에서 시작. 커지면 `src/` 폴더로 분리
- **포맷**: 들여쓰기 2스페이스, 세미콜론 있음
- **커맨드 ID**: `pixel-cat.<action>` 형태 (예: `pixel-cat.food`)
- **상태바 우선순위**: 오른쪽 정렬, priority 낮게 설정해 방해 최소화

---

## docs/features/ 파일 역할

| 파일 | 역할 |
|------|------|
| `docs/features/animation.md` | 애니메이션 시스템 설계, 스프라이트 프레임 구조, 구현 TODO |
| `docs/features/commands.md` | 커맨드 스펙, 각 커맨드의 동작 정의, 구현 TODO |
| `docs/features/statusbar.md` | 상태바 표시 방식, 고양이 상태 반영 로직, 구현 TODO |

각 파일은 해당 피처를 구현하기 전에 먼저 읽고, 구현 후에는 체크리스트를 업데이트한다.

# pixel_cat 🐱

VSCode 안에서 픽셀 고양이를 키우는 익스텐션.

에디터 하단 상태바에 고양이가 표시되고, 별도 패널에서 캔버스로 렌더링됨.
커맨드로 먹이를 주거나, 쓰다듬거나, 재울 수 있다.

---

## 기능

- 상태바에 고양이 상시 표시
- Canvas 기반 픽셀아트 고양이 애니메이션 (걷기 / 앉기 / 그루밍 / 잠자기 / 먹기)
- 커맨드로 고양이와 상호작용

---

## 커맨드

| 커맨드 | 설명 |
|--------|------|
| `Pixel Cat: Open cat window` | 고양이 패널 열기 |
| `Pixel Cat: Feed the cat` | 고양이에게 먹이 주기 🐟 |
| `Pixel Cat: Pet the cat` | 고양이 쓰다듬기 🤚 |
| `Pixel Cat: Put cat to sleep` | 고양이 재우기 💤 |

커맨드 팔레트 (`Ctrl+Shift+P` / `Cmd+Shift+P`) 에서 "Pixel Cat" 으로 검색.

---

## 스크린샷

> 스크린샷 준비 중 (v0.3에서 추가 예정)

---

## 설치

> 마켓플레이스 배포 전. 로컬 설치 방법:

```bash
# 의존성 없음. 바로 디버그 실행 가능
# VSCode에서 F5 → Extension Development Host 실행
```

---

## 개발

```bash
# 익스텐션 패키징 (vsce 필요)
npm run package
```

- 기술 스택: JavaScript, HTML Canvas, VSCode Extension API
- 의존성: 없음 (zero dependencies)

---

## 버전 히스토리

### v0.1.1 — 2026-04-16 · Prototype Integration

**프로토타입 기반으로 전면 교체.**

- 배경: 별 + 바닥 픽셀아트 룸
- 고양이가 화면을 자율적으로 걸어다님 (sit → walk → groom 자동 전환)
- 파티클 시스템: 하트(♥ /pet), Zzz(/sleep), 반짝(✦ /food)
- 상태바 텍스트 애니메이션: `=^･ω･^=` / `=^♥♥^=` / `=^･ー･^=` 순환
- 캔버스 내 버튼으로 직접 커맨드 실행 가능
- `/sleep` 재실행 시 고양이 깨움 (토글)
- 캔버스 클릭 → meow + happy 상태

---

### v0.1.0 — 2026-04-16 · MVP

**모든 기본 기능 구현 완료.**

- 16×16 픽셀아트 고양이 스프라이트 (팔레트 7색)
- 6종 애니메이션: idle(눈 깜빡임) / walking(발 교차) / sitting / grooming(발로 얼굴 닦기) / sleeping(Zzz) / eating(혀 내밀기)
- `/food` — 먹이 주기: eating 4초 → idle 복귀
- `/pet` — 쓰다듬기: grooming 4초 → sitting 복귀
- `/sleep` — 재우기: sleeping 상태 (재실행 시 깨움)
- 커맨드 중복 실행 방지
- 상태 영속성: `ExtensionContext.globalState`로 재시작 후에도 상태 유지
- 상태 변경 시 상태바 이모지 자동 업데이트

---

### v0.0.1 — 2026-04-16 · Project Scaffolding

**초기 프로젝트 세팅.** 코드는 없고 뼈대만 있는 상태.

- `package.json` — VSCode 익스텐션 기본 구조 (publisher: uwol-is-june, 4개 커맨드 정의)
- `extension.js` — activate/deactivate 뼈대, 상태바·Webview·커맨드 핸들러 stub, placeholder Canvas 고양이
- `CLAUDE.md` — 프로젝트 개요, 아키텍처 결정사항, 코드 컨벤션, 기능 체크리스트
- `docs/PLAN.md` — v0.1 MVP / v0.2 / v0.3 전체 로드맵
- `docs/features/animation.md` — Canvas 렌더링 방식 및 스프라이트 설계 문서
- `docs/features/commands.md` — 커맨드 스펙 문서
- `docs/features/statusbar.md` — 상태바 구현 방식 문서
- `.gitignore` — `*.vsix` 추가

---

## 라이선스

MIT © uwol-is-june

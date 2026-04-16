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

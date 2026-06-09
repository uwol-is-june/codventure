# Changelog

All notable changes to **Codventure** are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-06-08 · 전 단계 완성 + 마켓플레이스 재배포

7단계 진화 체계 완성. 비활성 패널티 시스템 추가. 마켓플레이스 재배포.

### Added
- **성장기 스프라이트 (Rookie)** — 아구몬 계열 주황 공룡, 대기 2프레임
- **성숙기 스프라이트 (Champion)** — 그레이몬 계열, 대기+포효 3프레임
- **완전체 스프라이트 (Ultimate)** — 메탈그레이몬 계열, 대기+에너지 차징 3프레임
- **궁극체 스프라이트 (Mega)** — 48×48px, 워그레이몬 계열 크롬 갑옷+대형 날개, 대기A/B+오라A/B 4프레임 루프
- **비활성 패널티 시스템** — 마지막 저장 후 72시간 경과 시 눈물 픽셀 오버레이. XP 획득 즉시 해제. 퇴화 없음.

### Changed
- 카테고리 태그 `["Other", "Visualization"]`으로 업데이트
- 마켓플레이스 아이콘 궁극체 얼굴 기반 128×128 px으로 교체
- README 전면 재작성: 7단계 진화표·기능 목록 업데이트
- 버전 `1.0.0`으로 범프

---

## [0.5.2] — 2026-06-05 · 배경 + 알 비주얼 개선

### Added
- **2D 횡스크롤 풀밭 배경** — Stardew Valley 틸셋 기반 패럴랙스 레이어 (하늘·지면·장식물)

### Changed
- 알 스프라이트 개선

---

## [0.5.1] — 2026-06-05 · 문서 정리

### Changed
- README 전면 재작성 (진화 단계표, 설계 원칙, 버전 히스토리)
- TASK.md 로드맵 정리

---

## [0.5.0] — 2026-06-05 · 스프라이트 애니메이션 + XP 시스템

### Added
- **알·유아기·유아기 II 3단계 핸드크래프트 픽셀아트 스프라이트**
- **숨쉬기 애니메이션** — 800ms 주기 루프, 탭 비활성 시 자동 중단
- **부화 연출** — 알 흔들림 → 흰빛 번짐 → 유아기 등장
- **XP 시스템** — 파일 저장 +2 XP, 레벨업 판정, 7단계 진화 매핑
- **상태 영속화** — VSCode `globalState` (재시작 후에도 유지)
- **MonsterState / XpTracker** 모듈 분리

### Removed
- `/food` `/pet` `/sleep` 커맨드 및 슬래시 커맨드 UX 전반

---

## [0.3.0] — 2026-06-02 · Fantasy Adventure System

캐릭터 시스템 전면 교체 및 v0.2 목표 전체 완성. 고양이에서 판타지 직업 캐릭터로 리빌드.

### Added
- **직업 선택 화면** — 최초 실행 시 Knight / Mage / Cleric 3종 카드 선택. 호버 시 카드 부상, 클릭 시 파티클 폭발 + 줌인 확정 연출
- **판타지 캐릭터 렌더러** — 직업별 픽셀아트 스프라이트 3종, 9가지 애니메이션 상태 (걷기 / 달리기 / 앉기 / 자기 / 먹기 / 코딩 / 승리 / 깃발꽂기 / 위험보행). Lv.4+ 직업별 외형 추가 (Knight 황금 왕관 / Mage 별 장식 / Cleric 성스러운 빛)
- **횡스크롤 패럴랙스 배경** — 5개 존 (마을 → 숲 → 산 → 황무지 → 마왕성), 하늘·중경·지면 3단 레이어. 레벨업 시 존 전환 페이드 연출
- **HP 시스템** — 분당 HP 소모 (직업별 배율 적용), HP 바 UI (녹색→노랑→빨강 색상 전환), HP 30% 이하 캐릭터 외곽 빨간 깜빡임, HP 0 자동 캠프 진입
- **EventDetector** — 타이핑 / 빌드 성공·실패 / git 커밋 / 에러 증감 감지 → XP·HP·애니메이션 자동 연동
- **타이핑 → 걷기 연동** — 코딩 시작 시 캐릭터가 걷기 시작, 30초 비활성 후 자동 복귀
- **빌드 → 질주** — 빌드 성공 시 0.8초 달리기 + 스크롤 부스트
- **커밋 → 깃발꽂기** — git 커밋 감지 시 깃발꽂기 4단계 애니메이션 재생
- **휴식 시스템** — ⛺ 쉬기 버튼으로 캠프 씬 전환, 모닥불 스프라이트 + 불씨 파티클, 30초 단위 HP 회복
- **XP 팝업 & 레벨업 UI** — XP·HP 증감 부유 팝업, 레벨업 시 흰색 플래시 + 골드 텍스트 연출
- **저장/로드** — 저장 키 `codventure.state`로 통일, 구버전 `catData` 자동 마이그레이션, `ready` → `state_loaded` 동기화 프로토콜, `deactivate` 핸들러 추가

### Changed
- 캐릭터: 고양이(fire/water/grass) → 판타지 직업(Knight/Mage/Cleric)
- 상태바: `⚔️ Lv.3 | ████████ HP | 1,240 XP` 형식. HP 30% 이하 ⚠️ 경고, Lv.5 `👑 전설의 기사` 형식
- 직업별 스탯 분기 — Knight (HP 120 / 소모×0.7) · Mage (HP 80 / XP×1.5) · Cleric (HP 100 / 회복×2.0)

---

## [0.2.0] — 2026-04-30 · Elemental Evolution System

### Added
- **알 선택 화면** — 최초 실행 시 불/물/풀 알 3개 표시, 호버 진동 애니메이션, 클릭 시 부화 연출 (파티클 폭발 + 줌인)
- **속성 팔레트 시스템** — `PALETTES` 객체로 body/stripe/eye/particle 색상 분기 (fire/water/grass)
- **속성별 커맨드 파티클** — 🔥 불꽃 / 💧 물방울 / 🍃 잎사귀 파티클
- **XP 누적 시스템** — 파일 편집 감지 후 1분당 XP+1, `/food`·`/pet` 실행 시 XP+5 보너스
- **레벨 계산** — `calcLevel(xp)` 함수, Lv.1~5 임계값 (500 / 1500 / 3500 / 7000)
- **레벨업 연출** — 속성 파티클 폭발 + VSCode 알림 `🎉 Nabi가 Lv.N으로 성장했어요!`
- **레벨별 스프라이트 진화**
  - Lv.1: 아기 고양이, 눈 크고 머리 비율 큼
  - Lv.2: 소폭 성장, 줄무늬 1~2개
  - Lv.3: 성묘 비율, 귀 상단 털 픽셀
  - Lv.4: 속성 악세서리 (불: 불꽃 왕관 / 물: 물방울 목걸이 / 풀: 잎사귀 머리띠)
  - Lv.5: 오라 파티클 상시 발생 + 특별 색상 (금빛/은빛/황금잎)
- **상태바 속성+레벨 표시** — `🔴 =^･ω･^= Lv.3` 형식, XP 변경 시 즉시 갱신

### Fixed
- **데이터 복원 타이밍 버그** — HTML 임베딩(`__INITIAL_DATA__`)으로 재시작 후 catType·xp·level 즉시 복원. 기존 `postMessage('init')` 방식의 race condition 해결

---

## [0.1.4] — 2026-04-24 · Sprite Overhaul + Coding Animation

### Added
- 고양이 스프라이트 전면 재설계 — 머리 2px 더 넓게, 뾰족한 삼각 귀, 2×2 초록 홍채 눈, 분홍 코
- 꼬리 두께 2px, 발 끝 발톱 구분선, 수염 서브픽셀 렌더링 (좌우 방향 자동 반전)
- `code` 상태 — 맥북 앞 타이핑 애니메이션, 화면에 코드 줄 깜빡임
- 코드 파티클 (`{}` `()` `<>` `//` `=>`) 초록색
- `💻 /code` 커맨드 + 버튼 추가
- 자율 행동 확률 조정: walk 35% / sit 25% / groom 20% / code 20%
- 하단 버튼 UI `flex: 1` 반응형

---

## [0.1.2] — 2026-04-16 · Sidebar Migration

### Changed
- `WebviewPanel`(에디터 탭) → Explorer 사이드바 `WebviewViewProvider`로 전환
- 상태바 클릭 시 사이드바 패널 포커스

---

## [0.1.1] — 2026-04-16 · Prototype Integration

### Added
- 고양이 자율 행동: sit → walk → groom 자동 순환
- 배경: 별 + 바닥 타일 픽셀아트
- 파티클 시스템: ♥ (pet) / z (sleep) / ✦ (food)
- 상태바 텍스트 애니메이션
- 캔버스 내 버튼으로 직접 커맨드 실행
- `/sleep` 토글, 캔버스 클릭 → meow + happy

---

## [0.1.0] — 2026-04-16 · MVP

### Added
- 16×16 픽셀아트 스프라이트 (팔레트 7색)
- 6종 애니메이션: idle / walking / sitting / grooming / sleeping / eating
- `/food` `/pet` `/sleep` 커맨드
- 상태 영속성: `ExtensionContext.globalState`

---

## [0.0.1] — 2026-04-16 · Project Scaffolding

### Added
- `package.json` — VSCode 익스텐션 기본 구조
- `extension.js` — activate/deactivate 뼈대, placeholder Canvas
- `CLAUDE.md` — 프로젝트 개요·아키텍처·컨벤션
- `docs/PLAN.md` — v0.1~v0.3 로드맵

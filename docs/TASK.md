# codventure — TASK.md

> 기획 전체: [PLAN.md](PLAN.md) | 추후 개발: [BACKLOG.md](BACKLOG.md)

---

## 현재 작업: v0.4 선행 구현 (v0.5 완료 기준 충족용)

> v0.5 완료 기준 중 "레벨 기반 스테이지 렌더링" 2개 항목이 미충족.  
> 아래 TASK-05 ~ 08 완료 후 v0.5 Done 체크 가능.

---

## 완료 기준 (v0.5 Done)

- [x] 레벨 1–2에서 유아기 스프라이트가 렌더링된다
- [x] 레벨 3–4에서 유아기 II 스프라이트가 렌더링된다
- [x] 두 스프라이트 모두 800ms 주기 숨쉬기 애니메이션이 동작한다
- [x] 파일 저장 시 `+2 XP (저장)` 토스트가 화면에 표시된다
- [x] VSCode 탭 비활성화 시 `requestAnimationFrame` 루프가 중단된다
- [x] 다크/라이트 테마 양쪽에서 색상이 깨지지 않는다

---

## 완료된 태스크

### TASK-08 `완료` 부화 연출 + Webview 초기 상태 연동
**파일**: `webview/renderer.js`, `src/XpTracker.js`

- [x] **TASK-08-1** `initStage` 하드코딩 제거 — `getMonster` + `levelToStage` 연동 (TASK-06-4)
- [x] **TASK-08-2** `hatch()` — wobble 6회(200ms) → 흰 flash 페이드인(400ms) → stage 1 전환 → 페이드아웃(400ms) → `startLoop()`
- [x] **TASK-08-3** `XpTracker.onSave()` — `before.level === 0` → `HATCH`, 이후 → `LEVEL_UP` + `STATE_UPDATE`

---

### TASK-07 `완료` 알(Egg) 스프라이트 제작
**파일**: `src/sprites/egg.js`

- [x] **TASK-07-1** 팔레트 6색 — 크림 흰색 / 황갈색 / 갈색 / 노랑 줄무늬 / 진노랑 줄무늬 그림자
- [x] **TASK-07-2** 프레임 A — 세로 타원(row 2–13, 최대 12px), 사선 줄무늬 1줄
- [x] **TASK-07-3** 프레임 B — 알 1px 우측 이동 + 바닥 그림자 row 14
- [x] **TASK-07-4** `module.exports = { EGG_PALETTE, EGG_FRAMES }`
- [x] **TASK-07-5** `extension.js` SPRITES[0] 에 egg 등록

---

### TASK-06 `완료` XpTracker.js — XP 적립 + 레벨업 판정
**파일**: `src/XpTracker.js`, `extension.js`

- [x] **TASK-06-1** `src/XpTracker.js` 생성 — `constructor(context, provider)`
- [x] **TASK-06-2** `onSave()` — `applyXp(+2)` → `saveMonster` → `XP_GAIN` postMessage
- [x] **TASK-06-3** 레벨업 시 `LEVEL_UP`, 진화 시 `STATE_UPDATE` postMessage
- [x] **TASK-06-4** `extension.js` — 범용 `postMessage`, `initStage` 하드코딩 제거, `XpTracker.onSave()` 연결

---

### TASK-05 `완료` MonsterState.js — 데이터 모델 + globalState CRUD
**파일**: `src/MonsterState.js`

- [x] **TASK-05-1** `defaultMonster()` — PLAN.md 데이터 모델 기반 초기값 반환
- [x] **TASK-05-2** `getMonster(context)` / `saveMonster(context, data)` — key: `'codventure.monster'`
- [x] **TASK-05-3** `levelToStage(level)` — level 0→0, 1-2→1, 3-4→2, 5-9→3, 10-19→4, 20-39→5, 40+→6
- [x] **TASK-05-4** `XP_THRESHOLDS` + `applyXp(monster, amount)` — 반환 `{ monster, leveledUp, evolved }`

---

### TASK-04 `완료` XP 획득 토스트 메시지
**파일**: `webview/renderer.js`, `extension.js`  
**참조**: [BACKLOG-04](BACKLOG.md#backlog-04)

- [x] **TASK-04-1** 토스트 DOM 요소 생성 (CSS absolute 포지셔닝)
- [x] **TASK-04-2** 토스트 표시 함수 구현 — 0.8초 표시 후 `translateY(-12px)` + `opacity: 0`
- [x] **TASK-04-3** 연속 획득 누적 처리 — 타이머 리셋 + `toastAccum` 합산
- [x] **TASK-04-4** `XP_GAIN` 메시지 핸들러 연결
- [x] **TASK-04-5** `onDidSaveTextDocument` → `+2 XP (저장)` 전송, `var(--vscode-charts-yellow)`

---

### TASK-03 `완료` 숨쉬기 애니메이션 루프
**파일**: `webview/renderer.js`, `extension.js`  
**참조**: [BACKLOG-03](BACKLOG.md#backlog-03)

- [x] **TASK-03-1** `requestAnimationFrame` 루프 — 800ms 주기, `performance.now()` 기반 lastSwitch로 재시작 직후 즉각 전환 방지
- [x] **TASK-03-2** `visibilitychange` 처리 — 탭 숨김 시 `cancelAnimationFrame`, 복귀 시 `startLoop()` 재시작
- [x] **TASK-03-3** 스테이지 전환 시 `frameIdx = 0` 리셋, 같은 스테이지 재수신 시 유지. `STATE_UPDATE` postMessage로 검증
- [x] **TASK-03-4** `drawSprite(frames, palette, fi, x, y, scale)` 공통 함수 — 팔레트 인덱스 0 건너뜀
- [x] **TASK-03-5** `STAGE_SCALE = {0:8, 1:8, 2:8, 3:5, 4:4, 5:3, 6:2}` — 16px×8=128px 기준
- [x] **TASK-03-6** `center(spriteSize, scale)` — `Math.floor((128 - size×scale) / 2)` 로 Canvas 중앙 정렬
- [x] **TASK-03+** `extension.js` 리팩터 — `extensionUri` 전달, `localResourceRoots`, `cspSource`, renderer.js 파일 분리

---

### TASK-02 `완료` 유아기 II(In-Training) 스프라이트 제작
**파일**: `src/sprites/inTraining.js`  
**참조**: [BACKLOG-02](BACKLOG.md#backlog-02)

- [x] **TASK-02-1** 팔레트 정의 — 8색 (Baby 핑크 계열 → 크림/황토 계열로 교체, 팔 주황·볼터치 분홍 추가)
- [x] **TASK-02-2** 프레임 A — 16×16, 3×2 눈, 팔 스텁 row 5-7 (col 1·13), 볼터치 row 8
- [x] **TASK-02-3** 프레임 B — 16×16, 몸 1px 하강 + 눈 1행(반쯤 감김) + 팔 row 6-8 + 바닥 그림자
- [x] **TASK-02-4** 프레임 C — 16×16, 팔 row 3-4로 올림(만세 실루엣) + 기쁨 눈(하이라이트 없음)
- [x] **TASK-02-5** `module.exports = { IN_TRAINING_PALETTE, IN_TRAINING_FRAMES }` export 완료
- [x] **TASK-02-6** `extension.js`에서 Baby·In-Training 나란히 렌더링으로 육안 확인

---

### TASK-01 `완료` 유아기(Baby) 스프라이트 제작
**파일**: `src/sprites/baby.js`  
**참조**: [BACKLOG-01](BACKLOG.md#backlog-01)

- [x] **TASK-01-1** 팔레트 정의 — 6색 (`transparent` / 몸 메인 / 그림자 / 눈 하이라이트 / 동자 / 상단 하이라이트)
- [x] **TASK-01-2** 프레임 A — 16×16, 눈 뜬 대기 자세. 타원형 몸체 (폭 5→7→9→11→9→7→5px 대칭)
- [x] **TASK-01-3** 프레임 B — 16×16, 몸 1px 하강 + 눈 반쯤 감김 + 바닥 그림자 1행
- [x] **TASK-01-4** `module.exports = { BABY_PALETTE, BABY_FRAMES }` export 완료
- [x] **TASK-01-5** `extension.js`에서 스프라이트 로드 후 128×128 Canvas(scale 8)에 렌더링. `F5` 실행으로 육안 확인 가능

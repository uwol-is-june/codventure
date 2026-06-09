# codventure — BACKLOG.md

> 추후 개발할 항목. 중요도 순 정렬.  
> 현재 태스크: [TASK.md](TASK.md)

---

## v1.x — 다중 진화 계통 (아이디어 단계)

> **중요도: ★★★☆☆** — 장기 리텐션 기능, 설계만 완료 후 구현 결정

### BACKLOG-17 ★★★☆☆ 코딩 패턴 기반 진화 분기
**파일**: `src/XpTracker.js`, `src/MonsterState.js`

- 코딩 습관에 따라 성장기(Rookie) 진화 시 계통 분기
  - 저장 횟수 > 세션 시간: **민첩형** 계통 (날렵한 실루엣)
  - 세션 시간 > 저장 횟수: **체력형** 계통 (묵직한 실루엣)
  - 디버그 세션 많음: **지능형** 계통 (안경 또는 뿔 있는 디자인)
- 분기 판정은 레벨 5 달성 시점의 `stats` 비율로 계산

### BACKLOG-18 ★★★☆☆ 도감 (몬스터 도감)
**파일**: `webview/`, `src/`  
**의존**: BACKLOG-17

- 사이드 패널 클릭 시 진화 계통도 표시
- 현재 진화 단계 하이라이트, 미달성 단계는 실루엣 블랙아웃
- 각 단계 클릭 시 필요 레벨 + 현재 진행도 표시

### BACKLOG-19 ★★☆☆☆ 타임라인 / 성장 기록
**파일**: `src/MonsterState.js`

- 진화 일시, 당시 레벨, 총 XP를 배열로 기록
  ```javascript
  evolutionLog: [
    { stage: 1, level: 1, totalXp: 50,  date: 1700000000000 },
    { stage: 2, level: 3, totalXp: 350, date: 1700100000000 },
  ]
  ```
- Webview에서 타임라인 뷰로 확인 가능 (선택적 UI)

### BACKLOG-20 ★★☆☆☆ 다국어 지원 (한/영)
**파일**: `webview/index.html`, `src/`

- VSCode 언어 설정 감지 (`vscode.env.language`)
- 한국어/영어 문자열 분리 (`i18n/ko.js`, `i18n/en.js`)
- 진화 단계명, 토스트 메시지, HUD 텍스트 모두 대응

---

## 기술 부채 / 리팩터링

> **중요도: ★★★☆☆** — 기능 추가와 병행하며 점진적으로 해결

### BACKLOG-21 ★★★☆☆ 스프라이트 렌더링 엔진 추상화
**파일**: `webview/renderer.js`

- `drawSprite(ctx, frames, palette, frameIndex, x, y, scale)` 공통 함수
- 현재 스테이지별 분기 로직을 렌더러에서 제거하고 데이터 드리븐으로 전환

### BACKLOG-22 ★★★☆☆ globalState 마이그레이션 가드
**파일**: `src/MonsterState.js`

- 버전 업그레이드 시 구 형식 globalState를 새 형식으로 자동 변환
- `schemaVersion` 필드 추가, 버전별 마이그레이션 함수 체인 구성
- 빠진 필드는 기본값으로 채워 TypeError 방지

### BACKLOG-23 ★★☆☆☆ 테스트 전략 수립
**파일**: `test/` (신규)

- XpTracker 단위 테스트: 이벤트 → XP 계산 로직 검증
- MonsterState 단위 테스트: 레벨업 판정, 진화 조건 검증
- 스프라이트 렌더 스냅샷 테스트는 제외 (Canvas 환경 의존)
- VSCode Extension Test API (`@vscode/test-electron`) 사용

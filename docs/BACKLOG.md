# codventure — BACKLOG.md

> 추후 개발할 항목. 버전 순 → 중요도 순 정렬.  
> 기획 전체: [PLAN.md](PLAN.md) | 현재 태스크: [TASK.md](TASK.md)

---

## v0.5 — 유아기 / 유아기 II 스프라이트 + 애니메이션

> **중요도: ★★★★★** — v0.4 부화 연출이 끝난 직후 바로 필요한 단계

### BACKLOG-01 ★★★★★ 유아기 스프라이트 제작
**파일**: `src/sprites/baby.js`  
**의존**: BACKLOG 없음 (독립 작업)

- 16×16 픽셀, 최대 6색 팔레트 정의
- 형태: 작고 통통한 구체, 눈 2개, 귀(또는 뿔) 1쌍
- 프레임 2장: 대기A (기본) / 대기B (살짝 커진 숨쉬기)
- 컬러 인덱스 2D 배열 형태로 export (`BABY_FRAMES`, `BABY_PALETTE`)
- 디지몬 레퍼런스: 코로몬, 뿌요몬 계열 실루엣 참고

### BACKLOG-02 ★★★★★ 유아기 II 스프라이트 제작
**파일**: `src/sprites/inTraining.js`  
**의존**: BACKLOG-01 완료 후

- 16×16 픽셀, 최대 8색 팔레트
- 형태: 유아기에서 손발이 생기고 표정이 뚜렷해짐
- 프레임 2장: 대기A / 대기B
- 프레임 1장 추가: 기쁨 (레벨업 시 사용) — 팔을 드는 동작
- 디지몬 레퍼런스: 토코몬, 차오몬 계열 참고

### BACKLOG-03 ★★★★☆ 숨쉬기 애니메이션 루프
**파일**: `webview/renderer.js`  
**의존**: BACKLOG-01, BACKLOG-02

- 프레임 간 전환 주기: 800ms (자연스러운 호흡감)
- `requestAnimationFrame` 기반 루프
- 탭이 비활성화되면 (`document.visibilityState`) 루프 일시 중단 (성능)
- 스프라이트 변경 시 루프 재시작 없이 다음 프레임부터 새 스프라이트 적용

### BACKLOG-04 ★★★☆☆ XP 획득 시 토스트 메시지
**파일**: `webview/index.html`, `webview/renderer.js`  
**의존**: BACKLOG-03

- 화면 하단에 `+2 XP (저장)` 형태의 짧은 텍스트 팝업
- 0.8초 표시 후 위로 올라가며 fade-out
- 연속으로 획득 시 숫자 누적 표시 (`+2 XP → +4 XP`)
- 픽셀 폰트 흉내: `font-family: monospace`, `image-rendering: pixelated`

---

## v0.6 — 성장기 스프라이트 + 레벨업 파티클

> **중요도: ★★★★★** — 픽셀 아트 완성도의 핵심 단계

### BACKLOG-05 ★★★★★ 성장기 스프라이트 제작
**파일**: `src/sprites/rookie.js`  
**의존**: BACKLOG-02 완료 후

- 24×24 픽셀, 최대 10색 팔레트
- 형태: 뚜렷한 실루엣, 꼬리 또는 날개, 개성 있는 특징 1개
- 프레임 3장: 대기A / 대기B / 공격 포즈 (장식용, 미사용 가능)
- 레벨업 프레임 1장: 포효 또는 점프 동작
- 디지몬 레퍼런스: 아구몬, 가부몬, 피요몬 계열 실루엣

### BACKLOG-06 ★★★★☆ 레벨업 파티클 연출
**파일**: `webview/renderer.js`  
**의존**: BACKLOG-03

- 레벨업 메시지 수신 시 (`LEVEL_UP`) 1.5초 연출 재생
- 파티클: 별(★) 8개가 몬스터 주변에서 바깥으로 퍼짐
- 파티클 색상: 금색 `#FFD700`, 흰색 `#FFFFFF` 교차
- 몬스터: 0.3초마다 Y축 +4px 위로 바운스 × 3회
- 연출 종료 후 자동으로 대기 애니메이션 복귀

### BACKLOG-07 ★★★★☆ 진화 단계 전환 연출 (공통 모듈)
**파일**: `webview/renderer.js`  
**의존**: BACKLOG-06

- `EVOLVE` 메시지 수신 시 3초 연출 재생
- 1단계 (0.5s): 흰색 빛이 몬스터를 감싸며 실루엣만 남음
- 2단계 (1.0s): 실루엣이 새 스프라이트 실루엣으로 서서히 교체
- 3단계 (0.5s): 빛이 걷히며 새 스프라이트 등장 + 레벨업 파티클
- 4단계 (1.0s): 화면 하단에 진화명 텍스트 페이드인/아웃
- 연출 중 XP 토스트 억제 (연출 방해 방지)

### BACKLOG-08 ★★★☆☆ 이름 짓기 UI
**파일**: `webview/index.html`, `webview/renderer.js`, `extension.js`  
**의존**: BACKLOG-04

- 몬스터 이름 클릭 시 인라인 텍스트 입력 활성화
- `Enter`로 확정, `Escape`로 취소
- 확정 시 `RENAME` 메시지를 Extension으로 전송
- Extension에서 `globalState`에 저장
- 이름 최대 8자 제한 (도트 게임 감성)

---

## v0.7 — 성숙기 · 완전체 스프라이트 + 진화 연출 완성

> **중요도: ★★★★☆** — 장기 플레이 동기 부여의 핵심

### BACKLOG-09 ★★★★★ 성숙기 스프라이트 제작
**파일**: `src/sprites/champion.js`  
**의존**: BACKLOG-05

- 32×32 픽셀, 최대 12색 팔레트
- 형태: 갑옷 또는 무기류 디테일 추가, 위압감 있는 실루엣
- 프레임 3장: 대기A / 대기B / 위협 포즈
- 진화 직후 프레임 1장: 포효 동작
- 디지몬 레퍼런스: 그레이몬, 가루루몬, 비르드라몬 계열

### BACKLOG-10 ★★★★★ 완전체 스프라이트 제작
**파일**: `src/sprites/ultimate.js`  
**의존**: BACKLOG-09

- 40×40 픽셀, 최대 14색 팔레트
- 형태: 복잡한 실루엣, 발광 효과 (반짝이는 픽셀 추가)
- 프레임 4장: 대기A / 대기B / 대기C (느린 발광 펄스) / 강화 포즈
- 발광 픽셀: 흰색 또는 옅은 노랑, 4프레임 중 2프레임에만 켜짐

### BACKLOG-11 ★★★☆☆ 진화 계통 분기 기반 설계
**파일**: `src/MonsterState.js`  
**의존**: BACKLOG-05

- `species` 필드를 활용한 진화 테이블 구조 설계
- 현재 v0.x는 `'default'` 단일 계통만 사용
- v1.x 다중 계통 확장을 위한 스프라이트 매핑 테이블 준비
  ```javascript
  const EVOLUTION_TABLE = {
    default: { 0: 'egg', 1: 'baby', 2: 'inTraining', 3: 'rookie', ... }
  };
  ```

### BACKLOG-12 ★★★☆☆ 상태 정보 패널 (HUD)
**파일**: `webview/index.html`, `webview/renderer.js`  
**의존**: BACKLOG-04

- Canvas 하단에 텍스트 HUD 표시
  - `LV.7 [이름]`
  - XP 게이지 바 (픽셀 스타일, 색상: 초록 → 노랑 → 빨강)
  - 진화 단계 아이콘 (알/유아/성장/성숙/완전/궁극 6단계 점)
- VSCode 테마 색상 변수(`--vscode-foreground`) 사용으로 다크/라이트 대응

---

## v1.0 — 궁극체 + 전 단계 완성 + 마켓플레이스 재배포

> **중요도: ★★★★★** — 공개 릴리스 기준점

### BACKLOG-13 ★★★★★ 궁극체 스프라이트 제작
**파일**: `src/sprites/mega.js`  
**의존**: BACKLOG-10

- 48×48 픽셀, 최대 16색 팔레트
- 형태: 가장 복잡한 디자인, 오라 효과 (외곽에 반짝이는 픽셀 배치)
- 프레임 4장: 대기A / 대기B / 오라A / 오라B (4프레임 루프로 웅장함 표현)
- 디지몬 레퍼런스: 워그레이몬, 메탈가루루몬 계열

### BACKLOG-14 ★★★★☆ 마켓플레이스 배포 준비
**파일**: `package.json`, `README.md`  
**의존**: BACKLOG-13

- 스크린샷 최소 3장: 알 상태 / 성장기 / 궁극체
- CHANGELOG.md 작성
- README 리라이트: 기능 설명 + GIF 데모
- 카테고리 태그 정리: `["Other", "Visualization"]`
- 아이콘 업데이트 (궁극체 얼굴 기반 128×128 px)

### BACKLOG-15 ★★★★☆ 비활성 패널티 시스템
**파일**: `src/XpTracker.js`, `src/MonsterState.js`  
**의존**: 기본 XP 시스템 완료 후

- 마지막 활동(`lastActive`)으로부터 72시간 이상 경과 시 몬스터가 슬픈 표정
- 슬픈 표정: 기존 대기 프레임에 눈물 픽셀 오버레이 (별도 레이어)
- XP 획득 즉시 슬픈 표정 해제
- **디볼루션(퇴화)은 없음** — 처벌보다 동기 부여에 집중

### BACKLOG-16 ★★★☆☆ 사운드 효과 (선택적)
**파일**: `webview/index.html`  
**의존**: BACKLOG-07 진화 연출 완료 후

- Web Audio API로 생성하는 8비트 효과음 (외부 파일 없음)
  - 레벨업: 상승 4음 아르페지오
  - 진화: 팡파르 8음
  - XP 획득: 단음 '딩'
- VSCode 설정에서 on/off 토글 제공 (`codventure.sound`: boolean)
- 기본값: `false` (조용한 작업 환경 우선)

---

## v1.x — 다중 진화 계통 (아이디어 단계)

> **중요도: ★★★☆☆** — 장기 리텐션 기능, 설계만 완료 후 구현 결정

### BACKLOG-17 ★★★☆☆ 코딩 패턴 기반 진화 분기
**파일**: `src/XpTracker.js`, `src/MonsterState.js`  
**의존**: BACKLOG-11, v1.0 완료 후

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
**의존**: 기본 상태 저장 완료 후

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
**의존**: HUD 완료 후

- VSCode 언어 설정 감지 (`vscode.env.language`)
- 한국어/영어 문자열 분리 (`i18n/ko.js`, `i18n/en.js`)
- 진화 단계명, 토스트 메시지, HUD 텍스트 모두 대응

---

## 기술 부채 / 리팩터링

> **중요도: ★★★☆☆** — 기능 추가와 병행하며 점진적으로 해결

### BACKLOG-21 ★★★☆☆ 스프라이트 렌더링 엔진 추상화
**파일**: `webview/renderer.js`  
**의존**: 스프라이트 2종 이상 구현 후

- `drawSprite(ctx, frames, palette, frameIndex, x, y, scale)` 공통 함수
- 현재 스테이지별 분기 로직을 렌더러에서 제거하고 데이터 드리븐으로 전환

### BACKLOG-22 ★★★☆☆ globalState 마이그레이션 가드
**파일**: `src/MonsterState.js`  
**의존**: 없음

- 버전 업그레이드 시 구 형식 globalState를 새 형식으로 자동 변환
- `schemaVersion` 필드 추가, 버전별 마이그레이션 함수 체인 구성
- 빠진 필드는 기본값으로 채워 TypeError 방지

### BACKLOG-23 ★★☆☆☆ 테스트 전략 수립
**파일**: `test/` (신규)  
**의존**: 없음

- XpTracker 단위 테스트: 이벤트 → XP 계산 로직 검증
- MonsterState 단위 테스트: 레벨업 판정, 진화 조건 검증
- 스프라이트 렌더 스냅샷 테스트는 제외 (Canvas 환경 의존)
- VSCode Extension Test API (`@vscode/test-electron`) 사용

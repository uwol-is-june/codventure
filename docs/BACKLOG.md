# codventure — BACKLOG.md

> v0.2 완료 후 개발할 항목. 중요도 순 정렬.  
> 기획 전체: [PLAN.md](PLAN.md) | 현재 태스크: [TASK.md](TASK.md)

---

## v0.3 — 몬스터 & 전투 시스템

> **중요도: 최상** — 핵심 게임 루프 완성. 코딩 → 보상의 핵심 고리.

### TASK-10 전투 로직 ★★★★★
**파일**: `src/EventDetector.ts` 확장  
**의존**: v0.2 완성 후

- 에러 추적 (이전 셋 vs 현재 셋 비교)
- 에러 수 → 몬스터 종류 결정 (1–2: slime, 3–5: skull, 6+: dragon)
- 격퇴 후 10초 쿨다운
- `onDidSaveTextDocument` 에서 진단 재평가

### TASK-09 몬스터 렌더러 ★★★★★
**파일**: `webview/renderer/MonsterRenderer.ts`, `webview/game/Monster.ts`  
**의존**: TASK-10

- 몬스터 3종 Procedural 스프라이트 (bug_slime / deadlock_skull / critical_dragon)
- 등장/상시/전투/격퇴 연출
- 복수 몬스터 (최대 2마리 동시)
- 휴식 중 몬스터 멀리서 지켜보는 연출

---

## v0.4 — 동료 시스템 & 레벨 진화

> **중요도: 높음** — 장기 플레이 동기부여 및 성장 보상감.

### TASK-11 레벨별 캐릭터 진화 ★★★★☆
**파일**: `webview/sprites/` 각 직업 스프라이트  
**의존**: v0.3 완성 후

- 각 직업 5단계 외형 변화 (Lv.1 기본 → Lv.5 전설 + 오라)
- 레벨업 시 스프라이트 자동 전환
- Lv.5 전용 오라 파티클 시스템

### TASK-12 동료 시스템 ★★★☆☆
**파일**: `webview/game/World.ts`, `webview/renderer/CharacterRenderer.ts`  
**의존**: TASK-11

- 동료 4종 (elf_scout / wise_elder / dwarf_warrior / fairy_healer)
- 합류 조건 (레벨, 버그 격퇴 수, 커밋 수)
- 파티 대형 이동 (일렬 종대, 0.75배 크기)
- 동료별 패시브 효과 (XP 보너스, HP 소모 감소 등)

### TASK-13 마왕 이벤트 ★★★☆☆
**파일**: `webview/main.ts`, `webview/renderer/`  
**의존**: TASK-12

- 트리거: Lv.5 달성 후 첫 커밋
- 8초짜리 보스 연출 시퀀스
- 에러 전멸 + 빌드 성공 시 마왕 격퇴
- 엔딩 칭호 저장 + 무한 전진 모드

---

## v0.5 — 마켓플레이스 완성도

> **중요도: 보통** — 배포 품질. 기능 완성 후 마지막에 처리.

### README & 스토어 자료 ★★☆☆☆
- 게임플레이 GIF (직업 선택 → 이동 → 전투 → 레벨업)
- 직업별 진화 단계 스크린샷
- 설치 방법 3줄 요약

### 커맨드 & 설정값 ★★☆☆☆
- `codventure.show / rest / status / reset` 커맨드 팔레트 정리
- `package.json contributes.configuration` 설정값 4종
  - `enabled`, `panelPosition`, `showStatusBar`, `hpDrainRate`

### 퍼포먼스 검증 ★★☆☆☆
- Canvas 렌더링 30fps 유지 확인
- EventDetector 구독이 에디터 응답성에 영향 없는지 확인
- `deactivate` 시 모든 구독 해제 (메모리 누수 체크)

### CHANGELOG.md 작성 ★☆☆☆☆
- v0.1 ~ 현재 버전 변경 내역 정리

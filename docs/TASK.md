# codventure — TASK.md

> 기획 전체: [PLAN.md](PLAN.md) | 추후 개발: [BACKLOG.md](BACKLOG.md)  
> 각 태스크 세부 구현은 `docs/features/` 파일 참고.

---

## v0.2 진행 중

> 현재 버전 목표: 코딩하면 캐릭터가 걷고, HP가 소모되고, 쉬고 싶을 때 쉴 수 있다.

- [x] **TASK-05** EventDetector — [spec](features/event-detector.md) | 의존: 없음
- [x] **TASK-04** HP 시스템 — [spec](features/hp-system.md) | 의존: TASK-05
- [x] **TASK-06** 휴식 시스템 — [spec](features/rest-system.md) | 의존: TASK-04
- [x] **TASK-02** 횡스크롤 배경 — [spec](features/background-scroll.md) | 병렬 가능
- [x] **TASK-03** 캐릭터 렌더러 — [spec](features/character-renderer.md) | 병렬 가능
- [x] **TASK-01** 직업 선택 화면 — [spec](features/class-selection.md) | 의존: TASK-03
- [x] **TASK-07** XP/레벨업 UI — [spec](features/xp-levelup.md) | 나머지 완성 후
- [x] **TASK-08** 저장/로드 — [spec](features/save-load.md) | 마지막 통합

---

## v0.2 완료 기준

- [x] VSCode에서 코드를 타이핑하면 XP가 쌓인다 (EventDetector)
- [x] 타이핑하면 캐릭터가 걷는다 → **TASK-09** 참고
- [x] 빌드 실행 시 캐릭터가 0.8s 동안 질주한다
- [x] 커밋 시 깃발 꽂기 애니메이션이 나온다
- [x] HP가 시간에 따라 감소하고 HP 바에 반영된다
- [x] 휴식 버튼을 누르면 캠프 씬으로 전환되고 HP가 회복된다
- [x] 게임 상태가 VSCode 재시작 후에도 유지된다
- [x] 직업 선택이 최초 1회만 표시된다

---

## v0.2 추가 태스크

- [x] **TASK-09** 타이핑 → 걷기 연동 — EventDetector에서 타이핑 시작/종료를 웹뷰에 전달해 캐릭터 walk 상태를 트리거

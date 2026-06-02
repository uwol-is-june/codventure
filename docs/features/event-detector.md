# TASK-05 — EventDetector

> **파일**: `src/EventDetector.ts`  
> **의존**: 없음 (v0.2 첫 번째)  
> **역할**: VSCode 개발 행동을 감지해 GameController로 전달하는 핵심 브릿지

---

## 구현 체크리스트

### 타이핑 감지
- [ ] `vscode.workspace.onDidChangeTextDocument` 구독
- [ ] 30초 디바운스로 "타이핑 중" 상태 유지
- [ ] 타이핑 중 상태일 때 분당 XP/HP 계산 타이머 동작
- [ ] 자동생성 파일 제외 (node_modules, .git, dist)

### 빌드/실행 감지
- [ ] `vscode.tasks.onDidEndTask` 구독
- [ ] exit code 0 → `xp_gained(10)` + `hp_changed(-3)` + `run` 애니메이션
- [ ] exit code 1+ → `hp_changed(-5)` + `monster_spawn('bug_slime')`

### Git 커밋 감지
- [ ] 방법 A: `.git/COMMIT_EDITMSG` 변경 감지 (`onDidChangeTextDocument`)
- [ ] 방법 B: `vscode.extensions.getExtension('vscode.git')` 활용 (우선 시도)
- [ ] 커밋 감지 시: `xp_gained(15)` + `hp_changed(+5)` + `flag_plant` 트리거

### 에러/버그 감지
- [ ] `vscode.languages.onDidChangeDiagnostics` 구독
- [ ] 신규 Error 추가 → `monster_spawn` (에러 수 기준 종류 결정)
- [ ] 기존 Error 전부 해소 → `monster_defeat` + `xp_gained(20)`
- [ ] 에러 수 → 몬스터 종류: 1–2개 `bug_slime`, 3–5개 `deadlock_skull`, 6개+ `critical_dragon`

### 테스트 통과 감지
- [ ] `vscode.tasks.onDidEndTask`에서 task 이름에 'test' 포함 여부 필터링
- [ ] 성공 시: `xp_gained(25)` + `hp_changed(-3)`

### 장시간 비활성 감지
- [ ] `lastActivityTime` 추적
- [ ] 15분 초과 시 HP 소모 타이머 정지 (휴식 상태 아님 — 단순 일시정지)
- [ ] 재활성 시 타이머 재개

---

## 이벤트 → 게임 액션 매핑

| 개발 행동 | GameController 호출 |
|---------|------------------|
| 타이핑 중 (분당) | `xp_gained(1)` + `hp_changed(-drain)` |
| 빌드 성공 | `xp_gained(10)` + `hp_changed(-3)` + `run` |
| 빌드 실패 | `hp_changed(-5)` + `monster_spawn('bug_slime')` |
| git 커밋 | `xp_gained(15)` + `hp_changed(+5)` + `flag_plant` |
| Error 추가 | `monster_spawn(type)` |
| Error 전멸 | `monster_defeat` + `xp_gained(20)` |
| 테스트 통과 | `xp_gained(25)` + `hp_changed(-3)` |
| 15분 비활성 | HP 타이머 정지 |

---

## 주의사항

- `onDidChangeDiagnostics`는 파일 저장마다 발생하지 않을 수 있으므로 `onDidSaveTextDocument`에서 명시적 재평가 필요
- 중복 이벤트 방지: 빌드 성공 직후 10초간 동일 이벤트 무시

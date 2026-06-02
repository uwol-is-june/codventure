# TASK-08 — 저장/로드

> **파일**: `src/storage/SaveManager.ts`  
> **의존**: 마지막 통합 단계 (v0.2 전체 완성 후)

---

## GameState 구조

```typescript
interface GameState {
  version: number           // 마이그레이션용
  character: {
    class: 'knight' | 'mage' | 'cleric'
    name: string
    level: number           // 1–5
    xp: number
    hp: number
    maxHp: number
    title?: string          // Lv.5 엔딩 후 칭호
  }
  world: {
    distanceTraveled: number
    currentZone: Zone
    flagsPlanted: number
  }
  stats: {
    bugsDefeated: number
    totalCommits: number
    totalBuilds: number
    totalXP: number
  }
  companions: CompanionId[]
  firstSetup: boolean
}
```

---

## 구현 체크리스트

### 저장 (`SaveManager.save`)
- [ ] `vscode.ExtensionContext.globalState.update('codventure.state', state)` 호출
- [ ] 저장 시점:
  - 레벨업 시
  - git 커밋 감지 시
  - 휴식 시작/종료 시
  - `extension.deactivate()` 시 (동기적으로 처리)
- [ ] Webview → Extension `save_state` 메시지 수신 시 즉시 저장

### 로드 (`SaveManager.load`)
- [ ] `activate()` 시 `globalState.get('codventure.state')` 읽기
- [ ] Webview `ready` 메시지 수신 후 `state_loaded` 전송
- [ ] 데이터 없으면 `firstSetup: true`인 초기 상태 반환

### 마이그레이션
- [ ] `GameState.version` 필드로 버전 관리
- [ ] 구버전 저장 데이터 자동 변환 (누락 필드 기본값 채우기)
- [ ] 변환 불가한 경우 초기화 후 알림 표시

---

## 저장 키 규칙

```typescript
const SAVE_KEY = 'codventure.state';
// globalState는 VSCode 설치 단위로 유지됨 (머신별)
```

---

## deactivate 처리 주의사항

- `deactivate()`는 비동기를 보장하지 않으므로 `await` 없이 동기 저장 또는 최신 상태를 메모리에 유지해 즉각 flush 가능하도록 설계

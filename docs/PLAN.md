# codventure — 개발 계획서

현재 버전: **v0.1.5** (마켓플레이스 배포 완료)  
장르: 판타지 횡스크롤 어드벤처 VSCode 익스텐션

---

## 핵심 설계 철학

> **코딩이 곧 모험이다. 개발자의 리듬이 게임의 리듬이다.**

게임이 개발자에게 맞춰진다. 개발자가 게임에 맞추지 않는다.

| 개발자가 하는 것 | 게임에서 일어나는 것 |
|---|---|
| 코드를 타이핑한다 | 캐릭터가 오른쪽으로 전진한다 |
| 빌드/실행을 돌린다 | 캐릭터가 질주한다 |
| git commit을 한다 | 깃발을 꽂는다 (저장점) |
| 에러 로그가 뜬다 | 몬스터가 나타난다 |
| 디버깅 중이다 | 전투 중이다 |
| 버그를 고쳤다 | 몬스터를 쓰러뜨렸다 |
| 쉬고 싶어서 멈춘다 | 캠프를 친다 (HP 회복) |

### 절대 없는 것

- ❌ 방치 패널티 — 자리를 비워도 상태 악화 없음
- ❌ 강제 귀환 — HP 0이어도 데스 없음, 자동 캠프 전환
- ❌ 숙제 느낌의 일일 미션 — 모든 이벤트는 개발 행동에서 자연 발생

### 반드시 있는 것

- ✅ 캐릭터는 항상 오른쪽으로 걷고 있음 (모험 중단 없음)
- ✅ XP 오를 때 HP도 소모됨 (전진의 대가)
- ✅ 휴식 버튼으로 언제든 캠프 전환 가능
- ✅ 버그 수정 = 몬스터 격퇴 = 뿌듯함

---

## 아키텍처 개요

```
codventure/
├── src/
│   ├── extension.ts          # 진입점, VSCode 이벤트 구독
│   ├── GameController.ts     # 전체 게임 상태 관리 (싱글턴)
│   ├── EventDetector.ts      # VSCode 개발 행동 감지
│   ├── panel/
│   │   ├── GamePanel.ts      # WebviewView 패널 관리
│   │   └── webview/
│   │       ├── index.html
│   │       ├── main.ts       # 메인 게임 루프 (Canvas)
│   │       ├── renderer/
│   │       │   ├── CharacterRenderer.ts
│   │       │   ├── BackgroundRenderer.ts
│   │       │   ├── MonsterRenderer.ts
│   │       │   ├── ParticleSystem.ts
│   │       │   └── UIRenderer.ts
│   │       ├── game/
│   │       │   ├── StateMachine.ts
│   │       │   ├── Character.ts
│   │       │   ├── Monster.ts
│   │       │   └── World.ts
│   │       └── sprites/
│   │           ├── KnightSprite.ts
│   │           ├── MageSprite.ts
│   │           └── ClericSprite.ts
│   └── storage/
│       └── SaveManager.ts    # VSCode globalState 저장/로드
├── package.json
└── docs/
    ├── PLAN.md               # 이 파일 — 기획/설계
    ├── TASK.md               # 현재 진행 태스크
    └── BACKLOG.md            # 추후 개발 항목
```

### 메시지 프로토콜 (VSCode ↔ Webview)

```typescript
// Extension → Webview
type ExtensionMessage =
  | { type: 'xp_gained';    amount: number; reason: XPReason }
  | { type: 'hp_changed';   amount: number; reason: HPReason }
  | { type: 'monster_spawn'; monster: MonsterType }
  | { type: 'monster_defeat' }
  | { type: 'rest_start' }
  | { type: 'rest_end' }
  | { type: 'level_up';    newLevel: number }
  | { type: 'state_loaded'; state: GameState }

// Webview → Extension
type WebviewMessage =
  | { type: 'rest_requested' }
  | { type: 'ready' }
  | { type: 'save_state'; state: GameState }
```

---

## 데이터 모델

```typescript
interface GameState {
  version: number
  character: {
    class: 'knight' | 'mage' | 'cleric'
    name: string
    level: number      // 1–5
    xp: number
    hp: number
    maxHp: number      // 직업별 상이
    title?: string     // Lv.5 엔딩 후 칭호
  }
  world: {
    distanceTraveled: number   // 횡스크롤 총 이동 거리 (px 누적)
    currentZone: Zone          // 'village' | 'forest' | 'mountain' | 'wasteland' | 'castle'
    flagsPlanted: number       // 커밋 횟수
  }
  stats: {
    bugsDefeated: number
    totalCommits: number
    totalBuilds: number
    totalXP: number
  }
  companions: CompanionId[]    // 합류한 동료 목록
  firstSetup: boolean          // false면 직업선택 스킵
}

type Zone = 'village' | 'forest' | 'mountain' | 'wasteland' | 'castle'
type MonsterType = 'bug_slime' | 'deadlock_skull' | 'critical_dragon' | 'demon_king'
type XPReason = 'typing' | 'build' | 'commit' | 'bug_fixed' | 'test_pass'
type HPReason = 'typing_drain' | 'battle' | 'rest_recovery' | 'commit_bonus'
```

### 직업별 스탯

```typescript
const CLASS_STATS = {
  knight: { maxHp: 120, hpDrainMultiplier: 0.7,  xpMultiplier: 1.0, restMultiplier: 1.0 },
  mage:   { maxHp: 80,  hpDrainMultiplier: 1.3,  xpMultiplier: 1.5, restMultiplier: 1.0 },
  cleric: { maxHp: 100, hpDrainMultiplier: 1.0,  xpMultiplier: 1.0, restMultiplier: 2.0 },
}
```

### XP 테이블

```typescript
const LEVEL_XP_THRESHOLDS = [0, 500, 1500, 3500, 7000] // Lv1~5 진입 XP
const ZONE_BY_LEVEL: Record<number, Zone> = {
  1: 'village', 2: 'forest', 3: 'mountain', 4: 'wasteland', 5: 'castle'
}
```

---

## 버전 로드맵

> 태스크 상세 및 진행 현황 → [TASK.md](TASK.md)  
> 추후 개발 항목 → [BACKLOG.md](BACKLOG.md)

| 버전 | 상태 | 목표 |
|------|------|------|
| v0.1 | ✅ 완료 | 기반 인프라 — Canvas 렌더링, 상태머신, 마켓플레이스 배포 |
| v0.2 | 🔧 진행 중 | 코딩 이벤트 감지, HP 시스템, 캐릭터 애니메이션, 직업 선택 |
| v0.3 | ⬜ 예정 | 몬스터 & 전투 시스템 (에러 = 몬스터) |
| v0.4 | ⬜ 예정 | 동료 시스템, 레벨별 캐릭터 진화, 마왕 이벤트 |
| v0.5 | ⬜ 예정 | 마켓플레이스 완성도 (README GIF, 설정값, 퍼포먼스) |

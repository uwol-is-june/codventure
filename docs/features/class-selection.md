# TASK-01 — 직업 선택 화면

> **파일**: `webview/main.ts`, `webview/game/StateMachine.ts`  
> **의존**: TASK-03 (캐릭터 스프라이트 완성 후)  
> **조건**: `GameState.firstSetup === true` 일 때만 표시. 선택 후 영구 스킵.

---

## 직업별 스탯

```typescript
const CLASS_STATS = {
  knight: { maxHp: 120, hpDrainMultiplier: 0.7,  xpMultiplier: 1.0, restMultiplier: 1.0 },
  mage:   { maxHp: 80,  hpDrainMultiplier: 1.3,  xpMultiplier: 1.5, restMultiplier: 1.0 },
  cleric: { maxHp: 100, hpDrainMultiplier: 1.0,  xpMultiplier: 1.0, restMultiplier: 2.0 },
}
```

| 직업 | 특징 | HP | HP 소모 | XP | 회복 |
|------|------|----|---------|----|------|
| 기사 (knight) | 튼튼한 탱커 | 120 | ×0.7 | ×1.0 | ×1.0 |
| 마법사 (mage) | 고위험 고보상 | 80 | ×1.3 | ×1.5 | ×1.0 |
| 성직자 (cleric) | 회복 특화 | 100 | ×1.0 | ×1.0 | ×2.0 |

---

## 구현 체크리스트

### 직업 선택 화면 Canvas 렌더링
- [ ] 배경: 마을 초입 장면 (정적 레이어, village 배경 재사용)
- [ ] 중앙에 3개 직업 카드 배치 (각 180×220px)
  - 직업 픽셀아트 스프라이트 (TASK-03 스프라이트 재사용)
  - 직업 이름 + 한줄 설명 + 스탯 요약 텍스트
- [ ] 호버 시 카드 위로 8px 이동 (Canvas y 오프셋 보간)
- [ ] 클릭 영역 히트테스트 구현

### 선택 확정 연출
- [ ] 나머지 카드 페이드아웃 (0.4s, opacity 보간)
- [ ] 선택 카드 화면 중앙으로 이동 (0.5s)
- [ ] 빛 방출 파티클 폭발 (0.8s)
- [ ] 직업별 색상 파티클 (knight=청백, mage=보라, cleric=금색)
- [ ] 캐릭터 등장 후 게임 화면으로 전환

### 저장
- [ ] `character.class` 설정
- [ ] `character.maxHp = CLASS_STATS[class].maxHp`
- [ ] `character.hp = maxHp` (풀피로 시작)
- [ ] `GameState.firstSetup = false`
- [ ] `SaveManager.save()` 호출

---

## StateMachine 상태 전이

```
INIT → (firstSetup true) → CLASS_SELECTION → (선택 완료) → PLAYING
INIT → (firstSetup false) → PLAYING
```

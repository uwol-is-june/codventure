# TASK-04 — HP 시스템

> **파일**: `webview/game/Character.ts`, `src/GameController.ts`  
> **의존**: TASK-05 (EventDetector)

---

## HP 수치 규칙

```typescript
const HP_DRAIN = {
  typing_per_minute: 0.5,   // 직업 multiplier 적용
  build_success:     3,
  build_fail:        5,
  battle_slime:      5,
  battle_skull:      10,
  battle_dragon:     20,
}

const HP_RECOVERY = {
  rest_per_30s:         10,  // 직업 multiplier 적용
  commit_bonus:         5,
  monster_defeat_bonus: 3,
}

const CLASS_STATS = {
  knight: { maxHp: 120, hpDrainMultiplier: 0.7,  restMultiplier: 1.0 },
  mage:   { maxHp: 80,  hpDrainMultiplier: 1.3,  restMultiplier: 1.0 },
  cleric: { maxHp: 100, hpDrainMultiplier: 1.0,  restMultiplier: 2.0 },
}
```

---

## 구현 체크리스트

### HP 소모 타이머
- [ ] EventDetector 타이핑 감지 중일 때만 drain 타이머 동작
- [ ] VSCode 비활성(15분 초과) 시 타이머 일시정지 → HP 유지
- [ ] 분당 소모량: `HP_DRAIN.typing_per_minute × CLASS_STATS[class].hpDrainMultiplier`

### HP 0 처리
- [ ] 데스 없음 — HP 0 도달 시 자동 `rest_start` 메시지 발송
- [ ] Webview 캠프 씬 자동 전환
- [ ] VSCode 알림: "너무 무리했습니다. 잠깐 쉬어가세요."
- [ ] 유저가 수동으로 "모험 재개" 버튼 눌러야만 재개

### HP 만충 처리
- [ ] 휴식 중 HP = maxHp 도달 시 `rest_end` 자동 발송
- [ ] 3초 후 모험 재개 연출 (캐릭터 일어서기)

### HP 바 UI
- [ ] 위치: Canvas 좌측 상단 (x:12, y:12)
- [ ] 크기: 120×10px, 외곽 테두리 픽셀아트 스타일 (2px)
- [ ] 색상 분기: 100–60% 초록, 59–30% 노랑, 29–0% 빨강
- [ ] HP 수치 텍스트 옆에 표시 (예: `73/100`)
- [ ] 감소 시: 즉각 반영 (애니메이션 없음)
- [ ] 회복 시: 초록 채워지는 애니메이션 (0.5s ease-out)

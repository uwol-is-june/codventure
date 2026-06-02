# TASK-03 — 캐릭터 렌더러 & 애니메이션

> **파일**: `webview/renderer/CharacterRenderer.ts`, `webview/sprites/KnightSprite.ts`, `MageSprite.ts`, `ClericSprite.ts`  
> **의존**: 없음 (TASK-02와 병렬 작업 가능)

---

## 애니메이션 상태 정의

```typescript
type CharacterAnim =
  | 'walk_normal'   // HP 70%+  : 활기찬 걸음
  | 'walk_tired'    // HP 30–69%: 살짝 느린 걸음
  | 'walk_danger'   // HP 1–29% : 비틀거림
  | 'run'           // 빌드/실행 이벤트 0.8s
  | 'attack'        // 전투 중 루프
  | 'victory'       // 몬스터 격퇴 직후 1.5s
  | 'rest'          // 캠프 씬: 앉아서 모닥불 바라보기
  | 'flag_plant'    // 커밋 이벤트 1.2s
  | 'level_up'      // 레벨업 연출 2.0s
```

---

## 구현 체크리스트

### 직업별 스프라이트 3세트
- [x] **knight**: 검 + 방패 + 갑옷 / 색상: 회색-청색 계열
- [x] **mage**: 지팡이 + 로브 / 색상: 보라-파랑 계열
- [x] **cleric**: 십자가 + 성직자복 / 색상: 흰색-금색 계열
- [x] 각 직업은 동일한 drawCharacter() 인터페이스 구현 (catType→CLASS_MAP 매핑)

### walk 3단계
- [x] `walk_normal`: 8프레임, 몸 bob + 다리 교대
- [x] `walk_tired`: 6프레임 (HP 30-69%), 몸 기울임
- [x] `walk_danger`: 4프레임 (HP<30%), sin 좌우 비틀거림

### run
- [x] 전력질주 4프레임, SPEED×2.5
- [x] 발 아래 dust 파티클

### attack (직업별)
- [ ] TASK-09(몬스터 시스템)와 함께 구현 예정

### rest
- [x] 앉은 자세, 호흡 sin 2px 상하

### flag_plant
- [x] 깃발 꺼내기→들기→꽂기 4단계 (36프레임 1.2s)
- [x] 직업별 색상 깃발 (knight 빨강/mage 보라/cleric 흰색)

### HP 상태 시각 연출
- [x] HP 30% 이하: 캐릭터 외곽 붉은 윤곽선 깜빡임 (catFrame%30<15)
- [x] HP 10% 이하: 화면 모서리 붉은 radial vignette

---

## 스프라이트 드로잉 패턴

```typescript
// 스프라이트 파일 공통 인터페이스
interface AnimFrame {
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void;
}

// 픽셀 헬퍼
function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, scale: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}
```

PNG 스프라이트시트 사용 금지. 코드로 픽셀을 직접 배치.

---

## 프레임 수 요약

| 상태 | 프레임 | 지속 |
|------|--------|------|
| walk_normal | 8 | 무한 루프 |
| walk_tired | 6 | 무한 루프 |
| walk_danger | 4 | 무한 루프 |
| run | 4 | 0.8s 후 walk 복귀 |
| attack | 6 (직업별) | 전투 중 루프 |
| victory | 4 | 1.5s 후 walk 복귀 |
| rest | 2 (호흡) | 무한 루프 |
| flag_plant | 4 | 1.2s 후 walk 복귀 |

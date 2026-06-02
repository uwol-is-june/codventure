# TASK-02 — 횡스크롤 배경 시스템

> **파일**: `webview/renderer/BackgroundRenderer.ts`, `webview/game/World.ts`  
> **의존**: 없음 (TASK-05와 병렬 작업 가능)

---

## 구현 체크리스트

### 패럴랙스 레이어 구성 (3단)
- [x] Layer 0 (sky): `scrollSpeed × 0.1` — 하늘, 구름
- [x] Layer 1 (mid): `scrollSpeed × 0.5` — 먼 산/나무
- [x] Layer 2 (ground): `scrollSpeed × 1.0` — 지면, 풀, 돌
- [x] `image-rendering: pixelated` CSS 적용

### 무한 스크롤
- [x] 각 레이어를 두 장 이어붙이기 (A-B-A-B 루프)
- [x] x 오프셋이 레이어 너비 초과 시 리셋

### 존(Zone)별 배경 에셋 (Procedural)

| 존 | 레벨 | 배경 특징 |
|----|------|---------|
| village | Lv.1 | 파란 하늘, 초원, 나무 |
| forest | Lv.2 | 울창한 숲, 이끼 낀 바닥 |
| mountain | Lv.3 | 회색 바위, 설산 원경 |
| wasteland | Lv.4 | 붉은 하늘, 황토 지면, 마른 나무 |
| castle | Lv.5 | 검은 하늘, 마왕성 실루엣 |

- [x] 각 존별 배경 procedural 드로잉 구현 (5세트)

### 존 전환 연출 (레벨업 시)
- [x] 화면 페이드아웃 → 새 존 배경으로 페이드인 (1.2s)
- [x] 전환 중 텍스트 오버레이: "새로운 땅에 발을 디뎠다"

### scrollSpeed 결정 로직
- [x] 기본: `1.0px/frame` (도보)
- [x] 빌드/실행 감지 시: `3.0px/frame`으로 0.8s 가속 후 복귀
- [x] HP 30% 이하: `0.6px/frame` (비틀거림 반영)
- [x] 휴식 중: `0px/frame` (정지)

---

## World.ts 데이터

```typescript
interface WorldState {
  distanceTraveled: number  // 총 이동 거리 (px 누적)
  currentZone: Zone         // 레벨에 따라 자동 결정
  flagsPlanted: number      // 커밋 횟수
}

type Zone = 'village' | 'forest' | 'mountain' | 'wasteland' | 'castle'

const ZONE_BY_LEVEL: Record<number, Zone> = {
  1: 'village', 2: 'forest', 3: 'mountain', 4: 'wasteland', 5: 'castle'
}
```

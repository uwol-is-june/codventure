# Feature: Animation (애니메이션 시스템)

## 현재 상태

- [x] Canvas 렌더링 루프 기본 뼈대 (setInterval 기반)
- [x] Placeholder 고양이 도형 (임시)
- [ ] 실제 픽셀아트 스프라이트
- [ ] 상태별 애니메이션 분기

---

## 구현 방식

### 렌더링 환경
- Webview 내 `<canvas>` 엘리먼트 사용
- `image-rendering: pixelated` CSS로 픽셀 선명하게 유지
- 픽셀 1개 = `SCALE`px (현재 8). 16×16 픽셀 고양이 → 캔버스 128×128

### 스프라이트 드로잉 방식
```js
// 픽셀 하나를 그리는 헬퍼
function px(color, x, y) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

// 사용 예시
px('#f5a623', 5, 4); // (5, 4) 위치에 주황색 픽셀
```

PNG 스프라이트시트 없이 **코드로 픽셀을 직접 배치**한다.
스프라이트 수정 = 코드 수정. 버전 관리 친화적.

### 프레임 구조
```js
const FRAMES = {
  idle: [drawIdle_0, drawIdle_1, drawIdle_2],
  walk: [drawWalk_0, drawWalk_1, drawWalk_2, drawWalk_3],
  sit:  [drawSit_0, drawSit_1],
  groom: [drawGroom_0, drawGroom_1, drawGroom_2, drawGroom_3],
  sleep: [drawSleep_0, drawSleep_1],
  eat:  [drawEat_0, drawEat_1, drawEat_2],
};
```

각 `draw*_N` 함수는 해당 프레임의 모든 픽셀을 `px()` 호출로 묘사한다.

### 애니메이션 루프
```js
let frame = 0;

function animate() {
  clearCanvas();
  const frames = FRAMES[currentState];
  frames[frame % frames.length](); // 현재 상태의 프레임 순환
  frame++;
}

setInterval(animate, 120); // ~8fps
```

---

## 색상 팔레트 (예정)

| 이름 | HEX | 용도 |
|------|-----|------|
| body | `#f5a623` | 몸통 주색 |
| stripe | `#d4891a` | 줄무늬 |
| belly | `#fde9c5` | 배 |
| outline | `#2a1a0a` | 윤곽선 |
| eye | `#1a1a2e` | 눈동자 |
| nose | `#ff6b6b` | 코 |
| tongue | `#ff9999` | 혀 |

---

## TODO

- [ ] 16×16 픽셀 기준 고양이 기본형 스프라이트 설계
- [ ] idle 애니메이션 구현 (꼬리 흔들기, 3프레임)
- [ ] walk 애니메이션 구현 (발 교차, 4프레임)
- [ ] sit 애니메이션 구현 (2프레임)
- [ ] groom 애니메이션 구현 (발로 얼굴 닦기, 4프레임)
- [ ] sleep 애니메이션 구현 (눈 감김 + Zzz, 2프레임)
- [ ] eat 애니메이션 구현 (생선 먹기, 3프레임)
- [ ] 상태 전환 시 프레임 카운터 리셋

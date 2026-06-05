'use strict';

// 팔레트: index 0 = 투명, 이후 6색 (5 기존 + 1 추가)
const EGG_PALETTE = [
  'transparent', // 0
  '#F0EAC8',     // 1: 껍데기 메인 (크림 흰색)
  '#B8A060',     // 2: 껍데기 그림자 (황갈색)
  '#806030',     // 3: 깊은 그림자 (갈색)
  '#FFD030',     // 4: 사선 줄무늬 (밝은 노랑)
  '#C09010',     // 5: 줄무늬 그림자 (진한 노랑)
  '#FFF8E8',     // 6: 하이라이트 (왼쪽 상단 밝은 면)
];

// 24×24 — F0/F3 중앙
// 셰이딩: 왼쪽 2열=하이라이트(6), 중앙=메인(1), 오른쪽 ~30%=그림자(2), 끝 1-2열=짙은(3)
// 사선 줄무늬: (r+c)≡22 mod 10 → 4, (r+c)≡23 mod 10 → 5  (2줄)
//             (r+c)≡31 mod 10 → 4, (r+c)≡32 mod 10 → 5  (= +9 이므로 자동 처리)
// 알 윤곽: 행별 [L, R] (L, R 포함)
// 상단이 좁고 하단이 약간 넓은 실루엣
const EGG_SHAPE = [
  null,           // 0
  [10,13],        // 1  4px  tip
  [ 9,14],        // 2  6px
  [ 8,15],        // 3  8px
  [ 7,16],        // 4  10px
  [ 6,17],        // 5  12px
  [ 5,18],        // 6  14px
  [ 4,19],        // 7  16px
  [ 4,19],        // 8  16px
  [ 3,20],        // 9  18px
  [ 3,20],        // 10 18px
  [ 3,20],        // 11 18px  (widest)
  [ 3,20],        // 12 18px
  [ 4,19],        // 13 16px
  [ 4,19],        // 14 16px
  [ 5,18],        // 15 14px
  [ 5,18],        // 16 14px
  [ 6,17],        // 17 12px
  [ 7,16],        // 18 10px
  [ 8,15],        // 19 8px
  [ 9,14],        // 20 6px
  [10,13],        // 21 4px  bottom curve
  [11,12],        // 22 2px  bottom tip
  null,           // 23
];

function buildFrame(shiftFn) {
  const rows = [];
  for (let r = 0; r < 24; r++) {
    const row = new Array(24).fill(0);
    const shape = EGG_SHAPE[r];
    if (!shape) { rows.push(row); continue; }

    const [L, R] = shape;
    const shift  = shiftFn(r);
    const w      = R - L + 1;
    const shadowStart = L + Math.floor(w * 0.62); // 오른쪽 38% = 그림자
    const deepStart   = R - 1;                    // 마지막 2열 = 짙은 그림자

    for (let c = L; c <= R; c++) {
      const sc = c + shift; // 이동 적용 열
      if (sc < 0 || sc >= 24) continue;

      const diag = r + c; // 원래 좌표 기준 줄무늬 (shift 없이)
      const dm   = diag % 10;

      let color;
      if (c >= deepStart) {
        color = 3; // 짙은 그림자
      } else if (c >= shadowStart) {
        color = 2; // 그림자
      } else if (c <= L + 1) {
        color = 6; // 하이라이트
      } else {
        color = 1; // 메인
      }

      // 줄무늬 덮어쓰기 (그림자/깊은그림자 위는 적용 안 함)
      if (c < shadowStart) {
        if (dm === 2 || dm === 1) color = 4; // 줄무늬 밝음
        else if (dm === 3 || dm === 0) color = 5; // 줄무늬 그림자
      }

      row[sc] = color;
    }
    rows.push(row);
  }
  return rows;
}

// shiftFn(r): 행 r에서 x 이동량
// 기울임 pivot = 하단 (row 18 이하 고정), 상단 rows 1-8 이동
function makeShift(topShift) {
  return function (r) {
    if (r <= 4)  return topShift;
    if (r <= 8)  return topShift > 0 ? Math.max(0, topShift - 1) : Math.min(0, topShift + 1);
    return 0;
  };
}

const FRAME_C  = buildFrame(() => 0);
const FRAME_R1 = buildFrame(makeShift(1));
const FRAME_R2 = buildFrame(makeShift(2));
const FRAME_L1 = buildFrame(makeShift(-1));
const FRAME_L2 = buildFrame(makeShift(-2));

// 루프: 중앙 → 오른쪽1 → 오른쪽2 → 중앙 → 왼쪽1 → 왼쪽2
const EGG_FRAMES = [FRAME_C, FRAME_R1, FRAME_R2, FRAME_C, FRAME_L1, FRAME_L2];

module.exports = { EGG_PALETTE, EGG_FRAMES };

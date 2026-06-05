'use strict';

const GLOBAL_STATE_KEY = 'codventure.monster';

// ── TASK-05-4: XP 임계값 테이블 ─────────────────────────────────────────────
// index = 목표 레벨 (레벨 N-1 → N 에 필요한 XP)
// PLAN.md 기준: 0→1: 50, 1→2: 100, 2→3: 200, 3→4: 300, 4→5: 500,
//               5→6: 700, 6→7: 900, 7→8: 1200, 8→9: 1500, 9→10: 2000,
//               이후 500씩 증가
const XP_THRESHOLDS = [50, 100, 200, 300, 500, 700, 900, 1200, 1500, 2000];

function thresholdFor(level) {
  if (level < XP_THRESHOLDS.length) return XP_THRESHOLDS[level];
  return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + (level - XP_THRESHOLDS.length + 1) * 500;
}

// ── TASK-05-3: 레벨 → 진화 스테이지 매핑 ────────────────────────────────────
// PLAN.md 진화 단계표 기준
function levelToStage(level) {
  if (level === 0)              return 0; // 알
  if (level <= 2)               return 1; // 유아기
  if (level <= 4)               return 2; // 유아기 II
  if (level <= 9)               return 3; // 성장기
  if (level <= 19)              return 4; // 성숙기
  if (level <= 39)              return 5; // 완전체
  return 6;                               // 궁극체
}

// ── TASK-05-1: 기본값 초기화 ────────────────────────────────────────────────
function defaultMonster() {
  const now = Date.now();
  return {
    name:           '???',
    species:        'default',
    evolutionStage: 0,
    level:          0,
    xp:             0,
    totalXp:        0,
    bornAt:         now,
    lastActive:     now,
    stats: {
      saveCount:      0,
      sessionMinutes: 0,
      linesAdded:     0,
    },
  };
}

// ── TASK-05-2: globalState CRUD ─────────────────────────────────────────────
function getMonster(context) {
  return context.globalState.get(GLOBAL_STATE_KEY) ?? defaultMonster();
}

function saveMonster(context, data) {
  return context.globalState.update(GLOBAL_STATE_KEY, data);
}

// ── TASK-05-4: XP 누적 + 레벨업 판정 ────────────────────────────────────────
// 반환: { monster, leveledUp: boolean, evolved: boolean }
function applyXp(monster, amount) {
  const m = { ...monster, stats: { ...monster.stats } };
  m.xp        += amount;
  m.totalXp   += amount;
  m.lastActive = Date.now();

  let leveledUp = false;
  let evolved   = false;

  while (m.xp >= thresholdFor(m.level)) {
    m.xp     -= thresholdFor(m.level);
    m.level  += 1;
    leveledUp = true;

    const newStage = levelToStage(m.level);
    if (newStage !== m.evolutionStage) {
      m.evolutionStage = newStage;
      evolved = true;
    }
  }

  return { monster: m, leveledUp, evolved };
}

module.exports = { defaultMonster, getMonster, saveMonster, levelToStage, applyXp, XP_THRESHOLDS };

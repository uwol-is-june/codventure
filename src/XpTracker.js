'use strict';
const { getMonster, saveMonster, applyXp, thresholdFor, isSad } = require('./MonsterState');

class XpTracker {
  // TASK-06-1: context(globalState 접근), provider(postMessage 전송) 보관
  constructor(context, provider) {
    this._context  = context;
    this._provider = provider;
  }

  // TASK-06-2/3: XP 적립 → 레벨업 판정 → postMessage 전송
  async onSave() {
    const before              = getMonster(this._context);
    const wasSad              = isSad(before);
    const { monster, leveledUp, evolved } = applyXp(before, 2);
    monster.stats.saveCount  += 1;

    await saveMonster(this._context, monster);

    // XP 획득 즉시 슬픈 표정 해제 (lastActive가 방금 갱신됨)
    if (wasSad) {
      this._provider.postMessage({ type: 'SAD_STATE', isSad: false });
    }

    // XP 획득 토스트
    this._provider.postMessage({
      type:   'XP_GAIN',
      amount: 2,
      source: '저장',
      level:  monster.level,
      xp:     monster.xp,
      xpMax:  thresholdFor(monster.level),
    });

    if (leveledUp) {
      if (before.level === 0) {
        // 알 → 유아기 부화 연출
        this._provider.postMessage({ type: 'HATCH' });
      } else if (evolved) {
        // 진화: EVOLVE 연출 (레벨업 파티클 포함)
        this._provider.postMessage({
          type:     'EVOLVE',
          newLevel: monster.level,
          newStage: monster.evolutionStage,
          xp:       monster.xp,
          xpMax:    thresholdFor(monster.level),
        });
      } else {
        // 일반 레벨업 파티클 연출
        this._provider.postMessage({
          type:     'LEVEL_UP',
          newLevel: monster.level,
          newStage: monster.evolutionStage,
          xp:       monster.xp,
          xpMax:    thresholdFor(monster.level),
        });
      }
    }
  }
}

module.exports = { XpTracker };

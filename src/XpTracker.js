'use strict';
const { getMonster, saveMonster, applyXp } = require('./MonsterState');

class XpTracker {
  // TASK-06-1: context(globalState 접근), provider(postMessage 전송) 보관
  constructor(context, provider) {
    this._context  = context;
    this._provider = provider;
  }

  // TASK-06-2/3: XP 적립 → 레벨업 판정 → postMessage 전송
  async onSave() {
    const before              = getMonster(this._context);
    const { monster, leveledUp, evolved } = applyXp(before, 2);
    monster.stats.saveCount  += 1;

    await saveMonster(this._context, monster);

    // XP 획득 토스트
    this._provider.postMessage({ type: 'XP_GAIN', amount: 2, source: '저장' });

    if (leveledUp) {
      if (before.level === 0) {
        // TASK-08-3: 알 → 유아기 부화 연출 트리거
        this._provider.postMessage({ type: 'HATCH' });
      } else {
        // 일반 레벨업 알림
        this._provider.postMessage({
          type:     'LEVEL_UP',
          newLevel: monster.level,
          newStage: monster.evolutionStage,
        });
        // 진화(스테이지 변경) 시 스프라이트 교체
        if (evolved) {
          this._provider.postMessage({ type: 'STATE_UPDATE', monster });
        }
      }
    }
  }
}

module.exports = { XpTracker };

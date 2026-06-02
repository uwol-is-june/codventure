# TASK-07 — XP 팝업 & 레벨업 UI

> **파일**: `webview/renderer/UIRenderer.ts`  
> **의존**: 나머지 v0.2 태스크 완성 후

---

## XP/레벨 테이블

```typescript
const LEVEL_XP_THRESHOLDS = [0, 500, 1500, 3500, 7000]  // Lv1~5 진입 XP

const XP_GAINS = {
  typing_per_minute: 1,
  build_success:     10,
  commit:            15,
  bug_fixed:         20,
  test_pass:         25,
}
```

---

## 구현 체크리스트

### XP 팝업 텍스트
- [ ] 이벤트 발생 지점 위에 텍스트 플로팅
- [ ] 형태: `+10 XP`, 픽셀 폰트
- [ ] 위로 30px 이동하며 0.8s 동안 페이드아웃
- [ ] 색상: XP = 보라(`#9b59b6`), HP 소모 = 빨강(`#e74c3c`), HP 회복 = 초록(`#2ecc71`)
- [ ] 복수 팝업 동시 표시 지원 (배열로 관리)

### 레벨업 연출 (2.0s 시퀀스)
- [ ] 화면 전체 흰색 플래시 (0.1s)
- [ ] "LEVEL UP!" 대형 텍스트 중앙 표시
- [ ] 캐릭터 주변 방사형 파티클 폭발 (직업별 색상)
- [ ] 직업별 진화 외형으로 스프라이트 전환 (TASK-11 연동 전까지는 단순 색상 변화)
- [ ] 새 존 배경으로 전환 (TASK-02 존 전환 연출 호출)
- [ ] 동료 합류 연출 (TASK-12 구현 후 연동)

### 상태바 텍스트 (VSCode 하단)
- [ ] 포맷: `⚔️ Lv.{level} | {hpBlocks} HP | {xp} XP`
- [ ] HP 블록 계산: `'█'.repeat(filled) + '░'.repeat(8 - filled)` (8칸 기준)
- [ ] 클릭 시 `codventure.show` 실행
- [ ] HP 30% 이하: 앞 아이콘 `⚠️`로 전환
- [ ] 레벨업 직후 3s: `🎉 LEVEL UP! Lv.{n}` 표시 후 복귀
- [ ] Lv.5 전설 칭호 획득 후: `👑 전설의 {직업명}` 표시

---

## UIRenderer 팝업 풀 구조

```typescript
interface XpPopup {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;   // 1.0 → 0.0
  dy: number;      // 프레임당 이동량
}

// 매 프레임 처리
popups = popups
  .map(p => ({ ...p, y: p.y - p.dy, alpha: p.alpha - 0.02 }))
  .filter(p => p.alpha > 0);
```

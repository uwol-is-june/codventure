# codventure — 개발 계획서

현재 버전: **v0.3 (리빌드 중)**  
장르: 픽셀 아트 육성 게임 × VSCode 익스텐션

---

## 핵심 설계 철학

> "코딩할수록 몬스터가 자란다. 코드는 먹이다."

| 개발자가 하는 것 | 게임에서 일어나는 것 |
|---|---|
| 파일을 저장한다 | XP를 획득한다 |
| 코딩 세션을 30분 이어간다 | 보너스 XP를 획득한다 |
| 레벨이 오른다 | 몬스터가 성장하거나 진화한다 |
| 0레벨 → 1레벨 | 알이 깨지고 유아기 몬스터가 탄생한다 |

### 절대 없는 것

- 별도 조작이 필요한 미니게임 (코딩 흐름을 끊지 않는다)
- 인터넷 통신 / 외부 API 호출
- 과금 요소

### 반드시 있는 것

- 코딩 활동만으로 성장하는 자연스러운 루프
- 픽셀 아트 스프라이트 (디지몬 도트 게임 스타일)
- 진화 단계별 명확한 형태 변화
- 알 → 유아기 부화 연출

---

## 진화 단계 설계

디지몬 시리즈의 성장 단계를 참고한다.  
픽셀 아트 레퍼런스: 디지몬 디지털카드배틀, 디지몬 월드 (PS1), 디지탈 몬스터 LCD 게임.

| 단계 | 이름 | 레벨 | 스프라이트 크기 | 외형 특징 |
|------|------|------|----------------|-----------|
| 0 | 알 (Egg) | 0 | 16×16 | 둥근 알, 반짝이는 줄무늬 |
| 1 | 유아기 (Baby) | 1–2 | 16×16 | 작고 통통, 눈만 있는 구체 |
| 2 | 유아기 II (In-Training) | 3–4 | 16×16 | 손발 생김, 표정 생김 |
| 3 | 성장기 (Rookie) | 5–9 | 24×24 | 뚜렷한 실루엣, 꼬리/날개 등 |
| 4 | 성숙기 (Champion) | 10–19 | 32×32 | 갑옷/무기 등 디테일 추가 |
| 5 | 완전체 (Ultimate) | 20–39 | 40×40 | 복잡한 실루엣, 발광 효과 |
| 6 | 궁극체 (Mega) | 40+ | 48×48 | 가장 복잡한 디자인, 오라 |

### 레벨 → XP 임계값

```
레벨 0 → 1 :  50 XP  (알 부화)
레벨 1 → 2 : 100 XP
레벨 2 → 3 : 200 XP  (유아기 II 진화)
레벨 3 → 4 : 300 XP
레벨 4 → 5 : 500 XP  (성장기 진화)
레벨 5 → 6 : 700 XP
레벨 6 → 7 : 900 XP
레벨 7 → 8 : 1200 XP
레벨 8 → 9 : 1500 XP
레벨 9 → 10: 2000 XP (성숙기 진화)
...이후 500 XP씩 증가
```

### XP 획득 공식

| 행동 | XP |
|------|----|
| 파일 저장 (onDidSaveDocument) | +2 |
| 30분 연속 코딩 세션 | +10 |
| 100줄 순 추가 (insertions) | +5 |
| 디버그 세션 시작 | +3 |

---

## 픽셀 아트 스타일 가이드

- **팔레트**: 제한 색상 (단계별 4–8색), 투명 배경
- **해상도**: 논리 픽셀로 정의, CSS `image-rendering: pixelated`로 x4 업스케일
- **스프라이트 저장 방식**: JS 배열 (2D color index array) — 외부 이미지 파일 없음
- **애니메이션 프레임**: 2–4프레임 루프 (숨쉬기 / 대기 모션)
- **특수 연출**:
  - 알 부화: 흔들림 → 금 → 빛 번짐 → 유아기 등장
  - 레벨업: 위로 튀어오름 + 별 파티클
  - 진화: 빛 감싸기 → 실루엣 변화

---

## 아키텍처 개요

```
codventure/
├── extension.js           # 진입점: activate, WebviewViewProvider, 이벤트 리스너
├── src/
│   ├── MonsterState.js    # 몬스터 데이터 CRUD (globalState 래퍼)
│   ├── XpTracker.js       # 코딩 이벤트 감지 → XP 적립 → 레벨업 판정
│   └── sprites/           # 픽셀 스프라이트 데이터 (순수 JS)
│       ├── egg.js
│       ├── baby.js
│       ├── inTraining.js
│       ├── rookie.js
│       └── ...
└── webview/
    ├── index.html         # Webview 진입점
    └── renderer.js        # Canvas 렌더링 엔진 + 애니메이션 루프
```

### 메시지 프로토콜 (Extension ↔ Webview)

```javascript
// Extension → Webview
{ type: 'STATE_UPDATE', monster: MonsterState }   // 상태 전체 동기화
{ type: 'XP_GAIN',  amount: number, source: string } // XP 획득 알림 (토스트)
{ type: 'LEVEL_UP', newLevel: number, newStage: number } // 레벨업 연출 트리거
{ type: 'EVOLVE',   newStage: number }              // 진화 연출 트리거

// Webview → Extension
{ type: 'READY' }                                   // Webview 초기화 완료
{ type: 'RENAME', name: string }                    // 사용자가 이름 변경
```

---

## 데이터 모델

```javascript
// ExtensionContext.globalState key: 'codventure.monster'
{
  name: string,           // 사용자가 지은 이름 (기본값: '???')
  species: string,        // 진화 계통 (현재: 'default', 추후 분기)
  evolutionStage: number, // 0=알 / 1=유아기 / 2=유아기II / 3=성장기 / 4=성숙기 / 5=완전체 / 6=궁극체
  level: number,          // 현재 레벨 (0부터 시작)
  xp: number,             // 현재 레벨 내 누적 XP
  totalXp: number,        // 전체 생애 획득 XP (기록용)
  bornAt: number,         // Unix timestamp — 알이 생성된 시각
  lastActive: number,     // Unix timestamp — 마지막 XP 획득 시각
  stats: {
    saveCount: number,    // 누적 파일 저장 횟수
    sessionMinutes: number, // 누적 코딩 세션 시간 (분)
    linesAdded: number,   // 누적 추가 라인 수
  }
}
```

---

## 버전 로드맵

> 태스크 상세 및 진행 현황 → [TASK.md](TASK.md)  
> 추후 개발 항목 → [BACKLOG.md](BACKLOG.md)

| 버전 | 상태 | 목표 |
|------|------|------|
| v0.4 | 🔧 진행 예정 | 알 렌더링 + 부화 연출 (0레벨 → 1레벨) + 기본 XP 시스템 |
| v0.5 | 📋 계획 | 유아기 / 유아기 II 스프라이트 + 숨쉬기 애니메이션 |
| v0.6 | 📋 계획 | 성장기 스프라이트 + 레벨업 파티클 연출 |
| v0.7 | 📋 계획 | 성숙기 + 완전체 스프라이트 + 진화 연출 풀 구현 |
| v1.0 | 📋 계획 | 궁극체 + 전 단계 완성 + 마켓플레이스 재배포 |
| v1.x | 💡 아이디어 | 다중 진화 계통 (코딩 패턴에 따라 분기) |

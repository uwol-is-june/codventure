# Codventure

> **코딩할수록 몬스터가 자란다.**

VSCode Explorer 사이드바에 픽셀 몬스터가 살고 있습니다.  
파일을 저장할 때마다 XP를 얻고, 알에서 시작해 7단계를 거쳐 궁극체로 진화합니다.  
설치만 하면 됩니다. 버튼도, 설정도, 로그인도 없습니다.

![알 → 궁극체 진화 데모](docs/screenshots/demo.gif)

---

## 플레이 방법

Codventure는 완전한 패시브 게임입니다. **평소처럼 코딩하세요.**

### 기본 흐름

1. **설치** → Explorer 사이드바 **Codventure** 패널에 알이 나타납니다
2. **파일을 저장** → `+2 XP` 획득, HUD XP 바가 차오릅니다
3. **XP 임계값 도달** → 레벨업, 파티클 연출
4. **특정 레벨 도달** → 흰빛 감싸기 연출과 함께 몬스터가 진화합니다
5. **Lv 40+** → 궁극체 (Mega), 4프레임 금빛 오라 루프

### 진화 단계와 필요 레벨

| 단계 | 이름 | 달성 레벨 | 레벨까지 필요 저장 횟수 (기준) |
|:---:|------|:---:|:---:|
| 0 | 알 (Egg) | — | — |
| 1 | 유아기 (Baby) | Lv 1 | 약 25회 |
| 2 | 유아기 II (In-Training) | Lv 3 | 약 175회 |
| 3 | 성장기 (Rookie) | Lv 5 | 약 575회 |
| 4 | 성숙기 (Champion) | Lv 10 | 약 3,700회 |
| 5 | 완전체 (Ultimate) | Lv 20 | 약 27,000회 |
| 6 | 궁극체 (Mega) | Lv 40 | 약 90,000회 |

> 저장 횟수는 파일 저장 1회 = +2 XP 기준 추산값입니다.

### 레벨업 XP 기준

```
Lv  0 →  1:    50 XP  ← 알이 깨집니다
Lv  1 →  2:   100 XP
Lv  2 →  3:   200 XP  ← 유아기 II 진화
Lv  3 →  4:   300 XP
Lv  4 →  5:   500 XP  ← 성장기 진화
Lv  5 →  6:   700 XP
Lv  6 →  7:   900 XP
Lv  7 →  8:  1,200 XP
Lv  8 →  9:  1,500 XP
Lv  9 → 10:  2,000 XP  ← 성숙기 진화
Lv 10 이후:  이전 임계값 + 500 XP씩 증가
```

### 비활성 패널티 (동기부여용)

마지막 저장 후 **72시간** 이상 지나면 몬스터가 눈물을 흘립니다.  
다시 저장하면 즉시 해제됩니다. 퇴화나 XP 감소는 없습니다.

### 몬스터 이동

Codventure 패널에 포커스된 상태에서 **방향키(←→↑↓)** 로 몬스터를 풀밭 위에서 이동할 수 있습니다.  
나무에는 막힙니다.

---

## 스크린샷

| 알 (Egg) | 성장기 (Rookie) | 궁극체 (Mega) |
|:---:|:---:|:---:|
| ![알](docs/screenshots/egg.png) | ![성장기](docs/screenshots/rookie.png) | ![궁극체](docs/screenshots/mega.png) |

---

## 설치

### VS Code Marketplace (권장)

Marketplace에서 **Codventure** 검색, 또는 터미널에서:

```bash
code --install-extension uwol-is-june.codventure
```

설치 후 왼쪽 Explorer 사이드바를 스크롤하면 **Codventure** 패널이 보입니다.

### VSIX 파일로 오프라인 설치

1. [Releases 페이지](https://github.com/uwol-is-june/codventure/releases)에서 `.vsix` 파일 다운로드
2. VSCode 명령 팔레트 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. `Extensions: Install from VSIX...` 선택 → 다운로드한 파일 선택

---

## 설정

VSCode 설정(`Ctrl+,`)에서 **Codventure** 를 검색하거나 `settings.json`에 직접 추가합니다.

| 설정 키 | 기본값 | 설명 |
|---------|:------:|------|
| `codventure.sound` | `false` | 8비트 효과음 on/off — XP 획득(딩), 레벨업(아르페지오), 진화(팡파르) |

```json
{
  "codventure.sound": true
}
```

설정 변경은 즉시 반영됩니다.

---

## 설계 원칙

| 원칙 | 내용 |
|------|------|
| **Zero dependencies** | 런타임 외부 패키지 없음 — Canvas + Web Audio API만 사용 |
| **Zero interruption** | 모달, 팝업, 포커스 전환 없음 — 코딩 흐름을 끊지 않습니다 |
| **Zero network** | 인터넷 통신 없음 — 모든 상태는 VSCode `globalState`에 로컬 저장 |
| **Zero cost** | 완전 무료, 과금 없음 |

---

## 기여 및 빌드

### 개발 환경 설정

```bash
git clone https://github.com/uwol-is-june/codventure.git
cd codventure
npm install          # vsce 설치
```

### 로컬 실행

VSCode에서 이 폴더를 열고 `F5` 를 누르면 Extension Development Host가 실행됩니다.

### VSIX 패키징

```bash
npm run package      # codventure-x.x.x.vsix 생성
```

생성된 `.vsix` 파일은 VSIX 설치 방법으로 테스트할 수 있습니다.

### 마켓플레이스 배포

```bash
vsce login uwol-is-june   # PAT 인증 (최초 1회)
vsce publish              # 현재 버전으로 배포
vsce publish patch        # 패치 버전 자동 범프 후 배포
```

> 배포 전 `package.json`의 `version` 필드와 `CHANGELOG.md`를 먼저 업데이트하세요.

---

## 버전 히스토리

전체 변경 이력은 [CHANGELOG.md](CHANGELOG.md)를 참고하세요.

---

## 라이선스

MIT © uwol-is-june

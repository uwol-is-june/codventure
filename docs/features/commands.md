# Feature: Commands (커맨드 시스템)

## 현재 상태

- [x] `pixel-cat.open` — 패널 열기 (구현됨)
- [x] `pixel-cat.food` — 먹이 주기 (stub 구현)
- [x] `pixel-cat.pet` — 쓰다듬기 (stub 구현)
- [x] `pixel-cat.sleep` — 재우기 (stub 구현)
- [ ] 커맨드 실행 후 실제 애니메이션 연동

---

## 커맨드 스펙

### `pixel-cat.open`
- **트리거**: 상태바 클릭 또는 커맨드 팔레트
- **동작**: Webview 패널 열기. 이미 열려있으면 포커스만 이동
- **상태 변화**: 없음

### `pixel-cat.food`
- **트리거**: 커맨드 팔레트에서 "Pixel Cat: Feed the cat"
- **동작**:
  1. 고양이 상태 → `eating`
  2. eat 애니메이션 재생 (3초)
  3. 상태 → `idle` 복귀
  4. (v0.2) 배고픔 스탯 감소
- **알림**: `고양이에게 생선을 줬다. 냠냠~`

### `pixel-cat.pet`
- **트리거**: 커맨드 팔레트에서 "Pixel Cat: Pet the cat"
- **동작**:
  1. 고양이 상태 → `grooming`
  2. groom 애니메이션 재생 (3초)
  3. 상태 → `sitting` 복귀
  4. (v0.2) 행복도 스탯 증가
- **알림**: `고양이를 쓰다듬었다. 골골~`

### `pixel-cat.sleep`
- **트리거**: 커맨드 팔레트에서 "Pixel Cat: Put cat to sleep"
- **동작**:
  1. 고양이 상태 → `sleeping`
  2. sleep 애니메이션 재생 (무한)
  3. 다른 커맨드 실행 시 깨어남
- **알림**: `고양이가 잠들었다. zzz...`

---

## 커맨드 ID 규칙

```
pixel-cat.<action>
```

`package.json`의 `contributes.commands`와 `extension.js`의 `registerCommand` 양쪽에서 동일한 ID를 사용해야 한다.

```json
// package.json
{ "command": "pixel-cat.food", "title": "Pixel Cat: Feed the cat 🐟" }
```

```js
// extension.js
vscode.commands.registerCommand('pixel-cat.food', () => feedCat());
```

---

## TODO

- [ ] 커맨드 실행 중 중복 실행 방지 (eating 중에 food 다시 누르면 무시)
- [ ] 잠자는 중 다른 커맨드로 깨우기 로직
- [ ] (v0.2) 스탯 시스템 연동
- [ ] (v0.2) 커맨드 쿨다운 (너무 자주 쓰다듬으면 고양이가 싫어함)
- [ ] 키보드 단축키 설정 지원 (`keybindings` in package.json)

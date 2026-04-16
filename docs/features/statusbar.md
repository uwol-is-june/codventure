# Feature: Status Bar (상태바)

## 현재 상태

- [x] 상태바 아이템 생성 (오른쪽 정렬)
- [x] 클릭 시 패널 열기 연결
- [x] 커맨드 실행 시 텍스트 업데이트
- [ ] 고양이 픽셀아트 이모지 상태 반영
- [ ] (v0.2) 스탯 시각화

---

## 구현 방식

### 상태바 아이템 등록
```js
statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,  // 오른쪽 정렬
  10                                 // 낮은 priority → 다른 아이템에 밀리지 않음
);
statusBarItem.command = 'pixel-cat.open'; // 클릭 시 패널 열기
statusBarItem.show();
```

### 상태별 표시 텍스트

| 고양이 상태 | 상태바 텍스트 |
|------------|-------------|
| idle | `🐱 nyaa~` |
| walking | `🐱 터벅터벅` |
| sitting | `🐱 앉아있는 중` |
| grooming | `🐱✨ 그루밍 중...` |
| sleeping | `🐱💤 zzz...` |
| eating | `🐱🐟 냠냠...` |

### 업데이트 방법
```js
function updateStatusBar(text) {
  if (statusBarItem) {
    statusBarItem.text = text;
  }
}
```

---

## 제약사항

- 상태바는 **텍스트/이모지만** 표시 가능 (Canvas 불가)
- 실제 픽셀아트는 Webview 패널에서만 렌더링
- 상태바는 현재 고양이 상태를 텍스트로 요약하는 역할

---

## TODO

- [ ] 상태 전환 시 자동으로 텍스트 업데이트 (현재 각 커맨드에서 수동 호출)
- [ ] (v0.2) 스탯 표시: `🐱 ♥♥♥ 🍖♦♦`
- [ ] (v0.2) 스탯이 낮으면 상태바에 경고 표시 (예: `⚠️ 고양이가 배고파요!`)
- [ ] Tooltip에 더 자세한 고양이 상태 정보 표시
- [ ] 상태바 표시 ON/OFF 설정 (`contributes.configuration`)

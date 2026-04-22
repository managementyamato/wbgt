# WBGT ウィジェット 開発メモ

## 概要

Yodeck デジタルサイネージ向け WBGT（暑さ指数）表示ウィジェット。

- フォント：keifont（musaigai スタイル）
- API：`https://wbgt-api-server-422283659205.asia-northeast1.run.app/get-wbgt-html`
- 配布形式：ZIP（index.html / js/ / fonts/ / widget.json）

---

## ファイル構成

```
wbgt/
├── index.html
├── widget.json
├── wbgt-widget.zip   ← Yodeck にアップロードするファイル
├── js/
│   ├── widget_init.js   ← <head> に配置。init_widget 定義
│   └── main.js          ← ウィジェット本体ロジック
└── fonts/
    └── keifont.ttf
```

---

## widget.json の正しい形式

Yodeck が要求する形式（fields / meta / schema）：

```json
{
  "fields": ["location"],
  "meta": { "details": "...", "description": "..." },
  "schema": {
    "location": {
      "title": "測定地点",
      "type": "Select",
      "help": "表示する測定地点を選択してください。",
      "options": [
        {"val": "大阪", "label": "大阪（大阪府）"},
        ...
      ]
    }
  }
}
```

---

## やったこと

### 1. GPS・位置情報の削除
- 当初はブラウザの Geolocation API で現在地を取得しようとしていた
- Yodeck プレイヤーはブラウザ操作ができないため削除
- → Yodeck UI の設定値から地点を取得する方式に変更

### 2. widget.json の形式修正
- 最初は独自形式で書いていた
- ユーザーが正しい Yodeck 形式（fields / meta / schema）を提示
- 全47都道府県の観測地点を Select ドロップダウンで選択できるよう修正

### 3. init_widget の定義を `<head>` に移動
- Yodeck は `init_widget(config)` をグローバル関数として呼び出す
- main.js は `<body>` 末尾に配置するため、読込前に呼ばれる可能性がある
- → `widget_init.js` を新設し `<head>` に配置

### 4. localStorage の削除
- 以前の地点設定を localStorage に保存していた
- 古い値が残って表示が変わらないバグの原因になるため完全削除

### 5. URLパラメータチェックの優先度変更
- 当初 URLパラメータ（`?location=xxx`）を最優先でチェックしていた
- Yodeck が `?location=東京` などの古いパラメータを URL に付加することがある
- → URLパラメータを最後のフォールバックに変更

---

## 発生したエラーと原因

### ❌ 指定地点を変えても大阪・東京が表示される

**原因A：`DEFAULT_POINT` が大阪だった**
- 地点が取得できないときにデフォルト値（大阪）を表示していた
- 修正：デフォルト表示を廃止し「地点なし」に変更

**原因B：URLパラメータが `?location=東京` になっていた**
- Yodeck がウィジェット設定をURLパラメータとして付加する
- URLパラメータチェックが `init_widget` より先に動いて東京を表示
- 修正：URLパラメータを最終フォールバックに変更

**原因C：`init_widget` が2回呼ばれて location が上書きされる**
- 1回目：`{location: "徳島"}` ← 正しい設定
- 2回目：`{player_params: {duration: -2, auth_token: "..."}}` ← システムパラメータ
- 2回目の呼び出しで `_pendingConfig` が上書きされ location が消える
- 修正：`_savedLocation` という別変数に location を保存し、上書き禁止

### ❌ デバッグ版では動くのに修正版では動かない

**原因：タイミング問題**
- Yodeck が `init_widget` を呼ぶタイミングが不定（main.js 読込前・後どちらもある）
- デバッグ版の `setTimeout(1500ms)` や即時 textContent 更新が偶然タイミングを補正していた
- クリーンアップ時にその遅延も削除してしまい再現不可になった
- 修正：ポーリング方式（100ms × 最大50回 = 5秒）に変更

### ❌ デバッグ表示で `player_params=[object Object]` と出る

**原因：player_params の中身を展開せずに表示していた**
- `Object.keys(config).map(...)` で値を表示すると、オブジェクト型の値は `[object Object]` になる
- 修正：player_params の中身を個別に展開して表示するよう変更

---

## 現在の地点取得フロー（最新版）

```
main.js 起動
  │
  └─ 100ms ポーリング開始（最大5秒）
       │
       ├─ _savedLocation が設定されたら → setLocation() → 表示更新
       │    ↑
       │    widget_init.js の init_widget() がいつ呼ばれても
       │    config.location を _savedLocation に保存
       │    （2回目以降の呼び出しで上書きしない）
       │
       └─ 5秒経過しても未設定
            ├─ URLパラメータに location あり → setLocation()
            └─ なし → 「地点なし」表示
```

---

## 未解決・課題

### △ WBGT値が指定地点のデータではない
- API呼び出し `GET /get-wbgt-html` に地点コードを渡していない
- 表示されている WBGT値は API 側のデフォルト地点のもの
- → API が地点指定パラメータ（`?code=` 等）を受け付けるか確認が必要

### △ Yodeck プレビューで確認できない
- Yodeck の内蔵プレビューは init_widget を呼ばないため設定反映されない
- 実機（Yodeck プレイヤー）でのテストが必要

---

## 確認済み動作

| 状況 | 表示 |
|---|---|
| Yodeck UI で地点選択 → init_widget 呼び出し | 選択地点名を表示（最新版で確認中）|
| init_widget が2回呼ばれても | 1回目の location を保持 |
| 5秒以内に init_widget が来ない | 「地点なし」表示 |
| デバッグ時：`cfg2:徳島` が表示された | init_widget が正しく {location:"徳島"} を渡していることを確認 |
| デバッグ時：`duration=-2 \| auth_token=...` が表示された | player_params の中に location はなく、トップレベルに存在することを確認 |

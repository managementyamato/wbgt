# ゲンバルジャー — Yodeck ウィジェット マスターリポジトリ

現場用デジタルサイネージ（Yodeck + Raspberry Pi）で使用するウィジェットの
ソース管理・ビルド・プレビューをまとめた大元プロジェクト。

---

## ウィジェット一覧

| フォルダ | 表示名 | 概要 |
|---|---|---|
| `widgets/musaigai/` | 無災害記録表 | 無災害継続日数・目標日数を表示 |
| `widgets/scroll-text/` | スクロールテキスト | 横・縦スクロールのテキストティッカー |
| `widgets/wbgt/` | 暑さ指数（WBGT） | 環境省WBGTデータを表示（シンプル版） |
| `widgets/weather-wbgt/` | 天気・暑さ指数モニター | 天気＋WBGTのリッチ表示 |

---

## Yodeck上での動作の仕組み

### 基本フロー

```
Yodeck管理画面
  └─ ウィジェット設定（widget.jsonの項目を入力）
       └─ Yodeckプレイヤー（Raspberry Pi）
            └─ index.html を表示
                 └─ init_widget(config) を呼び出し
                      └─ configに基づいて画面を更新
```

### `init_widget(config)` プロトコル（全ウィジェット共通）

Yodeck は以下の2つの方法で `init_widget` を呼び出す：

**① postMessage方式（Yodeck標準）**
```javascript
// Yodeck内部がこの形式でiframeに送信する
window.postMessage({
  functions: [{ fname: 'init_widget', data: { ...設定値... } }]
}, '*');
```

**② ローカルファイル確認用フォールバック**
```javascript
// file://プロトコルで開いたとき、デフォルト設定で自動起動
if (window.location.protocol === 'file:') {
  window.onload = function() { init_widget({ ...デフォルト値... }); };
}
```

### `widget.json` の役割

Yodeck管理画面でウィジェットを設定するためのスキーマ定義。
`schema` 内のフィールドが管理画面のフォームとして表示され、
入力値が `init_widget(config)` の引数として渡される。

```json
{
  "fields": ["fieldName1", "fieldName2"],
  "schema": {
    "fieldName1": {
      "title": "表示名",
      "type": "Select | Text | Number",
      "options": [{ "val": "値", "label": "表示" }]
    }
  }
}
```

---

## コード設計の統一ルール

### 1. ファイル構成

```
widgets/<name>/
├── index.html      # 表示ページ（必須）
├── widget.json     # Yodeck設定スキーマ（必須）
├── js/
│   ├── widget_init.js  # init_widget関数 + postMessageリスナー
│   └── main.js         # メイン処理（ロジック）
└── css/ / fonts/   # スタイル・フォント（必要な場合）
```

> **シンプルなウィジェット**（scroll-text等）はJSを `app.js` 1ファイルにまとめてもよい。

### 2. `init_widget` の実装パターン

```javascript
// widget_init.js または app.js に記述

var _pendingConfig = null;

function init_widget(config) {
  if (!config) return;
  // DOMがまだ準備できていない場合は保留
  if (!document.body) {
    _pendingConfig = config;
    return;
  }
  _render(config);
}

// DOMContentLoaded後に保留中のconfigを処理
document.addEventListener('DOMContentLoaded', function() {
  if (_pendingConfig) {
    _render(_pendingConfig);
    _pendingConfig = null;
  }
});

// Yodeck postMessageリスナー（必須）
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) {
      init_widget(fn.data);
    }
  });
});

// ローカル確認用フォールバック（必須）
if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({ /* デフォルト設定 */ });
  };
}
```

### 3. configのデフォルト値

`_render(config)` 内では必ず `||` でデフォルト値を設定する。
Yodeck から渡されない項目があっても壊れないようにする。

```javascript
function _render(config) {
  var location = config.location || '東京';
  var fontSize = parseInt(config.fontSize || 56, 10);
  // ...
}
```

### 4. レスポンシブ対応

Raspberry Piの画面解像度に依存しないよう、サイズは **pt / vw / vh / % で指定**。
`px` 固定は避ける（特に文字サイズ）。

```css
/* 推奨 */
font-size: 90pt;
font-size: clamp(1.2rem, 3vw, 2rem);

/* 非推奨（解像度依存） */
font-size: 120px;
```

### 5. フォント

現場表示用フォントとして `keifont.ttf` を標準採用。
Webフォントの外部CDN依存は避ける（オフライン環境対応）。

```css
@font-face {
  font-family: "keifont";
  src: url("fonts/keifont.ttf");
}
```

### 6. バージョン管理（キャッシュ対策）

CSSやJSのクエリ文字列でバージョンを管理する。

```html
<link rel="stylesheet" href="css/style.css?v=20260317">
<script src="js/main.js?v=20260317"></script>
```

### 7. jQuery依存

`musaigai` はjQueryを使用しているが、**新規ウィジェットはVanilla JSで実装**する。
依存ライブラリを増やさないことでメンテナンスを容易にする。

---

## ローカルプレビュー

```bash
# preview.htmlをブラウザで開く（Live Serverなどを使用）
# または以下でローカルサーバーを起動
python -m http.server 8080
# → http://localhost:8080/preview.html
```

プレビューページからYodeck postMessage形式で各ウィジェットに設定を送信できる。

---

## Yodeck用ZIPのビルド

```bash
# 全ウィジェットをビルド
./build.sh

# 特定のウィジェットのみ
./build.sh musaigai
./build.sh scroll-text
./build.sh wbgt
./build.sh weather-wbgt
```

生成されたZIPファイルは `build/` フォルダに出力される。
このZIPをYodeck管理画面の「ウィジェット」からアップロードする。

---

## Yodeck アップロード手順

1. `./build.sh` でZIPを生成
2. Yodeck管理画面 → **コンテンツ** → **ウィジェット** → **新規追加**
3. ZIPファイルをアップロード
4. 設定項目（widget.jsonのschema）を入力
5. プレイリストに追加してRaspberry Piに配信

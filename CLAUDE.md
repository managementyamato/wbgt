# ゲンバルジャー — Claude 開発ガイド

このファイルはClaude Codeがこのプロジェクトで作業するときに参照する指示書。
Yodeck + Raspberry Pi 向け現場用デジタルサイネージウィジェットのリポジトリ。

---

## プロジェクト構成

```
ゲンバルジャー大元/
├── _template/          新規ウィジェットの雛形（ここをコピーして開発する）
├── widgets/            ウィジェットのソースコード
│   ├── manifest.json   ウィジェット一覧（build.shが自動生成）
│   ├── musaigai/       無災害記録表
│   ├── scroll-text/    スクロールテキスト
│   ├── wbgt/           暑さ指数（WBGT）シンプル版
│   └── weather-wbgt/   天気・暑さ指数リッチ版
├── build/              ZIPビルド出力先（gitignore対象）
├── build.sh            Yodeck用ZIPビルド + manifest.json生成
├── preview.html        ローカルプレビュー（要ローカルサーバー）
└── README.md           設計ルール・Yodeck手順書
```

---

## 新規ウィジェットの作り方

### ステップ1: テンプレートをコピー

```bash
cp -r _template widgets/<新しい名前>
```

フォルダ名はYodeck上のウィジェットIDになる。英数字とハイフンのみ使用。

### ステップ2: 以下のファイルを編集

| ファイル | 変更内容 |
|---|---|
| `index.html` | タイトル・レイアウト・スタイルを実装 |
| `js/widget_init.js` | ローカル確認用デフォルト設定を記述 |
| `js/main.js` | `_render(config)` にウィジェット固有のロジックを実装 |
| `widget.json` | Yodeck管理画面に表示する設定項目を定義 |

### ステップ3: フォントをコピー（keifont使用の場合）

```bash
cp widgets/wbgt/fonts/keifont.ttf widgets/<新しい名前>/fonts/
```

### ステップ4: `preview.html` の `WIDGET_CONFIGS` にエントリを追加

`preview.html` 内の `WIDGET_CONFIGS` オブジェクトに新しいウィジェットIDのエントリを追加する。
定義がなくても表示はされるが、設定UIが出ない。

```javascript
'新しいID': {
  frameHeight: 400,   // プレビューの高さ(px)
  fields: [
    { id: 'param1', label: 'パラメータ名', type: 'text', value: 'デフォルト' }
  ],
  apply: function(widgetId) {
    sendConfig(widgetId, {
      param1: document.getElementById(widgetId + '-param1').value
    });
  }
}
```

### ステップ5: ビルドしてYodeckにアップロード

```bash
./build.sh <新しい名前>
# → build/<新しい名前>.zip が生成される
```

---

## コード設計ルール（必ず守ること）

### init_widget パターン

- `widget_init.js` に `init_widget()` + postMessageリスナー + ローカルフォールバックを実装
- `main.js` に `_render(config)` を実装
- `index.html` は `widget_init.js` → `main.js` の順で読み込む

### config のデフォルト値

`_render(config)` 内では必ず `||` でデフォルト値を設定する。

```javascript
var location = config.location || '東京';
```

### サイズ指定

- フォントサイズ: `pt` 推奨（Raspberry Pi解像度に依存しない）
- レイアウト: `vw / vh / %` 推奨
- `px` 固定は避ける

### フォント

- 標準フォント: `keifont.ttf`（`fonts/` フォルダにローカル配置）
- 外部CDN（Google Fontsなど）は使わない（オフライン環境対応）

### JavaScript

- **Vanilla JSで実装**（jQueryは既存のmusaigaiのみ。新規では使わない）
- グローバル変数は最小限に。アニメーションフレームは `_animFrame` 変数で管理

### widget.json

UI設定が必要なウィジェットは以下のフォーマットで `widget.json` を作成する。
参照元: `widgets/scroll-text/widget.json`

```json
{
  "fields": ["field1", "field2"],
  "meta": {
    "description": "ウィジェット名（日本語）",
    "details": "1行の説明文。"
  },
  "schema": {
    "field1": {
      "title": "Yodeck管理画面に表示するラベル",
      "type": "Text",
      "help": "入力ガイド文",
      "options": [
        { "val": "デフォルト値", "label": "ラベル" }
      ]
    },
    "field2": {
      "title": "選択肢フィールドの例",
      "type": "Select",
      "help": "選択ガイド文",
      "options": [
        { "val": "value1", "label": "表示名1" },
        { "val": "value2", "label": "表示名2" }
      ]
    }
  }
}
```

**フィールドタイプ一覧:**

| type | 用途 | options の使われ方 |
|---|---|---|
| `Text` | 自由入力テキスト | 最初の `val` がデフォルト値として使われる |
| `Select` | 選択肢 | `val` が `config` に渡る値、`label` が画面表示 |

**ルール:**
- `fields` 配列に含まれるIDのみが `init_widget(config)` に渡される
- `meta.description` は manifest.json のウィジェット名として使われる
- `Text` 型の `options[0].val` がYodeck上でのデフォルト値になる
- 色・サイズ・フォントなど固定選択肢は `Select` 型で定義する
- `_render(config)` では必ず `||` でデフォルト値を設定し、未渡し時も動作すること

---

## よくある問題

| 症状 | 原因・対処 |
|---|---|
| ウィジェットが真っ白 | `init_widget` が呼ばれていない。ローカルフォールバックを確認 |
| Yodeckで設定が反映されない | `widget.json` の `fields` 配列にフィールドIDが含まれているか確認 |
| preview.htmlでmanifest.jsonが読めない | ローカルサーバーが起動していない。`python -m http.server 8080` を実行 |
| ビルド後にZIPが壊れている | `build.sh` の除外パターンで必要なファイルが消えていないか確認 |
| フォントが表示されない | `fonts/keifont.ttf` のパスを確認。`@font-face` のURLと一致しているか |

---

## ビルド・プレビューコマンド

```bash
# 全ウィジェットをビルド（manifest.jsonも更新される）
./build.sh

# 特定のウィジェットのみ
./build.sh wbgt

# ローカルサーバー起動（preview.html用）
python -m http.server 8080
# → http://localhost:8080/preview.html
```

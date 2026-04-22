# ゲンバルジャー ウィジェット トラブルシューティング集

現場Pi（Yodeckプレーヤー）で起きた実問題と解決策の記録。
新規ウィジェット開発時は開発開始前に一読し、開発ルールの章に沿って作ること。

---

## 📋 新規ウィジェット開発ルール（ここが重要）

### 絶対やるべきこと

1. **レイアウトは `<table>` + `inline-block`**（flex / grid は避ける）
2. **フォントサイズは JS で vw/vh から計算して px で直接指定**（`clamp()` / `min()` は避ける）
3. **カスタムフォントは `.ttf` で配信**（`.woff2` より互換性高）
4. **フォールバック日本語フォントを必ず指定**  
   `"keifont", Verdana, Arial, "メイリオ", Meiryo, Osaka, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif`
5. **数字専用フォント指定を別途**  
   `"DejaVu Sans", "Liberation Sans", Verdana, Arial, sans-serif`
6. **CSS カスタムプロパティ（`var(--xxx)`）に依存しない**（色は直書きか、直書きfallback併記）
7. **外部APIは複数CDNフォールバック + `Cache-Control: no-cache`**
8. **起動時に画面下部に診断バーを仕込む**（本番でも残してOK、データ経路の可視化になる）

### リファレンス実装

新規ウィジェットは以下のどちらかをコピーして出発：
- `widgets/musaigai/`（純CSS/jQueryベース、古典的Pi対応）
- `widgets/wbgt-simple/`（musaigai準拠 + 外部データ取得 + CDNフォールバック）

---

## 🐛 過去のトラブルと原因

### T-001: Pi で中央の数字・本文が表示されない（ヘッダーとフッターだけ見える）

**症状**
- 自PC や Yodeck Web Preview では正常表示
- Pi 実機でのみ、ヘッダーとフッターは出るが中央のメインコンテンツが空っぽ
- フッターがヘッダーの直下に張り付く（main エリアが 0px に潰れる）

**原因**  
Pi の Chromium で **`display: flex; flex: 1 1 auto;` が期待通り伸びず 0px になる**。CSS Grid も同様に不安定。モダンブラウザでは動くが Pi の古い Chromium では潰れる。

**対策**
- flex/grid ベースレイアウト → **`<table>` + `inline-block`** に書き換え
- フォントサイズを **JS で vw/vh から計算して `element.style.fontSize = px + 'px'`** で直接指定
- `clamp()` / `min()` の CSS 関数も Pi 旧版では未対応 → 使わない

**参照**
- [widgets/musaigai/css/style.css](../widgets/musaigai/css/style.css) — テーブル＋inline-block の典型
- [widgets/musaigai/js/font_size.js](../widgets/musaigai/js/font_size.js) — JSフォントサイズ計算
- [widgets/wbgt-simple/js/font_size.js](../widgets/wbgt-simple/js/font_size.js) — 同パターンの流用例

---

### T-002: Pi で外部CDNからのデータ取得がタイムアウト

**症状**
- `diag: timeout @ ...` が出続ける
- 外部からは curl/ブラウザで200応答確認済み
- 他のウィジェット（weather-wbgt 等）は動いている

**原因**  
現場 Pi のネットワーク環境で **特定のCDNドメインがブロックされている**（ファイアウォール/DNS制限）。特に jsDelivr は通らないケースあり。

**対策**
- 複数CDN（別ドメイン）にフォールバックするロジックを実装
- 推奨順位：
  1. `raw.githubusercontent.com`（GitHub直、キャッシュ短）
  2. `managementyamato.github.io`（GitHub Pages、同オリジン構造）
  3. ❌ `cdn.jsdelivr.net` — 推奨しない（T-003参照）
- タイムアウトは **8秒程度**に設定、順次試行
- 失敗時は次の候補にフォールバック

**参照**
- [widgets/wbgt-simple/js/app.js](../widgets/wbgt-simple/js/app.js) の `_tryUrls` 関数

---

### T-003: jsDelivr のキャッシュで古い値が返される

**症状**
- データを更新したのに Pi 上では何時間も古い値が表示され続ける
- GitHub Pages / raw では最新値が見える

**原因**  
jsDelivr の CDN キャッシュ TTL が**最大12時間**。`?t=` クエリパラメータでも jsDelivr 側では吸収されず、古いレスポンスを返してくることがある。

**対策**
- **jsDelivr はフォールバックリストから除外**
- `raw.githubusercontent.com`（数分キャッシュ）または `*.github.io`（数分キャッシュ）を使う
- XHR に `Cache-Control: no-cache` / `Pragma: no-cache` ヘッダを付与

**参照**
- [widgets/wbgt-simple/js/app.js](../widgets/wbgt-simple/js/app.js) の `_tryUrls` の XHR ヘッダ設定

---

### T-004: 数字が描画されない / フォントが崩れる

**症状**
- 日本語テキストは見えるが数字だけ空白
- 期待した太字フォントが出ない

**原因**  
- Pi Raspbian に `Arial`, `Arial Black`, `Helvetica` が入っていない
- keifont.woff2 のロード失敗
- CSS `font-family` で指定した最初のフォントが無く、かつ**フォールバックに数字グリフ持ちがない**

**対策**
- カスタムフォントは `.ttf` を使う（`.woff2` は古い環境でロード失敗する可能性）
- 数字用要素のフォントスタック：  
  `"DejaVu Sans", "Liberation Sans", Verdana, Arial, sans-serif`
- 日本語テキスト用：  
  `"keifont", Verdana, Arial, "メイリオ", Meiryo, Osaka, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif`
- 最後に必ず generic family（`sans-serif`, `monospace` 等）を入れる

---

### T-005: Yodeck テンプレート登録後、配布先アカウントでウィジェットが固まる

**症状**
- テンプレート化しない直接アップロードでは正常動作
- テンプレート登録して別アカウントで再生すると、テキストが静止したまま動かない（scroll-text 等のアニメ系）

**原因**  
Yodeck のテンプレート配布フローで **rAF (`requestAnimationFrame`) が throttle されて停止する**。

**対策**
- rAF 駆動のアニメーションは **setInterval と併用**（二重駆動）
- rAF が止まっても setInterval が transform 更新を続ける

**参照**
- [widgets/scroll-text/app.js](../widgets/scroll-text/app.js) v21 の `_run` 関数（rAF + setInterval ハイブリッド）

---

### T-006: YodeckでウィジェットのZIP内フォントが参照できない

**症状**
- フォントファイルが見つからない 404
- ZIP内のパスは正しいのにロード失敗

**原因**  
- `build.sh` の PowerShell Compress-Archive が**ファイル配列渡しでフォルダ構造を平坦化**するバグ
- ZIPルート直下にフォントファイルが置かれ、`fonts/xxx.ttf` のパスが崩れる

**対策**
- `build.sh` は **Python の `zipfile` 経由**でZIP化（現行は対応済み）
- PowerShell フォールバック使用時は `Compress-Archive -Path '$src\*'` 形式のみ使用（配列渡し禁止）

**参照**
- [build.sh](../build.sh) の USE_ZIP 分岐

---

### T-007: UI設定の古いフィールドが Yodeck に残留して誤動作

**症状**
- UI設定JSONからフィールドを削除したのに、保存済みのウィジェット設定がまだ古いフィールドの値を送ってきて誤動作する

**原因**  
Yodeck はUI設定の**スキーマを変えても、保存済みのウィジェット config は残す**。削除したはずの設定値がpostMessageで widget 側に届き続ける。

**対策**
- ウィジェット側で重要設定（データURL等）は **`_config` から読まずに app.js 内でハードコード**
- UI設定は表示値の変更専用にする（動作に関わる設定は極力入れない）
- 設定変更後は UI設定エディタ保存 → ウィジェット編集画面で**各フィールドを1つずつ再入力/リセット**する運用

---

### T-008: 自PCで localhost 経由で動作確認した時に Pi 環境と乖離

**症状**
- 自PCのローカルサーバーで動くのに Pi で動かない

**原因**  
- localhost は CORS 制約が緩い
- 自PCのブラウザは最新 Chrome / Edge、Pi は古い Chromium
- 自PCのネットワークは外部自由、Pi は制限あり

**対策**
- ローカル完結テストは**コードの論理確認のみ**と割り切る
- 実動作検証は **Yodeck Web Preview**（`webpreview.dsbackend.com`）と **Pi 実機**の両方でやる
- Web Preview は Yodeck インフラから配信されるので、ブラウザ制約や iframe 制約が本番同等

---

## 🔍 デバッグ手順（症状別）

### 画面に何も出ない / エラーが出る

1. **診断バーを必ず画面下部に実装**し、以下を表示：
   - 初期化ステップ（init / fetching）
   - fetch の成否（OK / HTTP xxx / timeout / network err）
   - 取得した値（wbgt=XX.X）
2. Yodeck Web Preview と Pi 実機の両方で確認
3. 診断バーの表示内容から原因を分類：
   - `timeout @ 〜` → T-002（CDN到達不可）
   - `HTTP 404 @ 〜` → URL ミスまたはデータ未生成
   - `OK wbgt=XX.X` だけど画面に数字なし → T-001（レイアウト崩壊）
   - `OK wbgt=(古い値)` → T-003（キャッシュ）

### レイアウトが崩れる

1. 自PCブラウザの DevTools で確認（Chrome最新は厳しめ、だけどPiの旧版はもっと寛容）
2. 次に Yodeck Web Preview で確認
3. 最後に Pi 実機
4. 乖離があれば CSS の flex/grid/clamp 系を疑い、musaigai パターンに書き換え

---

## ✅ 新規ウィジェット着手前チェックリスト

- [ ] musaigai または wbgt-simple をコピー元として使う
- [ ] index.html: IE9互換 doctype を残す
- [ ] css/common.css: musaigai からそのまま
- [ ] css/style.css: keifont.ttf 参照、table/inline-block で組む
- [ ] js/font_size.js: vw/vh から px計算、window resize / load リスナー
- [ ] js/app.js: データ取得ロジック（複数CDNフォールバック、no-cache）
- [ ] 診断バー実装
- [ ] Yodeck Web Preview と Pi 実機の両方で表示確認
- [ ] テンプレート化したうえで別アカウントでも再生確認（rAF問題検出）

---

## 🔗 関連ドキュメント

- [docs/SETUP.md](SETUP.md) — GitHub Pages 側のセットアップ
- [CLAUDE.md](../CLAUDE.md) — プロジェクト全体の設計ルール
- [README.md](../README.md) — プロジェクト概要

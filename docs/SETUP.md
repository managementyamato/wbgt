# WBGT データプロキシ セットアップ

環境省の WBGT 公式値を Yodeck ウィジェット（wbgt-simple）で表示するための、
GitHub Actions + GitHub Pages 構成のセットアップ手順。

## 仕組み

```
環境省 (www.wbgt.env.go.jp)
    │  yohou_all.csv を 30分毎に取得
    ▼
GitHub Actions (scripts/fetch_wbgt.py)
    │  CSV → 地点別 JSON 841ファイル
    ▼
docs/wbgt/{code}.json にコミット
    │
    ▼
GitHub Pages (https://<user>.github.io/<repo>/wbgt/*.json)
    │  CORS許可で公開
    ▼
wbgt-simple ウィジェット (Yodeck / ラズパイ)
```

## セットアップ手順

### 1. このリポジトリを GitHub に push

公開リポジトリとしてGitHubにpushする（GitHub Pagesは無料プランでは公開repoのみ）。

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. GitHub Pages を有効化

1. リポジトリの `Settings` → `Pages`
2. `Source` を **Deploy from a branch** に
3. `Branch` を **main**、フォルダを **/docs** に設定
4. `Save`

数分後、`https://<your-username>.github.io/<your-repo>/` が公開される。

### 3. GitHub Actions の権限確認

1. `Settings` → `Actions` → `General`
2. `Workflow permissions` で **Read and write permissions** を選択
3. `Save`

これで Actions がリポジトリにコミット可能になる。

### 4. 初回実行（手動）

1. リポジトリの `Actions` タブ
2. 左サイドバーの `Update WBGT data` ワークフローを選択
3. `Run workflow` → `Run workflow`（main ブランチで実行）
4. 2〜3分で完了

成功すると `docs/wbgt/` に841件のJSONファイルがコミットされる。

以降は30分毎に自動実行（`cron: '10,40 * * * *'`）。

### 5. 公開URLの確認

ブラウザで以下にアクセスしてJSONが表示されればOK：

```
https://<your-username>.github.io/<your-repo>/wbgt/62078.json
```

（62078は大阪のコード。他の都道府県コードは `fetch_wbgt.py` の `PREF_STATIONS` 参照）

### 6. Yodeck ウィジェットの設定

Yodeck管理画面の `wbgt-simple` ウィジェットUI設定で：

- **都道府県**: 現場の都道府県を選択
- **データURL**: `https://<your-username>.github.io/<your-repo>/wbgt` （末尾の /wbgt まで、**末尾スラッシュなし**）
- **配色テーマ**: 好みで
- **更新間隔**: 15分推奨（環境省側が30分毎更新なので十分）

## 注意事項

- **配信期間**: 環境省WBGT予測値は**4月下旬〜10月下旬**のみ配信。それ以外の時期はウィジェットが「配信期間外」と表示する
- **Actions のスリープ**: 60日以上リポジトリに活動がないとスケジュールが停止する。適度に commit するか、手動実行で起こす
- **レート制限**: 1日48回のfetchは環境省サイトの負担としては無視できるレベル（全国841地点を1リクエストで取得するため）

## トラブルシューティング

### ウィジェットが「WBGTデータ取得失敗」と表示する

- GitHub Pagesが公開されているか確認（ブラウザで直接URLを叩く）
- `dataBaseUrl` の末尾に余計なスラッシュがついていないか確認
- Actions が失敗していないか `Actions` タブで確認

### 「現在値データなし」と表示される

- 4月下旬～10月下旬以外の期間は環境省が配信していない
- 配信期間内なら `docs/wbgt/{code}.json` の中身を確認、`current` が null か検証

#!/usr/bin/env bash
# ゲンバルジャー Yodeck ウィジェット ビルドスクリプト
#
# widgets/ フォルダ内の index.html を持つ全ディレクトリを自動検出してZIPを生成する。
# 新しいウィジェットを追加した場合、このスクリプトの編集は不要。
#
# 使い方:
#   ./build.sh              # 全ウィジェットをビルド
#   ./build.sh musaigai     # 特定のウィジェットのみビルド

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WIDGETS_DIR="$ROOT_DIR/widgets"
BUILD_DIR="$ROOT_DIR/build"
SHARED_DIR="$ROOT_DIR/shared"
UI_SETTINGS_DIR="$ROOT_DIR/yodeck-ui-settings"

mkdir -p "$BUILD_DIR"

# ===== UI設定 JSON 同期関数 ==============================================
# yodeck-ui-settings/<name>.json を ZIP同梱の widgets/<name>/widget.json に
# コピーする。UI設定エディタに貼り付けるJSONと同じ内容をZIP内にも配置することで
# Yodeck管理画面UI/ZIP内widget.jsonの整合性ズレを防止する。
sync_ui_settings() {
  local name="$1"
  local src="$WIDGETS_DIR/$name"
  local ui_src="$UI_SETTINGS_DIR/$name.json"
  local ui_dst="$src/widget.json"

  [ ! -f "$ui_src" ] && return

  # 差分がある時だけコピー（無駄なmtime更新を避ける）
  if [ ! -f "$ui_dst" ] || ! cmp -s "$ui_src" "$ui_dst"; then
    cp "$ui_src" "$ui_dst"
    echo "        [sync] yodeck-ui-settings/$name.json → $name/widget.json"
  fi
}

# ===== 共通モジュール同期関数 ============================================
# widget が shared/ 内のファイルを参照している場合、最新版を widget フォルダ内に
# コピーする。これにより shared/ の単一ソースで全ウィジェットに配布できる。
sync_shared() {
  local name="$1"
  local src="$WIDGETS_DIR/$name"
  [ ! -d "$SHARED_DIR" ] && return

  # widget が "shared/<file>" を参照しているかスキャン（index.html と js/*）
  local refs
  refs=$(grep -rhoE "shared/[a-zA-Z0-9_-]+\.js" "$src" 2>/dev/null | sort -u || true)
  [ -z "$refs" ] && return

  mkdir -p "$src/shared"
  for ref in $refs; do
    local file="${ref#shared/}"
    if [ -f "$SHARED_DIR/$file" ]; then
      cp "$SHARED_DIR/$file" "$src/shared/$file"
      echo "        [sync] shared/$file → $name/shared/"
    fi
  done
}

# shared/ と yodeck-ui-settings/ を全ウィジェットに一括同期（--sync オプション）
sync_all_widgets() {
  echo "=== 共通モジュール / UI設定 同期 ==="
  for dir in "$WIDGETS_DIR"/*/; do
    local name
    name=$(basename "$dir")
    [ ! -f "$dir/index.html" ] && continue
    sync_ui_settings "$name"
    sync_shared "$name"
  done
  echo "=== 同期完了 ==="
}

# ZIPコマンドの選択（zip > python3 > python > powershellフォールバック）
# powershell Compress-Archive はファイル配列渡しで平坦化するバグがあり、
# ディレクトリ構造（fonts/等）を維持できないため非推奨。
if command -v zip &>/dev/null; then
  USE_ZIP="zip"
elif command -v python3 &>/dev/null; then
  USE_ZIP="python3"
elif command -v python &>/dev/null; then
  USE_ZIP="python"
elif command -v powershell &>/dev/null; then
  USE_ZIP="powershell"
else
  echo "[ERROR] zip / python3 / python / powershell のいずれも見つかりません"
  exit 1
fi

# ===== ウィジェットビルド関数 ============================================

build_widget() {
  local name="$1"
  local src="$WIDGETS_DIR/$name"
  local out="$BUILD_DIR/${name}.zip"

  if [ ! -f "$src/index.html" ]; then
    echo "[SKIP] $name: index.html が見つかりません"
    return
  fi

  echo "[BUILD] $name → build/${name}.zip"
  rm -f "$out"

  # ビルド前に UI設定JSON と 共通モジュール を widget フォルダに最新同期
  sync_ui_settings "$name"
  sync_shared "$name"

  if [ "$USE_ZIP" = "zip" ]; then
    (cd "$src" && zip -r "$out" . \
      --exclude "*.git*" \
      --exclude ".claude/*" \
      --exclude "*.DS_Store" \
      --exclude "*Thumbs.db" \
      --exclude "*.zip" \
      --exclude "docs/*" \
      --exclude "README.md" \
    )
  elif [ "$USE_ZIP" = "python3" ] || [ "$USE_ZIP" = "python" ]; then
    # Python zipfile でディレクトリ構造を保持してZIP化
    PYTHONUTF8=1 SRC="$src" OUT="$out" "$USE_ZIP" -c "
import os, sys, zipfile
src = os.environ['SRC']
out = os.environ['OUT']
EXCLUDE_DIRS  = {'.git', '.claude', 'docs'}
EXCLUDE_FILES = {'README.md', 'Thumbs.db', '.DS_Store'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if f in EXCLUDE_FILES or f.endswith('.zip'):
                continue
            full = os.path.join(root, f)
            rel  = os.path.relpath(full, src).replace(os.sep, '/')
            zf.write(full, rel)
"
  else
    # PowerShell フォールバック（非推奨: ディレクトリ構造が平坦化されるバグあり）
    local win_src
    local win_out
    win_src=$(cygpath -w "$src" 2>/dev/null || echo "$src" | sed 's|/c/|C:\\|;s|/|\\|g')
    win_out=$(cygpath -w "$out" 2>/dev/null || echo "$out" | sed 's|/c/|C:\\|;s|/|\\|g')
    powershell -NoProfile -Command "Compress-Archive -Path '$win_src\*' -DestinationPath '$win_out' -Force"
  fi

  echo "        完了"
}

# ===== manifest.json 生成関数 ===========================================

generate_manifest() {
  echo "[MANIFEST] widgets/manifest.json を生成中..."

  local manifest_file="$WIDGETS_DIR/manifest.json"
  local first=true

  echo "[" > "$manifest_file"

  for dir in "$WIDGETS_DIR"/*/; do
    local name
    name=$(basename "$dir")

    # index.html がないフォルダはスキップ
    [ ! -f "$dir/index.html" ] && continue

    # widget.json から meta 情報を取得
    local description="$name"
    local details=""
    if [ -f "$dir/widget.json" ] && command -v python3 &>/dev/null; then
      description=$(PYTHONUTF8=1 WIDGET_JSON="$dir/widget.json" WIDGET_NAME="$name" python3 -c "
import json, os
path = os.environ['WIDGET_JSON']
name = os.environ['WIDGET_NAME']
try:
    d = json.load(open(path, encoding='utf-8'))
    print(d.get('meta', {}).get('description', name))
except:
    print(name)
" 2>/dev/null)
      details=$(PYTHONUTF8=1 WIDGET_JSON="$dir/widget.json" python3 -c "
import json, os
path = os.environ['WIDGET_JSON']
try:
    d = json.load(open(path, encoding='utf-8'))
    print(d.get('meta', {}).get('details', ''))
except:
    print('')
" 2>/dev/null)
    fi

    if [ "$first" = true ]; then
      first=false
    else
      # 前の行にカンマを追加
      sed -i '$ s/}$/},/' "$manifest_file"
    fi

    cat >> "$manifest_file" << EOF
  {
    "id": "$name",
    "name": "$description",
    "details": "$details"
  }
EOF
  done

  echo "]" >> "$manifest_file"
  echo "        完了: widgets/manifest.json"
}

# ===== メイン処理 ========================================================

if [ "$1" = "--sync" ]; then
  # 共通モジュールの同期のみ（ZIP生成なし）。プレビュー開発用。
  sync_all_widgets
  exit 0
fi

if [ $# -eq 0 ]; then
  echo "=== ゲンバルジャー 全ウィジェット ビルド開始 ==="
  echo ""

  widget_count=0
  for dir in "$WIDGETS_DIR"/*/; do
    name=$(basename "$dir")
    build_widget "$name"
    widget_count=$((widget_count + 1))
  done

  echo ""
  generate_manifest

  echo ""
  echo "=== ビルド完了（${widget_count}件） ==="
  ls "$BUILD_DIR/"*.zip 2>/dev/null || echo "(ZIPなし)"

else
  echo "=== ゲンバルジャー ウィジェット ビルド: $1 ==="
  build_widget "$1"
  generate_manifest
  echo ""
  echo "=== 完了 ==="
fi

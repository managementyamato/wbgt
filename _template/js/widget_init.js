/**
 * widget_init.js — Yodeck init_widget 共通パターン
 *
 * 全ウィジェットでこのファイルを同じ構造で使用する。
 * index.html で main.js より先に読み込むこと。
 */

var _pendingConfig = null;

/**
 * Yodeck（またはpreview.html）から呼び出されるエントリーポイント。
 * DOMが準備できていない場合は _pendingConfig に保留する。
 */
function init_widget(config) {
  if (!config) return;
  if (!document.body) {
    _pendingConfig = config;
    return;
  }
  _render(config);
}

// DOMContentLoaded後に保留中のconfigを処理
document.addEventListener('DOMContentLoaded', function () {
  if (_pendingConfig) {
    _render(_pendingConfig);
    _pendingConfig = null;
  }
});

// ===== Yodeck postMessageリスナー（本番環境用・必須） ===================
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function (fn) {
    if (fn.fname === 'init_widget' && fn.data) {
      init_widget(fn.data);
    }
  });
});

// ===== ローカル確認用フォールバック（file://プロトコル時のみ動作） =======
if (window.location.protocol === 'file:') {
  window.addEventListener('load', function () {
    // main.js の _render が定義された後に実行されるよう遅延
    setTimeout(function () {
      init_widget({
        /* ここにデフォルト設定を記述（ローカル確認用） */
        sample_param: 'デフォルト値'
      });
    }, 100);
  });
}

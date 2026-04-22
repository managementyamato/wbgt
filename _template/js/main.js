/**
 * main.js — ウィジェット固有のロジック
 *
 * _render(config) を実装する。
 * widget_init.js から呼び出されるため、必ず後から読み込むこと。
 */

function _render(config) {
  // ===== configからパラメータを取得（必ずデフォルト値を設定） ===========
  var sampleParam = config.sample_param || 'デフォルト値';

  // ===== DOM更新 =========================================================
  var titleEl = document.getElementById('widget_title');
  var valueEl = document.getElementById('main_value');

  if (titleEl) titleEl.textContent = 'ウィジェット名';
  if (valueEl) valueEl.textContent = sampleParam;

  // ===== 定期更新が必要な場合（例：時刻表示） ===========================
  // setInterval(function () { /* 更新処理 */ }, 60000);
}

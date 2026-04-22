var _token = null;
var _initCalled = false;

function init_widget(config) {
  if (!config) config = {};
  _initCalled = true;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function () {
      _token = config.token || null;
      _render(config);
    });
    return;
  }
  _token = config.token || null;
  _render(config);
}

// Yodeck postMessage リスナー
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function (fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

// フォールバック: 2秒待ってもYodeckからinit_widgetが来なければ空configで起動
window.addEventListener('load', function () {
  setTimeout(function () {
    if (!_initCalled && typeof _render === 'function') {
      init_widget({});
    }
  }, 2000);
});

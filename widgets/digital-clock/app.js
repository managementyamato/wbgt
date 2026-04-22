var _lastConfig = null;
var _tickTimer  = null;
var _resizeTimer = null;

var DAY_NAMES = ['（日）', '（月）', '（火）', '（水）', '（木）', '（金）', '（土）'];

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function () {
      _apply(_lastConfig);
    });
    return;
  }
  _apply(config);
}

window.addEventListener('resize', function () {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function () {
    _applyStyles(_lastConfig);
  }, 150);
});

function _pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function _isSynced() {
  // 2020年以前はNTP未同期と判断
  return new Date().getFullYear() >= 2020;
}

function _tick(config) {
  var now  = new Date();
  var timeEl = document.getElementById('time');
  var dateEl = document.getElementById('date');
  var dayEl  = document.getElementById('day');

  if (!_isSynced()) {
    // NTP未同期：同期中メッセージを表示
    timeEl.textContent = '時刻同期中...';
    dateEl.style.display = 'none';
    dayEl.style.display  = 'none';
    return;
  }

  var hh  = _pad(now.getHours());
  var mm  = _pad(now.getMinutes());
  var ss  = _pad(now.getSeconds());
  var fmt = config.timeFormat || 'HH:MM:SS';

  var timeStr = fmt === 'HH:MM' ? (hh + ':' + mm) : (hh + ':' + mm + ':' + ss);

  var yyyy    = now.getFullYear();
  var mo      = _pad(now.getMonth() + 1);
  var dd      = _pad(now.getDate());
  var dateStr = yyyy + '年' + mo + '月' + dd + '日';
  var dayStr  = DAY_NAMES[now.getDay()];

  var showDate = config.showDate === '1' || config.showDate === true;

  timeEl.textContent = timeStr;
  dateEl.textContent = dateStr;
  dayEl.textContent  = dayStr;
  // 同期完了後に日付表示を復元
  dateEl.style.display = showDate ? '' : 'none';
  dayEl.style.display  = showDate ? '' : 'none';
}

function _calcFontSizes(config) {
  var vh = window.innerHeight || 720;
  var vw = window.innerWidth  || 1280;
  var showDate = config.showDate === '1' || config.showDate === true;

  var timePx, datePx;
  var fs = config.fontSize || 'auto';
  if (fs === 'auto') {
    // 時刻が画面高さの60%、日付が15%を目安
    timePx = Math.floor(vh * 0.60);
    datePx = Math.floor(vh * 0.15);
    // 横幅制限：HH:MM:SS は約8文字分
    var maxByWidth = Math.floor(vw / 6.5);
    if (timePx > maxByWidth) timePx = maxByWidth;
  } else {
    timePx = parseInt(fs, 10);
    datePx = Math.max(16, Math.floor(timePx * 0.25));
  }
  return { timePx: timePx, datePx: datePx };
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor  = config.fontColor  || '#ffffff';
  var bgColor    = config.bgColor    || '#000000';
  var bold       = config.bold === '1' || config.bold === true;
  var showDate   = config.showDate === '1' || config.showDate === true;

  var sizes = _calcFontSizes(config);

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var timeEl = document.getElementById('time');
  var dateEl = document.getElementById('date');
  var dayEl  = document.getElementById('day');

  function applyBase(el, px) {
    el.style.fontFamily  = fontFamily;
    el.style.color       = fontColor;
    el.style.fontWeight  = bold ? 'bold' : 'normal';
    el.style.fontSize    = px + 'px';
  }

  applyBase(timeEl, sizes.timePx);
  applyBase(dateEl, sizes.datePx);
  applyBase(dayEl,  sizes.datePx);

  dateEl.style.display = showDate ? '' : 'none';
  dayEl.style.display  = showDate ? '' : 'none';
}

function _apply(config) {
  _applyStyles(config);

  // タイマーリセット
  if (_tickTimer) clearInterval(_tickTimer);
  _tick(config);
  _tickTimer = setInterval(function () { _tick(config); }, 1000);
}

/* Yodeck postMessage リスナー */
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function (fn) {
    if (fn.fname === 'init_widget' && fn.data) {
      init_widget(fn.data);
    }
  });
});

/* ローカル確認用フォールバック */
if (window.location.protocol === 'file:') {
  window.onload = function () {
    init_widget({
      timeFormat: 'HH:MM:SS',
      showDate:   '1',
      fontFamily: 'keifont, sans-serif',
      fontColor:  '#ffffff',
      bgColor:    '#1a1a2e',
      bold:       '0',
      fontSize:   'auto'
    });
  };
}

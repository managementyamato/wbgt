var _lastConfig = null;
var _tickTimer = null;
var _resizeTimer = null;

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _apply(_lastConfig); });
    return;
  }
  _apply(config);
}

function _apply(config) {
  _applyStyles(config);
  if (_tickTimer) clearInterval(_tickTimer);
  _tick(config);
  _tickTimer = setInterval(function() { _tick(config); }, 60000);
}

function _tick(config) {
  var targetDate = config.targetDate;
  var labelEl = document.getElementById('label');
  var countEl = document.getElementById('count');
  var unitEl = document.getElementById('unit');
  var subEl = document.getElementById('sub');

  var labelText = config.label || 'カウントダウン';
  labelEl.textContent = labelText;

  if (!targetDate) {
    countEl.textContent = '--';
    unitEl.textContent = '';
    subEl.textContent = '目標日を設定してください';
    return;
  }

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var target = new Date(targetDate + 'T00:00:00');
  var diffMs = target - today;
  var diffDays = Math.ceil(diffMs / 86400000);

  if (diffDays > 0) {
    countEl.textContent = diffDays;
    unitEl.textContent = '日';
    // 目標日表示
    var ty = target.getFullYear();
    var tm = target.getMonth() + 1;
    var td = target.getDate();
    subEl.textContent = ty + '年' + tm + '月' + td + '日まで';
  } else if (diffDays === 0) {
    countEl.textContent = '当日';
    unitEl.textContent = '';
    subEl.textContent = '本日が目標日です';
  } else {
    countEl.textContent = Math.abs(diffDays);
    unitEl.textContent = '日超過';
    subEl.textContent = '目標日を過ぎています';
  }
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#000000';
  var accentColor = config.accentColor || '#ff8c00';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var labelEl = document.getElementById('label');
  var countEl = document.getElementById('count');
  var unitEl = document.getElementById('unit');
  var subEl = document.getElementById('sub');

  var labelPx = Math.floor(vh * 0.10);
  var countPx = Math.floor(vh * 0.45);
  var unitPx = Math.floor(vh * 0.10);
  var subPx = Math.floor(vh * 0.06);

  // 横幅制限
  var maxChars = 4; // 最大4桁
  var maxW = Math.floor(vw * 0.85 / maxChars);
  if (countPx > maxW) countPx = maxW;

  labelEl.style.fontFamily = fontFamily;
  labelEl.style.color = fontColor;
  labelEl.style.fontSize = labelPx + 'px';

  countEl.style.fontFamily = fontFamily;
  countEl.style.color = accentColor;
  countEl.style.fontSize = countPx + 'px';
  countEl.style.fontWeight = 'bold';

  unitEl.style.fontFamily = fontFamily;
  unitEl.style.color = fontColor;
  unitEl.style.fontSize = unitPx + 'px';

  subEl.style.fontFamily = fontFamily;
  subEl.style.color = fontColor;
  subEl.style.fontSize = subPx + 'px';
}

window.addEventListener('resize', function() {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() { _applyStyles(_lastConfig); }, 150);
});

/* Yodeck postMessage リスナー */
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

/* ローカル確認用フォールバック */
if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      label: '工期終了まで',
      targetDate: '2026-12-31',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#000000',
      accentColor: '#ff8c00'
    });
  };
}

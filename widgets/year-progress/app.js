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

function _isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function _daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function _daysInYear(y) {
  return _isLeapYear(y) ? 366 : 365;
}

function _dayOfYear(d) {
  var start = new Date(d.getFullYear(), 0, 0);
  var diff = d - start;
  return Math.floor(diff / 86400000);
}

function _tick(config) {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();
  var d = now.getDate();
  var h = now.getHours();
  var min = now.getMinutes();

  // Year progress
  var doy = _dayOfYear(now);
  var totalDays = _daysInYear(y);
  var yearPct = (doy / totalDays) * 100;

  // Month progress
  var dim = _daysInMonth(y, m);
  var monthPct = ((d - 1 + h / 24) / dim) * 100;

  // Day progress
  var dayPct = ((h * 60 + min) / 1440) * 100;

  var showDay = config.showDay !== '0';

  // Update bars
  _updateBar('year', y + '年', yearPct, config);
  _updateBar('month', (m + 1) + '月', monthPct, config);

  var dayRow = document.getElementById('row-day');
  if (showDay) {
    dayRow.style.display = '';
    _updateBar('day', '今日', dayPct, config);
  } else {
    dayRow.style.display = 'none';
  }
}

function _updateBar(id, label, pct, config) {
  var barColor = config.barColor || '#e94560';

  document.getElementById('label-' + id).textContent = label;
  document.getElementById('pct-' + id).textContent = pct.toFixed(1) + '%';
  document.getElementById('bar-' + id).style.width = pct + '%';
  document.getElementById('bar-' + id).style.backgroundColor = barColor;
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#1a1a2e';
  var barBgColor = config.barBgColor || 'rgba(255,255,255,0.15)';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var labelPx = Math.floor(vh * 0.08);
  var pctPx = Math.floor(vh * 0.10);
  var barHeight = Math.floor(vh * 0.06);
  if (barHeight < 8) barHeight = 8;

  var items = ['year', 'month', 'day'];
  for (var i = 0; i < items.length; i++) {
    var id = items[i];
    var labelEl = document.getElementById('label-' + id);
    var pctEl = document.getElementById('pct-' + id);
    var barBg = document.getElementById('bar-bg-' + id);

    labelEl.style.fontFamily = fontFamily;
    labelEl.style.color = fontColor;
    labelEl.style.fontSize = labelPx + 'px';

    pctEl.style.fontFamily = fontFamily;
    pctEl.style.color = fontColor;
    pctEl.style.fontSize = pctPx + 'px';
    pctEl.style.fontWeight = 'bold';

    barBg.style.backgroundColor = barBgColor;
    barBg.style.height = barHeight + 'px';
  }
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
      showDay: '1',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#1a1a2e',
      barColor: '#e94560',
      barBgColor: 'rgba(255,255,255,0.15)'
    });
  };
}

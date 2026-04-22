// ===================== 生産・製造KPIボード =====================
// 生産数・良品率・稼働率などのKPIをリアルタイム大表示
// CSV形式: KPI名, 現在値, 目標値, 単位, 前日比(%), 備考

var _timer = null;
var SAMPLE_CSV = [
  '生産数,847,1000,個,+5.2%,',
  '良品率,98.6,99.0,%,-0.1%,',
  '稼働率,91.3,95.0,%,+2.1%,',
  '不良数,12,10,個,-3件,要確認',
  'ライン1稼働,running,,,稼働中',
  'ライン2稼働,stopped,,,段取り替え',
  'ライン3稼働,running,,,稼働中'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _start(config); });
    return;
  }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  var titleEl = document.getElementById('line-name');
  if (titleEl) titleEl.textContent = config.lineName || '製造KPI';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    var secs = parseInt(config.refreshSec || '30', 10);
    _timer = setInterval(function() { _fetch(url); }, secs * 1000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }

  _updateClock();
  setInterval(_updateClock, 30000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true);
  xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status === 200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var kpis = []; var lines = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (!cols[0]) return;
    var status = cols[1];
    if (status === 'running' || status === 'stopped' || status === 'maintenance') {
      lines.push({ name: cols[0], status: status, note: cols[4] || '' });
    } else {
      kpis.push({ label: cols[0], current: parseFloat(cols[1]) || 0, target: parseFloat(cols[2]) || 0, unit: cols[3] || '', trend: cols[4] || '', note: cols[5] || '' });
    }
  });
  return { kpis: kpis, lines: lines };
}

function _render(data) {
  var kpis = data.kpis || [];
  var lines = data.lines || [];

  var kpiEl = document.getElementById('kpi-grid');
  if (kpiEl) {
    kpiEl.innerHTML = '';
    kpis.forEach(function(kpi) {
      var pct = kpi.target > 0 ? Math.round(kpi.current / kpi.target * 100) : null;
      var isGood = pct === null || pct >= 100;
      var card = document.createElement('div');
      card.className = 'kpi-card' + (isGood ? '' : ' kpi-warn');
      var trendClass = kpi.trend.startsWith('+') ? 'trend-up' : kpi.trend.startsWith('-') ? 'trend-down' : '';
      card.innerHTML =
        '<div class="kpi-label">' + _esc(kpi.label) + '</div>' +
        '<div class="kpi-value">' + kpi.current.toLocaleString() + '<span class="kpi-unit">' + _esc(kpi.unit) + '</span></div>' +
        (kpi.target ? '<div class="kpi-target">目標 ' + kpi.target.toLocaleString() + kpi.unit + (pct !== null ? ' (' + pct + '%)' : '') + '</div>' : '') +
        (kpi.trend  ? '<div class="kpi-trend ' + trendClass + '">' + _esc(kpi.trend) + '</div>' : '') +
        (kpi.note   ? '<div class="kpi-note">' + _esc(kpi.note) + '</div>' : '');
      kpiEl.appendChild(card);
    });
  }

  var lineEl = document.getElementById('line-status');
  if (lineEl && lines.length > 0) {
    lineEl.innerHTML = '';
    lines.forEach(function(ln) {
      var item = document.createElement('div');
      item.className = 'line-item line-' + ln.status;
      var icons = { running: '🟢', stopped: '🔴', maintenance: '🟡' };
      var labels = { running: '稼働中', stopped: '停止中', maintenance: '点検中' };
      item.innerHTML =
        '<span class="line-dot">' + (icons[ln.status] || '⚪') + '</span>' +
        '<span class="line-name">' + _esc(ln.name) + '</span>' +
        '<span class="line-badge badge-' + ln.status + '">' + (labels[ln.status] || ln.status) + '</span>' +
        (ln.note ? '<span class="line-note">' + _esc(ln.note) + '</span>' : '');
      lineEl.appendChild(item);
    });
    lineEl.style.display = '';
  } else if (lineEl) {
    lineEl.style.display = 'none';
  }
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes());
}

function _z(n) { return String(n).padStart(2, '0'); }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({ lineName: '製造KPI', dataUrl: '', refreshSec: '30', fontFamily: 'keifont, sans-serif' });
  };
}

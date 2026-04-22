var _lastConfig = null;
var _fetchTimer = null;
var _clockTimer = null;
var _items = [];

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _start(_lastConfig); });
    return;
  }
  _start(config);
}

function _start(config) {
  _applyStyles(config);
  var titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = config.title || '担当者実績カウンター';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  var interval = parseInt(config.refreshSec || '30', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim(), config);
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim(), config); }, interval);
  } else {
    _items = _sampleItems(config);
    _render(config);
  }

  _updateHeader(config);
  _clockTimer = setInterval(function() { _updateHeader(config); }, 60000);
}

function _updateHeader(config) {
  var el = document.getElementById('header-right');
  if (!el) return;
  var now = new Date();
  var unit = config.unit || '件';
  el.innerHTML = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ' 更新<br>本日の' + unit + '数';
}

/* CSV形式: 名前, 役職, 件数(数値), 目標(数値) */
function _fetchData(url, config) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) { _items = parsed; _render(config); _updateHeader(config); }
    }
  };
  xhr.onerror = function() {
    if (_items.length === 0) { _items = _sampleItems(config); _render(config); }
  };
  xhr.send();
}

function _parseCSV(text) {
  var lines = text.trim().split('\n');
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].trim().split(',');
    if (cols.length < 3) continue;
    var name   = cols[0].trim();
    var role   = (cols[1] || '').trim();
    var count  = parseInt(cols[2].trim(), 10) || 0;
    var target = parseInt((cols[3] || '0').trim(), 10) || 0;
    if (!name) continue;
    result.push({ name: name, role: role, count: count, target: target });
  }
  return result.sort(function(a, b) { return b.count - a.count; });
}

function _sampleItems(config) {
  var unit = config.unit || '件';
  return [
    { name: '田中　花子', role: '担当',  count: 47, target: 50 },
    { name: '佐藤　一郎', role: '担当',  count: 38, target: 40 },
    { name: '鈴木　美咲', role: '担当',  count: 31, target: 40 },
    { name: '山田　健太', role: '担当',  count: 25, target: 40 },
    { name: '伊藤　陽子', role: '研修中', count: 12, target: 20 }
  ];
}

function _render(config) {
  var grid = document.getElementById('grid');
  if (!grid) return;

  var unit = config.unit || '件';
  var sorted = _items.slice().sort(function(a, b) { return b.count - a.count; });
  var maxCount = sorted.length > 0 ? sorted[0].count : 1;

  var cols = sorted.length > 6 ? 2 : 1;
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  var html = '';
  sorted.forEach(function(item, idx) {
    var rankClass = idx === 0 ? 'rank1' : idx === 1 ? 'rank2' : idx === 2 ? 'rank3' : '';
    var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1) + '.';
    var pct = maxCount > 0 ? Math.round(item.count / maxCount * 100) : 0;
    var tgtPct = item.target > 0 ? Math.round(item.count / item.target * 100) : null;

    html += '<div class="card ' + rankClass + '">';
    html += '<div class="rank-badge">' + medal + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div class="card-name">' + _esc(item.name) + '</div>';
    if (item.role) html += '<div class="card-role">' + _esc(item.role) + '</div>';
    html += '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';
    html += '<div class="card-right">';
    html += '<div class="count-num">' + item.count + '</div>';
    html += '<div class="count-unit">' + _esc(unit) + (tgtPct !== null ? '　目標' + tgtPct + '%' : '') + '</div>';
    html += '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;

  var total = sorted.reduce(function(s, i) { return s + i.count; }, 0);
  var footer = document.getElementById('footer');
  if (footer) {
    footer.innerHTML = '<div class="total-stat">チーム合計：<span>' + total + ' ' + _esc(unit) + '</span></div>';
    if (sorted.length > 0 && sorted[0].name) {
      footer.innerHTML += '<div class="total-stat">本日のトップ：<span>' + _esc(sorted[0].name) + '（' + sorted[0].count + ' ' + _esc(unit) + '）</span></div>';
    }
  }
}

function _applyStyles(config) {
  var bg   = config.bgColor    || '#111111';
  var fg   = config.fontColor  || '#ffffff';
  var font = config.fontFamily || 'keifont, sans-serif';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
  document.body.style.color      = fg;
  document.body.style.fontFamily = font;
}

function _z(n) { return String(n).padStart(2, '0'); }
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({ title: '担当者実績カウンター', unit: '件', dataUrl: '', refreshSec: '30', fontFamily: 'keifont, sans-serif', fontColor: '#ffffff', bgColor: '#111111' });
  };
}

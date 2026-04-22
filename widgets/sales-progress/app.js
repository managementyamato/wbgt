// ===================== 本日売上進捗 =====================
// 目標売上に対する現在の達成率をリアルタイム表示
// CSV形式: 指標名, 現在値, 目標値, 単位, 備考

var _timer = null;
var SAMPLE_CSV = [
  '売上,287500,350000,円,',
  '客数,87,120,名,',
  '客単価,3305,2916,円,目標超え',
  '注文数,142,180,件,'
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

  var titleEl = document.getElementById('shop-name');
  if (titleEl) titleEl.textContent = config.shopName || '本日の売上進捗';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    var mins = parseInt(config.refreshMin || '5', 10);
    _timer = setInterval(function() { _fetch(url); }, mins * 60 * 1000);
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
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 3 && cols[0]) {
      var cur = parseFloat(cols[1]) || 0;
      var tgt = parseFloat(cols[2]) || 1;
      rows.push({ label: cols[0], current: cur, target: tgt, unit: cols[3] || '', note: cols[4] || '' });
    }
  });
  return rows;
}

function _render(rows) {
  // 最初の指標をメイン表示
  var main = rows[0];
  if (main) {
    var pct = Math.round(main.current / main.target * 100);
    _set('main-label',   main.label);
    _set('main-current', _fmt(main.current, main.unit));
    _set('main-target',  '目標 ' + _fmt(main.target, main.unit));
    _set('main-pct',     pct + '%');

    var fillEl = document.getElementById('main-bar-fill');
    if (fillEl) {
      fillEl.style.width = Math.min(pct, 100) + '%';
      fillEl.style.background = pct >= 100 ? '#66bb6a' : pct >= 80 ? '#42a5f5' : pct >= 50 ? '#ffca28' : '#ef5350';
    }

    // テーマ
    document.body.className = pct >= 100 ? 'theme-great' : pct >= 80 ? 'theme-good' : 'theme-normal';
  }

  // サブ指標
  var subEl = document.getElementById('sub-metrics');
  if (!subEl) return;
  subEl.innerHTML = '';

  rows.slice(1).forEach(function(row) {
    var pct = Math.round(row.current / row.target * 100);
    var item = document.createElement('div');
    item.className = 'sub-item';
    item.innerHTML =
      '<div class="sub-label">' + _esc(row.label) + '</div>' +
      '<div class="sub-values">' +
        '<span class="sub-current">' + _fmt(row.current, row.unit) + '</span>' +
        '<span class="sub-sep">/</span>' +
        '<span class="sub-target">' + _fmt(row.target, row.unit) + '</span>' +
        '<span class="sub-pct ' + (pct >= 100 ? 'pct-great' : '') + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="sub-bar-wrap"><div class="sub-bar-fill" style="width:' + Math.min(pct,100) + '%;background:' + _barColor(pct) + '"></div></div>';
    subEl.appendChild(item);
  });
}

function _barColor(pct) {
  return pct >= 100 ? '#66bb6a' : pct >= 80 ? '#42a5f5' : pct >= 50 ? '#ffca28' : '#ef5350';
}

function _fmt(val, unit) {
  if (unit === '円' || unit === '¥') return '¥' + val.toLocaleString();
  return val.toLocaleString() + (unit ? unit : '');
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ' 現在';
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
    init_widget({ shopName: '本日の売上進捗', dataUrl: '', refreshMin: '5', fontFamily: 'keifont, sans-serif' });
  };
}

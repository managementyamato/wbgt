// ===================== テーブル状況ボード =====================
// 各テーブルの空席/食事中/清掃中をリアルタイム表示
// CSV形式: テーブル名, ステータス(available/occupied/cleaning/reserved), 人数, 備考

var _timer = null;
var SAMPLE_CSV = [
  'A1,available,0,',
  'A2,occupied,4,',
  'A3,occupied,2,',
  'A4,cleaning,0,清掃中',
  'B1,available,0,',
  'B2,reserved,0,18:00〜予約',
  'B3,occupied,3,',
  'B4,available,0,',
  'C1,occupied,6,',
  'C2,available,0,',
  'C3,cleaning,0,',
  'カウンター1,occupied,1,',
  'カウンター2,available,0,',
  'カウンター3,available,0,'
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
  if (titleEl) titleEl.textContent = config.shopName || 'テーブル状況';

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
  setInterval(_updateClock, 10000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true);
  xhr.timeout = 8000;
  xhr.onload = function() { if (xhr.status === 200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 2 && cols[0]) {
      rows.push({
        name:   cols[0],
        status: (cols[1] || 'available').toLowerCase(),
        count:  parseInt(cols[2], 10) || 0,
        note:   cols[3] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  var counts = { available: 0, occupied: 0, cleaning: 0, reserved: 0 };
  rows.forEach(function(r) { if (counts[r.status] !== undefined) counts[r.status]++; });

  _set('count-available', counts.available);
  _set('count-occupied',  counts.occupied);
  _set('count-total',     rows.length);

  var gridEl = document.getElementById('table-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  rows.forEach(function(row) {
    var card = document.createElement('div');
    card.className = 'table-card status-' + row.status;

    var icon = { available: '🟢', occupied: '🔴', cleaning: '🧹', reserved: '📅' }[row.status] || '⚪';
    var label = { available: '空席', occupied: '使用中', cleaning: '清掃中', reserved: '予約済' }[row.status] || row.status;

    card.innerHTML =
      '<div class="card-name">' + _esc(row.name) + '</div>' +
      '<div class="card-icon">' + icon + '</div>' +
      '<div class="card-label">' + label + '</div>' +
      (row.count > 0 ? '<div class="card-count">' + row.count + '名</div>' : '') +
      (row.note ? '<div class="card-note">' + _esc(row.note) + '</div>' : '');

    gridEl.appendChild(card);
  });
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

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
    init_widget({ shopName: 'テーブル状況', dataUrl: '', refreshSec: '30', fontFamily: 'keifont, sans-serif' });
  };
}

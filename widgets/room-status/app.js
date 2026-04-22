// ===================== 診察室・会議室ステータス =====================
// 各部屋の状態（空き/使用中/清掃中/予約済）をリアルタイム表示
// CSV形式: 部屋名, ステータス(available/busy/cleaning/reserved), 担当者/用途, 終了予定時刻, 備考

var _timer = null;
var SAMPLE_CSV = [
  '第1診察室,busy,田中医師,14:30,',
  '第2診察室,available,,,',
  '第3診察室,busy,鈴木医師,15:00,',
  '処置室A,cleaning,,14:45,消毒中',
  '処置室B,available,,,',
  'X線室,busy,放射線技師,14:20,',
  '超音波室,reserved,,15:30,予約あり',
  '会議室,available,,,'
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

  var titleEl = document.getElementById('facility-name');
  if (titleEl) titleEl.textContent = config.facilityName || '室内状況';

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
        room:    cols[0],
        status:  (cols[1] || 'available').toLowerCase(),
        person:  cols[2] || '',
        endTime: cols[3] || '',
        note:    cols[4] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  var available = rows.filter(function(r) { return r.status === 'available'; }).length;
  _set('count-available', available);
  _set('count-total',     rows.length);

  var gridEl = document.getElementById('room-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  rows.forEach(function(row) {
    var card = document.createElement('div');
    card.className = 'room-card status-' + row.status;

    var labels = { available: '空き', busy: '使用中', cleaning: '清掃中', reserved: '予約済' };
    var icons  = { available: '🟢', busy: '🔴', cleaning: '🧹', reserved: '📅' };

    card.innerHTML =
      '<div class="room-name">' + _esc(row.room) + '</div>' +
      '<div class="room-icon">' + (icons[row.status] || '⚪') + '</div>' +
      '<div class="room-label">' + (labels[row.status] || row.status) + '</div>' +
      (row.person  ? '<div class="room-person">' + _esc(row.person) + '</div>' : '') +
      (row.endTime ? '<div class="room-end">〜' + _esc(row.endTime) + '</div>' : '') +
      (row.note    ? '<div class="room-note">' + _esc(row.note) + '</div>' : '');

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
    init_widget({ facilityName: '診察室・室内状況', dataUrl: '', refreshSec: '30', fontFamily: 'keifont, sans-serif' });
  };
}

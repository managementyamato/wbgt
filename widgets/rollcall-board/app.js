// ===================== 点呼・出欠ボード =====================
// 朝礼後の点呼結果（出勤/欠勤/遅刻）を掲示
// CSV形式: 名前, 所属, ステータス(present/absent/late/leave), 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中 太郎,田中工務店,present,',
  '鈴木 一郎,鈴木建設,present,',
  '佐藤 次郎,鈴木建設,present,',
  '山田 三郎,山田電気,late,10:00着予定',
  '中村 四郎,中村塗装,present,',
  '加藤 五郎,田中工務店,absent,体調不良',
  '松本 六郎,松本設備,present,',
  '井上 七郎,井上土木,leave,午後から',
  '渡辺 八郎,田中工務店,present,',
  '小林 九郎,小林建材,present,'
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

  var titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.textContent = config.boardTitle || '朝礼点呼';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    var mins = parseInt(config.refreshMin || '3', 10);
    _timer = setInterval(function() { _fetch(url); }, mins * 60 * 1000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }

  _updateDate();
  setInterval(_updateDate, 60000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status !== 200) return;
    _render(_parse(xhr.responseText));
  };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 3 && cols[0]) {
      rows.push({ name: cols[0], company: cols[1] || '', status: (cols[2] || 'present').toLowerCase(), note: cols[3] || '' });
    }
  });
  return rows;
}

function _render(rows) {
  var counts = { present: 0, absent: 0, late: 0, leave: 0 };
  rows.forEach(function(r) { if (counts[r.status] !== undefined) counts[r.status]++; });

  // サマリー
  _set('count-present', counts.present);
  _set('count-absent',  counts.absent);
  _set('count-late',    counts.late);
  _set('count-total',   rows.length + '名中');

  // リスト（欠勤→遅刻→早退→出勤順）
  var order = { absent: 0, late: 1, leave: 2, present: 3 };
  rows.sort(function(a, b) { return (order[a.status] || 3) - (order[b.status] || 3); });

  var listEl = document.getElementById('roll-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var item = document.createElement('div');
    item.className = 'roll-item status-' + row.status;
    var dot = { present: '🟢', absent: '🔴', late: '🟡', leave: '🔵' }[row.status] || '⚪';
    var label = { present: '出勤', absent: '欠勤', late: '遅刻', leave: '早退' }[row.status] || row.status;
    item.innerHTML =
      '<span class="roll-dot">' + dot + '</span>' +
      '<span class="roll-name">' + _esc(row.name) + '</span>' +
      '<span class="roll-company">' + _esc(row.company) + '</span>' +
      '<span class="roll-badge badge-' + row.status + '">' + label + '</span>' +
      (row.note ? '<span class="roll-note">' + _esc(row.note) + '</span>' : '');
    listEl.appendChild(item);
  });
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

function _updateDate() {
  var el = document.getElementById('today-date');
  if (!el) return;
  var now = new Date();
  var days = ['日','月','火','水','木','金','土'];
  el.textContent = (now.getMonth()+1) + '/' + now.getDate() + '（' + days[now.getDay()] + '） ' + _z(now.getHours()) + ':' + _z(now.getMinutes());
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
    init_widget({ boardTitle: '朝礼点呼', dataUrl: '', refreshMin: '3', fontFamily: 'keifont, sans-serif' });
  };
}

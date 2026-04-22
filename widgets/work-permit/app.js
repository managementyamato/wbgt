// ===================== 作業許可証掲示板 =====================
// 現在有効な危険作業許可証を一覧表示
// CSV形式: 許可証番号, 作業内容, 担当者, 開始時刻(HH:MM), 終了時刻(HH:MM), 場所, ステータス(active/pending/done)

var _timer = null;
var SAMPLE_CSV = [
  'WP-001,高所作業（3階外壁）,田中 太郎,08:00,17:00,3F外部,active',
  'WP-002,溶接作業（地下1階）,鈴木 一郎,09:00,15:00,B1F機械室,active',
  'WP-003,クレーン揚重,山田 三郎,10:00,12:00,南側ヤード,active',
  'WP-004,足場解体（北面）,佐藤 次郎,13:00,17:00,1F北側,pending',
  'WP-005,コンクリート打設,中村 班,07:00,09:00,2F床版,done'
].join('\n');

var _intervalId = null;

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
  if (titleEl) titleEl.textContent = config.boardTitle || '作業許可証';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    var mins = parseInt(config.refreshMin || '5', 10);
    _timer = setInterval(function() { _fetch(url); }, mins * 60 * 1000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }

  // 1分ごとに時刻ベースのステータスを再計算
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(function() {
    var url2 = (config.dataUrl || '').trim();
    if (!url2) _render(_parse(SAMPLE_CSV));
  }, 60000);

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
    if (cols.length >= 6 && cols[0]) {
      var status = (cols[6] || 'active').toLowerCase();
      rows.push({
        id:      cols[0],
        work:    cols[1] || '',
        person:  cols[2] || '',
        start:   cols[3] || '',
        end:     cols[4] || '',
        place:   cols[5] || '',
        status:  status
      });
    }
  });
  return rows;
}

function _render(rows) {
  // ステータス順：active → pending → done
  var order = { active: 0, pending: 1, done: 2 };
  rows.sort(function(a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });

  var activeCount = rows.filter(function(r) { return r.status === 'active'; }).length;
  var el = document.getElementById('active-count');
  if (el) el.textContent = activeCount;

  var listEl = document.getElementById('permit-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var item = document.createElement('div');
    item.className = 'permit-item status-' + row.status;

    var statusLabel = { active: '作業中', pending: '開始待ち', done: '完了' }[row.status] || row.status;
    var icon = { active: '🔧', pending: '⏳', done: '✅' }[row.status] || '📋';

    item.innerHTML =
      '<div class="permit-header">' +
        '<span class="permit-icon">' + icon + '</span>' +
        '<span class="permit-id">' + _esc(row.id) + '</span>' +
        '<span class="permit-badge badge-' + row.status + '">' + statusLabel + '</span>' +
        '<span class="permit-time">' + _esc(row.start) + '〜' + _esc(row.end) + '</span>' +
      '</div>' +
      '<div class="permit-work">' + _esc(row.work) + '</div>' +
      '<div class="permit-sub">' +
        '<span class="permit-person">👤 ' + _esc(row.person) + '</span>' +
        '<span class="permit-place">📍 ' + _esc(row.place) + '</span>' +
      '</div>';

    listEl.appendChild(item);
  });
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
    init_widget({ boardTitle: '作業許可証', dataUrl: '', refreshMin: '5', fontFamily: 'keifont, sans-serif' });
  };
}

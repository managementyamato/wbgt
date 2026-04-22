// ===================== 入退場管理ボード =====================
// 現在の入場者数と入場者リストをリアルタイム表示
// CSV形式: 名前, 所属, 入場時刻(HH:MM), 退場時刻(HH:MM or 空欄=在場中), 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中 太郎,田中工務店,07:30,,現場監督',
  '鈴木 一郎,鈴木建設,08:00,,鉄筋工',
  '佐藤 次郎,佐藤建設,08:00,,鉄筋工',
  '山田 三郎,山田電気,08:15,,電気工事',
  '中村 四郎,中村塗装,08:30,,塗装工',
  '加藤 五郎,田中工務店,09:00,,大工',
  '松本 六郎,松本設備,09:30,12:00,午前のみ退場済',
  '井上 七郎,井上土木,10:00,11:30,午前退場済'
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
  var font = config.fontFamily || 'keifont, sans-serif';
  document.body.style.fontFamily = font;

  var titleEl = document.getElementById('site-name');
  if (titleEl) titleEl.textContent = config.siteName || '現場入退場管理';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetchCSV(url);
    var mins = parseInt(config.refreshMin || '1', 10);
    _timer = setInterval(function() { _fetchCSV(url); }, mins * 60 * 1000);
  } else {
    _render(_parseCSV(SAMPLE_CSV));
  }

  _startClock();
}

function _fetchCSV(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status !== 200) return;
    _render(_parseCSV(xhr.responseText));
  };
  xhr.ontimeout = function() {};
  xhr.onerror   = function() {};
  xhr.send();
}

function _parseCSV(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 3 && cols[0]) {
      rows.push({
        name:    cols[0] || '',
        company: cols[1] || '',
        enter:   cols[2] || '',
        exit:    cols[3] || '',
        note:    cols[4] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  var onSite  = rows.filter(function(r) { return !r.exit; });
  var exited  = rows.filter(function(r) { return !!r.exit; });

  // カウント表示
  var countEl = document.getElementById('on-site-count');
  if (countEl) countEl.textContent = onSite.length;

  var totalEl = document.getElementById('total-count');
  if (totalEl) totalEl.textContent = '本日入場: ' + rows.length + '名 / 退場: ' + exited.length + '名';

  // リスト描画（在場者優先、退場者はグレーアウト）
  var listEl = document.getElementById('entry-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  var allRows = onSite.concat(exited);
  allRows.forEach(function(row) {
    var isOnSite = !row.exit;
    var item = document.createElement('div');
    item.className = 'entry-item' + (isOnSite ? ' on-site' : ' exited');

    item.innerHTML =
      '<div class="entry-dot ' + (isOnSite ? 'dot-green' : 'dot-gray') + '"></div>' +
      '<div class="entry-info">' +
        '<span class="entry-name">' + _esc(row.name) + '</span>' +
        '<span class="entry-company">' + _esc(row.company) + '</span>' +
      '</div>' +
      '<div class="entry-time">' +
        '<span class="time-enter">' + _esc(row.enter) + '</span>' +
        (row.exit ? '<span class="time-arrow">→</span><span class="time-exit">' + _esc(row.exit) + '</span>' : '<span class="time-badge">在場中</span>') +
      '</div>';

    listEl.appendChild(item);
  });
}

function _startClock() {
  _updateClock();
  setInterval(_updateClock, 10000);
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes());
}

function _z(n) { return String(n).padStart(2, '0'); }
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Yodeck postMessage */
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      siteName:   '第一建設現場',
      dataUrl:    '',
      refreshMin: '1',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

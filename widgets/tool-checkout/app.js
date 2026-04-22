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
  if (titleEl) titleEl.textContent = config.title || '持ち出し管理ボード';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  var interval = parseInt(config.refreshSec || '30', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, interval);
  } else {
    _items = _sampleItems();
    _render();
  }

  _updateMeta();
  _clockTimer = setInterval(_updateMeta, 10000);
}

function _updateMeta() {
  var el = document.getElementById('meta');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ' 更新';
}

/* ── データ取得 ──
   CSV形式: 工具名,ステータス(available/checked-out/maintenance),担当者,更新時刻,備考
*/
function _fetchData(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) {
        _items = parsed;
        _render();
        _updateMeta();
      }
    }
  };
  xhr.onerror = function() {
    if (_items.length === 0) { _items = _sampleItems(); _render(); }
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
    var status = cols[1].trim().toLowerCase();
    var person = cols[2].trim();
    var time   = (cols[3] || '').trim();
    var note   = (cols[4] || '').trim();
    if (!name) continue;
    if (!['available', 'checked-out', 'maintenance'].includes(status)) status = 'available';
    result.push({ name: name, status: status, person: person, time: time, note: note });
  }
  return result;
}

function _sampleItems() {
  var t = function(offset) {
    var d = new Date(); d.setMinutes(d.getMinutes() - offset);
    return _z(d.getHours()) + ':' + _z(d.getMinutes());
  };
  return [
    { name: 'インパクトドライバー #1', status: 'checked-out',  person: '田中',   time: t(45),  note: '3F工事' },
    { name: 'インパクトドライバー #2', status: 'available',    person: '返却済', time: t(120), note: '' },
    { name: '電動ドリル',              status: 'checked-out',  person: '佐藤',   time: t(20),  note: '' },
    { name: '丸ノコ',                  status: 'available',    person: '返却済', time: t(200), note: '' },
    { name: '高所作業車 キー',         status: 'checked-out',  person: '鈴木',   time: t(60),  note: '外構作業' },
    { name: '安全帯セット A',          status: 'available',    person: '返却済', time: t(15),  note: '' },
    { name: '水平器（大）',            status: 'maintenance',  person: '点検中', time: t(5),   note: '要修理' }
  ];
}

/* ── 描画 ── */
function _render() {
  var grid = document.getElementById('grid');
  if (!grid) return;

  if (!_items.length) {
    grid.innerHTML = '<div id="empty">表示するデータがありません</div>';
    _renderSummary(0, 0, 0);
    return;
  }

  var cols = _items.length > 5 ? 2 : 1;
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  var statusLabel = { 'available': '返却済', 'checked-out': '貸出中', 'maintenance': '点検中' };

  var html = '';
  _items.forEach(function(item) {
    var cls = item.status;
    html += '<div class="card ' + cls + '">';
    html += '<div class="status-dot"></div>';
    html += '<div class="card-info" style="flex:1;min-width:0;">';
    html += '<div class="card-name">' + _esc(item.name) + '</div>';
    if (item.note) html += '<div class="card-note">' + _esc(item.note) + '</div>';
    html += '</div>';
    html += '<div class="card-right">';
    html += '<div class="card-person">' + _esc(item.person || '---') + '</div>';
    if (item.time) html += '<div class="card-time">' + _esc(item.time) + '</div>';
    html += '<div class="status-label">' + (statusLabel[item.status] || item.status) + '</div>';
    html += '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;

  var avail = _items.filter(function(i) { return i.status === 'available'; }).length;
  var out   = _items.filter(function(i) { return i.status === 'checked-out'; }).length;
  var maint = _items.filter(function(i) { return i.status === 'maintenance'; }).length;
  _renderSummary(avail, out, maint);
}

function _renderSummary(avail, out, maint) {
  var el = document.getElementById('summary');
  if (!el) return;
  el.innerHTML =
    '<div class="sum-item">返却済：<span class="ok">' + avail + '</span></div>' +
    '<div class="sum-item">貸出中：<span class="out">' + out + '</span></div>' +
    (maint > 0 ? '<div class="sum-item">点検中：<span class="warn">' + maint + '</span></div>' : '') +
    '<div class="sum-item" style="margin-left:auto;color:#555;font-size:1.8vh;">Googleフォームで貸出・返却を記録</div>';
}

/* ── スタイル ── */
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

/* ── Yodeck postMessage ── */
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
      title: '持ち出し管理ボード',
      dataUrl: '',
      refreshSec: '30',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#111111'
    });
  };
}

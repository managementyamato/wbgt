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
  if (titleEl) titleEl.textContent = config.title || 'スタッフ対応状況';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  var interval = parseInt(config.refreshSec || '15', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, interval);
  } else {
    _items = _sampleItems();
    _render();
  }

  _updateClock();
  _clockTimer = setInterval(_updateClock, 1000);
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ':' + _z(now.getSeconds());
}

/* ── データ取得 ──
   CSV形式: 名前, 役職, ステータス(free/busy/away/offline), ETA(例: あと10分), 備考
*/
function _fetchData(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) { _items = parsed; _render(); }
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
    var role   = (cols[1] || '').trim();
    var status = cols[2].trim().toLowerCase();
    var eta    = (cols[3] || '').trim();
    var note   = (cols[4] || '').trim();
    if (!name) continue;
    if (!['free','busy','away','offline'].includes(status)) status = 'free';
    result.push({ name: name, role: role, status: status, eta: eta, note: note });
  }
  return result;
}

function _sampleItems() {
  return [
    { name: '田中　花子', role: '受付',   status: 'free',    eta: '',        note: '' },
    { name: '佐藤　一郎', role: '担当医', status: 'busy',    eta: 'あと10分', note: '診察中' },
    { name: '鈴木　美咲', role: '看護師', status: 'away',    eta: 'あと5分',  note: '処置室' },
    { name: '山田　健太', role: '受付',   status: 'free',    eta: '',        note: '' },
    { name: '伊藤　陽子', role: '担当医', status: 'offline', eta: '13:00〜',  note: '午後から' }
  ];
}

/* ── 描画 ── */
function _render() {
  var grid = document.getElementById('grid');
  if (!grid) return;

  if (!_items.length) {
    grid.innerHTML = '<div style="color:#555;text-align:center;padding:3em;font-size:2vh;">データがありません</div>';
    return;
  }

  var statusLabel = { free: '対応できます', busy: '対応中', away: '離席中', offline: '不在' };
  var cols = _items.length > 6 ? 2 : 1;
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  var html = '';
  _items.forEach(function(item) {
    html += '<div class="card ' + item.status + '">';
    html += '<div class="dot"></div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div class="card-name">' + _esc(item.name) + '</div>';
    if (item.role) html += '<div class="card-role">' + _esc(item.role) + '</div>';
    html += '</div>';
    html += '<div class="card-right">';
    html += '<div class="card-status">' + (statusLabel[item.status] || item.status) + '</div>';
    if (item.eta)  html += '<div class="card-eta">' + _esc(item.eta) + '</div>';
    if (item.note && !item.eta) html += '<div class="card-eta">' + _esc(item.note) + '</div>';
    html += '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
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
    init_widget({ title: 'スタッフ対応状況', dataUrl: '', refreshSec: '15', fontFamily: 'keifont, sans-serif', fontColor: '#ffffff', bgColor: '#111111' });
  };
}

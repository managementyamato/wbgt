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
  if (titleEl) titleEl.textContent = config.title || '在庫・売切れライブ';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  var interval = parseInt(config.refreshSec || '30', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim(), config);
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim(), config); }, interval);
  } else {
    _items = _sampleItems();
    _render(config);
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

/* CSV形式: 商品名, 在庫数(数値), 警告しきい値(数値), 単位, 備考 */
function _fetchData(url, config) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) { _items = parsed; _render(config); }
    }
  };
  xhr.onerror = function() {
    if (_items.length === 0) { _items = _sampleItems(); _render(config); }
  };
  xhr.send();
}

function _parseCSV(text) {
  var lines = text.trim().split('\n');
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].trim().split(',');
    if (cols.length < 2) continue;
    var name    = cols[0].trim();
    var stock   = parseInt(cols[1].trim(), 10);
    var warn    = parseInt((cols[2] || '3').trim(), 10) || 3;
    var unit    = (cols[3] || '個').trim();
    var note    = (cols[4] || '').trim();
    if (!name) continue;
    result.push({ name: name, stock: isNaN(stock) ? 0 : stock, warn: warn, unit: unit, note: note });
  }
  return result;
}

function _sampleItems() {
  return [
    { name: 'ランチAセット',       stock: 8,  warn: 5,  unit: '食', note: '日替わり' },
    { name: '本日のパスタ',         stock: 3,  warn: 3,  unit: '食', note: '残りわずか' },
    { name: 'サンドイッチ盛合せ',   stock: 0,  warn: 3,  unit: '個', note: '11:30完売' },
    { name: 'スープセット（大）',   stock: 12, warn: 5,  unit: '食', note: '' },
    { name: 'フルーツカップ',       stock: 2,  warn: 3,  unit: '個', note: '残り2個' },
    { name: '日替わり定食',         stock: 0,  warn: 3,  unit: '食', note: '12:15完売' }
  ];
}

function _getStatus(item) {
  if (item.stock <= 0)          return 'sold-out';
  if (item.stock <= item.warn)  return 'low-stock';
  return 'in-stock';
}

function _render(config) {
  var grid = document.getElementById('grid');
  if (!grid) return;

  var unit = config.unit || '';

  if (!_items.length) {
    grid.innerHTML = '<div style="color:#555;text-align:center;padding:3em;font-size:2vh;">データがありません</div>';
    return;
  }

  /* sold-out → low-stock → in-stock の順 */
  var sorted = _items.slice().sort(function(a, b) {
    var order = { 'sold-out': 0, 'low-stock': 1, 'in-stock': 2 };
    return order[_getStatus(a)] - order[_getStatus(b)];
  });

  var cols = sorted.length > 5 ? 2 : 1;
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  var html = '';
  sorted.forEach(function(item) {
    var status = _getStatus(item);
    var icon = status === 'sold-out' ? '🔴' : status === 'low-stock' ? '🟡' : '🟢';
    var displayUnit = unit || item.unit || '個';

    html += '<div class="card ' + status + '">';
    html += '<div class="status-icon">' + icon + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div class="card-name">' + _esc(item.name) + '</div>';
    if (item.note) html += '<div class="card-note">' + _esc(item.note) + '</div>';
    html += '</div>';
    html += '<div class="card-right">';
    if (status === 'sold-out') {
      html += '<div><span class="sold-badge">SOLD OUT</span></div>';
    } else if (status === 'low-stock') {
      html += '<div class="stock-count">' + item.stock + '</div>';
      html += '<div><span class="low-badge">残りわずか</span></div>';
    } else {
      html += '<div class="stock-count">' + item.stock + '</div>';
      html += '<div class="stock-unit">' + _esc(displayUnit) + '</div>';
    }
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
    init_widget({ title: '在庫・売切れライブ', dataUrl: '', refreshSec: '30', fontFamily: 'keifont, sans-serif', fontColor: '#ffffff', bgColor: '#111111' });
  };
}

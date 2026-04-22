var _lastConfig = null;
var _tickTimer = null;
var _fetchTimer = null;
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
  if (titleEl) titleEl.textContent = config.title || 'フードロスカウントダウン';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_tickTimer)  clearInterval(_tickTimer);

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, 5 * 60 * 1000);
  } else {
    _items = _sampleItems();
    _render();
  }

  _updateClock();
  _tickTimer = setInterval(function() {
    _updateClock();
    _render();
  }, 1000);
}

/* ── 時計 ── */
function _updateClock() {
  var now = new Date();
  var el = document.getElementById('clock');
  if (!el) return;
  el.textContent =
    _z(now.getHours()) + ':' + _z(now.getMinutes()) + ':' + _z(now.getSeconds());
}

/* ── データ取得 ── */
function _fetchData(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) {
        _items = parsed;
        _render();
      }
    }
  };
  xhr.onerror = function() {
    if (_items.length === 0) { _items = _sampleItems(); _render(); }
  };
  xhr.send();
}

/* ── CSV パース ──
   形式: 商品名,廃棄時刻(HH:MM),割引率(%),備考
   1行目はヘッダー
*/
function _parseCSV(text) {
  var lines = text.trim().split('\n');
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].trim().split(',');
    if (cols.length < 3) continue;
    var name = cols[0].trim();
    var time = cols[1].trim();
    var disc = parseInt(cols[2].trim(), 10) || 0;
    var note = (cols[3] || '').trim();
    if (name && /^\d{1,2}:\d{2}$/.test(time)) {
      result.push({ name: name, expiryTime: time, discount: disc, note: note });
    }
  }
  return result;
}

/* ── サンプルデータ（dataUrl 未設定時） ── */
function _sampleItems() {
  return [
    { name: 'ランチパスタ（本日）', expiryTime: _nowPlus(90),  discount: 30, note: '残り3個' },
    { name: 'サンドイッチ盛合せ',  expiryTime: _nowPlus(35),  discount: 50, note: '' },
    { name: 'デイリースープセット', expiryTime: _nowPlus(15), discount: 70, note: '残り1個' },
    { name: 'フルーツカップ',       expiryTime: _nowPlus(-5), discount: 100, note: '廃棄時間経過' }
  ];
}

function _nowPlus(min) {
  var d = new Date();
  d.setMinutes(d.getMinutes() + min);
  return _z(d.getHours()) + ':' + _z(d.getMinutes());
}

/* ── カウントダウン計算 ── */
function _minutesLeft(expiryTime) {
  var parts = expiryTime.split(':');
  var now = new Date();
  var exp = new Date();
  exp.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  return Math.floor((exp - now) / 60000);
}

function _formatCountdown(min) {
  if (min < 0)  return '終了';
  if (min === 0) return 'まもなく';
  if (min < 60)  return min + '分';
  var h = Math.floor(min / 60);
  var m = min % 60;
  return h + '時間' + (m > 0 ? m + '分' : '');
}

function _urgency(min) {
  if (min < 0)   return 'expired';
  if (min < 30)  return 'red';
  if (min < 60)  return 'orange';
  if (min < 120) return 'yellow';
  return 'green';
}

/* ── 描画 ── */
function _render() {
  var grid = document.getElementById('grid');
  if (!grid) return;

  if (!_items.length) {
    grid.innerHTML = '<div id="empty">表示するアイテムがありません</div>';
    return;
  }

  /* 2列グリッドにする枚数しきい値 */
  var cols = _items.length > 4 ? 2 : 1;
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  var html = '';
  _items.forEach(function(item) {
    var min = _minutesLeft(item.expiryTime);
    var cls = _urgency(min);
    var cd  = _formatCountdown(min);
    html += '<div class="card ' + cls + '">';
    html +=   '<div class="card-info">';
    html +=     '<div class="card-name">' + _esc(item.name) + '</div>';
    if (item.note) html += '<div class="card-note">' + _esc(item.note) + '</div>';
    html +=   '</div>';
    html +=   '<div class="card-right">';
    html +=     '<div class="card-countdown">' + cd + '</div>';
    if (item.discount > 0) {
      html += '<div class="card-discount">' + item.discount + '% OFF</div>';
    }
    html +=   '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
}

/* ── ユーティリティ ── */
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
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Yodeck postMessage ── */
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

/* ── ローカル確認用フォールバック ── */
if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      title: 'フードロスカウントダウン',
      dataUrl: '',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#111111'
    });
  };
}

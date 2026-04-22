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
  if (titleEl) titleEl.textContent = config.title || '申し送りボード';

  var hintEl = document.getElementById('footer-hint');
  if (hintEl) hintEl.textContent = config.hint || 'Googleフォームで追加・完了報告';

  _updateDateBadge();
  _updateClock();
  if (_clockTimer) clearInterval(_clockTimer);
  _clockTimer = setInterval(function() { _updateClock(); }, 1000);

  if (_fetchTimer) clearInterval(_fetchTimer);
  var interval = parseInt(config.refreshSec || '30', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, interval);
  } else {
    _items = _sampleItems();
    _render();
  }
}

function _updateDateBadge() {
  var el = document.getElementById('date-badge');
  if (!el) return;
  var now = new Date();
  var days = ['日','月','火','水','木','金','土'];
  el.textContent = (now.getMonth()+1) + '月' + now.getDate() + '日（' + days[now.getDay()] + '）';
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ':' + _z(now.getSeconds());
}

/* ── CSV形式: 内容, ステータス(open/done/urgent), 担当者, 日時, カテゴリ ── */
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
    if (cols.length < 2) continue;
    var content  = cols[0].trim();
    var status   = (cols[1] || 'open').trim().toLowerCase();
    var author   = (cols[2] || '').trim();
    var datetime = (cols[3] || '').trim();
    var category = (cols[4] || '').trim();
    if (!content) continue;
    if (!['open','done','urgent'].includes(status)) status = 'open';
    result.push({ content: content, status: status, author: author, datetime: datetime, category: category });
  }
  return result;
}

function _sampleItems() {
  var now = new Date();
  var t = function(h, m) { return h + ':' + _z(m); };
  return [
    { content: '3F東側の仮設電源ブレーカーが落ちやすい。現場監督に報告済み、明日確認予定', status: 'urgent', author: '田中',   datetime: t(7,30),  category: '設備' },
    { content: '本日搬入予定の鉄筋（H型鋼）は午後13時着。荷受け担当は山田班にお願いします', status: 'open',   author: '佐藤',   datetime: t(6,55),  category: '搬入' },
    { content: '足場点検の記録を所長室の棚に提出すること（今日中）',                         status: 'open',   author: '鈴木',   datetime: t(8,10),  category: '書類' },
    { content: '安全帯Aセットの点検完了。問題なし',                                         status: 'done',   author: '加藤',   datetime: t(8,00),  category: '安全' },
    { content: '外部足場2段目の養生ネット補修が必要。資材発注済み（明日入荷）',               status: 'open',   author: '山田',   datetime: t(7,45),  category: '補修' }
  ];
}

function _render() {
  var list = document.getElementById('list');
  if (!list) return;

  if (!_items.length) {
    list.innerHTML = '<div style="color:#555;text-align:center;padding:3em;font-size:2vh;">申し送り事項はありません</div>';
    _renderFooter(0, 0, 0);
    return;
  }

  /* urgent→open→done の順に表示 */
  var sorted = _items.slice().sort(function(a, b) {
    var order = { urgent: 0, open: 1, done: 2 };
    return (order[a.status] || 1) - (order[b.status] || 1);
  });

  var html = '';
  sorted.forEach(function(item) {
    var cls = item.status;
    var check = item.status === 'done' ? '✓' : '□';
    var tag = item.status === 'urgent' ? '緊急' : item.status === 'done' ? '完了' : (item.category || '');
    html += '<div class="card ' + cls + '">';
    html += '<div class="card-check">' + check + '</div>';
    html += '<div class="card-body">';
    html += '<div class="card-text">' + _esc(item.content) + '</div>';
    var meta = [];
    if (item.author)   meta.push(item.author);
    if (item.datetime) meta.push(item.datetime);
    if (meta.length) html += '<div class="card-meta">' + meta.map(_esc).join('　') + '</div>';
    html += '</div>';
    if (tag) html += '<div class="card-tag">' + _esc(tag) + '</div>';
    html += '</div>';
  });
  list.innerHTML = html;

  var urgent = _items.filter(function(i) { return i.status === 'urgent'; }).length;
  var open   = _items.filter(function(i) { return i.status === 'open'; }).length;
  var done   = _items.filter(function(i) { return i.status === 'done'; }).length;
  _renderFooter(urgent, open, done);
}

function _renderFooter(urgent, open, done) {
  var el = document.getElementById('footer-stats');
  if (!el) return;
  el.innerHTML =
    (urgent > 0 ? '<div class="stat">緊急：<span style="color:#e53935">' + urgent + '</span></div>' : '') +
    '<div class="stat">未処理：<span>' + open + '</span></div>' +
    '<div class="stat">完了：<span style="color:#00c853">' + done + '</span></div>';
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
    init_widget({ title: '申し送りボード', dataUrl: '', refreshSec: '30', hint: 'Googleフォームで追加・完了報告', fontFamily: 'keifont, sans-serif', fontColor: '#ffffff', bgColor: '#111111' });
  };
}

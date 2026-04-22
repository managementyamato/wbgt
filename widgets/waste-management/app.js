// ===== 産廃・廃棄物管理ボード =====
var _lastConfig = null;
var _fetchTimer = null;
var _clockTimer = null;
var _items = [];
var _warnPct = 80;

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
  _warnPct = parseFloat(config.warnPct) || 80;

  var font = config.fontFamily || 'keifont, sans-serif';
  document.body.style.fontFamily = font;

  var nameEl = document.getElementById('site-name');
  if (nameEl) nameEl.textContent = config.siteName || '産廃管理ボード';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  _updateClock();
  _clockTimer = setInterval(_updateClock, 30000);

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    var intervalMs = (parseInt(config.refreshMin || '30', 10) || 30) * 60 * 1000;
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, intervalMs);
  } else {
    _items = _sampleItems();
    _render();
  }
}

function _updateClock() {
  var now = new Date();
  var el = document.getElementById('clock');
  if (el) {
    el.textContent = now.getFullYear() + '/' +
      _z(now.getMonth() + 1) + '/' + _z(now.getDate()) + ' ' +
      _z(now.getHours()) + ':' + _z(now.getMinutes());
  }
}

/* ── データ取得 ──
   CSV: 廃棄物区分, 今月排出量, 月間上限, 単位, マニフェスト番号, 処理業者, 備考
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
    var category = cols[0].trim();
    var amount   = parseFloat(cols[1]) || 0;
    var limit    = parseFloat(cols[2]) || 0;
    var unit     = (cols[3] || 't').trim();
    var manifest = (cols[4] || '').trim();
    var company  = (cols[5] || '').trim();
    var note     = (cols[6] || '').trim();
    if (!category) continue;
    result.push({
      category: category,
      amount: amount,
      limit: limit,
      unit: unit,
      manifest: manifest,
      company: company,
      note: note
    });
  }
  return result;
}

function _sampleItems() {
  return [
    { category: 'コンクリートがら', amount: 12.5, limit: 50,  unit: 't', manifest: '産1234', company: '〇〇解体',       note: '' },
    { category: '木くず',           amount: 3.2,  limit: 10,  unit: 't', manifest: '産1235', company: '△△リサイクル',   note: '' },
    { category: '金属くず',         amount: 0.8,  limit: 5,   unit: 't', manifest: '産1236', company: '□□金属',         note: '' },
    { category: '廃プラスチック',   amount: 1.1,  limit: 3,   unit: 't', manifest: '産1237', company: '◇◇処理',         note: '警戒' },
    { category: '混合廃棄物',       amount: 4.5,  limit: 8,   unit: 't', manifest: '産1238', company: '○×廃棄',         note: '' }
  ];
}

/* ── 描画 ── */
function _render() {
  var tbody = document.getElementById('tbody');
  if (!tbody) return;

  if (!_items.length) {
    tbody.innerHTML = '<tr><td colspan="6" id="empty">データがありません</td></tr>';
    _updateSummary(0, 0, 0);
    return;
  }

  var html = '';
  var warnCount = 0;
  var overCount = 0;

  for (var i = 0; i < _items.length; i++) {
    var item = _items[i];
    var pct = item.limit > 0 ? (item.amount / item.limit) * 100 : 0;
    var status = 'ok';
    if (pct >= 100) { status = 'over'; overCount++; }
    else if (pct >= _warnPct) { status = 'warn'; warnCount++; }

    var barWidth = Math.min(pct, 100);

    html += '<tr class="status-' + status + '">';

    // 廃棄物区分
    html += '<td class="col-category"><span class="category-dot">&#9679;</span> ' + _esc(item.category) + '</td>';

    // 排出量 / 上限
    html += '<td class="col-amount"><span class="amount-text">' +
      _esc(String(item.amount)) + '<span class="unit"> / ' + _esc(String(item.limit)) + ' ' + _esc(item.unit) + '</span></span></td>';

    // 使用率バー
    html += '<td class="col-bar"><div class="bar-container"><div class="bar-fill" style="width:' +
      barWidth.toFixed(1) + '%"></div><div class="bar-label">' + pct.toFixed(1) + '%</div></div></td>';

    // マニフェスト番号
    html += '<td class="col-manifest">' + _esc(item.manifest) + '</td>';

    // 処理業者
    html += '<td class="col-company">' + _esc(item.company) + '</td>';

    // 備考
    var noteClass = item.note ? ' note-warn' : '';
    html += '<td class="col-note' + noteClass + '">' + _esc(item.note) + '</td>';

    html += '</tr>';
  }

  tbody.innerHTML = html;
  _updateSummary(_items.length, warnCount, overCount);
}

function _updateSummary(total, warnCount, overCount) {
  var bar = document.getElementById('summary-bar');
  if (!bar) return;
  var okCount = total - warnCount - overCount;
  bar.innerHTML =
    '<div class="summary-item">廃棄物区分：<span>' + total + '</span> 種</div>' +
    '<div class="summary-item">正常：<span class="ok">' + okCount + '</span></div>' +
    '<div class="summary-item">警戒：<span class="warn">' + warnCount + '</span></div>' +
    '<div class="summary-item">超過：<span class="over">' + overCount + '</span></div>';
}

/* ── ユーティリティ ── */
function _z(n) { return String(n).padStart(2, '0'); }
function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      siteName: '産廃管理ボード',
      dataUrl: '',
      warnPct: '80',
      refreshMin: '30',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

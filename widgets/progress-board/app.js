// ===================== 工程進捗ボード =====================
// 工程ごとの進捗率をプログレスバーで表示
// CSV形式: 工程名, 進捗率(0-100), ステータス(done/active/pending/delayed), 担当者, 備考

var _timer = null;
var SAMPLE_CSV = [
  '基礎工事,100,done,田中班,完了',
  '鉄骨建方,100,done,山田班,完了',
  '外壁工事,75,active,佐藤班,工程中',
  '電気配線,60,active,電気工事（株）,工程中',
  '内装工事,30,active,鈴木班,工程中',
  '設備配管,20,active,水道工事（有）,工程中',
  '外構工事,0,pending,田中班,未着手',
  '最終検査,0,pending,監理担当,未着手'
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

  var titleEl = document.getElementById('project-title');
  if (titleEl) titleEl.textContent = config.projectTitle || '工程進捗';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetchCSV(url);
    var mins = parseInt(config.refreshMin || '5', 10);
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
    if (xhr.status !== 200) { _showError('データ取得失敗 ' + xhr.status); return; }
    _render(_parseCSV(xhr.responseText));
  };
  xhr.ontimeout = function() { _showError('タイムアウト'); };
  xhr.onerror   = function() { _showError('通信エラー'); };
  xhr.send();
}

function _parseCSV(text) {
  var rows = [];
  var lines = text.trim().split('\n');
  lines.forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 2 && cols[0]) {
      rows.push({
        name:     cols[0] || '',
        progress: Math.min(100, Math.max(0, parseInt(cols[1], 10) || 0)),
        status:   (cols[2] || 'pending').toLowerCase(),
        person:   cols[3] || '',
        note:     cols[4] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  var listEl = document.getElementById('progress-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!rows.length) {
    listEl.innerHTML = '<div class="empty">データがありません</div>';
    return;
  }

  // 全体進捗を計算
  var total = 0;
  rows.forEach(function(r) { total += r.progress; });
  var overall = Math.round(total / rows.length);

  var overallEl = document.getElementById('overall-pct');
  if (overallEl) overallEl.textContent = overall + '%';

  var overallBarEl = document.getElementById('overall-bar-fill');
  if (overallBarEl) overallBarEl.style.width = overall + '%';

  // 各工程
  rows.forEach(function(row) {
    var item = document.createElement('div');
    item.className = 'progress-item status-' + _sanitizeClass(row.status);

    var pct = row.progress;
    var barColor = _barColor(row.status, pct);

    item.innerHTML =
      '<div class="item-header">' +
        '<span class="item-name">' + _esc(row.name) + '</span>' +
        '<span class="item-meta">' +
          (row.person ? '<span class="item-person">' + _esc(row.person) + '</span>' : '') +
          '<span class="item-pct">' + pct + '%</span>' +
          '<span class="item-badge badge-' + _sanitizeClass(row.status) + '">' + _statusLabel(row.status) + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="item-bar-wrap">' +
        '<div class="item-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
      '</div>' +
      (row.note ? '<div class="item-note">' + _esc(row.note) + '</div>' : '');

    listEl.appendChild(item);
  });
}

function _barColor(status, pct) {
  if (status === 'delayed') return '#ef5350';
  if (status === 'done')    return '#66bb6a';
  if (pct >= 75)            return '#42a5f5';
  if (pct >= 40)            return '#ffca28';
  return 'rgba(255,255,255,0.5)';
}

function _statusLabel(status) {
  var map = { done:'完了', active:'工程中', pending:'未着手', delayed:'遅延' };
  return map[status] || status;
}

function _sanitizeClass(s) {
  return s.replace(/[^a-z0-9-]/g, '');
}

function _showError(msg) {
  var listEl = document.getElementById('progress-list');
  if (listEl) listEl.innerHTML = '<div class="empty">エラー: ' + _esc(msg) + '</div>';
}

function _startClock() {
  _updateClock();
  setInterval(_updateClock, 30000);
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getMonth()+1) + '/' + _z(now.getDate()) + ' ' + _z(now.getHours()) + ':' + _z(now.getMinutes());
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
      projectTitle: '○○ビル新築工事',
      dataUrl:      '',
      refreshMin:   '5',
      fontFamily:   'keifont, sans-serif'
    });
  };
}

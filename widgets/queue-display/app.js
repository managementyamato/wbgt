var _lastConfig = null;
var _fetchTimer = null;
var _clockTimer = null;
var _prevCurrent = null;

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
  if (titleEl) titleEl.textContent = config.title || '順番待ちディスプレイ';

  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  var interval = parseInt(config.refreshSec || '10', 10) * 1000;

  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, interval);
  } else {
    _renderData(_sampleData(config));
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
   CSV形式 (1行のみ): 現在番号, 待ち人数, 対応済み件数, 目安待ち時間(分), 窓口名, 次の番号1, 次の番号2...
*/
function _fetchData(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var data = _parseCSV(xhr.responseText);
      if (data) _renderData(data);
    }
  };
  xhr.onerror = function() { /* サンプルは _start 時のみ */ };
  xhr.send();
}

function _parseCSV(text) {
  var lines = text.trim().split('\n');
  /* ヘッダー行をスキップしてデータ行を取得 */
  var dataLine = lines.length >= 2 ? lines[1] : lines[0];
  var cols = dataLine.trim().split(',');
  if (cols.length < 4) return null;
  return {
    current:  parseInt(cols[0].trim(), 10) || 0,
    waiting:  parseInt(cols[1].trim(), 10) || 0,
    done:     parseInt(cols[2].trim(), 10) || 0,
    waitMins: parseInt(cols[3].trim(), 10) || 0,
    window:   (cols[4] || '').trim(),
    nexts:    cols.slice(5).map(function(c) { return parseInt(c.trim(), 10); }).filter(function(n) { return n > 0; })
  };
}

function _sampleData(config) {
  return {
    current:  47,
    waiting:  3,
    done:     44,
    waitMins: 15,
    window:   config.windowLabel || '',
    nexts:    [48, 49, 50]
  };
}

/* ── 描画 ── */
function _renderData(data) {
  var counterEl = document.getElementById('now-counter');
  var windowEl  = document.getElementById('now-window');
  var waitCount = document.getElementById('wait-count');
  var waitTime  = document.getElementById('wait-time');
  var doneCount = document.getElementById('done-count');
  var nextNums  = document.getElementById('next-numbers');

  if (!counterEl) return;

  /* 番号が変わったときにアニメーション */
  if (_prevCurrent !== null && _prevCurrent !== data.current) {
    counterEl.classList.add('countdown');
    setTimeout(function() { counterEl.classList.remove('countdown'); }, 2000);
  }
  _prevCurrent = data.current;

  counterEl.textContent = data.current > 0 ? String(data.current) : '---';

  if (windowEl) {
    windowEl.textContent = data.window ? '【' + data.window + '】へお越しください' : '';
  }

  if (waitCount) {
    waitCount.textContent = data.waiting;
    waitCount.className = 'wait-value' + (data.waiting >= 10 ? ' warn' : ' ok');
  }
  if (waitTime) {
    waitTime.textContent = data.waitMins;
    waitTime.className = 'wait-value' + (data.waitMins >= 30 ? ' warn' : ' ok');
  }
  if (doneCount) doneCount.textContent = data.done;

  if (nextNums) {
    if (data.nexts && data.nexts.length > 0) {
      nextNums.innerHTML = data.nexts.map(function(n) {
        return '<span class="next-num">' + n + '番</span>';
      }).join('');
    } else {
      nextNums.innerHTML = '';
    }
  }
}

/* ── スタイル ── */
function _applyStyles(config) {
  var bg   = config.bgColor    || '#0a1628';
  var font = config.fontFamily || 'keifont, sans-serif';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
  document.body.style.fontFamily = font;
}

function _z(n) { return String(n).padStart(2, '0'); }

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
      title: '順番待ちディスプレイ',
      dataUrl: '',
      refreshSec: '10',
      windowLabel: '1番窓口',
      fontFamily: 'keifont, sans-serif',
      bgColor: '#0a1628'
    });
  };
}

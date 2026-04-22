// ===================== 朝礼・ミーティング次第 =====================
// 今日の朝礼・会議のアジェンダを大きく表示
// CSV形式: 順番, 項目名, 担当者, 時間(分), 備考

var _timer = null;
var SAMPLE_CSV = [
  '1,安全唱和,全員,2,今月の安全目標',
  '2,昨日の作業報告,田中班長,5,進捗・問題点',
  '3,本日の作業指示,現場監督,10,工程・注意事項',
  '4,KY活動,全員,10,本日の危険予知',
  '5,連絡事項,事務,3,業者来訪・検査日程',
  '6,健康状態確認,安全係,2,体調不良者確認',
  '7,解散・作業開始,全員,1,'
].join('\n');

var _currentIdx = 0;
var _items = [];
var _autoTimer = null;

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
  var titleEl = document.getElementById('meeting-title');
  if (titleEl) titleEl.textContent = config.meetingTitle || '朝礼次第';

  if (_timer) clearInterval(_timer);
  if (_autoTimer) clearInterval(_autoTimer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, 5 * 60 * 1000);
  } else {
    _items = _parse(SAMPLE_CSV);
    _currentIdx = 0;
    _render();
  }

  // 自動スクロール（設定された秒数ごとに次の項目をハイライト）
  var autoSec = parseInt(config.autoSec || '0', 10);
  if (autoSec > 0) {
    _autoTimer = setInterval(function() {
      _currentIdx = (_currentIdx + 1) % _items.length;
      _highlight();
    }, autoSec * 1000);
  }

  _updateDate();
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status === 200) {
      _items = _parse(xhr.responseText);
      _currentIdx = 0;
      _render();
    }
  };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 2 && cols[1]) {
      rows.push({ num: cols[0] || (rows.length + 1), item: cols[1], person: cols[2] || '', mins: parseInt(cols[3], 10) || 0, note: cols[4] || '' });
    }
  });
  return rows;
}

function _render() {
  var totalMins = 0;
  _items.forEach(function(r) { totalMins += r.mins; });
  _set('total-mins', totalMins ? '合計 ' + totalMins + '分' : '');

  var listEl = document.getElementById('agenda-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  _items.forEach(function(item, idx) {
    var row = document.createElement('div');
    row.className = 'agenda-item' + (idx === _currentIdx ? ' current' : '');
    row.id = 'agenda-' + idx;
    row.innerHTML =
      '<div class="ag-num">' + _esc(String(item.num)) + '</div>' +
      '<div class="ag-item">' + _esc(item.item) + (item.note ? '<span class="ag-note">' + _esc(item.note) + '</span>' : '') + '</div>' +
      '<div class="ag-meta">' +
        (item.person ? '<span class="ag-person">' + _esc(item.person) + '</span>' : '') +
        (item.mins   ? '<span class="ag-mins">' + item.mins + '分</span>' : '') +
      '</div>';
    listEl.appendChild(row);
  });
}

function _highlight() {
  document.querySelectorAll('.agenda-item').forEach(function(el, idx) {
    el.classList.toggle('current', idx === _currentIdx);
  });
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

function _updateDate() {
  var el = document.getElementById('today-date');
  if (!el) return;
  var now = new Date();
  var days = ['日','月','火','水','木','金','土'];
  el.textContent = (now.getMonth()+1) + '月' + now.getDate() + '日（' + days[now.getDay()] + '）';
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
    init_widget({ meetingTitle: '朝礼次第', dataUrl: '', autoSec: '0', fontFamily: 'keifont, sans-serif' });
  };
}

// ===================== 社員誕生日・記念日ボード =====================
// 今月・今日の誕生日・入社記念日をお祝いメッセージで表示
// CSV形式: 名前, 種別(birthday/anniversary), 月(1-12), 日(1-31), 入社年 or 生年(任意), 一言メッセージ

var _timer = null;
var SAMPLE_CSV = [
  '田中 太郎,birthday,4,9,1985,',
  '鈴木 花子,anniversary,4,12,2020,入社5年目！',
  '佐藤 次郎,birthday,4,15,1990,',
  '山田 三郎,anniversary,4,20,2018,7年目突入！',
  '中村 美香,birthday,4,22,1995,',
  '加藤 健一,birthday,5,3,1988,',
  '松本 愛,anniversary,5,10,2015,',
  '井上 勇,birthday,5,18,1992,'
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
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  var titleEl = document.getElementById('company-name');
  if (titleEl) titleEl.textContent = config.companyName || '今月の誕生日・記念日';

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, 60 * 60 * 1000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true);
  xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status === 200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 4 && cols[0]) {
      rows.push({
        name:  cols[0],
        type:  (cols[1] || 'birthday').toLowerCase(),
        month: parseInt(cols[2], 10),
        day:   parseInt(cols[3], 10),
        year:  parseInt(cols[4], 10) || 0,
        msg:   cols[5] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  var now = new Date();
  var thisMonth = now.getMonth() + 1;
  var today     = now.getDate();
  var thisYear  = now.getFullYear();

  // 今日
  var todayItems = rows.filter(function(r) { return r.month === thisMonth && r.day === today; });
  // 今月（今日以外）
  var monthItems = rows.filter(function(r) { return r.month === thisMonth && r.day !== today; })
    .sort(function(a, b) { return a.day - b.day; });

  // 今日のお祝い
  var todayEl = document.getElementById('today-section');
  var todayListEl = document.getElementById('today-list');
  if (todayEl && todayListEl) {
    if (todayItems.length > 0) {
      todayEl.style.display = '';
      todayListEl.innerHTML = '';
      todayItems.forEach(function(item) {
        var div = document.createElement('div');
        div.className = 'today-item';
        var years = item.year ? (thisYear - item.year) : 0;
        var icon = item.type === 'birthday' ? '🎂' : '🎉';
        var label = item.type === 'birthday' ? (years ? years + '歳おめでとう！' : 'お誕生日おめでとう！') : (years ? '入社' + years + '周年！' : '記念日おめでとう！');
        div.innerHTML =
          '<span class="today-icon">' + icon + '</span>' +
          '<div class="today-info">' +
            '<span class="today-name">' + _esc(item.name) + '</span>' +
            '<span class="today-label">' + label + '</span>' +
            (item.msg ? '<span class="today-msg">' + _esc(item.msg) + '</span>' : '') +
          '</div>';
        todayListEl.appendChild(div);
      });
    } else {
      todayEl.style.display = 'none';
    }
  }

  // 今月リスト
  var monthEl = document.getElementById('month-list');
  var monthHeaderEl = document.getElementById('month-header');
  if (monthHeaderEl) monthHeaderEl.textContent = thisMonth + '月のお祝い';
  if (monthEl) {
    monthEl.innerHTML = '';
    monthItems.forEach(function(item) {
      var years = item.year ? (thisYear - item.year) : 0;
      var icon = item.type === 'birthday' ? '🎂' : '🎉';
      var div = document.createElement('div');
      div.className = 'month-item';
      div.innerHTML =
        '<span class="month-date">' + item.month + '/' + item.day + '</span>' +
        '<span class="month-icon">' + icon + '</span>' +
        '<span class="month-name">' + _esc(item.name) + '</span>' +
        '<span class="month-type">' + (item.type === 'birthday' ? (years ? years + '歳' : '誕生日') : (years ? '入社' + years + '年' : '記念日')) + '</span>' +
        (item.msg ? '<span class="month-msg">' + _esc(item.msg) + '</span>' : '');
      monthEl.appendChild(div);
    });
    if (monthItems.length === 0) {
      monthEl.innerHTML = '<div class="no-items">今月はほかにお祝いがありません</div>';
    }
  }
}

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
    init_widget({ companyName: '今月の誕生日・記念日', dataUrl: '', fontFamily: 'keifont, sans-serif' });
  };
}

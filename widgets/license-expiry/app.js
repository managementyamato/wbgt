// ===================== 研修・資格期限ボード =====================
// スタッフの資格・免許・定期健診の有効期限を一覧表示
// CSV形式: 氏名, 資格名, 有効期限(YYYY-MM-DD), 所属, 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中 太郎,玉掛け技能講習,2026-03-31,田中班,',
  '鈴木 一郎,移動式クレーン運転士,2025-06-30,鈴木建設,',
  '佐藤 次郎,足場の組立等作業主任者,2025-05-15,鈴木建設,',
  '山田 三郎,高所作業車運転技能,2026-12-31,山田電気,',
  '中村 四郎,フォークリフト運転技能,2025-04-20,中村塗装,',
  '加藤 五郎,特定化学物質及び四アルキル作業主任者,2027-01-15,田中班,',
  '松本 六郎,定期健康診断,2025-09-30,松本設備,次回要受診',
  '井上 七郎,石綿作業主任者,2026-08-01,井上土木,'
].join('\n');

var WARNING_DAYS = 90; // この日数以内は黄色警告
var DANGER_DAYS  = 30; // この日数以内は赤警告

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
  var titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.textContent = config.boardTitle || '資格・免許 期限管理';

  WARNING_DAYS = parseInt(config.warnDays || '90', 10);
  DANGER_DAYS  = parseInt(config.dangerDays || '30', 10);

  if (_timer) clearInterval(_timer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, 60 * 60 * 1000); // 1時間ごと
  } else {
    _render(_parse(SAMPLE_CSV));
  }

  _updateDate();
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
  var today = new Date(); today.setHours(0,0,0,0);
  text.trim().split('\n').forEach(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length >= 3 && cols[0] && cols[2]) {
      var expDate = new Date(cols[2]);
      var daysLeft = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      rows.push({
        name:     cols[0],
        license:  cols[1] || '',
        expDate:  cols[2],
        company:  cols[3] || '',
        note:     cols[4] || '',
        daysLeft: daysLeft
      });
    }
  });
  // 期限が近い順にソート
  rows.sort(function(a, b) { return a.daysLeft - b.daysLeft; });
  return rows;
}

function _render(rows) {
  var expired = rows.filter(function(r) { return r.daysLeft < 0; }).length;
  var danger  = rows.filter(function(r) { return r.daysLeft >= 0 && r.daysLeft < DANGER_DAYS; }).length;
  var warn    = rows.filter(function(r) { return r.daysLeft >= DANGER_DAYS && r.daysLeft < WARNING_DAYS; }).length;

  _set('count-expired', expired);
  _set('count-danger',  danger);
  _set('count-warn',    warn);

  // アラートバナー
  var bannerEl = document.getElementById('alert-banner');
  if (bannerEl) {
    if (expired > 0) {
      bannerEl.textContent = '⚠️ 期限切れ ' + expired + '件あり！早急に更新してください';
      bannerEl.className = 'banner banner-expired';
      bannerEl.style.display = '';
    } else if (danger > 0) {
      bannerEl.textContent = '⚠️ 期限まで' + DANGER_DAYS + '日以内が ' + danger + '件あります';
      bannerEl.className = 'banner banner-danger';
      bannerEl.style.display = '';
    } else {
      bannerEl.style.display = 'none';
    }
  }

  var listEl = document.getElementById('license-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var levelClass = row.daysLeft < 0 ? 'level-expired' : row.daysLeft < DANGER_DAYS ? 'level-danger' : row.daysLeft < WARNING_DAYS ? 'level-warn' : 'level-ok';
    var daysStr = row.daysLeft < 0 ? '期限切れ（' + Math.abs(row.daysLeft) + '日超過）' : row.daysLeft === 0 ? '本日期限！' : '残り ' + row.daysLeft + ' 日';

    var item = document.createElement('div');
    item.className = 'license-item ' + levelClass;
    item.innerHTML =
      '<div class="li-info">' +
        '<span class="li-name">' + _esc(row.name) + '</span>' +
        '<span class="li-company">' + _esc(row.company) + '</span>' +
        '<span class="li-license">' + _esc(row.license) + '</span>' +
      '</div>' +
      '<div class="li-expiry">' +
        '<span class="li-date">' + _esc(row.expDate) + '</span>' +
        '<span class="li-days">' + daysStr + '</span>' +
      '</div>';
    listEl.appendChild(item);
  });
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

function _updateDate() {
  var el = document.getElementById('today');
  if (!el) return;
  var now = new Date();
  el.textContent = now.getFullYear() + '/' + _z(now.getMonth()+1) + '/' + _z(now.getDate()) + ' 現在';
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
    init_widget({ boardTitle: '資格・免許 期限管理', dataUrl: '', warnDays: '90', dangerDays: '30', fontFamily: 'keifont, sans-serif' });
  };
}

// ===================== 重機・車両稼働ボード =====================
// 現場の重機・車両の稼働状況をリアルタイム表示
// CSV形式: 機械名, ステータス(active/standby/maintenance/out), オペレーター, 作業内容, 備考

var _timer = null;
var SAMPLE_CSV = [
  '25tクレーン,active,田中 一郎,南側揚重,',
  '油圧ショベル(0.4),active,鈴木 次郎,根切り作業,',
  '油圧ショベル(0.2),standby,佐藤 三郎,,整備待ち',
  'ラフタークレーン,out,,,外部現場へ出場',
  'ブルドーザー,active,山田 四郎,盛土整形,',
  'ダンプ1,active,中村 五郎,土砂搬出,',
  'ダンプ2,active,加藤 六郎,土砂搬出,',
  'ダンプ3,standby,,,積み込み待ち',
  '高所作業車,maintenance,,,月次点検中',
  'フォークリフト,active,松本 七郎,資材移動,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('site-name', config.siteName || '重機・車両稼働状況');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin || '3', 10) * 60000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
  _updateClock(); setInterval(_updateClock, 30000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?_=' + Date.now(), true); xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status === 200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
    if (c[0]) rows.push({ name: c[0], status: (c[1]||'standby').toLowerCase(), op: c[2]||'', work: c[3]||'', note: c[4]||'' });
  });
  return rows;
}

function _render(rows) {
  var cnt = { active:0, standby:0, maintenance:0, out:0 };
  rows.forEach(function(r) { if (cnt[r.status] !== undefined) cnt[r.status]++; });
  _set('cnt-active',      cnt.active);
  _set('cnt-standby',     cnt.standby);
  _set('cnt-maintenance', cnt.maintenance);
  _set('cnt-total',       rows.length);

  var order = { active:0, standby:1, maintenance:2, out:3 };
  rows.sort(function(a,b) { return (order[a.status]||0)-(order[b.status]||0); });

  var listEl = document.getElementById('equip-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  rows.forEach(function(row) {
    var icons  = { active:'🟢', standby:'🟡', maintenance:'🔧', out:'⬜' };
    var labels = { active:'稼働中', standby:'待機', maintenance:'点検中', out:'出場中' };
    var div = document.createElement('div');
    div.className = 'equip-item status-' + row.status;
    div.innerHTML =
      '<span class="eq-icon">' + (icons[row.status]||'⚪') + '</span>' +
      '<div class="eq-info">' +
        '<span class="eq-name">' + _esc(row.name) + '</span>' +
        (row.work ? '<span class="eq-work">' + _esc(row.work) + '</span>' : '') +
      '</div>' +
      '<div class="eq-right">' +
        (row.op ? '<span class="eq-op">' + _esc(row.op) + '</span>' : '') +
        '<span class="eq-badge badge-' + row.status + '">' + (labels[row.status]||row.status) + '</span>' +
      '</div>';
    listEl.appendChild(div);
  });
}

function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function _updateClock() { var el = document.getElementById('clock'); if (!el) return; var n = new Date(); el.textContent = _z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n) { return String(n).padStart(2,'0'); }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message', function(e) { var m=e.data; if(!m||!m.functions)return; m.functions.forEach(function(fn){ if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data); }); });
if (window.location.protocol === 'file:') { window.onload = function() { init_widget({ siteName:'重機・車両稼働状況', dataUrl:'', refreshMin:'3', fontFamily:'keifont, sans-serif' }); }; }

// ===================== 納期カウントダウン（複数件）=====================
// 複数の案件・工程の納期までの残り日数を一覧表示
// CSV形式: 案件名, 納期(YYYY-MM-DD), 担当者, ステータス(active/done/hold), 備考

var _timer = null;
var SAMPLE_CSV = [
  'A棟新築工事,2025-03-31,田中,active,',
  'B棟外壁改修,2025-02-14,鈴木,active,天候遅延あり',
  '駐車場整備,2025-04-30,佐藤,active,',
  '受変電設備,2025-02-28,山田,active,機器納入待ち',
  'C棟内装工事,2025-05-31,中村,active,',
  '外構工事,2025-01-31,加藤,done,完成',
  '仮設撤去,2025-06-30,山口,hold,未着手'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('board-title', config.boardTitle || '納期カウントダウン');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'60',10)*60000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
  _updateClock(); setInterval(_updateClock, 30000);
  // Re-render every minute to keep countdowns accurate
  setInterval(function() {
    if (url) return; // データURL使用時はfetchに任せる
  }, 60000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+'?_='+Date.now(), true); xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status===200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({
      name:    c[0],
      date:    c[1]||'',
      person:  c[2]||'',
      status:  (c[3]||'active').toLowerCase(),
      note:    c[4]||''
    });
  });
  return rows;
}

function _daysUntil(dateStr) {
  if (!dateStr) return null;
  var parts = dateStr.split('-');
  if (parts.length < 3) return null;
  var target = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  var today  = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function _render(rows) {
  if (!rows.length) return;

  // Sort: active first by days ASC, done/hold last
  rows.sort(function(a,b) {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    if (a.status === 'hold' && b.status !== 'hold') return 1;
    if (b.status === 'hold' && a.status !== 'hold') return -1;
    var da = _daysUntil(a.date), db = _daysUntil(b.date);
    return (da===null?9999:da) - (db===null?9999:db);
  });

  var activeRows = rows.filter(function(r){ return r.status === 'active'; });
  var urgentCount = activeRows.filter(function(r){ return (_daysUntil(r.date)||0) <= 7; }).length;
  var overdueCount = activeRows.filter(function(r){ return (_daysUntil(r.date)||1) < 0; }).length;

  _set('total-count',   rows.length + '件');
  _set('urgent-count',  urgentCount + '件');
  _set('overdue-count', overdueCount + '件');

  var urgEl = document.getElementById('urgent-count');
  if (urgEl) urgEl.className = 'sum-val ' + (urgentCount > 0 ? 'warn' : 'ok');
  var ovEl = document.getElementById('overdue-count');
  if (ovEl) ovEl.className = 'sum-val ' + (overdueCount > 0 ? 'over' : 'ok');

  var listEl = document.getElementById('project-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var days = _daysUntil(row.date);
    var isDone = row.status === 'done';
    var isHold = row.status === 'hold';
    var rClass = isDone ? 'done' : isHold ? 'hold' : days === null ? '' : days < 0 ? 'overdue' : days <= 7 ? 'urgent' : days <= 30 ? 'warn' : 'ok';
    var daysText = isDone ? '完了' : isHold ? '保留' : days === null ? '-' : days < 0 ? '超過 '+(Math.abs(days))+'日' : days === 0 ? '本日！' : days + '日';
    var div = document.createElement('div');
    div.className = 'proj-row row-' + rClass;
    div.innerHTML =
      '<div class="p-name">'+_esc(row.name)+'</div>'+
      '<div class="p-date">'+_esc(row.date)+'</div>'+
      '<div class="p-person">'+_esc(row.person)+'</div>'+
      '<div class="p-days '+rClass+'">'+daysText+'</div>'+
      '<div class="p-note">'+_esc(row.note)+'</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({boardTitle:'納期カウントダウン',dataUrl:'',refreshMin:'60',fontFamily:'keifont, sans-serif'});};}

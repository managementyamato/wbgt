// ===================== 仕込み状況ボード =====================
// キッチンの仕込み品目の完了/作業中/未着手を表示
// CSV形式: 品目名, ステータス(done/working/pending/low), 担当者, 数量, 備考

var _timer = null;
var SAMPLE_CSV = [
  'だし（昆布・鰹）,done,田中,10L,',
  '煮込みハンバーグ,done,鈴木,20個,',
  '本日のスープ,working,田中,,仕上げ中',
  'サラダドレッシング,working,佐藤,,混合中',
  '揚げ物衣,pending,,,13:00以降',
  'デザート（プリン）,pending,山田,30個,',
  'ライス（炊飯）,low,,,残り少ない',
  'パスタソース,done,鈴木,5L,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('shop-name', config.shopName || '仕込み状況');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'5',10)*60000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
  _updateClock(); setInterval(_updateClock, 30000);
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
    var c = line.split(',').map(function(s) { return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({ name:c[0], status:(c[1]||'pending').toLowerCase(), person:c[2]||'', qty:c[3]||'', note:c[4]||'' });
  });
  return rows;
}

function _render(rows) {
  var cnt = {done:0,working:0,pending:0,low:0};
  rows.forEach(function(r){ if(cnt[r.status]!==undefined)cnt[r.status]++; });
  _set('cnt-done',    cnt.done);
  _set('cnt-working', cnt.working);
  _set('cnt-pending', cnt.pending + cnt.low);
  _set('cnt-total',   rows.length);

  var order = {working:0,low:1,pending:2,done:3};
  rows.sort(function(a,b){ return (order[a.status]||0)-(order[b.status]||0); });

  var listEl = document.getElementById('prep-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  rows.forEach(function(row) {
    var icons  = {done:'✅',working:'🔥',pending:'⏳',low:'⚠️'};
    var labels = {done:'完了',working:'仕込み中',pending:'未着手',low:'残り少'};
    var div = document.createElement('div');
    div.className = 'prep-item status-'+row.status;
    div.innerHTML =
      '<span class="prep-icon">'+( icons[row.status]||'⚪')+'</span>'+
      '<div class="prep-info">'+
        '<span class="prep-name">'+_esc(row.name)+'</span>'+
        (row.note?'<span class="prep-note">'+_esc(row.note)+'</span>':'')+
      '</div>'+
      '<div class="prep-right">'+
        (row.qty?'<span class="prep-qty">'+_esc(row.qty)+'</span>':'')+
        (row.person?'<span class="prep-person">'+_esc(row.person)+'</span>':'')+
        '<span class="prep-badge badge-'+row.status+'">'+( labels[row.status]||row.status)+'</span>'+
      '</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({shopName:'仕込み状況',dataUrl:'',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

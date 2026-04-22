// ===================== 高所作業者管理ボード =====================
// 高所作業中の作業員・場所・安全確認状況を一覧表示
// CSV形式: 氏名, 所属, 作業場所, 作業高さ(m), 開始時刻(HH:MM), 終了予定(HH:MM), 安全帯確認(ok/ng), 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中一郎,大工班,4F外壁,12.5,08:00,12:00,ok,',
  '鈴木二郎,鉄骨班,屋根,15.0,08:30,11:00,ok,安全帯ダブルランヤード',
  '佐藤三郎,塗装班,3F外壁,9.0,09:00,17:00,ok,',
  '山田四郎,足場班,足場組立,8.5,07:30,16:00,ok,',
  '中村五郎,電気班,5F天井,14.0,10:00,15:00,ng,確認待ち',
  '加藤六郎,配管班,屋上PH,18.0,08:00,12:30,ok,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('site-name', config.siteName || '高所作業者管理');
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
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({
      name:   c[0], company: c[1]||'', place: c[2]||'',
      height: parseFloat(c[3])||0, start: c[4]||'', end: c[5]||'',
      safety: (c[6]||'').toLowerCase(), note: c[7]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var total  = rows.length;
  var ngCount = rows.filter(function(r){ return r.safety === 'ng'; }).length;
  var highCount = rows.filter(function(r){ return r.height >= 10; }).length;

  _set('total-count',  total  + '名');
  _set('ng-count',     ngCount + '名');
  _set('high-count',   highCount + '名');

  var ngEl = document.getElementById('ng-count');
  if (ngEl) ngEl.className = 'stat-val ' + (ngCount > 0 ? 'stat-ng' : 'stat-ok');

  var listEl = document.getElementById('worker-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var safetyOk = row.safety === 'ok';
    var heightClass = row.height >= 15 ? 'h-high' : row.height >= 10 ? 'h-mid' : 'h-low';
    var div = document.createElement('div');
    div.className = 'worker-row' + (safetyOk ? '' : ' row-ng');
    div.innerHTML =
      '<div class="w-name">'+_esc(row.name)+'<span class="w-co">'+_esc(row.company)+'</span></div>'+
      '<div class="w-place">'+_esc(row.place)+'</div>'+
      '<div class="w-height '+heightClass+'">'+row.height.toFixed(1)+'<span class="w-m">m</span></div>'+
      '<div class="w-time">'+_esc(row.start)+' - '+_esc(row.end)+'</div>'+
      '<div class="w-safety '+(safetyOk?'safety-ok':'safety-ng')+'">'+(safetyOk?'確認済':'要確認')+'</div>'+
      '<div class="w-note">'+_esc(row.note)+'</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({siteName:'高所作業者管理',dataUrl:'',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

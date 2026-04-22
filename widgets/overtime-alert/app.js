// ===================== 残業・超勤アラートボード =====================
// 部署別の今月残業時間・上限との比較・アラート表示
// CSV形式: 氏名 or 部署名, 今月残業(時間), 月間上限(時間), 先月比(時間差), 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中一郎,42,45,+5,要注意',
  '鈴木二郎,38,45,-3,',
  '佐藤三郎,51,45,+8,上限超過',
  '山田四郎,25,45,-10,',
  '中村五郎,44,45,+2,',
  '加藤六郎,30,45,-5,',
  '山口七郎,47,45,+12,上限超過'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('dept-name', config.deptName || '残業アラートボード');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'60',10)*60000);
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
      name:  c[0],
      hours: parseFloat(c[1])||0,
      limit: parseFloat(c[2])||45,
      diff:  c[3]||'',
      note:  c[4]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var overCount = rows.filter(function(r){ return r.hours >= r.limit; }).length;
  var warnCount = rows.filter(function(r){ return r.hours >= r.limit * 0.9 && r.hours < r.limit; }).length;
  var totalHours = rows.reduce(function(s,r){ return s + r.hours; }, 0);

  _set('over-count', overCount + '名');
  _set('warn-count', warnCount + '名');
  _set('total-hours', totalHours.toFixed(0) + 'h');

  var overEl = document.getElementById('over-count');
  if (overEl) overEl.className = 'sum-val ' + (overCount > 0 ? 'over' : 'ok');

  // Sort: over first, then warn, then ok
  rows.sort(function(a,b){
    var aS = a.hours >= a.limit ? 2 : a.hours >= a.limit*0.9 ? 1 : 0;
    var bS = b.hours >= b.limit ? 2 : b.hours >= b.limit*0.9 ? 1 : 0;
    return bS - aS || b.hours - a.hours;
  });

  var listEl = document.getElementById('person-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var pct = Math.min(row.hours / (row.limit * 1.2) * 100, 100);
    var limitPct = row.limit / (row.limit * 1.2) * 100;
    var rClass = row.hours >= row.limit ? 'over' : row.hours >= row.limit * 0.9 ? 'warn' : 'ok';
    var diffNum = parseFloat(row.diff);
    var div = document.createElement('div');
    div.className = 'person-row row-' + rClass;
    div.innerHTML =
      '<div class="p-name">'+_esc(row.name)+'</div>'+
      '<div class="p-hours '+rClass+'">'+row.hours.toFixed(0)+'<span class="p-h">h</span></div>'+
      '<div class="p-diff '+(isNaN(diffNum)?'':(diffNum>0?'diff-up':'diff-dn'))+'">'+_esc(row.diff)+'h</div>'+
      '<div class="p-bar-wrap">'+
        '<div class="p-bar bar-'+rClass+'" style="width:'+pct+'%"></div>'+
        '<div class="p-limit-line" style="left:'+limitPct+'%"></div>'+
      '</div>'+
      '<div class="p-limit">上限'+row.limit+'h</div>'+
      '<div class="p-note">'+_esc(row.note)+'</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({deptName:'残業アラートボード',dataUrl:'',refreshMin:'60',fontFamily:'keifont, sans-serif'});};}

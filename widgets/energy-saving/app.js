// ===================== 省エネ・電力モニター =====================
// 電力使用量・目標値・削減率を表示
// CSV形式: 指標名, 現在値, 目標値, 単位, 前日比(%), 備考

var _timer = null;
var SAMPLE_CSV = [
  '電力使用量,2840,3500,kWh,−12.3,デマンド制御中',
  '本日使用量,187,220,kWh,−8.7,',
  'CO₂排出量,1.42,1.75,t-CO₂,−11.2,',
  'ガス使用量,320,380,m³,−5.8,',
  '水使用量,8.4,10.0,m³,+2.1,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('facility-name', config.facilityName || '省エネモニター');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'10',10)*60000);
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
    if (c[0]) {
      rows.push({
        name:  c[0],
        cur:   parseFloat(c[1]) || 0,
        target:parseFloat(c[2]) || 0,
        unit:  c[3] || '',
        diff:  c[4] || '',
        note:  c[5] || ''
      });
    }
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var mainEl = document.getElementById('main-block');
  var subEl  = document.getElementById('sub-block');
  if (!mainEl || !subEl) return;

  // 1行目: メイン大表示
  var m = rows[0];
  var pct = m.target > 0 ? Math.min(m.cur / m.target * 100, 100) : 0;
  var ach = m.target > 0 ? (1 - m.cur / m.target) * 100 : 0; // 削減率

  _set('main-name', m.name);
  _set('main-val',  m.cur.toLocaleString());
  _set('main-unit', m.unit);
  _set('main-target', '目標: ' + m.target.toLocaleString() + m.unit);
  _set('main-diff', m.diff);
  _set('main-note', m.note);
  _set('main-ach', '削減率: ' + ach.toFixed(1) + '%');

  var achClass = ach >= 20 ? 'great' : ach >= 10 ? 'good' : ach >= 0 ? 'normal' : 'over';
  var achEl = document.getElementById('main-ach');
  if (achEl) achEl.className = 'ach ach-' + achClass;

  var diffEl = document.getElementById('main-diff');
  if (diffEl) {
    var diffNum = parseFloat(m.diff);
    diffEl.className = 'diff ' + (isNaN(diffNum) ? '' : diffNum < 0 ? 'diff-good' : 'diff-bad');
  }

  var barEl = document.getElementById('main-bar');
  if (barEl) {
    barEl.style.width = pct + '%';
    barEl.style.background = pct <= 80 ? '#66bb6a' : pct <= 95 ? '#ffca28' : '#ef5350';
  }

  // 2行目以降: サブ指標
  subEl.innerHTML = '';
  rows.slice(1).forEach(function(row) {
    var rPct = row.target > 0 ? Math.min(row.cur / row.target * 100, 100) : 0;
    var rDiff = parseFloat(row.diff);
    var div = document.createElement('div');
    div.className = 'sub-card';
    div.innerHTML =
      '<div class="sub-name">'+_esc(row.name)+'</div>'+
      '<div class="sub-vals">'+
        '<span class="sub-cur">'+row.cur.toLocaleString()+'</span>'+
        '<span class="sub-unit">'+_esc(row.unit)+'</span>'+
        '<span class="sub-diff '+(isNaN(rDiff)?'':(rDiff<0?'diff-good':'diff-bad'))+'">'+_esc(row.diff)+'%</span>'+
      '</div>'+
      '<div class="sub-bar-wrap"><div class="sub-bar" style="width:'+rPct+'%;background:'+(rPct<=80?'#66bb6a':rPct<=95?'#ffca28':'#ef5350')+'"></div></div>'+
      '<div class="sub-target">目標 '+row.target.toLocaleString()+row.unit+'</div>';
    subEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({facilityName:'省エネモニター',dataUrl:'',refreshMin:'10',fontFamily:'keifont, sans-serif'});};}

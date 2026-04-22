// ===================== 不良品・歩留まりモニター =====================
// 生産ライン別の良品数・不良数・歩留まり率をリアルタイム表示
// CSV形式: ライン名, 生産数, 良品数, 不良数, 目標歩留まり(%), 備考

var _timer = null;
var SAMPLE_CSV = [
  'Aライン,1250,1238,12,99.0,',
  'Bライン,980,965,15,98.5,要因調査中',
  'Cライン,1500,1487,13,99.2,',
  'Dライン,750,720,30,96.0,設備調整中',
  '組立ライン,620,618,2,99.5,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('facility-name', config.facilityName || '歩留まりモニター');
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
      line:    c[0],
      total:   parseInt(c[1])||0,
      good:    parseInt(c[2])||0,
      defect:  parseInt(c[3])||0,
      target:  parseFloat(c[4])||99.0,
      note:    c[5]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var totalProd   = rows.reduce(function(s,r){ return s+r.total;  }, 0);
  var totalGood   = rows.reduce(function(s,r){ return s+r.good;   }, 0);
  var totalDefect = rows.reduce(function(s,r){ return s+r.defect; }, 0);
  var overallRate = totalProd > 0 ? (totalGood / totalProd * 100) : 0;

  _set('total-prod',   totalProd.toLocaleString());
  _set('total-good',   totalGood.toLocaleString());
  _set('total-defect', totalDefect.toLocaleString());
  _set('overall-rate', overallRate.toFixed(2) + '%');

  var rateEl = document.getElementById('overall-rate');
  if (rateEl) rateEl.className = 'sum-val ' + (overallRate >= 99 ? 'rate-ok' : overallRate >= 97 ? 'rate-warn' : 'rate-bad');

  var listEl = document.getElementById('line-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var rate = row.total > 0 ? (row.good / row.total * 100) : 0;
    var ok = rate >= row.target;
    var rClass = rate >= row.target ? 'rate-ok' : rate >= row.target - 2 ? 'rate-warn' : 'rate-bad';
    var div = document.createElement('div');
    div.className = 'line-row';
    div.innerHTML =
      '<div class="l-name">'+_esc(row.line)+'</div>'+
      '<div class="l-good">'+row.good.toLocaleString()+'</div>'+
      '<div class="l-defect">'+row.defect+'</div>'+
      '<div class="l-bar-wrap">'+
        '<div class="l-bar '+rClass+'" style="width:'+Math.min(rate,100)+'%"></div>'+
        '<div class="l-target-line" style="left:'+Math.min(row.target,100)+'%"></div>'+
      '</div>'+
      '<div class="l-rate '+rClass+'">'+rate.toFixed(2)+'%</div>'+
      '<div class="l-note">'+_esc(row.note)+'</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({facilityName:'歩留まりモニター',dataUrl:'',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

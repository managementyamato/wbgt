// ===================== 協力業者勤怠サマリー =====================
// 業者別の本日出勤・欠勤・出勤率をサマリー表示
// CSV形式: 業者名, 予定人数, 出勤人数, 欠勤人数, 遅刻人数, 備考

var _timer = null;
var SAMPLE_CSV = [
  '大工班（山田工務店）,8,7,1,0,',
  '鉄骨班（鈴木建設）,5,5,0,0,全員出勤',
  '電気班（田中電工）,4,3,1,1,田中氏遅刻',
  '配管班（佐藤設備）,3,3,0,0,',
  '塗装班（中村塗装）,6,4,2,0,天候待ち',
  '足場班（加藤鳶）,4,4,0,0,',
  '内装班（山口内装）,5,3,2,1,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('site-name', config.siteName || '協力業者勤怠サマリー');
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
      company: c[0],
      planned: parseInt(c[1])||0,
      present: parseInt(c[2])||0,
      absent:  parseInt(c[3])||0,
      late:    parseInt(c[4])||0,
      note:    c[5]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var totalPlanned = rows.reduce(function(s,r){ return s+r.planned; }, 0);
  var totalPresent = rows.reduce(function(s,r){ return s+r.present; }, 0);
  var totalAbsent  = rows.reduce(function(s,r){ return s+r.absent;  }, 0);
  var totalLate    = rows.reduce(function(s,r){ return s+r.late;    }, 0);
  var totalRate    = totalPlanned > 0 ? (totalPresent / totalPlanned * 100).toFixed(0) : 0;

  _set('total-planned', totalPlanned + '名');
  _set('total-present', totalPresent + '名');
  _set('total-absent',  totalAbsent  + '名');
  _set('total-rate',    totalRate + '%');

  var rateEl = document.getElementById('total-rate');
  if (rateEl) rateEl.className = 'summary-val ' + (totalRate >= 90 ? 'rate-ok' : totalRate >= 75 ? 'rate-warn' : 'rate-bad');

  var listEl = document.getElementById('company-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var rate = row.planned > 0 ? (row.present / row.planned * 100) : 0;
    var rateClass = rate >= 100 ? 'rate-ok' : rate >= 75 ? 'rate-warn' : 'rate-bad';
    var div = document.createElement('div');
    div.className = 'company-row';
    div.innerHTML =
      '<div class="c-name">'+_esc(row.company)+(row.note?'<span class="c-note">'+_esc(row.note)+'</span>':'')+'</div>'+
      '<div class="c-nums">'+
        '<span class="c-present">'+row.present+'</span>'+
        '<span class="c-sep">/</span>'+
        '<span class="c-planned">'+row.planned+'名</span>'+
        (row.absent>0?'<span class="c-absent">欠'+row.absent+'</span>':'')+
        (row.late>0?'<span class="c-late">遅'+row.late+'</span>':'')+
      '</div>'+
      '<div class="c-bar-wrap"><div class="c-bar '+rateClass+'" style="width:'+Math.min(rate,100)+'%"></div></div>'+
      '<div class="c-rate '+rateClass+'">'+rate.toFixed(0)+'%</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({siteName:'協力業者勤怠サマリー',dataUrl:'',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

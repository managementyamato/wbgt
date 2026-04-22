// ===================== 処方箋待ち状況ボード =====================
// 調剤薬局・病院の処方箋受付番号と待ち時間を表示
// CSV形式: 受付番号, お名前（任意）, 待ち時間(分), ステータス(waiting/preparing/ready/called), 備考

var _timer = null;
var _prevReady = '';
var SAMPLE_CSV = [
  '101,田中様,0,called,お呼びしました',
  '102,鈴木様,5,ready,お薬が揃いました',
  '103,佐藤様,10,preparing,調製中',
  '104,山田様,15,waiting,',
  '105,中村様,20,waiting,',
  '106,加藤様,25,waiting,',
  '107,山口様,30,waiting,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('pharmacy-name', config.pharmacyName || '処方箋お待ちの方');
  _set('ready-prefix', config.readyPrefix || 'お呼びしています');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshSec||'30',10)*1000);
  } else {
    _render(_parse(SAMPLE_CSV), config);
  }
  _updateClock(); setInterval(_updateClock, 30000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+'?_='+Date.now(), true); xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status===200) _render(_parse(xhr.responseText), {}); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({
      num:    c[0],
      name:   c[1]||'',
      wait:   parseInt(c[2])||0,
      status: (c[3]||'waiting').toLowerCase(),
      note:   c[4]||''
    });
  });
  return rows;
}

function _render(rows, config) {
  if (!rows.length) return;

  var calledRow   = rows.find(function(r){ return r.status === 'called'; });
  var readyRows   = rows.filter(function(r){ return r.status === 'ready'; });
  var waitingRows = rows.filter(function(r){ return r.status === 'waiting' || r.status === 'preparing'; });

  // Flash detection
  var readyNums = readyRows.map(function(r){ return r.num; }).join(',');
  if (readyNums !== _prevReady) {
    _prevReady = readyNums;
    document.body.style.transition = 'none';
    document.body.style.background = '#1a3a1a';
    setTimeout(function(){ document.body.style.background = '#0d1a0d'; }, 1500);
  }

  // Called display
  var calledEl = document.getElementById('called-block');
  var calledNumEl = document.getElementById('called-num');
  var calledNameEl = document.getElementById('called-name');
  if (calledRow) {
    if (calledEl)    calledEl.style.display = 'flex';
    if (calledNumEl) calledNumEl.textContent = calledRow.num;
    if (calledNameEl) calledNameEl.textContent = calledRow.name ? calledRow.name + ' ' : '';
  } else {
    if (calledEl) calledEl.style.display = 'none';
  }

  // Ready list
  var readyEl = document.getElementById('ready-list');
  if (readyEl) {
    readyEl.innerHTML = readyRows.length
      ? readyRows.map(function(r){ return '<span class="ready-num">'+_esc(r.num)+'</span>'; }).join('')
      : '<span class="ready-none">-</span>';
  }

  // Waiting count + list
  _set('waiting-count', waitingRows.length + '件');
  var waitEl = document.getElementById('wait-list');
  if (waitEl) {
    waitEl.innerHTML = '';
    waitingRows.forEach(function(row) {
      var div = document.createElement('div');
      div.className = 'wait-row row-' + row.status;
      div.innerHTML =
        '<div class="w-num">'+_esc(row.num)+'</div>'+
        '<div class="w-name">'+_esc(row.name)+'</div>'+
        '<div class="w-wait">'+(row.status==='preparing'?'調製中':row.wait>0?'約'+row.wait+'分':'まもなく')+'</div>'+
        '<div class="w-note">'+_esc(row.note)+'</div>';
      waitEl.appendChild(div);
    });
  }
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({pharmacyName:'処方箋お待ちの方',readyPrefix:'お呼びしています',dataUrl:'',refreshSec:'30',fontFamily:'keifont, sans-serif'});};}

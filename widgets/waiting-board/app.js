// ===================== ウェイティングボード =====================
// 順番待ちの組名・待ち人数・現在呼び出し中を表示
// CSV形式: 受付番号, 組名/お客様名, 人数, ステータス(waiting/calling/seated/cancelled), 受付時刻

var _timer = null;
var _prevCalling = null;
var SAMPLE_CSV = [
  '1,田中様,4名,calling,17:30',
  '2,鈴木様,2名,waiting,17:32',
  '3,佐藤様,3名,waiting,17:35',
  '4,山田様,5名,waiting,17:38',
  '5,中村様,2名,waiting,17:40',
  '6,加藤様,4名,waiting,17:43'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('shop-name', config.shopName || 'ウェイティング');
  _set('call-prefix', config.callPrefix || 'ただいまご案内中');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshSec||'30',10)*1000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
  _updateClock(); setInterval(_updateClock, 10000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+'?_='+Date.now(), true); xhr.timeout = 8000;
  xhr.onload = function() { if (xhr.status===200) _render(_parse(xhr.responseText)); };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({ num:c[0], name:c[1]||'', size:c[2]||'', status:(c[3]||'waiting').toLowerCase(), time:c[4]||'' });
  });
  return rows;
}

function _render(rows) {
  var calling = rows.filter(function(r){ return r.status==='calling'; });
  var waiting = rows.filter(function(r){ return r.status==='waiting'; });

  // 呼び出し中表示
  var callEl = document.getElementById('calling-name');
  var callNumEl = document.getElementById('calling-num');
  var callSizeEl = document.getElementById('calling-size');
  if (calling.length > 0) {
    var cur = calling[0];
    if (callEl) callEl.textContent = cur.name;
    if (callNumEl) callNumEl.textContent = 'No.' + cur.num;
    if (callSizeEl) callSizeEl.textContent = cur.size;
    // 変わった時にフラッシュ
    if (_prevCalling !== cur.num) {
      _prevCalling = cur.num;
      var callingBox = document.getElementById('calling-box');
      if (callingBox) { callingBox.classList.add('flash'); setTimeout(function(){ callingBox.classList.remove('flash'); }, 2000); }
    }
  } else {
    if (callEl) callEl.textContent = '--';
    if (callNumEl) callNumEl.textContent = '';
    if (callSizeEl) callSizeEl.textContent = '';
  }

  _set('wait-count', waiting.length);

  // 待ちリスト
  var listEl = document.getElementById('wait-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  waiting.forEach(function(row, idx) {
    var div = document.createElement('div');
    div.className = 'wait-item' + (idx === 0 ? ' next' : '');
    div.innerHTML =
      '<span class="wi-num">No.'+_esc(row.num)+'</span>'+
      '<span class="wi-name">'+_esc(row.name)+'</span>'+
      '<span class="wi-size">'+_esc(row.size)+'</span>'+
      (idx===0?'<span class="wi-next">次の案内</span>':'<span class="wi-order">'+(idx+1)+'番目</span>');
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({shopName:'ウェイティング',callPrefix:'ただいまご案内中',dataUrl:'',refreshSec:'30',fontFamily:'keifont, sans-serif'});};}

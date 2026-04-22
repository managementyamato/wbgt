// ===================== 騒音・振動モニター =====================
// 現場の騒音・振動値を表示し規制値との比較でアラート
// CSV形式: 計測時刻, 騒音(dB), 振動(dB), 計測場所, 備考

var _timer = null;
var NOISE_LIMIT   = 85;  // dB 規制値デフォルト
var VIBRATION_LIMIT = 75; // dB 規制値デフォルト
var SAMPLE_CSV = [
  '08:30,72,62,北側境界,',
  '09:00,78,65,北側境界,重機稼働開始',
  '09:30,81,68,北側境界,',
  '10:00,76,64,北側境界,',
  '10:30,74,63,北側境界,',
  '11:00,79,66,北側境界,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('site-name', config.siteName || '騒音・振動モニター');
  NOISE_LIMIT     = parseInt(config.noiseLimit || '85', 10);
  VIBRATION_LIMIT = parseInt(config.vibLimit   || '75', 10);
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
    if (c[0]) rows.push({ time:c[0], noise:parseFloat(c[1])||0, vib:parseFloat(c[2])||0, place:c[3]||'', note:c[4]||'' });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;
  var latest = rows[rows.length - 1];

  // 最新値を大きく表示
  _set('noise-val',  latest.noise.toFixed(1));
  _set('vib-val',    latest.vib.toFixed(1));
  _set('meas-place', latest.place);
  _set('meas-time',  latest.time);

  // レベル判定
  _setLevel('noise-level', latest.noise, NOISE_LIMIT, 'dB');
  _setLevel('vib-level',   latest.vib,   VIBRATION_LIMIT, 'dB');

  // 棒グラフ
  _setBar('noise-bar', latest.noise, NOISE_LIMIT);
  _setBar('vib-bar',   latest.vib,   VIBRATION_LIMIT);

  // 規制値ライン表示
  _set('noise-limit-label', '規制値: ' + NOISE_LIMIT + 'dB');
  _set('vib-limit-label',   '規制値: ' + VIBRATION_LIMIT + 'dB');

  // 履歴テーブル
  var histEl = document.getElementById('history');
  if (histEl) {
    histEl.innerHTML = '';
    rows.slice(-8).reverse().forEach(function(row) {
      var noiseOk = row.noise < NOISE_LIMIT * 0.9;
      var noiseWarn = row.noise >= NOISE_LIMIT * 0.9 && row.noise < NOISE_LIMIT;
      var div = document.createElement('div');
      div.className = 'hist-row';
      div.innerHTML =
        '<span class="h-time">'+_esc(row.time)+'</span>'+
        '<span class="h-noise '+(row.noise>=NOISE_LIMIT?'over':noiseWarn?'warn':'ok')+'">'+row.noise.toFixed(1)+'</span>'+
        '<span class="h-vib '+(row.vib>=VIBRATION_LIMIT?'over':row.vib>=VIBRATION_LIMIT*0.9?'warn':'ok')+'">'+row.vib.toFixed(1)+'</span>'+
        '<span class="h-place">'+_esc(row.place)+'</span>';
      histEl.appendChild(div);
    });
  }
}

function _setLevel(id, val, limit, unit) {
  var el = document.getElementById(id); if (!el) return;
  if (val >= limit)         { el.textContent = '規制超過！'; el.className = 'level level-over'; }
  else if (val >= limit*0.9){ el.textContent = '警戒域';     el.className = 'level level-warn'; }
  else                      { el.textContent = '基準内';     el.className = 'level level-ok';   }
}

function _setBar(id, val, limit) {
  var el = document.getElementById(id); if (!el) return;
  var pct = Math.min(val / (limit * 1.2) * 100, 100);
  el.style.width = pct + '%';
  el.style.background = val >= limit ? '#ef5350' : val >= limit * 0.9 ? '#ffca28' : '#66bb6a';
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({siteName:'騒音・振動モニター',dataUrl:'',noiseLimit:'85',vibLimit:'75',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

// ===================== 稼働日・休日カレンダー =====================
// 今月のカレンダー + 稼働日・休日・特記事項を表示
// CSV形式: 日付(YYYY-MM-DD), 種別(work/holiday/half/special), ラベル, 備考

var _timer = null;
var _today = new Date();

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('cal-title', config.calTitle || '稼働日カレンダー');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'60',10)*60000);
  } else {
    _render(_buildSampleData(), config);
  }
  _updateClock(); setInterval(_updateClock, 30000);
}

function _buildSampleData() {
  var t = new Date();
  var y = t.getFullYear(), m = t.getMonth();
  var rows = [];
  var daysInMonth = new Date(y, m+1, 0).getDate();
  for (var d = 1; d <= daysInMonth; d++) {
    var dt = new Date(y, m, d);
    var dow = dt.getDay();
    var dateStr = y + '-' + _z(m+1) + '-' + _z(d);
    var type = (dow === 0 || dow === 6) ? 'holiday' : 'work';
    rows.push({ date: dateStr, type: type, label: type==='holiday'?(dow===0?'日曜':'土曜'):'', note: '' });
  }
  // Sample specials
  var day1 = y + '-' + _z(m+1) + '-01';
  var mid  = y + '-' + _z(m+1) + '-' + _z(Math.ceil(daysInMonth/2));
  rows.forEach(function(r) {
    if (r.date === day1) { r.type = 'special'; r.label = '月初朝礼'; }
  });
  return rows;
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
    if (c[0]) rows.push({ date: c[0], type: (c[1]||'work').toLowerCase(), label: c[2]||'', note: c[3]||'' });
  });
  return rows;
}

function _render(rows, config) {
  var today = new Date(); today.setHours(0,0,0,0);
  var y = today.getFullYear(), m = today.getMonth();

  // Build lookup
  var map = {};
  rows.forEach(function(r) { map[r.date] = r; });

  _set('month-label', y + '年' + (m+1) + '月');

  var workCount    = 0;
  var holidayCount = 0;
  var daysInMonth  = new Date(y, m+1, 0).getDate();
  for (var d=1; d<=daysInMonth; d++) {
    var dt = new Date(y, m, d);
    var dateStr = y+'-'+_z(m+1)+'-'+_z(d);
    var row = map[dateStr] || { type: dt.getDay()===0||dt.getDay()===6?'holiday':'work', label:'', note:'' };
    if (row.type === 'work' || row.type === 'half' || row.type === 'special') workCount++;
    else holidayCount++;
  }
  _set('work-days', workCount + '日');
  _set('holiday-days', holidayCount + '日');

  // Calendar grid
  var calEl = document.getElementById('cal-grid');
  if (!calEl) return;
  calEl.innerHTML = '';

  // Day headers
  var dayNames = ['日','月','火','水','木','金','土'];
  dayNames.forEach(function(d, i) {
    var cell = document.createElement('div');
    cell.className = 'cal-hdr' + (i===0?' sun':i===6?' sat':'');
    cell.textContent = d;
    calEl.appendChild(cell);
  });

  // First day padding
  var firstDow = new Date(y, m, 1).getDay();
  for (var p=0; p<firstDow; p++) {
    var empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    calEl.appendChild(empty);
  }

  for (var d=1; d<=daysInMonth; d++) {
    var dt = new Date(y, m, d);
    var dow = dt.getDay();
    var dateStr = y+'-'+_z(m+1)+'-'+_z(d);
    var row = map[dateStr] || { type: dt.getDay()===0||dt.getDay()===6?'holiday':'work', label:'', note:'' };
    var isToday = (dt.getTime() === today.getTime());

    var cell = document.createElement('div');
    cell.className = 'cal-cell t-'+row.type + (isToday?' today':'') + (dow===0?' sun':dow===6?' sat':'');
    cell.innerHTML = '<span class="c-day">'+d+'</span>' + (row.label?'<span class="c-label">'+_esc(row.label)+'</span>':'');
    calEl.appendChild(cell);
  }

  // Upcoming events list
  var eventEl = document.getElementById('event-list');
  if (eventEl) {
    eventEl.innerHTML = '';
    var upcoming = rows.filter(function(r){
      return (r.label || r.note) && r.date >= (y+'-'+_z(m+1)+'-'+_z(today.getDate()));
    }).slice(0,5);
    upcoming.forEach(function(r) {
      var div = document.createElement('div');
      div.className = 'event-row ev-'+r.type;
      div.innerHTML = '<span class="ev-date">'+r.date.slice(5)+'</span><span class="ev-label">'+_esc(r.label||r.note)+'</span>';
      eventEl.appendChild(div);
    });
    if (!upcoming.length) eventEl.innerHTML = '<div class="event-row"><span class="ev-none">予定なし</span></div>';
  }
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({calTitle:'稼働日カレンダー',dataUrl:'',refreshMin:'60',fontFamily:'keifont, sans-serif'});};}

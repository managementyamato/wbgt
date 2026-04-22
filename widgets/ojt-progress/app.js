// ===================== OJT進捗ボード =====================
// 新入社員・研修生のOJT項目ごとの習得状況を表示
// CSV形式: 研修員名, 所属, 項目名, ステータス(done/doing/pending/skip), 担当指導員, 完了日, 備考

var _timer = null;
var SAMPLE_CSV = [
  '田中太郎,大工班,現場安全教育,done,山田主任,2025-01-05,',
  '田中太郎,大工班,工具の正しい使い方,done,山田主任,2025-01-07,',
  '田中太郎,大工班,材料の取り扱い,doing,山田主任,,実施中',
  '田中太郎,大工班,図面の読み方,pending,山田主任,,未着手',
  '田中太郎,大工班,安全帯の装着方法,done,鈴木班長,2025-01-06,',
  '鈴木花子,電気班,電気工事安全教育,done,佐藤主任,2025-01-05,',
  '鈴木花子,電気班,工具点検方法,done,佐藤主任,2025-01-08,',
  '鈴木花子,電気班,配線作業基礎,doing,佐藤主任,,進行中70%',
  '鈴木花子,電気班,検電器の使い方,pending,佐藤主任,,',
  '鈴木花子,電気班,高所作業安全,pending,佐藤主任,,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('board-title', config.boardTitle || 'OJT進捗ボード');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'30',10)*60000);
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
      trainee:  c[0],
      dept:     c[1]||'',
      item:     c[2]||'',
      status:   (c[3]||'pending').toLowerCase(),
      mentor:   c[4]||'',
      doneDate: c[5]||'',
      note:     c[6]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  // Group by trainee
  var trainees = {};
  rows.forEach(function(r) {
    if (!trainees[r.trainee]) trainees[r.trainee] = { name: r.trainee, dept: r.dept, items: [] };
    trainees[r.trainee].items.push(r);
  });

  var totalItems = rows.length;
  var doneItems  = rows.filter(function(r){ return r.status === 'done'; }).length;
  var doingItems = rows.filter(function(r){ return r.status === 'doing'; }).length;
  var pct = totalItems > 0 ? (doneItems / totalItems * 100).toFixed(0) : 0;

  _set('total-items', totalItems);
  _set('done-items',  doneItems);
  _set('doing-items', doingItems);
  _set('overall-pct', pct + '%');

  var barEl = document.getElementById('overall-bar');
  if (barEl) { barEl.style.width = pct + '%'; barEl.style.background = pct >= 80 ? '#66bb6a' : pct >= 50 ? '#42a5f5' : '#ffca28'; }

  var listEl = document.getElementById('trainee-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  Object.values(trainees).forEach(function(trainee) {
    var tDone  = trainee.items.filter(function(i){ return i.status==='done'; }).length;
    var tTotal = trainee.items.filter(function(i){ return i.status!=='skip'; }).length;
    var tPct   = tTotal > 0 ? (tDone / tTotal * 100).toFixed(0) : 0;

    var section = document.createElement('div');
    section.className = 'trainee-section';
    section.innerHTML =
      '<div class="trainee-header">'+
        '<span class="trainee-name">'+_esc(trainee.name)+'</span>'+
        '<span class="trainee-dept">'+_esc(trainee.dept)+'</span>'+
        '<span class="trainee-pct">'+tDone+'/'+tTotal+' ('+tPct+'%)</span>'+
        '<div class="trainee-bar-wrap"><div class="trainee-bar" style="width:'+tPct+'%;background:'+(tPct>=80?'#66bb6a':tPct>=50?'#42a5f5':'#ffca28')+'"></div></div>'+
      '</div>'+
      '<div class="items-grid">'+
        trainee.items.map(function(item) {
          var icon = item.status==='done'?'✓':item.status==='doing'?'▶':item.status==='skip'?'-':'○';
          return '<div class="item-chip st-'+item.status+'" title="'+_esc(item.note||item.doneDate)+'">'+
            '<span class="item-icon">'+icon+'</span>'+
            '<span class="item-name">'+_esc(item.item)+'</span>'+
          '</div>';
        }).join('')+
      '</div>';
    listEl.appendChild(section);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({boardTitle:'OJT進捗ボード',dataUrl:'',refreshMin:'30',fontFamily:'keifont, sans-serif'});};}

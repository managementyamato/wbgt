// ===================== タスク共有ボード =====================
// チームのタスク・TODO・進捗を見える化
// CSV形式: タスク名, 担当者, 優先度(high/medium/low), ステータス(todo/doing/done/blocked), 期限(MM/DD), 備考

var _timer = null;
var SAMPLE_CSV = [
  '安全朝礼実施,田中,high,done,毎日,完了',
  'A棟基礎コン打設,鈴木,high,doing,01/20,進行中50%',
  'B棟足場解体,佐藤,medium,todo,01/25,',
  '工程表更新,山田,medium,doing,01/18,',
  '資材搬入確認,中村,high,todo,01/17,メーカー待ち',
  '安全パトロール,加藤,high,todo,01/17,',
  '品質検査記録,山口,medium,blocked,01/19,書類待ち',
  'C棟配筋検査,田中,high,todo,01/22,',
  '廃棄物伝票整理,鈴木,low,todo,01/31,'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('board-title', config.boardTitle || 'タスク共有ボード');
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
      task:    c[0],
      person:  c[1]||'',
      priority:(c[2]||'medium').toLowerCase(),
      status:  (c[3]||'todo').toLowerCase(),
      due:     c[4]||'',
      note:    c[5]||''
    });
  });
  return rows;
}

function _render(rows) {
  if (!rows.length) return;

  var doneCount    = rows.filter(function(r){ return r.status === 'done'; }).length;
  var doingCount   = rows.filter(function(r){ return r.status === 'doing'; }).length;
  var blockedCount = rows.filter(function(r){ return r.status === 'blocked'; }).length;
  var todoCount    = rows.filter(function(r){ return r.status === 'todo'; }).length;

  _set('done-count',    doneCount);
  _set('doing-count',   doingCount);
  _set('blocked-count', blockedCount);
  _set('todo-count',    todoCount);

  var blockedEl = document.getElementById('blocked-count');
  if (blockedEl) blockedEl.className = 'sum-val ' + (blockedCount > 0 ? 'col-blocked' : 'col-ok');

  // Sort: blocked > high todo/doing > medium > low > done
  var order = {blocked:0, high_todo:1, high_doing:2, medium_todo:3, medium_doing:4, low_todo:5, low_doing:6, done:7};
  rows.sort(function(a,b) {
    var aK = a.status==='done'?'done':a.status==='blocked'?'blocked':a.priority+'_'+a.status;
    var bK = b.status==='done'?'done':b.status==='blocked'?'blocked':b.priority+'_'+b.status;
    return (order[aK]||4) - (order[bK]||4);
  });

  var listEl = document.getElementById('task-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  rows.forEach(function(row) {
    var pLabel = row.priority === 'high' ? '高' : row.priority === 'low' ? '低' : '中';
    var sLabel = row.status === 'done' ? '完了' : row.status === 'doing' ? '進行中' : row.status === 'blocked' ? '停滞' : 'TODO';
    var div = document.createElement('div');
    div.className = 'task-row st-' + row.status;
    div.innerHTML =
      '<div class="t-pri pri-'+row.priority+'">'+pLabel+'</div>'+
      '<div class="t-task">'+_esc(row.task)+(row.note?'<span class="t-note">'+_esc(row.note)+'</span>':'')+'</div>'+
      '<div class="t-person">'+_esc(row.person)+'</div>'+
      '<div class="t-due">'+_esc(row.due)+'</div>'+
      '<div class="t-status st-badge st-'+row.status+'">'+sLabel+'</div>';
    listEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({boardTitle:'タスク共有ボード',dataUrl:'',refreshMin:'5',fontFamily:'keifont, sans-serif'});};}

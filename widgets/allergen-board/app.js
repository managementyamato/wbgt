// ===================== アレルゲン表示ボード =====================
// メニューごとの8大アレルゲン有無を一覧表示
// CSV形式: メニュー名, 小麦, 乳, 卵, 落花生, そば, えび, かに, 大豆, カテゴリ, 備考
// 有:1 無:0 or 空

var _timer = null;
var ALLERGENS = ['小麦','乳','卵','落花生','そば','えび','かに','大豆'];
var SAMPLE_CSV = [
  'ハンバーグ定食,1,1,1,0,0,0,0,1,定食,',
  'カルボナーラ,1,1,1,0,0,0,0,0,パスタ,',
  '唐揚げ定食,1,0,1,0,0,0,0,1,定食,',
  'エビフライ,1,0,1,0,0,1,0,0,定食,',
  'そばセット,1,0,0,0,1,0,0,1,そば,',
  'ナポリタン,1,0,0,0,0,0,0,0,パスタ,卵不使用',
  'ステーキ,0,1,0,0,0,0,0,1,定食,',
  'サラダプレート,0,0,0,0,0,0,0,0,サラダ,アレルゲンなし'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('shop-name', config.shopName || 'アレルゲン一覧');
  if (_timer) clearInterval(_timer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'30',10)*60000);
  } else {
    _render(_parse(SAMPLE_CSV));
  }
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
      var allergens = [];
      for (var i=0; i<8; i++) allergens.push(c[i+1] === '1' || c[i+1] === 'true' || c[i+1] === '○');
      rows.push({ name:c[0], allergens:allergens, category:c[9]||'', note:c[10]||'' });
    }
  });
  return rows;
}

function _render(rows) {
  var tableEl = document.getElementById('allergen-table');
  if (!tableEl) return;
  tableEl.innerHTML = '';

  // ヘッダー行
  var head = document.createElement('div');
  head.className = 'a-row a-head';
  head.innerHTML = '<div class="a-menu">メニュー</div>' +
    ALLERGENS.map(function(a){ return '<div class="a-cell a-label">'+a+'</div>'; }).join('') +
    '<div class="a-note-col">備考</div>';
  tableEl.appendChild(head);

  rows.forEach(function(row) {
    var div = document.createElement('div');
    div.className = 'a-row';
    div.innerHTML = '<div class="a-menu">'+_esc(row.name)+(row.category?'<span class="a-cat">'+_esc(row.category)+'</span>':'')+'</div>' +
      row.allergens.map(function(has){
        return '<div class="a-cell '+(has?'has-allergen':'no-allergen')+'">'+(has?'●':'')+'</div>';
      }).join('') +
      '<div class="a-note-col">'+_esc(row.note)+'</div>';
    tableEl.appendChild(div);
  });
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({shopName:'アレルゲン一覧',dataUrl:'',refreshMin:'30',fontFamily:'keifont, sans-serif'});};}

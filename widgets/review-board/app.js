// ===================== 口コミ・評価ライブ表示ボード =====================
// 店舗・施設の口コミ・評価をスライド表示
// CSV形式: 投稿者名, 評価(1-5), コメント, 日付(YYYY-MM-DD), カテゴリ

var _timer = null;
var _slideIdx = 0;
var _rows = [];
var _slideTimer = null;
var SAMPLE_CSV = [
  'Aさん,5,スタッフの対応がとても丁寧で気持ちよく利用できました！,2025-01-15,サービス',
  'Bさん,4,待ち時間も少なく清潔感があって良かったです。,2025-01-14,環境',
  'Cさん,5,いつも親切に対応していただき助かっています。,2025-01-13,スタッフ',
  'Dさん,4,また来ます！近くにこんな良いお店があって嬉しいです。,2025-01-12,総合',
  'Eさん,5,丁寧な説明で安心できました。次回もよろしくお願いします。,2025-01-11,サービス',
  'Fさん,3,もう少し待ち時間が短いとなお良いと思います。,2025-01-10,改善要望',
  'Gさん,5,設備がきれいで使いやすかったです。,2025-01-09,環境'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('shop-name', config.shopName || '口コミ・評価');
  var sec = parseInt(config.slideSec || '8', 10) * 1000;
  if (_timer) clearInterval(_timer);
  if (_slideTimer) clearInterval(_slideTimer);
  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url);
    _timer = setInterval(function() { _fetch(url); }, parseInt(config.refreshMin||'30',10)*60000);
  } else {
    _rows = _parse(SAMPLE_CSV);
    _showSlide(0);
  }
  _slideTimer = setInterval(function() {
    if (!_rows.length) return;
    _slideIdx = (_slideIdx + 1) % _rows.length;
    _showSlide(_slideIdx);
  }, sec);
  _updateClock(); setInterval(_updateClock, 30000);
}

function _fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+'?_='+Date.now(), true); xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status===200) { _rows = _parse(xhr.responseText); _renderAll(); } };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({
      author:  c[0],
      rating:  Math.min(5, Math.max(1, parseInt(c[1])||5)),
      comment: c[2]||'',
      date:    c[3]||'',
      cat:     c[4]||''
    });
  });
  return rows;
}

function _renderAll() {
  if (!_rows.length) return;
  var avg = _rows.reduce(function(s,r){ return s+r.rating; }, 0) / _rows.length;
  _set('avg-rating', avg.toFixed(1));
  _set('review-count', _rows.length + '件');
  _renderStars('avg-stars', avg);

  // Recent 4 mini cards
  var miniEl = document.getElementById('mini-list');
  if (miniEl) {
    miniEl.innerHTML = '';
    _rows.slice(0, 4).forEach(function(row) {
      var div = document.createElement('div');
      div.className = 'mini-card';
      div.innerHTML =
        '<div class="mini-top"><span class="mini-author">'+_esc(row.author)+'</span>'+_starsHtml(row.rating, 'mini')+'</div>'+
        '<div class="mini-comment">'+_esc(row.comment)+'</div>';
      miniEl.appendChild(div);
    });
  }
  _showSlide(_slideIdx);
}

function _showSlide(idx) {
  if (!_rows.length) return;
  var row = _rows[idx % _rows.length];
  _set('slide-author', row.author);
  _set('slide-comment', row.comment);
  _set('slide-date', row.date);
  _set('slide-cat', row.cat ? '【'+row.cat+'】' : '');
  _renderStars('slide-stars', row.rating);

  var slideEl = document.getElementById('slide-block');
  if (slideEl) { slideEl.style.opacity = '0'; setTimeout(function(){ slideEl.style.opacity = '1'; }, 50); }

  // Dots
  var dotsEl = document.getElementById('dots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    _rows.forEach(function(_, i) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (i === idx ? ' active' : '');
      dotsEl.appendChild(dot);
    });
  }
}

function _renderStars(id, rating) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = _starsHtml(rating, 'normal');
}

function _starsHtml(rating, size) {
  var s = '';
  for (var i=1; i<=5; i++) s += '<span class="star'+(i<=rating?' filled':'')+' '+size+'">★</span>';
  return s;
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({shopName:'口コミ・評価',dataUrl:'',refreshMin:'30',slideSec:'8',fontFamily:'keifont, sans-serif'});
  _rows=_parse(SAMPLE_CSV); _renderAll();};}

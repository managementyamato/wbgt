// ===== QRコード生成ライブラリ（内蔵） =====
// Based on: https://github.com/kazuhikoarase/qrcode-generator (MIT License)
var QR = (function() {
  var PAD0 = 0xEC; var PAD1 = 0x11;
  function generateQR(text, size, fgColor, bgColor) {
    var modules = qrcodegen(text);
    if (!modules) return null;
    var canvas = document.createElement('canvas');
    var moduleCount = modules.length;
    var cellSize = Math.floor(size / (moduleCount + 8));
    if (cellSize < 1) cellSize = 1;
    var totalSize = cellSize * (moduleCount + 8);
    canvas.width = totalSize; canvas.height = totalSize;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor || '#ffffff'; ctx.fillRect(0, 0, totalSize, totalSize);
    ctx.fillStyle = fgColor || '#000000';
    var offset = cellSize * 4;
    for (var r = 0; r < moduleCount; r++) for (var c = 0; c < moduleCount; c++)
      if (modules[r][c]) ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
    return canvas;
  }
  function qrcodegen(text) {
    var data = encodeUTF8(text); var version = selectVersion(data.length);
    if (version < 1) return null;
    var size = version * 4 + 17; var modules = []; var isFunction = [];
    for (var i = 0; i < size; i++) { modules.push(new Array(size)); isFunction.push(new Array(size)); for (var j = 0; j < size; j++) { modules[i][j] = false; isFunction[i][j] = false; } }
    drawFinderPattern(modules, isFunction, size, 0, 0); drawFinderPattern(modules, isFunction, size, size - 7, 0); drawFinderPattern(modules, isFunction, size, 0, size - 7);
    drawTimingPatterns(modules, isFunction, size); if (version >= 2) drawAlignmentPatterns(modules, isFunction, size, version);
    modules[size - 8][8] = true; isFunction[size - 8][8] = true;
    reserveFormatArea(isFunction, size);
    var encoded = encodeData(data, version); placeDataBits(modules, isFunction, size, encoded);
    var bestMask = 0; var bestPenalty = Infinity;
    for (var mask = 0; mask < 8; mask++) { applyMask(modules, isFunction, size, mask); drawFormatBits(modules, size, mask); var penalty = computePenalty(modules, size); if (penalty < bestPenalty) { bestPenalty = penalty; bestMask = mask; } applyMask(modules, isFunction, size, mask); }
    applyMask(modules, isFunction, size, bestMask); drawFormatBits(modules, size, bestMask);
    return modules;
  }
  function encodeUTF8(str) { var bytes = []; for (var i = 0; i < str.length; i++) { var code = str.charCodeAt(i); if (code < 0x80) { bytes.push(code); } else if (code < 0x800) { bytes.push(0xC0|(code>>6)); bytes.push(0x80|(code&0x3F)); } else { bytes.push(0xE0|(code>>12)); bytes.push(0x80|((code>>6)&0x3F)); bytes.push(0x80|(code&0x3F)); } } return bytes; }
  var CAPACITIES = [0,14,26,42,62,84,106,122,152,180,213];
  function selectVersion(dataLen) { for (var v=1;v<=10;v++) { var countBits=v<=9?8:16; if (4+countBits+dataLen*8<=CAPACITIES[v]*8) return v; } return -1; }
  function encodeData(data, version) { var countBits=version<=9?8:16; var bits=[]; pushBits(bits,4,4); pushBits(bits,data.length,countBits); for(var i=0;i<data.length;i++) pushBits(bits,data[i],8); var capacity=CAPACITIES[version]*8; var termLen=Math.min(4,capacity-bits.length); pushBits(bits,0,termLen); while(bits.length%8!==0) bits.push(0); var padToggle=true; while(bits.length<capacity){pushBits(bits,padToggle?PAD0:PAD1,8);padToggle=!padToggle;} var dataBytes=[]; for(var i=0;i<bits.length;i+=8){var b=0;for(var j=0;j<8;j++) b=(b<<1)|(bits[i+j]||0);dataBytes.push(b);} var eccInfo=getECCInfo(version); var eccBytes=computeECC(dataBytes,eccInfo.eccPerBlock,eccInfo.numBlocks); var result=[]; for(var i=0;i<dataBytes.length;i++) pushBits(result,dataBytes[i],8); for(var i=0;i<eccBytes.length;i++) pushBits(result,eccBytes[i],8); return result; }
  function pushBits(arr,value,numBits){for(var i=numBits-1;i>=0;i--) arr.push((value>>i)&1);}
  var ECC_TABLE=[null,{eccPerBlock:10,numBlocks:1},{eccPerBlock:16,numBlocks:1},{eccPerBlock:26,numBlocks:1},{eccPerBlock:18,numBlocks:2},{eccPerBlock:24,numBlocks:2},{eccPerBlock:16,numBlocks:4},{eccPerBlock:18,numBlocks:4},{eccPerBlock:22,numBlocks:4},{eccPerBlock:22,numBlocks:5},{eccPerBlock:26,numBlocks:5}];
  function getECCInfo(v){return ECC_TABLE[v]||{eccPerBlock:10,numBlocks:1};}
  var GF_EXP=new Array(256); var GF_LOG=new Array(256);
  (function(){var x=1;for(var i=0;i<255;i++){GF_EXP[i]=x;GF_LOG[x]=i;x<<=1;if(x>=256)x^=0x11D;}GF_EXP[255]=GF_EXP[0];})();
  function gfMul(a,b){if(a===0||b===0)return 0;return GF_EXP[(GF_LOG[a]+GF_LOG[b])%255];}
  function computeECC(data,numEcc,numBlocks){var gen=[1];for(var i=0;i<numEcc;i++){var newGen=new Array(gen.length+1);for(var j=0;j<newGen.length;j++)newGen[j]=0;for(var j=0;j<gen.length;j++){newGen[j]^=gfMul(gen[j],GF_EXP[i]);newGen[j+1]^=gen[j];}gen=newGen;} if(numBlocks===1)return rsEncode(data,gen,numEcc); var blockSize=Math.floor(data.length/numBlocks);var allEcc=[];for(var b=0;b<numBlocks;b++){var start=b*blockSize;var end=(b===numBlocks-1)?data.length:start+blockSize;var block=data.slice(start,end);var ecc=rsEncode(block,gen,numEcc);for(var i=0;i<ecc.length;i++)allEcc.push(ecc[i]);}return allEcc;}
  function rsEncode(data,gen,numEcc){var result=new Array(numEcc);for(var i=0;i<numEcc;i++)result[i]=0;for(var i=0;i<data.length;i++){var factor=data[i]^result[0];result.shift();result.push(0);if(factor!==0)for(var j=0;j<result.length;j++)result[j]^=gfMul(gen[j+1],factor);}return result;}
  function drawFinderPattern(modules,isFunction,size,row,col){for(var r=-1;r<=7;r++)for(var c=-1;c<=7;c++){var rr=row+r,cc=col+c;if(rr<0||rr>=size||cc<0||cc>=size)continue;var inOuter=(r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6));var inInner=(r>=2&&r<=4&&c>=2&&c<=4);modules[rr][cc]=inOuter||inInner;isFunction[rr][cc]=true;}}
  function drawTimingPatterns(modules,isFunction,size){for(var i=8;i<size-8;i++){modules[6][i]=(i%2===0);isFunction[6][i]=true;modules[i][6]=(i%2===0);isFunction[i][6]=true;}}
  var ALIGNMENT_POSITIONS=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
  function drawAlignmentPatterns(modules,isFunction,size,version){var positions=ALIGNMENT_POSITIONS[version];if(!positions)return;for(var i=0;i<positions.length;i++)for(var j=0;j<positions.length;j++){var r=positions[i],c=positions[j];if(isFunction[r][c])continue;for(var dr=-2;dr<=2;dr++)for(var dc=-2;dc<=2;dc++){var abs_dr=Math.abs(dr),abs_dc=Math.abs(dc);modules[r+dr][c+dc]=(abs_dr===2||abs_dc===2||(dr===0&&dc===0));isFunction[r+dr][c+dc]=true;}}}
  function reserveFormatArea(isFunction,size){for(var i=0;i<8;i++){isFunction[8][i]=true;isFunction[8][size-1-i]=true;isFunction[i][8]=true;isFunction[size-1-i][8]=true;}isFunction[8][8]=true;}
  var FORMAT_BITS=[0x5412,0x5125,0x5E7C,0x5B4B,0x45F9,0x40CE,0x4F97,0x4AA0];
  function drawFormatBits(modules,size,mask){var bits=FORMAT_BITS[mask];for(var i=0;i<=5;i++)modules[8][i]=((bits>>(14-i))&1)===1;modules[8][7]=((bits>>8)&1)===1;modules[8][8]=((bits>>7)&1)===1;modules[7][8]=((bits>>6)&1)===1;for(var i=0;i<=5;i++)modules[5-i][8]=((bits>>i)&1)===1;for(var i=0;i<=7;i++)modules[size-1-i][8]=((bits>>(14-i))&1)===1;for(var i=0;i<=7;i++)modules[8][size-8+i]=((bits>>(7-i))&1)===1;}
  function placeDataBits(modules,isFunction,size,data){var bitIdx=0;for(var right=size-1;right>=1;right-=2){if(right===6)right=5;for(var vert=0;vert<size;vert++)for(var j=0;j<2;j++){var x=right-j;var upward=((right+1)&2)===0;var y=upward?size-1-vert:vert;if(isFunction[y][x])continue;if(bitIdx<data.length){modules[y][x]=data[bitIdx]===1;bitIdx++;}}}}
  function applyMask(modules,isFunction,size,mask){for(var r=0;r<size;r++)for(var c=0;c<size;c++){if(isFunction[r][c])continue;var invert=false;switch(mask){case 0:invert=(r+c)%2===0;break;case 1:invert=r%2===0;break;case 2:invert=c%3===0;break;case 3:invert=(r+c)%3===0;break;case 4:invert=(Math.floor(r/2)+Math.floor(c/3))%2===0;break;case 5:invert=(r*c)%2+(r*c)%3===0;break;case 6:invert=((r*c)%2+(r*c)%3)%2===0;break;case 7:invert=((r+c)%2+(r*c)%3)%2===0;break;}if(invert)modules[r][c]=!modules[r][c];}}
  function computePenalty(modules,size){var penalty=0;for(var r=0;r<size;r++){var run=1;for(var c=1;c<size;c++){if(modules[r][c]===modules[r][c-1]){run++;if(run===5)penalty+=3;else if(run>5)penalty++;}else run=1;}}for(var c=0;c<size;c++){var run=1;for(var r=1;r<size;r++){if(modules[r][c]===modules[r-1][c]){run++;if(run===5)penalty+=3;else if(run>5)penalty++;}else run=1;}}return penalty;}
  return { generate: generateQR };
})();

// ===== ヒヤリハット投稿ボード =====
var _lastConfig = null;
var _fetchTimer = null;
var _scrollTimer = null;
var _clockTimer = null;
var _items = [];
var _displayOffset = 0;
var _maxVisible = 5;

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _start(_lastConfig); });
    return;
  }
  _start(config);
}

function _start(config) {
  _applyStyles(config);

  var titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = config.title || 'ヒヤリハット投稿ボード';

  if (_fetchTimer)  clearInterval(_fetchTimer);
  if (_scrollTimer) clearInterval(_scrollTimer);
  if (_clockTimer)  clearInterval(_clockTimer);

  _maxVisible = parseInt(config.maxVisible || '5', 10);

  /* QRコード描画 */
  _renderQR(config);

  /* データ取得 */
  if (config.dataUrl && config.dataUrl.trim()) {
    _fetchData(config.dataUrl.trim());
    var interval = parseInt(config.refreshSec || '60', 10) * 1000;
    _fetchTimer = setInterval(function() { _fetchData(config.dataUrl.trim()); }, interval);
  } else {
    _items = _sampleItems();
    _render();
  }

  /* 自動スクロール */
  _scrollTimer = setInterval(function() {
    if (_items.length > _maxVisible) {
      _displayOffset = (_displayOffset + 1) % _items.length;
      _render();
    }
  }, 5000);

  /* ヘッダー時刻更新 */
  _updateHeader();
  _clockTimer = setInterval(_updateHeader, 30000);
}

function _updateHeader() {
  var now = new Date();
  var el = document.getElementById('header-right');
  if (el) el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ' 更新';
}

/* ── QRコード描画 ── */
function _renderQR(config) {
  var formUrl = (config.formUrl || '').trim();
  var noUrlEl = document.getElementById('qr-no-url');
  var canvasEl = document.getElementById('qr-canvas');
  var labelEl  = document.getElementById('qr-label');
  var subEl    = document.getElementById('qr-sublabel');

  if (!formUrl) {
    if (noUrlEl) noUrlEl.style.display = '';
    if (canvasEl) canvasEl.style.display = 'none';
    if (subEl)   subEl.style.display = 'none';
    return;
  }

  if (noUrlEl) noUrlEl.style.display = 'none';
  if (canvasEl) canvasEl.style.display = '';
  if (subEl)   subEl.style.display = '';

  /* QRパネルの幅に合わせてサイズ計算 */
  var panel = document.getElementById('qr-panel');
  var panelW = panel ? panel.offsetWidth : Math.floor(window.innerWidth * 0.28);
  var panelH = window.innerHeight;
  var qrSize = Math.floor(Math.min(panelW * 0.85, panelH * 0.5));
  if (qrSize < 60) qrSize = 60;

  var generated = QR.generate(formUrl, qrSize, '#000000', '#ffffff');
  if (generated && canvasEl) {
    /* 既存canvasに描画内容をコピー */
    canvasEl.width  = generated.width;
    canvasEl.height = generated.height;
    canvasEl.style.borderRadius = '4px';
    var ctx = canvasEl.getContext('2d');
    ctx.drawImage(generated, 0, 0);
  }
}

/* ── データ取得 ──
   CSV形式: 投稿日時, レベル(high/medium/low), 内容, 場所, 投稿者
*/
function _fetchData(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var parsed = _parseCSV(xhr.responseText);
      if (parsed.length > 0) {
        _items = parsed; _displayOffset = 0; _render();
      }
    }
  };
  xhr.onerror = function() {
    if (_items.length === 0) { _items = _sampleItems(); _render(); }
  };
  xhr.send();
}

function _parseCSV(text) {
  var lines = text.trim().split('\n');
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].trim().split(',');
    if (cols.length < 3) continue;
    var datetime = cols[0].trim();
    var level    = cols[1].trim().toLowerCase();
    var content  = cols[2].trim();
    var location = (cols[3] || '').trim();
    var author   = (cols[4] || '').trim();
    if (!content) continue;
    if (!['high','medium','low'].includes(level)) level = 'medium';
    result.push({ datetime: datetime, level: level, content: content, location: location, author: author });
  }
  return result.reverse();
}

function _sampleItems() {
  var today = _dateStr(0); var yest = _dateStr(-1);
  return [
    { datetime: today+' 10:23', level:'high',   content:'3F開口部付近で足場がずれており、踏み外しそうになった', location:'3F東側', author:'匿名' },
    { datetime: today+' 09:05', level:'medium',  content:'資材置き場の通路に鉄筋が飛び出しており、足が引っかかりそうになった', location:'1F資材置場', author:'匿名' },
    { datetime: today+' 08:41', level:'low',    content:'朝礼後に安全帯の装着忘れに気づいた', location:'更衣室前', author:'田中' },
    { datetime: yest +' 15:30', level:'high',   content:'クレーン旋回中に地上作業員が接近。声かけで直前に回避', location:'B棟外部', author:'匿名' },
    { datetime: yest +' 13:12', level:'medium',  content:'仮設電源コードが通路に露出、つまずきそうになった', location:'2F廊下', author:'匿名' }
  ];
}

function _dateStr(offset) {
  var d = new Date(); d.setDate(d.getDate() + offset);
  return d.getFullYear()+'-'+_z(d.getMonth()+1)+'-'+_z(d.getDate());
}

/* ── 描画 ── */
function _render() {
  var feed = document.getElementById('feed');
  if (!feed) return;

  if (!_items.length) {
    feed.innerHTML = '<div id="empty">ヒヤリハットの投稿がありません</div>';
    _updateStats(0,0,0,0); return;
  }

  var levelLabel = { high:'重大', medium:'注意', low:'軽微' };
  var visible = [];
  for (var i = 0; i < _maxVisible && i < _items.length; i++)
    visible.push(_items[(_displayOffset + i) % _items.length]);

  var html = '';
  visible.forEach(function(item) {
    html += '<div class="card '+item.level+'">';
    html += '<div class="card-level">'+(levelLabel[item.level]||item.level)+'</div>';
    html += '<div class="card-body">';
    html += '<div class="card-text">'+_esc(item.content)+'</div>';
    var meta = [];
    if (item.location) meta.push('場所：'+item.location);
    if (item.author)   meta.push(item.author);
    if (item.datetime) meta.push(item.datetime);
    html += '<div class="card-meta">'+meta.map(_esc).join('　')+'</div>';
    html += '</div></div>';
  });
  feed.innerHTML = html;

  var total  = _items.length;
  var high   = _items.filter(function(i){return i.level==='high';}).length;
  var medium = _items.filter(function(i){return i.level==='medium';}).length;
  var low    = _items.filter(function(i){return i.level==='low';}).length;
  _updateStats(total, high, medium, low);
}

function _updateStats(total, high, medium, low) {
  var badge = document.getElementById('total-badge');
  if (badge) badge.textContent = total + ' 件';

  var footer = document.getElementById('feed-footer');
  if (footer) {
    footer.innerHTML =
      '<div class="stat">重大：<span class="h">'+high+'</span></div>'+
      '<div class="stat">注意：<span class="m">'+medium+'</span></div>'+
      '<div class="stat">軽微：<span class="l">'+low+'</span></div>';
  }
}

/* ── スタイル ── */
function _applyStyles(config) {
  var bg   = config.bgColor    || '#111111';
  var fg   = config.fontColor  || '#ffffff';
  var font = config.fontFamily || 'keifont, sans-serif';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
  document.body.style.color      = fg;
  document.body.style.fontFamily = font;
}

function _z(n) { return String(n).padStart(2, '0'); }
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Yodeck postMessage ── */
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      title: 'ヒヤリハット投稿ボード',
      dataUrl: '',
      formUrl: 'https://forms.gle/example',
      refreshSec: '60',
      maxVisible: '5',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#111111'
    });
  };
}

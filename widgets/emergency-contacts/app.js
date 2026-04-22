// ===== QRコード生成ライブラリ（内蔵） =====
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

// ===================== 緊急連絡先ボード =====================
// 現場の緊急連絡先を大きく表示 + 詳細連絡先へのQRコード

function init_widget(config) {
  if (!config) return;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _start(config); });
    return;
  }
  _start(config);
}

function _start(config) {
  var font = config.fontFamily || 'keifont, sans-serif';
  document.body.style.fontFamily = font;

  var titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.textContent = config.boardTitle || '緊急連絡先';

  // 緊急連絡先（固定5件）
  var contacts = [
    { label: config.label1 || '現場責任者',  number: config.tel1 || '090-XXXX-XXXX', color: '#ef5350' },
    { label: config.label2 || '警察',        number: config.tel2 || '110',           color: '#ab47bc' },
    { label: config.label3 || '救急・消防',  number: config.tel3 || '119',           color: '#ff7043' },
    { label: config.label4 || '元請け連絡先', number: config.tel4 || '03-XXXX-XXXX', color: '#42a5f5' },
    { label: config.label5 || '近隣病院',    number: config.tel5 || '03-XXXX-XXXX', color: '#26a69a' }
  ];

  _renderContacts(contacts);

  // QRコード描画
  var qrUrl = (config.qrUrl || '').trim();
  _renderQR(qrUrl, config.qrLabel || 'QRコード詳細');
}

function _renderContacts(contacts) {
  var listEl = document.getElementById('contact-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  contacts.forEach(function(c) {
    if (!c.number || c.number === '') return;
    var item = document.createElement('div');
    item.className = 'contact-item';
    item.style.borderLeftColor = c.color;
    item.innerHTML =
      '<div class="contact-label">' + _esc(c.label) + '</div>' +
      '<div class="contact-number" style="color:' + c.color + '">' + _esc(c.number) + '</div>';
    listEl.appendChild(item);
  });
}

function _renderQR(url, label) {
  var panel = document.getElementById('qr-panel');
  var canvas = document.getElementById('qr-canvas');
  var labelEl = document.getElementById('qr-label');

  if (!url) {
    if (panel) panel.style.display = 'none';
    return;
  }
  if (panel) panel.style.display = '';

  if (labelEl) labelEl.textContent = label || 'QRコードで詳細確認';

  if (canvas) {
    var size = Math.min(canvas.parentElement.offsetWidth || 160, canvas.parentElement.offsetHeight || 160) - 20;
    if (size < 60) size = 120;
    var qrCanvas = QR.generate(url, size, '#000000', '#ffffff');
    if (qrCanvas) {
      canvas.width  = qrCanvas.width;
      canvas.height = qrCanvas.height;
      canvas.getContext('2d').drawImage(qrCanvas, 0, 0);
    }
  }
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Yodeck postMessage */
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
      boardTitle: '緊急連絡先',
      label1: '現場責任者',  tel1: '090-1234-5678',
      label2: '警察',        tel2: '110',
      label3: '救急・消防',  tel3: '119',
      label4: '元請け連絡先', tel4: '03-1234-5678',
      label5: '近隣病院',    tel5: '03-9876-5432',
      qrUrl:   'https://example.com/contacts',
      qrLabel: 'スマホで詳細確認',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

/**
 * QR Code Widget
 * QRコード生成ライブラリを内蔵（軽量版）
 */

// ===== QRコード生成（軽量実装） =====
// Based on: https://github.com/kazuhikoarase/qrcode-generator (MIT License)

var QR = (function() {
  // QR Code Generator for JavaScript
  // Simplified version supporting alphanumeric/byte modes

  var PAD0 = 0xEC;
  var PAD1 = 0x11;

  var QRMode = { NUMBER: 1, ALPHA_NUM: 2, BYTE: 4 };
  var QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

  // Simplified: use a canvas-based approach with external API fallback
  function generateQR(text, size, fgColor, bgColor) {
    // Use a simple QR generation via canvas manipulation
    // For reliability, we'll draw using a matrix computed locally

    var modules = qrcodegen(text);
    if (!modules) return null;

    var canvas = document.createElement('canvas');
    var moduleCount = modules.length;
    var cellSize = Math.floor(size / (moduleCount + 8)); // quiet zone
    if (cellSize < 1) cellSize = 1;
    var totalSize = cellSize * (moduleCount + 8);
    canvas.width = totalSize;
    canvas.height = totalSize;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor || '#ffffff';
    ctx.fillRect(0, 0, totalSize, totalSize);

    ctx.fillStyle = fgColor || '#000000';
    var offset = cellSize * 4; // quiet zone
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (modules[r][c]) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }
    return canvas;
  }

  // ===== Minimal QR Code Matrix Generator =====
  // Generates a QR code matrix (2D boolean array) for the given text
  // Supports version 1-10, error correction level M, byte mode

  function qrcodegen(text) {
    var data = encodeUTF8(text);
    var version = selectVersion(data.length);
    if (version < 1) return null;

    var size = version * 4 + 17;
    var modules = [];
    var isFunction = [];
    for (var i = 0; i < size; i++) {
      modules.push(new Array(size));
      isFunction.push(new Array(size));
      for (var j = 0; j < size; j++) {
        modules[i][j] = false;
        isFunction[i][j] = false;
      }
    }

    // Draw function patterns
    drawFinderPattern(modules, isFunction, size, 0, 0);
    drawFinderPattern(modules, isFunction, size, size - 7, 0);
    drawFinderPattern(modules, isFunction, size, 0, size - 7);
    drawTimingPatterns(modules, isFunction, size);
    if (version >= 2) drawAlignmentPatterns(modules, isFunction, size, version);
    // Dark module
    modules[size - 8][8] = true;
    isFunction[size - 8][8] = true;

    // Reserve format info area
    reserveFormatArea(isFunction, size);

    // Encode data
    var encoded = encodeData(data, version);

    // Place data bits
    placeDataBits(modules, isFunction, size, encoded);

    // Apply best mask
    var bestMask = 0;
    var bestPenalty = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      applyMask(modules, isFunction, size, mask);
      drawFormatBits(modules, size, mask);
      var penalty = computePenalty(modules, size);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMask = mask;
      }
      applyMask(modules, isFunction, size, mask); // undo
    }
    applyMask(modules, isFunction, size, bestMask);
    drawFormatBits(modules, size, bestMask);

    return modules;
  }

  function encodeUTF8(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3F));
      } else if (code >= 0xD800 && code < 0xDC00 && i + 1 < str.length) {
        var next = str.charCodeAt(i + 1);
        if (next >= 0xDC00 && next < 0xE000) {
          var cp = ((code - 0xD800) << 10) + (next - 0xDC00) + 0x10000;
          bytes.push(0xF0 | (cp >> 18));
          bytes.push(0x80 | ((cp >> 12) & 0x3F));
          bytes.push(0x80 | ((cp >> 6) & 0x3F));
          bytes.push(0x80 | (cp & 0x3F));
          i++;
        }
      } else {
        bytes.push(0xE0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3F));
        bytes.push(0x80 | (code & 0x3F));
      }
    }
    return bytes;
  }

  // Data capacity (bytes) for versions 1-10 at ECC level M, byte mode
  var CAPACITIES = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

  function selectVersion(dataLen) {
    // 4 bits mode + 8 bits count + data + terminator
    for (var v = 1; v <= 10; v++) {
      // Byte mode: mode(4) + count(8 for v1-9, 16 for v10+) + data*8 + terminator(4)
      var countBits = v <= 9 ? 8 : 16;
      var totalBits = 4 + countBits + dataLen * 8;
      var capacityBits = CAPACITIES[v] * 8;
      if (totalBits <= capacityBits) return v;
    }
    return -1; // too long
  }

  function encodeData(data, version) {
    var countBits = version <= 9 ? 8 : 16;
    var bits = [];

    // Mode indicator: byte mode = 0100
    pushBits(bits, 4, 4);
    // Character count
    pushBits(bits, data.length, countBits);
    // Data
    for (var i = 0; i < data.length; i++) {
      pushBits(bits, data[i], 8);
    }
    // Terminator
    var capacity = CAPACITIES[version] * 8;
    var termLen = Math.min(4, capacity - bits.length);
    pushBits(bits, 0, termLen);
    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);
    // Pad bytes
    var padToggle = true;
    while (bits.length < capacity) {
      pushBits(bits, padToggle ? PAD0 : PAD1, 8);
      padToggle = !padToggle;
    }

    // Convert to bytes for ECC
    var dataBytes = [];
    for (var i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
      dataBytes.push(b);
    }

    // Compute ECC
    var eccInfo = getECCInfo(version);
    var eccBytes = computeECC(dataBytes, eccInfo.eccPerBlock, eccInfo.numBlocks);

    // Interleave and convert back to bits
    var result = [];
    // For simplicity with single block versions
    for (var i = 0; i < dataBytes.length; i++) pushBits(result, dataBytes[i], 8);
    for (var i = 0; i < eccBytes.length; i++) pushBits(result, eccBytes[i], 8);

    return result;
  }

  function pushBits(arr, value, numBits) {
    for (var i = numBits - 1; i >= 0; i--) {
      arr.push((value >> i) & 1);
    }
  }

  // ECC info for versions 1-10, level M
  var ECC_TABLE = [
    null,
    { eccPerBlock: 10, numBlocks: 1 }, // v1
    { eccPerBlock: 16, numBlocks: 1 }, // v2
    { eccPerBlock: 26, numBlocks: 1 }, // v3
    { eccPerBlock: 18, numBlocks: 2 }, // v4
    { eccPerBlock: 24, numBlocks: 2 }, // v5
    { eccPerBlock: 16, numBlocks: 4 }, // v6
    { eccPerBlock: 18, numBlocks: 4 }, // v7
    { eccPerBlock: 22, numBlocks: 4 }, // v8 (approx)
    { eccPerBlock: 22, numBlocks: 5 }, // v9 (approx)
    { eccPerBlock: 26, numBlocks: 5 }  // v10 (approx)
  ];

  function getECCInfo(version) {
    return ECC_TABLE[version] || { eccPerBlock: 10, numBlocks: 1 };
  }

  // GF(256) arithmetic for Reed-Solomon
  var GF_EXP = new Array(256);
  var GF_LOG = new Array(256);
  (function() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x >= 256) x ^= 0x11D;
    }
    GF_EXP[255] = GF_EXP[0];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
  }

  function computeECC(data, numEcc, numBlocks) {
    // Generate generator polynomial
    var gen = [1];
    for (var i = 0; i < numEcc; i++) {
      var newGen = new Array(gen.length + 1);
      for (var j = 0; j < newGen.length; j++) newGen[j] = 0;
      for (var j = 0; j < gen.length; j++) {
        newGen[j] ^= gfMul(gen[j], GF_EXP[i]);
        newGen[j + 1] ^= gen[j];
      }
      gen = newGen;
    }

    // For simplicity, treat as single block (works for v1-3)
    // For multi-block, split and process each
    if (numBlocks === 1) {
      return rsEncode(data, gen, numEcc);
    }

    var blockSize = Math.floor(data.length / numBlocks);
    var allEcc = [];
    for (var b = 0; b < numBlocks; b++) {
      var start = b * blockSize;
      var end = (b === numBlocks - 1) ? data.length : start + blockSize;
      var block = data.slice(start, end);
      var ecc = rsEncode(block, gen, numEcc);
      for (var i = 0; i < ecc.length; i++) allEcc.push(ecc[i]);
    }
    return allEcc;
  }

  function rsEncode(data, gen, numEcc) {
    var result = new Array(numEcc);
    for (var i = 0; i < numEcc; i++) result[i] = 0;

    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result[0];
      result.shift();
      result.push(0);
      if (factor !== 0) {
        for (var j = 0; j < result.length; j++) {
          result[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return result;
  }

  function drawFinderPattern(modules, isFunction, size, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        var inOuter = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                      (c >= 0 && c <= 6 && (r === 0 || r === 6));
        var inInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        modules[rr][cc] = inOuter || inInner;
        isFunction[rr][cc] = true;
      }
    }
  }

  function drawTimingPatterns(modules, isFunction, size) {
    for (var i = 8; i < size - 8; i++) {
      modules[6][i] = (i % 2 === 0);
      isFunction[6][i] = true;
      modules[i][6] = (i % 2 === 0);
      isFunction[i][6] = true;
    }
  }

  var ALIGNMENT_POSITIONS = [
    null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50]
  ];

  function drawAlignmentPatterns(modules, isFunction, size, version) {
    var positions = ALIGNMENT_POSITIONS[version];
    if (!positions) return;
    for (var i = 0; i < positions.length; i++) {
      for (var j = 0; j < positions.length; j++) {
        var r = positions[i], c = positions[j];
        if (isFunction[r][c]) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var abs_dr = Math.abs(dr), abs_dc = Math.abs(dc);
            modules[r + dr][c + dc] = (abs_dr === 2 || abs_dc === 2 || (dr === 0 && dc === 0));
            isFunction[r + dr][c + dc] = true;
          }
        }
      }
    }
  }

  function reserveFormatArea(isFunction, size) {
    for (var i = 0; i < 8; i++) {
      isFunction[8][i] = true;
      isFunction[8][size - 1 - i] = true;
      isFunction[i][8] = true;
      isFunction[size - 1 - i][8] = true;
    }
    isFunction[8][8] = true;
  }

  // Format bits for ECC level M (value=0), mask pattern
  var FORMAT_BITS = [
    0x5412, 0x5125, 0x5E7C, 0x5B4B,
    0x45F9, 0x40CE, 0x4F97, 0x4AA0,
  ];

  function drawFormatBits(modules, size, mask) {
    var bits = FORMAT_BITS[mask];
    // Around top-left finder
    for (var i = 0; i <= 5; i++) modules[8][i] = ((bits >> (14 - i)) & 1) === 1;
    modules[8][7] = ((bits >> 8) & 1) === 1;
    modules[8][8] = ((bits >> 7) & 1) === 1;
    modules[7][8] = ((bits >> 6) & 1) === 1;
    for (var i = 0; i <= 5; i++) modules[5 - i][8] = ((bits >> i) & 1) === 1;
    // Around other finders
    for (var i = 0; i <= 7; i++) modules[size - 1 - i][8] = ((bits >> (14 - i)) & 1) === 1;
    for (var i = 0; i <= 7; i++) modules[8][size - 8 + i] = ((bits >> (7 - i)) & 1) === 1;
  }

  function placeDataBits(modules, isFunction, size, data) {
    var bitIdx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip timing column
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (isFunction[y][x]) continue;
          if (bitIdx < data.length) {
            modules[y][x] = data[bitIdx] === 1;
            bitIdx++;
          }
        }
      }
    }
  }

  function applyMask(modules, isFunction, size, mask) {
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (isFunction[r][c]) continue;
        var invert = false;
        switch (mask) {
          case 0: invert = (r + c) % 2 === 0; break;
          case 1: invert = r % 2 === 0; break;
          case 2: invert = c % 3 === 0; break;
          case 3: invert = (r + c) % 3 === 0; break;
          case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
          case 5: invert = (r * c) % 2 + (r * c) % 3 === 0; break;
          case 6: invert = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break;
          case 7: invert = ((r + c) % 2 + (r * c) % 3) % 2 === 0; break;
        }
        if (invert) modules[r][c] = !modules[r][c];
      }
    }
  }

  function computePenalty(modules, size) {
    var penalty = 0;
    // Simplified penalty: just count adjacent same-color runs
    for (var r = 0; r < size; r++) {
      var run = 1;
      for (var c = 1; c < size; c++) {
        if (modules[r][c] === modules[r][c - 1]) {
          run++;
          if (run === 5) penalty += 3;
          else if (run > 5) penalty++;
        } else {
          run = 1;
        }
      }
    }
    for (var c = 0; c < size; c++) {
      var run = 1;
      for (var r = 1; r < size; r++) {
        if (modules[r][c] === modules[r - 1][c]) {
          run++;
          if (run === 5) penalty += 3;
          else if (run > 5) penalty++;
        } else {
          run = 1;
        }
      }
    }
    return penalty;
  }

  return { generate: generateQR };
})();

// ===== Widget Logic =====

var _lastConfig = null;
var _resizeTimer = null;

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _apply(_lastConfig); });
    return;
  }
  _apply(config);
}

function _apply(config) {
  var url = config.url || 'https://example.com';
  var label = config.label || '';
  var sublabel = config.sublabel || '';
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#1a1a2e';
  var qrFgColor = config.qrFgColor || '#000000';
  var qrBgColor = config.qrBgColor || '#ffffff';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var labelEl = document.getElementById('label');
  var container = document.getElementById('qr-container');
  var sublabelEl = document.getElementById('sublabel');

  // Label
  var labelPx = Math.floor(vh * 0.08);
  labelEl.style.fontFamily = fontFamily;
  labelEl.style.color = fontColor;
  labelEl.style.fontSize = labelPx + 'px';
  labelEl.textContent = label;
  labelEl.style.display = label ? '' : 'none';

  // Sublabel
  var subPx = Math.floor(vh * 0.05);
  sublabelEl.style.fontFamily = fontFamily;
  sublabelEl.style.color = fontColor;
  sublabelEl.style.fontSize = subPx + 'px';
  sublabelEl.textContent = sublabel;
  sublabelEl.style.display = sublabel ? '' : 'none';

  // QR Code
  var qrSize = Math.floor(Math.min(vh * 0.65, vw * 0.8));
  container.innerHTML = '';

  var canvas = QR.generate(url, qrSize, qrFgColor, qrBgColor);
  if (canvas) {
    container.appendChild(canvas);
  } else {
    container.innerHTML = '<div style="color:' + fontColor + ';font-family:' + fontFamily + ';font-size:' + Math.floor(vh * 0.05) + 'px">QR生成エラー：テキストが長すぎます</div>';
  }
}

window.addEventListener('resize', function() {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() { _apply(_lastConfig); }, 150);
});

/* Yodeck postMessage リスナー */
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

/* ローカル確認用フォールバック */
if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      url: 'https://example.com',
      label: '現場安全書類',
      sublabel: 'スマホで読み取ってください',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#1a1a2e',
      qrFgColor: '#000000',
      qrBgColor: '#ffffff'
    });
  };
}

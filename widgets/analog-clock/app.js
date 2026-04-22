var _lastConfig  = null;
var _rafId       = null;
var _resizeTimer = null;

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function () {
      _start(_lastConfig);
    });
    return;
  }
  _start(config);
}

window.addEventListener('resize', function () {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function () {
    _resizeCanvas();
  }, 150);
});

function _resizeCanvas() {
  var canvas = document.getElementById('clock-canvas');
  var size   = Math.min(window.innerWidth, window.innerHeight);
  canvas.width  = size;
  canvas.height = size;
}

function _start(config) {
  var bgColor = config.bgColor || '#000000';
  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  _resizeCanvas();

  if (_rafId) cancelAnimationFrame(_rafId);

  function loop() {
    _draw(config);
    _rafId = requestAnimationFrame(loop);
  }
  loop();
}

function _draw(config) {
  var canvas  = document.getElementById('clock-canvas');
  var ctx     = canvas.getContext('2d');
  var size    = canvas.width;
  var cx      = size / 2;
  var cy      = size / 2;
  var r       = size * 0.44;  // 文字盤半径

  var style          = config.style          || 'classic';
  var showSeconds    = config.showSeconds    === '1' || config.showSeconds    === true;
  var faceColor      = config.faceColor      || '#ffffff';
  var handColor      = config.handColor      || '#000000';
  var secondHandColor= config.secondHandColor|| '#ff0000';
  var showNumbers    = config.showNumbers    === '1' || config.showNumbers    === true;

  ctx.clearRect(0, 0, size, size);

  // ---- 文字盤（円） ----
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = faceColor;
  ctx.fill();

  // 文字盤の縁
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = handColor;
  ctx.lineWidth   = size * 0.012;
  ctx.stroke();

  // ---- 目盛り（classicのみ） ----
  if (style === 'classic') {
    for (var i = 0; i < 60; i++) {
      var angle   = (i / 60) * Math.PI * 2 - Math.PI / 2;
      var isHour  = i % 5 === 0;
      var tickLen = isHour ? r * 0.12 : r * 0.05;
      var tickW   = isHour ? size * 0.010 : size * 0.005;
      var x1 = cx + Math.cos(angle) * r;
      var y1 = cy + Math.sin(angle) * r;
      var x2 = cx + Math.cos(angle) * (r - tickLen);
      var y2 = cy + Math.sin(angle) * (r - tickLen);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = handColor;
      ctx.lineWidth   = tickW;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  } else {
    // minimal: 12個の短い目盛りだけ
    for (var i = 0; i < 12; i++) {
      var angle   = (i / 12) * Math.PI * 2 - Math.PI / 2;
      var tickLen = r * 0.08;
      var x1 = cx + Math.cos(angle) * r;
      var y1 = cy + Math.sin(angle) * r;
      var x2 = cx + Math.cos(angle) * (r - tickLen);
      var y2 = cy + Math.sin(angle) * (r - tickLen);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = handColor;
      ctx.lineWidth   = size * 0.008;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }

  // ---- 数字（12,3,6,9） ----
  if (showNumbers) {
    var numPositions = [
      { n: '12', deg: 0   },
      { n:  '3', deg: 90  },
      { n:  '6', deg: 180 },
      { n:  '9', deg: 270 }
    ];
    var fontSize = Math.floor(r * 0.22);
    ctx.font      = 'bold ' + fontSize + 'px sans-serif';
    ctx.fillStyle = handColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    numPositions.forEach(function (pos) {
      var angle  = (pos.deg - 90) * Math.PI / 180;
      var dist   = r * 0.72;
      var nx     = cx + Math.cos(angle) * dist;
      var ny     = cy + Math.sin(angle) * dist;
      ctx.fillText(pos.n, nx, ny);
    });
  }

  // ---- 現在時刻 ----
  var now     = new Date();
  var hours   = now.getHours() % 12;
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();
  var ms      = now.getMilliseconds();

  // 秒針スムーズ補間
  var secFrac = seconds + ms / 1000;
  var minFrac = minutes + secFrac / 60;
  var hrFrac  = hours   + minFrac / 60;

  // ---- 時針 ----
  var hourAngle = (hrFrac / 12) * Math.PI * 2 - Math.PI / 2;
  _drawHand(ctx, cx, cy, hourAngle, r * 0.55, size * 0.030, handColor);

  // ---- 分針 ----
  var minAngle = (minFrac / 60) * Math.PI * 2 - Math.PI / 2;
  _drawHand(ctx, cx, cy, minAngle, r * 0.80, size * 0.018, handColor);

  // ---- 秒針 ----
  if (showSeconds) {
    var secAngle = (secFrac / 60) * Math.PI * 2 - Math.PI / 2;
    // 秒針：細く、少し逆方向に伸ばす
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(secAngle + Math.PI) * r * 0.20,
      cy + Math.sin(secAngle + Math.PI) * r * 0.20
    );
    ctx.lineTo(
      cx + Math.cos(secAngle) * r * 0.88,
      cy + Math.sin(secAngle) * r * 0.88
    );
    ctx.strokeStyle = secondHandColor;
    ctx.lineWidth   = size * 0.008;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  // ---- 中心の丸 ----
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.022, 0, Math.PI * 2);
  ctx.fillStyle = handColor;
  ctx.fill();

  if (showSeconds) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = secondHandColor;
    ctx.fill();
  }
}

function _drawHand(ctx, cx, cy, angle, length, width, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(angle) * length,
    cy + Math.sin(angle) * length
  );
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

/* Yodeck postMessage リスナー */
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function (fn) {
    if (fn.fname === 'init_widget' && fn.data) {
      init_widget(fn.data);
    }
  });
});

/* ローカル確認用フォールバック */
if (window.location.protocol === 'file:') {
  window.onload = function () {
    init_widget({
      style:           'classic',
      showSeconds:     '1',
      faceColor:       '#ffffff',
      handColor:       '#000000',
      secondHandColor: '#ff0000',
      bgColor:         '#1a1a2e',
      showNumbers:     '1'
    });
  };
}

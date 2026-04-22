var _lastConfig = null;
var _tickTimer = null;
var _resizeTimer = null;

// State
var _phase = 'work'; // 'work' or 'break'
var _remaining = 0;   // seconds remaining
var _total = 0;        // total seconds for current phase
var _cycle = 1;
var _maxCycles = 0;

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
  var workMin = parseInt(config.workMinutes) || 25;
  var breakMin = parseInt(config.breakMinutes) || 5;
  _maxCycles = parseInt(config.maxCycles) || 0;

  _phase = 'work';
  _cycle = 1;
  _total = workMin * 60;
  _remaining = _total;

  _applyStyles(config);

  if (_tickTimer) clearInterval(_tickTimer);
  _render(config);
  _tickTimer = setInterval(function() { _tick(config); }, 1000);
}

function _tick(config) {
  _remaining--;

  if (_remaining <= 0) {
    var workMin = parseInt(config.workMinutes) || 25;
    var breakMin = parseInt(config.breakMinutes) || 5;

    if (_phase === 'work') {
      _phase = 'break';
      _total = breakMin * 60;
      _remaining = _total;
    } else {
      _cycle++;
      if (_maxCycles > 0 && _cycle > _maxCycles) {
        _cycle = 1; // loop
      }
      _phase = 'work';
      _total = workMin * 60;
      _remaining = _total;
    }
  }

  _render(config);
}

function _render(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var workColor = config.workColor || '#e94560';
  var breakColor = config.breakColor || '#4ade80';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  var phaseLabel = document.getElementById('phase-label');
  var timerDisplay = document.getElementById('timer-display');
  var cycleInfo = document.getElementById('cycle-info');
  var canvas = document.getElementById('ring');

  var activeColor = _phase === 'work' ? workColor : breakColor;
  var phaseText = _phase === 'work' ? '集中タイム' : '休憩タイム';

  // Font sizes
  var labelPx = Math.floor(vh * 0.07);
  var timerPx = Math.floor(vh * 0.14);
  var cyclePx = Math.floor(vh * 0.04);

  phaseLabel.textContent = phaseText;
  phaseLabel.style.fontFamily = fontFamily;
  phaseLabel.style.color = activeColor;
  phaseLabel.style.fontSize = labelPx + 'px';
  phaseLabel.style.fontWeight = 'bold';

  // Time display
  var mins = Math.floor(_remaining / 60);
  var secs = _remaining % 60;
  timerDisplay.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  timerDisplay.style.fontFamily = fontFamily;
  timerDisplay.style.color = fontColor;
  timerDisplay.style.fontSize = timerPx + 'px';
  timerDisplay.style.fontWeight = 'bold';

  // Cycle info
  var cycleText = 'サイクル ' + _cycle;
  if (_maxCycles > 0) cycleText += ' / ' + _maxCycles;
  cycleInfo.textContent = cycleText;
  cycleInfo.style.fontFamily = fontFamily;
  cycleInfo.style.color = fontColor;
  cycleInfo.style.fontSize = cyclePx + 'px';

  // Draw ring
  var ringSize = Math.floor(Math.min(vh * 0.45, vw * 0.45));
  canvas.width = ringSize;
  canvas.height = ringSize;
  canvas.style.width = ringSize + 'px';
  canvas.style.height = ringSize + 'px';

  var ctx = canvas.getContext('2d');
  var cx = ringSize / 2;
  var cy = ringSize / 2;
  var radius = ringSize / 2 - ringSize * 0.08;
  var lineWidth = ringSize * 0.06;

  ctx.clearRect(0, 0, ringSize, ringSize);

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Progress ring
  var progress = 1 - (_remaining / _total);
  var startAngle = -Math.PI / 2;
  var endAngle = startAngle + (Math.PI * 2 * progress);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = activeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function _applyStyles(config) {
  var bgColor = config.bgColor || '#000000';
  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;
  _render(config);
}

window.addEventListener('resize', function() {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() { _applyStyles(_lastConfig); }, 150);
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
      workMinutes: '25',
      breakMinutes: '5',
      maxCycles: '4',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#000000',
      workColor: '#e94560',
      breakColor: '#4ade80'
    });
  };
}

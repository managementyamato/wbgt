var _lastConfig = null;
var _rotateTimer = null;
var _resizeTimer = null;
var _currentIndex = 0;
var _slogans = [];

var DEFAULT_SLOGANS = [
  '安全第一！今日も無事故で帰ろう',
  'ヘルメット・安全帯の着用を確認！',
  '指差し確認ヨシ！',
  '急ぐ仕事ほど安全確認',
  'ひとりひとりが安全管理者',
  '危険予知は全員参加で',
  '整理整頓は安全の基本',
  '高所作業は安全帯必着'
];

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _apply(_lastConfig); });
    return;
  }
  _apply(config);
}

function _parseSlogans(config) {
  var text = config.slogans || '';
  if (!text.trim()) return DEFAULT_SLOGANS;
  // 改行区切りで分割
  var lines = text.split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line) result.push(line);
  }
  return result.length > 0 ? result : DEFAULT_SLOGANS;
}

function _apply(config) {
  _slogans = _parseSlogans(config);
  _currentIndex = 0;
  _applyStyles(config);

  if (_rotateTimer) clearInterval(_rotateTimer);
  _showSlogan(config);

  var interval = parseInt(config.interval) || 10;
  _rotateTimer = setInterval(function() {
    _fadeOut(function() {
      _currentIndex = (_currentIndex + 1) % _slogans.length;
      _showSlogan(config);
      _fadeIn();
    });
  }, interval * 1000);
}

function _showSlogan(config) {
  var sloganEl = document.getElementById('slogan');
  var counterEl = document.getElementById('counter');

  sloganEl.textContent = _slogans[_currentIndex];

  var showCounter = config.showCounter !== '0';
  if (showCounter && _slogans.length > 1) {
    counterEl.textContent = (_currentIndex + 1) + ' / ' + _slogans.length;
    counterEl.style.display = '';
  } else {
    counterEl.style.display = 'none';
  }
}

function _fadeOut(callback) {
  var el = document.getElementById('slogan');
  el.style.opacity = '0';
  setTimeout(callback, 800);
}

function _fadeIn() {
  var el = document.getElementById('slogan');
  el.style.opacity = '1';
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#1a472a';
  var bold = config.bold === '1';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var sloganEl = document.getElementById('slogan');
  var counterEl = document.getElementById('counter');

  // スローガンの文字数に応じてフォントサイズ調整
  var maxLen = 0;
  for (var i = 0; i < _slogans.length; i++) {
    if (_slogans[i].length > maxLen) maxLen = _slogans[i].length;
  }

  var sloganPx = Math.floor(vh * 0.25);
  // 長いテキストの場合は横幅に合わせて縮小
  var maxByWidth = Math.floor(vw * 0.9 / Math.max(maxLen, 1));
  if (sloganPx > maxByWidth) sloganPx = maxByWidth;
  // 最小サイズ保証
  if (sloganPx < 16) sloganPx = 16;

  var counterPx = Math.floor(vh * 0.05);

  sloganEl.style.fontFamily = fontFamily;
  sloganEl.style.color = fontColor;
  sloganEl.style.fontSize = sloganPx + 'px';
  sloganEl.style.fontWeight = bold ? 'bold' : 'normal';

  counterEl.style.fontFamily = fontFamily;
  counterEl.style.color = fontColor;
  counterEl.style.fontSize = counterPx + 'px';
}

window.addEventListener('resize', function() {
  if (!_lastConfig) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() {
    _slogans = _parseSlogans(_lastConfig);
    _applyStyles(_lastConfig);
  }, 150);
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
      slogans: '',
      interval: '8',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#1a472a',
      bold: '1',
      showCounter: '1'
    });
  };
}

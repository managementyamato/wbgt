var _lastConfig = null;
var _rotateTimer = null;
var _resizeTimer = null;
var _currentIndex = 0;
var _quotes = [];

var DEFAULT_QUOTES = [
  { text: '為せば成る、為さねば成らぬ何事も', author: '上杉鷹山' },
  { text: '継続は力なり', author: 'ことわざ' },
  { text: '千里の道も一歩から', author: '老子' },
  { text: '失敗は成功のもと', author: 'ことわざ' },
  { text: '初心忘るべからず', author: '世阿弥' },
  { text: '七転び八起き', author: 'ことわざ' },
  { text: '石の上にも三年', author: 'ことわざ' },
  { text: '一期一会', author: '井伊直弼' },
  { text: '塵も積もれば山となる', author: 'ことわざ' },
  { text: '急がば回れ', author: 'ことわざ' },
  { text: '明日は明日の風が吹く', author: 'ことわざ' },
  { text: '人生に近道なし', author: 'ことわざ' },
  { text: '努力は必ず報われる', author: '王貞治' },
  { text: '天才とは1%のひらめきと99%の努力である', author: 'トーマス・エジソン' },
  { text: '今日できることを明日に延ばすな', author: 'ベンジャミン・フランクリン' },
  { text: '小さいことを重ねることがとんでもないところに行くただひとつの道', author: 'イチロー' },
  { text: '夢は逃げない。逃げるのはいつも自分だ', author: '高橋歩' },
  { text: '行動は言葉より雄弁である', author: 'エイブラハム・リンカーン' },
  { text: '挑戦しなければ何も始まらない', author: 'ことわざ' },
  { text: '笑顔は最高のおもてなし', author: 'ことわざ' }
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

function _parseCustomQuotes(text) {
  if (!text || !text.trim()) return [];
  var lines = text.split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    // 「名言 - 著者」形式をパース
    var dashIdx = line.lastIndexOf(' - ');
    if (dashIdx > 0) {
      result.push({ text: line.substring(0, dashIdx).trim(), author: line.substring(dashIdx + 3).trim() });
    } else {
      result.push({ text: line, author: '' });
    }
  }
  return result;
}

function _apply(config) {
  var custom = _parseCustomQuotes(config.customQuotes || '');
  _quotes = custom.length > 0 ? custom : DEFAULT_QUOTES;

  // シャッフルするかどうか
  if (config.shuffle === '1') {
    _quotes = _shuffleArray(_quotes.slice());
  }

  _currentIndex = 0;
  _applyStyles(config);

  if (_rotateTimer) clearInterval(_rotateTimer);
  _showQuote();

  var interval = parseInt(config.interval) || 15;
  _rotateTimer = setInterval(function() {
    _fadeOut(function() {
      _currentIndex = (_currentIndex + 1) % _quotes.length;
      _showQuote();
      _fadeIn();
    });
  }, interval * 1000);
}

function _shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function _showQuote() {
  var q = _quotes[_currentIndex];
  document.getElementById('quote').textContent = q.text;
  var authorEl = document.getElementById('author');
  if (q.author) {
    authorEl.textContent = '— ' + q.author;
    authorEl.style.display = '';
  } else {
    authorEl.style.display = 'none';
  }
}

function _fadeOut(callback) {
  var quoteEl = document.getElementById('quote');
  var authorEl = document.getElementById('author');
  quoteEl.style.opacity = '0';
  authorEl.style.opacity = '0';
  setTimeout(callback, 1000);
}

function _fadeIn() {
  var quoteEl = document.getElementById('quote');
  var authorEl = document.getElementById('author');
  quoteEl.style.opacity = '1';
  authorEl.style.opacity = '0.65';
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#1a1a2e';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var quoteEl = document.getElementById('quote');
  var authorEl = document.getElementById('author');

  // 最長テキストに合わせてフォントサイズ調整
  var maxLen = 0;
  for (var i = 0; i < _quotes.length; i++) {
    if (_quotes[i].text.length > maxLen) maxLen = _quotes[i].text.length;
  }

  var quotePx = Math.floor(vh * 0.18);
  var maxByWidth = Math.floor(vw * 0.88 / Math.max(Math.ceil(Math.sqrt(maxLen)), 1));
  if (quotePx > maxByWidth) quotePx = maxByWidth;
  if (quotePx < 14) quotePx = 14;

  var authorPx = Math.floor(quotePx * 0.45);
  if (authorPx < 12) authorPx = 12;

  quoteEl.style.fontFamily = fontFamily;
  quoteEl.style.color = fontColor;
  quoteEl.style.fontSize = quotePx + 'px';

  authorEl.style.fontFamily = fontFamily;
  authorEl.style.color = fontColor;
  authorEl.style.fontSize = authorPx + 'px';
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
      customQuotes: '',
      interval: '10',
      shuffle: '1',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#1a1a2e'
    });
  };
}

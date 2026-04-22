var _lastConfig = null;
var _resizeTimer = null;

var ICON_MAP = {
  'none':    '',
  'info':    '\u2139\uFE0F',
  'warning': '\u26A0\uFE0F',
  'danger':  '\u{1F6A8}',
  'check':   '\u2705',
  'star':    '\u2B50',
  'fire':    '\u{1F525}',
  'party':   '\u{1F389}',
  'mega':    '\u{1F4E2}',
  'bell':    '\u{1F514}',
  'clock':   '\u{23F0}',
  'heart':   '\u2764\uFE0F',
  'helmet':  '\u26D1\uFE0F',
  'tools':   '\u{1F6E0}\uFE0F'
};

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
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#e94560';
  var title = config.title || 'お知らせ';
  var subtitle = config.subtitle || '';
  var iconKey = config.icon || 'mega';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var iconEl = document.getElementById('icon');
  var titleEl = document.getElementById('title');
  var subtitleEl = document.getElementById('subtitle');

  // Icon
  var iconText = ICON_MAP[iconKey] || '';
  var iconPx = Math.floor(vh * 0.2);
  iconEl.textContent = iconText;
  iconEl.style.fontSize = iconPx + 'px';
  iconEl.style.display = iconText ? '' : 'none';

  // Title
  var titleLen = title.length || 1;
  var titlePx = Math.floor(vh * 0.18);
  var maxByWidth = Math.floor(vw * 0.9 / Math.max(titleLen * 0.6, 1));
  if (titlePx > maxByWidth) titlePx = maxByWidth;
  if (titlePx < 16) titlePx = 16;

  titleEl.textContent = title;
  titleEl.style.fontFamily = fontFamily;
  titleEl.style.color = fontColor;
  titleEl.style.fontSize = titlePx + 'px';

  // Subtitle
  if (subtitle) {
    var subLen = subtitle.length || 1;
    var subPx = Math.floor(titlePx * 0.45);
    var maxSubW = Math.floor(vw * 0.9 / Math.max(subLen * 0.55, 1));
    if (subPx > maxSubW) subPx = maxSubW;
    if (subPx < 12) subPx = 12;

    subtitleEl.textContent = subtitle;
    subtitleEl.style.fontFamily = fontFamily;
    subtitleEl.style.color = fontColor;
    subtitleEl.style.fontSize = subPx + 'px';
    subtitleEl.style.display = '';
  } else {
    subtitleEl.style.display = 'none';
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
      title: '本日13:00より安全大会',
      subtitle: '全員参加必須・ヘルメット持参',
      icon: 'mega',
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#e94560'
    });
  };
}

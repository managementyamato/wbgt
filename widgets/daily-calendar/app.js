var _lastConfig = null;
var _tickTimer = null;
var _resizeTimer = null;

var DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// 六曜計算（簡易版：旧暦近似）
function _getRokuyo(date) {
  // 簡易旧暦計算（Zeller的近似）
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  // 簡易的な六曜計算：(月+日)%6
  // より正確にするため旧暦テーブルの近似を使用
  var base = new Date(y, 0, 1);
  var diff = Math.floor((date - base) / 86400000);
  var idx = (m + d) % 6;
  var names = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
  return names[idx];
}

function _pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

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
  _applyStyles(config);
  if (_tickTimer) clearInterval(_tickTimer);
  _tick(config);
  // 1分ごとに更新（日付が変わる可能性）
  _tickTimer = setInterval(function() { _tick(config); }, 60000);
}

function _tick(config) {
  var now = new Date();
  var monthEl = document.getElementById('month');
  var dateEl = document.getElementById('date');
  var dayEl = document.getElementById('dayname');
  var rokuyoEl = document.getElementById('rokuyo');
  var remainEl = document.getElementById('remaining');

  var yyyy = now.getFullYear();
  var mm = now.getMonth() + 1;
  var dd = now.getDate();
  var dayIdx = now.getDay();

  monthEl.textContent = yyyy + '年' + mm + '月';
  dateEl.textContent = dd;
  dayEl.textContent = DAY_NAMES[dayIdx] + '曜日';

  var showRokuyo = config.showRokuyo !== '0';
  if (showRokuyo) {
    rokuyoEl.textContent = _getRokuyo(now);
    rokuyoEl.style.display = '';
  } else {
    rokuyoEl.style.display = 'none';
  }

  // 残工期表示
  var endDate = config.endDate;
  if (endDate) {
    var end = new Date(endDate + 'T00:00:00');
    var today = new Date(yyyy, now.getMonth(), dd);
    var diffDays = Math.ceil((end - today) / 86400000);
    if (diffDays >= 0) {
      remainEl.textContent = '残工期 ' + diffDays + ' 日';
    } else {
      remainEl.textContent = '工期終了';
    }
    remainEl.style.display = '';
  } else {
    remainEl.style.display = 'none';
  }
}

function _applyStyles(config) {
  var fontFamily = config.fontFamily || 'keifont, sans-serif';
  var fontColor = config.fontColor || '#ffffff';
  var bgColor = config.bgColor || '#1a1a2e';
  var accentColor = config.accentColor || '#e94560';

  var vh = window.innerHeight || 720;
  var vw = window.innerWidth || 1280;

  document.body.style.backgroundColor = bgColor;
  document.documentElement.style.backgroundColor = bgColor;

  var monthEl = document.getElementById('month');
  var dateEl = document.getElementById('date');
  var dayEl = document.getElementById('dayname');
  var rokuyoEl = document.getElementById('rokuyo');
  var remainEl = document.getElementById('remaining');

  var monthPx = Math.floor(vh * 0.10);
  var datePx = Math.floor(vh * 0.45);
  var dayPx = Math.floor(vh * 0.10);
  var rokuyoPx = Math.floor(vh * 0.08);
  var remainPx = Math.floor(vh * 0.07);

  // 横幅制限
  var maxW = Math.floor(vw * 0.9);
  if (datePx * 2.5 > maxW) datePx = Math.floor(maxW / 2.5);

  monthEl.style.fontFamily = fontFamily;
  monthEl.style.color = fontColor;
  monthEl.style.fontSize = monthPx + 'px';

  dateEl.style.fontFamily = fontFamily;
  dateEl.style.color = accentColor;
  dateEl.style.fontSize = datePx + 'px';
  dateEl.style.fontWeight = 'bold';

  dayEl.style.fontFamily = fontFamily;
  dayEl.style.color = fontColor;
  dayEl.style.fontSize = dayPx + 'px';

  rokuyoEl.style.fontFamily = fontFamily;
  rokuyoEl.style.color = fontColor;
  rokuyoEl.style.fontSize = rokuyoPx + 'px';
  rokuyoEl.style.opacity = '0.7';

  remainEl.style.fontFamily = fontFamily;
  remainEl.style.color = accentColor;
  remainEl.style.fontSize = remainPx + 'px';
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
      fontFamily: 'keifont, sans-serif',
      fontColor: '#ffffff',
      bgColor: '#1a1a2e',
      accentColor: '#e94560',
      showRokuyo: '1',
      endDate: ''
    });
  };
}

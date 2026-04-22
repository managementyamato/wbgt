// ===================== 日の出・日の入りタイマー v1 =====================
//
// shared/location.js で現在地を解決し、NOAA 簡易アルゴリズムで
// 日の出・日の入り時刻をオフライン計算する。
//
// 表示:
//   ・今日の日の出時刻
//   ・今日の日の入り時刻
//   ・次のイベント（日没 or 日の出）までのカウントダウン
//   ・日の出→日の入りの進行バー（日中のみ）
//   ・現在地名
//
// 計算は1分ごと、表示更新は1秒ごと。

var _config = null;
var _loc = null;      // {lat, lng, source, displayName}
var _sunData = null;  // {sunrise:Date, sunset:Date, nextSunrise:Date, date: 'YYYY-MM-DD'}
var _tickInterval = null;
var _calcInterval = null;

function init_widget(config) {
  if (!config) return;
  _config = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', _start);
    return;
  }
  _start();
}

document.addEventListener('DOMContentLoaded', function() {
  // ローカルフォールバック: 設定が来なければauto取得で動作
  if (!_config) {
    _config = { locationMode: 'auto' };
    _start();
  }
});

function _start() {
  _applyTheme(_config);
  if (!window.GenbaLocation) {
    _showError('位置情報モジュール未ロード');
    return;
  }
  GenbaLocation.resolve(_config, function(loc) {
    _loc = loc || GenbaLocation.FALLBACK;
    _recalcSun();
    _showMain();
    _updateDisplay();
    // 1秒ごと表示更新
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(_updateDisplay, 1000);
    // 15分ごと日付またぎ＆再計算
    if (_calcInterval) clearInterval(_calcInterval);
    _calcInterval = setInterval(_recalcSun, 15 * 60 * 1000);
  });
}

function _applyTheme(cfg) {
  var theme  = (cfg.theme || 'dusk').toLowerCase();
  var accent = cfg.accent || 'orange';

  var themes = {
    dusk:  { bg: '#0d1628', fg: '#f5f5f5', sub: '#9bb0c9' },
    dawn:  { bg: '#1a1530', fg: '#f5f5f5', sub: '#c29bc9' },
    navy:  { bg: '#003366', fg: '#ffffff', sub: '#9bc2e0' },
    black: { bg: '#000000', fg: '#ffffff', sub: '#888888' },
    white: { bg: '#ffffff', fg: '#111111', sub: '#666666' }
  };
  var accents = {
    orange: '#ff9a3c',
    yellow: '#ffd84d',
    cyan:   '#44ccff',
    white:  '#ffffff',
    red:    '#ff6b6b'
  };
  var t = themes[theme] || themes.dusk;
  var a = accents[accent] || accents.orange;

  var root = document.documentElement.style;
  root.setProperty('--bg', t.bg);
  root.setProperty('--fg', t.fg);
  root.setProperty('--sub', t.sub);
  root.setProperty('--accent', a);
}

function _showError(msg) {
  var el = document.getElementById('loading');
  if (el) el.textContent = msg;
}

function _showMain() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('times').style.display = '';
  document.getElementById('countdown').style.display = '';
  document.getElementById('footer').style.display = '';
}

// ---------- 日の出・日の入り計算（NOAA / Wikipedia 簡易版） ----------
// 精度: 一般緯度で ±1 分程度。極域は polar day/night を検出して null 返し。
// 参考: https://en.wikipedia.org/wiki/Sunrise_equation
function _calcSun(lat, lng, date) {
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }

  // 対象日（UTC 0時）の Julian Date
  var Y = date.getUTCFullYear();
  var M = date.getUTCMonth() + 1;
  var D = date.getUTCDate();
  if (M <= 2) { Y--; M += 12; }
  var A = Math.floor(Y / 100);
  var B = 2 - A + Math.floor(A / 4);
  var JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;

  // 経度は west positive 規約（東経なら負）
  var lw = -lng;

  // 近傍日の Julian Cycle 整数 n を求める（これが抜けてると solar noon がずれる）
  var n = Math.round(JD - 2451545.0 - 0.0009 - lw / 360);

  // 平均太陽正午（days since J2000）
  var J_star = n + 0.0009 + lw / 360;

  var M_sun = (357.5291 + 0.98560028 * J_star) % 360;
  if (M_sun < 0) M_sun += 360;
  var M_rad = toRad(M_sun);

  var C = 1.9148 * Math.sin(M_rad) + 0.0200 * Math.sin(2 * M_rad) + 0.0003 * Math.sin(3 * M_rad);

  var lambda = (M_sun + C + 180 + 102.9372) % 360;
  if (lambda < 0) lambda += 360;
  var lambda_rad = toRad(lambda);

  // 太陽南中時刻（絶対 JD）
  var J_transit = 2451545.0 + J_star + 0.0053 * Math.sin(M_rad) - 0.0069 * Math.sin(2 * lambda_rad);

  var sinDec = Math.sin(lambda_rad) * Math.sin(toRad(23.4397));
  var dec = Math.asin(sinDec);

  var lat_rad = toRad(lat);
  // 日の出／日の入りは大気差を含め高度 -0.833°（=-50'）基準
  var cosH = (Math.sin(toRad(-0.833)) - Math.sin(lat_rad) * sinDec) / (Math.cos(lat_rad) * Math.cos(dec));

  if (cosH > 1) return { sunrise: null, sunset: null, polarNight: true };
  if (cosH < -1) return { sunrise: null, sunset: null, polarDay: true };

  var H = toDeg(Math.acos(cosH));

  var J_sunset  = J_transit + H / 360;
  var J_sunrise = J_transit - H / 360;

  function jdToDate(jd) {
    var ms = (jd - 2440587.5) * 86400 * 1000;
    return new Date(ms);
  }

  return {
    sunrise:   jdToDate(J_sunrise),
    sunset:    jdToDate(J_sunset),
    solarNoon: jdToDate(J_transit)
  };
}

function _recalcSun() {
  if (!_loc) return;
  var now = new Date();
  var today = _calcSun(_loc.lat, _loc.lng, now);
  // 翌日の日の出も用意（夜間カウントダウン用）
  var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  var tmr = _calcSun(_loc.lat, _loc.lng, tomorrow);

  _sunData = {
    sunrise: today.sunrise,
    sunset:  today.sunset,
    nextSunrise: tmr.sunrise,
    polarDay:    today.polarDay,
    polarNight:  today.polarNight,
    dateKey: now.toISOString().slice(0, 10)
  };
}

// ---------- 表示更新 ----------
function _fmtHM(d) {
  if (!d) return '--:--';
  return _pad(d.getHours()) + ':' + _pad(d.getMinutes());
}
function _pad(n) { return (n < 10 ? '0' : '') + n; }

function _updateDisplay() {
  if (!_sunData || !_loc) return;

  var now = new Date();

  // 日付またぎをセルフケア
  if (now.toISOString().slice(0, 10) !== _sunData.dateKey) _recalcSun();

  // 時刻表示
  document.getElementById('sunrise').textContent = _fmtHM(_sunData.sunrise);
  document.getElementById('sunset').textContent  = _fmtHM(_sunData.sunset);

  // カウントダウン & 進行バー
  var cdLabel = document.getElementById('cd-label');
  var cdH     = document.getElementById('cd-h');
  var cdM     = document.getElementById('cd-m');
  var cdSub   = document.getElementById('cd-sub');
  var progEl  = document.getElementById('progress');

  if (_sunData.polarDay) {
    cdLabel.textContent = '白夜';
    cdH.textContent = '--'; cdM.textContent = '--';
    progEl.style.width = '100%';
  } else if (_sunData.polarNight) {
    cdLabel.textContent = '極夜';
    cdH.textContent = '--'; cdM.textContent = '--';
    progEl.style.width = '0%';
  } else {
    var target, label, progress;
    if (now < _sunData.sunrise) {
      // 早朝（日の出前）
      target = _sunData.sunrise;
      label  = '日の出まで';
      progress = 0;
    } else if (now < _sunData.sunset) {
      // 日中
      target = _sunData.sunset;
      label  = '日没まで';
      var dayLen = _sunData.sunset - _sunData.sunrise;
      progress = ((now - _sunData.sunrise) / dayLen) * 100;
    } else {
      // 夜（日没後）
      target = _sunData.nextSunrise;
      label  = '日の出まで';
      progress = 100;
    }
    var diffMs = target - now;
    var diffMin = Math.max(0, Math.floor(diffMs / 60000));
    cdLabel.textContent = label;
    cdH.textContent = Math.floor(diffMin / 60);
    cdM.textContent = _pad(diffMin % 60);
    progEl.style.width = Math.max(0, Math.min(100, progress)) + '%';
  }

  cdSub.textContent = '現在 ' + _fmtHM(now);

  // 現在地名
  document.getElementById('loc-name').textContent = _loc.displayName || '不明';
  var srcTag = '';
  if (_loc.source === 'manual')          srcTag = '(座標指定)';
  else if (_loc.source === 'prefecture') srcTag = '(都道府県)';
  else if (_loc.source === 'geocoded')   srcTag = '(住所)';
  else if (_loc.source === 'ip')         srcTag = '(IP推定)';
  else if (_loc.source === 'fallback')   srcTag = '(フォールバック)';
  else if (typeof _loc.source === 'string' && _loc.source.indexOf('cache') === 0) srcTag = '(キャッシュ)';
  document.getElementById('loc-source').textContent = srcTag;
}

// ---------- Yodeck postMessage ----------
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (!msg || !msg.functions) return;
  msg.functions.forEach(function(fn) {
    if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
  });
});

// ---------- ローカル file:// プレビュー用 ----------
if (window.location.protocol === 'file:') {
  window.onload = function() {
    init_widget({
      locationMode: 'auto',
      theme:  'dusk',
      accent: 'orange'
    });
  };
}

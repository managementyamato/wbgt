// ===================== 現場天気予報（Open-Meteo） =====================
// 住所 → 国土地理院ジオコーダー → Open-Meteo API で天気取得
// APIキー不要・完全無料

var WMO_CODES = {
  0:'快晴', 1:'晴れ', 2:'一部曇り', 3:'曇り',
  45:'霧', 48:'霧氷',
  51:'霧雨(弱)', 53:'霧雨', 55:'霧雨(強)',
  61:'小雨', 63:'雨', 65:'大雨',
  71:'小雪', 73:'雪', 75:'大雪', 77:'霙',
  80:'にわか雨', 81:'にわか雨(中)', 82:'にわか雨(強)',
  85:'にわか雪', 86:'にわか雪(強)',
  95:'雷雨', 96:'雷雨＋霰', 99:'雷雨＋大霰'
};

var WMO_ICON = {
  0:'☀️', 1:'☀️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'🌨️', 77:'🌨️',
  80:'🌦️', 81:'🌦️', 82:'⛈️',
  85:'🌨️', 86:'🌨️',
  95:'⛈️', 96:'⛈️', 99:'⛈️'
};

var _timer = null;
var _currentCoords = null;

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

  if (_timer) clearInterval(_timer);

  var address = (config.address || '').trim();
  if (!address) {
    _setError('住所を設定してください');
    return;
  }

  _run(address);
  var mins = parseInt(config.refreshMin || '30', 10);
  _timer = setInterval(function() { _run(address); }, mins * 60 * 1000);

  _startClock();
}

function _run(address) {
  _setLoading('住所を検索中…');
  _geocode(address, function(lat, lon) {
    if (lat === null) {
      _setError('住所が見つかりません');
      return;
    }
    _currentCoords = { lat: lat, lon: lon };
    _setLoading('天気を取得中…');
    _fetchWeather(lat, lon, address);
  });
}

function _geocode(address, callback) {
  var xhr = new XMLHttpRequest();
  var url = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(address);
  xhr.open('GET', url, true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status !== 200) { callback(null, null); return; }
    try {
      var data = JSON.parse(xhr.responseText);
      if (data && data.length > 0) {
        var coords = data[0].geometry.coordinates;
        callback(coords[1], coords[0]);
      } else {
        callback(null, null);
      }
    } catch(e) { callback(null, null); }
  };
  xhr.ontimeout = function() { callback(null, null); };
  xhr.onerror   = function() { callback(null, null); };
  xhr.send();
}

function _fetchWeather(lat, lon, address) {
  var url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + lat.toFixed(4) +
    '&longitude=' + lon.toFixed(4) +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation' +
    '&hourly=temperature_2m,precipitation_probability,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
    '&timezone=Asia/Tokyo' +
    '&forecast_days=3';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.timeout = 15000;
  xhr.onload = function() {
    if (xhr.status !== 200) {
      _setError('天気APIエラー ' + xhr.status);
      return;
    }
    try {
      var data = JSON.parse(xhr.responseText);
      _display(data, address);
    } catch(e) {
      _setError('データ解析エラー');
    }
  };
  xhr.ontimeout = function() { _setError('タイムアウト'); };
  xhr.onerror   = function() { _setError('通信エラー'); };
  xhr.send();
}

function _display(data, address) {
  var cur = data.current || {};
  var daily = data.daily || {};
  var hourly = data.hourly || {};

  var code = cur.weather_code || 0;
  var icon = WMO_ICON[code] || '🌡️';
  var desc = WMO_CODES[code] || '不明';

  // 現在の天気
  var iconEl = document.getElementById('weather-icon');
  var descEl = document.getElementById('weather-desc');
  var tempEl = document.getElementById('current-temp');
  var feelsEl = document.getElementById('feels-like');
  var humiEl  = document.getElementById('humidity');
  var windEl  = document.getElementById('wind-speed');
  var locEl   = document.getElementById('location');

  if (iconEl)  iconEl.textContent  = icon;
  if (descEl)  descEl.textContent  = desc;
  if (tempEl)  tempEl.textContent  = Math.round(cur.temperature_2m || 0) + '°';
  if (feelsEl) feelsEl.textContent = '体感 ' + Math.round(cur.apparent_temperature || 0) + '°';
  if (humiEl)  humiEl.textContent  = '湿度 ' + Math.round(cur.relative_humidity_2m || 0) + '%';
  if (windEl)  windEl.textContent  = '風速 ' + Math.round((cur.wind_speed_10m || 0) * 10) / 10 + 'm/s';
  if (locEl)   locEl.textContent   = address;

  // 背景テーマ
  _setTheme(code);

  // 3日間予報
  var forecastEl = document.getElementById('forecast');
  if (forecastEl && daily.time) {
    forecastEl.innerHTML = '';
    var days = Math.min(daily.time.length, 3);
    for (var i = 0; i < days; i++) {
      var dayCode   = daily.weather_code[i];
      var maxTemp   = Math.round(daily.temperature_2m_max[i]);
      var minTemp   = Math.round(daily.temperature_2m_min[i]);
      var rainProb  = Math.round(daily.precipitation_probability_max[i] || 0);
      var dateStr   = _fmtDay(daily.time[i], i);

      var col = document.createElement('div');
      col.className = 'forecast-col';
      col.innerHTML =
        '<div class="fc-date">' + dateStr + '</div>' +
        '<div class="fc-icon">' + (WMO_ICON[dayCode] || '🌡️') + '</div>' +
        '<div class="fc-temp">' +
          '<span class="fc-max">' + maxTemp + '°</span>' +
          '<span class="fc-min">' + minTemp + '°</span>' +
        '</div>' +
        '<div class="fc-rain">' +
          '<span class="rain-bar-wrap"><span class="rain-bar-fill" style="width:' + rainProb + '%"></span></span>' +
          '<span class="rain-pct">' + rainProb + '%</span>' +
        '</div>';
      forecastEl.appendChild(col);
    }
  }
}

function _setTheme(code) {
  document.body.className = '';
  if (code >= 95) document.body.classList.add('theme-thunder');
  else if (code >= 61) document.body.classList.add('theme-rain');
  else if (code >= 51) document.body.classList.add('theme-drizzle');
  else if (code >= 45) document.body.classList.add('theme-fog');
  else if (code >= 3)  document.body.classList.add('theme-cloudy');
  else                 document.body.classList.add('theme-sunny');
}

function _setLoading(msg) {
  var descEl = document.getElementById('weather-desc');
  var iconEl = document.getElementById('weather-icon');
  if (iconEl)  iconEl.textContent = '⏳';
  if (descEl)  descEl.textContent = msg;
  document.body.className = 'theme-loading';
}

function _setError(msg) {
  var descEl = document.getElementById('weather-desc');
  var iconEl = document.getElementById('weather-icon');
  if (iconEl)  iconEl.textContent = '⚠️';
  if (descEl)  descEl.textContent = msg;
}

function _fmtDay(dateStr, idx) {
  if (idx === 0) return '今日';
  if (idx === 1) return '明日';
  var d = new Date(dateStr);
  var days = ['日','月','火','水','木','金','土'];
  return (d.getMonth()+1) + '/' + d.getDate() + '(' + days[d.getDay()] + ')';
}

function _startClock() {
  _updateClock();
  setInterval(_updateClock, 30000);
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes());
}

function _z(n) { return String(n).padStart(2, '0'); }

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
      address:    '東京都千代田区',
      refreshMin: '30',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

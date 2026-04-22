// ===================== AMeDAS 観測所リスト =====================
var STATIONS = [
  { code:'11016', name:'稚内',    lat:45.4167, lon:141.6833, area:'011000' },
  { code:'12442', name:'旭川',    lat:43.7667, lon:142.3667, area:'012000' },
  { code:'14163', name:'札幌',    lat:43.0608, lon:141.3544, area:'016000' },
  { code:'15041', name:'函館',    lat:41.8167, lon:140.7500, area:'017000' },
  { code:'31312', name:'青森',    lat:40.8222, lon:140.7472, area:'020000' },
  { code:'33472', name:'盛岡',    lat:39.7000, lon:141.1667, area:'030000' },
  { code:'34392', name:'仙台',    lat:38.2667, lon:140.8667, area:'040000' },
  { code:'32402', name:'秋田',    lat:39.7167, lon:140.1000, area:'050000' },
  { code:'35426', name:'山形',    lat:38.2556, lon:140.3389, area:'060000' },
  { code:'36126', name:'福島',    lat:37.7500, lon:140.4667, area:'070000' },
  { code:'40201', name:'水戸',    lat:36.3667, lon:140.4667, area:'080000' },
  { code:'41277', name:'宇都宮',  lat:36.5500, lon:139.8667, area:'090000' },
  { code:'42251', name:'前橋',    lat:36.3833, lon:139.0667, area:'100000' },
  { code:'43056', name:'さいたま',lat:35.8617, lon:139.6453, area:'110000' },
  { code:'45147', name:'千葉',    lat:35.6000, lon:140.1000, area:'120000' },
  { code:'44132', name:'東京',    lat:35.6895, lon:139.6917, area:'130000' },
  { code:'46106', name:'横浜',    lat:35.4500, lon:139.6500, area:'140000' },
  { code:'54232', name:'新潟',    lat:37.9167, lon:139.0500, area:'150000' },
  { code:'55102', name:'富山',    lat:36.7000, lon:137.2167, area:'160000' },
  { code:'56227', name:'金沢',    lat:36.5944, lon:136.6256, area:'170000' },
  { code:'57066', name:'福井',    lat:36.0667, lon:136.2167, area:'180000' },
  { code:'49142', name:'甲府',    lat:35.6667, lon:138.5500, area:'190000' },
  { code:'48331', name:'長野',    lat:36.6500, lon:138.1833, area:'200000' },
  { code:'52586', name:'岐阜',    lat:35.4167, lon:136.7500, area:'210000' },
  { code:'50331', name:'静岡',    lat:34.9833, lon:138.3833, area:'220000' },
  { code:'51106', name:'名古屋',  lat:35.1667, lon:136.9667, area:'230000' },
  { code:'53133', name:'津',      lat:34.7333, lon:136.5167, area:'240000' },
  { code:'60131', name:'彦根',    lat:35.2667, lon:136.2500, area:'250000' },
  { code:'61286', name:'京都',    lat:35.0167, lon:135.7333, area:'260000' },
  { code:'62078', name:'大阪',    lat:34.6833, lon:135.5167, area:'270000' },
  { code:'63518', name:'神戸',    lat:34.6913, lon:135.1830, area:'280000' },
  { code:'64036', name:'奈良',    lat:34.6833, lon:135.8333, area:'290000' },
  { code:'65042', name:'和歌山',  lat:34.2333, lon:135.1667, area:'300000' },
  { code:'69122', name:'鳥取',    lat:35.5000, lon:134.2333, area:'310000' },
  { code:'68132', name:'松江',    lat:35.4667, lon:133.0500, area:'320000' },
  { code:'66408', name:'岡山',    lat:34.6500, lon:133.9167, area:'330000' },
  { code:'67437', name:'広島',    lat:34.3833, lon:132.4500, area:'340000' },
  { code:'81428', name:'下関',    lat:33.9500, lon:130.9333, area:'350000' },
  { code:'71106', name:'徳島',    lat:34.0667, lon:134.5500, area:'360000' },
  { code:'72086', name:'高松',    lat:34.3167, lon:134.0500, area:'370000' },
  { code:'73166', name:'松山',    lat:33.8333, lon:132.7833, area:'380000' },
  { code:'74181', name:'高知',    lat:33.5500, lon:133.5333, area:'390000' },
  { code:'82182', name:'福岡',    lat:33.5833, lon:130.3833, area:'400000' },
  { code:'85142', name:'佐賀',    lat:33.2500, lon:130.3000, area:'410000' },
  { code:'84496', name:'長崎',    lat:32.7333, lon:129.8667, area:'420000' },
  { code:'86141', name:'熊本',    lat:32.8000, lon:130.7000, area:'430000' },
  { code:'83216', name:'大分',    lat:33.2333, lon:131.6167, area:'440000' },
  { code:'87376', name:'宮崎',    lat:31.9333, lon:131.4167, area:'450000' },
  { code:'88317', name:'鹿児島',  lat:31.5667, lon:130.5500, area:'460100' },
  { code:'91197', name:'那覇',    lat:26.2167, lon:127.6833, area:'471000' }
];

// ===================== 最寄り観測所 =====================
function nearestStation(lat, lon) {
  var min = Infinity, nearest = STATIONS[0];
  for (var i = 0; i < STATIONS.length; i++) {
    var s = STATIONS[i];
    var d = (s.lat - lat) * (s.lat - lat) + (s.lon - lon) * (s.lon - lon);
    if (d < min) { min = d; nearest = s; }
  }
  return nearest;
}

function findStationByName(name) {
  for (var i = 0; i < STATIONS.length; i++) {
    if (STATIONS[i].name === name) return STATIONS[i];
  }
  return null;
}

// ===================== 天気コード → テキストアイコン =====================
function weatherIcon(code) {
  var c = parseInt(code, 10);
  if (isNaN(c)) return '－';
  if (c >= 400) return '雪';
  if (c >= 300) return '雨';
  if (c >= 200) return '曇';
  if (c >= 100) return '晴';
  return '－';
}

// ===================== 気象庁 AMeDAS API =====================
function fetchAMeDAS(stationCode, callback) {
  setStatus('気象データ取得中…');
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt', true);
  xhr.timeout = 10000;
  xhr.onload = function () {
    if (xhr.status !== 200) { callback(null, '気象庁API ' + xhr.status); return; }
    var timeStr = xhr.responseText.trim();
    var dt  = new Date(timeStr);
    var mm  = (dt.getMonth() + 1) < 10 ? '0' + (dt.getMonth() + 1) : '' + (dt.getMonth() + 1);
    var dd  = dt.getDate() < 10 ? '0' + dt.getDate() : '' + dt.getDate();
    var hh  = Math.floor(dt.getHours() / 3) * 3;
    var hhStr = hh < 10 ? '0' + hh : '' + hh;
    var dateKey = dt.getFullYear() + mm + dd + '_' + hhStr;

    var xhr2 = new XMLHttpRequest();
    var url = 'https://www.jma.go.jp/bosai/amedas/data/point/' + stationCode + '/' + dateKey + '.json';
    xhr2.open('GET', url, true);
    xhr2.timeout = 10000;
    xhr2.onload = function () {
      if (xhr2.status !== 200) { callback(null, 'AMeDAS ' + xhr2.status); return; }
      try {
        var data = JSON.parse(xhr2.responseText);
        var keys = Object.keys(data).sort();
        var latest = data[keys[keys.length - 1]];
        var temp = (latest.temp     && latest.temp[0]     !== null) ? latest.temp[0]     : null;
        var hum  = (latest.humidity && latest.humidity[0] !== null) ? latest.humidity[0] : null;
        callback({ temp: temp, humidity: hum });
      } catch (e) { callback(null, 'データ解析エラー'); }
    };
    xhr2.ontimeout = function () { callback(null, 'AMeDASタイムアウト'); };
    xhr2.onerror   = function () { callback(null, 'AMeDAS通信エラー'); };
    xhr2.send();
  };
  xhr.ontimeout = function () { callback(null, 'タイムアウト'); };
  xhr.onerror   = function () { callback(null, '通信エラー'); };
  xhr.send();
}

// ===================== 気象庁 天気予報API =====================
function fetchForecast(areaCode, callback) {
  var xhr = new XMLHttpRequest();
  var url = 'https://www.jma.go.jp/bosai/forecast/data/forecast/' + areaCode + '.json';
  xhr.open('GET', url, true);
  xhr.timeout = 10000;
  xhr.onload = function () {
    if (xhr.status !== 200) { callback(null); return; }
    try {
      var data = JSON.parse(xhr.responseText);
      var ts0  = data[0].timeSeries[0];
      var area = ts0.areas[0];

      // 降水確率（timeSeries[1]）
      var pop0 = '--', pop1 = '--';
      try {
        var ts1 = data[0].timeSeries[1];
        var popArea = ts1.areas[0];
        if (popArea.pops && popArea.pops.length > 0) pop0 = popArea.pops[0] + '%';
        if (popArea.pops && popArea.pops.length > 1) pop1 = popArea.pops[1] + '%';
      } catch(e) {}

      // 最高・最低気温（timeSeries[2]）
      var tempMin0 = null, tempMax0 = null, tempMin1 = null, tempMax1 = null;
      try {
        var ts2 = data[0].timeSeries[2];
        ts2.areas.forEach(function(a) {
          if (a.temps) {
            if (a.temps[0] && a.temps[0] !== '') tempMin0 = a.temps[0];
            if (a.temps[1] && a.temps[1] !== '') tempMax0 = a.temps[1];
            if (a.temps[2] && a.temps[2] !== '') tempMin1 = a.temps[2];
            if (a.temps[3] && a.temps[3] !== '') tempMax1 = a.temps[3];
          }
        });
      } catch(e) {}

      callback({
        todayCode:    area.weatherCodes ? area.weatherCodes[0] : null,
        todayText:    area.weathers     ? area.weathers[0].replace(/　/g, ' ') : '取得失敗',
        todayPop:     pop0,
        todayTempMin: tempMin0,
        todayTempMax: tempMax0,
        tomorrowCode:    area.weatherCodes ? area.weatherCodes[1] : null,
        tomorrowText:    area.weathers     ? area.weathers[1].replace(/　/g, ' ') : '取得失敗',
        tomorrowPop:     pop1,
        tomorrowTempMin: tempMin1,
        tomorrowTempMax: tempMax1
      });
    } catch (e) { callback(null); }
  };
  xhr.ontimeout = xhr.onerror = function () { callback(null); };
  xhr.send();
}

// ===================== Yodeck デバイス位置情報取得 =====================
function fetchYodeckLocation(token, callback) {
  setStatus('位置情報取得中…');
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://localhost:8080/device', true);
  if (token) xhr.setRequestHeader('Authorization', 'widget ' + token);
  xhr.timeout = 3000;
  xhr.onload = function () {
    // デバッグ: APIレスポンスをそのまま画面に表示
    showDebug('HTTP:' + xhr.status + '\n' + xhr.responseText.substring(0, 400));

    if (xhr.status !== 200) { callback(null); return; }
    try {
      var d = JSON.parse(xhr.responseText);
      var lat = null, lon = null;
      if (Array.isArray(d.location) && d.location.length >= 2) {
        lat = d.location[0]; lon = d.location[1];
      } else if (d.location && typeof d.location === 'object') {
        lat = d.location.lat  !== undefined ? d.location.lat  : (d.location.latitude  !== undefined ? d.location.latitude  : null);
        lon = d.location.lng  !== undefined ? d.location.lng  : (d.location.longitude !== undefined ? d.location.longitude : (d.location.lon !== undefined ? d.location.lon : null));
      } else if (d.lat !== undefined && d.lat !== null) {
        lat = d.lat; lon = d.lon;
      } else if (d.latitude !== undefined && d.latitude !== null) {
        lat = d.latitude; lon = d.longitude;
      }
      callback((lat !== null && lat !== 0) ? { lat: lat, lon: lon } : null);
    } catch (e) { callback(null); }
  };
  xhr.ontimeout = function () { showDebug('TIMEOUT: localhost:8080/device'); callback(null); };
  xhr.onerror   = function () { showDebug('ERROR: localhost:8080/device に接続できません'); callback(null); };
  xhr.send();
}

function showDebug(msg) {
  var el = document.getElementById('error_msg');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
}

// ===================== UI ステータス =====================
function setStatus(msg) {
  var el = document.getElementById('status_msg');
  if (el) el.textContent = msg;
}

// ===================== 時計 =====================
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function updateClock() {
  var el = document.getElementById('current_time');
  if (!el) return;
  var now = new Date();
  el.textContent = now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日  '
    + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
}

// ===================== エラー表示 =====================
function showError(msg) {
  setStatus('');
  var el = document.getElementById('error_msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  var loc = document.getElementById('location_name');
  if (loc) loc.textContent = 'エラー';
  applyFontsize();
}

// ===================== データ表示 =====================
function setText(id, txt) {
  var el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function showData(station, forecast, amedas, gpsUsed) {
  setStatus('');
  var el = document.getElementById('error_msg');
  if (el) el.style.display = 'none';

  setText('location_name', station.name);

  var note = document.getElementById('location_note');
  if (note) note.textContent = gpsUsed ? '' : '（手動設定）';

  // 現在気象
  if (amedas && amedas.temp !== null) {
    setText('current_temp', amedas.temp.toFixed(1) + '℃');
  } else {
    setText('current_temp', '--');
  }
  if (amedas && amedas.humidity !== null) {
    setText('current_hum', amedas.humidity + '%');
  } else {
    setText('current_hum', '--');
  }

  // 今日の天気
  if (forecast) {
    var todayIcon = weatherIcon(forecast.todayCode);
    setText('today_icon', todayIcon);
    setText('today_text', forecast.todayText);
    setText('today_pop',  '降水確率 ' + forecast.todayPop);

    var todayTemp = '';
    if (forecast.todayTempMax !== null && forecast.todayTempMax !== undefined) todayTemp += '最高 ' + forecast.todayTempMax + '℃';
    if (forecast.todayTempMin !== null && forecast.todayTempMin !== undefined) {
      if (todayTemp) todayTemp += '  ';
      todayTemp += '最低 ' + forecast.todayTempMin + '℃';
    }
    setText('today_temp', todayTemp || '--');

    var tomorrowIcon = weatherIcon(forecast.tomorrowCode);
    setText('tomorrow_icon', tomorrowIcon);
    setText('tomorrow_text', forecast.tomorrowText);
    setText('tomorrow_pop',  '降水確率 ' + forecast.tomorrowPop);

    var tomorrowTemp = '';
    if (forecast.tomorrowTempMax !== null && forecast.tomorrowTempMax !== undefined) tomorrowTemp += '最高 ' + forecast.tomorrowTempMax + '℃';
    if (forecast.tomorrowTempMin !== null && forecast.tomorrowTempMin !== undefined) {
      if (tomorrowTemp) tomorrowTemp += '  ';
      tomorrowTemp += '最低 ' + forecast.tomorrowTempMin + '℃';
    }
    setText('tomorrow_temp', tomorrowTemp || '--');
  } else {
    setText('today_icon', '－');
    setText('today_text', '取得失敗');
    setText('today_pop',  '');
    setText('today_temp', '');
    setText('tomorrow_icon', '－');
    setText('tomorrow_text', '取得失敗');
    setText('tomorrow_pop',  '');
    setText('tomorrow_temp', '');
  }

  applyFontsize();
}

// ===================== 地点解決 =====================
var _configLocation = null;

function resolveStation(callback) {
  fetchYodeckLocation(_token, function (loc) {
    if (loc) {
      callback(nearestStation(loc.lat, loc.lon), true);
      return;
    }
    // GPS失敗 → 手動設定フォールバック
    if (_configLocation) {
      var s = findStationByName(_configLocation);
      if (s) { callback(s, false); return; }
    }
    showError('地点未設定\nYodeckのUI設定で「地点」を選択してください');
    callback(null, false);
  });
}

// ===================== データ更新 =====================
function updateData() {
  resolveStation(function (station, gpsUsed) {
    if (!station) return;

    var amedas = null, forecast = null, amedasDone = false, forecastDone = false;

    function tryRender() {
      if (!amedasDone || !forecastDone) return;
      showData(station, forecast, amedas, gpsUsed);
    }

    fetchAMeDAS(station.code, function (data) {
      amedas = data;
      amedasDone = true;
      tryRender();
    });

    fetchForecast(station.area, function (data) {
      forecast = data;
      forecastDone = true;
      tryRender();
    });
  });
}

// ===================== フォントサイズ動的調整 =====================
function applyFontsize() {
  var vw = window.innerWidth, vh = window.innerHeight;
  var hdrH  = Math.round(vh * 0.11);
  var dateH = Math.round(vh * 0.10);
  var bodyH = vh - hdrH - dateH;

  var hdrFont  = Math.min(hdrH  * 0.55, vw * 0.08);
  var dateFont = Math.min(dateH * 0.38, vw * 0.08);

  var hdr = document.querySelector('.hdr');
  if (hdr) { hdr.style.height = hdrH + 'px'; hdr.style.lineHeight = hdrH + 'px'; hdr.style.fontSize = hdrFont + 'px'; }

  var dateWrap = document.querySelector('.date_wrap');
  if (dateWrap) { dateWrap.style.height = dateH + 'px'; dateWrap.style.lineHeight = dateH + 'px'; }

  var styleEl = document.getElementById('dyn-style');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'dyn-style'; document.head.appendChild(styleEl); }

  var bodyContent = document.querySelector('.body_content');
  if (bodyContent) bodyContent.style.height = bodyH + 'px';

  var locFont   = Math.min(bodyH * 0.09, vw * 0.07);
  var curFont   = Math.min(bodyH * 0.085, vw * 0.065);
  var dayFont   = Math.min(bodyH * 0.075, vw * 0.06);
  var iconFont  = Math.min(bodyH * 0.18, vw * 0.14);
  var descFont  = Math.min(bodyH * 0.055, vw * 0.045);

  styleEl.innerHTML = [
    '.current_date{font-size:' + dateFont + 'px}',
    '.location_row{font-size:' + locFont + 'px}',
    '.current_row .label{font-size:' + curFont + 'px}',
    '.current_row .value{font-size:' + curFont + 'px}',
    '.day_header{font-size:' + dayFont + 'px}',
    '.weather_icon{font-size:' + iconFont + 'px}',
    '.weather_desc{font-size:' + descFont + 'px}'
  ].join('');
}

// ===================== _render =====================
function _render(config) {
  _configLocation = (config && config.location) ? config.location : null;

  updateClock();
  setInterval(updateClock, 30000);
  applyFontsize();
  window.addEventListener('resize', applyFontsize);

  updateData();
  setInterval(updateData, 15 * 60 * 1000);
}

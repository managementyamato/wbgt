// ===================== AMeDAS 観測所リスト（都道府県代表） =====================
var STATIONS = [
  { code:'11016', name:'稚内',     lat:45.4167, lon:141.6833 },
  { code:'12442', name:'旭川',     lat:43.7667, lon:142.3667 },
  { code:'14163', name:'札幌',     lat:43.0608, lon:141.3544 },
  { code:'15041', name:'函館',     lat:41.8167, lon:140.7500 },
  { code:'31312', name:'青森',     lat:40.8222, lon:140.7472 },
  { code:'33472', name:'盛岡',     lat:39.7000, lon:141.1667 },
  { code:'34392', name:'仙台',     lat:38.2667, lon:140.8667 },
  { code:'32402', name:'秋田',     lat:39.7167, lon:140.1000 },
  { code:'35426', name:'山形',     lat:38.2556, lon:140.3389 },
  { code:'36126', name:'福島',     lat:37.7500, lon:140.4667 },
  { code:'40201', name:'水戸',     lat:36.3667, lon:140.4667 },
  { code:'41277', name:'宇都宮',   lat:36.5500, lon:139.8667 },
  { code:'42251', name:'前橋',     lat:36.3833, lon:139.0667 },
  { code:'43056', name:'さいたま', lat:35.8617, lon:139.6453 },
  { code:'45147', name:'千葉',     lat:35.6000, lon:140.1000 },
  { code:'44132', name:'東京',     lat:35.6895, lon:139.6917 },
  { code:'46106', name:'横浜',     lat:35.4500, lon:139.6500 },
  { code:'54232', name:'新潟',     lat:37.9167, lon:139.0500 },
  { code:'55102', name:'富山',     lat:36.7000, lon:137.2167 },
  { code:'56227', name:'金沢',     lat:36.5944, lon:136.6256 },
  { code:'57066', name:'福井',     lat:36.0667, lon:136.2167 },
  { code:'49142', name:'甲府',     lat:35.6667, lon:138.5500 },
  { code:'48331', name:'長野',     lat:36.6500, lon:138.1833 },
  { code:'52586', name:'岐阜',     lat:35.4167, lon:136.7500 },
  { code:'50331', name:'静岡',     lat:34.9833, lon:138.3833 },
  { code:'51106', name:'名古屋',   lat:35.1667, lon:136.9667 },
  { code:'53133', name:'津',       lat:34.7333, lon:136.5167 },
  { code:'60131', name:'彦根',     lat:35.2667, lon:136.2500 },
  { code:'61286', name:'京都',     lat:35.0167, lon:135.7333 },
  { code:'62078', name:'大阪',     lat:34.6833, lon:135.5167 },
  { code:'63518', name:'神戸',     lat:34.6913, lon:135.1830 },
  { code:'64036', name:'奈良',     lat:34.6833, lon:135.8333 },
  { code:'65042', name:'和歌山',   lat:34.2333, lon:135.1667 },
  { code:'69122', name:'鳥取',     lat:35.5000, lon:134.2333 },
  { code:'68132', name:'松江',     lat:35.4667, lon:133.0500 },
  { code:'66408', name:'岡山',     lat:34.6500, lon:133.9167 },
  { code:'67437', name:'広島',     lat:34.3833, lon:132.4500 },
  { code:'81428', name:'下関',     lat:33.9500, lon:130.9333 },
  { code:'71106', name:'徳島',     lat:34.0667, lon:134.5500 },
  { code:'72086', name:'高松',     lat:34.3167, lon:134.0500 },
  { code:'73166', name:'松山',     lat:33.8333, lon:132.7833 },
  { code:'74181', name:'高知',     lat:33.5500, lon:133.5333 },
  { code:'82182', name:'福岡',     lat:33.5833, lon:130.3833 },
  { code:'85142', name:'佐賀',     lat:33.2500, lon:130.3000 },
  { code:'84496', name:'長崎',     lat:32.7333, lon:129.8667 },
  { code:'86141', name:'熊本',     lat:32.8000, lon:130.7000 },
  { code:'83216', name:'大分',     lat:33.2333, lon:131.6167 },
  { code:'87376', name:'宮崎',     lat:31.9333, lon:131.4167 },
  { code:'88317', name:'鹿児島',   lat:31.5667, lon:130.5500 },
  { code:'91197', name:'那覇',     lat:26.2167, lon:127.6833 }
];

// ===================== リスクレベル定義（環境省ガイドライン） =====================
var LEVELS = [
  { key:'stop',    min:31,        label:'運動中止',  action:'激しい作業・運動は原則中止。涼しい場所で安静にしてください',      theme:'stop'    },
  { key:'danger',  min:28,        label:'厳重警戒',  action:'激しい作業・運動は避け、こまめな休憩・水分・塩分補給を',          theme:'danger'  },
  { key:'warning', min:25,        label:'警戒',      action:'積極的に休憩し、水分・塩分補給を。体調の変化に注意してください',   theme:'warning' },
  { key:'caution', min:21,        label:'注意',      action:'積極的に水分補給し、体調の変化に気をつけてください',               theme:'caution' },
  { key:'safe',    min:-Infinity, label:'ほぼ安全',  action:'水分補給をこまめに行い、熱中症に注意してください',                 theme:'safe'    }
];

// ===================== ウィジェット本体 =====================
var _lastConfig   = null;
var _fetchTimer   = null;
var _clockTimer   = null;
var _currentStation = null;

function init_widget(config) {
  if (!config) return;
  _lastConfig = config;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function() { _start(_lastConfig); });
    return;
  }
  _start(config);
}

function _start(config) {
  _applyFont(config);
  if (_fetchTimer) clearInterval(_fetchTimer);
  if (_clockTimer) clearInterval(_clockTimer);

  _setStatus('データ取得中…');

  var address = (config.address || '').trim();
  if (!address) {
    _setError('住所を設定してください');
    return;
  }

  /* 初回取得 */
  _run(address);

  /* 定期更新 */
  var mins = parseInt(config.refreshMin || '10', 10);
  _fetchTimer = setInterval(function() { _run(address); }, mins * 60 * 1000);

  /* 時刻表示 */
  _updateClock();
  _clockTimer = setInterval(_updateClock, 10000);
}

/* メインフロー */
function _run(address) {
  _setStatus('住所を検索中…');
  _geocode(address, function(lat, lon) {
    if (lat === null) {
      _setError('住所が見つかりません：' + address);
      return;
    }
    var station = _nearestStation(lat, lon);
    _currentStation = station;
    _setStatus(station.name + ' のデータを取得中…');
    _fetchAMeDAS(station.code, function(temp, humidity, err) {
      if (err || temp === null) {
        _setError('気象データ取得失敗：' + (err || '不明なエラー'));
        return;
      }
      var wbgt = _calcWBGT(temp, humidity);
      _display(wbgt, station.name, temp, humidity);
    });
  });
}

/* ── 住所 → 座標（国土地理院 ジオコーダー） ── */
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
        var coords = data[0].geometry.coordinates; /* [lon, lat] */
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

/* ── 最寄り観測所を検索 ── */
function _nearestStation(lat, lon) {
  var min = Infinity, nearest = STATIONS[0];
  for (var i = 0; i < STATIONS.length; i++) {
    var s = STATIONS[i];
    var d = (s.lat - lat) * (s.lat - lat) + (s.lon - lon) * (s.lon - lon);
    if (d < min) { min = d; nearest = s; }
  }
  return nearest;
}

/* ── 気象庁 AMeDAS API から気温・湿度取得 ── */
function _fetchAMeDAS(stationCode, callback) {
  /* Step1: 最新データ時刻を取得 */
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt', true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status !== 200) { callback(null, null, '気象庁API ' + xhr.status); return; }
    var timeStr = xhr.responseText.trim(); /* "2026-07-15T13:00:00+09:00" */
    var d = new Date(timeStr);
    var y  = d.getFullYear();
    var mo = _z(d.getMonth() + 1);
    var dy = _z(d.getDate());
    var hr = _z(d.getHours());
    var dateKey = y + mo + dy + '_' + hr + '.json';

    /* Step2: 観測所データを取得 */
    var xhr2 = new XMLHttpRequest();
    var url = 'https://www.jma.go.jp/bosai/amedas/data/point/' + stationCode + '/' + dateKey;
    xhr2.open('GET', url, true);
    xhr2.timeout = 10000;
    xhr2.onload = function() {
      if (xhr2.status !== 200) { callback(null, null, 'AMeDASデータ取得失敗 ' + xhr2.status); return; }
      try {
        var data = JSON.parse(xhr2.responseText);
        /* 最新のキーを取得（時刻文字列キーの最後） */
        var keys = Object.keys(data);
        if (keys.length === 0) { callback(null, null, 'データなし'); return; }
        var latest = data[keys[keys.length - 1]];
        var temp = latest.temp    ? latest.temp[0]    : null;
        var humi = latest.humidity ? latest.humidity[0] : null;
        if (temp === null || temp === undefined) { callback(null, null, '気温データなし'); return; }
        if (humi === null || humi === undefined) { humi = 60; /* 湿度不明時は60%で推定 */ }
        callback(parseFloat(temp), parseFloat(humi), null);
      } catch(e) { callback(null, null, 'データ解析エラー'); }
    };
    xhr2.ontimeout = function() { callback(null, null, 'AMeDASタイムアウト'); };
    xhr2.onerror   = function() { callback(null, null, 'AMeDAS通信エラー'); };
    xhr2.send();
  };
  xhr.ontimeout = function() { callback(null, null, '気象庁APIタイムアウト'); };
  xhr.onerror   = function() { callback(null, null, '気象庁API通信エラー'); };
  xhr.send();
}

/* ── WBGT計算（環境省推奨簡易式） ── */
function _calcWBGT(temp, humidity) {
  var e = 6.1078 * Math.exp(17.2694 * temp / (temp + 237.29)) * humidity / 100;
  return Math.round((0.567 * temp + 0.393 * e + 3.94) * 10) / 10;
}

/* ── 画面表示 ── */
function _display(wbgt, stationName, temp, humidity) {
  var level = _getLevel(wbgt);

  /* 数値 */
  var valEl = document.getElementById('wbgt-value');
  if (valEl) { valEl.textContent = wbgt.toFixed(1); valEl.style.display = ''; }

  /* 地点 */
  var locEl = document.getElementById('location');
  if (locEl) locEl.textContent = stationName + ' 観測';

  /* 気温・湿度サブ情報 */
  var dtEl = document.getElementById('datetime');
  if (dtEl) dtEl.textContent = '気温 ' + temp.toFixed(1) + '℃　湿度 ' + Math.round(humidity) + '%';

  /* レベル */
  var nameEl   = document.getElementById('level-name');
  var actionEl = document.getElementById('level-action');
  if (nameEl)   nameEl.textContent   = level.label;
  if (actionEl) actionEl.textContent = level.action;

  /* 背景テーマ */
  ['safe','caution','warning','danger','stop','none','loading','error'].forEach(function(t) {
    document.body.classList.remove('theme-' + t);
  });
  document.body.classList.add('theme-' + level.theme);

  /* ゲージ */
  document.querySelectorAll('.gauge-seg').forEach(function(el) {
    el.classList.toggle('active', el.dataset.level === level.key);
  });

  /* 更新時刻 */
  _updateClock();
}

function _getLevel(value) {
  for (var i = 0; i < LEVELS.length; i++) {
    if (value >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[LEVELS.length - 1];
}

/* ── ステータス・エラー表示 ── */
function _setStatus(msg) {
  var valEl    = document.getElementById('wbgt-value');
  var actionEl = document.getElementById('level-action');
  var nameEl   = document.getElementById('level-name');
  if (valEl)    valEl.textContent    = '--';
  if (nameEl)   nameEl.textContent   = '取得中';
  if (actionEl) actionEl.textContent = msg;
  ['safe','caution','warning','danger','stop'].forEach(function(t) {
    document.body.classList.remove('theme-' + t);
  });
  document.body.classList.add('theme-none');
}

function _setError(msg) {
  var valEl    = document.getElementById('wbgt-value');
  var nameEl   = document.getElementById('level-name');
  var actionEl = document.getElementById('level-action');
  var locEl    = document.getElementById('location');
  if (valEl)    valEl.textContent    = '!';
  if (nameEl)   nameEl.textContent   = 'エラー';
  if (actionEl) actionEl.textContent = msg;
  if (locEl)    locEl.textContent    = '';
}

function _updateClock() {
  var el = document.getElementById('datetime');
  /* _display が呼ばれた後は気温・湿度が入っているので上書きしない */
}

function _applyFont(config) {
  var font = config.fontFamily || 'keifont, sans-serif';
  document.body.style.fontFamily = font;
}

function _z(n) { return String(n).padStart(2, '0'); }

/* ── Yodeck postMessage ── */
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
      refreshMin: '10',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

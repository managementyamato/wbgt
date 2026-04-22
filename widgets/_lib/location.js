// =====================================================================
// location.js — ゲンバルジャー共通 位置情報・観測所解決ライブラリ
// =====================================================================
// 使い方:
//   resolveLocation(token, fallbackName, callback)
//
//   - token       : Yodeck widget token (_token から渡す)
//   - fallbackName: 手動設定の地点名（config.location など）
//   - callback    : function(result, error)
//       result = { station, lat, lon, source }
//         station = { code, name, lat, lon, area }
//         source  = 'gps' | 'manual'
//       失敗時: callback(null, 'エラーメッセージ')
// =====================================================================

// ===================== AMeDAS 観測所リスト =====================
var STATIONS = [
  { code:'11016', name:'稚内',     lat:45.4167, lon:141.6833, area:'011000' },
  { code:'12442', name:'旭川',     lat:43.7667, lon:142.3667, area:'012000' },
  { code:'14163', name:'札幌',     lat:43.0608, lon:141.3544, area:'016000' },
  { code:'15041', name:'函館',     lat:41.8167, lon:140.7500, area:'017000' },
  { code:'31312', name:'青森',     lat:40.8222, lon:140.7472, area:'020000' },
  { code:'33472', name:'盛岡',     lat:39.7000, lon:141.1667, area:'030000' },
  { code:'34392', name:'仙台',     lat:38.2667, lon:140.8667, area:'040000' },
  { code:'32402', name:'秋田',     lat:39.7167, lon:140.1000, area:'050000' },
  { code:'35426', name:'山形',     lat:38.2556, lon:140.3389, area:'060000' },
  { code:'36126', name:'福島',     lat:37.7500, lon:140.4667, area:'070000' },
  { code:'40201', name:'水戸',     lat:36.3667, lon:140.4667, area:'080000' },
  { code:'41277', name:'宇都宮',   lat:36.5500, lon:139.8667, area:'090000' },
  { code:'42251', name:'前橋',     lat:36.3833, lon:139.0667, area:'100000' },
  { code:'43056', name:'さいたま', lat:35.8617, lon:139.6453, area:'110000' },
  { code:'45147', name:'千葉',     lat:35.6000, lon:140.1000, area:'120000' },
  { code:'44132', name:'東京',     lat:35.6895, lon:139.6917, area:'130000' },
  { code:'46106', name:'横浜',     lat:35.4500, lon:139.6500, area:'140000' },
  { code:'54232', name:'新潟',     lat:37.9167, lon:139.0500, area:'150000' },
  { code:'55102', name:'富山',     lat:36.7000, lon:137.2167, area:'160000' },
  { code:'56227', name:'金沢',     lat:36.5944, lon:136.6256, area:'170000' },
  { code:'57066', name:'福井',     lat:36.0667, lon:136.2167, area:'180000' },
  { code:'49142', name:'甲府',     lat:35.6667, lon:138.5500, area:'190000' },
  { code:'48331', name:'長野',     lat:36.6500, lon:138.1833, area:'200000' },
  { code:'52586', name:'岐阜',     lat:35.4167, lon:136.7500, area:'210000' },
  { code:'50331', name:'静岡',     lat:34.9833, lon:138.3833, area:'220000' },
  { code:'51106', name:'名古屋',   lat:35.1667, lon:136.9667, area:'230000' },
  { code:'53133', name:'津',       lat:34.7333, lon:136.5167, area:'240000' },
  { code:'60131', name:'彦根',     lat:35.2667, lon:136.2500, area:'250000' },
  { code:'61286', name:'京都',     lat:35.0167, lon:135.7333, area:'260000' },
  { code:'62078', name:'大阪',     lat:34.6833, lon:135.5167, area:'270000' },
  { code:'63518', name:'神戸',     lat:34.6913, lon:135.1830, area:'280000' },
  { code:'64036', name:'奈良',     lat:34.6833, lon:135.8333, area:'290000' },
  { code:'65042', name:'和歌山',   lat:34.2333, lon:135.1667, area:'300000' },
  { code:'69122', name:'鳥取',     lat:35.5000, lon:134.2333, area:'310000' },
  { code:'68132', name:'松江',     lat:35.4667, lon:133.0500, area:'320000' },
  { code:'66408', name:'岡山',     lat:34.6500, lon:133.9167, area:'330000' },
  { code:'67437', name:'広島',     lat:34.3833, lon:132.4500, area:'340000' },
  { code:'81428', name:'下関',     lat:33.9500, lon:130.9333, area:'350000' },
  { code:'71106', name:'徳島',     lat:34.0667, lon:134.5500, area:'360000' },
  { code:'72086', name:'高松',     lat:34.3167, lon:134.0500, area:'370000' },
  { code:'73166', name:'松山',     lat:33.8333, lon:132.7833, area:'380000' },
  { code:'74181', name:'高知',     lat:33.5500, lon:133.5333, area:'390000' },
  { code:'82182', name:'福岡',     lat:33.5833, lon:130.3833, area:'400000' },
  { code:'85142', name:'佐賀',     lat:33.2500, lon:130.3000, area:'410000' },
  { code:'84496', name:'長崎',     lat:32.7333, lon:129.8667, area:'420000' },
  { code:'86141', name:'熊本',     lat:32.8000, lon:130.7000, area:'430000' },
  { code:'83216', name:'大分',     lat:33.2333, lon:131.6167, area:'440000' },
  { code:'87376', name:'宮崎',     lat:31.9333, lon:131.4167, area:'450000' },
  { code:'88317', name:'鹿児島',   lat:31.5667, lon:130.5500, area:'460100' },
  { code:'91197', name:'那覇',     lat:26.2167, lon:127.6833, area:'471000' }
];

// ===================== 内部ユーティリティ =====================
function _nearestStation(lat, lon) {
  var min = Infinity, nearest = STATIONS[0];
  for (var i = 0; i < STATIONS.length; i++) {
    var s = STATIONS[i];
    var d = (s.lat - lat) * (s.lat - lat) + (s.lon - lon) * (s.lon - lon);
    if (d < min) { min = d; nearest = s; }
  }
  return nearest;
}

function _findStationByName(name) {
  for (var i = 0; i < STATIONS.length; i++) {
    if (STATIONS[i].name === name) return STATIONS[i];
  }
  return null;
}

// ===================== Yodeck デバイス位置情報取得 =====================
function _fetchYodeckLocation(token, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://localhost:8080/device', true);
  if (token) xhr.setRequestHeader('Authorization', 'widget ' + token);
  xhr.timeout = 3000;
  xhr.onload = function () {
    if (xhr.status !== 200) { callback(null); return; }
    try {
      var d = JSON.parse(xhr.responseText);
      var lat = null, lon = null;
      if (Array.isArray(d.location) && d.location.length >= 2) {
        lat = d.location[0]; lon = d.location[1];
      } else if (d.location && typeof d.location === 'object') {
        lat = d.location.lat      !== undefined ? d.location.lat      :
              d.location.latitude !== undefined ? d.location.latitude  : null;
        lon = d.location.lng       !== undefined ? d.location.lng       :
              d.location.longitude !== undefined ? d.location.longitude :
              d.location.lon       !== undefined ? d.location.lon       : null;
      } else if (d.lat !== undefined && d.lat !== null) {
        lat = d.lat; lon = d.lon;
      } else if (d.latitude !== undefined && d.latitude !== null) {
        lat = d.latitude; lon = d.longitude;
      }
      callback((lat !== null && lat !== 0) ? { lat: lat, lon: lon } : null);
    } catch (e) { callback(null); }
  };
  xhr.ontimeout = xhr.onerror = function () { callback(null); };
  xhr.send();
}

// ===================== 公開API =====================
//
// resolveLocation(token, fallbackName, callback)
//
// 優先順位:
//   1. Yodeck GPS (localhost:8080/device) → 最寄り観測所
//   2. 手動設定の地点名 (fallbackName) → 名前で観測所を検索
//   3. 失敗 → callback(null, 'エラーメッセージ')
//
function resolveLocation(token, fallbackName, callback) {
  _fetchYodeckLocation(token, function (loc) {
    if (loc) {
      var station = _nearestStation(loc.lat, loc.lon);
      callback({ station: station, lat: loc.lat, lon: loc.lon, source: 'gps' }, null);
      return;
    }
    // GPS失敗 → 手動設定フォールバック
    if (fallbackName) {
      var station = _findStationByName(fallbackName);
      if (station) {
        callback({ station: station, lat: station.lat, lon: station.lon, source: 'manual' }, null);
        return;
      }
    }
    callback(null, '地点未設定\nYodeckのUI設定で「地点」を選択してください');
  });
}

// ===================== ゲンバルジャー共通位置情報モジュール v2 =====================
//
// デジタルサイネージ（ラズパイ/Yodeck）向けの位置情報解決ライブラリ。
// ウィジェットは本モジュールをロードし、GenbaLocation.resolve(config, cb) を呼ぶだけで
// lat/lng を受け取れる。
//
// === 使い方 ===
//   <script src="shared/location.js"></script>
//   GenbaLocation.resolve(config, function(loc) {
//     console.log(loc.lat, loc.lng, loc.displayName);
//   });
//
// === config に渡すフィールド（優先順位の高い順） ===
//   1. locationLat, locationLng : 緯度経度を直接指定（最優先、完全オフライン）
//                                  Googleマップ右クリックで座標を取得できる
//   2. locationPref             : 都道府県名（内蔵テーブルから座標取得、オフライン）
//   3. locationMode='manual' + locationAddress : 住所/地名（Nominatimで変換、要ネット）
//   4. locationMode='auto'      : IP推定（ipapi.co → ip-api.com、要ネット）
//   5. いずれも不可 → FALLBACK（東京駅周辺）
//
// 注: Yodeck デバイス座標（http://localhost:8080/device）は環境依存で
//     失敗する実績があるため本モジュールでは取得しない。
//
// v1 → v2 変更: 完全オフライン動作の locationPref（都道府県選択）を最上位手段として追加。
//                現場のネット不通環境でも確実に位置情報が得られる。
//
// === キャッシュ ===
//   localStorage に 24h キャッシュ。IP/住所それぞれ別キーで保存。
//   都道府県・直接座標はキャッシュ不要（即時計算）。
//
// === 返す loc オブジェクト ===
//   { lat, lng, source, displayName, pref, city, timestamp }
//   source: 'manual' | 'prefecture' | 'geocoded' | 'ip' | 'cache:*' | 'fallback'

(function() {
  var CACHE_KEY = 'genba_location_cache_v1';
  var CACHE_MS  = 24 * 60 * 60 * 1000; // 24時間
  var FETCH_TIMEOUT_MS = 6000;
  var FALLBACK = {
    lat: 35.681, lng: 139.767,
    source: 'fallback',
    displayName: '東京駅周辺（位置情報取得失敗）',
    pref: '東京都', city: '千代田区',
    timestamp: 0
  };

  // ---------- 日本47都道府県（県庁所在地）の緯度経度テーブル ----------
  var JP_PREFS = {
    '北海道':   { lat: 43.0642, lng: 141.3469, city: '札幌' },
    '青森県':   { lat: 40.8244, lng: 140.7400, city: '青森' },
    '岩手県':   { lat: 39.7036, lng: 141.1527, city: '盛岡' },
    '宮城県':   { lat: 38.2682, lng: 140.8694, city: '仙台' },
    '秋田県':   { lat: 39.7186, lng: 140.1024, city: '秋田' },
    '山形県':   { lat: 38.2404, lng: 140.3633, city: '山形' },
    '福島県':   { lat: 37.7503, lng: 140.4676, city: '福島' },
    '茨城県':   { lat: 36.3418, lng: 140.4468, city: '水戸' },
    '栃木県':   { lat: 36.5657, lng: 139.8836, city: '宇都宮' },
    '群馬県':   { lat: 36.3911, lng: 139.0608, city: '前橋' },
    '埼玉県':   { lat: 35.8574, lng: 139.6489, city: 'さいたま' },
    '千葉県':   { lat: 35.6073, lng: 140.1063, city: '千葉' },
    '東京都':   { lat: 35.6895, lng: 139.6917, city: '新宿' },
    '神奈川県': { lat: 35.4478, lng: 139.6425, city: '横浜' },
    '新潟県':   { lat: 37.9022, lng: 139.0236, city: '新潟' },
    '富山県':   { lat: 36.6953, lng: 137.2113, city: '富山' },
    '石川県':   { lat: 36.5946, lng: 136.6256, city: '金沢' },
    '福井県':   { lat: 36.0652, lng: 136.2216, city: '福井' },
    '山梨県':   { lat: 35.6642, lng: 138.5683, city: '甲府' },
    '長野県':   { lat: 36.6513, lng: 138.1812, city: '長野' },
    '岐阜県':   { lat: 35.3912, lng: 136.7223, city: '岐阜' },
    '静岡県':   { lat: 34.9769, lng: 138.3831, city: '静岡' },
    '愛知県':   { lat: 35.1815, lng: 136.9066, city: '名古屋' },
    '三重県':   { lat: 34.7303, lng: 136.5086, city: '津' },
    '滋賀県':   { lat: 35.0045, lng: 135.8686, city: '大津' },
    '京都府':   { lat: 35.0116, lng: 135.7681, city: '京都' },
    '大阪府':   { lat: 34.6937, lng: 135.5023, city: '大阪' },
    '兵庫県':   { lat: 34.6913, lng: 135.1830, city: '神戸' },
    '奈良県':   { lat: 34.6851, lng: 135.8049, city: '奈良' },
    '和歌山県': { lat: 34.2261, lng: 135.1675, city: '和歌山' },
    '鳥取県':   { lat: 35.5036, lng: 134.2383, city: '鳥取' },
    '島根県':   { lat: 35.4723, lng: 133.0505, city: '松江' },
    '岡山県':   { lat: 34.6617, lng: 133.9344, city: '岡山' },
    '広島県':   { lat: 34.3966, lng: 132.4596, city: '広島' },
    '山口県':   { lat: 34.1861, lng: 131.4706, city: '山口' },
    '徳島県':   { lat: 34.0658, lng: 134.5593, city: '徳島' },
    '香川県':   { lat: 34.3401, lng: 134.0434, city: '高松' },
    '愛媛県':   { lat: 33.8416, lng: 132.7657, city: '松山' },
    '高知県':   { lat: 33.5597, lng: 133.5311, city: '高知' },
    '福岡県':   { lat: 33.6064, lng: 130.4181, city: '福岡' },
    '佐賀県':   { lat: 33.2494, lng: 130.2988, city: '佐賀' },
    '長崎県':   { lat: 32.7447, lng: 129.8736, city: '長崎' },
    '熊本県':   { lat: 32.7898, lng: 130.7417, city: '熊本' },
    '大分県':   { lat: 33.2381, lng: 131.6126, city: '大分' },
    '宮崎県':   { lat: 31.9111, lng: 131.4239, city: '宮崎' },
    '鹿児島県': { lat: 31.5602, lng: 130.5581, city: '鹿児島' },
    '沖縄県':   { lat: 26.2124, lng: 127.6809, city: '那覇' }
  };

  // ---------- キャッシュ ----------
  function _cacheGet(key) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var all = JSON.parse(raw);
      var rec = all[key];
      if (!rec) return null;
      if (Date.now() - rec.timestamp > CACHE_MS) return null;
      var copy = {};
      for (var k in rec) copy[k] = rec[k];
      copy.source = 'cache:' + rec.source;
      return copy;
    } catch (e) { return null; }
  }

  function _cacheSet(key, loc) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      var all = raw ? JSON.parse(raw) : {};
      all[key] = loc;
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  // ---------- fetch JSON（タイムアウト付き） ----------
  function _fetchJSON(url, cb) {
    var settled = false;
    var timer = setTimeout(function() {
      if (settled) return;
      settled = true;
      cb(null);
    }, FETCH_TIMEOUT_MS);

    try {
      fetch(url, { cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(j) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cb(j);
        })
        .catch(function() {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cb(null);
        });
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cb(null);
    }
  }

  // ---------- IP ジオロケーション ----------
  function _ipLookup(cb) {
    _fetchJSON('https://ipapi.co/json/', function(j) {
      if (j && typeof j.latitude === 'number' && typeof j.longitude === 'number') {
        cb({
          lat: j.latitude,
          lng: j.longitude,
          source: 'ip',
          displayName: [j.region, j.city].filter(Boolean).join(' ') || 'IP推定位置',
          pref: j.region || '',
          city: j.city || '',
          timestamp: Date.now()
        });
        return;
      }
      _fetchJSON('https://ip-api.com/json/?lang=ja&fields=status,country,regionName,city,lat,lon', function(j2) {
        if (j2 && j2.status === 'success' && typeof j2.lat === 'number') {
          cb({
            lat: j2.lat,
            lng: j2.lon,
            source: 'ip',
            displayName: [j2.regionName, j2.city].filter(Boolean).join(' ') || 'IP推定位置',
            pref: j2.regionName || '',
            city: j2.city || '',
            timestamp: Date.now()
          });
          return;
        }
        cb(null);
      });
    });
  }

  // ---------- 住所 → 座標（ジオコーディング） ----------
  function _geocode(address, cb) {
    var url = 'https://nominatim.openstreetmap.org/search'
            + '?format=json&limit=1&accept-language=ja&q=' + encodeURIComponent(address);
    _fetchJSON(url, function(j) {
      if (j && j.length > 0 && j[0].lat && j[0].lon) {
        cb({
          lat: parseFloat(j[0].lat),
          lng: parseFloat(j[0].lon),
          source: 'geocoded',
          displayName: j[0].display_name || address,
          pref: '',
          city: '',
          timestamp: Date.now()
        });
        return;
      }
      cb(null);
    });
  }

  // ---------- 公開メソッド ----------
  function resolve(config, cb) {
    config = config || {};
    if (typeof cb !== 'function') cb = function() {};

    // 1. 緯度経度の直接指定 → 最優先（オフライン）
    var mLat = parseFloat(config.locationLat);
    var mLng = parseFloat(config.locationLng);
    if (isFinite(mLat) && isFinite(mLng) && mLat !== 0 && mLng !== 0) {
      cb({
        lat: mLat, lng: mLng,
        source: 'manual',
        displayName: config.locationAddress || config.locationPref || (mLat.toFixed(4) + ', ' + mLng.toFixed(4)),
        pref: '', city: '',
        timestamp: Date.now()
      });
      return;
    }

    // 2. 都道府県指定 → 内蔵テーブルから即時取得（オフライン）
    if (config.locationPref && JP_PREFS[config.locationPref]) {
      var p = JP_PREFS[config.locationPref];
      cb({
        lat: p.lat, lng: p.lng,
        source: 'prefecture',
        displayName: config.locationPref + '（' + p.city + '）',
        pref: config.locationPref,
        city: p.city,
        timestamp: Date.now()
      });
      return;
    }

    var mode = (config.locationMode || 'auto').toString().toLowerCase();

    // 3. manual モード & 住所指定 → ジオコーディング（要ネット）
    if (mode === 'manual' && config.locationAddress) {
      var addrKey = 'addr:' + config.locationAddress;
      var cachedAddr = _cacheGet(addrKey);
      if (cachedAddr) { cb(cachedAddr); return; }

      _geocode(config.locationAddress, function(loc) {
        if (loc) {
          _cacheSet(addrKey, loc);
          cb(loc);
        } else {
          cb(_fallbackWith(FALLBACK));
        }
      });
      return;
    }

    // 4. auto モード → IP 推定（要ネット）
    var cachedIp = _cacheGet('ip');
    if (cachedIp) { cb(cachedIp); return; }

    _ipLookup(function(loc) {
      if (loc) {
        _cacheSet('ip', loc);
        cb(loc);
      } else {
        cb(_fallbackWith(FALLBACK));
      }
    });
  }

  function _fallbackWith(src) {
    var copy = {};
    for (var k in src) copy[k] = src[k];
    copy.timestamp = Date.now();
    return copy;
  }

  // ---------- 公開インターフェース ----------
  window.GenbaLocation = {
    resolve: resolve,
    FALLBACK: FALLBACK,
    PREFECTURES: JP_PREFS,  // 外部からキー一覧取得用
    clearCache: function() {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    },
    getCache: function() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    },
    version: '2.1.0'
  };
})();

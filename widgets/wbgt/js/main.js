// ===================== 設定 =====================
var WBGT_API_BASE = 'https://wbgt-api-server-422283659205.asia-northeast1.run.app';

// ===================== 観測地点データ =====================
var OBSERVATION_POINTS = {
    "北海道": {
        "宗谷": [{ code: "11016", name: "稚内", lat: 45.4167, lon: 141.6833 }],
        "上川": [{ code: "12442", name: "旭川", lat: 43.7667, lon: 142.3667 }],
        "石狩": [{ code: "14163", name: "札幌", lat: 43.0608, lon: 141.3544 }],
        "渡島": [{ code: "15041", name: "函館", lat: 41.8167, lon: 140.7500 }]
    },
    "東北": {
        "青森県": [{ code: "31312", name: "青森", lat: 40.8222, lon: 140.7472 }],
        "岩手県": [{ code: "33472", name: "盛岡", lat: 39.7000, lon: 141.1667 }],
        "宮城県": [{ code: "34392", name: "仙台", lat: 38.2667, lon: 140.8667 }],
        "秋田県": [{ code: "32402", name: "秋田", lat: 39.7167, lon: 140.1000 }],
        "山形県": [{ code: "35426", name: "山形", lat: 38.2556, lon: 140.3389 }],
        "福島県": [{ code: "36126", name: "福島", lat: 37.7500, lon: 140.4667 }]
    },
    "関東": {
        "茨城県": [{ code: "40201", name: "水戸", lat: 36.3667, lon: 140.4667 }],
        "栃木県": [{ code: "41277", name: "宇都宮", lat: 36.5500, lon: 139.8667 }],
        "群馬県": [{ code: "42251", name: "前橋", lat: 36.3833, lon: 139.0667 }],
        "埼玉県": [{ code: "43056", name: "さいたま", lat: 35.8617, lon: 139.6453 }],
        "千葉県": [{ code: "45147", name: "千葉", lat: 35.6000, lon: 140.1000 }],
        "東京都": [{ code: "44132", name: "東京", lat: 35.6895, lon: 139.6917 }],
        "神奈川県": [{ code: "46106", name: "横浜", lat: 35.4500, lon: 139.6500 }]
    },
    "北陸": {
        "新潟県": [{ code: "54232", name: "新潟", lat: 37.9167, lon: 139.0500 }],
        "富山県": [{ code: "55102", name: "富山", lat: 36.7000, lon: 137.2167 }],
        "石川県": [{ code: "56227", name: "金沢", lat: 36.5944, lon: 136.6256 }],
        "福井県": [{ code: "57066", name: "福井", lat: 36.0667, lon: 136.2167 }]
    },
    "中部": {
        "山梨県": [{ code: "49142", name: "甲府", lat: 35.6667, lon: 138.5500 }],
        "長野県": [{ code: "48331", name: "長野", lat: 36.6500, lon: 138.1833 }],
        "岐阜県": [{ code: "52586", name: "岐阜", lat: 35.4167, lon: 136.7500 }],
        "静岡県": [{ code: "50331", name: "静岡", lat: 34.9833, lon: 138.3833 }],
        "愛知県": [{ code: "51106", name: "名古屋", lat: 35.1667, lon: 136.9667 }]
    },
    "近畿": {
        "三重県": [{ code: "53133", name: "津", lat: 34.7333, lon: 136.5167 }],
        "滋賀県": [{ code: "60131", name: "彦根", lat: 35.2667, lon: 136.2500 }],
        "京都府": [{ code: "61286", name: "京都", lat: 35.0167, lon: 135.7333 }],
        "大阪府": [{ code: "62078", name: "大阪", lat: 34.6833, lon: 135.5167 }],
        "兵庫県": [{ code: "63518", name: "神戸", lat: 34.6913, lon: 135.1830 }],
        "奈良県": [{ code: "64036", name: "奈良", lat: 34.6833, lon: 135.8333 }],
        "和歌山県": [{ code: "65042", name: "和歌山", lat: 34.2333, lon: 135.1667 }]
    },
    "中国": {
        "鳥取県": [{ code: "69122", name: "鳥取", lat: 35.5000, lon: 134.2333 }],
        "島根県": [{ code: "68132", name: "松江", lat: 35.4667, lon: 133.0500 }],
        "岡山県": [{ code: "66408", name: "岡山", lat: 34.6500, lon: 133.9167 }],
        "広島県": [{ code: "67437", name: "広島", lat: 34.3833, lon: 132.4500 }],
        "山口県": [{ code: "81428", name: "下関", lat: 33.9500, lon: 130.9333 }]
    },
    "四国": {
        "徳島県": [{ code: "71106", name: "徳島", lat: 34.0667, lon: 134.5500 }],
        "香川県": [{ code: "72086", name: "高松", lat: 34.3167, lon: 134.0500 }],
        "愛媛県": [{ code: "73166", name: "松山", lat: 33.8333, lon: 132.7833 }],
        "高知県": [{ code: "74181", name: "高知", lat: 33.5500, lon: 133.5333 }]
    },
    "九州": {
        "福岡県": [{ code: "82182", name: "福岡", lat: 33.5833, lon: 130.3833 }],
        "佐賀県": [{ code: "85142", name: "佐賀", lat: 33.2500, lon: 130.3000 }],
        "長崎県": [{ code: "84496", name: "長崎", lat: 32.7333, lon: 129.8667 }],
        "熊本県": [{ code: "86141", name: "熊本", lat: 32.8000, lon: 130.7000 }],
        "大分県": [{ code: "83216", name: "大分", lat: 33.2333, lon: 131.6167 }],
        "宮崎県": [{ code: "87376", name: "宮崎", lat: 31.9333, lon: 131.4167 }],
        "鹿児島県": [{ code: "88317", name: "鹿児島", lat: 31.5667, lon: 130.5500 }]
    },
    "沖縄": {
        "沖縄県": [{ code: "91197", name: "那覇", lat: 26.2167, lon: 127.6833 }]
    }
};

// ===================== DOM要素 =====================
var locationValue = document.getElementById('location_value');
var wbgtValueEl   = document.getElementById('wbgt_value');
var levelValueEl  = document.getElementById('level_value');
var wbgtRow       = document.getElementById('wbgt_row');
var levelRow      = document.getElementById('level_row');
var offSeasonMsg  = document.getElementById('off_season_msg');
var todaysDate    = document.getElementById('todays_date');

var currentPoint  = null;
var DEFAULT_POINT = { code: "62078", name: "大阪", lat: 34.6833, lon: 135.5167 };

// ===================== 日時表示 =====================
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function updateDate() {
    var now = new Date();
    var y  = now.getFullYear();
    var mo = now.getMonth() + 1;
    var d  = now.getDate();
    var h  = pad2(now.getHours());
    var mi = pad2(now.getMinutes());
    todaysDate.textContent = y + '年' + mo + '月' + d + '日  ' + h + ':' + mi;
}
updateDate();
setInterval(updateDate, 30000);

// ===================== フォントサイズ動的調整 =====================
function applyFontsize() {
    var container = document.querySelector('.container');
    if (!container) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var hdrH  = Math.round(vh * 0.15);
    var dateH = Math.round(vh * 0.22);
    var tblH  = vh - hdrH - dateH;
    var gap   = Math.max(4, Math.round(tblH * 0.02));
    var cardH = Math.round((tblH - gap * 4) / 3);

    var hdrFont   = Math.min(hdrH  * 0.55, vw * 0.10);
    var dateFont  = Math.min(dateH * 0.38, vw * 0.12);
    var labelFont = Math.min(cardH * 0.42, vw * 0.09);
    var valueFont = Math.min(cardH * 0.42, vw * 0.09);

    container.style.height   = vh + 'px';
    container.style.overflow = 'hidden';

    var hdr = document.querySelector('.hdr');
    if (hdr) {
        hdr.style.height     = hdrH + 'px';
        hdr.style.lineHeight = hdrH + 'px';
        hdr.style.fontSize   = hdrFont + 'px';
        hdr.style.padding    = '0 3%';
    }

    var dateWrap = document.querySelector('.current_date_wrap');
    if (dateWrap) {
        var textH = dateFont * 1.3;
        var vPad  = Math.max(0, Math.round((dateH - textH) / 2));
        dateWrap.style.height        = dateH + 'px';
        dateWrap.style.paddingTop    = vPad + 'px';
        dateWrap.style.paddingBottom = vPad + 'px';
    }

    var styleEl = document.getElementById('dynamic-fontsize');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-fontsize';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = '.current_date { font-size:' + dateFont + 'px; line-height:1; }';

    var tblContainer = document.querySelector('.tbl_container');
    if (tblContainer) {
        tblContainer.style.height   = tblH + 'px';
        tblContainer.style.padding  = gap + 'px';
        tblContainer.style.overflow = 'hidden';
    }

    var cards = document.querySelectorAll('.info_row');
    for (var i = 0; i < cards.length; i++) {
        cards[i].style.height       = cardH + 'px';
        cards[i].style.marginBottom = gap + 'px';
    }

    var labels = document.querySelectorAll('.info_label');
    for (var i = 0; i < labels.length; i++) {
        labels[i].style.fontSize      = labelFont + 'px';
        labels[i].style.height        = cardH + 'px';
        labels[i].style.verticalAlign = 'middle';
    }

    var values = document.querySelectorAll('.info_value');
    for (var i = 0; i < values.length; i++) {
        values[i].style.fontSize      = valueFont + 'px';
        values[i].style.height        = cardH + 'px';
        values[i].style.verticalAlign = 'middle';
    }
}

window.addEventListener('resize', applyFontsize);
window.addEventListener('load', applyFontsize);

// ===================== ユーティリティ =====================
function findPointByName(name) {
    var found = null;
    Object.keys(OBSERVATION_POINTS).forEach(function(region) {
        var prefs = OBSERVATION_POINTS[region];
        Object.keys(prefs).forEach(function(pref) {
            prefs[pref].forEach(function(point) {
                if (point.name === name || point.name.includes(name) || name.includes(point.name)) {
                    found = point;
                }
            });
        });
    });
    return found;
}

function parseParamString(str, names) {
    var q = str.replace(/^[?#]/, '');
    var pairs = q ? q.split('&') : [];
    for (var i = 0; i < pairs.length; i++) {
        var kv  = pairs[i].split('=');
        var key = decodeURIComponent(kv[0]);
        var val = kv[1] ? decodeURIComponent(kv[1]) : '';
        for (var j = 0; j < names.length; j++) {
            if (key === names[j]) return val;
        }
    }
    return null;
}
function getURLParam(names) {
    return parseParamString(window.location.search, names) ||
           parseParamString(window.location.hash, names);
}

// ===================== WBGTレベル判定 =====================
function getStatusInfo(wbgt) {
    if (wbgt >= 31) return { cls: 'level-danger',    text: '危険' };
    if (wbgt >= 28) return { cls: 'level-warning',   text: '厳重警戒' };
    if (wbgt >= 25) return { cls: 'level-caution',   text: '警戒' };
    if (wbgt >= 21) return { cls: 'level-attention', text: '注意' };
    return             { cls: 'level-safe',       text: 'ほぼ安全' };
}

// ===================== UI更新 =====================
function updateUI(wbgt) {
    if (wbgtRow)  wbgtRow.style.display  = '';
    if (levelRow) levelRow.style.display = '';
    if (offSeasonMsg) offSeasonMsg.classList.remove('show');

    if (wbgt !== null) {
        var info = getStatusInfo(wbgt);
        if (wbgtValueEl)  { wbgtValueEl.textContent  = wbgt.toFixed(1) + '℃'; wbgtValueEl.className  = 'info_value ' + info.cls; }
        if (levelValueEl) { levelValueEl.textContent = info.text;               levelValueEl.className = 'info_value ' + info.cls; }
    } else {
        if (wbgtValueEl)  { wbgtValueEl.textContent  = 'データなし'; wbgtValueEl.className  = 'info_value'; }
        if (levelValueEl) { levelValueEl.textContent = '--';         levelValueEl.className = 'info_value'; }
    }
    applyFontsize();
}

// ===================== WBGTデータ取得 =====================
function parseWBGTFromHTML(html) {
    var patterns = [
        /WBGT[：:]\s*([\d.]+)/i,
        /暑さ指数[：:]\s*([\d.]+)/,
        /([\d.]+)\s*℃/,
        /value[："']?\s*([\d.]+)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
        var m = html.match(patterns[i]);
        if (m && m[1]) {
            var v = parseFloat(m[1]);
            if (!isNaN(v) && v >= 0 && v <= 50) return v;
        }
    }
    return null;
}

function fetchWBGTData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', WBGT_API_BASE + '/get-wbgt-html', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            updateUI(parseWBGTFromHTML(xhr.responseText));
        } else {
            updateUI(null);
        }
    };
    xhr.onerror = function() { updateUI(null); };
    xhr.send();
}

// ===================== 地点設定 =====================
function setLocation(name) {
    var point = findPointByName(name);
    currentPoint = point || { code: 'custom', name: name };
    if (locationValue) locationValue.textContent = currentPoint.name;
    fetchWBGTData();
}

// ===================== window.yodeck オブジェクトを待つ =====================
function waitForYodeck(maxWait, callback) {
    var waited = 0;
    function check() {
        if (typeof window.yodeck !== 'undefined') { callback(true); return; }
        waited += 100;
        if (waited >= maxWait) { callback(false); return; }
        setTimeout(check, 100);
    }
    check();
}

// ===================== 初期化 =====================
(function init() {
    // _savedLocation が設定されるまで最大5秒ポーリング
    // init_widget がいつ呼ばれても対応できる
    var pollCount = 0;
    var pollTimer = setInterval(function() {
        if (_savedLocation) {
            clearInterval(pollTimer);
            setLocation(_savedLocation);
            setInterval(function() { if (currentPoint) fetchWBGTData(); }, 60 * 1000);
            return;
        }
        pollCount++;
        if (pollCount >= 50) { // 5秒経過
            clearInterval(pollTimer);
            // URLパラメータを最終フォールバックとして確認（ローカルテスト用）
            var locParam = getURLParam(['location', 'loc', 'city']);
            if (locParam) {
                setLocation(locParam);
            } else {
                if (locationValue) locationValue.textContent = '地点なし';
            }
            setInterval(function() { if (currentPoint) fetchWBGTData(); }, 60 * 1000);
        }
    }, 100);
})();

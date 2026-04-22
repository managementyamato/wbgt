// ===================== 気象警報・注意報表示 =====================
// 気象庁API から現在の警報・注意報を取得して表示
// https://www.jma.go.jp/bosai/warning/data/warning/{areaCode}.json

// 都道府県コード（気象庁警報API用）
var PREF_CODES = [
  { code:'011000', name:'北海道（宗谷）' },
  { code:'012000', name:'北海道（上川・留萌）' },
  { code:'013000', name:'北海道（網走・北見・紋別）' },
  { code:'014030', name:'北海道（十勝）' },
  { code:'015000', name:'北海道（釧路・根室）' },
  { code:'016000', name:'北海道（胆振・日高）' },
  { code:'017000', name:'北海道（石狩・空知・後志）' },
  { code:'018000', name:'北海道（渡島・檜山）' },
  { code:'020000', name:'青森県' },
  { code:'030000', name:'岩手県' },
  { code:'040000', name:'宮城県' },
  { code:'050000', name:'秋田県' },
  { code:'060000', name:'山形県' },
  { code:'070000', name:'福島県' },
  { code:'080000', name:'茨城県' },
  { code:'090000', name:'栃木県' },
  { code:'100000', name:'群馬県' },
  { code:'110000', name:'埼玉県' },
  { code:'120000', name:'千葉県' },
  { code:'130000', name:'東京都' },
  { code:'140000', name:'神奈川県' },
  { code:'150000', name:'新潟県' },
  { code:'160000', name:'富山県' },
  { code:'170000', name:'石川県' },
  { code:'180000', name:'福井県' },
  { code:'190000', name:'山梨県' },
  { code:'200000', name:'長野県' },
  { code:'210000', name:'岐阜県' },
  { code:'220000', name:'静岡県' },
  { code:'230000', name:'愛知県' },
  { code:'240000', name:'三重県' },
  { code:'250000', name:'滋賀県' },
  { code:'260000', name:'京都府' },
  { code:'270000', name:'大阪府' },
  { code:'280000', name:'兵庫県' },
  { code:'290000', name:'奈良県' },
  { code:'300000', name:'和歌山県' },
  { code:'310000', name:'鳥取県' },
  { code:'320000', name:'島根県' },
  { code:'330000', name:'岡山県' },
  { code:'340000', name:'広島県' },
  { code:'350000', name:'山口県' },
  { code:'360000', name:'徳島県' },
  { code:'370000', name:'香川県' },
  { code:'380000', name:'愛媛県' },
  { code:'390000', name:'高知県' },
  { code:'400000', name:'福岡県' },
  { code:'410000', name:'佐賀県' },
  { code:'420000', name:'長崎県' },
  { code:'430000', name:'熊本県' },
  { code:'440000', name:'大分県' },
  { code:'450000', name:'宮崎県' },
  { code:'460100', name:'鹿児島県' },
  { code:'471000', name:'沖縄本島地方' }
];

// 警報種別の日本語名・重要度
var WARNING_TYPES = {
  '特別警報': { level: 5, label: '特別警報', color: '#7b1fa2' },
  '警報':     { level: 4, label: '警報',     color: '#c62828' },
  '注意報':   { level: 3, label: '注意報',   color: '#e65100' },
  '情報':     { level: 2, label: '気象情報', color: '#1565c0' }
};

var _timer = null;

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

  var prefCode = config.prefCode || '130000';
  _fetch(prefCode);

  var mins = parseInt(config.refreshMin || '10', 10);
  _timer = setInterval(function() { _fetch(prefCode); }, mins * 60 * 1000);

  _startClock();
}

function _fetch(prefCode) {
  _setLoading();
  var xhr = new XMLHttpRequest();
  var url = 'https://www.jma.go.jp/bosai/warning/data/warning/' + prefCode + '.json';
  xhr.open('GET', url, true);
  xhr.timeout = 15000;
  xhr.onload = function() {
    if (xhr.status !== 200) {
      _setError('気象庁API ' + xhr.status);
      return;
    }
    try {
      var data = JSON.parse(xhr.responseText);
      _display(data, prefCode);
    } catch(e) {
      _setError('データ解析エラー');
    }
  };
  xhr.ontimeout = function() { _setError('タイムアウト'); };
  xhr.onerror   = function() { _setError('通信エラー'); };
  xhr.send();
}

function _display(data, prefCode) {
  var prefName = '';
  for (var i = 0; i < PREF_CODES.length; i++) {
    if (PREF_CODES[i].code === prefCode) { prefName = PREF_CODES[i].name; break; }
  }

  // 警報・注意報を収集
  var alerts = [];
  if (data && data.areaTypes) {
    data.areaTypes.forEach(function(areaType) {
      if (!areaType.areas) return;
      areaType.areas.forEach(function(area) {
        if (!area.warnings) return;
        area.warnings.forEach(function(w) {
          if (w.status === '発表' || w.status === '継続') {
            alerts.push({
              area:    area.name,
              type:    w.type,
              status:  w.status,
              level:   _getLevel(w.type)
            });
          }
        });
      });
    });
  }

  // 重要度順にソート
  alerts.sort(function(a, b) { return b.level - a.level; });

  // 重複除去（同じ警報種別・同じエリアは一つに）
  var seen = {};
  alerts = alerts.filter(function(a) {
    var key = a.area + '|' + a.type;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });

  var headerEl = document.getElementById('pref-name');
  if (headerEl) headerEl.textContent = prefName;

  var listEl = document.getElementById('alert-list');
  var noAlertEl = document.getElementById('no-alert');

  if (alerts.length === 0) {
    if (listEl)    listEl.style.display = 'none';
    if (noAlertEl) noAlertEl.style.display = '';
    _setBodyTheme('safe');
    return;
  }

  if (noAlertEl) noAlertEl.style.display = 'none';
  if (listEl)    listEl.style.display = '';

  // 最も重いレベル
  var maxLevel = alerts[0].level;
  if (maxLevel >= 5)      _setBodyTheme('special');
  else if (maxLevel >= 4) _setBodyTheme('warning');
  else                    _setBodyTheme('caution');

  // リスト描画
  if (listEl) {
    listEl.innerHTML = '';
    var maxShow = 8;
    alerts.slice(0, maxShow).forEach(function(a) {
      var item = document.createElement('div');
      item.className = 'alert-item level-' + a.level;
      item.innerHTML =
        '<span class="alert-type">' + _esc(a.type) + '</span>' +
        '<span class="alert-area">' + _esc(a.area) + '</span>';
      listEl.appendChild(item);
    });
    if (alerts.length > maxShow) {
      var more = document.createElement('div');
      more.className = 'alert-more';
      more.textContent = '他 ' + (alerts.length - maxShow) + ' 件';
      listEl.appendChild(more);
    }
  }

  // サマリー
  var summaryEl = document.getElementById('summary');
  if (summaryEl) {
    summaryEl.textContent = '現在 ' + alerts.length + ' 件の警報・注意報が発表されています';
  }
}

function _getLevel(typeName) {
  if (typeName.indexOf('特別警報') >= 0) return 5;
  if (typeName.indexOf('警報') >= 0)     return 4;
  if (typeName.indexOf('注意報') >= 0)   return 3;
  return 2;
}

function _setBodyTheme(theme) {
  document.body.className = 'theme-' + theme;
}

function _setLoading() {
  var listEl    = document.getElementById('alert-list');
  var noAlertEl = document.getElementById('no-alert');
  var summaryEl = document.getElementById('summary');
  if (listEl)    listEl.style.display = 'none';
  if (noAlertEl) { noAlertEl.style.display = ''; noAlertEl.textContent = 'データ取得中…'; }
  if (summaryEl) summaryEl.textContent = '';
  _setBodyTheme('loading');
}

function _setError(msg) {
  var noAlertEl = document.getElementById('no-alert');
  var summaryEl = document.getElementById('summary');
  if (noAlertEl) { noAlertEl.style.display = ''; noAlertEl.textContent = 'エラー: ' + msg; }
  if (summaryEl) summaryEl.textContent = '';
  _setBodyTheme('loading');
}

function _startClock() {
  _updateClock();
  setInterval(_updateClock, 30000);
}

function _updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent = _z(now.getHours()) + ':' + _z(now.getMinutes()) + ' 更新';
}

function _z(n) { return String(n).padStart(2, '0'); }

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

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
      prefCode:   '130000',
      refreshMin: '10',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

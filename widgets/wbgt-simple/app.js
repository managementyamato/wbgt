// ===================== WBGT（暑さ指数）シンプル版 v2 =====================
//
// データソース: 環境省 熱中症予防情報サイトの予測値（公式WBGT値）
// 経路: GitHub Actions が30分毎に yohou_all.csv を取得 → 地点別JSONに分割
//       → GitHub Pages で公開 → 本ウィジェットがJSONを読む
//
// 表示される値は環境省サイトと同じ公式値（屋外日向の正式式で計算済）。
// ローカル計算は一切行わない。
//
// === config ===
//   prefecture  : 都道府県名（必須）
//   dataBaseUrl : GitHub Pages のURL末尾。例: https://user.github.io/repo/wbgt
//                 （/wbgt/{code}.json が読める構造）
//   theme       : 配色テーマ
//   refreshMin  : 再取得間隔（分）

var _config = null;
var _tickInterval = null;

// 都道府県 → 環境省WBGT地点コード
var PREF_TO_CODE = {
  '北海道':'14163','青森県':'31312','岩手県':'33472','宮城県':'34392','秋田県':'32402',
  '山形県':'35426','福島県':'36126','茨城県':'40201','栃木県':'41277','群馬県':'42251',
  '埼玉県':'43056','千葉県':'45147','東京都':'44132','神奈川県':'46106','新潟県':'54232',
  '富山県':'55102','石川県':'56227','福井県':'57066','山梨県':'49142','長野県':'48331',
  '岐阜県':'52586','静岡県':'50331','愛知県':'51106','三重県':'53133','滋賀県':'60131',
  '京都府':'61286','大阪府':'62078','兵庫県':'63518','奈良県':'64036','和歌山県':'65042',
  '鳥取県':'69122','島根県':'68132','岡山県':'66408','広島県':'67437','山口県':'81428',
  '徳島県':'71106','香川県':'72086','愛媛県':'73166','高知県':'74181','福岡県':'82182',
  '佐賀県':'85142','長崎県':'84496','熊本県':'86141','大分県':'83216','宮崎県':'87376',
  '鹿児島県':'88317','沖縄県':'91197'
};

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
  if (!_config) {
    _config = { prefecture: '東京都' };
    _start();
  }
});

function _start() {
  _applyTheme(_config);

  var pref = _config.prefecture || '東京都';
  var code = PREF_TO_CODE[pref];
  if (!code) {
    _showError('都道府県が認識できません: ' + pref);
    return;
  }

  var baseUrl = (_config.dataBaseUrl || '').replace(/\/$/, '');
  if (!baseUrl) {
    // 開発用フォールバック: localhost/127.0.0.1 で開いている場合は
    // 同じサーバー配下の /docs/wbgt/ を参照（プレビュー動作確認用）
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      baseUrl = window.location.origin + '/docs/wbgt';
    } else {
      _showError('データURL未設定\nYodeck UI設定で dataBaseUrl に GitHub Pages のURLを設定してください');
      return;
    }
  }

  _setText('loc', pref);
  _fetchAndUpdate(baseUrl, code, pref);

  var refreshMin = parseInt(_config.refreshMin || '15', 10);
  if (!isFinite(refreshMin) || refreshMin < 1) refreshMin = 15;
  if (_tickInterval) clearInterval(_tickInterval);
  _tickInterval = setInterval(function() {
    _fetchAndUpdate(baseUrl, code, pref);
  }, refreshMin * 60 * 1000);
}

function _applyTheme(cfg) {
  var theme = (cfg.theme || 'white').toLowerCase();
  var themes = {
    white: { bg: '#ffffff', fg: '#111111', sub: '#555555', accent: '#1a73e8' },
    dark:  { bg: '#0d1628', fg: '#f5f5f5', sub: '#9bb0c9', accent: '#44ccff' },
    navy:  { bg: '#003366', fg: '#ffffff', sub: '#9bc2e0', accent: '#44ccff' },
    black: { bg: '#000000', fg: '#ffffff', sub: '#888888', accent: '#44ccff' }
  };
  var t = themes[theme] || themes.white;
  document.documentElement.style.setProperty('--bg', t.bg);
  document.documentElement.style.setProperty('--fg', t.fg);
  document.documentElement.style.setProperty('--sub', t.sub);
  document.documentElement.style.setProperty('--accent', t.accent);
}

function _setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _showMain() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('header').style.display = '';
  document.getElementById('main').style.display = 'flex';
  document.getElementById('footer').style.display = '';
}

function _showError(msg) {
  var el = document.getElementById('loading');
  el.textContent = msg;
  el.classList.add('error');
  el.style.display = '';
  document.getElementById('header').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  document.getElementById('footer').style.display = 'none';
}

function getLevel(wbgt) {
  if (wbgt >= 31) return { cls: 'level-danger',    label: '危険' };
  if (wbgt >= 28) return { cls: 'level-warning',   label: '厳重警戒' };
  if (wbgt >= 25) return { cls: 'level-caution',   label: '警戒' };
  if (wbgt >= 21) return { cls: 'level-attention', label: '注意' };
  return             { cls: 'level-safe',       label: 'ほぼ安全' };
}

function _fetchAndUpdate(baseUrl, code, pref) {
  var url = baseUrl + '/' + code + '.json?t=' + Date.now();  // キャッシュバスト
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status !== 200) {
      _showError('WBGTデータ取得失敗 ' + xhr.status + '\n' + url);
      return;
    }
    try {
      var data = JSON.parse(xhr.responseText);
      _render(data, pref);
    } catch (e) {
      _showError('JSONパースエラー: ' + e.message);
    }
  };
  xhr.ontimeout = function() { _showError('タイムアウト\n' + url); };
  xhr.onerror   = function() { _showError('通信エラー\n' + url); };
  xhr.send();
}

function _render(data, pref) {
  if (!data.current || typeof data.current.wbgt !== 'number') {
    _showError('現在値データなし\n（環境省WBGTは4月下旬〜10月のみ配信）');
    return;
  }

  var wbgt = data.current.wbgt;
  var level = getLevel(wbgt);

  _setText('wbgt-val', wbgt.toFixed(1));
  _setText('loc', pref + '（' + (data.name || data.code) + '）');

  // 実況値の観測時刻
  var t = data.current.time ? new Date(data.current.time) : null;
  if (t && !isNaN(t)) {
    var md = (t.getMonth() + 1) + '/' + t.getDate();
    var hm = _pad2(t.getHours()) + ':' + _pad2(t.getMinutes());
    _setText('wbgt-time', md + ' ' + hm + ' 時点の実況');
  } else {
    _setText('wbgt-time', '');
  }

  var levelEl = document.getElementById('level');
  levelEl.textContent = level.label;
  levelEl.className = 'level ' + level.cls;

  // 更新時刻
  var updatedStr = data.updated || '';
  if (updatedStr) {
    var u = new Date(updatedStr);
    if (!isNaN(u)) {
      _setText('updated', '環境省データ更新: ' + u.getFullYear() + '/' + _pad2(u.getMonth()+1) + '/' + _pad2(u.getDate()) + ' ' + _pad2(u.getHours()) + ':' + _pad2(u.getMinutes()));
    } else {
      _setText('updated', '更新: ' + updatedStr);
    }
  }

  _showMain();
}

function _pad2(n) { return (n < 10 ? '0' : '') + n; }

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
      prefecture: '大阪府',
      dataBaseUrl: 'http://localhost:8765/docs/wbgt',   // ローカルテスト用
      theme: 'dark',
      refreshMin: '15'
    });
  };
}

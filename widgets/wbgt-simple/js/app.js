/*
 * WBGT（暑さ指数）シンプル版 v3 - musaigai スタイル準拠
 *
 * - 環境省の WBGT 実況値を GitHub Pages / jsDelivr / raw.githubusercontent 経由で取得
 * - 古い Chromium でも動く CSS（flex/grid/clamp 使用せず、テーブルレイアウト+JSサイズ計算）
 * - フォント: keifont.ttf + 汎用フォールバック
 */

var _config = null;
var _tickInterval = null;

var DATA_URLS = [
	// raw.githubusercontent と github.io は数分以内に同期。
	// jsDelivr はキャッシュが長い（最大12h）ので外す。
	'https://raw.githubusercontent.com/managementyamato/wbgt/main/docs/wbgt',
	'https://managementyamato.github.io/wbgt/wbgt'
];

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
	var pref = _config.prefecture || '東京都';
	var code = PREF_TO_CODE[pref];
	if (!code) {
		_showError('都道府県が認識できません: ' + pref);
		return;
	}
	_setText('loc', pref);
	_fetchAndUpdate(code, pref);

	var refreshMin = parseInt(_config.refreshMin || '15', 10);
	if (!isFinite(refreshMin) || refreshMin < 1) refreshMin = 15;
	if (_tickInterval) clearInterval(_tickInterval);
	_tickInterval = setInterval(function() { _fetchAndUpdate(code, pref); }, refreshMin * 60 * 1000);
}

/* ---------- 共通ユーティリティ ---------- */

function _setText(id, text) {
	var el = document.getElementById(id);
	if (el) el.textContent = text;
}

function _diag(msg) {
	// 診断バーは通常非表示。トラブル時は index.html の <div id="diag"> を
	// コメントアウト解除し、style.css の #diag セクションを復活させる。
	var el = document.getElementById('diag');
	if (el) el.textContent = 'diag: ' + msg;
}

function _showMain() {
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'none';
	var wrap = document.getElementById('wrap');
	if (wrap) wrap.style.display = '';
	if (typeof applyFontsize === 'function') applyFontsize();
}

function _showError(msg) {
	var loading = document.getElementById('loading');
	if (loading) {
		loading.style.display = '';
		loading.className = 'loading centered error';
		loading.innerHTML = '<span class="inner">' + msg.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</span>';
	}
	var wrap = document.getElementById('wrap');
	if (wrap) wrap.style.display = 'none';
}

function getLevel(wbgt) {
	if (wbgt >= 31) return { cls: 'level-danger',    label: '危険' };
	if (wbgt >= 28) return { cls: 'level-warning',   label: '厳重警戒' };
	if (wbgt >= 25) return { cls: 'level-caution',   label: '警戒' };
	if (wbgt >= 21) return { cls: 'level-attention', label: '注意' };
	return             { cls: 'level-safe',       label: 'ほぼ安全' };
}

function _pad2(n) { return (n < 10 ? '0' : '') + n; }

/* ---------- データ取得（複数CDNフォールバック） ---------- */

var _tryResults = [];
var _jsonpDone = false;

function _fetchAndUpdate(code, pref) {
	_tryResults = [];
	_tryUrls(DATA_URLS, 0, code, pref);
}

/*
 * JSONP フォールバック：XHRが全部ダメな時に <script> タグで読み込む。
 * Yodeck テンプレ配信時など、connect-src で外部XHR が塞がれている環境での代替経路。
 */
function _tryJsonp(code, pref) {
	_jsonpDone = false;
	window.__WBGT_CB = function(data) {
		if (_jsonpDone) return;
		_jsonpDone = true;
		_diag('JSONP OK wbgt=' + (data && data.current && data.current.wbgt));
		_render(data, pref);
	};

	var base = DATA_URLS[0]; // 最優先CDNの .js を試す
	var host = base.replace(/^https?:\/\//, '').split('/')[0];
	var scriptUrl = base + '/' + code + '.js?t=' + Date.now();
	var s = document.createElement('script');
	s.src = scriptUrl;
	s.async = true;
	s.onerror = function() {
		if (_jsonpDone) return;
		_jsonpDone = true;
		_tryResults.push({ host: host + ' (JSONP)', reason: 'script load err' });
		_showError('全経路取得失敗\n' + _tryResults.map(function(r){return '・'+r.host+': '+r.reason;}).join('\n'));
	};
	document.head.appendChild(s);

	// JSONP タイムアウト
	setTimeout(function() {
		if (_jsonpDone) return;
		_jsonpDone = true;
		_tryResults.push({ host: host + ' (JSONP)', reason: 'timeout(15s)' });
		_showError('全経路取得失敗\n' + _tryResults.map(function(r){return '・'+r.host+': '+r.reason;}).join('\n'));
	}, 15000);
}

function _tryUrls(urls, idx, code, pref) {
	if (idx >= urls.length) {
		// XHR全滅 → JSONPに切替え
		_diag('XHR全滅 → JSONP フォールバック試行');
		_tryJsonp(code, pref);
		return;
	}
	var base = urls[idx];
	var url  = base + '/' + code + '.json?t=' + Date.now();
	var host = base.replace(/^https?:\/\//, '').split('/')[0];
	_diag('[' + (idx+1) + '/' + urls.length + '] trying ' + host);

	// 中間キャッシュ無効化は ?t=タイムスタンプ クエリのみで対応
	// （setRequestHeader で Cache-Control を付けると CORS preflight が発動し
	//  一部CDNで失敗するため）
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.timeout = 15000;  // Pi の遅いネット環境でも拾えるよう長めに
	xhr.onload = function() {
		if (xhr.status !== 200) {
			_tryResults.push({ host: host, reason: 'HTTP ' + xhr.status });
			_tryUrls(urls, idx + 1, code, pref);
			return;
		}
		try {
			var data = JSON.parse(xhr.responseText);
			_diag('OK [' + host + '] wbgt=' + (data.current && data.current.wbgt));
			_render(data, pref);
		} catch (e) {
			_tryResults.push({ host: host, reason: 'parse err' });
			_tryUrls(urls, idx + 1, code, pref);
		}
	};
	xhr.ontimeout = function() {
		_tryResults.push({ host: host, reason: 'timeout(15s)' });
		_tryUrls(urls, idx + 1, code, pref);
	};
	xhr.onerror = function() {
		_tryResults.push({ host: host, reason: 'network err' });
		_tryUrls(urls, idx + 1, code, pref);
	};
	xhr.send();
}

/* ---------- 描画 ---------- */

function _render(data, pref) {
	if (!data.current || typeof data.current.wbgt !== 'number') {
		_showError('現在値データなし\n（環境省WBGTは4月下旬〜10月のみ配信）');
		return;
	}
	var wbgt = data.current.wbgt;
	var level = getLevel(wbgt);

	_setText('wbgt-val', wbgt.toFixed(1));
	_setText('loc', pref + '（' + (data.name || data.code) + '）');

	/* 対象時刻 */
	var t = data.current.time ? new Date(data.current.time) : null;
	if (t && !isNaN(t)) {
		_setText('wbgt-time', (t.getMonth()+1) + '/' + t.getDate() + ' ' + _pad2(t.getHours()) + ':' + _pad2(t.getMinutes()) + ' 時点');
	}

	/* レベルバッジ */
	var levelEl = document.getElementById('level');
	if (levelEl) {
		levelEl.textContent = level.label;
		levelEl.className = 'info_value ' + level.cls;
	}

	_showMain();
}

/* ---------- Yodeck postMessage ---------- */

window.addEventListener('message', function(e) {
	var msg = e.data;
	if (!msg || !msg.functions) return;
	for (var i = 0; i < msg.functions.length; i++) {
		var fn = msg.functions[i];
		if (fn.fname === 'init_widget' && fn.data) init_widget(fn.data);
	}
});

if (window.location.protocol === 'file:') {
	window.onload = function() {
		init_widget({ prefecture: '大阪府' });
	};
}

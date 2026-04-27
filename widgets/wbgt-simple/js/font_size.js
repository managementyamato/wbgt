/*
 * モード別レスポンシブ対応:
 *   - portrait (aspect < 0.7):  縦2段
 *   - flat     (aspect >= 3.5): 1行均等配置
 *   - standard (その他、16:9等): 元の2カラム横並び
 *
 * コンテナは常に画面の98%を占有し、画面中央に配置。
 * アスペクト比を強制変更しない（どんな画面比率でも画面ぴったり）。
 */

function applyFontsize() {
	var container = document.getElementsByClassName("container")[0];
	if (!container) return;

	var vw = window.innerWidth;
	var vh = window.innerHeight;
	var aspect = vw / vh;

	/* モード判定 */
	var mode;
	if (aspect < 0.7)       mode = 'portrait';
	else if (aspect >= 3.5) mode = 'flat';
	else                    mode = 'standard';
	container.className = 'container mode-' + mode;

	/* flat モードでは DOM 順を 日時→地点名 に入れ替える */
	_reorderForFlat(mode === 'flat');

	/* コンテナは画面ぴったりに配置（常に画面中央） */
	var cw = Math.round(vw * 0.98);
	var ch = Math.round(vh * 0.98);
	container.style.width  = cw + 'px';
	container.style.height = ch + 'px';
	container.style.left   = Math.round((vw - cw) / 2) + 'px';
	container.style.top    = Math.round((vh - ch) / 2) + 'px';

	/* モード別フォントサイズ計算 */
	if (mode === 'portrait')     _applyPortraitLayout(cw, ch);
	else if (mode === 'flat')    _applyFlatLayout(cw, ch);
	else                         _applyStandardLayout(cw, ch);
}

/* ---------- standard (16:9等) 2カラム ---------- */
function _applyStandardLayout(cw, ch) {
	var rightW = cw * 0.55;
	var leftW  = cw * 0.45;

	var valueFont   = Math.min(rightW * 0.30, ch * 0.50, 240);
	var unitFont    = valueFont * 0.40;
	var levelFont   = Math.min(rightW * 0.14, ch * 0.22, 100);
	var obsNameFont = Math.min(leftW * 0.32, ch * 0.32, 160);
	var timeFont    = levelFont;

	obsNameFont = Math.max(obsNameFont, levelFont);

	/* 実測フィット: 地点名と時刻が列幅85%に収まる最大サイズ */
	var usableLeft = leftW * 0.85;
	obsNameFont = Math.min(obsNameFont, _fitToWidth('.obs_name',  usableLeft, obsNameFont));
	timeFont    = Math.min(timeFont,    _fitToWidth('.wbgt_time', usableLeft, timeFont));

	_setFS('.wbgt_value', valueFont);
	_setFS('.wbgt_unit',  unitFont);
	_setFS('.wbgt_time',  timeFont);
	_setFS('.obs_name',   obsNameFont);
	_setFS('.level',      levelFont);
}

/* ---------- portrait (縦長) 縦2段 ---------- */
function _applyPortraitLayout(cw, ch) {
	var halfH = ch * 0.5;
	var UNIT_RATIO = 0.40;   /* ℃ のサイズ割合（対 value）*/
	var usableW = cw * 0.85;

	/* 値+℃ が cw に収まる最大 valueFont を実測で算出 */
	var wValue = _measure('.wbgt_value', 100);
	var wUnit  = _measure('.wbgt_unit',  100);
	var emValueTotal = (wValue + wUnit * UNIT_RATIO) / 100 + 0.05;  /* margin-left:2% を少し加味 */
	var valueFitW = usableW / emValueTotal;

	var valueFont   = Math.min(cw * 0.40, halfH * 0.55, 240, valueFitW);
	var unitFont    = valueFont * UNIT_RATIO;
	var levelFont   = Math.min(cw * 0.14, halfH * 0.22, 90);
	/* 上段の地点名・時刻は下段（値）とバランス取れるよう大きめに */
	var obsNameFont = Math.min(cw * 0.32, halfH * 0.42, 160);
	var timeFont    = Math.min(cw * 0.18, halfH * 0.22, 80);
	obsNameFont = Math.max(obsNameFont, levelFont);
	timeFont    = Math.max(timeFont,    levelFont);

	obsNameFont = Math.min(obsNameFont, _fitToWidth('.obs_name',  usableW, obsNameFont));
	timeFont    = Math.min(timeFont,    _fitToWidth('.wbgt_time', usableW, timeFont));

	_setFS('.wbgt_value', valueFont);
	_setFS('.wbgt_unit',  unitFont);
	_setFS('.wbgt_time',  timeFont);
	_setFS('.obs_name',   obsNameFont);
	_setFS('.level',      levelFont);
}

/* ---------- flat (横長) 1行均等 ---------- */
function _applyFlatLayout(cw, ch) {
	/* 4要素が1行に確実に収まるよう、実測で逆算する。
	 * 各要素を参照100pxで measureText し、合計幅 + マージン + levelパディング
	 * が cw に収まる最大 baseFont を計算。 */
	var VALUE_RATIO = 1.1;   /* 気温を他より何倍大きくするか */
	var UNIT_RATIO  = 0.55;  /* ℃ のサイズ割合（対 value）*/
	var LEVEL_PAD_EM = 2;    /* バッジの左右パディング合計 (em) */
	var ITEM_MARGIN_EM = 1;  /* 各要素の左右マージン合計 (0.5em x 2) */

	var wTime  = _measure('.wbgt_time',  100);
	var wName  = _measure('.obs_name',   100);
	var wValue = _measure('.wbgt_value', 100);
	var wUnit  = _measure('.wbgt_unit',  100);
	var wLevel = _measure('.level',      100);

	/* 1em あたりで必要な幅 = 各要素テキスト幅 + バッジパディング + 要素マージン */
	var emPerItem = (wTime + wName + wValue*VALUE_RATIO + wUnit*UNIT_RATIO*VALUE_RATIO + wLevel) / 100;
	var emTotal = emPerItem + LEVEL_PAD_EM + ITEM_MARGIN_EM * 4;  /* 4要素分のマージン */

	/* col の padding 3% (両側合計6%) も差し引いて、さらに安全マージン10% */
	var availableW = cw * 0.85;
	var widthFont = availableW / emTotal;
	var heightFont = ch * 0.55;

	var baseFont  = Math.min(widthFont, heightFont);
	var valueFont = baseFont * VALUE_RATIO;
	var unitFont  = baseFont * UNIT_RATIO * VALUE_RATIO;
	var levelFont = baseFont;

	_setFS('.obs_name',   baseFont);
	_setFS('.wbgt_time',  baseFont);
	_setFS('.level',      levelFont);
	_setFS('.wbgt_value', valueFont);
	_setFS('.wbgt_unit',  unitFont);
}

/* ---------- ユーティリティ ---------- */

function _setFS(selector, px) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		els[i].style.fontSize = px + 'px';
	}
}

/* 指定要素のテキストを fontPx で測った幅を返す */
function _measure(selector, fontPx) {
	var el = document.querySelector(selector);
	if (!el || !el.textContent) return 0;
	var canvas = _measure._canvas || (_measure._canvas = document.createElement('canvas'));
	var ctx = canvas.getContext('2d');
	var cs = getComputedStyle(el);
	var family = cs.fontFamily || 'sans-serif';
	var weight = cs.fontWeight || 'normal';
	ctx.font = weight + ' ' + fontPx + 'px ' + family;
	return ctx.measureText(el.textContent).width;
}

/* 指定要素のテキストが maxW に収まる最大フォントを返す（canvas measureText） */
function _fitToWidth(selector, maxW, maxFont) {
	var el = document.querySelector(selector);
	if (!el || !el.textContent) return maxFont;
	var canvas = _fitToWidth._canvas || (_fitToWidth._canvas = document.createElement('canvas'));
	var ctx = canvas.getContext('2d');
	var cs = getComputedStyle(el);
	var family = cs.fontFamily || 'sans-serif';
	var weight = cs.fontWeight || 'normal';
	ctx.font = weight + ' 100px ' + family;
	var w = ctx.measureText(el.textContent).width;
	if (w <= 0) return maxFont;
	return Math.min(100 * maxW / w, maxFont);
}

/* flat時のみ、col_left内の 日時 → 地点名 順に入れ替え */
function _reorderForFlat(flat) {
	var colLeft = document.querySelector('.col_left');
	if (!colLeft) return;
	var obsBlock = colLeft.querySelector('.obs_block');
	var wbgtTime = colLeft.querySelector('.wbgt_time');
	if (!obsBlock || !wbgtTime) return;
	if (flat) {
		if (wbgtTime.nextSibling !== obsBlock) {
			colLeft.insertBefore(wbgtTime, obsBlock);
		}
	} else {
		if (obsBlock.nextSibling !== wbgtTime) {
			colLeft.insertBefore(obsBlock, wbgtTime);
		}
	}
}

window.addEventListener('resize', applyFontsize);
window.addEventListener('load',   applyFontsize);

/* フォント読み込み完了後に再計算（measureText の結果が実描画と合うように） */
if (document.fonts && document.fonts.ready) {
	document.fonts.ready.then(function() {
		applyFontsize();
	});
}
/* フォールバック: 古いブラウザでは遅延リトライ */
setTimeout(applyFontsize, 500);
setTimeout(applyFontsize, 1500);

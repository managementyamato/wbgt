/*
 * 2カラムレイアウト（左: 観測地点+時刻, 右: WBGT値+バッジ）の
 * アスペクト比適応型フォントサイズ計算。
 * clamp/min 等の新CSS関数は使わず、px直接指定で Pi 古い Chromium でも動く。
 */

function applyFontsize() {
	var container = document.getElementsByClassName("container")[0];
	if (!container) return;

	var vw = window.innerWidth;
	var vh = window.innerHeight;
	var aspect = vw / vh;

	/* 縦長すぎる（アスペクト < 0.7）場合は縦積み、それ以外は 2カラム横並び */
	var mode = (aspect < 0.7) ? 'portrait' : (aspect >= 2.5 ? 'banner' : 'standard');
	container.className = 'container mode-' + mode;

	/* コンテナサイズ（余白 1% ずつ） */
	var maxW = vw * 0.98;
	var maxH = vh * 0.98;
	var targetRatio = (mode === 'portrait') ? aspect : (mode === 'banner' ? aspect : 16/9);
	var cw, ch;
	if (maxW / maxH > targetRatio) {
		ch = maxH; cw = Math.round(ch * targetRatio);
	} else {
		cw = maxW; ch = Math.round(cw / targetRatio);
	}
	container.style.width  = cw + 'px';
	container.style.height = ch + 'px';
	container.style.left   = Math.round((vw - cw) / 2) + 'px';
	container.style.top    = Math.round((vh - ch) / 2) + 'px';

	/* 各モードでフォントサイズを計算・適用 */
	if (mode === 'portrait') {
		_applyPortraitLayout(cw, ch);
	} else {
		_applyRowLayout(cw, ch, mode);
	}
}

/* ---------- 2カラム（standard / banner） ---------- */
function _applyRowLayout(cw, ch, mode) {
	/* 右カラム (55%) の幅 */
	var rightW = Math.round(cw * 0.55);
	var leftW  = Math.round(cw * 0.45);

	/* WBGT値: "14.2℃" の合計幅が右カラムに収まるよう控えめに */
	var valueFont   = Math.min(rightW * 0.30, ch * 0.50, 240);
	var unitFont    = valueFont * 0.40;
	var levelFont   = Math.min(rightW * 0.14, ch * 0.22, 100);
	/* 観測地点名: 右カラムの数値と視覚バランスを取る */
	var obsNameFont = Math.min(leftW * 0.32, ch * 0.32, 160);
	/* 時刻は後段で実測してフィットさせる（初期値は緩い上限） */
	var timeFont    = Math.min(ch * 0.15, 100);

	/* 観測地点名は levelFont（ほぼ安全バッジ）以上を保証（潰れ防止） */
	obsNameFont = Math.max(obsNameFont, levelFont);

	/* 実測フィット: 地点名と時刻が列幅に収まる最大サイズを canvas で計算 */
	/* 安全マージン 85% 使用（canvas measure と実描画の誤差を吸収） */
	var nameEl = document.querySelector('.obs_name');
	var timeEl = document.querySelector('.wbgt_time');
	var colLeft = document.querySelector('.col_left');
	var colLeftRealW = colLeft ? colLeft.getBoundingClientRect().width : leftW;
	var usableLeft = colLeftRealW * 0.85;
	if (nameEl) obsNameFont = Math.min(obsNameFont, _fitFontToWidth(nameEl, usableLeft, obsNameFont));
	if (timeEl) timeFont    = Math.min(timeFont,    _fitFontToWidth(timeEl, usableLeft, timeFont));

	_setFS('.wbgt_value', valueFont);
	_setFS('.wbgt_unit',  unitFont);
	_setFS('.wbgt_time',  timeFont);
	_setFS('.obs_name',   obsNameFont);
	_setFS('.level',      levelFont);

	var rowH = Math.round(valueFont * 1.15);
	_setStyleImportant('.wbgt_row', {
		'height': rowH + 'px',
		'line-height': rowH + 'px'
	});
}

/* ---------- 縦積み（portrait） ---------- */
function _applyPortraitLayout(cw, ch) {
	/* 縦では上下 2段: 上に観測地点+時刻、下に値+バッジ（各 50%） */
	var halfH = ch * 0.5;

	var valueFont   = Math.min(cw * 0.40, halfH * 0.55, 240);
	var unitFont    = valueFont * 0.40;
	var levelFont   = Math.min(cw * 0.14, halfH * 0.22, 90);
	var timeFont    = Math.min(cw * 0.07, halfH * 0.12, 32);
	var obsTagFont  = Math.min(cw * 0.07, halfH * 0.08, 26);
	var obsNameFont = Math.min(cw * 0.20, halfH * 0.30, 90);

	/* 観測地点名は levelFont 以上を保証（潰れ防止） */
	obsNameFont = Math.max(obsNameFont, levelFont);

	/* 実測フィット（縦長モード） */
	var usableW = cw * 0.85;
	var nameEl = document.querySelector('.obs_name');
	var timeEl = document.querySelector('.wbgt_time');
	if (nameEl) obsNameFont = Math.min(obsNameFont, _fitFontToWidth(nameEl, usableW, obsNameFont));
	if (timeEl) timeFont    = Math.min(timeFont,    _fitFontToWidth(timeEl, usableW, timeFont));

	_setFS('.wbgt_value', valueFont);
	_setFS('.wbgt_unit',  unitFont);
	_setFS('.wbgt_time',  timeFont);
	_setFS('.obs_name',   obsNameFont);
	_setFS('.level',      levelFont);

	var rowH = Math.round(valueFont * 1.15);
	_setStyleImportant('.wbgt_row', {
		'height': rowH + 'px',
		'line-height': rowH + 'px'
	});
}

function _setFS(selector, px) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		els[i].style.fontSize = px + 'px';
	}
}

/* 指定要素の textContent がコンテナ幅 maxW に収まる最大フォントサイズを計算 */
function _fitFontToWidth(el, maxW, maxFont) {
	if (!el || !el.textContent) return maxFont;
	var canvas = _fitFontToWidth._canvas || (_fitFontToWidth._canvas = document.createElement('canvas'));
	var ctx = canvas.getContext('2d');
	var cs = getComputedStyle(el);
	var family = cs.fontFamily || 'sans-serif';
	var weight = cs.fontWeight || 'normal';
	ctx.font = weight + ' 100px ' + family;
	var w = ctx.measureText(el.textContent).width;
	if (w <= 0) return maxFont;
	var fit = 100 * maxW / w;
	return Math.min(fit, maxFont);
}

function _setStyleImportant(selector, props) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		for (var k in props) {
			els[i].style.setProperty(k, props[k], 'important');
		}
	}
}

window.addEventListener('resize', applyFontsize);
window.addEventListener('load',   applyFontsize);

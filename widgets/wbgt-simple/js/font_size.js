/*
 * musaigai 方式のフォントサイズ動的計算
 * viewport (vw, vh) から px 単位で直接指定する。
 * clamp/min 等のモダンCSS関数を使わないので古い Chromium でも動く。
 */

function applyFontsize() {
	var container = document.getElementsByClassName("container")[0];
	if (!container) return;

	var vw = window.innerWidth;
	var vh = window.innerHeight;

	/* セクション高さ: 14% ヘッダ + 58% 数値 + 28% バッジ（フッタなし） */
	var hdrH    = Math.round(vh * 0.14);
	var wbgtH   = Math.round(vh * 0.58);
	var levelH  = vh - hdrH - wbgtH;

	/* フォントサイズ */
	var hdrFont   = Math.min(hdrH  * 0.50, vw * 0.05);
	var locFont   = hdrFont * 0.55;
	var valueFont = Math.min(wbgtH * 0.72, vw * 0.35);
	var unitFont  = valueFont * 0.35;
	var timeFont  = Math.min(wbgtH * 0.09, vw * 0.022);
	var lvlLabelFont = Math.min(levelH * 0.38, vw * 0.04);
	var lvlValueFont = Math.min(levelH * 0.50, vw * 0.08);

	/* コンテナ */
	container.style.height   = vh + "px";
	container.style.overflow = "hidden";

	/* ヘッダ */
	var hdr = document.getElementsByClassName("hdr")[0];
	if (hdr) {
		hdr.style.height     = hdrH + "px";
		hdr.style.lineHeight = hdrH + "px";
		hdr.style.fontSize   = hdrFont + "px";
		hdr.style.padding    = "0 2%";
	}
	var locEl = document.getElementById("loc");
	if (locEl) locEl.style.fontSize = locFont + "px";

	/* WBGT エリア */
	var wbgtWrap = document.getElementsByClassName("wbgt_wrap")[0];
	if (wbgtWrap) {
		wbgtWrap.style.height = wbgtH + "px";
		wbgtWrap.style.paddingTop = Math.round(wbgtH * 0.05) + "px";
	}
	_setFontSize(".wbgt_value", valueFont);
	_setFontSize(".wbgt_unit",  unitFont);
	_setFontSize(".wbgt_time",  timeFont);

	/* レベルバッジ */
	var tblContainer = document.getElementsByClassName("tbl_container")[0];
	if (tblContainer) {
		tblContainer.style.height  = levelH + "px";
		tblContainer.style.padding = Math.round(levelH * 0.06) + "px";
	}
	var cards = document.getElementsByClassName("info_row");
	for (var i = 0; i < cards.length; i++) {
		cards[i].style.height = Math.round(levelH - levelH * 0.12) + "px";
	}
	_setFontSize(".info_label", lvlLabelFont);
	_setFontSize(".info_value", lvlValueFont);
}

function _setFontSize(selector, px) {
	var els = document.querySelectorAll(selector);
	for (var i = 0; i < els.length; i++) {
		els[i].style.fontSize = px + "px";
	}
}

window.addEventListener("resize", applyFontsize);
window.addEventListener("load",   applyFontsize);

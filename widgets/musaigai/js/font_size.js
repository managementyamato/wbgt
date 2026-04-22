const LARGE = "large";
const MEDIUM = "medium";
const SMALL = "small";

var currentFontSize = LARGE;

function setFontsize(size) {
    currentFontSize = size;
    applyFontsize();
}

function applyFontsize() {
    var container = document.getElementsByClassName("container")[0];
    if (!container) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var scale = currentFontSize == MEDIUM ? 0.65 : currentFontSize == SMALL ? 0.44 : 1.0;

    /* セクション高さ: ビューポート高さを固定比率で分割 */
    var hdrH  = Math.round(vh * 0.16);
    var dateH = Math.round(vh * 0.26);
    var tblH  = vh - hdrH - dateH;
    var gap   = Math.max(4, Math.round(tblH * 0.02));
    var cardH = Math.round((tblH - gap * 3) / 2);

    /* フォントサイズ: セクション高さ基準 × 幅上限 */
    var hdrFont   = Math.min(hdrH  * 0.55, vw * 0.10) * scale;
    var dateFont  = Math.min(dateH * 0.42, vw * 0.16) * scale;
    var suffFont  = dateFont * 0.48;
    /* vw上限: 45%カラム内に6文字(10000 日)が収まる値 */
    var labelFont = Math.min(cardH * 0.42, vw * 0.10) * scale;
    var valueFont = Math.min(cardH * 0.42, vw * 0.10) * scale;

    /* コンテナをビューポートいっぱいに */
    container.style.height     = vh + "px";
    container.style.overflow   = "hidden";
    container.style.marginTop  = "0";
    container.style.boxSizing  = "border-box";

    /* ヘッダー */
    var hdr = document.getElementsByClassName("hdr")[0];
    if (hdr) {
        hdr.style.height     = hdrH + "px";
        hdr.style.lineHeight = hdrH + "px";
        hdr.style.fontSize   = hdrFont + "px";
        hdr.style.padding    = "0 3%";
        hdr.style.boxSizing  = "border-box";
    }

    /* 日付エリア: 推定テキスト高さから上下パディングを計算 */
    var dateWrap = document.getElementsByClassName("current_date_wrap")[0];
    if (dateWrap) {
        var textH = dateFont * 1.3;
        var vPad  = Math.max(0, Math.round((dateH - textH) / 2));
        dateWrap.style.height        = dateH + "px";
        dateWrap.style.paddingTop    = vPad + "px";
        dateWrap.style.paddingBottom = vPad + "px";
        dateWrap.style.boxSizing     = "border-box";
    }

    /* 日付・エラーフォント (styleタグ経由) */
    var styleEl = document.getElementById("dynamic-fontsize");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "dynamic-fontsize";
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML =
        ".current_date{font-size:" + dateFont + "px;line-height:1;}" +
        ".current_date_suffix{font-size:" + suffFont + "px;line-height:1;}" +
        ".error_note{font-size:" + labelFont + "px;}" +
        ".error_note_2{font-size:" + (valueFont * 0.7) + "px;}";

    /* テーブルコンテナ */
    var tblContainer = document.getElementsByClassName("tbl_container")[0];
    if (tblContainer) {
        tblContainer.style.height    = tblH + "px";
        tblContainer.style.padding   = gap + "px";
        tblContainer.style.boxSizing = "border-box";
        tblContainer.style.overflow  = "hidden";
    }

    /* カード高さ */
    var cards = document.querySelectorAll(".info_row");
    for (var i = 0; i < cards.length; i++) {
        cards[i].style.height      = cardH + "px";
        cards[i].style.marginBottom = gap + "px";
    }

    /* ラベル・数値: 常に横並び */
    var infoLabels = document.getElementsByClassName("info_label");
    for (var i = 0; i < infoLabels.length; i++) {
        infoLabels[i].style.fontSize      = labelFont + "px";
        infoLabels[i].style.display       = "";
        infoLabels[i].style.width         = "55%";
        infoLabels[i].style.height        = cardH + "px";
        infoLabels[i].style.verticalAlign = "middle";
    }

    var infoValues = document.getElementsByClassName("info_value");
    for (var i = 0; i < infoValues.length; i++) {
        infoValues[i].style.fontSize      = valueFont + "px";
        infoValues[i].style.display       = "";
        infoValues[i].style.width         = "45%";
        infoValues[i].style.height        = cardH + "px";
        infoValues[i].style.textAlign     = "right";
        infoValues[i].style.verticalAlign = "middle";
    }
}

/* ウィンドウリサイズ対応 */
window.addEventListener("resize", applyFontsize);

/* 初期描画後に確実に適用 */
window.addEventListener("load", applyFontsize);

/* コンテナサイズ変化対応 (ResizeObserver対応ブラウザ) */
window.addEventListener("load", function() {
    var container = document.getElementsByClassName("container")[0];
    if (container && window.ResizeObserver) {
        var ro = new ResizeObserver(applyFontsize);
        ro.observe(container);
    }
});

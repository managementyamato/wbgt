// ===================== スクロールテキスト v21 =====================
// v20→v21 の変更点（Yodeck テンプレート配布経由で Pi でも rAF が止まる対策）:
//   ・rAF + setInterval の二重駆動にして、どちらか片方が throttle/停止しても
//     もう片方がフォールバックとして transform を更新し続ける
//   ・両者は同じ update() を呼ぶだけなので競合なし（最終書き込みが勝つ）
//   ・Pi 直接配布時: rAF が 60Hz で動くので rAF が勝ち、滑らかなスクロール
//   ・テンプレ経由で rAF 停止時: setInterval(30ms = 33Hz) が駆動、やや粗いが確実に動く
//
// v19→v20 の変更点（Pi での CSS @keyframes iteration境界消失バグへの対策）:
//   ・CSS @keyframes を廃止し、rAF/setInterval で strip の transform を更新
//   ・v19 の strip + 多コピーレイアウトは維持（継ぎ目なし連続スクロール）

var _config     = null;
var _animFrame  = null;
var _intervalId = null;
var _lastParams = null;
var _STORAGE_KEY = 'scroll_text_cfg';

function init_widget(config) {
  if (!config) return;
  _config = config;
  try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(config)); } catch(e) {}
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', _start);
    return;
  }
  _start();
}

// ページロード直後にキャッシュ設定で即起動（Yodeck postMessage より先に表示）
document.addEventListener('DOMContentLoaded', function() {
  try {
    var saved = localStorage.getItem(_STORAGE_KEY);
    if (saved && !_config) {
      _config = JSON.parse(saved);
      _start();
    }
  } catch(e) {}
});

function _start() {
  var cfg       = _config;
  var text      = cfg.text       || 'サンプルテキスト　現場の安全は全員で守る　Sample Text';
  var speed     = parseFloat(cfg.speed  || '220');
  if (!isFinite(speed) || speed <= 0) speed = 220;
  var fontSize  = cfg.fontSize   || 'auto';
  var fontFamily= cfg.fontFamily || 'keifont, sans-serif';
  var fontColor = cfg.fontColor  || '#ffffff';
  var bgColor   = cfg.bgColor    || '#000000';
  var bold      = cfg.bold   === '1' || cfg.bold   === true;
  var italic    = cfg.italic === '1' || cfg.italic === true;
  var shadow    = cfg.shadow === '1' || cfg.shadow === true;
  var gap       = parseInt(cfg.gap || '120', 10);
  if (!isFinite(gap) || gap < 0) gap = 120;

  document.body.style.background = bgColor;

  if (fontSize !== 'auto') {
    _build(parseInt(fontSize, 10), text, speed, fontFamily, fontColor, bold, italic, shadow, gap);
    return;
  }

  var done = false;
  function proceed() {
    if (done) return;
    done = true;
    var vh   = window.innerHeight || 720;
    var fsPx = _calcAutoSize(fontFamily, bold, italic, vh);
    _build(fsPx, text, speed, fontFamily, fontColor, bold, italic, shadow, gap);
  }

  var primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  var fontSpec = (bold ? 'bold ' : '') + '100px "' + primaryFont + '"';
  try {
    if (document.fonts.check(fontSpec)) { proceed(); return; }
    document.fonts.load(fontSpec).then(proceed, proceed);
  } catch(e) { proceed(); return; }
  setTimeout(proceed, 50);
}

function _calcAutoSize(fontFamily, bold, italic, vh) {
  var probe = document.createElement('span');
  probe.textContent = 'あAg';
  probe.style.cssText = [
    'font-family:' + fontFamily,
    'font-size:100px',
    'font-weight:' + (bold ? 'bold' : 'normal'),
    'font-style:' + (italic ? 'italic' : 'normal'),
    'position:fixed', 'top:-9999px', 'left:-9999px',
    'visibility:hidden', 'white-space:nowrap', 'line-height:1'
  ].join(';');
  document.body.appendChild(probe);
  var h = probe.offsetHeight || 100;
  document.body.removeChild(probe);
  return Math.max(24, Math.min(Math.floor(100 * (vh * 0.70) / h), 600));
}

function _build(fsPx, text, speed, fontFamily, fontColor, bold, italic, shadow, gap) {
  var strip = document.getElementById('strip');
  if (!strip) return;

  // 既存のrAF/setIntervalを両方停止
  _stopDrivers();

  // 既存コピーを全クリア、アニメも消す
  strip.innerHTML = '';
  strip.style.animation = 'none';
  strip.style.transform = 'translate3d(0,-50%,0)';

  var spanCSS = [
    'font-family:'   + fontFamily,
    'font-size:'     + fsPx + 'px',
    'color:'         + fontColor,
    'font-weight:'   + (bold   ? 'bold'   : 'normal'),
    'font-style:'    + (italic ? 'italic' : 'normal'),
    'letter-spacing:0.04em',
    'line-height:1',
    'text-shadow:'   + (shadow ? '3px 3px 8px rgba(0,0,0,0.8)' : 'none'),
    'padding-right:' + gap + 'px',
    'display:inline-block',
    'white-space:nowrap'
  ].join(';');

  // 計測用 probe を置き、リフローを強制して unitW を同期取得
  // （rAF に依存しないことで rAF が止まる環境でも初期化が走る）
  var probe = document.createElement('span');
  probe.setAttribute('style', spanCSS + ';visibility:hidden');
  probe.textContent = text;
  strip.appendChild(probe);
  void probe.offsetHeight; // 強制リフロー

  var vw    = window.innerWidth  || 1280;
  var unitW = probe.offsetWidth || vw;
  if (unitW <= 0) unitW = vw;

  // 必要コピー数（画面幅+1単位を常時カバー）、極短テキスト暴発防止のため上限32
  var copies = Math.min(32, Math.ceil(vw / unitW) + 2);

  // probe込みで全クリア → 実コピーを並べる
  strip.innerHTML = '';
  for (var i = 0; i < copies; i++) {
    var s = document.createElement('span');
    s.setAttribute('style', spanCSS);
    s.textContent = text;
    strip.appendChild(s);
  }

  _lastParams = { strip: strip, unitW: unitW, speed: speed };
  _run(_lastParams);
}

function _stopDrivers() {
  if (_animFrame) {
    cancelAnimationFrame(_animFrame);
    _animFrame = null;
  }
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function _run(p) {
  var startTime = (performance && performance.now) ? performance.now() : Date.now();

  function _now() {
    return (performance && performance.now) ? performance.now() : Date.now();
  }

  function update() {
    var elapsed    = _now() - startTime;
    var totalShift = (elapsed / 1000) * p.speed;
    var shift      = totalShift - Math.floor(totalShift / p.unitW) * p.unitW;
    // strip 1要素だけ動かす（負荷極小）
    p.strip.style.transform = 'translate3d(' + (-Math.round(shift)) + 'px,-50%,0)';
  }

  // rAF ループ（60Hz、主経路）
  function rafTick() {
    update();
    _animFrame = requestAnimationFrame(rafTick);
  }
  _animFrame = requestAnimationFrame(rafTick);

  // setInterval フォールバック（30ms = ~33Hz）
  // Yodeck テンプレ配布経路で rAF が止まる環境でも駆動を継続する保険
  // Pi 直接配布時は rAF が先に毎フレーム書き込むので、setInterval の書き込みは
  // 同じ値になり視覚的影響はない（最終書き込みが勝つ原則でも同じ値なので競合なし）
  _intervalId = setInterval(update, 30);
}

// タブ/ウィンドウが可視に戻った時の自己修復
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && _lastParams) {
    _stopDrivers();
    _run(_lastParams);
  }
});

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
      text:       'サンプルテキスト　現場の安全は全員で守る　Safety First　本日も無事故で作業しよう',
      speed:      '220',
      fontSize:   'auto',
      fontFamily: 'keifont, sans-serif',
      fontColor:  '#ffffff',
      bgColor:    '#000000',
      bold:       '0',
      italic:     '0',
      shadow:     '0',
      gap:        '120'
    });
  };
}

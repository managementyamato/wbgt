// ===================== 無災害記録カウンター =====================
// 最終災害発生日から今日までの無災害継続日数を大きく表示

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

  var titleEl = document.getElementById('site-title');
  if (titleEl) titleEl.textContent = config.siteTitle || '無災害記録';

  var noteEl = document.getElementById('note-text');
  if (noteEl) noteEl.textContent = config.noteText || 'みんなで続けよう、ゼロ災害！';

  if (_timer) clearInterval(_timer);
  _update(config);
  _timer = setInterval(function() { _update(config); }, 60 * 1000);
}

function _update(config) {
  var since = (config.sinceDate || '').trim();
  if (!since) {
    _setDisplay('--', '日', '開始日を設定してください');
    document.body.className = 'theme-normal';
    return;
  }

  var sinceMs = new Date(since).getTime();
  if (isNaN(sinceMs)) {
    _setDisplay('?', '日', '日付形式エラー（YYYY-MM-DD）');
    return;
  }

  var now = new Date();
  var todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var days = Math.floor((todayMs - sinceMs) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    _setDisplay('0', '日', '開始日が未来です');
    document.body.className = 'theme-normal';
    return;
  }

  _setDisplay(days.toLocaleString(), '日', _getMessage(days));

  // テーマ切り替え
  document.body.className = '';
  if (days >= 1000) {
    document.body.classList.add('theme-gold');
  } else if (days >= 365) {
    document.body.classList.add('theme-great');
  } else if (days >= 100) {
    document.body.classList.add('theme-good');
  } else {
    document.body.classList.add('theme-normal');
  }

  // 記念日マーカー
  var milestoneEl = document.getElementById('milestone');
  if (milestoneEl) {
    var ms = _getMilestone(days);
    milestoneEl.textContent = ms;
    milestoneEl.style.display = ms ? '' : 'none';
  }

  // 詳細表示
  var detailEl = document.getElementById('detail');
  if (detailEl) {
    var sinceDate = new Date(sinceMs);
    detailEl.textContent = _fmtDate(sinceDate) + ' より継続中';
  }
}

function _setDisplay(num, unit, msg) {
  var numEl  = document.getElementById('days-number');
  var unitEl = document.getElementById('days-unit');
  var msgEl  = document.getElementById('message');
  if (numEl)  numEl.textContent  = num;
  if (unitEl) unitEl.textContent = unit;
  if (msgEl)  msgEl.textContent  = msg;
}

function _getMessage(days) {
  if (days >= 1000) return '圧倒的な安全実績！この記録を守り続けましょう';
  if (days >= 730)  return '2年以上の無災害達成！素晴らしい安全意識です';
  if (days >= 365)  return '1年以上の無災害達成！チームの誇りです';
  if (days >= 200)  return '200日超え！安全への取り組みが実を結んでいます';
  if (days >= 100)  return '100日突破！この調子で続けましょう';
  if (days >= 30)   return '1ヶ月以上の無災害継続中です';
  if (days >= 7)    return '1週間以上の無災害継続中です';
  if (days >= 1)    return '無災害継続中です。今日も安全第一で！';
  return '今日から新たなスタートです。安全第一で！';
}

function _getMilestone(days) {
  var milestones = [1, 7, 30, 50, 100, 200, 300, 365, 500, 730, 1000, 2000, 3000];
  for (var i = 0; i < milestones.length; i++) {
    if (days === milestones[i]) return '🎉 ' + days + '日達成！';
  }
  return '';
}

function _fmtDate(d) {
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
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
      siteTitle:  '第一建設現場',
      sinceDate:  '2022-01-15',
      noteText:   'みんなで続けよう、ゼロ災害！',
      fontFamily: 'keifont, sans-serif'
    });
  };
}

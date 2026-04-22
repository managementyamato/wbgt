// ===================== 研修・安全クイズ =====================
// 朝礼・研修での安全クイズをスライド表示
// CSV形式: 問題文, 選択肢A, 選択肢B, 選択肢C, 選択肢D, 正解(A/B/C/D), 解説, カテゴリ

var _timer = null;
var _quizIdx = 0;
var _rows = [];
var _showAnswer = false;
var _answerTimer = null;
var SAMPLE_CSV = [
  '高所作業で墜落制止用器具（安全帯）の着用が義務付けられる高さは？,1m以上,1.5m以上,2m以上,3m以上,C,労働安全衛生規則第518条より高さ2m以上の高所作業では必ず着用,墜落防止',
  '作業開始前の点検で必ず確認すべきでないものはどれ？,工具の状態,保護具の状態,今日の天気予報,作業手順,C,天気の確認も重要ですが「必ず」の点検義務ではありません,安全点検',
  'ヒヤリハットの法則「ハインリッヒの法則」では重大事故1件の背後に？,10件の軽微な事故,29件の軽微な事故,100件の軽微な事故,300件の軽微な事故,B,1件の重大事故の背後に29件の軽微な事故と300件のヒヤリハットがある,安全意識',
  '玉掛け作業で使用するワイヤーロープの廃棄基準（素線切れ）は？,5%以上,10%以上,15%以上,20%以上,B,1より内の素線数の10%以上が切断している場合は廃棄,クレーン作業',
  '酸素欠乏危険作業とは空気中の酸素濃度が何%未満の状態か？,16%未満,18%未満,20%未満,21%未満,B,酸素濃度18%未満が酸素欠乏の定義（通常は約21%）,酸欠防止'
].join('\n');

function init_widget(config) {
  if (!config) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', function() { _start(config); }); return; }
  _start(config);
}

function _start(config) {
  document.body.style.fontFamily = config.fontFamily || 'keifont, sans-serif';
  _set('quiz-title', config.quizTitle || '安全クイズ');
  var displaySec = parseInt(config.displaySec || '15', 10);
  var answerSec  = parseInt(config.answerSec  || '8',  10);

  if (_timer) clearInterval(_timer);
  if (_answerTimer) clearInterval(_answerTimer);

  var url = (config.dataUrl || '').trim();
  if (url) {
    _fetch(url, displaySec, answerSec);
    _timer = setInterval(function() { _fetch(url, displaySec, answerSec); }, parseInt(config.refreshMin||'60',10)*60000);
  } else {
    _rows = _parse(SAMPLE_CSV);
    _startRotation(displaySec, answerSec);
  }
  _updateClock(); setInterval(_updateClock, 30000);
}

function _fetch(url, displaySec, answerSec) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+'?_='+Date.now(), true); xhr.timeout = 10000;
  xhr.onload = function() { if (xhr.status===200) { _rows = _parse(xhr.responseText); _startRotation(displaySec, answerSec); } };
  xhr.onerror = xhr.ontimeout = function() {};
  xhr.send();
}

function _parse(text) {
  var rows = [];
  text.trim().split('\n').forEach(function(line) {
    var c = line.split(',').map(function(s){ return s.trim().replace(/^"|"$/g,''); });
    if (c[0]) rows.push({
      q:       c[0],
      a:       c[1]||'', b: c[2]||'', cd: c[3]||'', d: c[4]||'',
      ans:     (c[5]||'A').toUpperCase(),
      explain: c[6]||'',
      cat:     c[7]||''
    });
  });
  return rows;
}

function _startRotation(displaySec, answerSec) {
  if (!_rows.length) return;
  if (_answerTimer) clearInterval(_answerTimer);
  _quizIdx = 0;
  _showQuestion(_quizIdx);

  var phase = 0; // 0=question, 1=answer
  _answerTimer = setInterval(function() {
    if (phase === 0) {
      _showAnswerPhase(_quizIdx);
      phase = 1;
      setTimeout(function() {
        _quizIdx = (_quizIdx + 1) % _rows.length;
        _showQuestion(_quizIdx);
        phase = 0;
      }, answerSec * 1000);
    }
  }, displaySec * 1000);
}

function _showQuestion(idx) {
  if (!_rows.length) return;
  var row = _rows[idx];
  _set('q-num', (idx+1) + ' / ' + _rows.length);
  _set('q-cat', row.cat ? '【'+row.cat+'】' : '');
  _set('q-text', row.q);
  _set('q-a', 'A. ' + row.a);
  _set('q-b', 'B. ' + row.b);
  _set('q-c', 'C. ' + row.cd);
  _set('q-d', 'D. ' + row.d);

  // Reset styles
  ['q-a','q-b','q-c','q-d'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'choice-btn';
  });

  var ansEl = document.getElementById('answer-block');
  if (ansEl) ansEl.style.display = 'none';

  // Show dots
  var dotsEl = document.getElementById('dots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    _rows.forEach(function(_, i) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (i === idx ? ' active' : '');
      dotsEl.appendChild(dot);
    });
  }
}

function _showAnswerPhase(idx) {
  var row = _rows[idx];
  var ansMap = {A:'q-a', B:'q-b', C:'q-c', D:'q-d'};
  var correctId = ansMap[row.ans];
  if (correctId) {
    var el = document.getElementById(correctId);
    if (el) el.className = 'choice-btn correct';
  }
  _set('q-ans-label', '正解: ' + row.ans);
  _set('q-explain', row.explain);
  var ansEl = document.getElementById('answer-block');
  if (ansEl) ansEl.style.display = 'block';
}

function _set(id,val){ var el=document.getElementById(id); if(el)el.textContent=val; }
function _updateClock(){ var el=document.getElementById('clock'); if(!el)return; var n=new Date(); el.textContent=_z(n.getHours())+':'+_z(n.getMinutes()); }
function _z(n){ return String(n).padStart(2,'0'); }
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message',function(e){var m=e.data;if(!m||!m.functions)return;m.functions.forEach(function(fn){if(fn.fname==='init_widget'&&fn.data)init_widget(fn.data);});});
if(window.location.protocol==='file:'){window.onload=function(){init_widget({quizTitle:'安全クイズ',dataUrl:'',displaySec:'15',answerSec:'8',refreshMin:'60',fontFamily:'keifont, sans-serif'});};}

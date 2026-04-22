// Yodeck が widget.json の設定値を渡すために呼び出すグローバル関数
// <head> に配置することで main.js より前に定義される
var _pendingConfig = null;
var _savedLocation = null;

function init_widget(config) {
    if (!config) return;
    _pendingConfig = config;
    // location を取得（一度設定したら上書きしない）
    var loc = config.location
           || (config.player_params && config.player_params.location)
           || null;
    if (loc) { _savedLocation = loc; }
    // main.js 読込済みなら即時適用
    if (typeof setLocation === 'function' && _savedLocation) {
        setLocation(_savedLocation);
    }
}

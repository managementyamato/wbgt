function init_widget(config) {
    if (!config) {
        return;
    }

    /* font size */
    var font_size = config.font_size || "large";
    /* background color */
    var background_color = config.background_color || "yellow";

    if ("startDay" in config) {
        window.startDay = new Date(config.startDay);
        window.startDay.setHours(0);
        window.startDay.setMinutes(0);
        window.startDay.setSeconds(0);
    }

    if ("reset_date" in config) {
        window.resetDate = new Date(config.reset_date);
        window.resetDate.setHours(0);
        window.resetDate.setMinutes(0);
        window.resetDate.setSeconds(0);
    }

    /* 目標日数 */
    window.target_days = config.target_days || null;

    /* Set accidentless days */
    setAccidentlessHours();
    /* set font size */
    setFontsize(font_size);
    /* set background color */
    setBackground(background_color);
}

/* ローカルプレビュー用テスト (本番環境では自動的に無視される) */
if (window.location.protocol === "file:") {
    window.onload = function() {
        init_widget({
            startDay: "2024-01-01",
            target_days: 365,
            font_size: "large",
            background_color: "yellow"
        });
    };
}

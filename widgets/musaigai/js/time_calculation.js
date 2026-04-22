function getBaseDate() {
    if (window.resetDate && window.resetDate > window.startDay) {
        return window.resetDate;
    }
    return window.startDay;
}

function setAccidentlessHours(){
    var totalDaysUntilToday;

    /*progress*/
    var oneDayDuration = 24*60*60*1000;//hours*minutes*seconds*milliseconds
    var today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);

    var baseDate = getBaseDate();

    totalDaysUntilToday = Math.round(Math.abs((today.getTime() - baseDate.getTime())/(oneDayDuration)));

    if(today < window.startDay){
        totalDaysUntilToday = 0;
    }

    var todays_date = document.getElementById("todays_date");
    if(todays_date){
        todays_date.innerHTML = (today.getMonth()+1)+"月"+today.getDate()+"日";
    }

    /*目標日数: target_daysが設定されている場合のみ表示*/
    var target_row = document.getElementById("target_row");
    var target_duration = document.getElementById("target_duration");
    if(target_row && target_duration){
        if(window.target_days){
            target_row.style.display = "";
            target_duration.innerHTML = window.target_days + '<span> 日</span>';
        } else {
            target_row.style.display = "none";
        }
    }

    var accidentless_days_el = document.getElementById("accidentless_days");
    if (accidentless_days_el) {
        accidentless_days_el.innerHTML = totalDaysUntilToday + '<span> 日</span>';
    }

    /* 無災害日数カードの背景色: 目標に近づくにつれて色が変わる */
    var accidentless_row = document.getElementById("accidentless_row");
    if (accidentless_row) {
        if (window.target_days && window.target_days > 0) {
            var ratio = totalDaysUntilToday / window.target_days;
            var bgColor;
            if (ratio >= 1.0) {
                bgColor = "#e8f5e9"; /* 達成: 薄緑 */
            } else if (ratio >= 0.8) {
                bgColor = "#fff3e0"; /* 80%以上: 薄オレンジ */
            } else if (ratio >= 0.5) {
                bgColor = "#fffde7"; /* 50%以上: 薄黄色 */
            } else {
                bgColor = "#ffffff"; /* 通常: 白 */
            }
            accidentless_row.style.backgroundColor = bgColor;
        } else {
            accidentless_row.style.backgroundColor = "#ffffff";
        }
    }

    if(window.t){
        clearInterval(window.t);
    }
    window.t = setInterval (function () {
            console.log("----------------------------------");
            console.log("Reloading.............  Time :: " + new Date());
            console.log("Reloading.........................");
            setAccidentlessHours();
            console.log("----------------------------------");
    }, 1800000); /* 1 hour = 3600000 ms,  1 minutes = 60000 ms, 30 minutes = 1800000 */

}

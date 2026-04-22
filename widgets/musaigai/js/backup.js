function setAccidentlessHours(){
    var hours_worked_until_today, total_hours_to_finish;
    var totalDayDuration, totalDaysUntilToday;
    
    /*progress*/
    var oneDayDuration = 24*60*60*1000;//hours*minutes*seconds*milliseconds
    //var hourlyDuration = 3600*1000;//hours*minutes*seconds*milliseconds
    var today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    
    //check project endDay is not in past. Project End date must be after project start day.
    if(window.endDay >= window.startDay ){	
        totalDaysUntilToday = Math.round(Math.abs((today.getTime() - startDay.getTime())/(oneDayDuration)));
        totalDayDuration = Math.round(Math.abs((endDay.getTime() - startDay.getTime())/(oneDayDuration)));
        if(totalDayDuration == 0){
            /* because if startday is equal to endDay then totalDayDuration becomes 0. 
            So to fix this total duration should be 1 day when start and end date are same*/
            totalDayDuration = 1;
        }
        /*Hourse worked*/
        if(window.daily_working_time){
            console.log("totalDaysUntilToday :: " + totalDaysUntilToday);
            
            hours_worked_until_today = totalDaysUntilToday * window.daily_working_time;
            total_hours_to_finish = totalDayDuration * window.daily_working_time;
            console.log("hours_worked_until_today :: " + hours_worked_until_today);
        }
        
        if(today>window.endDay){ //When project is finished or endDay has passed.
            
            hours_worked_until_today = "<span class='error_note_2'>目標時間達成</span>";
            //what to do?
        }
        else if(today < window.startDay){ /*check if todays date is before start day. In other words project has not been stated yet. */
            hours_worked_until_today = 0;
        }        
    }
    else{
        //Show as it is
        totalDayDuration = 0;
        total_hours_to_finish = "<span class='error_note'>終了日は開始日より</span>";
        hours_worked_until_today = "<span class='error_note'>前に設定されています。</span>";
    }
    
    var todays_date = document.getElementById("todays_date");
    todays_date.innerHTML = (today.getMonth()+1)+"月"+today.getDate()+"日";

    var target_duration = document.getElementById("target_duration");
    target_duration.innerHTML = total_hours_to_finish;		
    
    var accidentless_hours = document.getElementById("accidentless_hours");
    accidentless_hours.innerHTML = hours_worked_until_today;
    
    var workers_numberElement = document.getElementById("workers_number");
    workers_numberElement.innerHTML = window.total_workers + '<span> 人</span>';  

    var currentTime = new Date ();
    /* for comparing dates */
    var currentTimeString = String(currentTime.getDate());
    var fixed_reload_timeString = String(window.fixed_reload_time.getDate())

    /* difference between the fixed update time and current time */
    var check = window.fixed_reload_time - currentTime;
    
    /*debug */
    console.log("BEFORE current time :: " + currentTime);
    console.log("BEFORE Fixed reloading time :: " + window.fixed_reload_time);

    if(check >= 0){
        window.isReloaded = false;
    }
    else{
        console.log("Already reloaded");
        window.isReloaded = true;
    }
   
    if(window.t){
        clearInterval(window.t);
    }

    if(window.isReloaded == false && currentTimeString == fixed_reload_timeString){
        window.t = setInterval (function () {
            console.log("----------------------------------");
            console.log("AFTER current time :: " + currentTime);
            console.log("AFTER Fixed reloading time :: " + window.fixed_reload_time);
            // console.log("check time difference in miliseconds :: " + check);
            /* check if fixed time is ahead of current time of check has positive value */
            if (check >= 0){
                console.log("Reloading .....");
                /*tomorrow*/
                var tempDateNow = new Date ();
                var TEMPYEAR  = tempDateNow.getFullYear();
                var TEMPMONTH = tempDateNow.getMonth() + 1;
                var TEMPDAY   = tempDateNow.getDate() + 1;
                var TEMPFIXEDTIME = window.select_hour + ":" + window.select_minute + ":00";
                window.fixed_reload_time    = new Date(TEMPYEAR + '/' + TEMPMONTH + '/' + TEMPDAY + ' ' +TEMPFIXEDTIME);               
                /* make reload flag true */
                window.isReloaded = true;
                setAccidentlessHours();
            }
            else{
                window.isReloaded = false;
            }
            console.log("----------------------------------");
        }, 60000); /* check reloading time every hour */ /* 1 hour = 3600000 ms,  1 minutes = 60000 ms, 30 minutes = 1800000 */ 
    }
   
}


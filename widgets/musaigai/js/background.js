const YELLOW = "yellow";
const YELLOW_MAIN_COLOR = "#f2be00";
const YELLOW_BACKGROUND_TABLE = "#ffffb8";

const WHITE = "white";
const WHITE_COLOR = "#ffffff";

const GREEN = "green";
const GREEN_COLOR = "#28a428";
const GREEN_HEADER = "#fffe00";

const BLACK_COLOR = "#1a1a1a";
const BOX_SHADOW = "2px 2px 4px rgba(0,0,0,0.15)";

function setBackground(background){
    var styleEl = document.getElementById("dynamic-bg");
    if(!styleEl){
        styleEl = document.createElement("style");
        styleEl.id = "dynamic-bg";
        document.head.appendChild(styleEl);
    }

    if(background == YELLOW){
        document.getElementsByClassName("container")[0].style.backgroundColor = WHITE_COLOR;
        document.getElementsByClassName("hdr")[0].style.backgroundColor = YELLOW_MAIN_COLOR;
        document.getElementsByClassName("tbl_container")[0].style.backgroundColor = "#eeeeee";
        document.getElementsByClassName("tbl_container")[0].style.boxShadow = "none";
        document.getElementsByClassName("anzen")[0].style.color = GREEN_COLOR;
        styleEl.innerHTML = ".info_value{color:#1a1a1a;}";
    }
    else if(background == WHITE){
        document.getElementsByClassName("container")[0].style.backgroundColor = BLACK_COLOR;
        document.getElementsByClassName("hdr")[0].style.backgroundColor = WHITE_COLOR;
        document.getElementsByClassName("tbl_container")[0].style.backgroundColor = GREEN_COLOR;
        document.getElementsByClassName("tbl_container")[0].style.boxShadow = BOX_SHADOW;
        document.getElementsByClassName("anzen")[0].style.color = GREEN_COLOR;
        styleEl.innerHTML = ".info_value{color:#1a1a1a;}";
    }
    else if(background == GREEN){
        document.getElementsByClassName("container")[0].style.backgroundColor = GREEN_HEADER;
        document.getElementsByClassName("hdr")[0].style.backgroundColor = GREEN_HEADER;
        document.getElementsByClassName("tbl_container")[0].style.backgroundColor = GREEN_COLOR;
        document.getElementsByClassName("tbl_container")[0].style.boxShadow = BOX_SHADOW;
        document.getElementsByClassName("anzen")[0].style.color = GREEN_COLOR;
        styleEl.innerHTML = ".info_value{color:#1a1a1a;}";
    }
}

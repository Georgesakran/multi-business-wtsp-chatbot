function shortText(txt, max=150){
    if(!txt) return "";
    return txt.length > max ? txt.slice(0,max) + "..." : txt;
}
module.exports = {shortText};
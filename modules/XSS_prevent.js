function XSS_prevent(str, all_html) {
    if (all_html && /<[^>]*>/gi.test(str)) return false;

    //https://stackoverflow.com/questions/5796718/html-entity-decode
    const decodeEntities = (function () {
        // this prevents any overhead from creating the object each time
        var element = document.createElement('div');

        function decodeHTMLEntities(str) {
            if (str && typeof str === 'string') {
                // strip script/html tags
                //str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
                //str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
                str = str.replace(/\</gi, '&lt;').replace(/\>/gi, '&gt;')
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = '';
            }
            return str;
        }

        return decodeHTMLEntities;
    })();

    str = decodeEntities(str);
    const list = ['javascript:', '<script>', '<embed>', '<frame>', '<iframe>',
        "onabort",
        "onafterprint",
        "onanimationend",
        "onanimationiteration",
        "onanimationstart",
        "onbeforeprint",
        "onbeforeunload",
        "onblur",
        "oncanplay",
        "oncanplaythrough",
        "onchange",
        "onclick",
        "oncontextmenu",
        "oncopy",
        "oncut",
        "ondblclick",
        "ondrag",
        "ondragend",
        "ondragenter",
        "ondragleave",
        "ondragover",
        "ondragstart",
        "ondrop",
        "ondurationchange",
        "onended",
        "onerror",
        "onfocus",
        "onfocusin",
        "onfocusout",
        "onfullscreenchange",
        "onfullscreenerror",
        "onhashchange",
        "oninput",
        "oninvalid",
        "onkeydown",
        "onkeypress",
        "onkeyup",
        "onload",
        "onloadeddata",
        "onloadedmetadata",
        "onloadstart",
        "onmessage",
        "onmousedown",
        "onmouseenter",
        "onmouseleave",
        "onmousemove",
        "onmouseover",
        "onmouseout",
        "onmouseup",
        "onmousewheel",
        "onoffline",
        "ononline",
        "onopen",
        "onpagehide",
        "onpageshow",
        "onpaste",
        "onpause",
        "onplay",
        "onplaying",
        "onpopstate",
        "onprogress",
        "onratechange",
        "onresize",
        "onreset",
        "onscroll",
        "onsearch",
        "onseeked",
        "onseeking",
        "onselect",
        "onshow",
        "onstalled",
        "onstorage",
        "onsubmit",
        "onsuspend",
        "ontimeupdate",
        "ontoggle",
        "ontouchcancel",
        "ontouchend",
        "ontouchmove",
        "ontouchstart",
        "ontransitionend",
        "onunload",
        "onvolumechange",
        "onwaiting",
        "onwheel"
    ]
    str_l = srt.toLocaleLowerCase()
    for (let i of list)
        if (i in str_l)
            return false
    return true
}
module.exports = XSS_prevent
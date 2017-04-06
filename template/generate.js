var scripts = ['https://w3c.github.io/mediartc-roadmap-ui/assets/js/sidenav.js'];

var templateXhr = new XMLHttpRequest();
templateXhr.responseType = 'text';
templateXhr.open("GET", "template/page");
templateXhr.onload = function() {
    var sections = [];
    var hero = [];
    var sectionsOrig = document.querySelectorAll("body > section");
    for (var i = 0; i < sectionsOrig.length; i++) {
        sections.push(sectionsOrig[i]);
    }
    var heroOrig = document.querySelectorAll("header > *");
    for (var i = 0; i < heroOrig.length; i++) {
        hero.push(heroOrig[i].cloneNode(true));
    }
    var styleOrig = document.querySelector("style");
    if (styleOrig) {
        styleOrig = styleOrig.cloneNode(true);
    }
    if (document.getElementById("toc")) {
        var tocOrig = document.getElementById("toc").cloneNode(true);
    }

    document.documentElement.innerHTML = this.responseText;
    if (styleOrig) {
        document.querySelector('head').appendChild(styleOrig);
    }
    for (var i = 0 ; i < sections.length ; i++) {
        document.adoptNode(sections[i]);
        document.querySelector('.main-content .container').appendChild(sections[i]);
    }
    for (var i = 0 ; i < hero.length ; i++) {
        document.querySelector('.hero .container').appendChild(hero[i]);
    }
    for (var i = 0 ; i < scripts.length ; i++) {
        var s = document.createElement("script");
        s.src = scripts[i];
        document.querySelector('body').appendChild(s);
    }

    document.querySelector('title').textContent = hero[0].textContent;
    if (tocOrig) {
        var nav = document.querySelector("aside nav");
        nav.appendChild(tocOrig);
    }
}
templateXhr.send();

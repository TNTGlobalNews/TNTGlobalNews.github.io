/* TNT Global News: replaces demo content with real items from news.json */
(function () {
  var DATA = null;
  var PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return MAP[c]; }); }
  function url(u) { return /^https?:\/\//i.test(u) ? u : '#'; }
  function lang() { return document.documentElement.getAttribute('data-lang') || 'bn'; }
  function $(id) { return document.getElementById(id); }

  function ago(ts, l) {
    var m = Math.max(1, Math.round((Date.now() - new Date(ts)) / 60000)), n, u;
    if (m < 60) { n = m; u = l === 'en' ? 'minute' : 'মিনিট'; }
    else if (m < 1440) { n = Math.round(m / 60); u = l === 'en' ? 'hour' : 'ঘণ্টা'; }
    else { n = Math.round(m / 1440); u = l === 'en' ? 'day' : 'দিন'; }
    return l === 'en' ? n + ' ' + u + (n > 1 ? 's' : '') + ' ago' : n.toLocaleString('bn-BD') + ' ' + u + ' আগে';
  }
  function img(a) {
    return '<img src="' + (a.img ? esc(url(a.img)) : PIXEL) + '" alt="" loading="lazy" referrerpolicy="no-referrer" style="background:linear-gradient(135deg,#101B33,#2a3b66)">';
  }
  function meta(a, l) { return esc(a.src) + ' · ' + ago(a.ts, l); }
  function open(a) { return 'href="' + esc(url(a.url)) + '" target="_blank" rel="noopener noreferrer"'; }

  function card(a, l) {
    return '<a ' + open(a) + ' class="card">' + img(a) + '<div class="card-body"><div class="headline">' + esc(a.h) +
      '</div><p class="excerpt">' + esc(a.e) + '</p><div class="meta"><span>' + meta(a, l) + '</span></div></div></a>';
  }

  function render() {
    var l = lang(), list = (DATA && DATA[l]) || [];
    if (list.length < 5) { return; } // keep demo content until enough real news exists
    var rest = list.slice(1), hero = list[0], side = rest.splice(0, 3);
    function take(cats, n) {
      var out = [];
      for (var i = 0; i < rest.length && out.length < n; i++) {
        if (cats.indexOf(rest[i].cat) > -1) { out.push(rest.splice(i, 1)[0]); i--; }
      }
      return out;
    }
    var groups = [take(['world'], 4), take(['sports'], 4), take(['tech', 'ent'], 4)];

    var hm = $('heroMain');
    hm.setAttribute('href', url(hero.url)); hm.setAttribute('target', '_blank'); hm.setAttribute('rel', 'noopener noreferrer');
    hm.innerHTML = img(hero) + '<div class="overlay"><span class="tag tag-red">' + (l === 'en' ? 'Top Story' : 'প্রধান খবর') +
      '</span><h2 class="headline">' + esc(hero.h) + '</h2><div class="meta">' + meta(hero, l) + '</div></div>';

    $('heroSide').innerHTML = side.map(function (a) {
      return '<a ' + open(a) + ' class="side-item">' + img(a) + '<div><div class="headline">' + esc(a.h) +
        '</div><div class="meta">' + meta(a, l) + '</div></div></a>';
    }).join('');

    groups.forEach(function (g, i) {
      var grid = $('grid-cat' + (i + 1));
      grid.innerHTML = g.map(function (a) { return card(a, l); }).join('');
      grid.closest('section').style.display = g.length ? '' : 'none';
    });

    $('trendList').innerHTML = list.slice(0, 8).map(function (a, i) {
      return '<a ' + open(a) + ' class="trend-item"><div class="trend-num">' + (i < 9 ? '0' : '') + (i + 1) +
        '</div><div><div class="headline">' + esc(a.h) + '</div><div class="meta">' + meta(a, l) + '</div></div></a>';
    }).join('');

    var t = list.slice(0, 6).map(function (a) { return '<span>' + esc(a.h) + '</span>'; }).join('');
    $('tickerScroll').innerHTML = t + t;
  }

  fetch('news.json?v=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d; render();
      document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
        b.addEventListener('click', function () { setTimeout(render, 0); });
      });
    })
    .catch(function () {});
})();

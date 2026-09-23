(function(){
  "use strict";

  var KEY_OFF = 'cclt11-season';
  var KEY_PUMP = 'cclt11-pumpkins';
  var PUMPKIN_TARGET = 5;
  var root = document.documentElement;

  var seasonCode = new Date().getMonth() * 100 + new Date().getDate();
  var eligible = /[?&]tema=halloween/.test(location.search) || (seasonCode >= 815 && seasonCode <= 1002);
  if(!eligible) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var lastIds = [];
  var built = false;
  var motionBound = false;
  var lastMag = 0;
  var lastShake = 0;
  var toastTimer = null;
  var ui = {};

  function read(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function write(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function $(s, r){ return (r || document).querySelector(s); }
  function isOn(){ return read(KEY_OFF) !== 'off'; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }

  function el(tag, attrs, html){
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){ n.setAttribute(k, attrs[k]); });
    if(html != null) n.innerHTML = html;
    return n;
  }

  function toast(msg){
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ ui.toast.classList.remove('show'); }, 2300);
  }

  function bats(n){
    if(reduceMotion){ toast('🦇 ¡Murciélagos!'); return; }
    for(var i = 0; i < n; i++){
      var b = el('span', { 'class': 'fly-bat' }, '🦇');
      b.style.top = (8 + Math.random() * 72) + 'vh';
      b.style.fontSize = (18 + Math.random() * 20) + 'px';
      b.style.setProperty('--dur', (2.4 + Math.random() * 2.2) + 's');
      b.style.setProperty('--delay', (Math.random() * 0.9) + 's');
      b.style.setProperty('--wave', (Math.random() > .5 ? 1 : -1) * (20 + Math.random() * 40) + 'px');
      b.addEventListener('animationend', function(ev){ ev.target.remove(); });
      ui.bats.appendChild(b);
    }
  }

  function introBats(force){
    if(!isOn()) return;
    if(!force){
      if(reduceMotion) return;
      try{ if(sessionStorage.getItem('cclt11-intro')) return; sessionStorage.setItem('cclt11-intro', '1'); }catch(e){}
    }
    var n = 30;
    for(var i = 0; i < n; i++){
      var a = (Math.PI * 2 * i / n) + (Math.random() - .5) * .35;
      var b = el('span', { 'class': 'burst-bat' }, '🦇');
      b.style.fontSize = (22 + Math.random() * 26) + 'px';
      b.style.setProperty('--dx', (Math.cos(a) * (62 + Math.random() * 30)) + 'vw');
      b.style.setProperty('--dy', (Math.sin(a) * (58 + Math.random() * 28)) + 'vh');
      b.style.setProperty('--s', (.8 + Math.random() * .9).toFixed(2));
      b.style.setProperty('--rot', ((Math.random() > .5 ? 1 : -1) * (8 + Math.random() * 30)).toFixed(0) + 'deg');
      b.style.setProperty('--dur', (1.7 + Math.random() * 1.1).toFixed(2) + 's');
      b.style.setProperty('--delay', (Math.random() * .7).toFixed(2) + 's');
      b.addEventListener('animationend', function(ev){ ev.target.remove(); });
      ui.bats.appendChild(b);
    }
  }

  function hash(s){
    var h = 7;
    for(var i = 0; i < s.length; i++){ h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  function pumpkinIds(){
    return lastIds.slice().sort(function(a, b){ return hash(a) - hash(b); }).slice(0, PUMPKIN_TARGET);
  }
  function getFound(){
    try{ return JSON.parse(read(KEY_PUMP) || '[]'); }catch(e){ return []; }
  }
  function foundCount(){
    var ids = pumpkinIds();
    return getFound().filter(function(id){ return ids.indexOf(id) !== -1; }).length;
  }

  function updateCounter(){
    if(!ui.counter) return;
    var total = pumpkinIds().length;
    var n = foundCount();
    ui.counter.textContent = total && n >= total ? '🎃 ¡Completo!' : '🎃 ' + n + '/' + total;
    ui.counter.style.display = total ? '' : 'none';
  }

  var SPOTS = [
    { right: '10px', bottom: '8px' },
    { right: '84px', bottom: '8px' },
    { right: '10px', bottom: '44px' },
    { right: '120px', bottom: '10px' },
    { right: '46px', bottom: '30px' }
  ];

  function plantPumpkins(){
    $all('.hidden-pumpkin').forEach(function(n){ n.remove(); });
    var found = getFound();
    pumpkinIds().forEach(function(id, i){
      if(found.indexOf(id) !== -1) return;
      var wrap = $('.comments[data-event="' + id + '"]');
      var card = wrap && wrap.closest('.event-card');
      if(!card) return;
      var b = el('button', { type: 'button', 'class': 'hidden-pumpkin season-only', 'data-event': id, 'aria-label': 'Calabaza escondida' }, '🎃');
      var spot = SPOTS[i % SPOTS.length];
      Object.keys(spot).forEach(function(k){ b.style[k] = spot[k]; });
      card.appendChild(b);
    });
  }
  function $all(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function daysUntil(month, day){
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(now.getFullYear(), month, day);
    return Math.round((target - today) / 86400000);
  }
  function countdownLine(icon, name, d){
    if(d < 0) return '';
    var txt = d === 0 ? '¡Es hoy!' : d === 1 ? 'mañana' : 'faltan ' + d + ' días';
    return '<span>' + icon + ' ' + esc(name) + ': ' + txt + '</span>';
  }
  function addCountdown(){
    var hero = $('#hero');
    if(!hero) return;
    var old = $('.season-countdown', hero);
    if(old) old.remove();
    var html = countdownLine('🎃', 'Halloween', daysUntil(9, 31)) + countdownLine('💀', 'Día de Muertos', daysUntil(10, 1));
    if(!html) return;
    hero.appendChild(el('div', { 'class': 'season-countdown season-only' }, html));
  }

  var CANDY = ['🍬', '🍭', '🍫', '🎃', '🦇', '👻', '🕷️', '🍿', '🍪', '💀', '🧙', '🍬', '🎃', '🍭'];
  var LAUGHS = ['HA HA HA', '¡HA!', 'MUAJAJA', '¡HA HA!', '¡BU!', 'JA JA JA'];

  function explosion(){
    var flash = el('div', { 'class': 'season-flash' });
    flash.addEventListener('animationend', function(){ flash.remove(); });
    ui.bats.appendChild(flash);

    var n = 84;
    for(var i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2;
      var p = el('span', { 'class': 'cf-piece' }, CANDY[Math.floor(Math.random() * CANDY.length)]);
      p.style.fontSize = (20 + Math.random() * 30) + 'px';
      p.style.setProperty('--dx', (Math.cos(a) * (28 + Math.random() * 62)) + 'vw');
      p.style.setProperty('--dy', (Math.sin(a) * (24 + Math.random() * 52)) + 'vh');
      p.style.setProperty('--fall', (22 + Math.random() * 42) + 'vh');
      p.style.setProperty('--s', (.8 + Math.random() * .9).toFixed(2));
      p.style.setProperty('--rot', ((Math.random() > .5 ? 1 : -1) * (30 + Math.random() * 200)).toFixed(0) + 'deg');
      p.style.setProperty('--dur', (3.2 + Math.random() * 1.6).toFixed(2) + 's');
      p.style.setProperty('--delay', (Math.random() * .35).toFixed(2) + 's');
      p.addEventListener('animationend', function(ev){ ev.target.remove(); });
      ui.bats.appendChild(p);
    }
    for(var j = 0; j < 11; j++){
      var h = el('span', { 'class': 'ha-pop' }, LAUGHS[Math.floor(Math.random() * LAUGHS.length)]);
      h.style.left = (8 + Math.random() * 70) + '%';
      h.style.top = (8 + Math.random() * 78) + '%';
      h.style.fontSize = (26 + Math.random() * 34) + 'px';
      h.style.setProperty('--tilt', ((Math.random() - .5) * 30).toFixed(0) + 'deg');
      h.style.setProperty('--delay', (Math.random() * 1.8).toFixed(2) + 's');
      h.addEventListener('animationend', function(ev){ ev.target.remove(); });
      ui.bats.appendChild(h);
    }
  }

  function celebrate(){
    buzz([60, 40, 60, 40, 140]);
    toast('🎉 ¡Encontraste todas las calabazas! Feliz Halloween');
    if(reduceMotion) return;
    explosion();
    bats(22);
  }

  function onPumpkin(btn){
    var id = btn.getAttribute('data-event');
    var found = getFound();
    if(found.indexOf(id) === -1){ found.push(id); write(KEY_PUMP, JSON.stringify(found)); }
    buzz(40);
    btn.classList.add('pop');
    setTimeout(function(){ btn.remove(); }, reduceMotion ? 0 : 360);
    var n = foundCount();
    var total = pumpkinIds().length;
    updateCounter();
    if(n >= total) celebrate(); else toast('🎃 ¡Calabaza ' + n + ' de ' + total + '!');
  }

  function onMotion(e){
    if(!isOn()) return;
    var a = e.accelerationIncludingGravity;
    if(!a) return;
    var m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    var d = Math.abs(m - lastMag);
    lastMag = m;
    if(d > 28){
      var now = Date.now();
      if(now - lastShake > 3000){
        lastShake = now;
        bats(14);
        buzz([40, 30, 40]);
      }
    }
  }
  function bindMotion(){
    if(motionBound) return;
    motionBound = true;
    window.addEventListener('devicemotion', onMotion);
  }
  function requestMotion(){
    if(typeof DeviceMotionEvent === 'undefined') return;
    if(typeof DeviceMotionEvent.requestPermission === 'function'){
      DeviceMotionEvent.requestPermission().then(function(s){ if(s === 'granted') bindMotion(); }).catch(function(){});
    } else {
      bindMotion();
    }
  }

  var GHOST_LINES = ['¡Bu! 👻', '¡Te asusté! 😱', 'Shhh… hay calabazas escondidas 🎃', '¡Agita tu celular! 🦇', 'Toca el 1.1 para ver murciélagos 🦇'];
  var ghostIdx = 0;

  function build(){
    if(built) return;
    built = true;

    ui.toast = el('div', { id: 'season-toast', role: 'status', 'aria-live': 'polite', 'class': 'season-only' });
    ui.bats = el('div', { id: 'season-bats', 'aria-hidden': 'true', 'class': 'season-only' });
    ui.ghost = el('button', { type: 'button', id: 'season-ghost', 'aria-label': 'Fantasma', 'class': 'season-only' }, '👻');
    ui.counter = el('button', { type: 'button', id: 'pumpkin-counter', 'class': 'season-only', 'aria-label': 'Calabazas encontradas' }, '🎃 0/0');
    document.body.appendChild(ui.toast);
    document.body.appendChild(ui.bats);
    document.body.appendChild(ui.ghost);
    document.body.appendChild(ui.counter);

    var WEB = '<svg viewBox="0 0 64 64"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M0 0 L64 0 M0 0 L0 64 M0 0 L58 40 M0 0 L40 58 M0 0 L62 20 M0 0 L20 62"/>' +
      '<path d="M10 0 Q9 9 0 10 M20 0 Q17 17 0 20 M31 0 Q26 26 0 31 M43 0 Q36 36 0 43 M56 0 Q47 47 0 56"/></g></svg>';
    var SPIDER = '<svg viewBox="0 0 74 52"><g class="legs-a" fill="none" stroke="rgba(232,222,255,.55)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M31 24 L14 8 L4 14"/><path d="M31 31 L12 40 L6 50"/><path d="M44 27 L64 24 L72 34"/><path d="M41 34 L52 48 L56 52"/></g>' +
      '<g class="legs-b" fill="none" stroke="rgba(232,222,255,.55)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M30 27 L10 24 L2 34"/><path d="M33 34 L22 48 L18 52"/><path d="M43 24 L60 8 L70 14"/><path d="M43 31 L62 40 L68 50"/></g>' +
      '<ellipse cx="37" cy="31" rx="13" ry="10" fill="#07030c" stroke="rgba(232,222,255,.5)" stroke-width="1.5"/>' +
      '<circle cx="37" cy="19" r="6.5" fill="#07030c" stroke="rgba(232,222,255,.5)" stroke-width="1.5"/>' +
      '<circle cx="34.6" cy="18" r="1.7" fill="#fff"/><circle cx="39.4" cy="18" r="1.7" fill="#fff"/>' +
      '<circle cx="37" cy="33" r="2.6" fill="#ff8a2b" opacity=".85"/></svg>';

    document.body.appendChild(el('div', { 'class': 'season-smoke s1 season-only', 'aria-hidden': 'true' }));
    document.body.appendChild(el('div', { 'class': 'season-smoke s2 season-only', 'aria-hidden': 'true' }));
    document.body.appendChild(el('div', { 'class': 'season-smoke s3 season-only', 'aria-hidden': 'true' }));
    document.body.appendChild(el('div', { 'class': 'season-fog-front season-only', 'aria-hidden': 'true' }));
    document.body.appendChild(el('div', { 'class': 'season-spider season-only', 'aria-hidden': 'true' }, SPIDER));
    document.body.appendChild(el('span', { 'class': 'season-web fixed bl season-only', 'aria-hidden': 'true' }, WEB));
    document.body.appendChild(el('span', { 'class': 'season-web fixed br season-only', 'aria-hidden': 'true' }, WEB));

    var header = $('#header');
    if(header){
      header.appendChild(el('span', { 'class': 'season-web tl season-only', 'aria-hidden': 'true' }, WEB));
      header.appendChild(el('span', { 'class': 'season-web tr season-only', 'aria-hidden': 'true' }, WEB));
      header.appendChild(el('span', { 'class': 'season-bat-deco season-only', 'aria-hidden': 'true', style: 'top:8px' }, '🦇'));
      header.appendChild(el('span', { 'class': 'season-bat-deco b2 season-only', 'aria-hidden': 'true' }, '🦇'));
    }

    ui.ghost.addEventListener('click', function(){
      buzz(25);
      ui.ghost.classList.remove('boo');
      void ui.ghost.offsetWidth;
      ui.ghost.classList.add('boo');
      toast(GHOST_LINES[ghostIdx++ % GHOST_LINES.length]);
      requestMotion();
    });
    ui.counter.addEventListener('click', function(){
      var total = pumpkinIds().length;
      toast('Hay ' + total + ' calabazas escondidas en las tarjetas. ¡Encuéntralas! 🎃');
    });

    var badge = $('.badge');
    if(badge){
      badge.addEventListener('click', function(){
        if(!isOn()) return;
        buzz(30);
        bats(10);
      });
    }

    document.addEventListener('click', function(ev){
      var p = ev.target.closest && ev.target.closest('.hidden-pumpkin');
      if(p) onPumpkin(p);
    });

    if(typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') bindMotion();
  }

  function buildToggle(){
    var header = $('#header');
    if(!header || ui.toggle) return;
    ui.toggle = el('button', { type: 'button', id: 'season-toggle', title: 'Tema de Halloween' }, '🎃');
    header.appendChild(ui.toggle);
    ui.toggle.addEventListener('click', function(){
      write(KEY_OFF, isOn() ? 'off' : 'on');
      apply();
      refresh(lastIds);
    });
  }

  function apply(){
    var on = isOn();
    if(on){ root.setAttribute('data-season', 'halloween'); build(); }
    else { root.removeAttribute('data-season'); $all('.hidden-pumpkin, .season-countdown').forEach(function(n){ n.remove(); }); }
    if(ui.toggle){
      ui.toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      ui.toggle.setAttribute('aria-label', on ? 'Quitar tema de Halloween' : 'Poner tema de Halloween');
    }
  }

  function refresh(ids){
    if(ids && ids.length) lastIds = ids;
    if(!isOn()) return;
    addCountdown();
    plantPumpkins();
    updateCounter();
  }

  buildToggle();
  apply();

  function scheduleIntro(){ setTimeout(function(){ introBats(false); }, 4000); }
  if(document.readyState === 'complete') scheduleIntro();
  else window.addEventListener('load', scheduleIntro);

  window.SeasonTheme = { refresh: refresh, intro: introBats, celebrate: celebrate, explosion: explosion };
})();

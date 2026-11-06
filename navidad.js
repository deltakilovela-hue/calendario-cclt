(function(){
  "use strict";

  var KEY_OFF = 'cclt11-season-navidad';
  var root = document.documentElement;

  var code = new Date().getMonth() * 100 + new Date().getDate();
  var inSeason = code >= 1101 || code <= 6;
  var forced = /[?&]tema=navidad/.test(location.search);
  var otherForced = /[?&]tema=halloween/.test(location.search);
  if(!(forced || (inSeason && !otherForced))) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ui = {};
  var built = false;
  var toastTimer = null;

  function read(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function write(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function isOn(){ return read(KEY_OFF) !== 'off'; }
  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function $(s, r){ return (r || document).querySelector(s); }
  function el(tag, attrs, html){
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){ n.setAttribute(k, attrs[k]); });
    if(html != null) n.innerHTML = html;
    return n;
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }

  function toast(msg){
    if(!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ ui.toast.classList.remove('show'); }, 2400);
  }

  // ---------- nieve (ambiente + esfera navideña) ----------
  var snow = { flakes: [], storm: 0, raf: 0, w: 0, h: 0, dpr: 1, ctx: null };
  var AMBIENT = reduceMotion ? 0 : 38;

  function newFlake(storm){
    var w = snow.w, h = snow.h;
    if(storm){
      // esfera navideña: la nieve se arremolina por toda la pantalla y luego cae despacio
      var a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
      return { x: Math.random() * w, y: h * (.15 + Math.random() * .85),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.5, r: 1.4 + Math.random() * 3.6,
        ph: Math.random() * 6.28, life: 1, storm: true };
    }
    return { x: Math.random() * w, y: Math.random() * h, vx: 0, vy: .35 + Math.random() * .9,
      r: .8 + Math.random() * 2.2, ph: Math.random() * 6.28, life: 1, storm: false };
  }

  function sizeSnow(){
    snow.dpr = Math.min(window.devicePixelRatio || 1, 2);
    snow.w = window.innerWidth; snow.h = window.innerHeight;
    ui.snow.width = snow.w * snow.dpr; ui.snow.height = snow.h * snow.dpr;
    snow.ctx.setTransform(snow.dpr, 0, 0, snow.dpr, 0, 0);
  }

  function snowLoop(){
    var ctx = snow.ctx, w = snow.w, h = snow.h;
    ctx.clearRect(0, 0, w, h);
    var keep = [];
    for(var i = 0; i < snow.flakes.length; i++){
      var f = snow.flakes[i];
      f.ph += .03;
      if(f.storm){
        f.vx *= .97; f.vy = f.vy * .97 + .035;
        f.x += f.vx + Math.sin(f.ph) * .8; f.y += f.vy;
        if(f.x < -10) f.x = w + 10; else if(f.x > w + 10) f.x = -10;
        if(Math.abs(f.vx) < .6 && f.vy > 0) f.life -= .003;
        if(f.y > h + 10 || f.life <= 0) continue;
      } else {
        f.x += Math.sin(f.ph) * .35; f.y += f.vy;
        if(f.y > h + 5){ f.y = -5; f.x = Math.random() * w; }
      }
      ctx.globalAlpha = (f.storm ? .95 : .7) * Math.max(0, Math.min(1, f.life));
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = '#ffffff'; ctx.fill();
      keep.push(f);
    }
    snow.flakes = keep;
    ctx.globalAlpha = 1;
    var ambient = snow.flakes.filter(function(f){ return !f.storm; }).length;
    while(ambient < AMBIENT){ snow.flakes.push(newFlake(false)); ambient++; }
    if(snow.flakes.length || AMBIENT) snow.raf = requestAnimationFrame(snowLoop);
    else snow.raf = 0;
  }

  function startSnow(){
    if(!snow.raf && (AMBIENT || snow.flakes.length)) snow.raf = requestAnimationFrame(snowLoop);
  }

  function snowGlobe(n){
    if(!isOn()) return;
    if(reduceMotion){ toast('❄️ ¡Está nevando!'); return; }
    for(var i = 0; i < (n || 320); i++) snow.flakes.push(newFlake(true));
    startSnow();
  }

  // ---------- agitar el celular ----------
  var motionBound = false, lastMag = 0, lastShake = 0;
  function onMotion(e){
    if(!isOn()) return;
    var a = e.accelerationIncludingGravity;
    if(!a) return;
    var m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    var d = Math.abs(m - lastMag);
    lastMag = m;
    if(d > 26){
      var now = Date.now();
      if(now - lastShake > 1500){
        lastShake = now;
        if(window.SleighGame && window.SleighGame.isOpen()) window.SleighGame.storm();
        else snowGlobe(340);
        buzz([30, 20, 30]);
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

  // ---------- cuenta regresiva ----------
  function daysTo(month, day){
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(now.getFullYear(), month, day);
    if(target < today && month < 6) target = new Date(now.getFullYear() + 1, month, day);
    return Math.round((target - today) / 86400000);
  }
  function addCountdown(){
    var hero = $('#hero');
    if(!hero) return;
    var old = $('.xmas-countdown', hero);
    if(old) old.remove();
    var items = [['🎄', 'Navidad', daysTo(11, 25)], ['🎆', 'Año Nuevo', daysTo(0, 1)], ['👑', 'Día de Reyes', daysTo(0, 6)]]
      .filter(function(x){ return x[2] >= 0; }).slice(0, 2);
    if(!items.length) return;
    var html = items.map(function(x){
      var t = x[2] === 0 ? '¡Es hoy!' : x[2] === 1 ? 'mañana' : 'faltan ' + x[2] + ' días';
      return '<span>' + x[0] + ' ' + esc(x[1]) + ': ' + t + '</span>';
    }).join('');
    hero.appendChild(el('div', { 'class': 'xmas-countdown xmas-only' }, html));
  }

  // ---------- juego del trineo (se carga solo al abrirlo) ----------
  var gameLoading = false;
  function openGame(){
    requestMotion();
    if(window.SleighGame){ window.SleighGame.open(); return; }
    if(gameLoading) return;
    gameLoading = true;
    var s = document.createElement('script');
    s.src = 'trineo.js';
    s.onload = function(){ gameLoading = false; if(window.SleighGame) window.SleighGame.open(); };
    s.onerror = function(){ gameLoading = false; toast('No se pudo abrir el juego. Revisa tu conexión.'); };
    document.body.appendChild(s);
  }

  var SNOWMAN_LINES = [
    '⛄ ¡Hola! Agita tu celular para hacer nevar',
    '🛷 ¿Ya manejaste el trineo de Santa?',
    '🎁 ¿Cuántos regalos puedes repartir?',
    '🥕 ¡Cuidado con mi nariz!',
    '🎄 ¡Feliz Navidad, familia 1.1!'
  ];
  var snowmanIdx = 0;

  function build(){
    if(built) return;
    built = true;

    ui.toast = el('div', { id: 'xmas-toast', role: 'status', 'aria-live': 'polite', 'class': 'xmas-only' });
    ui.snow = el('canvas', { id: 'xmas-snow', 'class': 'xmas-only', 'aria-hidden': 'true' });
    ui.snowman = el('button', { type: 'button', id: 'xmas-snowman', 'class': 'xmas-only', 'aria-label': 'Mono de nieve' }, '⛄');
    ui.villa = el('button', { type: 'button', id: 'villa-btn', 'class': 'xmas-only' }, '🛷 Trineo de Santa');
    [ui.toast, ui.snow, ui.snowman, ui.villa].forEach(function(n){ document.body.appendChild(n); });

    var header = $('#header');
    if(header){
      var colors = ['#ff4d4d', '#ffd166', '#4fcf86', '#5aa9ff', '#ff8ad8'];
      var bulbs = '';
      for(var i = 0; i < 16; i++){
        bulbs += '<i style="--c:' + colors[i % colors.length] + ';--d:' + (i % 4) * .4 + 's;--y:' + (i % 2 ? 6 : 2) + 'px"></i>';
      }
      header.appendChild(el('div', { 'class': 'xmas-lights xmas-only', 'aria-hidden': 'true' }, bulbs));
    }

    snow.ctx = ui.snow.getContext('2d');
    sizeSnow();
    window.addEventListener('resize', sizeSnow);
    startSnow();

    ui.snowman.addEventListener('click', function(){
      buzz(25);
      ui.snowman.classList.remove('hop'); void ui.snowman.offsetWidth; ui.snowman.classList.add('hop');
      toast(SNOWMAN_LINES[snowmanIdx++ % SNOWMAN_LINES.length]);
      snowGlobe(90);
      requestMotion();
    });
    ui.villa.addEventListener('click', openGame);

    var badge = $('.badge');
    if(badge){
      badge.addEventListener('click', function(){
        if(!isOn()) return;
        buzz(25);
        snowGlobe(140);
      });
    }

    // Escuchar siempre: los eventos solo llegan si el navegador ya lo permite.
    // En iPhone (y Chrome reciente) el permiso se pide al tocar el mono de nieve o el juego.
    if(typeof DeviceMotionEvent !== 'undefined') bindMotion();

    // trineo de bienvenida, una vez por visita
    var seen = false;
    try{ seen = !!sessionStorage.getItem('cclt11-sleigh'); sessionStorage.setItem('cclt11-sleigh', '1'); }catch(e){}
    if(!seen && !reduceMotion){
      setTimeout(function(){
        if(!isOn()) return;
        var s = el('div', { 'class': 'xmas-sleigh xmas-only', 'aria-hidden': 'true' }, '🦌🦌🛷🎅');
        s.addEventListener('animationend', function(){ s.remove(); });
        document.body.appendChild(s);
      }, 2500);
    }
  }

  function buildToggle(){
    var header = $('#header');
    if(!header || ui.toggle) return;
    ui.toggle = el('button', { type: 'button', id: 'xmas-toggle', title: 'Tema navideño' }, '🎄');
    header.appendChild(ui.toggle);
    ui.toggle.addEventListener('click', function(){
      write(KEY_OFF, isOn() ? 'off' : 'on');
      apply();
      refresh();
    });
  }

  function apply(){
    var on = isOn();
    if(on){ root.setAttribute('data-season', 'navidad'); build(); startSnow(); }
    else {
      root.removeAttribute('data-season');
      var c = $('.xmas-countdown'); if(c) c.remove();
      if(snow.raf){ cancelAnimationFrame(snow.raf); snow.raf = 0; }
      snow.flakes = [];
      if(snow.ctx) snow.ctx.clearRect(0, 0, snow.w, snow.h);
    }
    if(ui.toggle){
      ui.toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      ui.toggle.setAttribute('aria-label', on ? 'Quitar tema navideño' : 'Poner tema navideño');
    }
    if(typeof window.cclt11ThemeRefresh === 'function') window.cclt11ThemeRefresh();
  }

  function refresh(){
    if(!isOn()) return;
    addCountdown();
  }

  window.XmasTheme = { snowGlobe: snowGlobe, toast: toast, isOn: isOn };
  if(!window.SeasonTheme) window.SeasonTheme = { refresh: refresh };

  buildToggle();
  apply();
})();

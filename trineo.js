/* Trineo de Santa — mini juego tipo "snake" para la Agenda CCLT 1.1.
   Santa maneja su trineo por la nieve y recoge regalos; cada regalo se engancha
   detrás del trineo y la fila crece. Si choca con la cerca o con sus propios
   regalos, se acaba la partida. Se controla deslizando el dedo, con las
   flechas en pantalla o con el teclado. */
(function(){
  "use strict";

  var COLS = 13, MIN_ROWS = 13, MAX_ROWS = 21;
  var START_STEP = 165, MIN_STEP = 85;
  var BEST_KEY = 'cclt11-trineo-best';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var GIFT_COLORS = [
    ['#e53935', '#ffd166'], ['#f6c343', '#c62828'], ['#1e88e5', '#ffd166'],
    ['#8e24aa', '#ffffff'], ['#fb8c00', '#c62828'], ['#f4f4f4', '#d32f2f']
  ];
  var MILESTONES = {
    5:  '🦌 ¡Rodolfo te está echando porras!',
    10: '🎁 ¡10 regalos repartidos!',
    20: '⭐ ¡Eres un duende experto!',
    30: '🎄 ¡La villa está feliz con tantos regalos!',
    50: '🎅 ¡Eres el ayudante #1 de Santa!'
  };

  var root, stage, canvas, ctx, toastEl, overlay, chipScore, chipBest;
  var view = { dpr: 1, cw: 0, ch: 0, cell: 20, ox: 0, oy: 0, rows: 19 };
  var running = false, raf = 0, lastT = 0, acc = 0, toastTimer = null;
  var S = null, best = 0, flakes = [], sparks = [];

  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function rand(a, b){ return a + Math.random() * (b - a); }

  function loadBest(){ try{ best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; }catch(e){ best = 0; } }
  function saveBest(){ try{ localStorage.setItem(BEST_KEY, String(best)); }catch(e){} }

  // ---------- estado ----------
  function newState(){
    var mid = Math.floor(view.rows / 2);
    var s = {
      snake: [ { x: 5, y: mid }, { x: 4, y: mid }, { x: 3, y: mid } ],
      prev: null, dir: { x: 1, y: 0 }, face: 1, queue: [],
      food: null, bonus: null, score: 0, gifts: 0,
      phase: 'ready', step: START_STEP, shake: 0, pop: 0
    };
    s.food = freeCell(s);
    return s;
  }

  function occupied(s, x, y){
    for(var i = 0; i < s.snake.length; i++) if(s.snake[i].x === x && s.snake[i].y === y) return true;
    if(s.food && s.food.x === x && s.food.y === y) return true;
    if(s.bonus && s.bonus.x === x && s.bonus.y === y) return true;
    return false;
  }
  function freeCell(s){
    var free = [];
    for(var y = 0; y < view.rows; y++) for(var x = 0; x < COLS; x++) if(!occupied(s, x, y)) free.push({ x: x, y: y });
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  // ---------- DOM ----------
  function buildDom(){
    root = document.createElement('div');
    root.id = 'trineo';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Trineo de Santa');
    root.hidden = true;
    root.innerHTML =
      '<div class="tr-bar">' +
        '<div class="tr-title">🛷 <span class="tr-long">Trineo de Santa</span><span class="tr-short">Trineo</span></div>' +
        '<span class="tr-chip" data-chip="score">🎁 0</span>' +
        '<span class="tr-chip" data-chip="best">🏆 0</span>' +
        '<button type="button" class="tr-close" aria-label="Salir del juego">✕</button>' +
      '</div>' +
      '<div class="tr-stage"><canvas></canvas>' +
        '<div class="tr-toast" role="status" aria-live="polite"></div>' +
        '<div class="tr-overlay"></div>' +
      '</div>' +
      '<div class="tr-pad" aria-label="Controles">' +
        '<button type="button" class="tr-key" data-d="up" aria-label="Arriba">▲</button>' +
        '<button type="button" class="tr-key" data-d="left" aria-label="Izquierda">◀</button>' +
        '<button type="button" class="tr-key" data-d="down" aria-label="Abajo">▼</button>' +
        '<button type="button" class="tr-key" data-d="right" aria-label="Derecha">▶</button>' +
      '</div>';
    document.body.appendChild(root);

    stage = root.querySelector('.tr-stage');
    canvas = stage.querySelector('canvas');
    ctx = canvas.getContext('2d');
    toastEl = root.querySelector('.tr-toast');
    overlay = root.querySelector('.tr-overlay');
    chipScore = root.querySelector('[data-chip="score"]');
    chipBest = root.querySelector('[data-chip="best"]');

    root.querySelector('.tr-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e){
      var b = e.target.closest('[data-act]');
      if(!b) return;
      var act = b.getAttribute('data-act');
      if(act === 'start') start();
      else if(act === 'again'){ S = newState(); start(); }
      else if(act === 'resume') resume();
      else if(act === 'close') close();
    });

    var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    Array.prototype.forEach.call(root.querySelectorAll('.tr-key'), function(b){
      b.addEventListener('pointerdown', function(e){
        e.preventDefault();
        var d = DIRS[b.getAttribute('data-d')];
        turn(d[0], d[1]);
      });
    });

    // deslizar el dedo sobre el tablero
    var sx = 0, sy = 0, tracking = false;
    stage.addEventListener('touchstart', function(e){
      if(e.target.closest('.tr-overlay button')) return;
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true;
    }, { passive: true });
    stage.addEventListener('touchmove', function(e){
      e.preventDefault();
      if(!tracking) return;
      var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      if(Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
      sx = t.clientX; sy = t.clientY;   // permite encadenar giros sin levantar el dedo
    }, { passive: false });
    stage.addEventListener('touchend', function(){ tracking = false; });

    window.addEventListener('resize', function(){ if(running) resize(); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden && S && S.phase === 'play') pause(); });
  }

  function onKey(e){
    var k = e.key;
    var map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
    if(map[k]){ e.preventDefault(); turn(map[k][0], map[k][1]); return; }
    if(k === 'Escape'){ close(); return; }
    if(k === ' ' || k === 'Enter'){
      e.preventDefault();
      if(S.phase === 'ready') start();
      else if(S.phase === 'over'){ S = newState(); start(); }
      else if(S.phase === 'paused') resume();
      else if(S.phase === 'play') pause();
    }
  }

  // ---------- overlay ----------
  function showOverlay(html){ overlay.innerHTML = '<div class="tr-card">' + html + '</div>'; overlay.hidden = false; }
  function hideOverlay(){ overlay.hidden = true; overlay.innerHTML = ''; }

  function readyCard(){
    showOverlay(
      '<div class="tr-big">🛷🎅</div><h3>Trineo de Santa</h3>' +
      '<p>Recoge los <b>🎁 regalos</b> para engancharlos a tu trineo. Las <b>⭐ estrellas</b> valen 3 puntos.<br>' +
      'No choques con la cerca ni con tus propios regalos.</p>' +
      '<p class="tr-small">Desliza el dedo o usa las flechas. Agita el celular para una tormenta de nieve.</p>' +
      '<button type="button" class="primary" data-act="start">¡A repartir regalos!</button>'
    );
  }

  function updateChips(){
    chipScore.textContent = '🎁 ' + (S ? S.score : 0);
    chipBest.textContent = '🏆 ' + best;
  }

  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2000);
  }

  // ---------- control ----------
  function start(){
    hideOverlay();
    S.phase = 'play';
    acc = 0;
    updateChips();
  }
  function pause(){
    S.phase = 'paused';
    showOverlay('<div class="tr-big">⏸️</div><h3>Pausa</h3><p>Llevas ' + S.score + ' 🎁</p>' +
      '<button type="button" class="primary" data-act="resume">Continuar</button>' +
      '<button type="button" class="ghost" data-act="close">Salir</button>');
  }
  function resume(){ hideOverlay(); S.phase = 'play'; acc = 0; }

  function turn(dx, dy){
    if(!S) return;
    if(S.phase === 'ready') start();
    else if(S.phase === 'paused') resume();
    else if(S.phase !== 'play') return;
    var last = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
    if(dx === last.x && dy === last.y) return;
    if(dx === -last.x && dy === -last.y) return;   // no puede darse la vuelta sobre sí mismo
    if(S.queue.length < 3) S.queue.push({ x: dx, y: dy });
  }

  function step(){
    if(S.queue.length) S.dir = S.queue.shift();
    if(S.dir.x) S.face = S.dir.x;

    var head = S.snake[0], nx = head.x + S.dir.x, ny = head.y + S.dir.y;
    if(nx < 0 || ny < 0 || nx >= COLS || ny >= view.rows) return crash();

    var grow = S.food && nx === S.food.x && ny === S.food.y;
    var body = S.snake.length - (grow ? 0 : 1);   // la cola se mueve, salvo si crece
    for(var i = 0; i < body; i++) if(S.snake[i].x === nx && S.snake[i].y === ny) return crash();

    S.prev = S.snake.map(function(p){ return { x: p.x, y: p.y }; });
    S.snake.unshift({ x: nx, y: ny });
    if(!grow) S.snake.pop();

    if(grow){
      S.score++; S.gifts++;
      S.pop = 1;
      burst(nx, ny, ['#ffd166', '#ff6b6b', '#ffffff'], 14);
      buzz(12);
      S.step = Math.max(MIN_STEP, START_STEP - S.gifts * 3);
      S.food = freeCell(S);
      if(S.gifts % 5 === 0 && !S.bonus){
        var c = freeCell(S);
        if(c) S.bonus = { x: c.x, y: c.y, life: 7000 };
      }
      if(MILESTONES[S.gifts]) toast(MILESTONES[S.gifts]);
      if(!S.food) return win();
    }
    if(S.bonus && nx === S.bonus.x && ny === S.bonus.y){
      S.score += 3;
      burst(nx, ny, ['#ffd166', '#fff3b0'], 22);
      buzz([15, 30, 15]);
      toast('⭐ ¡+3 puntos!');
      S.bonus = null;
    }
    updateChips();
  }

  function finish(title, emoji, extra){
    S.phase = 'over';
    var record = S.score > best;
    if(record){ best = S.score; saveBest(); }
    updateChips();
    setTimeout(function(){
      if(!running || S.phase !== 'over') return;
      showOverlay(
        '<div class="tr-big">' + emoji + '</div><h3>' + title + '</h3>' +
        '<p>Repartiste <b>' + S.score + '</b> ' + (S.score === 1 ? 'punto' : 'puntos') + ' de regalos.' + (extra || '') + '</p>' +
        (record && S.score > 0 ? '<p class="tr-record">🏆 ¡Nuevo récord!</p>' : '<p class="tr-small">Tu récord: ' + best + '</p>') +
        '<button type="button" class="primary" data-act="again">Jugar otra vez</button>' +
        '<button type="button" class="ghost" data-act="close">Salir</button>'
      );
    }, 650);
  }
  function crash(){
    S.shake = 1;
    var h = S.snake[0];
    burst(h.x, h.y, ['#ffffff', '#cfe3ff'], 26);
    buzz([60, 40, 60]);
    finish('¡Ups! El trineo chocó', '💥🛷');
  }
  function win(){
    finish('¡Feliz Navidad!', '🎄✨', ' ¡Llenaste toda la villa de regalos!');
  }

  function storm(){
    if(!running) return;
    if(reduceMotion){ toast('❄️ ¡Tormenta de nieve!'); return; }
    for(var i = 0; i < 260; i++) flakes.push(newFlake(true));
    toast('❄️ ¡Tormenta de nieve!');
  }

  // ---------- efectos ----------
  function newFlake(storm){
    return {
      x: rand(0, view.cw), y: storm ? rand(-view.ch, view.ch) : rand(-20, view.ch),
      r: storm ? rand(1.2, 3.6) : rand(.8, 2.4), vy: storm ? rand(60, 140) : rand(18, 45),
      vx: storm ? rand(-90, 90) : rand(-10, 10), ph: rand(0, 6.28), temp: !!storm
    };
  }
  function burst(cx, cy, colors, n){
    if(reduceMotion) return;
    var px = view.ox + (cx + .5) * view.cell, py = view.oy + (cy + .5) * view.cell;
    for(var i = 0; i < n; i++){
      var a = rand(0, 6.28), sp = rand(40, 170);
      sparks.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: colors[i % colors.length], r: rand(1.5, 3.2) });
    }
  }

  // ---------- tamaño ----------
  function resize(){
    var r = stage.getBoundingClientRect();
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.cw = r.width; view.ch = r.height;
    canvas.width = Math.round(r.width * view.dpr);
    canvas.height = Math.round(r.height * view.dpr);
    var pad = 10;
    var cellW = (r.width - pad * 2) / COLS;
    if(!S || S.phase === 'ready'){
      var rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor((r.height - pad * 2) / cellW)));
      if(rows !== view.rows || !S){ view.rows = rows; S = newState(); }
    }
    view.cell = Math.max(10, Math.min(34, Math.floor(Math.min(cellW, (r.height - pad * 2) / view.rows))));
    view.ox = Math.round((r.width - view.cell * COLS) / 2);
    view.oy = Math.round((r.height - view.cell * view.rows) / 2);
    if(!flakes.length && !reduceMotion) for(var i = 0; i < 36; i++) flakes.push(newFlake(false));
  }

  // ---------- dibujo ----------
  function roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGift(cx, cy, size, col, bow){
    var h = size / 2;
    roundRect(cx - h, cy - h, size, size, size * .14);
    ctx.fillStyle = col[0]; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(cx - h, cy + h * .35, size, h * .65);
    ctx.fillStyle = col[1];
    ctx.fillRect(cx - size * .09, cy - h, size * .18, size);
    ctx.fillRect(cx - h, cy - size * .09, size, size * .18);
    if(bow){
      ctx.beginPath();
      ctx.ellipse(cx - size * .17, cy - h, size * .17, size * .11, -.5, 0, 6.29);
      ctx.ellipse(cx + size * .17, cy - h, size * .17, size * .11, .5, 0, 6.29);
      ctx.fill();
    }
  }

  function drawStar(cx, cy, r){
    ctx.beginPath();
    for(var i = 0; i < 10; i++){
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd166'; ctx.fill();
    ctx.lineWidth = Math.max(1, r * .12); ctx.strokeStyle = '#fff3b0'; ctx.stroke();
  }

  // Trineo con Santa mirando a la derecha; face = -1 lo voltea.
  function drawSleigh(cx, cy, s, face, t){
    var u = s / 20;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(face, 1);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0, 9.5 * u, 11 * u, 2.2 * u, 0, 0, 6.29); ctx.fill();
    // patín dorado
    ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 1.8 * u; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 * u, 8 * u); ctx.lineTo(7 * u, 8 * u);
    ctx.quadraticCurveTo(11 * u, 8 * u, 10.5 * u, 4 * u);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5 * u, 5 * u); ctx.lineTo(-5 * u, 8 * u); ctx.moveTo(4 * u, 5 * u); ctx.lineTo(4 * u, 8 * u); ctx.stroke();
    // saco de juguetes
    ctx.fillStyle = '#8d5a33';
    ctx.beginPath(); ctx.ellipse(-7 * u, -2 * u, 4.5 * u, 5 * u, -.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#5aa9ff'; ctx.fillRect(-9 * u, -8 * u, 3 * u, 3 * u);
    ctx.fillStyle = '#4fcf86'; ctx.fillRect(-6.5 * u, -7.5 * u, 2.6 * u, 2.6 * u);
    // Santa
    ctx.fillStyle = '#d62828';
    ctx.beginPath(); ctx.arc(0, -2 * u, 4.6 * u, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffd7b5';
    ctx.beginPath(); ctx.arc(0.6 * u, -7.4 * u, 2.9 * u, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(1 * u, -5.6 * u, 2.6 * u, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#d62828';
    ctx.beginPath(); ctx.moveTo(-2.6 * u, -9 * u); ctx.lineTo(3.4 * u, -9 * u); ctx.lineTo(-3.2 * u, -14 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.9 * u, -9.8 * u, 6.6 * u, 1.6 * u);
    ctx.beginPath(); ctx.arc(-3.3 * u, -14 * u, 1.3 * u, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(2 * u, -7.8 * u, .55 * u, 0, 6.29); ctx.fill();
    // cuerpo del trineo
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-10 * u, 0);
    ctx.lineTo(4 * u, 0);
    ctx.quadraticCurveTo(9 * u, -1 * u, 9 * u, -5 * u);
    ctx.quadraticCurveTo(12 * u, -4 * u, 10 * u, 1 * u);
    ctx.quadraticCurveTo(8 * u, 6 * u, 3 * u, 6 * u);
    ctx.lineTo(-8 * u, 6 * u);
    ctx.quadraticCurveTo(-11 * u, 6 * u, -10 * u, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 1 * u;
    ctx.beginPath(); ctx.moveTo(-9 * u, 2.6 * u); ctx.lineTo(5 * u, 2.6 * u); ctx.stroke();
    // cascabel
    var j = Math.sin(t / 90) * .6 * u;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(9.4 * u, -5.6 * u + j, 1.3 * u, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  function drawBoard(t){
    var c = view.cell, ox = view.ox, oy = view.oy, w = c * COLS, h = c * view.rows;
    // pasto de pino en cuadritos
    for(var y = 0; y < view.rows; y++){
      for(var x = 0; x < COLS; x++){
        ctx.fillStyle = (x + y) % 2 ? '#1f7a45' : '#1a6a3c';
        ctx.fillRect(ox + x * c, oy + y * c, c, c);
      }
    }
    // cerca de bastón de caramelo
    var b = Math.max(3, c * .22);
    ctx.lineWidth = b;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([]);
    ctx.strokeRect(ox - b / 2, oy - b / 2, w + b, h + b);
    ctx.strokeStyle = '#d62828';
    ctx.setLineDash([b * 1.6, b * 1.6]);
    ctx.lineDashOffset = -t / 60;
    ctx.strokeRect(ox - b / 2, oy - b / 2, w + b, h + b);
    ctx.setLineDash([]);
    ctx.lineWidth = Math.max(1.5, b * .35);
    ctx.strokeStyle = '#ffcf4a';
    ctx.strokeRect(ox - b - 1, oy - b - 1, w + b * 2 + 2, h + b * 2 + 2);
  }

  function cellCenter(p){ return { x: view.ox + (p.x + .5) * view.cell, y: view.oy + (p.y + .5) * view.cell }; }

  function render(t, frac){
    var W = view.cw, H = view.ch;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    // fondo rojo navideño
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#9e1b24'); g.addColorStop(1, '#5c0d15');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.save();
    if(S.shake > 0 && !reduceMotion){
      var m = S.shake * 6;
      ctx.translate(rand(-m, m), rand(-m, m));
    }
    drawBoard(t);

    var c = view.cell;
    // regalo a recoger
    if(S.food){
      var fp = cellCenter(S.food), pulse = reduceMotion ? 1 : 1 + Math.sin(t / 180) * .07;
      drawGift(fp.x, fp.y + c * .06, c * .66 * pulse, GIFT_COLORS[S.gifts % GIFT_COLORS.length], true);
    }
    // estrella bonus
    if(S.bonus){
      var bp = cellCenter(S.bonus);
      var blink = S.bonus.life < 2000 && Math.floor(t / 150) % 2;
      if(!blink){
        ctx.save();
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = c * .6;
        drawStar(bp.x, bp.y, c * .42 * (reduceMotion ? 1 : 1 + Math.sin(t / 140) * .08));
        ctx.restore();
      }
    }

    // posiciones interpoladas para que el trineo se deslice suave
    var pts = S.snake.map(function(p, i){
      var cur = cellCenter(p);
      if(frac >= 1 || !S.prev || !S.prev[i]) return cur;
      var pr = cellCenter(S.prev[i]);
      return { x: pr.x + (cur.x - pr.x) * frac, y: pr.y + (cur.y - pr.y) * frac };
    });

    // cuerda dorada que une los regalos
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = Math.max(1.5, c * .08);
    ctx.beginPath();
    pts.forEach(function(p, i){ if(i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.stroke();

    // regalos enganchados (de la cola hacia el trineo)
    for(var i = pts.length - 1; i >= 1; i--){
      var sz = c * (i === 1 && S.pop > 0 ? .7 + S.pop * .15 : .7);
      drawGift(pts[i].x, pts[i].y, sz, GIFT_COLORS[(i - 1) % GIFT_COLORS.length], false);
    }
    drawSleigh(pts[0].x, pts[0].y + c * .05, c * 1.05, S.face, t);
    ctx.restore();

    // chispas
    sparks.forEach(function(p){
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // nieve encima de todo
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    flakes.forEach(function(f){
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.29); ctx.fill();
    });
  }

  function update(dt){
    var s = dt / 1000;
    for(var i = flakes.length - 1; i >= 0; i--){
      var f = flakes[i];
      f.ph += s * 2;
      f.y += f.vy * s;
      f.x += (f.vx + Math.sin(f.ph) * 12) * s;
      if(f.temp) f.vx *= .985;
      if(f.y > view.ch + 10){
        if(f.temp) flakes.splice(i, 1);
        else { f.y = -10; f.x = rand(0, view.cw); }
      }
    }
    for(var k = sparks.length - 1; k >= 0; k--){
      var p = sparks[k];
      p.x += p.vx * s; p.y += p.vy * s; p.vy += 220 * s; p.life -= s * 1.6;
      if(p.life <= 0) sparks.splice(k, 1);
    }
    if(S.shake > 0) S.shake = Math.max(0, S.shake - s * 2.5);
    if(S.pop > 0) S.pop = Math.max(0, S.pop - s * 4);
    if(S.bonus && S.phase === 'play'){
      S.bonus.life -= dt;
      if(S.bonus.life <= 0) S.bonus = null;
    }
  }

  function frame(t){
    if(!running) return;
    var dt = Math.min(50, t - (lastT || t));
    lastT = t;
    if(S.phase === 'play'){
      acc += dt;
      while(acc >= S.step && S.phase === 'play'){ acc -= S.step; step(); }
    }
    update(dt);
    var frac = S.phase === 'play' && !reduceMotion ? Math.min(1, acc / S.step) : 1;
    render(t, frac);
    raf = requestAnimationFrame(frame);
  }

  // ---------- abrir / cerrar ----------
  var prevOverflow = '';
  function open(){
    if(!root) buildDom();
    loadBest();
    root.hidden = false;
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    running = true;
    resize();
    if(!S || S.phase === 'over'){ S = newState(); }
    if(S.phase === 'play') pause();
    else if(S.phase === 'ready') readyCard();
    updateChips();
    document.addEventListener('keydown', onKey);
    lastT = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close(){
    if(!root) return;
    if(S && S.phase === 'play') S.phase = 'paused';
    running = false;
    cancelAnimationFrame(raf);
    root.hidden = true;
    document.documentElement.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
    if(S && S.phase === 'paused') pause();
  }

  window.SleighGame = { open: open, close: close, storm: storm, isOpen: function(){ return running; } };
})();

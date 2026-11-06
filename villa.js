/* Villa de Santa — mini juego para la Agenda CCLT 1.1.
   Diorama navideño en miniatura: enciende las 6 casas, encuentra los 5 regalos
   escondidos y al final enciende el gran pino. Todo se dibuja en un canvas. */
(function(){
  "use strict";

  var W = 360, H = 640;              // coordenadas lógicas del diorama
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var root, stage, canvas, ctx, bgCanvas, bgCtx, toastEl, winEl, chips = {};
  var view = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  var running = false, raf = 0, lastT = 0, dirty = true, toastTimer = null;
  var S = null;                       // estado del juego

  var HOUSES = [
    { id: 'iglesia',  name: 'Iglesia',            x: 10,  base: 382, w: 64,  h: 62, body: '#e9e2d0', roof: '#7a2e2e', steeple: true,
      lines: ['🔔 ¡Ding dong! Suenan las campanas', '🕊️ Paz y alegría para todos'] },
    { id: 'panaderia', name: 'Panadería',         x: 86,  base: 384, w: 58,  h: 46, body: '#f3c98b', roof: '#8a4b2a',
      lines: ['🍪 Huele a galletas de jengibre', '🥖 ¡Pan recién horneado!'] },
    { id: 'santa',    name: 'Casa de Santa',      x: 214, base: 382, w: 72,  h: 56, body: '#c94a4a', roof: '#3d2a24',
      lines: ['📜 Santa está revisando su lista…', '🎅 ¡Jo, jo, jo! ¿Te portaste bien?'] },
    { id: 'establo',  name: 'Establo de renos',   x: 292, base: 386, w: 60,  h: 44, body: '#9a6b45', roof: '#5a3a24',
      lines: ['🦌 Rodolfo está listo para volar', '🥕 Los renos están cenando zanahorias'] },
    { id: 'taller',   name: 'Taller de Santa',    x: 8,   base: 524, w: 102, h: 76, body: '#2f7a52', roof: '#7a1f1f',
      lines: ['🧸 Los duendes están haciendo juguetes', '🔨 ¡Tac, tac, tac! Mucho trabajo'] },
    { id: 'dulceria', name: 'Dulcería',           x: 250, base: 524, w: 102, h: 70, body: '#f2a7c3', roof: '#a3264f',
      lines: ['🍭 ¡Bastones de caramelo para todos!', '🍫 Chocolate caliente en camino'] }
  ];

  var GIFTS = [
    { x: 86,  y: 392, s: 16 },   // detrás del pinito junto a la iglesia
    { x: 247, y: 323, s: 16 },   // en el techo de la casa de Santa
    { x: 98,  y: 566, s: 17 },   // escondido junto al mono de nieve
    { x: 340, y: 600, s: 16 },   // en la esquina de la vía del tren
    { x: 300, y: 70,  s: 15 }    // junto a la luna (¡se le cayó a Santa!)
  ];

  var TREE = { x: 180, base: 534, h: 196, w: 132 };

  function newState(){
    return {
      houses: HOUSES.map(function(h){ return { lit: false, glow: 0, line: 0, smoke: [] }; }),
      gifts: GIFTS.map(function(){ return { found: false }; }),
      tree: { lit: false, t: 0 },
      train: { x: 420, speed: 34, boost: 0 },
      sleigh: { active: false, x: 0, y: 130, t: 0, next: 4 },
      flakes: [], sparks: [], stars: makeStars(), storm: 0, won: false
    };
  }

  function makeStars(){
    var a = [];
    for(var i = 0; i < 46; i++) a.push({ x: Math.random() * W, y: Math.random() * 250, r: Math.random() * 1.3 + .3, ph: Math.random() * 6.28 });
    return a;
  }

  // ---------- DOM ----------
  function buildDom(){
    root = document.createElement('div');
    root.id = 'villa';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Villa de Santa');
    root.hidden = true;
    root.innerHTML =
      '<div class="villa-bar">' +
        '<div class="villa-title">🎅 <span class="vt-long">Villa de Santa</span><span class="vt-short">Villa</span></div>' +
        '<div class="villa-chips">' +
          '<span class="villa-chip" data-chip="casas">💡 0/6</span>' +
          '<span class="villa-chip" data-chip="regalos">🎁 0/5</span>' +
          '<span class="villa-chip" data-chip="pino">🎄</span>' +
        '</div>' +
        '<button type="button" class="villa-close" aria-label="Salir de la villa">✕</button>' +
      '</div>' +
      '<div class="villa-stage"><canvas></canvas><div class="villa-toast" role="status" aria-live="polite"></div>' +
        '<div class="villa-win" hidden><div class="villa-win-card">' +
          '<div style="font-size:44px">🎄✨</div><h3>¡Feliz Navidad!</h3>' +
          '<p>Encendiste toda la villa y encontraste los regalos. ¡Santa está muy orgulloso de ti!</p>' +
          '<button type="button" class="primary" data-act="again">Jugar otra vez</button>' +
          '<button type="button" class="ghost" data-act="close">Salir</button>' +
        '</div></div>' +
      '</div>' +
      '<div class="villa-hint">Toca las casas para encender sus luces y busca los 🎁 escondidos. Agita el celular para hacer nevar.</div>';
    document.body.appendChild(root);

    stage = root.querySelector('.villa-stage');
    canvas = stage.querySelector('canvas');
    ctx = canvas.getContext('2d');
    bgCanvas = document.createElement('canvas');
    bgCtx = bgCanvas.getContext('2d');
    toastEl = stage.querySelector('.villa-toast');
    winEl = stage.querySelector('.villa-win');
    ['casas', 'regalos', 'pino'].forEach(function(k){ chips[k] = root.querySelector('[data-chip="' + k + '"]'); });

    root.querySelector('.villa-close').addEventListener('click', close);
    winEl.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-act]');
      if(!b) return;
      if(b.getAttribute('data-act') === 'again'){ reset(); } else { close(); }
    });
    canvas.addEventListener('pointerdown', onTap);
    window.addEventListener('resize', function(){ if(running) resize(); });
    document.addEventListener('keydown', function(ev){ if(running && ev.key === 'Escape') close(); });
  }

  function resize(){
    var r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.cw = r.width; view.ch = r.height;
    view.scale = Math.min(r.width / W, r.height / H);
    view.ox = (r.width - W * view.scale) / 2;
    view.oy = (r.height - H * view.scale) / 2;
    canvas.width = Math.round(r.width * view.dpr);
    canvas.height = Math.round(r.height * view.dpr);
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    dirty = true;
  }

  function toLogical(c){
    c.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, view.ox * view.dpr, view.oy * view.dpr);
  }

  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

  function updateChips(){
    var lit = S.houses.filter(function(h){ return h.lit; }).length;
    var found = S.gifts.filter(function(g){ return g.found; }).length;
    chips.casas.textContent = '💡 ' + lit + '/6';
    chips.casas.classList.toggle('done', lit === 6);
    chips.regalos.textContent = '🎁 ' + found + '/5';
    chips.regalos.classList.toggle('done', found === 5);
    chips.pino.textContent = S.tree.lit ? '🎄 ✓' : '🎄';
    chips.pino.classList.toggle('done', S.tree.lit);
  }

  // ---------- dibujo ----------
  function emoji(c, ch, x, y, size){
    c.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ch, x, y);
  }

  function drawBackground(){
    var c = bgCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    // fuera del diorama
    c.fillStyle = '#081125';
    c.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    toLogical(c);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.clip();

    // cielo
    var g = c.createLinearGradient(0, 0, 0, 330);
    g.addColorStop(0, '#071430'); g.addColorStop(1, '#1d3d70');
    c.fillStyle = g; c.fillRect(0, 0, W, 340);
    // luna
    c.fillStyle = '#fff6d8';
    c.shadowColor = 'rgba(255,240,190,.8)'; c.shadowBlur = 24;
    c.beginPath(); c.arc(300, 74, 22, 0, 6.283); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(210,200,170,.6)';
    c.beginPath(); c.arc(293, 68, 4, 0, 6.283); c.fill();
    c.beginPath(); c.arc(306, 82, 3, 0, 6.283); c.fill();

    // colinas lejanas
    c.fillStyle = '#c7d6ee';
    c.beginPath(); c.moveTo(0, 330);
    c.quadraticCurveTo(70, 285, 140, 318); c.quadraticCurveTo(220, 280, 290, 312); c.quadraticCurveTo(330, 296, 360, 306);
    c.lineTo(360, 360); c.lineTo(0, 360); c.closePath(); c.fill();

    // suelo nevado
    var gs = c.createLinearGradient(0, 330, 0, H);
    gs.addColorStop(0, '#eef4ff'); gs.addColorStop(1, '#cfdcf0');
    c.fillStyle = gs; c.fillRect(0, 340, W, H - 340);

    // camino de la plaza
    c.fillStyle = 'rgba(160,180,210,.35)';
    c.beginPath(); c.ellipse(180, 560, 120, 26, 0, 0, 6.283); c.fill();

    // regalos (se dibujan antes de lo que los tapa)
    S.gifts.forEach(function(gf, i){ if(!gf.found){ var p = GIFTS[i]; emoji(c, '🎁', p.x, p.y, p.s); } });

    // pinitos y detalles del fondo
    emoji(c, '🌲', 80, 384, 26);
    emoji(c, '🦌', 336, 398, 20);

    // casas
    HOUSES.forEach(function(h, i){ drawHouse(c, h, S.houses[i]); });

    // mono de nieve (tapa el regalo 3)
    emoji(c, '⛄', 92, 562, 40);
    emoji(c, '⛄', 268, 566, 30);
    emoji(c, '🌲', 128, 536, 30);
    emoji(c, '🌲', 236, 540, 26);

    // vía del tren
    c.strokeStyle = '#7c6a5a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 616); c.lineTo(W, 616); c.moveTo(0, 624); c.lineTo(W, 624); c.stroke();
    c.strokeStyle = '#8b7765'; c.lineWidth = 3;
    for(var x = 4; x < W; x += 14){ c.beginPath(); c.moveTo(x, 613); c.lineTo(x, 627); c.stroke(); }

    c.restore();
    dirty = false;
  }

  function roofPath(c, h){
    var top = h.base - h.h;
    c.beginPath();
    c.moveTo(h.x - 6, top + 2);
    c.lineTo(h.x + h.w / 2, top - h.h * .45);
    c.lineTo(h.x + h.w + 6, top + 2);
    c.closePath();
  }

  function drawHouse(c, h, st){
    var top = h.base - h.h;
    // chimenea
    c.fillStyle = '#6b4a3a';
    c.fillRect(h.x + h.w * .7, top - h.h * .38, 9, h.h * .3);
    // cuerpo
    c.fillStyle = h.body;
    c.fillRect(h.x, top, h.w, h.h);
    // campanario
    if(h.steeple){
      c.fillStyle = h.body;
      c.fillRect(h.x + h.w / 2 - 9, top - h.h * .75, 18, h.h * .5);
      c.fillStyle = h.roof;
      c.beginPath(); c.moveTo(h.x + h.w / 2 - 12, top - h.h * .75); c.lineTo(h.x + h.w / 2, top - h.h * 1.05); c.lineTo(h.x + h.w / 2 + 12, top - h.h * .75); c.closePath(); c.fill();
      c.fillStyle = '#ffd166'; c.fillRect(h.x + h.w / 2 - 1, top - h.h * 1.18, 2, 10); c.fillRect(h.x + h.w / 2 - 4, top - h.h * 1.13, 8, 2);
    }
    // techo con nieve
    c.fillStyle = h.roof; roofPath(c, h); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineJoin = 'round'; roofPath(c, h); c.stroke();
    // puerta
    c.fillStyle = 'rgba(40,24,18,.85)';
    var dw = Math.max(10, h.w * .16), dh = h.h * .42;
    c.fillRect(h.x + h.w / 2 - dw / 2, h.base - dh, dw, dh);
    // ventanas
    var wy = top + h.h * .22, ws = Math.max(9, h.w * .15);
    var cols = h.w > 80 ? [ .14, .66 ] : [ .12, .64 ];
    cols.forEach(function(fx){
      c.fillStyle = st.lit ? '#ffd36b' : '#2b3550';
      if(st.lit){ c.shadowColor = 'rgba(255,200,90,.95)'; c.shadowBlur = 14; }
      c.fillRect(h.x + h.w * fx, wy, ws + 4, ws);
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2;
      c.strokeRect(h.x + h.w * fx, wy, ws + 4, ws);
      c.beginPath(); c.moveTo(h.x + h.w * fx + (ws + 4) / 2, wy); c.lineTo(h.x + h.w * fx + (ws + 4) / 2, wy + ws); c.stroke();
    });
    // nieve al pie
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(h.x + h.w / 2, h.base + 1, h.w * .62, 5, 0, 0, 6.283); c.fill();
  }

  function drawTree(c, t){
    var x = TREE.x, base = TREE.base, h = TREE.h, w = TREE.w;
    // tronco
    c.fillStyle = '#6b4226'; c.fillRect(x - 9, base - 18, 18, 18);
    // tres capas
    var layers = [ [0, 1], [.32, .78], [.6, .55] ];
    layers.forEach(function(l){
      var y0 = base - 14 - h * l[0], hw = w / 2 * l[1];
      c.fillStyle = '#1f7a45';
      c.beginPath(); c.moveTo(x - hw, y0); c.lineTo(x, y0 - h * .46); c.lineTo(x + hw, y0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.moveTo(x - hw, y0); c.quadraticCurveTo(x, y0 - 8, x + hw, y0); c.lineTo(x + hw - 6, y0 + 3); c.quadraticCurveTo(x, y0 - 3, x - hw + 6, y0 + 3); c.closePath(); c.fill();
    });
    // luces del pino
    var colors = ['#ff4d4d', '#ffd166', '#5aa9ff', '#ff8ad8', '#4fe08f'];
    var n = 26;
    for(var i = 0; i < n; i++){
      var row = i % 5, k = Math.floor(i / 5);
      var yy = base - 30 - (h * .78) * (k + .5) / 5.6 - row * 3;
      var span = (w / 2) * (1 - (k + .5) / 5.6) * .9;
      var xx = x - span + (2 * span) * ((row + .5) / 5);
      var on = t.lit && t.t > i * 0.06;
      if(on){
        var tw = .6 + .4 * Math.sin(lastT / 300 + i);
        c.fillStyle = colors[i % colors.length];
        c.globalAlpha = tw; c.shadowColor = colors[i % colors.length]; c.shadowBlur = 10;
      } else {
        c.fillStyle = '#4a5a52'; c.globalAlpha = .9;
      }
      c.beginPath(); c.arc(xx, yy, 2.6, 0, 6.283); c.fill();
      c.shadowBlur = 0; c.globalAlpha = 1;
    }
    // estrella
    var sy = base - 14 - h * .6 - h * .46 + 2;
    if(t.lit && t.t > 1.6){ c.shadowColor = 'rgba(255,215,90,1)'; c.shadowBlur = 22; }
    emoji(c, '⭐', x, sy, t.lit && t.t > 1.6 ? 26 : 20);
    c.shadowBlur = 0;
    if(!t.lit){ c.globalAlpha = .5; emoji(c, '🔒', x + 30, base - 40, 14); c.globalAlpha = 1; }
    // regalos bajo el pino
    emoji(c, '🎁', x - 34, base - 6, 18);
    emoji(c, '🎁', x + 30, base - 4, 16);
  }

  function frame(t){
    if(!running) return;
    var dt = Math.min(.05, (t - (lastT || t)) / 1000);
    lastT = t;
    update(dt);
    if(dirty) drawBackground();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    toLogical(ctx);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    // estrellas que titilan
    S.stars.forEach(function(s){
      ctx.globalAlpha = .45 + .55 * Math.abs(Math.sin(t / 900 + s.ph));
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // trineo
    if(S.sleigh.active){
      var sl = S.sleigh;
      var sy = sl.y + Math.sin(sl.t * 2.2) * 10;
      emoji(ctx, '🦌', sl.x, sy, 24);
      emoji(ctx, '🦌', sl.x + 26, sy + 3, 24);
      emoji(ctx, '🛷', sl.x + 58, sy + 6, 28);
      emoji(ctx, '🎅', sl.x + 58, sy - 8, 20);
    }

    // brillo de casas encendidas + humo
    HOUSES.forEach(function(h, i){
      var st = S.houses[i];
      if(st.lit){
        var top = h.base - h.h;
        var gr = ctx.createRadialGradient(h.x + h.w / 2, top + h.h * .4, 2, h.x + h.w / 2, top + h.h * .4, h.w);
        gr.addColorStop(0, 'rgba(255,200,90,' + (.22 * st.glow) + ')'); gr.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = gr; ctx.fillRect(h.x - h.w / 2, top - h.h, h.w * 2, h.h * 2.4);
      }
      st.smoke.forEach(function(p){
        ctx.globalAlpha = p.a; ctx.fillStyle = '#dfe6f2';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });

    // gran pino
    drawTree(ctx, S.tree);

    // tren
    var tx = S.train.x;
    emoji(ctx, '🚂', tx, 604, 30);
    emoji(ctx, '🚃', tx + 32, 606, 26);
    emoji(ctx, '🚃', tx + 60, 606, 26);

    // chispas
    S.sparks.forEach(function(p){
      ctx.globalAlpha = Math.max(0, p.life);
      if(p.ch){ emoji(ctx, p.ch, p.x, p.y, p.size); }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    });
    ctx.globalAlpha = 1;

    // nieve
    ctx.fillStyle = '#fff';
    S.flakes.forEach(function(f){
      ctx.globalAlpha = f.storm ? .95 : .8;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  function update(dt){
    // tren
    var tr = S.train;
    if(tr.boost > 0) tr.boost -= dt;
    tr.x -= (tr.boost > 0 ? tr.speed * 3 : tr.speed) * dt;
    if(tr.x < -110) tr.x = W + 30;

    // trineo
    var sl = S.sleigh;
    if(sl.active){
      sl.t += dt; sl.x -= 70 * dt;
      if(sl.x < -120){ sl.active = false; sl.next = 9 + Math.random() * 6; }
    } else {
      sl.next -= dt;
      if(sl.next <= 0){ sl.active = true; sl.x = W + 20; sl.y = 120 + Math.random() * 70; sl.t = 0; }
    }

    // pino
    if(S.tree.lit) S.tree.t += dt;

    // casas: brillo y humo
    HOUSES.forEach(function(h, i){
      var st = S.houses[i];
      if(st.lit && st.glow < 1) st.glow = Math.min(1, st.glow + dt * 2);
      if(st.lit && Math.random() < dt * 3){
        var top = h.base - h.h;
        st.smoke.push({ x: h.x + h.w * .7 + 4, y: top - h.h * .4, r: 2 + Math.random() * 2, a: .6, vy: -12 - Math.random() * 6 });
      }
      st.smoke = st.smoke.filter(function(p){ p.y += p.vy * dt; p.x += Math.sin(p.y / 9) * .3; p.r += dt * 3; p.a -= dt * .35; return p.a > 0; });
    });

    // chispas
    S.sparks = S.sparks.filter(function(p){
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * (p.decay || 1);
      return p.life > 0;
    });

    // nieve
    var target = reduceMotion ? 10 : 55;
    var ambient = S.flakes.filter(function(f){ return !f.storm; }).length;
    while(ambient < target){
      S.flakes.push({ x: Math.random() * W, y: Math.random() * H, vy: 14 + Math.random() * 26, r: .8 + Math.random() * 1.8, ph: Math.random() * 6.28 });
      ambient++;
    }
    S.flakes = S.flakes.filter(function(f){
      f.ph += dt * 2;
      if(f.storm){
        f.vx *= Math.pow(.25, dt); f.vy = f.vy * Math.pow(.25, dt) + 40 * dt;
        f.x += (f.vx + Math.sin(f.ph) * 20) * dt; f.y += f.vy * dt;
        return f.y < H + 10 && f.x > -20 && f.x < W + 20;
      }
      f.x += Math.sin(f.ph) * 10 * dt; f.y += f.vy * dt;
      if(f.y > H + 4){ f.y = -4; f.x = Math.random() * W; }
      return true;
    });
  }

  // ---------- interacción ----------
  function burst(x, y, chars, n){
    for(var i = 0; i < n; i++){
      var a = Math.random() * 6.283, sp = 40 + Math.random() * 110;
      S.sparks.push(chars ?
        { ch: chars[i % chars.length], size: 14 + Math.random() * 12, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 160, life: 1.4, decay: .8 } :
        { color: ['#ffd166', '#ff6b6b', '#8fd3ff', '#ffffff'][i % 4], r: 1.5 + Math.random() * 2, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 60, life: .9, decay: 1.2 });
    }
  }

  function onTap(ev){
    if(S.won && !winEl.hidden) return;
    var r = canvas.getBoundingClientRect();
    var x = (ev.clientX - r.left - view.ox) / view.scale;
    var y = (ev.clientY - r.top - view.oy) / view.scale;

    // regalos
    for(var i = 0; i < GIFTS.length; i++){
      var g = GIFTS[i];
      if(!S.gifts[i].found && Math.hypot(x - g.x, y - g.y) < 20){
        S.gifts[i].found = true; dirty = true;
        burst(g.x, g.y, ['✨', '⭐', '🎁'], 8);
        buzz(35);
        var n = S.gifts.filter(function(q){ return q.found; }).length;
        toast(n === 5 ? '🎁 ¡Encontraste los 5 regalos!' : '🎁 ¡Regalo ' + n + ' de 5!');
        updateChips(); checkReady();
        return;
      }
    }

    // trineo
    var sl = S.sleigh;
    if(sl.active){
      var sy = sl.y + Math.sin(sl.t * 2.2) * 10;
      if(x > sl.x - 20 && x < sl.x + 80 && Math.abs(y - sy) < 26){
        burst(sl.x + 58, sy, ['❄️', '✨', '⭐'], 10);
        toast('🎅 ¡Jo, jo, jo! ¡Feliz Navidad, grupo 1.1!');
        buzz(25);
        return;
      }
    }

    // tren
    if(y > 588 && y < 626 && x > S.train.x - 22 && x < S.train.x + 80){
      S.train.boost = 2.2;
      toast('🚂 ¡Chu, chu! ¡Todos a bordo!');
      buzz(20);
      return;
    }

    // gran pino (solo su silueta)
    if(inTree(x, y)){
      onTree();
      return;
    }

    // casas
    for(var j = 0; j < HOUSES.length; j++){
      var h = HOUSES[j];
      var top = h.base - h.h;
      if(x > h.x - 6 && x < h.x + h.w + 6 && y > top - h.h * .5 && y < h.base + 4){
        var st = S.houses[j];
        if(!st.lit){
          st.lit = true; dirty = true;
          burst(h.x + h.w / 2, top + h.h * .3, null, 18);
          buzz(25);
          var lit = S.houses.filter(function(q){ return q.lit; }).length;
          toast('💡 Encendiste: ' + h.name + ' (' + lit + '/6)');
          updateChips(); checkReady();
        } else {
          toast(h.lines[st.line++ % h.lines.length]);
        }
        return;
      }
    }

    // nieve donde tocaste
    for(var k = 0; k < 10; k++){
      S.flakes.push({ storm: true, x: x, y: y, vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 60, r: 1 + Math.random() * 2, ph: Math.random() * 6 });
    }
  }

  function inTree(x, y){
    var base = TREE.base, h = TREE.h, w = TREE.w, pad = 8;
    if(Math.abs(x - TREE.x) < 12 && y <= base && y >= base - 22) return true;
    var layers = [ [0, 1], [.32, .78], [.6, .55] ];
    for(var i = 0; i < layers.length; i++){
      var y0 = base - 14 - h * layers[i][0], hw = w / 2 * layers[i][1], apex = y0 - h * .46;
      if(y > y0 + pad || y < apex - pad - 18) continue;   // -18: la estrella
      var frac = Math.max(0, (y - apex) / (y0 - apex));
      if(Math.abs(x - TREE.x) <= hw * frac + pad) return true;
    }
    return false;
  }

  function missing(){
    var lit = S.houses.filter(function(h){ return h.lit; }).length;
    var found = S.gifts.filter(function(g){ return g.found; }).length;
    var parts = [];
    if(lit < 6) parts.push('enciende ' + (6 - lit) + (6 - lit === 1 ? ' casa' : ' casas'));
    if(found < 5) parts.push('encuentra ' + (5 - found) + (5 - found === 1 ? ' regalo' : ' regalos'));
    return parts;
  }

  function checkReady(){
    if(!missing().length && !S.tree.lit){
      setTimeout(function(){ if(running && !S.tree.lit) toast('⭐ ¡Listo! Ahora toca el gran pino para encenderlo'); }, 1400);
    }
  }

  function onTree(){
    if(S.tree.lit){ toast('🎄 ¡El pino más bonito de Tepic!'); burst(TREE.x, TREE.base - TREE.h * .6, null, 12); return; }
    var m = missing();
    if(m.length){ toast('🔒 Para encender el pino: ' + m.join(' y ')); return; }
    S.tree.lit = true; S.tree.t = 0;
    buzz([60, 40, 60, 40, 160]);
    updateChips();
    setTimeout(celebrate, 1900);
  }

  function celebrate(){
    if(!running) return;
    S.won = true;
    burst(TREE.x, TREE.base - TREE.h, ['🎁', '⭐', '❄️', '🎄', '🔔', '🍬'], 46);
    storm(240);
    try{ localStorage.setItem('cclt11-villa-done', '1'); }catch(e){}
    setTimeout(function(){ if(running) winEl.hidden = false; }, 1800);
  }

  function storm(n){
    if(!S) return;
    var count = reduceMotion ? 40 : (n || 260);
    for(var i = 0; i < count; i++){
      var a = Math.random() * 6.283, sp = 60 + Math.random() * 220;
      S.flakes.push({ storm: true, x: W / 2 + (Math.random() - .5) * W * .6, y: H * (.35 + Math.random() * .4),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, r: 1.2 + Math.random() * 2.8, ph: Math.random() * 6 });
    }
  }

  function reset(){
    S = newState();
    winEl.hidden = true;
    dirty = true;
    updateChips();
    toast('🎅 ¡Bienvenido a la Villa de Santa!');
  }

  // ---------- abrir / cerrar ----------
  var prevOverflow = '';
  function open(){
    if(!root) buildDom();
    if(!S) S = newState();
    root.hidden = false;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    running = true;
    resize();
    updateChips();
    lastT = 0;
    raf = requestAnimationFrame(frame);
    toast(S.won ? '🎄 ¡La villa sigue encendida!' : '🎅 ¡Bienvenido a la Villa de Santa!');
  }

  function close(){
    running = false;
    cancelAnimationFrame(raf);
    root.hidden = true;
    document.body.style.overflow = prevOverflow;
  }

  window.VillaGame = { open: open, close: close, storm: storm, isOpen: function(){ return running; } };
})();

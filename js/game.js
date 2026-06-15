// Игровой цикл и логика.

const Game = {
  canvas: null,
  ctx: null,
  running: false,
  paused: false,
  soundOn: true,
  debug: false, // показать эллипсы и точки спавна (клавиша D)
  onGameOver: null, // колбэк из main
  bgKey: 'bgHorizontal',

  state: null,
  lastTs: 0,
  rafId: 0,
};

function freshState() {
  return {
    lives: CONFIG.startLives,
    score: 0,
    collected: 0,
    now: 0,            // игровое время, мс
    elapsedMs: 0,
    spawnTimer: 0,
    items: [],
    occupied: new Set(),
    clown: { x: Arena.cx, y: Arena.cy, target: null, targetItemId: null },
    bonuses: { magnet: 0, shield: 0, x2: 0 }, // время окончания (мс), 0 = выкл; shield: 0|1 как флаг через >now
    effects: { candySpeed: 0, stun: 0, ketchupSlow: 0, cactusSlow: 0, cracker: 0 },
    shieldActive: false,
  };
}

Game.init = function (canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
};

Game.start = function () {
  this.state = freshState();
  this.state.clown.x = Arena.cx;
  this.state.clown.y = Arena.cy;
  this.running = true;
  this.paused = false;
  this.lastTs = 0;
  cancelAnimationFrame(this.rafId);
  this.loop = this.loop.bind(this);
  this.rafId = requestAnimationFrame(this.loop);
};

Game.stop = function () {
  this.running = false;
  cancelAnimationFrame(this.rafId);
};

Game.setPaused = function (p) {
  this.paused = p;
  if (!p && this.running) {
    this.lastTs = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }
};

Game.loop = function (ts) {
  if (!this.running) return;
  if (this.paused) return;
  if (!this.lastTs) this.lastTs = ts;
  let dt = (ts - this.lastTs) / 1000;
  this.lastTs = ts;
  if (dt > 0.05) dt = 0.05; // защита от больших скачков
  this.update(dt);
  this.render();
  this.rafId = requestAnimationFrame(this.loop);
};

// ---- Сложность ----
function difficultySteps(collected) {
  return Math.floor(collected / CONFIG.difficultyStep);
}
function currentSpawnInterval(s) {
  const k = difficultySteps(s.collected);
  let interval = CONFIG.spawnIntervalMs / (1 + CONFIG.spawnSpeedupPerStep * k);
  if (s.effects.cracker > s.now) interval *= 0.85; // быстрее появление при хлопушке
  return interval;
}
function currentLifetime(s) {
  const k = difficultySteps(s.collected);
  let life = CONFIG.baseLifetimeMs * Math.pow(1 - CONFIG.lifetimeReductionPerStep, k);
  if (s.effects.cracker > s.now) life *= 0.5; // +50% к скорости исчезновения
  return life;
}
function currentBadProbability(s) {
  const k = difficultySteps(s.collected);
  let p = 0.25 + CONFIG.badIncreasePerStep * k;
  if (s.effects.cracker > s.now) p += 0.15;
  return Math.min(CONFIG.badProbabilityMax + 0.15, Math.min(p, 0.55));
}

// ---- Скорость клоуна ----
function clownSpeed(s) {
  if (s.effects.stun > s.now) return 0;
  const base = CONFIG.clownSpeedFactor * Math.min(Arena.innerRx, Arena.innerRy);
  let mult = 1;
  if (s.effects.candySpeed > s.now) mult *= 1.3;
  if (s.effects.ketchupSlow > s.now) mult *= 0.5;
  if (s.effects.cactusSlow > s.now) mult *= 0.7;
  return base * mult;
}

Game.update = function (dt) {
  const s = this.state;
  s.now += dt * 1000;
  s.elapsedMs += dt * 1000;

  // Спавн
  s.spawnTimer += dt * 1000;
  const interval = currentSpawnInterval(s);
  while (s.spawnTimer >= interval && s.items.length < CONFIG.maxItemsOnField) {
    s.spawnTimer -= interval;
    const item = createItem(s.occupied, currentBadProbability(s), currentLifetime(s));
    if (item) {
      item.bornAt = s.now;
      s.items.push(item);
      s.occupied.add(item.spawnIndex);
    } else break;
  }

  // Старение и удаление предметов
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    it.age = s.now - it.bornAt;
    if (it.age >= it.lifeMs) {
      this.removeItem(i);
    }
  }

  // Движение клоуна
  this.moveClown(s, dt);

  // Магнит: автосбор близких предметов
  if (s.bonuses.magnet > s.now) {
    const r = CONFIG.magnetRadiusFactor * Math.min(Arena.innerRx, Arena.innerRy);
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      const pk = pickupPointFor(it.x, it.y);
      const dx = s.clown.x - pk.x, dy = s.clown.y - pk.y;
      if (Math.hypot(dx, dy) <= r) this.collectItem(i);
    }
  }

  if (this.onUpdate) this.onUpdate(s);

  if (s.lives <= 0) {
    this.endGame();
  }
};

Game.moveClown = function (s, dt) {
  const c = s.clown;
  if (!c.target) return;
  // Цель исчезла?
  if (c.targetItemId != null && !s.items.some((it) => it.id === c.targetItemId)) {
    c.target = null; c.targetItemId = null; return;
  }
  const speed = clownSpeed(s);
  const dx = c.target.x - c.x, dy = c.target.y - c.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step || dist < 2) {
    c.x = c.target.x; c.y = c.target.y;
    // Достигли — подобрать целевой предмет
    const idx = s.items.findIndex((it) => it.id === c.targetItemId);
    if (idx >= 0) this.collectItem(idx);
    c.target = null; c.targetItemId = null;
  } else {
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
  }
};

Game.removeItem = function (index) {
  const it = this.state.items[index];
  this.state.occupied.delete(it.spawnIndex);
  this.state.items.splice(index, 1);
  if (this.state.clown.targetItemId === it.id) {
    this.state.clown.target = null;
    this.state.clown.targetItemId = null;
  }
};

// Игрок нажал на предмет: назначить цель.
Game.pickItemAt = function (x, y) {
  if (!this.running || this.paused) return;
  const s = this.state;
  const hitR = this.itemDisplaySize() * 0.6;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < s.items.length; i++) {
    const it = s.items[i];
    const d = Math.hypot(it.x - x, it.y - y);
    if (d < hitR && d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return;
  const it = s.items[best];
  const pk = pickupPointFor(it.x, it.y);
  s.clown.target = pk;
  s.clown.targetItemId = it.id;
};

// Подобрать предмет по индексу: применить эффект.
Game.collectItem = function (index) {
  const s = this.state;
  const it = s.items[index];
  this.removeItem(index);
  const def = it.def;

  if (def.kind === 'bad') {
    if (s.shieldActive) {
      s.shieldActive = false;
      s.bonuses.shield = 0;
      return; // щит блокирует весь негатив
    }
    this.applyPenalty(def);
  } else {
    this.applyReward(def);
  }
};

Game.applyReward = function (def) {
  const s = this.state;
  const mult = s.bonuses.x2 > s.now ? 2 : 1;
  if (def.points) s.score += def.points * mult;
  if (def.collect) s.collected += 1;
  if (def.effect === 'candySpeed') {
    s.effects.candySpeed = s.now + CONFIG.durations.candySpeed;
  }
  if (def.random) this.applyGift();
};

Game.applyGift = function () {
  const s = this.state;
  const reward = GIFT_REWARDS[Math.floor(Math.random() * GIFT_REWARDS.length)];
  switch (reward) {
    case 'magnet': s.bonuses.magnet = s.now + CONFIG.durations.magnet; break;
    case 'shield': s.bonuses.shield = s.now + CONFIG.durations.shield; s.shieldActive = true; break;
    case 'life': s.lives = Math.min(CONFIG.maxLives, s.lives + 1); break;
    case 'x2': s.bonuses.x2 = s.now + CONFIG.durations.x2; break;
    case 'points100': {
      const m = s.bonuses.x2 > s.now ? 2 : 1;
      s.score += 100 * m; break;
    }
  }
};

Game.applyPenalty = function (def) {
  const s = this.state;
  if (def.points) s.score += def.points; // отрицательные
  if (s.score < 0) s.score = 0;
  if (def.life) s.lives += def.life;
  switch (def.effect) {
    case 'stun': s.effects.stun = s.now + CONFIG.durations.stun; break;
    case 'ketchupSlow': s.effects.ketchupSlow = s.now + CONFIG.durations.ketchupSlow; break;
    case 'cactusSlow': s.effects.cactusSlow = s.now + CONFIG.durations.cactusSlow; break;
    case 'cracker': s.effects.cracker = s.now + CONFIG.durations.cracker; break;
    case 'clearBonuses':
      s.bonuses.magnet = 0; s.bonuses.x2 = 0; s.bonuses.shield = 0; s.shieldActive = false;
      break;
  }
};

Game.endGame = function () {
  if (!this.running) return;
  this.stop();
  if (this.onGameOver) {
    this.onGameOver({
      score: this.state.score,
      collected: this.state.collected,
      goal: CONFIG.goal,
      elapsedMs: this.state.elapsedMs,
    });
  }
};

// ---- Размеры отрисовки ----
Game.itemDisplaySize = function () {
  // Не крупнее толщины бортика, чтобы предмет помещался на кольце.
  return Math.max(30, Math.min(Arena.innerRx, Arena.innerRy) * 0.20);
};
Game.clownDisplaySize = function () {
  return Math.min(Arena.innerRx, Arena.innerRy) * 0.55;
};

// ---- Рендер ----
Game.render = function () {
  const ctx = this.ctx;
  // Контекст масштабирован на dpr, поэтому рисуем в CSS-пикселях.
  const w = this.viewW, h = this.viewH;
  ctx.clearRect(0, 0, w, h);

  const bg = Assets.images[this.bgKey];
  if (bg) { const r = coverRect(bg, w, h); ctx.drawImage(bg, r.x, r.y, r.w, r.h); }

  const s = this.state;
  const size = this.itemDisplaySize();

  // Предметы (мигают перед исчезновением)
  for (const it of s.items) {
    const img = Assets.images[it.def.sprite];
    const remaining = it.lifeMs - it.age;
    let alpha = 1;
    if (remaining < 1200) {
      alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.now / 120));
    }
    ctx.globalAlpha = alpha;
    if (img) ctx.drawImage(img, it.x - size / 2, it.y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  // Радиус магнита
  if (s.bonuses.magnet > s.now) {
    const r = CONFIG.magnetRadiusFactor * Math.min(Arena.innerRx, Arena.innerRy);
    ctx.save();
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.clown.x, s.clown.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Клоун
  this.drawClown(s);

  if (this.debug) this.drawDebug(s);
};

// Отладка геометрии: эллипс арены, кольцо спавна, точки спавна, точки подбора.
// Подгонять значения в js/geometry.js: ARENA_TUNE (cxF/cyF/innerRxF/innerRyF) и SPAWN_MUL.
Game.drawDebug = function (s) {
  const ctx = this.ctx;
  ctx.save();
  ctx.lineWidth = 2;

  // Граница арены (внутренний эллипс)
  ctx.strokeStyle = 'cyan';
  ctx.beginPath();
  ctx.ellipse(Arena.cx, Arena.cy, Arena.innerRx, Arena.innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Кольцо спавна
  ctx.strokeStyle = 'lime';
  ctx.beginPath();
  ctx.ellipse(Arena.cx, Arena.cy, Arena.innerRx * SPAWN_MUL, Arena.innerRy * SPAWN_MUL, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Точки спавна (зелёные) и их точки подбора на арене (жёлтые)
  for (const p of Arena.spawnPoints) {
    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    const pk = pickupPointFor(p.x, p.y);
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Центр + подпись текущих значений
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.fillText(
    `arena cx=${Arena.cx.toFixed(0)} cy=${Arena.cy.toFixed(0)} rx=${Arena.innerRx.toFixed(0)} ry=${Arena.innerRy.toFixed(0)} spawn×${SPAWN_MUL}`,
    12, this.viewH - 70
  );
  ctx.restore();
};

Game.drawClown = function (s) {
  const ctx = this.ctx;
  const img = Assets.images.clown;
  const cs = this.clownDisplaySize();
  let w = cs, hh = cs;
  if (img) {
    const ratio = img.height / img.width;
    hh = cs * ratio;
  }
  // Щит — ореол
  if (s.shieldActive && s.bonuses.shield > s.now) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,230,120,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(s.clown.x, s.clown.y, w * 0.55, hh * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Оглушение — лёгкое подрагивание
  let ox = 0;
  if (s.effects.stun > s.now) ox = Math.sin(s.now / 40) * 4;
  if (img) {
    ctx.drawImage(img, s.clown.x - w / 2 + ox, s.clown.y - hh / 2, w, hh);
  } else {
    ctx.fillStyle = '#e44';
    ctx.beginPath();
    ctx.arc(s.clown.x, s.clown.y, cs / 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Связывание: загрузка, экраны, ввод, HUD, адаптив.

(function () {
  const $ = (id) => document.getElementById(id);

  const canvas = $('game');
  const screens = {
    loading: $('screen-loading'),
    menu: $('screen-menu'),
    over: $('screen-over'),
    round: $('screen-round'),
  };
  const elRound = $('hud-round');
  const hud = $('hud');
  const elScore = $('hud-score');
  const elCollected = $('hud-collected');
  const elLives = $('hud-lives');
  const elBonuses = $('hud-bonuses');
  const btnSound = $('btn-sound');
  const btnPause = $('btn-pause');
  const pauseOverlay = $('pause-overlay');

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function showScreen(name) {
    for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
    const inGame = name === null;
    hud.classList.toggle('hidden', !inGame);
    canvas.classList.toggle('hidden', false);
  }

  // ---- Адаптив ----
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    Game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Game.viewW = w; Game.viewH = h;

    const isPortrait = h >= w;
    Game.bgKey = isPortrait ? 'bgVertical' : 'bgHorizontal';
    const bg = Assets.images[Game.bgKey];
    const rect = coverRect(bg, w, h);
    computeArena(rect, isPortrait);

    // Если клоун вышел за пределы новой арены — вернуть в центр
    if (Game.state) {
      const c = Game.state.clown;
      const nx = (c.x - Arena.cx) / Arena.innerRx;
      const ny = (c.y - Arena.cy) / Arena.innerRy;
      if (nx * nx + ny * ny > 1) { c.x = Arena.cx; c.y = Arena.cy; c.target = null; c.targetItemId = null; }
    }
  }

  // ---- Ввод ----
  function pointerToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  canvas.addEventListener('pointerdown', (e) => {
    const p = pointerToWorld(e);
    Game.pickItemAt(p.x, p.y);
  });

  // ---- HUD ----
  function fmt(n) { return n.toLocaleString('ru-RU'); }

  function bonusChip(key, label, remainMs) {
    const sec = Math.ceil(remainMs / 1000);
    return `<div class="bonus"><img src="img/${key}.png" alt="${label}"><span>${sec}</span></div>`;
  }

  // Кэш значений: DOM обновляется только при изменении (меньше нагрев устройства).
  let cScore = null, cColl = null, cLives = null, cBonus = null, cRound = null;

  Game.onUpdate = function (s) {
    if (s.score !== cScore) { elScore.textContent = fmt(s.score); cScore = s.score; }
    if (s.collected !== cColl) { elCollected.textContent = `${s.collected} / ${CONFIG.goal}`; cColl = s.collected; }
    if (s.round !== cRound) { elRound.textContent = `Раунд ${s.round}`; cRound = s.round; }
    if (s.lives !== cLives) {
      let hearts = '';
      for (let i = 0; i < CONFIG.maxLives; i++) {
        hearts += `<img class="${i < s.lives ? '' : 'dim'}" src="img/lives.png" alt="">`;
      }
      elLives.innerHTML = hearts;
      cLives = s.lives;
    }
    // бонусы с таймером (обновляем строку только при изменении)
    let chips = '';
    if (s.bonuses.magnet > s.now) chips += bonusChip('magnet', 'Магнит', s.bonuses.magnet - s.now);
    if (s.shieldActive && s.bonuses.shield > s.now) chips += bonusChip('shield', 'Щит', s.bonuses.shield - s.now);
    if (s.bonuses.x2 > s.now) chips += bonusChip('x2', 'x2', s.bonuses.x2 - s.now);
    if (chips !== cBonus) { elBonuses.innerHTML = chips; cBonus = chips; }
  };

  // ---- Легенда предметов (окно паузы) ----
  const LEGEND_GOOD = [
    ['ball', 'Шар: +10 очков'],
    ['tomato', 'Помидор: +20, исчезает быстро'],
    ['flowers', 'Цветы: +30 очков'],
    ['cake', 'Торт: +50 очков'],
    ['bear', 'Мишка: +75, редкий'],
    ['coin', 'Монета: +25, без счётчика'],
    ['candy', 'Леденец: +20, скорость +30%'],
    ['gift', 'Подарок: случайный бонус'],
    ['magnet', 'Магнит: автосбор рядом, 10с'],
    ['shield', 'Щит: блок 1 негатива, 10с'],
    ['x2', 'x2: двойные очки, 15с'],
    ['lives', '+1 жизнь (макс 5)'],
  ];
  const LEGEND_BAD = [
    ['shoe.png', 'Ботинок: −50, оглушение 2с'],
    ['ketchup.png', 'Раздавленный помидор: замедление'],
    ['cactus.png', 'Кактус: −1 жизнь, замедление'],
    ['bomb.png', 'Бомба: −1 жизнь, снимает бонусы'],
    ['brick.png', 'Кирпич: −2 жизни, редкий'],
    ['bang.webp', 'Хлопушка: 5с хаоса'],
  ];
  function legendColumn(title, rows) {
    let html = `<div class="legend-col"><h3>${title}</h3>`;
    for (const [icon, text] of rows) {
      const file = icon.includes('.') ? icon : icon + '.png';
      html += `<div class="legend-row"><img src="img/${file}" alt=""><span>${text}</span></div>`;
    }
    return html + '</div>';
  }
  function buildLegend() {
    $('legend').innerHTML = legendColumn('Полезные', LEGEND_GOOD) + legendColumn('Вредные', LEGEND_BAD);
  }

  // ---- Кнопки ----
  function updateSoundIcon() {
    btnSound.querySelector('img').src = Game.soundOn ? 'img/sound-on.png' : 'img/sound-off.png';
  }
  btnSound.addEventListener('click', () => {
    Game.soundOn = !Game.soundOn;
    if (Game.soundOn) { Sound.init(); Sound.resume(); Sound.play('click'); }
    updateSoundIcon();
  });

  let paused = false;
  btnPause.addEventListener('click', () => {
    if (!Game.running) return;
    paused = !paused;
    Game.setPaused(paused);
    pauseOverlay.classList.toggle('hidden', !paused);
  });
  $('btn-resume').addEventListener('click', () => {
    paused = false; Game.setPaused(false); pauseOverlay.classList.add('hidden');
  });
  $('btn-pause-menu').addEventListener('click', () => {
    paused = false; pauseOverlay.classList.add('hidden');
    Game.stop();
    showScreen('menu');
  });

  function enterGame() {
    paused = false;
    pauseOverlay.classList.add('hidden');
    Sound.init();
    Sound.resume();
    resize();
    showScreen(null);
  }

  function startGame() { enterGame(); Game.start(); }

  $('btn-start').addEventListener('click', () => { Sound.init(); Sound.play('click'); startGame(); });
  $('btn-retry').addEventListener('click', startGame);
  $('btn-restart-round').addEventListener('click', () => { enterGame(); Game.restartRound(); });
  $('btn-next').addEventListener('click', () => { enterGame(); Game.nextRound(); });
  $('btn-round-menu').addEventListener('click', () => { Game.stop(); showScreen('menu'); });
  $('btn-menu').addEventListener('click', () => showScreen('menu'));

  // ---- Раунд пройден ----
  Game.onRoundComplete = function (r) {
    $('round-num').textContent = r.round;
    $('round-score').textContent = fmt(r.score);
    showScreen('round');
  };

  // ---- Game Over ----
  Game.onGameOver = function (r) {
    const totalSec = Math.floor(r.elapsedMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    $('over-round').textContent = r.round;
    $('over-score').textContent = fmt(r.score);
    $('over-collected').textContent = `${r.collected} / ${r.goal}`;
    $('over-time').textContent = `${mm}:${ss}`;
    showScreen('over');
  };

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // Отладка геометрии: клавиша D или ?debug в URL
  if (/[?&]debug/.test(location.search)) Game.debug = true;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
      Game.debug = !Game.debug;
    }
  });

  // ---- Старт ----
  Game.init(canvas);
  showScreen('loading');
  loadAssets().then(() => {
    resize();
    updateSoundIcon();
    buildLegend();
    showScreen('menu');
  });
})();

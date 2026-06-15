// Геометрия манежа: эллипсы арены/бортика и точки спавна.
// Привязаны к реально отрисованному фону (cover), чтобы совпадать с овалом картинки.

const Arena = {
  cx: 0, cy: 0,
  outerRx: 0, outerRy: 0, // внешний эллипс (внешний край бортика)
  innerRx: 0, innerRy: 0, // внутренний эллипс (граница арены)
  spawnPoints: [],        // {x, y, angle} на середине бортика
};

// Доли арены (оранжевый овал) относительно отрисованного фона.
// Измерены по пикселям horizontal.png / vertical.png. inner = граница арены.
const ARENA_TUNE = {
  landscape: { cxF: 0.500, cyF: 0.500, innerRxF: 0.420, innerRyF: 0.375 },
  portrait:  { cxF: 0.500, cyF: 0.500, innerRxF: 0.470, innerRyF: 0.325 },
};
const SPAWN_MUL = 0.90; // точки спавна на бортике, на звёздах у края арены
const OUTER_MUL = 0.60; // внешний край бортика (для масштаба отрисовки)

// Прямоугольник, в который вписан фон по принципу cover.
function coverRect(img, w, h) {
  if (!img) return { x: 0, y: 0, w, h };
  const ir = img.width / img.height;
  const cr = w / h;
  let dw, dh;
  if (cr > ir) { dw = w; dh = w / ir; }
  else { dh = h; dw = h * ir; }
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
}

function computeArena(rect, isPortrait) {
  const t = isPortrait ? ARENA_TUNE.portrait : ARENA_TUNE.landscape;
  Arena.cx = rect.x + rect.w * t.cxF;
  Arena.cy = rect.y + rect.h * t.cyF;
  Arena.innerRx = rect.w * t.innerRxF;
  Arena.innerRy = rect.h * t.innerRyF;
  Arena.outerRx = Arena.innerRx * OUTER_MUL;
  Arena.outerRy = Arena.innerRy * OUTER_MUL;

  const sRx = Arena.innerRx * SPAWN_MUL;
  const sRy = Arena.innerRy * SPAWN_MUL;

  Arena.spawnPoints = [];
  const n = CONFIG.spawnPointsCount;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; // старт сверху
    Arena.spawnPoints.push({
      x: Arena.cx + Math.cos(a) * sRx,
      y: Arena.cy + Math.sin(a) * sRy,
      angle: a,
    });
  }
}

// Куда едет клоун за предметом.
// Предмет внутри арены — едем прямо к нему. Снаружи — до края арены в его сторону.
function pickupPointFor(x, y) {
  const dx = x - Arena.cx;
  const dy = y - Arena.cy;
  const denom = Math.hypot(dx / Arena.innerRx, dy / Arena.innerRy);
  if (denom === 0) return { x: Arena.cx, y: Arena.cy };
  if (denom <= 1) return { x, y }; // предмет внутри арены
  const t = 1 / denom;             // снаружи — пересечение с границей арены
  return { x: Arena.cx + dx * t, y: Arena.cy + dy * t };
}

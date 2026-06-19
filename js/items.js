// Фабрика и пул предметов.

let _itemId = 0;

// Взвешенный выбор типа предмета среди good/bad по текущей вероятности.
function pickItemType(badProbability) {
  const wantBad = Math.random() < badProbability;
  const kind = wantBad ? 'bad' : 'good';
  const pool = Object.entries(ITEMS).filter(([, d]) => d.kind === kind);
  const total = pool.reduce((s, [, d]) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const [key, d] of pool) {
    r -= d.weight;
    if (r <= 0) return key;
  }
  return pool[0][0];
}

// Создать предмет на свободной точке спавна. Возвращает объект или null.
// clown/avoidDist: не спавнить под клоуном (точка, где он только что собрал приз).
function createItem(occupiedSpawnIndices, badProbability, lifetimeMs, clown, avoidDist) {
  const free = [];
  for (let i = 0; i < Arena.spawnPoints.length; i++) {
    if (!occupiedSpawnIndices.has(i)) free.push(i);
  }
  if (free.length === 0) return null;

  // Убрать точки рядом с клоуном; если других нет — оставить как есть.
  let pool = free;
  if (clown && avoidDist) {
    const farFromClown = free.filter((i) => {
      const pk = pickupPointFor(Arena.spawnPoints[i].x, Arena.spawnPoints[i].y);
      return Math.hypot(pk.x - clown.x, pk.y - clown.y) > avoidDist;
    });
    if (farFromClown.length) pool = farFromClown;
  }

  const spawnIndex = pool[Math.floor(Math.random() * pool.length)];
  const pt = Arena.spawnPoints[spawnIndex];
  const typeKey = pickItemType(badProbability);
  const def = ITEMS[typeKey];

  let life = lifetimeMs;
  if (def.fast) life *= CONFIG.tomatoLifetimeFactor;

  return {
    id: ++_itemId,
    type: typeKey,
    def,
    spawnIndex,
    x: pt.x,
    y: pt.y,
    bornAt: 0, // выставляется в игре
    lifeMs: life,
    age: 0,
  };
}

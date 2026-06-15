// Все игровые константы из README.

const CONFIG = {
  startLives: 3,
  maxLives: 5,
  goal: 50, // цель по собранным предметам

  spawnIntervalMs: 1500, // базовый интервал появления
  maxItemsOnField: 8,
  baseLifetimeMs: 6000, // базовое время жизни предмета на поле
  tomatoLifetimeFactor: 0.55, // помидор исчезает быстрее

  spawnPointsCount: 14, // точек спавна на бортике

  goodProbability: 0.75, // стартовая вероятность хорошего предмета
  badProbabilityMax: 0.40,

  // Рост сложности каждые N собранных
  difficultyStep: 20,
  spawnSpeedupPerStep: 0.10, // -10% к интервалу
  lifetimeReductionPerStep: 0.05, // -5% времени жизни
  badIncreasePerStep: 0.02, // +2% к плохим

  clownSpeedFactor: 2.8, // скорость клоуна = factor * (меньшая полуось арены) в секунду
  magnetRadiusFactor: 0.18, // доля от меньшей полуоси арены

  // Длительности эффектов (мс)
  durations: {
    magnet: 10000,
    shield: 10000,
    x2: 15000,
    candySpeed: 5000,
    stun: 2000,
    ketchupSlow: 3000,
    cactusSlow: 3000,
    cracker: 5000,
  },
};

// Описание предметов. kind: 'good' | 'bad'.
// rarity влияет на относительный вес при выборе предмета.
const ITEMS = {
  // Хорошие
  ball:    { kind: 'good', sprite: 'ball',    points: 10,  collect: true,  weight: 14 },
  tomato:  { kind: 'good', sprite: 'tomato',  points: 20,  collect: true,  weight: 12, fast: true },
  cake:    { kind: 'good', sprite: 'cake',    points: 50,  collect: true,  weight: 6 },
  gift:    { kind: 'good', sprite: 'gift',    points: 0,   collect: true,  weight: 6, random: true },
  coin:    { kind: 'good', sprite: 'coin',    points: 25,  collect: false, weight: 10 },
  bear:    { kind: 'good', sprite: 'bear',    points: 75,  collect: true,  weight: 2 }, // редкий
  flowers: { kind: 'good', sprite: 'flowers', points: 30,  collect: true,  weight: 9 },
  candy:   { kind: 'good', sprite: 'candy',   points: 20,  collect: true,  weight: 8, effect: 'candySpeed' },

  // Плохие
  shoe:    { kind: 'bad', sprite: 'shoe',     points: -50, effect: 'stun',        weight: 10 },
  ketchup: { kind: 'bad', sprite: 'ketchup',  points: 0,   effect: 'ketchupSlow', weight: 9 },
  cactus:  { kind: 'bad', sprite: 'cactus',   points: 0,   life: -1, effect: 'cactusSlow', weight: 8 },
  bomb:    { kind: 'bad', sprite: 'bomb',     points: 0,   life: -1, effect: 'clearBonuses', weight: 7 },
  brick:   { kind: 'bad', sprite: 'brick',    points: 0,   life: -2, weight: 2 }, // редкий
  cracker: { kind: 'bad', sprite: 'bang',     points: 0,   effect: 'cracker', weight: 6 },
};

// Возможные награды из подарка.
const GIFT_REWARDS = ['magnet', 'shield', 'life', 'x2', 'points100'];

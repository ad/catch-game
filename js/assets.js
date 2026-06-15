// Предзагрузка графики.

const ASSET_FILES = {
  bgHorizontal: 'img/horizontal.png',
  bgVertical: 'img/vertical.png',
  clown: 'img/clown.png',

  ball: 'img/ball.png',
  tomato: 'img/tomato.png',
  cake: 'img/cake.png',
  gift: 'img/gift.png',
  coin: 'img/coin.png',
  bear: 'img/bear.png',
  flowers: 'img/flowers.png',
  candy: 'img/candy.png',

  shoe: 'img/shoe.png',
  ketchup: 'img/ketchup.png',
  cactus: 'img/cactus.png',
  bomb: 'img/bomb.png',
  brick: 'img/brick.png',
  bang: 'img/bang.webp',

  magnet: 'img/magnet.png',
  shield: 'img/shield.png',
  lives: 'img/lives.png',
  x2: 'img/x2.png',
  points: 'img/points.png',
  progress: 'img/progress.png',
  pause: 'img/pause.png',
  soundOn: 'img/sound-on.png',
  soundOff: 'img/sound-off.png',
};

const Assets = { images: {} };

function loadAssets() {
  const entries = Object.entries(ASSET_FILES);
  return Promise.all(
    entries.map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { Assets.images[key] = img; resolve(); };
      img.onerror = () => { console.warn('Не удалось загрузить', src); resolve(); };
      img.src = src;
    }))
  );
}

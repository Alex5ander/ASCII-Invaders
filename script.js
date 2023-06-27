/** @type {HTMLPreElement} */
const game = document.getElementById('game');
const w = 80;
const h = 45;
/** @type {HTMLButtonElement} */
const leftButton = document.getElementById('leftButton');
/** @type {HTMLButtonElement} */
const rightButton = document.getElementById('rightButton');
/** @type {HTMLButtonElement} */
const fireButton = document.getElementById('fireButton');

let keys = {};

let bg = ' ';
let map = [];
let MAIN = 0;
let PREPARED = 1;
let START = 2;
let END = 3;
let ENEMY = 0;
let BULLET = 1;
let ENEMYBULLET = 2;
let EXPLOSION = 3;

let state = MAIN;
let score = 0;

let objs = [];

let enemyTime = 250;

let direction = 1;

let player = {};

const line = ''.padEnd(w, '_');

let level = 0;

const sprites = {
  PLAYER: [
    [
      ['_/^\\_', '|###|'],
      ['_/^\\_', '|^^^|'],
    ],
    [
      ['_/^\\', '/###/'],
      ['_/^\\', '/^^^/'],
    ],
    [
      ['_/^\\_', '\\###\\'],
      ['_/^\\_', '\\^^^\\'],
    ],
  ],
  BULLET: [[['|'], ['|']]],
  ENEMY: [
    [
      ['\\-/', '<+>', '\\|/'],
      ['\\-/', '<+>', '/|\\'],
    ],
  ],
  EXPLOSION: [[['\\ /', '- -', '/ \\']]],
  COLLISION: [[['-']]],
};

class GameObject {
  constructor(x, y, type, sprites) {
    this.x = x;
    this.y = y;
    this.w = sprites[0][0][0].length;
    this.h = sprites[0][0].length;
    this.sprites = sprites;
    this.type = type;
    this.remove = false;
    this.frame = 0;
    this.sprite = 0;
  }
  draw() {
    render(this.x, this.y, this.sprites[this.sprite][this.frame]);
  }
}

class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y, EXPLOSION, sprites.EXPLOSION);
    this.createdAt = Date.now();
  }
  update() {
    if (Date.now() - this.createdAt >= 300) {
      this.remove = true;
    }
  }
}

class Collision extends GameObject {
  constructor(x, y) {
    super(x, y, EXPLOSION, sprites.COLLISION);
    this.createdAt = Date.now();
  }
  update() {
    if (Date.now() - this.createdAt >= 300) {
      this.remove = true;
    }
  }
}

class Bullet extends GameObject {
  constructor(x, y, direction, type) {
    super(x, y, type, sprites.BULLET);
    this.direction = direction;
  }
  update() {
    this.y += this.direction;
    this.frame = Date.now() % 300 > 150 ? 1 : 0;
    if (collide(this, player) && this.type === ENEMYBULLET) {
      player.life -= 1;
      this.remove = true;
      if (player.life === 0) {
        objs.push(new Explosion(player.x, player.y));
      } else {
        objs.push(new Collision(this.x, this.y));
      }
    }

    objs
      .filter((e) => e.type === ENEMY)
      .forEach((enemy) => {
        if (
          collide(this, enemy) &&
          this.type === BULLET &&
          this.remove == false
        ) {
          enemy.isHit(this);
          this.remove = true;
          score += 1;
          objs.push(
            new Explosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2)
          );
        }
      });

    if (this.y < 0 || this.y > h - 4) {
      this.remove = true;
      objs.push(new Collision(this.x, this.y));
    }
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y, ENEMY, sprites.ENEMY);
    this.lastTime = 0;
    this.life = 1;
  }
  isHit() {
    this.life -= 1;
    if (this.life === 0) {
      this.remove = true;
    }
  }
  update() {
    this.frame = Date.now() % 1000 > 500 ? 1 : 0;
    if (Date.now() - this.lastTime > enemyTime) {
      this.x += direction;
      this.lastTime = Date.now();
      if (
        Math.floor(Math.random() * 100) === 99 &&
        objs.filter((e) => e.type === ENEMYBULLET).length < 2
      ) {
        this.fire();
      }
    }
  }
  fire() {
    objs.push(
      new Bullet(
        this.x + Math.floor(this.w / 2),
        this.y + this.h,
        1,
        ENEMYBULLET
      )
    );
  }
}

class Player extends GameObject {
  constructor(x, y) {
    super(x, y, -1, sprites.PLAYER);
    this.life = 3;
  }
  moveX(direction) {
    if (this.x > 1 && direction < 0) {
      this.x -= 1;
      this.sprite = 2;
    }

    if (this.x + this.w < w && direction > 0) {
      this.x += 1;
      this.sprite = 1;
    }
  }
  fire() {
    if (!objs.find((e) => e.type === BULLET)) {
      objs.push(
        new Bullet(this.x + Math.floor(this.w / 2), this.y, -1, BULLET)
      );
    }
  }
  update() {
    this.sprite = 0;
    this.frame = Date.now() % 500 > 250 ? 1 : 0;
    if (keys['ArrowLeft']) {
      this.moveX(-1);
    }

    if (keys['ArrowRight']) {
      this.moveX(1);
    }

    if (keys[' ']) {
      this.fire();
    }
  }
  draw() {
    render(this.x, this.y, this.sprites[this.sprite][this.frame]);
    for (let i = 0; i < this.life; i++) {
      render(i * (this.w + 1), h - this.h, this.sprites[0][0]);
    }
  }
}

const stars = Array(w * h)
  .fill('')
  .map(() => (Math.random() * 100 > 94 ? '.' : ' '));

const render = (x, y, sprite) => {
  sprite.forEach((e, row) => {
    e.split('').forEach((letter, col) => {
      map[Math.trunc(x + col) + Math.trunc(y + row) * w] = letter;
    });
  });
};

const collide = (a, b) =>
  a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

function init() {
  level = -1;
  objs = [];
  keys = {};
  score = 0;
  player = new Player(0, 0);
  nextWave();
}

function nextWave() {
  player.x = w / 2 - (sprites.PLAYER[0][0].length - 1) / 2;
  player.y = h - sprites.PLAYER[0].length * 2 - 1;
  level += 1;
  direction = 1;
  const enemyPositions = [Array(30).fill(1)];

  enemyPositions[level % enemyPositions.length].forEach((e, i) => {
    if (e !== 0) {
      const cols = 10;
      const y = Math.floor(i / cols);
      const enemy = new Enemy(0, y);
      const x = enemy.w * (cols / 2) - (i % cols);
      enemy.x = x;
      enemy.x *= enemy.w + 1;
      enemy.y *= enemy.h + 1;
      objs.push(enemy);
    }
  });
  state = PREPARED;
  setTimeout(() => {
    state = START;
  }, 3000);
}

function draw() {
  map = Array(w * h)
    .fill(' ')
    .map((_, i) => stars[i]);

  if (Date.now() % 60 <= 30) {
    const l = stars.splice(w * h - w, w);
    stars.unshift(...l);
  }
  if (state === MAIN) {
    const t = Date.now() % 1000 > 500 ? 'CLICK ON THE SCREEN TO PLAY' : '';
    render(w / 2 - t.length / 2, h / 2, [t]);
  } else {
    render(0, h - player.h - 1, [line]);

    player.draw();

    objs.forEach((obj) => {
      obj.draw();
    });

    render(0, 0, [`Score: ${score}`]);

    const levelText = `level: ${level + 1}`;
    render(w - levelText.length, 0, [levelText]);

    if (state === PREPARED) {
      const text = Date.now() % 1000 > 500 ? 'READY' : '';
      render(w / 2 - 2, h / 2, [text]);
    } else if (state === END) {
      render(w / 2 - 15, h / 2, [
        '           GAME OVER           ',
        '       THANKS FOR PLAYING      ',
        'CLICK ON THE SCREEN TO CONTINUE',
      ]);
    }
  }

  const string = map.map((e, i) => (i % w == w - 1 ? e + '\n' : e)).join('');

  if (string !== game.innerText) {
    game.innerText = string;
  }
}

function update() {
  if (state === START) {
    const enemies = objs.filter((e) => e.type === ENEMY);
    enemyTime = 40 + enemies.length;
    if (enemies.find((e) => e.y + e.h > player.y) || player.life === 0) {
      state = END;
    }

    if (enemies.length === 0 && objs.length === 0) {
      nextWave();
    }

    player.update();

    objs.forEach((obj) => {
      obj.update();
    });

    if (
      enemies.some(
        (e) => e.x + e.w + 1 + direction > w - 1 || e.x + direction < 0
      )
    ) {
      direction = -direction;
      enemies.forEach((e) => {
        if (e.type === ENEMY) {
          e.y += 1;
        }
      });
    }

    objs = objs.filter((b) => !b.remove);
  }
}

function loop() {
  const lastTime = Date.now();
  update();
  draw();
  const elapsedTime = Date.now() - lastTime;
  window.setTimeout(loop, 1000 / 30 - elapsedTime);
}

loop();

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

game.addEventListener('mousedown', (_) => {
  if (state === MAIN) {
    init();
  } else if (state === END) {
    state = MAIN;
  }
});

leftButton.ontouchstart = () => (keys['ArrowLeft'] = true);
leftButton.ontouchend = () => (keys['ArrowLeft'] = false);

rightButton.ontouchstart = () => (keys['ArrowRight'] = true);
rightButton.ontouchend = () => (keys['ArrowRight'] = false);

fireButton.ontouchstart = () => (keys[' '] = true);
fireButton.ontouchend = () => (keys[' '] = false);

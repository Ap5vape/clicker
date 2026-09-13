const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// ВСТАВЬ СЮДА ССЫЛКУ ИЗ GOOGLE APPS SCRIPT (ЕСЛИ СДЕЛАЛ ТАБЛИЦУ):
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxrYOz4HwWfM_CPBC055FIlTqUE3FZI_ZmntLO5BNLPhWIYbQmY9uzFIrrMP9cjwMAW/exec";

// Состояние игрока
let state = {
  clicks: 0,
  primeCoins: 0,
  equippedTank: 'berserker',
  unlockedTanks: ['berserker'],
  coupons: []
};

// Справочник баков
const TANKS = {
  berserker: {
    id: 'berserker',
    name: 'Berserker V2',
    image: 'assets/berserker_v2.png',
    price: 0,
    lucky2: 0,
    lucky3: 0,
    desc: 'MTL классика. Базовый обдув'
  },
  zeus: {
    id: 'zeus',
    name: 'Zeus Sub-Ohm / RTA',
    image: 'assets/zeus.png',
    price: 1000,
    lucky2: 0.15,
    lucky3: 0,
    desc: 'Верхний обдув, 15% шанс Lucky x2'
  },
  bishop: {
    id: 'bishop',
    name: 'Bishop MTL RTA',
    image: 'assets/bishop.png',
    price: 2000,
    lucky2: 0.25,
    lucky3: 0,
    desc: 'Тихий обдув, 25% шанс Lucky x2'
  },
  siren: {
    id: 'siren',
    name: 'Siren 2 GTA',
    image: 'assets/siren.png',
    price: 5000,
    lucky2: 0.35,
    lucky3: 0.05,
    desc: 'GTA-система, 35% x2, 5% x3'
  },
  fev: {
    id: 'fev',
    name: 'Flash-e-Vapor (FeV)',
    image: 'assets/fev.png',
    price: 10000,
    lucky2: 0.40,
    lucky3: 0.15,
    desc: 'ТХ и легендарный обдув, 40% x2, 15% x3'
  },
  paravozz: {
    id: 'paravozz',
    name: 'Paravozz Genesis',
    image: 'assets/paravozz.png',
    price: 15000,
    lucky2: 0.50,
    lucky3: 0.30,
    desc: 'Генезис на сетке: 50% шанс x2, 30% шанс x3'
  }
};

// Сетка рангов
const RANKS = [
  { min: 0, max: 1000, title: 'Респектовый' },
  { min: 1000, max: 5000, title: 'Локал бой' },
  { min: 5000, max: 10000, title: 'Вейпер' },
  { min: 10000, max: 20000, title: 'Тру вейпер' },
  { min: 20000, max: 30000, title: 'PrimeВейпер' },
  { min: 30000, max: Infinity, title: 'Легенда пара' }
];

// Кейсы: купон теперь строго 10% скидки
const CASES = [
  { id: 'case_500', title: 'Бюджетный кейс', cost: 500, minCoins: 50, maxCoins: 200, couponChance: 0.015 },
  { id: 'case_1000', title: 'Стандартный кейс', cost: 1000, minCoins: 200, maxCoins: 600, couponChance: 0.02 },
  { id: 'case_5000', title: 'Опытный кейс', cost: 5000, minCoins: 1200, maxCoins: 3500, couponChance: 0.035 },
  { id: 'case_10000', title: 'Prime Кейс', cost: 10000, minCoins: 3000, maxCoins: 10000, couponChance: 0.05 }
];

// 1. Физика пара (Canvas)
const canvas = document.getElementById('steam-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class SteamParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 50;
    this.y = y;
    this.radius = 15 + Math.random() * 12;
    this.vx = (Math.random() - 0.5) * 1.8;
    this.vy = -2.5 - Math.random() * 2.8;
    this.alpha = 0.5;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.radius += 0.45;
    this.alpha -= 0.011;
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 235, 245, ${Math.max(this.alpha, 0)})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
    ctx.restore();
  }
}

function renderSteam() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }
  requestAnimationFrame(renderSteam);
}
renderSteam();

function spawnSteam() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (let i = 0; i < 5; i++) {
    particles.push(new SteamParticle(cx, cy));
  }
}

// 2. Обработка клика
const tankTarget = document.getElementById('tank-target');
tankTarget.addEventListener('pointerdown', (e) => {
  const current = TANKS[state.equippedTank];
  let multiplier = 1;
  let luckyClass = '';

  const roll = Math.random();
  if (current.lucky3 > 0 && roll < current.lucky3) {
    multiplier = 3;
    luckyClass = 'lucky-3';
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  } else if (current.lucky2 > 0 && roll < (current.lucky3 + current.lucky2)) {
    multiplier = 2;
    luckyClass = 'lucky-2';
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
  } else {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  }

  state.clicks += multiplier;
  spawnSteam();
  showTapEffect(e.clientX, e.clientY, multiplier, luckyClass);
  updateUI();
  scheduleSave();
});

function showTapEffect(x, y, mult, luckyClass) {
  const el = document.createElement('div');
  el.className = `tap-particle ${luckyClass}`;
  el.innerText = mult > 1 ? `LUCKY x${mult}!` : `+${mult}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

// 3. Обновление интерфейса и шкалы прогресса
function updateUI() {
  document.getElementById('clicks-display').innerText = state.clicks.toLocaleString();
  document.getElementById('coins-display').innerText = state.primeCoins.toLocaleString();

  // Расчёт ранга и шкалы
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (state.clicks >= RANKS[i].min && state.clicks < RANKS[i].max) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null;
      break;
    }
  }

  document.getElementById('player-status').innerText = currentRank.title;

  if (nextRank) {
    const needInLevel = nextRank.min - currentRank.min;
    const currentInLevel = state.clicks - currentRank.min;
    const percent = Math.min(Math.max((currentInLevel / needInLevel) * 100, 0), 100);

    document.getElementById('level-progress-bar').style.width = `${percent}%`;
    document.getElementById('level-progress-text').innerText = 
      `${state.clicks} / ${nextRank.min} до ${nextRank.title}`;
  } else {
    document.getElementById('level-progress-bar').style.width = '100%';
    document.getElementById('level-progress-text').innerText = 'Максимальный уровень';
  }

  // Обновление текущего бака на экране
  const current = TANKS[state.equippedTank];
  document.getElementById('current-tank-name').innerText = current.name;
  document.getElementById('tank-perk').innerText = current.desc;

  const tankImg = document.getElementById('tank-image');
  if (!tankImg.src.endsWith(current.image)) {
    tankImg.style.opacity = '0';
    setTimeout(() => {
      tankImg.src = current.image;
      tankImg.style.opacity = '1';
    }, 150);
  }

  renderTanks();
  renderCases();
  renderCoupons();
}

// 4. Отрисовка магазинов
function renderTanks() {
  const container = document.getElementById('tanks-list');
  container.innerHTML = '';

  Object.values(TANKS).forEach(t => {
    const isUnlocked = state.unlockedTanks.includes(t.id);
    const isEquipped = state.equippedTank === t.id;

    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${t.name}</strong>
        <p style="font-size:0.8rem; color:#8b92a5;">${t.desc}</p>
        <span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">
          ${isUnlocked ? 'В коллекции' : `${t.price.toLocaleString()} PC`}
        </span>
      </div>
      <div>
        ${isEquipped 
          ? '<button class="item-btn equipped">Выбран</button>'
          : isUnlocked 
            ? `<button class="item-btn" onclick="equipTank('${t.id}')">Надеть</button>`
            : `<button class="item-btn" ${state.primeCoins < t.price ? 'disabled' : ''} onclick="buyTank('${t.id}')">Купить</button>`
        }
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCases() {
  const container = document.getElementById('cases-list');
  container.innerHTML = '';

  CASES.forEach(c => {
    const canAfford = state.clicks >= c.cost;
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${c.title}</strong>
        <p style="font-size:0.8rem; color:#8b92a5;">${c.minCoins}-${c.maxCoins} PC | Купон 10% (${(c.couponChance * 100).toFixed(1)}%)</p>
        <span style="font-size:0.85rem; color:#ff6b00; font-weight:700;">${c.cost.toLocaleString()} кликов</span>
      </div>
      <button class="item-btn" ${!canAfford ? 'disabled' : ''} onclick="openCase('${c.id}')">Открыть</button>
    `;
    container.appendChild(div);
  });
}

function renderCoupons() {
  const container = document.getElementById('coupons-container');
  if (!state.coupons || state.coupons.length === 0) {
    container.innerHTML = '<p class="empty-text">Вы пока не выбили скидочные купоны.</p>';
    return;
  }
  container.innerHTML = '';
  state.coupons.forEach(cp => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>Скидка ${cp.discount} на кейс АКБ</strong>
        <p style="font-size:0.9rem; color:#ffaa00; font-family:monospace; margin-top:4px; font-weight:700;">${cp.code}</p>
      </div>
    `;
    container.appendChild(div);
  });
}

// 5. Действия покупки и кейсов
window.buyTank = function(id) {
  const tank = TANKS[id];
  if (state.primeCoins >= tank.price && !state.unlockedTanks.includes(id)) {
    state.primeCoins -= tank.price;
    state.unlockedTanks.push(id);
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI();
    forceSave();
  }
};

window.equipTank = function(id) {
  if (state.unlockedTanks.includes(id)) {
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateUI();
    forceSave();
  }
};

window.openCase = function(id) {
  const c = CASES.find(x => x.id === id);
  if (state.clicks < c.cost) return;

  state.clicks -= c.cost;
  const isCoupon = Math.random() < c.couponChance;

  let modalTitle = '';
  let modalDesc = '';
  let modalIcon = '';

  if (isCoupon) {
    const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    if (!state.coupons) state.coupons = [];
    state.coupons.push({ discount: '10%', code });
    modalTitle = 'СУПЕР ДРОП!';
    modalIcon = '🔋';
    modalDesc = `Вам выпал промокод на скидку 10% на чехол для АКБ!\nКод: ${code}`;
  } else {
    const wonCoins = Math.floor(Math.random() * (c.maxCoins - c.minCoins + 1)) + c.minCoins;
    state.primeCoins += wonCoins;
    modalTitle = 'PrimeCoins!';
    modalIcon = '🪙';
    modalDesc = `Вы получили +${wonCoins} PrimeCoins на покупку девайсов.`;
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showModal(modalTitle, modalIcon, modalDesc);
  updateUI();
  forceSave();
};

function showModal(title, icon, desc) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-desc').innerText = desc;
  document.getElementById('drop-modal').classList.remove('hidden');
}
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('drop-modal').classList.add('hidden');
});

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// 6. Надёжная синхронизация (localStorage + CloudStorage + Google Таблица)
let saveTimeout = null;

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(forceSave, 1000);
}

function forceSave() {
  const json = JSON.stringify(state);
  localStorage.setItem('prime_save_v2', json);

  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem('prime_save_v2', json);
  }

  // Отправка в Google Таблицу
  if (GOOGLE_SHEET_URL) {
    const payload = {
      tgId: tg?.initDataUnsafe?.user?.id || "local_test",
      username: tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || "Неизвестный",
      clicks: state.clicks,
      primeCoins: state.primeCoins,
      equippedTank: state.equippedTank,
      coupons: state.coupons
    };

    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
}

window.addEventListener('beforeunload', forceSave);

// Загрузка сейвов
function loadState() {
  const local = localStorage.getItem('prime_save_v2') || localStorage.getItem('prime_save');
  if (local) {
    try {
      state = Object.assign(state, JSON.parse(local));
    } catch (e) {}
  }

  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem('prime_save_v2', (err, val) => {
      if (!err && val) {
        try {
          state = Object.assign(state, JSON.parse(val));
          updateUI();
        } catch (e) {}
      }
    });
  }
  updateUI();
}

loadState();

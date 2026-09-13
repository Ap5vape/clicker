const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// 1. Игровое состояние
let state = {
  clicks: 0,
  primeCoins: 0,
  equippedTank: 'berserker',
  unlockedTanks: ['berserker'],
  coupons: []
};

// 2. Справочник баков
const TANKS = {
  berserker: {
    id: 'berserker',
    name: 'Berserker V2',
    price: 0,
    lucky2: 0,
    lucky3: 0,
    desc: 'MTL классика. Базовый обдув'
  },
  zeus: {
    id: 'zeus',
    name: 'Zeus Sub-Ohm / RTA',
    price: 1000,
    lucky2: 0.15,
    lucky3: 0.00,
    desc: 'Верхний обдув, 15% шанс Lucky x2'
  },
  bishop: {
    id: 'bishop',
    name: 'Bishop MTL RTA',
    price: 2000,
    lucky2: 0.25,
    lucky3: 0.00,
    desc: 'Тихая затяжка, 25% шанс Lucky x2'
  },
  siren: {
    id: 'siren',
    name: 'Siren 2 GTA',
    price: 5000,
    lucky2: 0.35,
    lucky3: 0.05,
    desc: 'GTA-система, 35% x2, 5% x3'
  },
  fev: {
    id: 'fev',
    name: 'Flash-e-Vapor (FeV)',
    price: 10000,
    lucky2: 0.40,
    lucky3: 0.15,
    desc: 'Неубиваемый ТХ, 40% x2, 15% x3'
  },
  paravozz: {
    id: 'paravozz',
    name: 'Paravozz Genesis',
    price: 15000,
    lucky2: 0.50,
    lucky3: 0.30,
    desc: 'Сетка. 50% шанс x2, 30% шанс x3'
  }
};

// 3. Справочник кейсов
const CASES = [
  {
    id: 'case_500',
    title: 'Бюджетный кейс',
    cost: 500,
    minCoins: 50,
    maxCoins: 200,
    couponChance: 0.01,
    couponDiscount: '5%'
  },
  {
    id: 'case_1000',
    title: 'Стандартный кейс',
    cost: 1000,
    minCoins: 200,
    maxCoins: 600,
    couponChance: 0.015,
    couponDiscount: '10%'
  },
  {
    id: 'case_5000',
    title: 'Опытный кейс',
    cost: 5000,
    minCoins: 1200,
    maxCoins: 3500,
    couponChance: 0.025,
    couponDiscount: '15%'
  },
  {
    id: 'case_10000',
    title: 'Prime Кейс',
    cost: 10000,
    minCoins: 3000,
    maxCoins: 10000,
    couponChance: 0.04,
    couponDiscount: 'Бесплатный кейс АКБ'
  }
];

// 4. Определение статуса по кликам
function getStatusTitle(clicks) {
  if (clicks < 1000) return 'Респектовый';
  if (clicks < 5000) return 'Локал бой';
  if (clicks < 10000) return 'Вейпер';
  if (clicks < 20000) return 'Тру вейпер';
  if (clicks < 30000) return 'PrimeВейпер';
  return 'Легенда пара';
}

// 5. Холст пара (Canvas Particle System)
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
    this.x = x + (Math.random() - 0.5) * 40;
    this.y = y;
    this.radius = 12 + Math.random() * 10;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -2 - Math.random() * 2.5;
    this.alpha = 0.45;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.radius += 0.4;
    this.alpha -= 0.009;
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 230, 245, ${Math.max(this.alpha, 0)})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
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
  for (let i = 0; i < 4; i++) {
    particles.push(new SteamParticle(cx, cy));
  }
}

// 6. Логика клика и Lucky-множителей
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
  showTapFeedback(e.clientX, e.clientY, multiplier, luckyClass);
  updateUI();
  saveState();
});

function showTapFeedback(x, y, mult, luckyClass) {
  const el = document.createElement('div');
  el.className = `tap-particle ${luckyClass}`;
  el.innerText = mult > 1 ? `LUCKY x${mult}!` : `+${mult}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

// 7. Рендер списков баков и кейсов
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
        <p style="font-size:0.8rem; color:#8e95a5;">${t.desc}</p>
        <span style="font-size:0.8rem; color:#ffaa00;">${isUnlocked ? 'В коллекции' : `${t.price} PC`}</span>
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
        <p style="font-size:0.8rem; color:#8e95a5;">${c.minCoins}-${c.maxCoins} PC | Шанс купона ${c.couponChance * 100}%</p>
        <span style="font-size:0.85rem; color:#ff6b00;">Цена: ${c.cost} кликов</span>
      </div>
      <button class="item-btn" ${!canAfford ? 'disabled' : ''} onclick="openCase('${c.id}')">Открыть</button>
    `;
    container.appendChild(div);
  });
}

function renderCoupons() {
  const container = document.getElementById('coupons-container');
  if (state.coupons.length === 0) {
    container.innerHTML = '<p class="empty-text">Вы пока не выбили купоны на кейсы АКБ.</p>';
    return;
  }
  container.innerHTML = '';
  state.coupons.forEach(cp => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${cp.discount} на кейс АКБ</strong>
        <p style="font-size:0.85rem; color:#ffaa00; font-family:monospace; margin-top:4px;">Промокод: ${cp.code}</p>
      </div>
    `;
    container.appendChild(div);
  });
}

// 8. Покупка баков и открытие кейсов
window.buyTank = function(id) {
  const tank = TANKS[id];
  if (state.primeCoins >= tank.price && !state.unlockedTanks.includes(id)) {
    state.primeCoins -= tank.price;
    state.unlockedTanks.push(id);
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI();
    saveState();
  }
};

window.equipTank = function(id) {
  if (state.unlockedTanks.includes(id)) {
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateUI();
    saveState();
  }
};

window.openCase = function(id) {
  const c = CASES.find(x => x.id === id);
  if (state.clicks < c.cost) return;

  state.clicks -= c.cost;

  // Расчет дропа
  const isCoupon = Math.random() < c.couponChance;
  let modalTitle = '';
  let modalDesc = '';
  let modalIcon = '';

  if (isCoupon) {
    const code = `PRIME-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    state.coupons.push({ discount: c.couponDiscount, code });
    modalTitle = 'СУПЕР ДРОП!';
    modalIcon = '🔋';
    modalDesc = `Вам выпал промокод: ${c.couponDiscount} на кейс для АКБ!\nКод: ${code}`;
  } else {
    const wonCoins = Math.floor(Math.random() * (c.maxCoins - c.minCoins + 1)) + c.minCoins;
    state.primeCoins += wonCoins;
    modalTitle = 'Выпали PrimeCoins!';
    modalIcon = '🪙';
    modalDesc = `Получено +${wonCoins} PrimeCoins на покупку девайсов.`;
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showModal(modalTitle, modalIcon, modalDesc);
  updateUI();
  saveState();
};

// 9. Модалка
function showModal(title, icon, desc) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-desc').innerText = desc;
  document.getElementById('drop-modal').classList.remove('hidden');
}
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('drop-modal').classList.add('hidden');
});

// 10. Обновление интерфейса
function updateUI() {
  document.getElementById('clicks-display').innerText = state.clicks.toLocaleString();
  document.getElementById('coins-display').innerText = state.primeCoins.toLocaleString();
  document.getElementById('player-status').innerText = getStatusTitle(state.clicks);

  const current = TANKS[state.equippedTank];
  document.getElementById('current-tank-name').innerText = current.name;
  document.getElementById('tank-perk').innerText = current.desc;

  renderTanks();
  renderCases();
  renderCoupons();
}

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// 11. Бесплатное сохранение в Telegram CloudStorage
function saveState() {
  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem('prime_save', JSON.stringify(state));
  } else {
    localStorage.setItem('prime_save', JSON.stringify(state));
  }
}

function loadState() {
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem('prime_save', (err, val) => {
      if (!err && val) {
        try { state = JSON.parse(val); } catch (e) {}
      }
      updateUI();
    });
  } else {
    const val = localStorage.getItem('prime_save');
    if (val) {
      try { state = JSON.parse(val); } catch (e) {}
    }
    updateUI();
  }
}

loadState();
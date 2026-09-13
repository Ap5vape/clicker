const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// 1. Конфигурация
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwT9o46pqdgTHtJjGKikuaomwG8G1C-bZAzCDuL4F4fyb102BqM-TNZxSIQRuezjPlG/exec";
const PRIMARY_KEY = 'prime_save_stable';

// Бот и каналы
const BOT_TOKEN = "8978900644:AAH_vRgnhG0JSTl_pp1TXfx-eme8xF2_OS4";
const CHANNEL_REVIEW = "@PrimeVapor_Review";
const CHANNEL_MAIN = "@Prime_Vapor";

// Состояние игрока
let state = {
  clicks: 0,
  primeCoins: 0,
  equippedTank: 'berserker',
  unlockedTanks: ['berserker'],
  coupons: [],
  completedTasks: []
};

// Справочник баков
const TANKS = {
  berserker: { id: 'berserker', name: 'Berserker V2', image: 'assets/berserker_v2.png', price: 0, lucky2: 0, lucky3: 0, desc: 'MTL классика. Базовый обдув' },
  zeus: { id: 'zeus', name: 'Zeus Sub-Ohm / RTA', image: 'assets/zeus.png', price: 1000, lucky2: 0.15, lucky3: 0.00, desc: 'Верхний обдув, 15% шанс Lucky x2' },
  bishop: { id: 'bishop', name: 'Bishop MTL RTA', image: 'assets/bishop.png', price: 2000, lucky2: 0.25, lucky3: 0.00, desc: 'Тихий обдув, 25% шанс Lucky x2' },
  siren: { id: 'siren', name: 'Siren 2 GTA', image: 'assets/siren.png', price: 5000, lucky2: 0.35, lucky3: 0.05, desc: 'GTA-система, 35% x2, 5% x3' },
  fev: { id: 'fev', name: 'Flash-e-Vapor (FeV)', image: 'assets/fev.png', price: 10000, lucky2: 0.40, lucky3: 0.15, desc: 'ТХ и легендарный обдув, 40% x2, 15% x3' },
  paravozz: { id: 'paravozz', name: 'Paravozz Genesis', image: 'assets/paravozz.png', price: 15000, lucky2: 0.50, lucky3: 0.30, desc: 'Генезис на сетке: 50% шанс x2, 30% шанс x3' }
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

// Справочник кейсов
const CASES = [
  { id: 'case_500', title: 'Бюджетный кейс', cost: 500, minCoins: 50, maxCoins: 200, couponChance: 0.015 },
  { id: 'case_1000', title: 'Стандартный кейс', cost: 1000, minCoins: 200, maxCoins: 600, couponChance: 0.02 },
  { id: 'case_5000', title: 'Опытный кейс', cost: 5000, minCoins: 1200, maxCoins: 3500, couponChance: 0.035 },
  { id: 'case_10000', title: 'Prime Кейс', cost: 10000, minCoins: 3000, maxCoins: 10000, couponChance: 0.05 }
];

// Определение пользователя
function getTelegramUser() {
  let user = tg?.initDataUnsafe?.user;

  if (!user && tg?.initData) {
    try {
      const params = new URLSearchParams(tg.initData);
      const userRaw = params.get('user');
      if (userRaw) user = JSON.parse(userRaw);
    } catch (e) {}
  }

  if (user && user.id) {
    return {
      id: String(user.id),
      name: user.username ? `@${user.username}` : (user.first_name || "Игрок")
    };
  }

  let guestId = localStorage.getItem('prime_guest_id');
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('prime_guest_id', guestId);
  }

  return {
    id: guestId,
    name: "Гость (" + guestId.slice(-4) + ")"
  };
}

// Пар (Canvas)
const canvas = document.getElementById('steam-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
  if (!canvas || !canvas.parentElement) return;
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
    if (!ctx) return;
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
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
  }
  requestAnimationFrame(renderSteam);
}
renderSteam();

function spawnSteam() {
  if (!canvas) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (let i = 0; i < 5; i++) {
    particles.push(new SteamParticle(cx, cy));
  }
}

// Клик по баку
const tankTarget = document.getElementById('tank-target');
if (tankTarget) {
  tankTarget.addEventListener('pointerdown', (e) => {
    const current = TANKS[state.equippedTank] || TANKS.berserker;
    let mult = 1;
    let luckyClass = '';

    const roll = Math.random();
    if (current.lucky3 > 0 && roll < current.lucky3) {
      mult = 3;
      luckyClass = 'lucky-3';
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else if (current.lucky2 > 0 && roll < (current.lucky3 + current.lucky2)) {
      mult = 2;
      luckyClass = 'lucky-2';
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    } else {
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }

    state.clicks += mult;
    spawnSteam();
    showTapEffect(e.clientX, e.clientY, mult, luckyClass);
    updateUI();
    scheduleSave();
  });
}

function showTapEffect(x, y, mult, luckyClass) {
  const el = document.createElement('div');
  el.className = `tap-particle ${luckyClass}`;
  el.innerText = mult > 1 ? `LUCKY x${mult}!` : `+${mult}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

// Обновление интерфейса
function updateUI() {
  const clicksEl = document.getElementById('clicks-display');
  const coinsEl = document.getElementById('coins-display');
  if (clicksEl) clicksEl.innerText = Number(state.clicks || 0).toLocaleString();
  if (coinsEl) coinsEl.innerText = Number(state.primeCoins || 0).toLocaleString();

  // Ранг
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (state.clicks >= RANKS[i].min && state.clicks < RANKS[i].max) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null;
      break;
    }
  }

  const statusEl = document.getElementById('player-status');
  const barEl = document.getElementById('level-progress-bar');
  const hintEl = document.getElementById('level-progress-text');

  if (statusEl) statusEl.innerText = currentRank.title;
  if (nextRank) {
    const need = nextRank.min - currentRank.min;
    const cur = state.clicks - currentRank.min;
    const pct = Math.min(Math.max((cur / need) * 100, 0), 100);
    if (barEl) barEl.style.width = `${pct}%`;
    if (hintEl) hintEl.innerText = `${state.clicks} / ${nextRank.min} до ${nextRank.title}`;
  } else {
    if (barEl) barEl.style.width = '100%';
    if (hintEl) hintEl.innerText = 'Максимальный уровень';
  }

  // Бак
  const current = TANKS[state.equippedTank] || TANKS.berserker;
  const nameEl = document.getElementById('current-tank-name');
  const perkEl = document.getElementById('tank-perk');
  const imgEl = document.getElementById('tank-image');

  if (nameEl) nameEl.innerText = current.name;
  if (perkEl) perkEl.innerText = current.desc;
  if (imgEl && !imgEl.src.includes(current.image)) {
    imgEl.src = current.image;
  }

  renderTanks();
  renderCases();
  renderCoupons();
  renderTasks();
}

// Задания и валидация подписки через Bot API
function renderTasks() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  container.innerHTML = '';

  const isReviewDone = state.completedTasks && state.completedTasks.includes('sub_review');
  const isMainDone = state.completedTasks && state.completedTasks.includes('sub_main');

  // Квест 1: Prime Review
  const divReview = document.createElement('div');
  divReview.className = 'item-card';
  divReview.innerHTML = `
    <div>
      <strong>Подписка на Prime Review</strong>
      <p style="font-size:0.8rem; color:#8b92a5;">Канал с топовыми честными обзорами девайсов</p>
      <span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">+200 PrimeCoins</span>
    </div>
    <div class="task-btn-group">
      ${isReviewDone
        ? '<button class="item-btn equipped" disabled>Получено</button>'
        : `<a href="https://t.me/PrimeVapor_Review" target="_blank" class="item-btn" style="text-decoration:none;">Канал</a>
           <button class="item-btn check" onclick="verifySubscription('${CHANNEL_REVIEW}', 'sub_review', 200)">Проверить</button>`
      }
    </div>
  `;
  container.appendChild(divReview);

  // Квест 2: Prime Vapor
  const divMain = document.createElement('div');
  divMain.className = 'item-card';
  divMain.innerHTML = `
    <div>
      <strong>Комьюнити Prime Vapor</strong>
      <p style="font-size:0.8rem; color:#8b92a5;">Главный чат и новости сообщества</p>
      <span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">+100 PrimeCoins</span>
    </div>
    <div class="task-btn-group">
      ${isMainDone
        ? '<button class="item-btn equipped" disabled>Получено</button>'
        : `<a href="https://t.me/Prime_Vapor" target="_blank" class="item-btn" style="text-decoration:none;">Канал</a>
           <button class="item-btn check" onclick="verifySubscription('${CHANNEL_MAIN}', 'sub_main', 100)">Проверить</button>`
      }
    </div>
  `;
  container.appendChild(divMain);
}

// Проверка членства в Telegram-канале через Bot API
window.verifySubscription = async function(channelUsername, taskId, reward) {
  const userInfo = getTelegramUser();

  if (userInfo.id.startsWith("guest_")) {
    showModal("Ошибка", "⚠️", "Запустите игру через Telegram, чтобы забрать награду.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channelUsername}&user_id=${userInfo.id}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && ["member", "administrator", "creator"].includes(data.result?.status)) {
      if (!state.completedTasks) state.completedTasks = [];
      state.completedTasks.push(taskId);
      state.primeCoins += reward;

      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      showModal("Награда получена!", "🪙", `Подписка подтверждена! Вам начислено +${reward} PrimeCoins.`);
      updateUI();
      forceSave();
    } else {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      showModal("Не подписан", "❌", `Вы ещё не подписались на канал ${channelUsername}. Подпишитесь и нажмите «Проверить».`);
    }
  } catch (e) {
    showModal("Ошибка сети", "⚠️", "Не удалось связаться с Telegram API. Попробуйте через минуту.");
  }
};

function renderTanks() {
  const container = document.getElementById('tanks-list');
  if (!container) return;
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
  if (!container) return;
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
  if (!container) return;
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
    modalDesc = `Вам выпал промокод 10% на кейс для АКБ!\nКод: ${code}`;
  } else {
    const wonCoins = Math.floor(Math.random() * (c.maxCoins - c.minCoins + 1)) + c.minCoins;
    state.primeCoins += wonCoins;
    modalTitle = 'PrimeCoins!';
    modalIcon = '🪙';
    modalDesc = `Вы получили +${wonCoins} PrimeCoins на покупки.`;
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showModal(modalTitle, modalIcon, modalDesc);
  updateUI();
  forceSave();
};

function showModal(title, icon, desc) {
  const mTitle = document.getElementById('modal-title');
  const mIcon = document.getElementById('modal-icon');
  const mDesc = document.getElementById('modal-desc');
  const modal = document.getElementById('drop-modal');

  if (mTitle) mTitle.innerText = title;
  if (mIcon) mIcon.innerText = icon;
  if (mDesc) mDesc.innerText = desc;
  if (modal) modal.classList.remove('hidden');
}

const modalCloseBtn = document.getElementById('modal-close');
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    document.getElementById('drop-modal')?.classList.add('hidden');
  });
}

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// Сохранение данных
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(forceSave, 800);
}

function forceSave() {
  const json = JSON.stringify(state);
  localStorage.setItem(PRIMARY_KEY, json);

  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem(PRIMARY_KEY, json);
  }

  if (GOOGLE_SHEET_URL) {
    const userInfo = getTelegramUser();
    const payload = JSON.stringify({
      tgId: userInfo.id,
      username: userInfo.name,
      clicks: state.clicks,
      primeCoins: state.primeCoins,
      equippedTank: state.equippedTank,
      coupons: state.coupons,
      completedTasks: state.completedTasks
    });

    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(payload)
    }).catch(() => {});
  }
}

// Восстановление данных
window.onGoogleSheetDataLoaded = function(data) {
  if (data && data.status === "ok") {
    state.clicks = Number(data.clicks) || 0;
    state.primeCoins = Number(data.primeCoins) || 0;
    if (data.equippedTank) {
      state.equippedTank = data.equippedTank;
      if (!state.unlockedTanks.includes(data.equippedTank)) {
        state.unlockedTanks.push(data.equippedTank);
      }
    }
    updateUI();
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(state));
  }
};

function loadState() {
  const saved = localStorage.getItem(PRIMARY_KEY) || 
                localStorage.getItem('prime_vapor_save_main') || 
                localStorage.getItem('prime_save_v2') || 
                localStorage.getItem('prime_save');

  if (saved) {
    try {
      state = Object.assign(state, JSON.parse(saved));
    } catch (e) {}
  }
  updateUI();

  if (GOOGLE_SHEET_URL) {
    const userInfo = getTelegramUser();
    const script = document.createElement('script');
    script.src = `${GOOGLE_SHEET_URL}?tgId=${userInfo.id}&callback=onGoogleSheetDataLoaded&t=${Date.now()}`;
    document.head.appendChild(script);
  }
}

loadState();

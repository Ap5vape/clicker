const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
}

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwT9o46pqdgTHtJjGKikuaomwG8G1C-bZAzCDuL4F4fyb102BqM-TNZxSIQRuezjPlG/exec";

function getTelegramUser() {
  let user = tg?.initDataUnsafe?.user;
  if (!user && tg?.initData) {
    try {
      const params = new URLSearchParams(tg.initData);
      const userRaw = params.get('user');
      if (userRaw) user = JSON.parse(userRaw);
    } catch (e) {}
  }
  if (user && user.id) return { id: String(user.id), name: user.username ? `@${user.username}` : (user.first_name || "Игрок") };
  let guestId = localStorage.getItem('prime_guest_uid_v8');
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('prime_guest_uid_v8', guestId);
  }
  return { id: guestId, name: "Гость (" + guestId.slice(-4) + ")" };
}

const currentUser = getTelegramUser();
const PRIMARY_KEY = `prime_acc_${currentUser.id}_v8`;

let state = {
  vapor: 0,
  primeCoins: 0,
  equippedTank: 'berserker',
  unlockedTanks: ['berserker'],
  inventory: { coils: {}, liquids: {} }, // ID: количество
  activeBuffs: { coil: null, liquid: null }, // {id, clicksLeft}
  coupons: [],
  leaderboard: []
};

// --- БАЗА ДАННЫХ ПРЕДМЕТОВ ---
const TANKS = {
  berserker:   { id: 'berserker', name: 'Berserker V2', image: 'assets/berserker_v2.png', price: 0, baseClick: 1, lucky2: 0.00, lucky3: 0.00, desc: 'База: 1 пар.' },
  ares:        { id: 'ares', name: 'Innokin Ares 2', image: 'assets/ares.png', price: 300, baseClick: 2, lucky2: 0.02, lucky3: 0.00, desc: 'База: 2 пар. 2% Lucky x2' },
  siren:       { id: 'siren', name: 'Siren 2 GTA', image: 'assets/siren.png', price: 800, baseClick: 3, lucky2: 0.03, lucky3: 0.00, desc: 'База: 3 пар. 3% Lucky x2' },
  hastur:      { id: 'hastur', name: 'Cthulhu Hastur', image: 'assets/hastur.png', price: 1500, baseClick: 4, lucky2: 0.04, lucky3: 0.00, desc: 'База: 4 пар. 4% Lucky x2' },
  zeus:        { id: 'zeus', name: 'Zeus Sub-Ohm', image: 'assets/zeus.png', price: 3000, baseClick: 5, lucky2: 0.05, lucky3: 0.00, desc: 'База: 5 пар. 5% Lucky x2' },
  ammit:       { id: 'ammit', name: 'Ammit MTL RTA', image: 'assets/ammit.png', price: 5000, baseClick: 7, lucky2: 0.06, lucky3: 0.00, desc: 'База: 7 пар. 6% Lucky x2' },
  bishop:      { id: 'bishop', name: 'Bishop MTL', image: 'assets/bishop.png', price: 8500, baseClick: 10, lucky2: 0.07, lucky3: 0.01, desc: 'База: 10 пар. 7% x2, 1% x3' },
  neeko:       { id: 'neeko', name: 'Aspire Neeko', image: 'assets/neeko.png', price: 14000, baseClick: 14, lucky2: 0.08, lucky3: 0.01, desc: 'База: 14 пар. 8% x2, 1% x3' },
  pioneer:     { id: 'pioneer', name: 'Pioneer MTL', image: 'assets/pioneer.png', price: 22000, baseClick: 18, lucky2: 0.09, lucky3: 0.02, desc: 'База: 18 пар. 9% x2, 2% x3' },
  galaxies:    { id: 'galaxies', name: 'Galaxies MTL', image: 'assets/galaxies.png', price: 35000, baseClick: 25, lucky2: 0.10, lucky3: 0.02, desc: 'База: 25 пар. 10% x2, 2% x3' },
  kayfun_lite: { id: 'kayfun_lite', name: 'Kayfun Lite', image: 'assets/kayfun.png', price: 50000, baseClick: 35, lucky2: 0.11, lucky3: 0.02, desc: 'База: 35 пар. 11% x2, 2% x3' },
  dvarw:       { id: 'dvarw', name: 'Dvarw MTL FL', image: 'assets/dvarw.png', price: 110000, baseClick: 60, lucky2: 0.12, lucky3: 0.03, desc: 'База: 60 пар. 12% x2, 3% x3' },
  sputnik:     { id: 'sputnik', name: 'Sputnik RTA', image: 'assets/sputnik.png', price: 160000, baseClick: 80, lucky2: 0.13, lucky3: 0.03, desc: 'База: 80 пар. 13% x2, 3% x3' },
  fev:         { id: 'fev', name: 'Flash-e-Vapor', image: 'assets/fev.png', price: 240000, baseClick: 110, lucky2: 0.14, lucky3: 0.04, desc: 'База: 110 пар. 14% x2, 4% x3' },
  taifun:      { id: 'taifun', name: 'Taifun GTR', image: 'assets/taifun.png', price: 350000, baseClick: 150, lucky2: 0.15, lucky3: 0.04, desc: 'База: 150 пар. 15% x2, 4% x3' },
  byka:        { id: 'byka', name: 'BY-ka v.9', image: 'assets/byka.png', price: 500000, baseClick: 200, lucky2: 0.16, lucky3: 0.05, desc: 'База: 200 пар. 16% x2, 5% x3' },
  millennium:  { id: 'millennium', name: 'Millennium RTA', image: 'assets/millennium.png', price: 750000, baseClick: 280, lucky2: 0.17, lucky3: 0.05, desc: 'База: 280 пар. 17% x2, 5% x3' },
  expromizer:  { id: 'expromizer', name: 'Expromizer V4', image: 'assets/expromizer.png', price: 1000000, baseClick: 380, lucky2: 0.18, lucky3: 0.06, desc: 'База: 380 пар. 18% x2, 6% x3' },
  kf_prime:    { id: 'kf_prime', name: 'Kayfun Prime', image: 'assets/kf_prime.png', price: 1500000, baseClick: 500, lucky2: 0.19, lucky3: 0.06, desc: 'База: 500 пар. 19% x2, 6% x3' },
  patibulum:   { id: 'patibulum', name: 'Patibulum', image: 'assets/patibulum.png', price: 2200000, baseClick: 700, lucky2: 0.20, lucky3: 0.07, desc: 'База: 700 пар. 20% x2, 7% x3' },
  hussar:      { id: 'hussar', name: 'Hussar RTA', image: 'assets/hussar.png', price: 3200000, baseClick: 950, lucky2: 0.21, lucky3: 0.07, desc: 'База: 950 пар. 21% x2, 7% x3' },
  skyline:     { id: 'skyline', name: 'Skyline RTA', image: 'assets/skyline.png', price: 4500000, baseClick: 1300, lucky2: 0.22, lucky3: 0.08, desc: 'База: 1300 пар. 22% x2, 8% x3' },
  kf_x:        { id: 'kf_x', name: 'Kayfun X', image: 'assets/kf_x.png', price: 6500000, baseClick: 1800, lucky2: 0.23, lucky3: 0.08, desc: 'База: 1800 пар. 23% x2, 8% x3' },
  tripod:      { id: 'tripod', name: 'Tripod RTA', image: 'assets/tripod.png', price: 9000000, baseClick: 2500, lucky2: 0.24, lucky3: 0.09, desc: 'База: 2500 пар. 24% x2, 9% x3' },
  integra:     { id: 'integra', name: 'Integra RTA', image: 'assets/integra.png', price: 12000000, baseClick: 3500, lucky2: 0.25, lucky3: 0.09, desc: 'База: 3500 пар. 25% x2, 9% x3' },
  paravozz:    { id: 'paravozz', name: 'Paravozz Genesis', image: 'assets/paravozz.png', price: 20000000, baseClick: 5000, lucky2: 0.26, lucky3: 0.10, desc: 'База: 5000 пар. 26% x2, 10% x3' }
};

const COILS = {
  mono: { id: 'mono', name: 'Моножила', icon: '➰', price: 500, bonus: 2, maxClicks: 2000, desc: '+2 Пар за клик (Хватит на 2к тапов)' },
  fused: { id: 'fused', name: 'Fused Clapton', icon: '🪢', price: 2500, bonus: 5, maxClicks: 5000, desc: '+5 Пар за клик (Хватит на 5к тапов)' },
  staggered: { id: 'staggered', name: 'Staggered', icon: '⛓️', price: 10000, bonus: 15, maxClicks: 10000, desc: '+15 Пар за клик (Хватит на 10к тапов)' },
  alien: { id: 'alien', name: 'Diesel Alien', icon: '🧬', price: 40000, bonus: 40, maxClicks: 25000, desc: '+40 Пар за клик (Хватит на 25к тапов)' }
};

const LIQUIDS = {
  russia: { id: 'russia', name: 'Жидкость (Россия)', icon: '🇷🇺', price: 1000, bonus: 3, maxClicks: 1000, desc: '+3 Пар за клик (1к тапов)' },
  usa: { id: 'usa', name: 'Жидкость (США)', icon: '🇺🇸', price: 4000, bonus: 10, maxClicks: 2500, desc: '+10 Пар за клик (2.5к тапов)' },
  malaysia: { id: 'malaysia', name: 'Жидкость (Малайзия)', icon: '🇲🇾', price: 12000, bonus: 25, maxClicks: 5000, desc: '+25 Пар за клик (5к тапов)' },
  royalduck: { id: 'royalduck', name: 'RoyalDuck by АНОАРО', icon: '🦆', price: 60000, bonus: 100, maxClicks: 10000, desc: 'Премиум! +100 Пар за клик (10к тапов)' }
};

const RANKS = [
  { min: 0, max: 2000, title: 'Респектовый' },
  { min: 2000, max: 15000, title: 'Локал бой' },
  { min: 15000, max: 100000, title: 'Вейпер' },
  { min: 100000, max: 500000, title: 'Тру вейпер' },
  { min: 500000, max: 5000000, title: 'PrimeВейпер' },
  { min: 5000000, max: Infinity, title: 'Легенда пара' }
];

const CASES = [
  { id: 'case_1', title: 'Бюджетный кейс', cost: 500, minCoins: 20, maxCoins: 60, couponChance: 0.001 },
  { id: 'case_2', title: 'Стандартный кейс', cost: 2500, minCoins: 100, maxCoins: 350, couponChance: 0.002 },
  { id: 'case_3', title: 'Опытный кейс', cost: 15000, minCoins: 700, maxCoins: 2500, couponChance: 0.005 },
  { id: 'case_4', title: 'Prime Кейс', cost: 100000, minCoins: 5000, maxCoins: 18000, couponChance: 0.01 },
  { id: 'case_5', title: 'Элитный кейс', cost: 500000, minCoins: 28000, maxCoins: 90000, couponChance: 0.015 },
  { id: 'case_6', title: 'High-End кейс', cost: 2500000, minCoins: 150000, maxCoins: 500000, couponChance: 0.02 },
  { id: 'case_7', title: 'Легендарный кейс', cost: 10000000, minCoins: 700000, maxCoins: 2000000, couponChance: 0.03 }
];

// ПРЕДЗАГРУЗКА КАРТИНОК
function preloadImages() {
  const images = Object.values(TANKS).map(t => t.image);
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}
preloadImages();

// ПАР (Canvas теперь Fixed на фоне)
const canvas = document.getElementById('steam-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let isOpeningCase = false;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class SteamParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 50;
    this.y = y;
    this.radius = 20 + Math.random() * 20;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -3 - Math.random() * 3; // Летит вверх быстрее
    this.alpha = 0.6;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.radius += 0.5;
    this.alpha -= 0.008;
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 235, 245, ${Math.max(this.alpha, 0)})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
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
      if (particles[i].alpha <= 0 || particles[i].y < -50) particles.splice(i, 1);
    }
  }
  requestAnimationFrame(renderSteam);
}
renderSteam();

function spawnSteam(startX, startY) {
  if (!canvas) return;
  for (let i = 0; i < 6; i++) {
    particles.push(new SteamParticle(startX, startY));
  }
}

// ПЕРЕГРЕВ И АНТИ-КЛИКЕР
let heat = 0;
let isOverheated = false;
let lastClickTime = 0;

setInterval(() => {
  if (heat > 0 && !isOverheated) {
    heat -= 15;
    if (heat < 0) heat = 0;
    updateHeatUI();
  }
}, 200);

function updateHeatUI() {
  const bar = document.getElementById('heat-fill');
  if (bar) {
    const pct = Math.min((heat / 500) * 100, 100);
    bar.style.width = `${pct}%`;
  }
}

function triggerOverheat() {
  isOverheated = true;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  const overlay = document.getElementById('overheat-overlay');
  if(overlay) overlay.classList.add('active');
  
  setTimeout(() => {
    isOverheated = false;
    heat = 0;
    updateHeatUI();
    if(overlay) overlay.classList.remove('active');
  }, 4000);
}

// КЛИК ПО БАКУ
const tankTarget = document.getElementById('tank-target');
if (tankTarget) {
  tankTarget.addEventListener('pointerdown', (e) => {
    if (isOverheated) return;

    const now = Date.now();
    if (now - lastClickTime < 40) return; // Игнор быстрее 40мс
    lastClickTime = now;

    heat += 12;
    updateHeatUI();
    if (heat >= 500) {
      triggerOverheat();
      return;
    }

    const currentTank = TANKS[state.equippedTank] || TANKS.berserker;
    
    // Расчет бафов
    let coilBonus = 0;
    if (state.activeBuffs.coil) {
      coilBonus = COILS[state.activeBuffs.coil.id].bonus;
      state.activeBuffs.coil.clicksLeft--;
      if (state.activeBuffs.coil.clicksLeft <= 0) state.activeBuffs.coil = null;
    }

    let liquidBonus = 0;
    if (state.activeBuffs.liquid) {
      liquidBonus = LIQUIDS[state.activeBuffs.liquid.id].bonus;
      state.activeBuffs.liquid.clicksLeft--;
      if (state.activeBuffs.liquid.clicksLeft <= 0) state.activeBuffs.liquid = null;
    }

    let base = currentTank.baseClick + coilBonus + liquidBonus;
    let mult = 1;
    let luckyClass = '';

    const roll = Math.random();
    if (currentTank.lucky3 > 0 && roll < currentTank.lucky3) {
      mult = 3; luckyClass = 'lucky-3';
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else if (currentTank.lucky2 > 0 && roll < (currentTank.lucky3 + currentTank.lucky2)) {
      mult = 2; luckyClass = 'lucky-2';
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    } else {
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }

    const earned = base * mult;
    state.vapor += earned;
    
    const rect = tankTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    spawnSteam(centerX, centerY - 20);
    showTapEffect(e.clientX, e.clientY, earned, luckyClass);

    if (mult > 1) {
      const flash = document.createElement('div');
      flash.className = `screen-flash ${mult === 3 ? 'x3' : ''}`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    }

    updateUI();
    scheduleLocalSave();
  });
}

function showTapEffect(x, y, amount, luckyClass) {
  const el = document.createElement('div');
  el.className = `tap-particle ${luckyClass}`;
  el.innerText = `+${amount.toLocaleString()}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

function updateUI() {
  const vaporEl = document.getElementById('vapor-display');
  const coinsEl = document.getElementById('coins-display');
  if (vaporEl) vaporEl.innerText = Number(state.vapor || 0).toLocaleString();
  if (coinsEl) coinsEl.innerText = Number(state.primeCoins || 0).toLocaleString();

  let currentRank = RANKS[0];
  let nextRank = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (state.vapor >= RANKS[i].min && state.vapor < RANKS[i].max) {
      currentRank = RANKS[i]; nextRank = RANKS[i + 1] || null; break;
    }
  }

  const statusEl = document.getElementById('player-status');
  const barEl = document.getElementById('level-progress-bar');
  const hintEl = document.getElementById('level-progress-text');

  if (statusEl) statusEl.innerText = currentRank.title;
  if (nextRank) {
    const need = nextRank.min - currentRank.min;
    const cur = state.vapor - currentRank.min;
    const pct = Math.min(Math.max((cur / need) * 100, 0), 100);
    if (barEl) barEl.style.width = `${pct}%`;
    if (hintEl) hintEl.innerText = `${state.vapor.toLocaleString()} / ${nextRank.min.toLocaleString()} до ${nextRank.title}`;
  } else {
    if (barEl) barEl.style.width = '100%';
    if (hintEl) hintEl.innerText = 'Максимальный уровень';
  }

  const current = TANKS[state.equippedTank] || TANKS.berserker;
  const nameEl = document.getElementById('current-tank-name');
  const perkEl = document.getElementById('tank-perk');
  const imgEl = document.getElementById('tank-image');

  if (nameEl) nameEl.innerText = current.name;
  if (perkEl) perkEl.innerText = current.desc;
  if (imgEl && !imgEl.src.includes(current.image)) imgEl.src = current.image;

  renderActiveBuffs();
  renderShop();
  renderInventory();
  renderCases();
  renderLeaderboard();
}

function renderActiveBuffs() {
  const cCont = document.getElementById('active-coil');
  const lCont = document.getElementById('active-liquid');
  
  if (state.activeBuffs.coil) {
    const c = COILS[state.activeBuffs.coil.id];
    const pct = (state.activeBuffs.coil.clicksLeft / c.maxClicks) * 100;
    cCont.innerHTML = `<span class="buff-icon">${c.icon}</span><span class="buff-name">${c.name}</span><div class="buff-hp-bg"><div class="buff-hp-fill" style="width:${pct}%; background:${pct<20?'#da3633':'#238636'}"></div></div>`;
  } else {
    cCont.innerHTML = `<span class="buff-icon" style="opacity:0.3">➰</span><span class="buff-name" style="color:#8b92a5">Нет койла</span><div class="buff-hp-bg"></div>`;
  }

  if (state.activeBuffs.liquid) {
    const l = LIQUIDS[state.activeBuffs.liquid.id];
    const pct = (state.activeBuffs.liquid.clicksLeft / l.maxClicks) * 100;
    lCont.innerHTML = `<span class="buff-icon">${l.icon}</span><span class="buff-name">${l.name}</span><div class="buff-hp-bg"><div class="buff-hp-fill" style="width:${pct}%; background:${pct<20?'#da3633':'#238636'}"></div></div>`;
  } else {
    lCont.innerHTML = `<span class="buff-icon" style="opacity:0.3">💧</span><span class="buff-name" style="color:#8b92a5">Нет жижи</span><div class="buff-hp-bg"></div>`;
  }
}

// ВЕЙПШОП (Покупка всего)
function renderShop() {
  const container = document.getElementById('shop-list');
  if (!container) return;
  container.innerHTML = '';

  // Танки
  container.innerHTML += `<div class="shop-section-title">Железо (Баки)</div>`;
  Object.values(TANKS).forEach(t => {
    if (state.unlockedTanks.includes(t.id)) return; // Скрываем купленные
    const canBuy = state.primeCoins >= t.price;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${t.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${t.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${t.price.toLocaleString()} PC</span></div>
        <button class="item-btn" ${!canBuy ? 'disabled' : ''} onclick="buyTank('${t.id}')">Купить</button>
      </div>`;
  });

  // Жидкости
  container.innerHTML += `<div class="shop-section-title">Жидкости</div>`;
  Object.values(LIQUIDS).forEach(l => {
    const canBuy = state.primeCoins >= l.price;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${l.icon} ${l.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${l.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${l.price.toLocaleString()} PC</span></div>
        <button class="item-btn" ${!canBuy ? 'disabled' : ''} onclick="buyItem('liquids', '${l.id}')">Купить</button>
      </div>`;
  });

  // Койлы
  container.innerHTML += `<div class="shop-section-title">Намотки (Койлы)</div>`;
  Object.values(COILS).forEach(c => {
    const canBuy = state.primeCoins >= c.price;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${c.icon} ${c.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${c.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${c.price.toLocaleString()} PC</span></div>
        <button class="item-btn" ${!canBuy ? 'disabled' : ''} onclick="buyItem('coils', '${c.id}')">Купить</button>
      </div>`;
  });
}

// ИНВЕНТАРЬ (Надевание и продажа)
function renderInventory() {
  const container = document.getElementById('inventory-list');
  if (!container) return;
  container.innerHTML = '';

  container.innerHTML += `<div class="shop-section-title">Мои Баки</div>`;
  state.unlockedTanks.forEach(id => {
    const t = TANKS[id];
    const isEq = state.equippedTank === id;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${t.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${t.desc}</p></div>
        <div style="display:flex; gap:6px;">
          ${isEq ? `<button class="item-btn equipped">Надет</button>` : `<button class="item-btn" onclick="equipTank('${t.id}')">Надеть</button>`}
          ${(!isEq && t.price > 0) ? `<button class="item-btn sell" onclick="sellTank('${t.id}')">Флип</button>` : ''}
        </div>
      </div>`;
  });

  const liqs = Object.keys(state.inventory.liquids).filter(k => state.inventory.liquids[k] > 0);
  if (liqs.length > 0) {
    container.innerHTML += `<div class="shop-section-title">Мои Жидкости</div>`;
    liqs.forEach(id => {
      const l = LIQUIDS[id];
      const count = state.inventory.liquids[id];
      container.innerHTML += `
        <div class="item-card">
          <div><strong>${l.icon} ${l.name} (x${count})</strong><p style="font-size:0.8rem; color:#8b92a5;">${l.desc}</p></div>
          <button class="item-btn" onclick="equipItem('liquid', '${id}')">Залить</button>
        </div>`;
    });
  }

  const coils = Object.keys(state.inventory.coils).filter(k => state.inventory.coils[k] > 0);
  if (coils.length > 0) {
    container.innerHTML += `<div class="shop-section-title">Мои Койлы</div>`;
    coils.forEach(id => {
      const c = COILS[id];
      const count = state.inventory.coils[id];
      container.innerHTML += `
        <div class="item-card">
          <div><strong>${c.icon} ${c.name} (x${count})</strong><p style="font-size:0.8rem; color:#8b92a5;">${c.desc}</p></div>
          <button class="item-btn" onclick="equipItem('coil', '${id}')">Поставить</button>
        </div>`;
    });
  }
}

window.buyTank = function(id) {
  if (state.primeCoins >= TANKS[id].price && !state.unlockedTanks.includes(id)) {
    state.primeCoins -= TANKS[id].price;
    state.unlockedTanks.push(id);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI(); scheduleLocalSave();
  }
};
window.buyItem = function(type, id) {
  const item = type === 'coils' ? COILS[id] : LIQUIDS[id];
  if (state.primeCoins >= item.price) {
    state.primeCoins -= item.price;
    if (!state.inventory[type][id]) state.inventory[type][id] = 0;
    state.inventory[type][id]++;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI(); scheduleLocalSave();
  }
};
window.equipTank = function(id) {
  if (state.unlockedTanks.includes(id)) {
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateUI(); scheduleLocalSave();
  }
};
window.sellTank = function(id) {
  const tank = TANKS[id];
  if (!state.unlockedTanks.includes(id) || state.equippedTank === id || tank.price === 0) return;
  const sellPrice = Math.floor(tank.price * (0.4 + (Math.random() * 0.6)));
  state.unlockedTanks = state.unlockedTanks.filter(t => t !== id);
  state.primeCoins += sellPrice;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showModal('Удачный флип!', '💰', `Продано! +${sellPrice.toLocaleString()} PrimeCoins`);
  updateUI(); scheduleLocalSave();
};
window.equipItem = function(type, id) {
  const invType = type === 'coil' ? 'coils' : 'liquids';
  if (state.inventory[invType][id] > 0) {
    state.inventory[invType][id]--;
    const item = type === 'coil' ? COILS[id] : LIQUIDS[id];
    state.activeBuffs[type] = { id: id, clicksLeft: item.maxClicks };
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateUI(); scheduleLocalSave();
  }
};

function renderCases() {
  const container = document.getElementById('cases-list');
  if (!container) return;
  container.innerHTML = '';
  CASES.forEach(c => {
    const canAfford = state.vapor >= c.cost && !isOpeningCase;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${c.title}</strong><p style="font-size:0.8rem; color:#8b92a5;">${c.minCoins.toLocaleString()}-${c.maxCoins.toLocaleString()} PC | Купон (${(c.couponChance * 100).toFixed(1)}%)</p>
        <span style="font-size:0.85rem; color:#ff6b00; font-weight:700;">${c.cost.toLocaleString()} пар</span></div>
        <button class="item-btn" ${!canAfford ? 'disabled' : ''} onclick="openCase('${c.id}')">Открыть</button>
      </div>`;
  });
}

window.openCase = function(id) {
  if (isOpeningCase) return;
  const c = CASES.find(x => x.id === id);
  if (state.vapor < c.cost) return;

  isOpeningCase = true;
  state.vapor -= c.cost;
  updateUI(); scheduleLocalSave();

  const mTitle = document.getElementById('modal-title');
  const mIcon = document.getElementById('modal-icon');
  const mDesc = document.getElementById('modal-desc');
  const mClose = document.getElementById('modal-close');
  const modal = document.getElementById('drop-modal');

  mTitle.innerText = 'Распаковка...'; mDesc.innerText = 'Снимаем плёнку...';
  mIcon.innerText = '📦'; mIcon.className = 'drop-icon-bounce case-opening-anim';
  mClose.style.display = 'none'; modal.classList.remove('hidden');
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  setTimeout(() => {
    isOpeningCase = false;
    mIcon.className = 'drop-icon-bounce'; mClose.style.display = 'block';

    const isCoupon = Math.random() < c.couponChance;
    if (isCoupon) {
      const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      state.coupons.push({ discount: '10%', code });
      mTitle.innerText = 'СУПЕР ДРОП!'; mIcon.innerText = '🔋'; mDesc.innerText = `Промокод 10% на кейс АКБ!\nКод: ${code}`;
    } else {
      const wonCoins = Math.floor(Math.random() * (c.maxCoins - c.minCoins + 1)) + c.minCoins;
      state.primeCoins += wonCoins;
      mTitle.innerText = 'PrimeCoins!'; mIcon.innerText = '🪙'; mDesc.innerText = `Вы получили +${wonCoins.toLocaleString()} PrimeCoins.`;
      
      // Шанс дропнуть расходник (30%)
      if(Math.random() < 0.3) {
        const types = ['coils', 'liquids'];
        const t = types[Math.floor(Math.random()*2)];
        const keys = Object.keys(t==='coils' ? COILS : LIQUIDS);
        const itemID = keys[Math.floor(Math.random()*keys.length)];
        if (!state.inventory[t][itemID]) state.inventory[t][itemID] = 0;
        state.inventory[t][itemID]++;
        const iObj = t==='coils' ? COILS[itemID] : LIQUIDS[itemID];
        mDesc.innerText += `\n\n🎁 Бонус: ${iObj.icon} ${iObj.name}`;
      }
    }
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI(); scheduleLocalSave();
  }, 1500);
};

function showModal(title, icon, desc) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-icon').className = 'drop-icon-bounce';
  document.getElementById('modal-desc').innerText = desc;
  document.getElementById('modal-close').style.display = 'block';
  document.getElementById('drop-modal').classList.remove('hidden');
}
document.getElementById('modal-close')?.addEventListener('click', () => { document.getElementById('drop-modal').classList.add('hidden'); });

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  container.innerHTML = '';
  if (!state.leaderboard || state.leaderboard.length === 0) {
    container.innerHTML = '<p class="empty-text">Топ пока пуст или загружается...</p>'; return;
  }
  state.leaderboard.forEach((item, index) => {
    let rankBadge = `${index + 1}`;
    if (index === 0) rankBadge = '🏆 1'; else if (index === 1) rankBadge = '🥈 2'; else if (index === 2) rankBadge = '🥉 3';
    const isMe = item.id === currentUser.id;
    container.innerHTML += `
      <div class="leader-item ${isMe ? 'highlight' : ''}">
        <span class="leader-rank">${rankBadge}</span><span class="leader-name">${item.name} ${isMe ? '(Вы)' : ''}</span><span class="leader-score">${Number(item.vapor).toLocaleString()}</span>
      </div>`;
  });
}

// BATCH-СОХРАНЕНИЕ
let saveTimeout = null;
let googleSyncInterval = null;

function scheduleLocalSave() {
  localStorage.setItem(PRIMARY_KEY, JSON.stringify(state));
}

function syncToGoogle() {
  if (!GOOGLE_SHEET_URL) return;
  const payload = JSON.stringify({
    tgId: currentUser.id, username: currentUser.name, vapor: state.vapor, primeCoins: state.primeCoins,
    equippedTank: state.equippedTank, coupons: state.coupons, unlockedTanks: state.unlockedTanks,
    inventory: state.inventory, activeBuffs: state.activeBuffs
  });
  fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(payload) }).catch(() => {});
}

// Синхронизируем раз в 10 сек
setInterval(syncToGoogle, 10000);

window.onTopLoaded = function(data) { if (data && data.status === "ok") { state.leaderboard = data.top; updateUI(); } };
function loadLeaderboard() { if (GOOGLE_SHEET_URL) { const s = document.createElement('script'); s.src = `${GOOGLE_SHEET_URL}?action=get_top&callback=onTopLoaded&t=${Date.now()}`; document.head.appendChild(s); } }

window.onGoogleSheetDataLoaded = function(data) {
  if (data && data.status === "ok") {
    state.vapor = Number(data.vapor) || 0;
    state.primeCoins = Number(data.primeCoins) || 0;
    if (data.unlockedTanks && Array.isArray(data.unlockedTanks)) state.unlockedTanks = data.unlockedTanks;
    if (data.inventory) state.inventory = data.inventory;
    if (data.activeBuffs) state.activeBuffs = data.activeBuffs;
    if (data.equippedTank && TANKS[data.equippedTank]) {
      state.equippedTank = data.equippedTank;
      if (!state.unlockedTanks.includes(data.equippedTank)) state.unlockedTanks.push(data.equippedTank);
    }
    if (data.coupons) state.coupons = data.coupons;
    updateUI(); scheduleLocalSave();
  } else if (data && data.status === "not_found") {
    scheduleLocalSave(); syncToGoogle();
  }
  loadLeaderboard();
};

function loadState() {
  const saved = localStorage.getItem(PRIMARY_KEY);
  if (saved) { try { state = Object.assign(state, JSON.parse(saved)); } catch (e) {} }
  if (!state.inventory) state.inventory = { coils: {}, liquids: {} };
  if (!state.activeBuffs) state.activeBuffs = { coil: null, liquid: null };
  updateUI();
  if (GOOGLE_SHEET_URL) {
    const s = document.createElement('script');
    s.src = `${GOOGLE_SHEET_URL}?tgId=${currentUser.id}&callback=onGoogleSheetDataLoaded&t=${Date.now()}`;
    document.head.appendChild(s);
  } else { loadLeaderboard(); }
}

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab)?.classList.add('active');
    syncToGoogle(); // Сохраняем при смене вкладки
  });
});

loadState();

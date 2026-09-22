const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
}

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwT9o46pqdgTHtJjGKikuaomwG8G1C-bZAzCDuL4F4fyb102BqM-TNZxSIQRuezjPlG/exec";

const tankMusic = new Audio('assets/track.mp3');
tankMusic.loop = true;
tankMusic.volume = 0.5;

function syncMusic() {
  const current = TANKS[state.equippedTank];
  if (current && current.hasAudio) {
    if (tankMusic.paused) tankMusic.play().catch(() => {});
  } else {
    if (!tankMusic.paused) { tankMusic.pause(); tankMusic.currentTime = 0; }
  }
}

function getTelegramUser() {
  let user = tg?.initDataUnsafe?.user;
  if (!user && tg?.initData) {
    try { const params = new URLSearchParams(tg.initData); const userRaw = params.get('user'); if (userRaw) user = JSON.parse(userRaw); } catch (e) {}
  }
  if (user && user.id) return { id: String(user.id), name: user.username ? `@${user.username}` : (user.first_name || "Игрок") };
  let guestId = localStorage.getItem('prime_guest_uid_v9');
  if (!guestId) { guestId = "guest_" + Math.random().toString(36).substring(2, 9); localStorage.setItem('prime_guest_uid_v9', guestId); }
  return { id: guestId, name: "Гость (" + guestId.slice(-4) + ")" };
}

const currentUser = getTelegramUser();
const PRIMARY_KEY = `prime_acc_${currentUser.id}_v9`;

let state = {
  vapor: 0, primeCoins: 0, equippedTank: 'berserker', unlockedTanks: ['berserker'],
  inventory: { coils: {}, liquids: {} }, activeBuffs: { coil: null, liquid: null },
  coupons: [], leaderboard: [],
  meta: { lastSaveTime: Date.now(), dailyStreak: 0, lastDailyDate: "" }
};

// СРЕЗ ЭКОНОМИКИ: Цены улетели в космос для долгосрока
const TANKS = {
  berserker:   { id: 'berserker', name: 'Berserker V2', image: 'assets/berserker_v2.png', price: 0, baseClick: 1, lucky2: 0.00, lucky3: 0.00, desc: 'База: 1 пар.' },
  ares:        { id: 'ares', name: 'Innokin Ares 2', image: 'assets/ares.png', price: 1500, baseClick: 2, lucky2: 0.02, lucky3: 0.00, desc: 'База: 2 пар. 2% Lucky x2' },
  siren:       { id: 'siren', name: 'Siren 2 GTA', image: 'assets/siren.png', price: 4500, baseClick: 3, lucky2: 0.03, lucky3: 0.00, desc: 'База: 3 пар. 3% Lucky x2' },
  hastur:      { id: 'hastur', name: 'Cthulhu Hastur', image: 'assets/hastur.png', price: 12000, baseClick: 4, lucky2: 0.04, lucky3: 0.00, desc: 'База: 4 пар. 4% Lucky x2' },
  zeus:        { id: 'zeus', name: 'Zeus Sub-Ohm', image: 'assets/zeus.png', price: 30000, baseClick: 6, lucky2: 0.05, lucky3: 0.00, desc: 'База: 6 пар. 5% Lucky x2' },
  ammit:       { id: 'ammit', name: 'Ammit MTL RTA', image: 'assets/ammit.png', price: 75000, baseClick: 9, lucky2: 0.06, lucky3: 0.00, desc: 'База: 9 пар. 6% Lucky x2' },
  bishop:      { id: 'bishop', name: 'Bishop MTL', image: 'assets/bishop.png', price: 180000, baseClick: 14, lucky2: 0.07, lucky3: 0.01, desc: 'База: 14 пар. 7% x2, 1% x3' },
  neeko:       { id: 'neeko', name: 'Aspire Neeko', image: 'assets/neeko.png', price: 400000, baseClick: 20, lucky2: 0.08, lucky3: 0.01, desc: 'База: 20 пар. 8% x2, 1% x3' },
  pioneer:     { id: 'pioneer', name: 'Pioneer MTL', image: 'assets/pioneer.png', price: 850000, baseClick: 30, lucky2: 0.09, lucky3: 0.02, desc: 'База: 30 пар. 9% x2, 2% x3' },
  galaxies:    { id: 'galaxies', name: 'Galaxies MTL', image: 'assets/galaxies.png', price: 1800000, baseClick: 45, lucky2: 0.10, lucky3: 0.02, desc: 'База: 45 пар. 10% x2, 2% x3' },
  kayfun_lite: { id: 'kayfun_lite', name: 'Kayfun Lite', image: 'assets/kayfun.png', price: 4000000, baseClick: 70, lucky2: 0.11, lucky3: 0.02, desc: 'База: 70 пар. 11% x2, 2% x3' },
  dvarw:       { id: 'dvarw', name: 'Dvarw MTL FL', image: 'assets/dvarw.png', price: 8500000, baseClick: 100, lucky2: 0.12, lucky3: 0.03, desc: 'База: 100 пар. 12% x2, 3% x3' },
  sputnik:     { id: 'sputnik', name: 'Sputnik RTA', image: 'assets/sputnik.png', price: 16000000, baseClick: 150, lucky2: 0.13, lucky3: 0.03, desc: 'База: 150 пар. 13% x2, 3% x3' },
  fev:         { id: 'fev', name: 'Flash-e-Vapor', image: 'assets/fev.png', price: 30000000, baseClick: 220, lucky2: 0.14, lucky3: 0.04, desc: 'База: 220 пар. 14% x2, 4% x3' },
  taifun:      { id: 'taifun', name: 'Taifun GTR', image: 'assets/taifun.png', price: 55000000, baseClick: 320, lucky2: 0.15, lucky3: 0.04, desc: 'База: 320 пар. 15% x2, 4% x3' },
  byka:        { id: 'byka', name: 'BY-ka v.9', image: 'assets/byka.png', price: 100000000, baseClick: 450, lucky2: 0.16, lucky3: 0.05, desc: 'База: 450 пар. 16% x2, 5% x3' },
  millennium:  { id: 'millennium', name: 'Millennium RTA', image: 'assets/millennium.png', price: 180000000, baseClick: 600, lucky2: 0.17, lucky3: 0.05, desc: 'База: 600 пар. 17% x2, 5% x3' },
  expromizer:  { id: 'expromizer', name: 'Expromizer V4', image: 'assets/expromizer.png', price: 300000000, baseClick: 850, lucky2: 0.18, lucky3: 0.06, desc: 'База: 850 пар. 18% x2, 6% x3' },
  kf_prime:    { id: 'kf_prime', name: 'Kayfun Prime', image: 'assets/kf_prime.png', price: 500000000, baseClick: 1200, lucky2: 0.19, lucky3: 0.06, desc: 'База: 1200 пар. 19% x2, 6% x3' },
  tripod:      { id: 'tripod', name: 'Tripod RTA', image: 'assets/tripod.png', price: 750000000, baseClick: 1800, lucky2: 0.24, lucky3: 0.09, desc: 'База: 1800 пар. 24% x2, 9% x3' },
  paravozz:    { id: 'paravozz', name: 'Paravozz Genesis', image: 'assets/paravozz.png', price: 1000000000, baseClick: 3000, lucky2: 0.26, lucky3: 0.10, desc: 'База: 3000 пар. 26% x2, 10% x3' }
};

// ЖЕСТКИЙ ИЗНОС РАСХОДНИКОВ
const COILS = {
  mono: { id: 'mono', name: 'Моножила', icon: '➰', price: 1000, bonus: 2, maxClicks: 200, desc: '+2 Пар за клик (Сгорит за 200 тапов)' },
  fused: { id: 'fused', name: 'Fused Clapton', icon: '🪢', price: 6000, bonus: 5, maxClicks: 500, desc: '+5 Пар за клик (Сгорит за 500 тапов)' },
  staggered: { id: 'staggered', name: 'Staggered', icon: '⛓️', price: 25000, bonus: 15, maxClicks: 1000, desc: '+15 Пар за клик (Сгорит за 1к тапов)' },
  alien: { id: 'alien', name: 'Diesel Alien', icon: '🧬', price: 100000, bonus: 40, maxClicks: 2500, desc: '+40 Пар за клик (Сгорит за 2.5к тапов)' }
};

const LIQUIDS = {
  russia: { id: 'russia', name: 'Жидкость (Россия)', icon: '🇷🇺', price: 2000, bonus: 3, maxClicks: 200, desc: '+3 Пар за клик (Высохнет за 200 тапов)' },
  usa: { id: 'usa', name: 'Жидкость (США)', icon: '🇺🇸', price: 10000, bonus: 10, maxClicks: 500, desc: '+10 Пар за клик (Высохнет за 500 тапов)' },
  malaysia: { id: 'malaysia', name: 'Жидкость (Малайзия)', icon: '🇲🇾', price: 30000, bonus: 25, maxClicks: 1000, desc: '+25 Пар за клик (Высохнет за 1к тапов)' },
  royalduck: { id: 'royalduck', name: 'RoyalDuck by АНОАРО', icon: '🦆', price: 150000, bonus: 100, maxClicks: 2500, desc: '+100 Пар за клик (Высохнет за 2.5к тапов)' }
};

const RANKS = [
  { min: 0, max: 2000, title: 'Респектовый' },
  { min: 2000, max: 15000, title: 'Локал бой' },
  { min: 15000, max: 100000, title: 'Вейпер' },
  { min: 100000, max: 500000, title: 'Тру вейпер' },
  { min: 500000, max: 5000000, title: 'PrimeВейпер' },
  { min: 5000000, max: Infinity, title: 'Легенда пара' }
];

// УРЕЗАННЫЙ ДОХОД И ШАНСЫ КЕЙСОВ
const CASES = [
  { id: 'case_1', title: 'Бюджетный кейс', cost: 500, minCoins: 10, maxCoins: 40, couponChance: 0.0001 },
  { id: 'case_2', title: 'Стандартный кейс', cost: 2500, minCoins: 60, maxCoins: 200, couponChance: 0.0005 },
  { id: 'case_3', title: 'Опытный кейс', cost: 15000, minCoins: 400, maxCoins: 1200, couponChance: 0.001 },
  { id: 'case_4', title: 'Prime Кейс', cost: 100000, minCoins: 3000, maxCoins: 8000, couponChance: 0.002 },
  { id: 'case_5', title: 'Элитный кейс', cost: 500000, minCoins: 18000, maxCoins: 45000, couponChance: 0.003 },
  { id: 'case_6', title: 'High-End кейс', cost: 2500000, minCoins: 90000, maxCoins: 250000, couponChance: 0.004 },
  { id: 'case_7', title: 'Легендарный кейс', cost: 10000000, minCoins: 400000, maxCoins: 1200000, couponChance: 0.005 }
];

function preloadImages() {
  const images = Object.values(TANKS).map(t => t.image);
  images.forEach(src => { const img = new Image(); img.src = src; });
}
preloadImages();

// АНИМАЦИЯ ПАРА (Угасает при подъеме)
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
    this.startY = y;
    this.y = y;
    this.radius = 20 + Math.random() * 20;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -2.5 - Math.random() * 2.5;
    this.baseAlpha = 0.6;
    this.alpha = 0.6;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.radius += 0.5;
    // Чем выше пар (ближе к 0 по Y), тем прозрачнее
    let progress = 1 - (this.y / this.startY);
    this.alpha = this.baseAlpha * (1 - progress * 1.3);
  }
  draw() {
    if (!ctx || this.alpha <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 235, 245, ${this.alpha})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(255, 255, 255, ${this.alpha * 0.5})`;
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
  for (let i = 0; i < 6; i++) particles.push(new SteamParticle(startX, startY));
}

let heat = 0; let isOverheated = false; let lastClickTime = 0;

setInterval(() => {
  if (heat > 0 && !isOverheated) { heat -= 15; if (heat < 0) heat = 0; updateHeatUI(); }
}, 200);

function updateHeatUI() {
  const bar = document.getElementById('heat-fill');
  if (bar) bar.style.width = `${Math.min((heat / 500) * 100, 100)}%`;
}

function triggerOverheat() {
  isOverheated = true;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  const overlay = document.getElementById('overheat-overlay');
  if(overlay) overlay.classList.add('active');
  setTimeout(() => {
    isOverheated = false; heat = 0; updateHeatUI();
    if(overlay) overlay.classList.remove('active');
  }, 4000);
}

const tankTarget = document.getElementById('tank-target');
if (tankTarget) {
  tankTarget.addEventListener('pointerdown', (e) => {
    if (isOverheated) return;
    const now = Date.now();
    if (now - lastClickTime < 40) return;
    lastClickTime = now;

    heat += 12; updateHeatUI();
    if (heat >= 500) { triggerOverheat(); return; }

    const currentTank = TANKS[state.equippedTank] || TANKS.berserker;
    
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
    let mult = 1; let luckyClass = '';

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
    spawnSteam(rect.left + rect.width / 2, rect.top + rect.height / 2 - 20);
    showTapEffect(e.clientX, e.clientY, earned, luckyClass);

    if (mult > 1) {
      const flash = document.createElement('div');
      flash.className = `screen-flash ${mult === 3 ? 'x3' : ''}`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    }

    updateUI();
    state.meta.lastSaveTime = Date.now();
    scheduleLocalSave();
  });
}

function showTapEffect(x, y, amount, luckyClass) {
  const el = document.createElement('div');
  el.className = `tap-particle ${luckyClass}`;
  el.innerText = `+${amount.toLocaleString()}`;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

function updateUI() {
  const vaporEl = document.getElementById('vapor-display');
  const coinsEl = document.getElementById('coins-display');
  if (vaporEl) vaporEl.innerText = Number(state.vapor || 0).toLocaleString();
  if (coinsEl) coinsEl.innerText = Number(state.primeCoins || 0).toLocaleString();

  let currentRank = RANKS[0]; let nextRank = RANKS[1];
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
    if (barEl) barEl.style.width = `${Math.min(Math.max((cur / need) * 100, 0), 100)}%`;
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

  renderActiveBuffs(); renderShop(); renderInventory(); renderCases(); renderLeaderboard();
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

function renderShop() {
  const container = document.getElementById('shop-list');
  if (!container) return;
  container.innerHTML = `<div class="shop-section-title">Железо (Баки)</div>`;
  Object.values(TANKS).forEach(t => {
    if (state.unlockedTanks.includes(t.id)) return;
    const canBuy = state.primeCoins >= t.price;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${t.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${t.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${t.price.toLocaleString()} PC</span></div>
        <button class="item-btn" ${!canBuy ? 'disabled' : ''} onclick="buyTank('${t.id}')">Купить</button>
      </div>`;
  });

  container.innerHTML += `<div class="shop-section-title">Жидкости</div>`;
  Object.values(LIQUIDS).forEach(l => {
    const canBuy = state.primeCoins >= l.price;
    container.innerHTML += `
      <div class="item-card">
        <div><strong>${l.icon} ${l.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${l.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${l.price.toLocaleString()} PC</span></div>
        <button class="item-btn" ${!canBuy ? 'disabled' : ''} onclick="buyItem('liquids', '${l.id}')">Купить</button>
      </div>`;
  });

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

function renderInventory() {
  const container = document.getElementById('inventory-list');
  if (!container) return;
  container.innerHTML = `<div class="shop-section-title">Мои Баки</div>`;
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
      container.innerHTML += `
        <div class="item-card">
          <div><strong>${LIQUIDS[id].icon} ${LIQUIDS[id].name} (x${state.inventory.liquids[id]})</strong><p style="font-size:0.8rem; color:#8b92a5;">${LIQUIDS[id].desc}</p></div>
          <button class="item-btn" onclick="equipItem('liquid', '${id}')">Залить</button>
        </div>`;
    });
  }

  const coils = Object.keys(state.inventory.coils).filter(k => state.inventory.coils[k] > 0);
  if (coils.length > 0) {
    container.innerHTML += `<div class="shop-section-title">Мои Койлы</div>`;
    coils.forEach(id => {
      container.innerHTML += `
        <div class="item-card">
          <div><strong>${COILS[id].icon} ${COILS[id].name} (x${state.inventory.coils[id]})</strong><p style="font-size:0.8rem; color:#8b92a5;">${COILS[id].desc}</p></div>
          <button class="item-btn" onclick="equipItem('coil', '${id}')">Поставить</button>
        </div>`;
    });
  }
}

window.buyTank = function(id) {
  if (state.primeCoins >= TANKS[id].price && !state.unlockedTanks.includes(id)) {
    state.primeCoins -= TANKS[id].price; state.unlockedTanks.push(id); state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    syncMusic(); updateUI(); scheduleLocalSave();
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
    syncMusic(); updateUI(); scheduleLocalSave();
  }
};
window.sellTank = function(id) {
  const tank = TANKS[id];
  if (!state.unlockedTanks.includes(id) || state.equippedTank === id || tank.price === 0) return;
  const sellPrice = Math.floor(tank.price * (0.4 + (Math.random() * 0.6)));
  state.unlockedTanks = state.unlockedTanks.filter(t => t !== id); state.primeCoins += sellPrice;
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
        <div><strong>${c.title}</strong><p style="font-size:0.8rem; color:#8b92a5;">${c.minCoins.toLocaleString()}-${c.maxCoins.toLocaleString()} PC | Купон (${(c.couponChance * 100).toFixed(2)}%)</p>
        <span style="font-size:0.85rem; color:#ff6b00; font-weight:700;">${c.cost.toLocaleString()} пар</span></div>
        <button class="item-btn" ${!canAfford ? 'disabled' : ''} onclick="openCase('${c.id}')">Открыть</button>
      </div>`;
  });
}

window.openCase = function(id) {
  if (isOpeningCase) return;
  const c = CASES.find(x => x.id === id);
  if (state.vapor < c.cost) return;

  isOpeningCase = true; state.vapor -= c.cost; updateUI(); scheduleLocalSave();

  const mTitle = document.getElementById('modal-title'); const mIcon = document.getElementById('modal-icon');
  const mDesc = document.getElementById('modal-desc'); const mClose = document.getElementById('modal-close');
  const modal = document.getElementById('drop-modal');

  mTitle.innerText = 'Распаковка...'; mDesc.innerText = 'Снимаем плёнку...';
  mIcon.innerText = '📦'; mIcon.className = 'drop-icon-bounce case-opening-anim';
  mClose.style.display = 'none'; modal.classList.remove('hidden');
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  setTimeout(() => {
    isOpeningCase = false; mIcon.className = 'drop-icon-bounce'; mClose.style.display = 'block';

    if (Math.random() < c.couponChance) {
      const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      state.coupons.push({ discount: '10%', code });
      mTitle.innerText = 'СУПЕР ДРОП!'; mIcon.innerText = '🔋'; mDesc.innerText = `Промокод 10% на кейс АКБ!\nКод: ${code}`;
    } else {
      const wonCoins = Math.floor(Math.random() * (c.maxCoins - c.minCoins + 1)) + c.minCoins;
      state.primeCoins += wonCoins;
      mTitle.innerText = 'PrimeCoins!'; mIcon.innerText = '🪙'; mDesc.innerText = `Вы получили +${wonCoins.toLocaleString()} PrimeCoins.`;
      
      // Дроп бомж-расходников (0.25% шанс)
      if(Math.random() < 0.0025) {
        const types = ['coils', 'liquids'];
        const t = types[Math.floor(Math.random()*2)];
        const itemID = t === 'coils' ? 'mono' : 'russia';
        if (!state.inventory[t][itemID]) state.inventory[t][itemID] = 0;
        state.inventory[t][itemID]++;
        const iObj = t==='coils' ? COILS[itemID] : LIQUIDS[itemID];
        mDesc.innerText += `\n\n🎁 Бонус: ${iObj.icon} ${iObj.name}`;
      }
    }
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    updateUI(); state.meta.lastSaveTime = Date.now(); scheduleLocalSave();
  }, 1500);
};

function showModal(title, icon, desc) {
  document.getElementById('modal-title').innerText = title; document.getElementById('modal-icon').innerText = icon;
  document.getElementById('modal-icon').className = 'drop-icon-bounce'; document.getElementById('modal-desc').innerHTML = desc;
  document.getElementById('modal-close').style.display = 'block'; document.getElementById('drop-modal').classList.remove('hidden');
}
document.getElementById('modal-close')?.addEventListener('click', () => { document.getElementById('drop-modal').classList.add('hidden'); });

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  container.innerHTML = '';
  if (!state.leaderboard || state.leaderboard.length === 0) { container.innerHTML = '<p class="empty-text">Топ пока пуст или загружается...</p>'; return; }
  state.leaderboard.forEach((item, index) => {
    let rankBadge = `${index + 1}`;
    if (index === 0) rankBadge = '🏆 1'; else if (index === 1) rankBadge = '🥈 2'; else if (index === 2) rankBadge = '🥉 3';
    const isMe = item.id === currentUser.id;
    container.innerHTML += `<div class="leader-item ${isMe ? 'highlight' : ''}"><span class="leader-rank">${rankBadge}</span><span class="leader-name">${item.name} ${isMe ? '(Вы)' : ''}</span><span class="leader-score">${Number(item.vapor).toLocaleString()}</span></div>`;
  });
}

function scheduleLocalSave() { localStorage.setItem(PRIMARY_KEY, JSON.stringify(state)); }
function syncToGoogle() {
  if (!GOOGLE_SHEET_URL) return;
  state.meta.lastSaveTime = Date.now();
  const payload = JSON.stringify({
    tgId: currentUser.id, username: currentUser.name, vapor: state.vapor, primeCoins: state.primeCoins,
    equippedTank: state.equippedTank, coupons: state.coupons, unlockedTanks: state.unlockedTanks,
    inventory: state.inventory, activeBuffs: state.activeBuffs, meta: state.meta
  });
  fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(payload) }).catch(() => {});
}
setInterval(syncToGoogle, 10000);

window.onTopLoaded = function(data) { if (data && data.status === "ok") { state.leaderboard = data.top; updateUI(); } };
function loadLeaderboard() { if (GOOGLE_SHEET_URL) { const s = document.createElement('script'); s.src = `${GOOGLE_SHEET_URL}?action=get_top&callback=onTopLoaded&t=${Date.now()}`; document.head.appendChild(s); } }

// ПАССИВНЫЙ ДОХОД И ЕЖЕДНЕВКИ
function processOfflineAndDaily() {
  const now = Date.now();
  const currentDateStr = new Date().toLocaleDateString();
  let modalContent = "";

  // Оффлайн фарм (максимум 12 часов = 43200 секунд)
  const timeDiff = Math.floor((now - state.meta.lastSaveTime) / 1000);
  if (timeDiff > 60) {
    const passiveSeconds = Math.min(timeDiff, 43200);
    const tankBase = TANKS[state.equippedTank]?.baseClick || 1;
    // Оффлайн доход = 50% от базовой силы клика в секунду
    const offlineIncome = Math.floor(passiveSeconds * (tankBase * 0.5));
    if (offlineIncome > 0) {
      state.primeCoins += offlineIncome;
      modalContent += `<div class="daily-box"><div class="daily-day">Оффлайн Доход</div><div class="daily-reward">Бак нафармил: <strong>+${offlineIncome.toLocaleString()} PC</strong></div></div>`;
    }
  }

  // Ежедневная награда
  if (state.meta.lastDailyDate !== currentDateStr) {
    const hoursSinceLastDaily = (now - (state.meta.lastDailyTime || 0)) / 3600000;
    if (hoursSinceLastDaily > 48 && state.meta.lastDailyDate !== "") {
      state.meta.dailyStreak = 1; // Пропуск дня сбрасывает стрик
    } else {
      state.meta.dailyStreak = (state.meta.dailyStreak || 0) + 1;
    }
    
    let rewardText = "";
    if (state.meta.dailyStreak === 1) { state.primeCoins += 1000; rewardText = "+1,000 PrimeCoins"; }
    else if (state.meta.dailyStreak === 2) { state.primeCoins += 5000; rewardText = "+5,000 PrimeCoins"; }
    else if (state.meta.dailyStreak === 3) { if(!state.inventory.liquids['russia']) state.inventory.liquids['russia']=0; state.inventory.liquids['russia']++; rewardText = "Жидкость (Россия) x1"; }
    else if (state.meta.dailyStreak === 4) { state.primeCoins += 25000; rewardText = "+25,000 PrimeCoins"; }
    else if (state.meta.dailyStreak === 5) { if(!state.inventory.coils['fused']) state.inventory.coils['fused']=0; state.inventory.coils['fused']++; rewardText = "Койл Fused Clapton x1"; }
    else if (state.meta.dailyStreak === 6) { state.primeCoins += 100000; rewardText = "+100,000 PrimeCoins"; }
    else { 
      const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      state.coupons.push({ discount: '10%', code });
      rewardText = `Промокод 10% на кейс АКБ!<br><span style="font-family:monospace; color:#ffaa00;">${code}</span>`;
      state.meta.dailyStreak = 0; // Ресет после 7 дня
    }

    state.meta.lastDailyDate = currentDateStr;
    state.meta.lastDailyTime = now;
    modalContent += `<div class="daily-box"><div class="daily-day">День ${state.meta.dailyStreak || 7}</div><div class="daily-reward">Ежедневный бонус:<br><strong>${rewardText}</strong></div></div>`;
  }

  if (modalContent !== "") {
    showModal('С возвращением!', '👋', modalContent);
  }

  state.meta.lastSaveTime = Date.now();
  scheduleLocalSave();
}

window.onGoogleSheetDataLoaded = function(data) {
  if (data && data.status === "ok") {
    state.vapor = Number(data.vapor) || 0; state.primeCoins = Number(data.primeCoins) || 0;
    if (data.unlockedTanks && Array.isArray(data.unlockedTanks)) state.unlockedTanks = data.unlockedTanks;
    if (data.inventory) state.inventory = data.inventory;
    if (data.activeBuffs) state.activeBuffs = data.activeBuffs;
    if (data.meta) state.meta = data.meta;
    if (data.equippedTank && TANKS[data.equippedTank]) {
      state.equippedTank = data.equippedTank;
      if (!state.unlockedTanks.includes(data.equippedTank)) state.unlockedTanks.push(data.equippedTank);
    }
    if (data.coupons) state.coupons = data.coupons;
    processOfflineAndDaily(); updateUI(); syncMusic();
  } else if (data && data.status === "not_found") {
    processOfflineAndDaily(); updateUI(); scheduleLocalSave(); syncToGoogle();
  }
  loadLeaderboard();
};

function loadState() {
  const saved = localStorage.getItem(PRIMARY_KEY);
  if (saved) { try { state = Object.assign(state, JSON.parse(saved)); } catch (e) {} }
  if (!state.inventory) state.inventory = { coils: {}, liquids: {} };
  if (!state.activeBuffs) state.activeBuffs = { coil: null, liquid: null };
  if (!state.meta) state.meta = { lastSaveTime: Date.now(), dailyStreak: 0, lastDailyDate: "" };

  if (GOOGLE_SHEET_URL) {
    const s = document.createElement('script'); s.src = `${GOOGLE_SHEET_URL}?tgId=${currentUser.id}&callback=onGoogleSheetDataLoaded&t=${Date.now()}`; document.head.appendChild(s);
  } else { loadLeaderboard(); processOfflineAndDaily(); updateUI(); syncMusic(); }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active'); document.getElementById(btn.dataset.tab)?.classList.add('active');
    syncToGoogle();
  });
});

loadState();

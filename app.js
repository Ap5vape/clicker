const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready(); tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
}
window.openTgLink = function(url) {
  if (tg && tg.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
};
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwT9o46pqdgTHtJjGKikuaomwG8G1C-bZAzCDuL4F4fyb102BqM-TNZxSIQRuezjPlG/exec";
const PRIMARY_KEY = `prime_acc_${tg?.initDataUnsafe?.user?.id || 'guest'}_v10`;

const tankMusic = new Audio('assets/track.mp3');
tankMusic.loop = true; tankMusic.volume = 0.5;

function syncMusic() {
  const current = TANKS[state.equippedTank];
  if (current && current.hasAudio) {
    if (tankMusic.paused) tankMusic.play().catch(()=>{});
  } else {
    if (!tankMusic.paused) { tankMusic.pause(); tankMusic.currentTime = 0; }
  }
}

let state = {
  vapor: 0, primeCoins: 0, equippedTank: 'berserker', unlockedTanks: ['berserker'],
  inventory: { coils: {}, liquids: {} }, activeBuffs: { coil: null, liquid: null },
  coupons: [], leaderboard: [],
  meta: { lastSaveTime: Date.now(), dailyStreak: 0, lastDailyDate: "" }
};

let serverTimeOffset = 0; // Разница между локальным временем и сервером

const TANKS = {
  berserker:   { id: 'berserker', name: 'Berserker V2', image: 'assets/berserker_v2.png', price: 0, baseClick: 1, lucky2: 0, lucky3: 0, desc: 'База: 1 пар.' },
  ares:        { id: 'ares', name: 'Innokin Ares 2', image: 'assets/ares.png', price: 1500, baseClick: 2, lucky2: 0.02, lucky3: 0, desc: 'База: 2 пар. 2% Lucky x2' },
  siren:       { id: 'siren', name: 'Siren 2 GTA', image: 'assets/siren.png', price: 4500, baseClick: 3, lucky2: 0.03, lucky3: 0, desc: 'База: 3 пар. 3% Lucky x2' },
  hastur:      { id: 'hastur', name: 'Cthulhu Hastur', image: 'assets/hastur.png', price: 12000, baseClick: 4, lucky2: 0.04, lucky3: 0, desc: 'База: 4 пар. 4% Lucky x2' },
  zeus:        { id: 'zeus', name: 'Zeus Sub-Ohm', image: 'assets/zeus.png', price: 30000, baseClick: 6, lucky2: 0.05, lucky3: 0, desc: 'База: 6 пар. 5% Lucky x2' },
  ammit:       { id: 'ammit', name: 'Ammit MTL RTA', image: 'assets/ammit.png', price: 75000, baseClick: 9, lucky2: 0.06, lucky3: 0, desc: 'База: 9 пар. 6% Lucky x2' },
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

const COILS = {
  mono: { id: 'mono', name: 'Моножила', icon: '➰', price: 1000, bonus: 2, maxClicks: 200, desc: '+2 Пар/клик (на 200 тапов)' },
  fused: { id: 'fused', name: 'Fused Clapton', icon: '🪢', price: 6000, bonus: 5, maxClicks: 500, desc: '+5 Пар/клик (на 500 тапов)' },
  staggered: { id: 'staggered', name: 'Staggered', icon: '⛓️', price: 25000, bonus: 15, maxClicks: 1000, desc: '+15 Пар/клик (на 1к тапов)' },
  alien: { id: 'alien', name: 'Diesel Alien', icon: '🧬', price: 100000, bonus: 40, maxClicks: 2500, desc: '+40 Пар/клик (на 2.5к тапов)' }
};

const LIQUIDS = {
  russia: { id: 'russia', name: 'Жидкость (Россия)', icon: '🇷🇺', price: 2000, bonus: 3, maxClicks: 200, desc: '+3 Пар/клик (на 200 тапов)' },
  usa: { id: 'usa', name: 'Жидкость (США)', icon: '🇺🇸', price: 10000, bonus: 10, maxClicks: 500, desc: '+10 Пар/клик (на 500 тапов)' },
  malaysia: { id: 'malaysia', name: 'Жидкость (Малайзия)', icon: '🇲🇾', price: 30000, bonus: 25, maxClicks: 1000, desc: '+25 Пар/клик (на 1к тапов)' },
  royalduck: { id: 'royalduck', name: 'RoyalDuck', icon: '🦆', price: 150000, bonus: 100, maxClicks: 2500, desc: '+100 Пар/клик (на 2.5к тапов)' }
};

const RANKS = [
  { min: 0, max: 2000, title: 'Респектовый' }, { min: 2000, max: 15000, title: 'Локал бой' },
  { min: 15000, max: 100000, title: 'Вейпер' }, { min: 100000, max: 500000, title: 'Тру вейпер' },
  { min: 500000, max: 5000000, title: 'PrimeВейпер' }, { min: 5000000, max: Infinity, title: 'Легенда пара' }
];

const CASES = [
  { id: 'case_1', title: 'Бюджетный кейс', cost: 500, minCoins: 10, maxCoins: 40, couponChance: 0.0001 },
  { id: 'case_2', title: 'Стандартный кейс', cost: 2500, minCoins: 60, maxCoins: 200, couponChance: 0.0005 },
  { id: 'case_3', title: 'Опытный кейс', cost: 15000, minCoins: 400, maxCoins: 1200, couponChance: 0.001 },
  { id: 'case_4', title: 'Prime Кейс', cost: 100000, minCoins: 3000, maxCoins: 8000, couponChance: 0.002 },
  { id: 'case_5', title: 'Элитный кейс', cost: 500000, minCoins: 18000, maxCoins: 45000, couponChance: 0.003 },
  { id: 'case_6', title: 'High-End кейс', cost: 2500000, minCoins: 90000, maxCoins: 250000, couponChance: 0.004 },
  { id: 'case_7', title: 'Легендарный кейс', cost: 10000000, minCoins: 400000, maxCoins: 1200000, couponChance: 0.005 }
];

const canvas = document.getElementById('steam-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let isOpeningCase = false;

function resizeCanvas() { if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

class SteamParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 50;
    this.startY = y; this.y = y;
    this.radius = 20 + Math.random() * 20;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -2 - Math.random() * 3;
    this.baseAlpha = 0.6; this.alpha = 0.6;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.radius += 0.5;
    let progress = 1 - (this.y / this.startY);
    this.alpha = this.baseAlpha * (1 - progress * 1.5);
  }
  draw() {
    if (!ctx || this.alpha <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 235, 245, ${this.alpha})`;
    ctx.shadowBlur = 15; ctx.shadowColor = `rgba(255, 255, 255, ${this.alpha * 0.5})`;
    ctx.fill(); ctx.restore();
  }
}

function renderSteam() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(); particles[i].draw();
      if (particles[i].alpha <= 0 || particles[i].y < -50) particles.splice(i, 1);
    }
  }
  requestAnimationFrame(renderSteam);
}
renderSteam();

let heat = 0; let isOverheated = false; let lastClickTime = 0;
setInterval(() => { if (heat > 0 && !isOverheated) { heat -= 15; if (heat < 0) heat = 0; updateHeatUI(); } }, 200);

function updateHeatUI() {
  const bar = document.getElementById('heat-fill');
  if (bar) bar.style.width = `${Math.min((heat / 500) * 100, 100)}%`;
}

document.getElementById('tank-target')?.addEventListener('pointerdown', (e) => {
  if (isOverheated) return;
  const now = Date.now();
  if (now - lastClickTime < 40) return;
  lastClickTime = now;

  heat += 12; updateHeatUI();
  if (heat >= 500) {
    isOverheated = true;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    document.getElementById('overheat-overlay')?.classList.add('active');
    setTimeout(() => { isOverheated = false; heat = 0; updateHeatUI(); document.getElementById('overheat-overlay')?.classList.remove('active'); }, 4000);
    return;
  }

  const currentTank = TANKS[state.equippedTank] || TANKS.berserker;
  let coilBonus = 0; let liquidBonus = 0;

  // ИЗНОС РАСХОДНИКОВ (ИСПРАВЛЕННЫЙ)
  if (state.activeBuffs.coil) {
    coilBonus = COILS[state.activeBuffs.coil.id].bonus;
    state.activeBuffs.coil.clicksLeft--;
    if (state.activeBuffs.coil.clicksLeft <= 0) state.activeBuffs.coil = null;
  }
  if (state.activeBuffs.liquid) {
    liquidBonus = LIQUIDS[state.activeBuffs.liquid.id].bonus;
    state.activeBuffs.liquid.clicksLeft--;
    if (state.activeBuffs.liquid.clicksLeft <= 0) state.activeBuffs.liquid = null;
  }

  let base = currentTank.baseClick + coilBonus + liquidBonus;
  let mult = 1; let luckyClass = '';
  const roll = Math.random();

  if (currentTank.lucky3 > 0 && roll < currentTank.lucky3) { mult = 3; luckyClass = 'lucky-3'; if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); }
  else if (currentTank.lucky2 > 0 && roll < (currentTank.lucky3 + currentTank.lucky2)) { mult = 2; luckyClass = 'lucky-2'; if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy'); }
  else { if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); }

  const earned = base * mult;
  state.vapor += earned;
  
  const rect = e.currentTarget.getBoundingClientRect();
  for(let i=0; i<6; i++) particles.push(new SteamParticle(rect.left + rect.width / 2, rect.top + rect.height / 2 - 20));
  
  const el = document.createElement('div'); el.className = `tap-particle ${luckyClass}`; el.innerText = `+${earned.toLocaleString()}`;
  el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY}px`; document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);

  if (mult > 1) {
    const flash = document.createElement('div'); flash.className = `screen-flash ${mult === 3 ? 'x3' : ''}`;
    document.body.appendChild(flash); setTimeout(() => flash.remove(), 400);
  }

  updateUI(); scheduleLocalSave();
});

function updateUI() {
  document.getElementById('vapor-display').innerText = state.vapor.toLocaleString();
  document.getElementById('coins-display').innerText = state.primeCoins.toLocaleString();

  let cRank = RANKS[0]; let nRank = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (state.vapor >= RANKS[i].min && state.vapor < RANKS[i].max) { cRank = RANKS[i]; nRank = RANKS[i+1] || null; break; }
  }
  document.getElementById('player-status').innerText = cRank.title;
  if (nRank) {
    document.getElementById('level-progress-bar').style.width = `${Math.min(((state.vapor - cRank.min) / (nRank.min - cRank.min)) * 100, 100)}%`;
    document.getElementById('level-progress-text').innerText = `${state.vapor.toLocaleString()} / ${nRank.min.toLocaleString()} до ${nRank.title}`;
  } else {
    document.getElementById('level-progress-bar').style.width = '100%'; document.getElementById('level-progress-text').innerText = 'Максимальный уровень';
  }

  const current = TANKS[state.equippedTank];
  document.getElementById('current-tank-name').innerText = current.name;
  document.getElementById('tank-perk').innerText = current.desc;
  const imgEl = document.getElementById('tank-image');
  if (imgEl && !imgEl.src.includes(current.image)) imgEl.src = current.image;

  renderActiveBuffs(); renderShop(); renderInventory(); renderCases(); renderLeaderboard();
}

function renderActiveBuffs() {
  const cCont = document.getElementById('active-coil'); const lCont = document.getElementById('active-liquid');
  if (state.activeBuffs.coil) {
    const c = COILS[state.activeBuffs.coil.id]; const pct = (state.activeBuffs.coil.clicksLeft / c.maxClicks) * 100;
    cCont.innerHTML = `<span class="buff-icon">${c.icon}</span><span class="buff-name">${c.name}</span><div class="buff-hp-bg"><div class="buff-hp-fill" style="width:${pct}%; background:${pct<20?'#da3633':'#238636'}"></div></div>`;
  } else cCont.innerHTML = `<span class="buff-icon" style="opacity:0.3">➰</span><span class="buff-name" style="color:#8b92a5">Нет койла</span><div class="buff-hp-bg"></div>`;
  if (state.activeBuffs.liquid) {
    const l = LIQUIDS[state.activeBuffs.liquid.id]; const pct = (state.activeBuffs.liquid.clicksLeft / l.maxClicks) * 100;
    lCont.innerHTML = `<span class="buff-icon">${l.icon}</span><span class="buff-name">${l.name}</span><div class="buff-hp-bg"><div class="buff-hp-fill" style="width:${pct}%; background:${pct<20?'#da3633':'#238636'}"></div></div>`;
  } else lCont.innerHTML = `<span class="buff-icon" style="opacity:0.3">💧</span><span class="buff-name" style="color:#8b92a5">Нет жижи</span><div class="buff-hp-bg"></div>`;
}

function renderShop() {
  const c = document.getElementById('shop-list'); if (!c) return; c.innerHTML = `<div class="shop-section-title">Железо (Баки)</div>`;
  Object.values(TANKS).forEach(t => {
    if (state.unlockedTanks.includes(t.id)) return;
    c.innerHTML += `<div class="item-card"><div><strong>${t.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${t.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${t.price.toLocaleString()} PC</span></div><button class="item-btn" ${state.primeCoins < t.price ? 'disabled' : ''} onclick="buyTank('${t.id}')">Купить</button></div>`;
  });
  c.innerHTML += `<div class="shop-section-title">Жидкости</div>`;
  Object.values(LIQUIDS).forEach(l => {
    c.innerHTML += `<div class="item-card"><div><strong>${l.icon} ${l.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${l.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${l.price.toLocaleString()} PC</span></div><button class="item-btn" ${state.primeCoins < l.price ? 'disabled' : ''} onclick="buyItem('liquids', '${l.id}')">Купить</button></div>`;
  });
  c.innerHTML += `<div class="shop-section-title">Намотки (Койлы)</div>`;
  Object.values(COILS).forEach(cl => {
    c.innerHTML += `<div class="item-card"><div><strong>${cl.icon} ${cl.name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${cl.desc}</p><span style="font-size:0.85rem; color:#ffaa00; font-weight:700;">${cl.price.toLocaleString()} PC</span></div><button class="item-btn" ${state.primeCoins < cl.price ? 'disabled' : ''} onclick="buyItem('coils', '${cl.id}')">Купить</button></div>`;
  });
}

function renderInventory() {
  const c = document.getElementById('inventory-list');
  if (!c) return;
  c.innerHTML = '';

  // 1. КУПОНЫ И САЙТ КАСТОМА (ПЕРВЫМИ)
  c.innerHTML += `<div class="shop-section-title">Скидочные купоны и кастом</div>`;
  
  if (state.coupons && state.coupons.length > 0) {
    state.coupons.forEach(cp => {
      c.innerHTML += `
        <div class="item-card">
          <div>
            <strong>Скидка ${cp.discount} на кейс АКБ</strong>
            <p style="font-size:0.85rem; color:#ffaa00; font-family:monospace; margin-top:4px; font-weight:700;">${cp.code}</p>
          </div>
        </div>`;
    });
  } else {
    c.innerHTML += `<p class="empty-text" style="padding: 6px 0 10px 0; font-size: 0.8rem;">У вас пока нет купонов. Их можно выбить в кейсах.</p>`;
  }

  c.innerHTML += `
    <div style="margin-bottom: 15px;">
      <button class="primary-btn" style="margin-top: 5px;" onclick="openExternalLink('https://ap5vape.github.io/Prime/')">Заказать кастомный кейс</button>
    </div>
  `;

  // 2. БАКИ
  c.innerHTML += `<div class="shop-section-title">Мои Баки</div>`;
  state.unlockedTanks.forEach(id => {
    const isEq = state.equippedTank === id;
    c.innerHTML += `
      <div class="item-card">
        <div><strong>${TANKS[id].name}</strong><p style="font-size:0.8rem; color:#8b92a5;">${TANKS[id].desc}</p></div>
        <div style="display:flex; gap:6px;">
          ${isEq ? `<button class="item-btn equipped">Надет</button>` : `<button class="item-btn" onclick="equipTank('${id}')">Надеть</button>`}
          ${(!isEq && TANKS[id].price > 0) ? `<button class="item-btn sell" onclick="sellTank('${id}')">Флип</button>` : ''}
        </div>
      </div>`;
  });

  // 3. ЖИДКОСТИ
  const liqs = Object.keys(state.inventory.liquids).filter(k => state.inventory.liquids[k] > 0);
  if (liqs.length > 0) {
    c.innerHTML += `<div class="shop-section-title">Мои Жидкости</div>`;
    liqs.forEach(id => {
      c.innerHTML += `
        <div class="item-card">
          <div><strong>${LIQUIDS[id].icon} ${LIQUIDS[id].name} (x${state.inventory.liquids[id]})</strong><p style="font-size:0.8rem; color:#8b92a5;">${LIQUIDS[id].desc}</p></div>
          <button class="item-btn" onclick="equipItem('liquid', '${id}')">Залить</button>
        </div>`;
    });
  }

  // 4. КОЙЛЫ
  const cls = Object.keys(state.inventory.coils).filter(k => state.inventory.coils[k] > 0);
  if (cls.length > 0) {
    c.innerHTML += `<div class="shop-section-title">Мои Койлы</div>`;
    cls.forEach(id => {
      c.innerHTML += `
        <div class="item-card">
          <div><strong>${COILS[id].icon} ${COILS[id].name} (x${state.inventory.coils[id]})</strong><p style="font-size:0.8rem; color:#8b92a5;">${COILS[id].desc}</p></div>
          <button class="item-btn" onclick="equipItem('coil', '${id}')">Поставить</button>
        </div>`;
    });
  }
}

// ИСПРАВЛЕНИЕ ВЫВОДА КЕЙСОВ
function renderCases() {
  const c = document.getElementById('cases-list'); if (!c) return; c.innerHTML = '';
  CASES.forEach(cs => {
    const div = document.createElement('div'); div.className = 'item-card';
    div.innerHTML = `<div><strong>${cs.title}</strong><p style="font-size:0.8rem; color:#8b92a5;">${cs.minCoins.toLocaleString()}-${cs.maxCoins.toLocaleString()} PC | Купон (${(cs.couponChance * 100).toFixed(2)}%)</p><span style="font-size:0.85rem; color:#ff6b00; font-weight:700;">${cs.cost.toLocaleString()} пар</span></div><button class="item-btn" ${state.vapor < cs.cost || isOpeningCase ? 'disabled' : ''} onclick="openCase('${cs.id}')">Открыть</button>`;
    c.appendChild(div);
  });
}

window.buyTank = function(id) { if (state.primeCoins >= TANKS[id].price) { state.primeCoins -= TANKS[id].price; state.unlockedTanks.push(id); state.equippedTank = id; updateUI(); scheduleLocalSave(); } };
window.buyItem = function(t, id) { const p = t==='coils'?COILS[id].price:LIQUIDS[id].price; if (state.primeCoins >= p) { state.primeCoins -= p; if(!state.inventory[t][id]) state.inventory[t][id]=0; state.inventory[t][id]++; updateUI(); scheduleLocalSave(); } };
window.equipTank = function(id) { state.equippedTank = id; syncMusic(); updateUI(); scheduleLocalSave(); };
window.sellTank = function(id) { const p = TANKS[id].price; if(p===0 || state.equippedTank===id) return; state.unlockedTanks = state.unlockedTanks.filter(t=>t!==id); state.primeCoins += Math.floor(p * (0.4 + Math.random()*0.6)); updateUI(); scheduleLocalSave(); };
window.equipItem = function(t, id) {
  const tKey = t==='coil'?'coils':'liquids';
  if (state.inventory[tKey][id] > 0) {
    // Если уже стоял другой расходник, он сгорает (как в реальности)
    state.inventory[tKey][id]--;
    state.activeBuffs[t] = { id: id, clicksLeft: t==='coil'?COILS[id].maxClicks:LIQUIDS[id].maxClicks };
    updateUI(); scheduleLocalSave();
  }
};

window.openCase = function(id) {
  if (isOpeningCase) return; const cs = CASES.find(x => x.id === id); if (state.vapor < cs.cost) return;
  isOpeningCase = true; state.vapor -= cs.cost; updateUI(); scheduleLocalSave();
  const m = document.getElementById('drop-modal'); const i = document.getElementById('modal-icon');
  document.getElementById('modal-title').innerText = 'Распаковка...'; document.getElementById('modal-desc').innerText = 'Открываем...';
  i.innerText = '📦'; i.className = 'drop-icon-bounce case-opening-anim'; document.getElementById('modal-close').style.display = 'none'; m.classList.remove('hidden');
  
  setTimeout(() => {
    isOpeningCase = false; i.className = 'drop-icon-bounce'; document.getElementById('modal-close').style.display = 'block';
    if (Math.random() < cs.couponChance) {
      const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`; state.coupons.push({ discount: '10%', code });
      document.getElementById('modal-title').innerText = 'ДРОП!'; i.innerText = '🔋'; document.getElementById('modal-desc').innerText = `Промокод 10%!\nКод: ${code}`;
    } else {
      const w = Math.floor(Math.random() * (cs.maxCoins - cs.minCoins + 1)) + cs.minCoins; state.primeCoins += w;
      document.getElementById('modal-title').innerText = 'Коины!'; i.innerText = '🪙'; let d = `+${w.toLocaleString()} PC.`;
      if(Math.random() < 0.0025) {
        const tr = Math.random()>0.5?'coils':'liquids'; const drID = tr==='coils'?'mono':'russia';
        if(!state.inventory[tr][drID]) state.inventory[tr][drID]=0; state.inventory[tr][drID]++;
        d += `\nБонус: ${tr==='coils'?COILS[drID].name:LIQUIDS[drID].name}`;
      }
      document.getElementById('modal-desc').innerText = d;
    }
    updateUI(); scheduleLocalSave();
  }, 1500);
};

document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('drop-modal').classList.add('hidden'));

function renderLeaderboard() {
  const c = document.getElementById('leaderboard-list'); if (!c) return; c.innerHTML = '';
  if (!state.leaderboard || state.leaderboard.length === 0) { c.innerHTML = '<p class="empty-text">Топ пока пуст...</p>'; return; }
  state.leaderboard.forEach((item, idx) => {
    const isMe = item.id === (tg?.initDataUnsafe?.user?.id || 'guest');
    c.innerHTML += `<div class="leader-item ${isMe ? 'highlight' : ''}"><span class="leader-rank">${idx===0?'🏆 1':idx===1?'🥈 2':idx===2?'🥉 3':idx+1}</span><span class="leader-name">${item.name} ${isMe ? '(Вы)' : ''}</span><span class="leader-score">${item.vapor.toLocaleString()}</span></div>`;
  });
}

function scheduleLocalSave() { localStorage.setItem(PRIMARY_KEY, JSON.stringify(state)); }
function syncToGoogle() {
  if (!GOOGLE_SHEET_URL) return;
  fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
    body: "data=" + encodeURIComponent(JSON.stringify({ tgId: tg?.initDataUnsafe?.user?.id || 'guest', username: tg?.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : "Игрок", vapor: state.vapor, primeCoins: state.primeCoins, equippedTank: state.equippedTank, coupons: state.coupons, unlockedTanks: state.unlockedTanks, inventory: state.inventory, activeBuffs: state.activeBuffs, meta: state.meta })) 
  }).catch(()=>{});
}
setInterval(syncToGoogle, 10000);

window.onTopLoaded = function(d) { if (d && d.status === "ok") { state.leaderboard = d.top; updateUI(); } };

window.onGoogleSheetDataLoaded = function(d) {
  if (d && d.status === "ok") {
    state = Object.assign(state, { vapor: d.vapor, primeCoins: d.primeCoins, unlockedTanks: d.unlockedTanks, inventory: d.inventory, activeBuffs: d.activeBuffs, meta: d.meta, equippedTank: d.equippedTank, coupons: d.coupons });
    serverTimeOffset = d.serverTime - Date.now();
  }
  processOfflineAndDaily(); updateUI(); syncMusic();
  if (GOOGLE_SHEET_URL) { const s = document.createElement('script'); s.src = `${GOOGLE_SHEET_URL}?action=get_top&callback=onTopLoaded&t=${Date.now()}`; document.head.appendChild(s); }
};

function processOfflineAndDaily() {
  const realNow = Date.now() + serverTimeOffset; // Защита от накрутки времени на телефоне
  const curDate = new Date(realNow).toLocaleDateString(); let m = "";
  const tDiff = Math.floor((realNow - state.meta.lastSaveTime) / 1000);
  if (tDiff > 60) {
    const inc = Math.floor(Math.min(tDiff, 43200) * ((TANKS[state.equippedTank]?.baseClick || 1) * 0.5));
    if (inc > 0) { state.primeCoins += inc; m += `<div class="daily-box"><div class="daily-day">Оффлайн</div><div class="daily-reward">+${inc.toLocaleString()} PC</div></div>`; }
  }
  if (state.meta.lastDailyDate !== curDate) {
    if ((realNow - (state.meta.lastDailyTime || 0))/3600000 > 48 && state.meta.lastDailyDate !== "") state.meta.dailyStreak = 1; else state.meta.dailyStreak = (state.meta.dailyStreak || 0) + 1;
    let r = "";
    if (state.meta.dailyStreak === 1) { state.primeCoins += 1000; r = "+1,000 PC"; }
    else if (state.meta.dailyStreak === 2) { state.primeCoins += 5000; r = "+5,000 PC"; }
    else if (state.meta.dailyStreak === 3) { if(!state.inventory.liquids['russia']) state.inventory.liquids['russia']=0; state.inventory.liquids['russia']++; r = "Жидкость (Россия) x1"; }
    else if (state.meta.dailyStreak === 4) { state.primeCoins += 25000; r = "+25,000 PC"; }
    else if (state.meta.dailyStreak === 5) { if(!state.inventory.coils['fused']) state.inventory.coils['fused']=0; state.inventory.coils['fused']++; r = "Койл Fused x1"; }
    else if (state.meta.dailyStreak === 6) { state.primeCoins += 100000; r = "+100,000 PC"; }
    else { const code = `PRIME-10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`; state.coupons.push({ discount: '10%', code }); r = `Промокод 10%!<br><span style="font-family:monospace; color:#ffaa00;">${code}</span>`; state.meta.dailyStreak = 0; }
    state.meta.lastDailyDate = curDate; state.meta.lastDailyTime = realNow;
    m += `<div class="daily-box"><div class="daily-day">День ${state.meta.dailyStreak||7}</div><div class="daily-reward">${r}</div></div>`;
  }
  if (m !== "") { document.getElementById('modal-title').innerText='С возвращением!'; document.getElementById('modal-icon').innerText='👋'; document.getElementById('modal-desc').innerHTML=m; document.getElementById('modal-close').style.display='block'; document.getElementById('drop-modal').classList.remove('hidden'); }
  state.meta.lastSaveTime = realNow; scheduleLocalSave();
}

function loadState() {
  const saved = localStorage.getItem(PRIMARY_KEY); if (saved) { try { state = Object.assign(state, JSON.parse(saved)); } catch (e) {} }
  if (GOOGLE_SHEET_URL) { const s = document.createElement('script'); s.src = `${GOOGLE_SHEET_URL}?tgId=${tg?.initDataUnsafe?.user?.id || 'guest'}&callback=onGoogleSheetDataLoaded&t=${Date.now()}`; document.head.appendChild(s); }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn, .view-tab').forEach(e => e.classList.remove('active'));
    btn.classList.add('active'); document.getElementById(btn.dataset.tab)?.classList.add('active');
    syncToGoogle();
  });
});

loadState();

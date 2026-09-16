const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwT9o46pqdgTHtJjGKikuaomwG8G1C-bZAzCDuL4F4fyb102BqM-TNZxSIQRuezjPlG/exec";

// Настройка аудио
const tankMusic = new Audio('assets/track.mp3');
tankMusic.loop = true;
tankMusic.volume = 0.5;

function syncMusic() {
  const current = TANKS[state.equippedTank];
  if (current && current.hasAudio) {
    if (tankMusic.paused) {
      tankMusic.play().catch(() => {});
    }
  } else {
    if (!tankMusic.paused) {
      tankMusic.pause();
      tankMusic.currentTime = 0;
    }
  }
}

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

  let guestId = localStorage.getItem('prime_guest_uid_v7');
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('prime_guest_uid_v7', guestId);
  }

  return {
    id: guestId,
    name: "Гость (" + guestId.slice(-4) + ")"
  };
}

const currentUser = getTelegramUser();
const PRIMARY_KEY = `prime_acc_${currentUser.id}_v7`;

let state = {
  clicks: 0,
  primeCoins: 0,
  equippedTank: 'berserker',
  unlockedTanks: ['berserker'],
  coupons: [],
  leaderboard: []
};

const TANKS = {
  berserker:   { id: 'berserker', name: 'Berserker V2', image: 'assets/berserker_v2.png', price: 0, lucky2: 0.00, lucky3: 0.00, desc: 'MTL классика. Базовый обдув' },
  ares:        { id: 'ares', name: 'Innokin Ares 2', image: 'assets/ares.png', price: 300, lucky2: 0.02, lucky3: 0.00, desc: 'Простая регулировка обдува, 2% Lucky x2' },
  siren:       { id: 'siren', name: 'Siren 2 GTA', image: 'assets/siren.png', price: 750, lucky2: 0.03, lucky3: 0.00, desc: 'GTA-система, 3% Lucky x2' },
  hastur:      { id: 'hastur', name: 'Cthulhu Hastur', image: 'assets/hastur.png', price: 1500, lucky2: 0.04, lucky3: 0.00, desc: 'Компактная камера, 4% Lucky x2' },
  zeus:        { id: 'zeus', name: 'Zeus Sub-Ohm', image: 'assets/zeus.png', price: 2500, lucky2: 0.05, lucky3: 0.00, desc: 'Верхний забор воздуха, 5% Lucky x2' },
  ammit:       { id: 'ammit', name: 'Ammit MTL RTA', image: 'assets/ammit.png', price: 3500, lucky2: 0.06, lucky3: 0.00, desc: 'Отличная вкусопередача, 6% Lucky x2' },
  bishop:      { id: 'bishop', name: 'Bishop MTL', image: 'assets/bishop.png', price: 5000, lucky2: 0.07, lucky3: 0.01, desc: 'Бесшумная боковая подача, 7% x2, 1% x3' },
  neeko:       { id: 'neeko', name: 'Aspire Neeko', image: 'assets/neeko.png', price: 7500, lucky2: 0.08, lucky3: 0.01, desc: 'Сменные жиклеры, 8% x2, 1% x3' },
  pioneer:     { id: 'pioneer', name: 'Pioneer MTL', image: 'assets/pioneer.png', price: 11000, lucky2: 0.09, lucky3: 0.02, desc: 'Качественная база, 9% x2, 2% x3' },
  galaxies:    { id: 'galaxies', name: 'Galaxies MTL', image: 'assets/galaxies.png', price: 15000, lucky2: 0.10, lucky3: 0.02, desc: 'Сложный обдув, 10% x2, 2% x3' },
  kayfun_lite: { id: 'kayfun_lite', name: 'Kayfun Lite', image: 'assets/kayfun.png', price: 20000, lucky2: 0.11, lucky3: 0.02, desc: 'Легенда сигаретной тяги, 11% x2, 2% x3' },
  party:       { id: 'party', name: 'Apostol444 RTA', image: 'assets/party.png', price: 67, lucky2: 0.01, lucky3: 0.01, desc: 'Любимый бак апостола', hasAudio: true },
  dvarw:       { id: 'dvarw', name: 'Dvarw MTL FL', image: 'assets/dvarw.png', price: 28000, lucky2: 0.12, lucky3: 0.03, desc: 'Сухой плотный пар, 12% x2, 3% x3' },
  sputnik:     { id: 'sputnik', name: 'Sputnik RTA', image: 'assets/sputnik.png', price: 38000, lucky2: 0.13, lucky3: 0.03, desc: 'Кастомные воздуховоды, 13% x2, 3% x3' },
  fev:         { id: 'fev', name: 'Flash-e-Vapor', image: 'assets/fev.png', price: 50000, lucky2: 0.14, lucky3: 0.04, desc: 'Эталонный ТХ, 14% x2, 4% x3' },
  taifun:      { id: 'taifun', name: 'Taifun GTR', image: 'assets/taifun.png', price: 65000, lucky2: 0.15, lucky3: 0.04, desc: 'Двухканальный обдув, 15% x2, 4% x3' },
  byka:        { id: 'byka', name: 'BY-ka v.9', image: 'assets/byka.png', price: 85000, lucky2: 0.16, lucky3: 0.05, desc: 'Перекрытие подачи, 16% x2, 5% x3' },
  millennium:  { id: 'millennium', name: 'Millennium RTA', image: 'assets/millennium.png', price: 110000, lucky2: 0.17, lucky3: 0.05, desc: 'Итальянский кастом, 17% x2, 5% x3' },
  expromizer:  { id: 'expromizer', name: 'Expromizer V4', image: 'assets/expromizer.png', price: 150000, lucky2: 0.18, lucky3: 0.06, desc: 'Непроливайка, 18% x2, 6% x3' },
  kf_prime:    { id: 'kf_prime', name: 'Kayfun Prime', image: 'assets/kf_prime.png', price: 200000, lucky2: 0.19, lucky3: 0.06, desc: 'Идеальная MTL тяга, 19% x2, 6% x3' },
  patibulum:   { id: 'patibulum', name: 'Patibulum', image: 'assets/patibulum.png', price: 280000, lucky2: 0.20, lucky3: 0.07, desc: 'Эксклюзив из Кореи, 20% x2, 7% x3' },
  hussar:      { id: 'hussar', name: 'Hussar RTA', image: 'assets/hussar.png', price: 380000, lucky2: 0.21, lucky3: 0.07, desc: 'Мягкий премиальный пар, 21% x2, 7% x3' },
  skyline:     { id: 'skyline', name: 'Skyline RTA', image: 'assets/skyline.png', price: 500000, lucky2: 0.22, lucky3: 0.08, desc: 'Сменные airdisks, 22% x2, 8% x3' },
  kf_x:        { id: 'kf_x', name: 'Kayfun X', image: 'assets/kf_x.png', price: 750000, lucky2: 0.23, lucky3: 0.08, desc: 'Современная классика, 23% x2, 8% x3' },
  tripod:      { id: 'tripod', name: 'Tripod RTA', image: 'assets/tripod.png', price: 1000000, lucky2: 0.24, lucky3: 0.09, desc: 'Тонкая настройка базы, 24% x2, 9% x3' },
  integra:     { id: 'integra', name: 'Integra RTA', image: 'assets/integra.png', price: 1500000, lucky2: 0.25, lucky3: 0.09, desc: 'Редчайший High-End, 25% x2, 9% x3' },
  paravozz:    { id: 'paravozz', name: 'Paravozz Genesis', image: 'assets/paravozz.png', price: 2500000, lucky2: 0.26, lucky3: 0.10, desc: 'Абсолютный топ сетки, 26% x2, 10% x3' }
};

const RANKS = [
  { min: 0, max: 2000, title: 'Респектовый' },
  { min: 2000, max: 10000, title: 'Локал бой' },
  { min: 10000, max: 35000, title: 'Вейпер' },
  { min: 35000, max: 100000, title: 'Тру вейпер' },
  { min: 100000, max: 500000, title: 'PrimeВейпер' },
  { min: 500000, max: Infinity, title: 'Легенда пара' }
];

const CASES = [
  { id: 'case_500', title: 'Бюджетный кейс', cost: 500, minCoins: 40, maxCoins: 160, couponChance: 0.0035 },
  { id: 'case_1000', title: 'Стандартный кейс', cost: 1000, minCoins: 150, maxCoins: 450, couponChance: 0.005 },
  { id: 'case_5000', title: 'Опытный кейс', cost: 5000, minCoins: 900, maxCoins: 2500, couponChance: 0.0085 },
  { id: 'case_10000', title: 'Prime Кейс', cost: 10000, minCoins: 2200, maxCoins: 7500, couponChance: 0.0125 }
];

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

const tankTarget = document.getElementById('tank-target');
if (tankTarget) {
  tankTarget.addEventListener('pointerdown', (e) => {
    syncMusic();

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

    if (mult > 1) {
      const flash = document.createElement('div');
      flash.className = `screen-flash ${mult === 3 ? 'x3' : ''}`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    }

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

function updateUI() {
  const clicksEl = document.getElementById('clicks-display');
  const coinsEl = document.getElementById('coins-display');
  if (clicksEl) clicksEl.innerText = Number(state.clicks || 0).toLocaleString();
  if (coinsEl) coinsEl.innerText = Number(state.primeCoins || 0).toLocaleString();

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
  renderLeaderboard();
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  container.innerHTML = '';

  if (!state.leaderboard || state.leaderboard.length === 0) {
    container.innerHTML = '<p class="empty-text">Топ пока пуст или загружается...</p>';
    return;
  }

  state.leaderboard.forEach((item, index) => {
    let rankBadge = `${index + 1}`;
    if (index === 0) rankBadge = '🏆 1';
    else if (index === 1) rankBadge = '🥈 2';
    else if (index === 2) rankBadge = '🥉 3';

    const isMe = item.id === currentUser.id;

    const div = document.createElement('div');
    div.className = `leader-item ${isMe ? 'highlight' : ''}`;
    div.innerHTML = `
      <span class="leader-rank">${rankBadge}</span>
      <span class="leader-name">${item.name} ${isMe ? '(Вы)' : ''}</span>
      <span class="leader-score">${Number(item.clicks).toLocaleString()}</span>
    `;
    container.appendChild(div);
  });
}

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
        <p style="font-size:0.8rem; color:#8b92a5;">${c.minCoins}-${c.maxCoins} PC | Купон 10% (${(c.couponChance * 100).toFixed(2)}%)</p>
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
        <strong>Скидка ${cp.discount} на заказ</strong>
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
    syncMusic();
    updateUI();
    forceSave();
  }
};

window.equipTank = function(id) {
  if (state.unlockedTanks.includes(id)) {
    state.equippedTank = id;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    syncMusic();
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

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(forceSave, 800);
}

function forceSave() {
  const json = JSON.stringify(state);
  localStorage.setItem(PRIMARY_KEY, json);

  if (GOOGLE_SHEET_URL) {
    const payload = JSON.stringify({
      tgId: currentUser.id,
      username: currentUser.name,
      clicks: state.clicks,
      primeCoins: state.primeCoins,
      equippedTank: state.equippedTank,
      coupons: state.coupons
    });

    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(payload)
    }).catch(() => {});
  }
}

window.onTopLoaded = function(data) {
  if (data && data.status === "ok") {
    state.leaderboard = data.top;
    updateUI();
  }
};

function loadLeaderboard() {
  if (GOOGLE_SHEET_URL) {
    const script = document.createElement('script');
    script.src = `${GOOGLE_SHEET_URL}?action=get_top&callback=onTopLoaded&t=${Date.now()}`;
    document.head.appendChild(script);
  }
}

window.onGoogleSheetDataLoaded = function(data) {
  if (data && data.status === "ok") {
    state.clicks = Number(data.clicks) || 0;
    state.primeCoins = Number(data.primeCoins) || 0;
    if (data.equippedTank && TANKS[data.equippedTank]) {
      state.equippedTank = data.equippedTank;
      if (!state.unlockedTanks.includes(data.equippedTank)) {
        state.unlockedTanks.push(data.equippedTank);
      }
    }
    if (data.coupons) state.coupons = data.coupons;

    updateUI();
    syncMusic();
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(state));
  } else if (data && data.status === "not_found") {
    state = {
      clicks: 0,
      primeCoins: 0,
      equippedTank: 'berserker',
      unlockedTanks: ['berserker'],
      coupons: [],
      leaderboard: []
    };
    updateUI();
    forceSave();
  }
  loadLeaderboard();
};

function loadState() {
  const saved = localStorage.getItem(PRIMARY_KEY);
  if (saved) {
    try {
      state = Object.assign(state, JSON.parse(saved));
    } catch (e) {}
  }
  updateUI();
  syncMusic();

  if (GOOGLE_SHEET_URL) {
    const script = document.createElement('script');
    script.src = `${GOOGLE_SHEET_URL}?tgId=${currentUser.id}&callback=onGoogleSheetDataLoaded&t=${Date.now()}`;
    document.head.appendChild(script);
  } else {
    loadLeaderboard();
  }
}

loadState();

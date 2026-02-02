const tg = window.Telegram.WebApp;
tg.expand();

// --- ДАННЫЕ ИГРЫ ---
let score = 0;
let energy = 1000;
let profitPerSec = 0;
let clickPower = 1;
const maxEnergy = 1000;

// УРОВНИ
const levels = [
    { name: "Ice Cube 🧊", min: 0 },
    { name: "Snowman ⛄", min: 5000 },
    { name: "Polar Bear 🐻‍❄️", min: 25000 },
    { name: "Glacier 🏔️", min: 100000 },
    { name: "Absolute Zero 🥶", min: 1000000 }
];

// ТОВАРЫ
const upgrades = [
    { id: 'cursor', name: 'Reinforced Pickaxe', type: 'click', cost: 100, bonus: 1, desc: '+1 per click' },
    { id: 'worker', name: 'Snow Worker', type: 'auto', cost: 500, bonus: 1, desc: '+1 🧊 / sec' },
    { id: 'drill', name: 'Ice Drill', type: 'auto', cost: 2000, bonus: 5, desc: '+5 🧊 / sec' }
];
let ownedUpgrades = { cursor: 0, worker: 0, drill: 0 };

// ЭЛЕМЕНТЫ
const scoreEl = document.getElementById('score');
const incomeEl = document.getElementById('income-val');
const energyValEl = document.getElementById('energy-val');
const energyFillEl = document.getElementById('energy-fill');
const clickBtn = document.getElementById('click-btn');
const usernameEl = document.getElementById('username');
const shopListEl = document.getElementById('shop-list');

// ЭКРАНЫ
const screens = {
    mine: document.getElementById('game-screen'),
    shop: document.getElementById('shop-screen'),
    friends: document.getElementById('friends-screen')
};
const btns = {
    mine: document.getElementById('btn-mine'),
    shop: document.getElementById('btn-shop'),
    friends: document.getElementById('btn-friends')
};

// --- ЗАГРУЗКА ---
if (localStorage.getItem('iceberg_save')) {
    const save = JSON.parse(localStorage.getItem('iceberg_save'));
    score = save.score || 0;
    energy = save.energy || 1000;
    profitPerSec = save.profitPerSec || 0;
    clickPower = save.clickPower || 1;
    if (save.owned) ownedUpgrades = save.owned;
}

// ПРОВЕРКА РЕФЕРАЛОВ (БОНУС 2500)
const urlParams = new URLSearchParams(window.location.search);
const referrerId = urlParams.get('ref');
if (referrerId && !localStorage.getItem('ref_bonus')) {
    score += 2500;
    localStorage.setItem('ref_bonus', 'true');
    tg.showAlert(`🎁 You were invited by user ${referrerId}! +2500 ICE`);
}

// ЮЗЕРНЕЙМ
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = `@${tg.initDataUnsafe.user.username}`;
}

updateUI();
renderShop();

// --- ИГРОВАЯ ЛОГИКА ---
clickBtn.addEventListener('click', (e) => {
    if (energy >= clickPower) {
        score += clickPower;
        energy -= clickPower;
        updateUI();
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        showFloatingText(x, y, `+${clickPower}`);
    }
});

// --- НАВИГАЦИЯ ---
window.switchScreen = function(screenName) {
    // Скрываем все экраны
    for (let key in screens) {
        screens[key].classList.remove('active');
        btns[key].classList.remove('active');
    }
    // Показываем нужный
    screens[screenName].classList.add('active');
    btns[screenName].classList.add('active');
}

// --- ПРИГЛАШЕНИЕ ДРУГА ---
window.inviteFriend = function() {
    const myId = tg.initDataUnsafe?.user?.id;
    if (!myId) {
        tg.showAlert("Play from Telegram to invite friends!");
        return;
    }
    const inviteLink = `https://t.me/IcebergGame_bot?start=${myId}`;
    const text = `Join me in Iceberg! ❄️ Mining Bitcoin on ice. Get +2500 ICE bonus!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(url);
}

// --- МАГАЗИН И ОБНОВЛЕНИЯ ---
function renderShop() {
    shopListEl.innerHTML = '';
    upgrades.forEach(item => {
        const count = ownedUpgrades[item.id] || 0;
        const currentCost = Math.floor(item.cost * Math.pow(1.5, count));
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div>
                <h3>${item.name} <span style="font-size:12px; color:#aaa">(Lvl ${count})</span></h3>
                <p>${item.desc} | Price: ${currentCost} 🧊</p>
            </div>
            <button class="buy-btn" onclick="buyUpgrade('${item.id}')" id="btn-${item.id}">Buy</button>
        `;
        shopListEl.appendChild(div);
    });
    checkAffordable();
}

window.buyUpgrade = function(id) {
    const item = upgrades.find(u => u.id === id);
    const count = ownedUpgrades[id] || 0;
    const currentCost = Math.floor(item.cost * Math.pow(1.5, count));
    if (score >= currentCost) {
        score -= currentCost;
        ownedUpgrades[id]++;
        if (item.type === 'click') clickPower += item.bonus;
        if (item.type === 'auto') profitPerSec += item.bonus;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        renderShop();
    }
};

function checkAffordable() {
    upgrades.forEach(item => {
        const count = ownedUpgrades[item.id] || 0;
        const currentCost = Math.floor(item.cost * Math.pow(1.5, count));
        const btn = document.getElementById(`btn-${item.id}`);
        if (btn) btn.disabled = score < currentCost;
    });
}

// --- ЦИКЛ ---
setInterval(() => {
    if (profitPerSec > 0) { score += profitPerSec; updateUI(); }
    if (energy < maxEnergy) { energy++; updateUI(); }
    checkAffordable();
}, 1000);

setInterval(() => {
    const save = { score, energy, profitPerSec, clickPower, owned: ownedUpgrades };
    localStorage.setItem('iceberg_save', JSON.stringify(save));
}, 5000);

function updateUI() {
    scoreEl.innerText = Math.floor(score).toLocaleString();
    incomeEl.innerText = profitPerSec;
    energyValEl.innerText = `${Math.floor(energy)}/${maxEnergy}`;
    energyFillEl.style.width = `${(energy / maxEnergy) * 100}%`;

    // Уровни
    let currentLevel = levels[0];
    let nextLevel = levels[1];
    for (let i = 0; i < levels.length; i++) {
        if (score >= levels[i].min) {
            currentLevel = levels[i];
            nextLevel = levels[i + 1];
        }
    }
    document.getElementById('level-name').innerText = currentLevel.name;
    if (nextLevel) {
        const range = nextLevel.min - currentLevel.min;
        const progress = score - currentLevel.min;
        document.getElementById('level-fill').style.width = `${(progress / range) * 100}%`;
    } else {
        document.getElementById('level-fill').style.width = '100%';
    }
}

function showFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.className = 'floating-text';
    el.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}
const tg = window.Telegram.WebApp;
tg.expand();

// --- ДАННЫЕ ИГРЫ ---
let score = 0;
let energy = 1000;
let profitPerSec = 0;
let clickPower = 1;
const maxEnergy = 1000;

// Список товаров (можно добавлять новые сюда)
const upgrades = [
    { id: 'cursor', name: 'Reinforced Pickaxe', type: 'click', cost: 100, bonus: 1, desc: '+1 per click' },
    { id: 'worker', name: 'Snow Worker', type: 'auto', cost: 500, bonus: 1, desc: '+1 🧊 / sec' },
    { id: 'drill', name: 'Ice Drill', type: 'auto', cost: 2000, bonus: 5, desc: '+5 🧊 / sec' }
];

// Состояние покупок (сколько чего купили)
let ownedUpgrades = { cursor: 0, worker: 0, drill: 0 };

// --- ЭЛЕМЕНТЫ ---
const scoreEl = document.getElementById('score');
const incomeEl = document.getElementById('income-val');
const energyValEl = document.getElementById('energy-val');
const energyFillEl = document.getElementById('energy-fill');
const clickBtn = document.getElementById('click-btn');
const usernameEl = document.getElementById('username');
const shopListEl = document.getElementById('shop-list');

// Меню
const btnMine = document.getElementById('btn-mine');
const btnShop = document.getElementById('btn-shop');
const screenGame = document.getElementById('game-screen');
const screenShop = document.getElementById('shop-screen');

// --- ЗАГРУЗКА ---
if (localStorage.getItem('iceberg_save')) {
    const save = JSON.parse(localStorage.getItem('iceberg_save'));
    score = save.score;
    energy = save.energy;
    profitPerSec = save.profitPerSec || 0;
    clickPower = save.clickPower || 1;
    if (save.owned) ownedUpgrades = save.owned;
}

// Показываем юзернейм
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = `@${tg.initDataUnsafe.user.username}`;
}

updateUI();
renderShop();

// --- КЛИК ---
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
btnMine.addEventListener('click', () => switchScreen('mine'));
btnShop.addEventListener('click', () => switchScreen('shop'));

function switchScreen(screen) {
    if (screen === 'mine') {
        screenGame.classList.add('active');
        screenShop.classList.remove('active');
        btnMine.classList.add('active');
        btnShop.classList.remove('active');
    } else {
        screenGame.classList.remove('active');
        screenShop.classList.add('active');
        btnMine.classList.remove('active');
        btnShop.classList.add('active');
    }
}

// --- МАГАЗИН ---
function renderShop() {
    shopListEl.innerHTML = '';
    upgrades.forEach(item => {
        // Рассчитываем цену: базовая цена * (1.5 ^ количество купленных)
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

// --- ЦИКЛ ИГРЫ (Каждую секунду) ---
setInterval(() => {
    // Авто-доход
    if (profitPerSec > 0) {
        score += profitPerSec;
        updateUI();
    }
    // Энергия
    if (energy < maxEnergy) {
        energy++;
        updateUI(); // Обновляем полоску
    }
    checkAffordable(); // Проверяем, можем ли купить что-то
}, 1000);

// --- СОХРАНЕНИЕ (Каждые 5 сек) ---
setInterval(() => {
    const save = {
        score: score,
        energy: energy,
        profitPerSec: profitPerSec,
        clickPower: clickPower,
        owned: ownedUpgrades
    };
    localStorage.setItem('iceberg_save', JSON.stringify(save));
}, 5000);

// --- UI ФУНКЦИИ ---
function updateUI() {
    scoreEl.innerText = Math.floor(score); // Округляем, чтобы не было дробей
    incomeEl.innerText = profitPerSec;
    energyValEl.innerText = `${Math.floor(energy)}/${maxEnergy}`;
    const percent = (energy / maxEnergy) * 100;
    energyFillEl.style.width = `${percent}%`;
}

function showFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.className = 'floating-text';
    const randomX = (Math.random() - 0.5) * 40; 
    el.style.left = `${x + randomX}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}
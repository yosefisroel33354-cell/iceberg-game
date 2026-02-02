const tg = window.Telegram.WebApp;
tg.expand();

// --- НАСТРОЙКИ FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBw5UDwHAF9DiRmyabYdZoTg-TyxNleFdc",
  authDomain: "iceberg-game.firebaseapp.com",
  // ВОТ ТВОЯ ССЫЛКА, Я ЕЕ ВСТАВИЛ:
  databaseURL: "https://iceberg-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "iceberg-game",
  storageBucket: "iceberg-game.firebasestorage.app",
  messagingSenderId: "292713776668",
  appId: "1:292713776668:web:e57c2d40089b1a92a781d9"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- ЗВУКИ ---
const bgMusic = new Audio('music.mp3');
bgMusic.loop = true; 
bgMusic.volume = 0.3;

const hitSound = new Audio('hit.mp3');
hitSound.volume = 0.5;

let isMusicPlaying = false;

// --- ДАННЫЕ ИГРОКА (По умолчанию) ---
let userId = "guest"; 
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    userId = tg.initDataUnsafe.user.id.toString();
}

// Начальное состояние
let state = {
    score: 0,
    energy: 1000,
    profitPerSec: 0,
    clickPower: 1,
    ownedUpgrades: { cursor: 0, worker: 0, drill: 0 },
    lastLogout: Date.now()
};

const maxEnergy = 1000;

// УРОВНИ
const levels = [
    { name: "Ice Cube 🧊", min: 0 },
    { name: "Snowman ⛄", min: 5000 },
    { name: "Polar Bear 🐻‍❄️", min: 25000 },
    { name: "Glacier 🏔️", min: 100000 },
    { name: "Absolute Zero 🥶", min: 1000000 }
];

// МАГАЗИН
const upgrades = [
    { id: 'cursor', name: 'Reinforced Pickaxe', type: 'click', cost: 100, bonus: 1, desc: '+1 per click' },
    { id: 'worker', name: 'Snow Worker', type: 'auto', cost: 500, bonus: 1, desc: '+1 🧊 / sec' },
    { id: 'drill', name: 'Ice Drill', type: 'auto', cost: 2000, bonus: 5, desc: '+5 🧊 / sec' }
];

// ССЫЛКИ НА ЭЛЕМЕНТЫ
const els = {
    score: document.getElementById('score'),
    income: document.getElementById('income-val'),
    energyVal: document.getElementById('energy-val'),
    energyFill: document.getElementById('energy-fill'),
    username: document.getElementById('username'),
    shopList: document.getElementById('shop-list'),
    loading: document.getElementById('loading-screen'),
    music: document.getElementById('btn-music'),
    screens: {
        mine: document.getElementById('game-screen'),
        shop: document.getElementById('shop-screen'),
        friends: document.getElementById('friends-screen')
    },
    btns: {
        mine: document.getElementById('btn-mine'),
        shop: document.getElementById('btn-shop'),
        friends: document.getElementById('btn-friends')
    },
    friendsList: document.getElementById('friends-list-container')
};

// --- ЗАПУСК ---
function initGame() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        els.username.innerText = `@${tg.initDataUnsafe.user.username}`;
    }

    console.log("Connecting to Firebase...");
    
    const userRef = db.ref('users/' + userId);

    userRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Данные есть
            console.log("Data loaded:", data);
            state = { ...state, ...data };
            
            // Оффлайн доход и энергия
            const now = Date.now();
            const lastTime = state.lastLogout || now;
            const timeDiff = Math.floor((now - lastTime) / 1000);
            
            if (timeDiff > 10) { 
                const recovered = timeDiff; 
                state.energy = Math.min(state.energy + recovered, maxEnergy);
                
                if (state.profitPerSec > 0) {
                    const profitSeconds = Math.min(timeDiff, 3 * 3600);
                    const earned = profitSeconds * state.profitPerSec;
                    if (earned > 0) {
                        state.score += earned;
                        tg.showAlert(`Welcome back! 🌙 You mined ${Math.floor(earned)} ICE while sleeping.`);
                    }
                }
            }
        } else {
            // Новый игрок
            console.log("New user registered");
            checkReferral();
        }
        
        els.loading.style.display = 'none';
        updateUI();
        renderShop();
        loadFriends();
        startAutoSave();
    }).catch(error => {
        console.error("Firebase Error:", error);
        els.loading.innerText = "Error loading data. Check console.";
    });
}

// --- РЕФЕРАЛЫ ---
function checkReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');
    
    if (referrerId && referrerId !== userId) {
        state.score += 2500;
        tg.showAlert(`🎁 Invited by user ID ${referrerId}! +2500 ICE.`);
        
        const refLink = db.ref('users/' + referrerId + '/referrals');
        const myName = tg.initDataUnsafe?.user?.first_name || "Unknown Player";
        refLink.push({ id: userId, name: myName });
    }
}

// --- ДРУЗЬЯ ---
function loadFriends() {
    const myRefs = db.ref('users/' + userId + '/referrals');
    myRefs.on('value', (snapshot) => {
        const data = snapshot.val();
        els.friendsList.innerHTML = '';
        if (data) {
            Object.values(data).forEach(friend => {
                const div = document.createElement('div');
                div.style.padding = "10px";
                div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                div.innerHTML = `👤 <b>${friend.name}</b> <span style="color:#00ff88; float:right;">+2500 🧊</span>`;
                els.friendsList.appendChild(div);
            });
        } else {
            els.friendsList.innerHTML = '<div class="empty-state">No friends yet 😢</div>';
        }
    });
}

// --- СОХРАНЕНИЕ ---
function saveToCloud() {
    state.lastLogout = Date.now();
    db.ref('users/' + userId).update(state);
}

function startAutoSave() {
    setInterval(saveToCloud, 5000);
    window.addEventListener('beforeunload', () => { saveToCloud(); });
}

// --- ГЕЙМПЛЕЙ ---
document.getElementById('click-btn').addEventListener('click', (e) => {
    if (state.energy >= state.clickPower) {
        state.score += state.clickPower;
        state.energy -= state.clickPower;
        
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (isMusicPlaying) {
             const soundClone = hitSound.cloneNode();
             soundClone.play();
        }

        updateUI();
        showFloatingText(e.clientX, e.clientY, `+${state.clickPower}`);
    }
});

setInterval(() => {
    let changed = false;
    if (state.profitPerSec > 0) { state.score += state.profitPerSec; changed = true; }
    if (state.energy < maxEnergy) { state.energy++; changed = true; }
    if (changed) updateUI();
}, 1000);

// --- ИНТЕРФЕЙС ---
function updateUI() {
    els.score.innerText = Math.floor(state.score).toLocaleString();
    els.income.innerText = state.profitPerSec;
    els.energyVal.innerText = `${Math.floor(state.energy)}/${maxEnergy}`;
    els.energyFill.style.width = `${(state.energy / maxEnergy) * 100}%`;

    let currentLevel = levels[0];
    let nextLevel = levels[1];
    for (let i = 0; i < levels.length; i++) {
        if (state.score >= levels[i].min) { currentLevel = levels[i]; nextLevel = levels[i + 1]; }
    }
    document.getElementById('level-name').innerText = currentLevel.name;
    
    if (nextLevel) {
        const range = nextLevel.min - currentLevel.min;
        const progress = state.score - currentLevel.min;
        document.getElementById('level-fill').style.width = `${(progress / range) * 100}%`;
    } else {
        document.getElementById('level-fill').style.width = '100%';
    }
}

function renderShop() {
    els.shopList.innerHTML = '';
    upgrades.forEach(item => {
        const count = state.ownedUpgrades[item.id] || 0;
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
        els.shopList.appendChild(div);
    });
    checkAffordable();
}

window.buyUpgrade = function(id) {
    const item = upgrades.find(u => u.id === id);
    const count = state.ownedUpgrades[id] || 0;
    const currentCost = Math.floor(item.cost * Math.pow(1.5, count));
    if (state.score >= currentCost) {
        state.score -= currentCost;
        state.ownedUpgrades[id]++;
        if (item.type === 'click') state.clickPower += item.bonus;
        if (item.type === 'auto') state.profitPerSec += item.bonus;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        renderShop();
        saveToCloud();
    }
};

function checkAffordable() {
    upgrades.forEach(item => {
        const count = state.ownedUpgrades[item.id] || 0;
        const currentCost = Math.floor(item.cost * Math.pow(1.5, count));
        const btn = document.getElementById(`btn-${item.id}`);
        if (btn) btn.disabled = state.score < currentCost;
    });
}

window.switchScreen = function(name) {
    for (let k in els.screens) {
        els.screens[k].classList.remove('active');
        els.btns[k].classList.remove('active');
    }
    els.screens[name].classList.add('active');
    els.btns[name].classList.add('active');
}

window.inviteFriend = function() {
    const inviteLink = `https://t.me/IcebergGame_bot?start=${userId}`;
    const text = `Join me in Iceberg! ❄️ Mining Bitcoin on ice. Get +2500 ICE bonus!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(url);
}

els.music.addEventListener('click', () => {
    isMusicPlaying = !isMusicPlaying;
    if (isMusicPlaying) {
        bgMusic.play().catch(e => console.log(e));
        els.music.innerText = "🎵";
        els.music.style.background = "rgba(0, 255, 136, 0.2)";
    } else {
        bgMusic.pause();
        els.music.innerText = "🔇";
        els.music.style.background = "rgba(255, 255, 255, 0.1)";
    }
});

function showFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.className = 'floating-text';
    el.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

initGame();
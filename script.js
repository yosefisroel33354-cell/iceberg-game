const tg = window.Telegram.WebApp;
tg.expand();

// --- ЗВУКИ ---
const bgMusic = new Audio('music.mp3');
bgMusic.loop = true; bgMusic.volume = 0.3;
const hitSound = new Audio('hit.mp3');
hitSound.volume = 0.5;
let isMusicPlaying = false;

// --- ДАННЫЕ ИГРОКА ---
let userId = "guest";
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    userId = tg.initDataUnsafe.user.id.toString();
}

// Дефолтное состояние (для новичков)
let state = {
    score: 0,
    energy: 1000,
    profitPerSec: 0,
    clickPower: 1,
    ownedUpgrades: { cursor: 0, worker: 0, drill: 0 },
    lastLogout: Date.now(),
    referrals: [] // Список друзей будем хранить тут
};

const maxEnergy = 1000;
const levels = [
    { name: "Ice Cube 🧊", min: 0 },
    { name: "Snowman ⛄", min: 5000 },
    { name: "Polar Bear 🐻‍❄️", min: 25000 },
    { name: "Glacier 🏔️", min: 100000 },
    { name: "Absolute Zero 🥶", min: 1000000 }
];

const upgrades = [
    { id: 'cursor', name: 'Reinforced Pickaxe', type: 'click', cost: 100, bonus: 1, desc: '+1 per click' },
    { id: 'worker', name: 'Snow Worker', type: 'auto', cost: 500, bonus: 1, desc: '+1 🧊 / sec' },
    { id: 'drill', name: 'Ice Drill', type: 'auto', cost: 2000, bonus: 5, desc: '+5 🧊 / sec' }
];

// UI Элементы
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

// --- ЗАПУСК ИГРЫ (CloudStorage) ---
function initGame() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        if(els.username) els.username.innerText = `@${tg.initDataUnsafe.user.username}`;
    }

    console.log("Loading from Telegram Cloud...");

    // Читаем данные из облака Телеграма
    tg.CloudStorage.getItem('iceberg_data', (err, value) => {
        if (err) {
            tg.showAlert("Storage Error: " + err);
        }
        
        if (value) {
            // Если данные есть - загружаем
            try {
                const cloudData = JSON.parse(value);
                state = { ...state, ...cloudData };
                
                // Оффлайн доход
                const now = Date.now();
                const lastTime = state.lastLogout || now;
                const timeDiff = Math.floor((now - lastTime) / 1000);
                
                if (timeDiff > 10) {
                    const recovered = timeDiff;
                    state.energy = Math.min(state.energy + recovered, maxEnergy);
                    
                    if (state.profitPerSec > 0) {
                        const profitSeconds = Math.min(timeDiff, 3 * 3600); // Макс 3 часа
                        const earned = profitSeconds * state.profitPerSec;
                        if (earned > 0) {
                            state.score += earned;
                            tg.showAlert(`Welcome back! 🌙 You mined ${Math.floor(earned)} ICE while sleeping.`);
                        }
                    }
                }
            } catch (e) {
                console.error("Parse error", e);
            }
        } else {
            // Если данных нет - это новый игрок
            console.log("New user");
            checkReferral();
        }

        // Запуск
        if(els.loading) els.loading.style.display = 'none';
        updateUI();
        renderShop();
        renderFriends();
        startAutoSave();
    });
}

// --- СОХРАНЕНИЕ ---
function saveGame() {
    state.lastLogout = Date.now();
    // Сохраняем строку JSON в ключ 'iceberg_data'
    tg.CloudStorage.setItem('iceberg_data', JSON.stringify(state), (err, saved) => {
        if (err) console.log("Save error:", err);
    });
}

function startAutoSave() {
    // Телеграм ограничивает частоту записи, поэтому сохраняем реже (раз в 10 сек)
    setInterval(saveGame, 10000);
}

// --- РЕФЕРАЛЫ (Упрощенные) ---
/* В CloudStorage мы не можем писать данные ДРУГОМУ человеку.
   Поэтому мы даем бонус только тому, КТО пришел.
   А список друзей будем формировать локально (кого мы сами позвали, если бы у нас была ссылка).
   
   В этой версии мы даем бонус новичку. 
*/
function checkReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');
    
    // Проверка: мы пришли по ссылке и мы еще не получали бонус?
    // Мы используем localStorage как метку "я уже получал бонус" на этом устройстве,
    // чтобы не абузили.
    if (referrerId && referrerId !== userId && !localStorage.getItem('bonus_received')) {
        state.score += 2500;
        localStorage.setItem('bonus_received', 'true');
        tg.showAlert(`🎁 Invited by ID ${referrerId}! You got +2500 ICE.`);
        saveGame();
    }
}

function renderFriends() {
    if(!els.friendsList) return;
    
    // Так как CloudStorage не позволяет видеть чужие данные,
    // мы покажем заглушку или счетчик.
    // В будущем для полноценного списка друзей понадобится сервер на Yandex Cloud.
    
    els.friendsList.innerHTML = `
        <div style="text-align:center; padding: 20px; color: #888;">
            <p>Cloud Sync Active ✅</p>
            <p style="font-size: 12px;">Invites work, but friend list is temporarily hidden in Cloud Mode.</p>
        </div>
    `;
}

// --- ГЕЙМПЛЕЙ ---
if(document.getElementById('click-btn')) {
    document.getElementById('click-btn').addEventListener('click', (e) => {
        if (state.energy >= state.clickPower) {
            state.score += state.clickPower;
            state.energy -= state.clickPower;
            
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            if (isMusicPlaying) {
                const soundClone = hitSound.cloneNode();
                soundClone.play().catch(e => {});
            }

            updateUI();
            showFloatingText(e.clientX, e.clientY, `+${state.clickPower}`);
        }
    });
}

setInterval(() => {
    let changed = false;
    if (state.profitPerSec > 0) { state.score += state.profitPerSec; changed = true; }
    if (state.energy < maxEnergy) { state.energy++; changed = true; }
    if (changed) updateUI();
}, 1000);

// --- ИНТЕРФЕЙС ---
function updateUI() {
    if(els.score) els.score.innerText = Math.floor(state.score).toLocaleString();
    if(els.income) els.income.innerText = state.profitPerSec;
    if(els.energyVal) els.energyVal.innerText = `${Math.floor(state.energy)}/${maxEnergy}`;
    if(els.energyFill) els.energyFill.style.width = `${(state.energy / maxEnergy) * 100}%`;

    let currentLevel = levels[0];
    let nextLevel = levels[1];
    for (let i = 0; i < levels.length; i++) {
        if (state.score >= levels[i].min) { currentLevel = levels[i]; nextLevel = levels[i + 1]; }
    }
    
    if(document.getElementById('level-name')) document.getElementById('level-name').innerText = currentLevel.name;
    const lvlFill = document.getElementById('level-fill');
    if (nextLevel && lvlFill) {
        const range = nextLevel.min - currentLevel.min;
        const progress = state.score - currentLevel.min;
        lvlFill.style.width = `${(progress / range) * 100}%`;
    } else if (lvlFill) {
        lvlFill.style.width = '100%';
    }
}

function renderShop() {
    if(!els.shopList) return;
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
        saveGame(); // Сохраняем сразу
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
        if(els.screens[k]) els.screens[k].classList.remove('active');
        if(els.btns[k]) els.btns[k].classList.remove('active');
    }
    if(els.screens[name]) els.screens[name].classList.add('active');
    if(els.btns[name]) els.btns[name].classList.add('active');
}

window.inviteFriend = function() {
    const inviteLink = `https://t.me/IcebergGame_bot?start=${userId}`;
    const text = `Join me in Iceberg! ❄️ Mining Bitcoin on ice. Get +2500 ICE bonus!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(url);
}

if(els.music) {
    els.music.addEventListener('click', () => {
        isMusicPlaying = !isMusicPlaying;
        if (isMusicPlaying) {
            bgMusic.play().catch(e => {});
            els.music.innerText = "🎵";
            els.music.style.background = "rgba(0, 255, 136, 0.2)";
        } else {
            bgMusic.pause();
            els.music.innerText = "🔇";
            els.music.style.background = "rgba(255, 255, 255, 0.1)";
        }
    });
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

// Запуск
initGame();
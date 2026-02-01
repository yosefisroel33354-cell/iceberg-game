const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран

// --- НАСТРОЙКИ ---
const maxEnergy = 1000;
let score = 0;
let energy = maxEnergy;

// --- ЭЛЕМЕНТЫ ---
const scoreEl = document.getElementById('score');
const energyValEl = document.getElementById('energy-val');
const energyFillEl = document.getElementById('energy-fill');
const clickBtn = document.getElementById('click-btn');
const usernameEl = document.getElementById('username');

// --- ЗАГРУЗКА ДАННЫХ ---
// Проверяем, есть ли сохраненные данные
if (localStorage.getItem('iceberg_score')) {
    score = parseInt(localStorage.getItem('iceberg_score'));
    energy = parseInt(localStorage.getItem('iceberg_energy'));
}

// Обновляем экран сразу после загрузки
scoreEl.innerText = score;
updateEnergy();

// Показываем юзернейм
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = `@${tg.initDataUnsafe.user.username}`;
} else {
    usernameEl.innerText = "Guest Player";
}

// --- КЛИК ---
clickBtn.addEventListener('click', (e) => {
    if (energy > 0) {
        // Логика
        score++;
        energy--;
        
        // Визуал
        scoreEl.innerText = score;
        updateEnergy();
        
        // Вибрация (работает только в телефоне)
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }

        // Анимация +1
        // Берем координаты пальца или центра (если клик не тачем)
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        showFloatingText(x, y);
    }
});

// --- ВОССТАНОВЛЕНИЕ ЭНЕРГИИ ---
setInterval(() => {
    if (energy < maxEnergy) {
        energy++;
        updateEnergy();
    }
}, 1000);

// --- СОХРАНЕНИЕ ---
// Сохраняем прогресс каждые 5 секунд, чтобы не грузить телефон
setInterval(() => {
    localStorage.setItem('iceberg_score', score);
    localStorage.setItem('iceberg_energy', energy);
}, 5000);

// --- ФУНКЦИИ ---
function updateEnergy() {
    energyValEl.innerText = `${energy}/${maxEnergy}`;
    const percent = (energy / maxEnergy) * 100;
    energyFillEl.style.width = `${percent}%`;
}

function showFloatingText(x, y) {
    const el = document.createElement('div');
    el.innerText = '+1 ICE';
    el.className = 'floating-text';
    // Немного рандома, чтобы цифры летели красиво
    const randomX = (Math.random() - 0.5) * 40; 
    el.style.left = `${x + randomX}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 1000);
}
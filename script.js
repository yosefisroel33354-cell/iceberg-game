const tg = window.Telegram.WebApp;

// Сообщаем Телеграму, что приложение готово
tg.expand(); 

let score = 0;
let energy = 1000;
const maxEnergy = 1000;

const scoreEl = document.getElementById('score');
const energyValEl = document.getElementById('energy-val');
const energyFillEl = document.getElementById('energy-fill');
const clickBtn = document.getElementById('click-btn');
const usernameEl = document.getElementById('username');

// Получаем имя пользователя из Телеграма (если есть)
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    usernameEl.innerText = `@${tg.initDataUnsafe.user.username}`;
}

// Обработка клика
clickBtn.addEventListener('click', (e) => {
    if (energy > 0) {
        // Увеличиваем счет
        score++;
        scoreEl.innerText = score;
        
        // Тратим энергию
        energy--;
        updateEnergy();

        // Вибрация телефона (Haptic Feedback) - очень важная фишка для ощущений!
        tg.HapticFeedback.impactOccurred('medium');

        // Показываем +1 (анимация)
        showFloatingText(e.clientX, e.clientY);
    }
});

// Восстановление энергии
setInterval(() => {
    if (energy < maxEnergy) {
        energy++;
        updateEnergy();
    }
}, 1000); // +1 энергия каждую секунду

function updateEnergy() {
    energyValEl.innerText = `${energy}/${maxEnergy}`;
    const percent = (energy / maxEnergy) * 100;
    energyFillEl.style.width = `${percent}%`;
}

function showFloatingText(x, y) {
    const el = document.createElement('div');
    el.innerText = '+1 ICE';
    el.className = 'floating-text';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 1000);
}
const { Telegraf } = require('telegraf');
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);
const gameUrl = 'https://yosefisroel33354-cell.github.io/iceberg-game/'; // Твоя ссылка

// --- БАЗА ДАННЫХ В ПАМЯТИ (RAM) ---
// Храним тут список игроков: { id, name, score }
let leaderboard = [];

bot.start((ctx) => {
    const startPayload = ctx.payload;
    const webAppUrl = startPayload ? `${gameUrl}?ref=${startPayload}` : gameUrl;

    ctx.reply('❄️ Welcome to Iceberg! The world is freezing...', {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Start Mining $ICE 🧊", web_app: { url: webAppUrl } }],
                [{ text: "Join Community 📢", url: 'https://t.me/iceberg_community_global' }]
            ]
        }
    });
});

bot.launch();
console.log('Bot Iceberg is running...');

// --- СЕРВЕР ДЛЯ ЛИДЕРБОРДА ---
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    // Разрешаем доступ игре (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 1. ПОЛУЧИТЬ СПИСОК ЛИДЕРОВ (GET)
    if (req.method === 'GET' && req.url === '/leaderboard') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(leaderboard));
        return;
    }

    // 2. СОХРАНИТЬ РЕЗУЛЬТАТ (POST)
    if (req.method === 'POST' && req.url === '/score') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { id, name, score } = data;

                if (id && score) {
                    // Ищем игрока в списке
                    const existingPlayerIndex = leaderboard.findIndex(p => p.id === id);
                    
                    if (existingPlayerIndex !== -1) {
                        // Обновляем рекорд, только если он выше старого
                        if (score > leaderboard[existingPlayerIndex].score) {
                            leaderboard[existingPlayerIndex].score = score;
                            // Если имя поменялось - обновим
                            if (name) leaderboard[existingPlayerIndex].name = name;
                        }
                    } else {
                        // Добавляем нового
                        leaderboard.push({ id, name: name || 'Anonymous', score });
                    }

                    // Сортируем: от большего к меньшему
                    leaderboard.sort((a, b) => b.score - a.score);

                    // Оставляем только ТОП-50, чтобы не забить память
                    if (leaderboard.length > 50) {
                        leaderboard = leaderboard.slice(0, 50);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, rank: leaderboard.findIndex(p => p.id === id) + 1 }));
                } else {
                    res.writeHead(400);
                    res.end('Bad Data');
                }
            } catch (e) {
                console.error(e);
                res.writeHead(500);
                res.end('Server Error');
            }
        });
        return;
    }

    // Просто проверка жизни
    res.writeHead(200);
    res.end('Iceberg Server is Alive! 🧊');

}).listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Безопасная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
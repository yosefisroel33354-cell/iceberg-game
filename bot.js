const { Telegraf } = require('telegraf');
const http = require('http'); // Добавляем модуль для сервера

// Токен и ссылка
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);
const gameUrl = 'https://yosefisroel33354-cell.github.io/iceberg-game/'; // Твоя ссылка

// --- ЛОГИКА БОТА ---
bot.start((ctx) => {
    const startPayload = ctx.payload;
    const webAppUrl = startPayload ? `${gameUrl}?ref=${startPayload}` : gameUrl;

    ctx.reply('❄️ Welcome to Iceberg! The world is freezing...', {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Start Mining $ICE 🧊", web_app: { url: webAppUrl } }],
                [{ text: "Join Community 📢", url: 'https://t.me/telegram' }] // Сюда потом вставим твой канал
            ]
        }
    });
});

// Запуск бота
bot.launch();
console.log('Bot Iceberg is running...');

// --- ОБМАНКА ДЛЯ RENDER (САМОЕ ВАЖНОЕ) ---
// Мы создаем простейший сервер, чтобы Render думал, что это веб-сайт
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Iceberg Bot is alive!'); // Если зайти по ссылке сервера, увидишь эту надпись
}).listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Безопасная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
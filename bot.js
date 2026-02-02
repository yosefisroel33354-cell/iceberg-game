const { Telegraf } = require('telegraf');

// Твой секретный токен
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

// Ссылка на игру (пока заглушка, скоро заменим на настоящую)
const gameUrl = 'https://yosefisroel33354-cell.github.io/iceberg-game/';

// Команда /start
bot.start((ctx) => {
    ctx.reply('❄️ Welcome to Iceberg! The world is freezing...', {
        reply_markup: {
            inline_keyboard: [
                [
                    // Кнопка, которая открывает Mini App
                    { text: "Start Mining $ICE 🧊", web_app: { url: gameUrl } }
                ],
                [
                    { text: "Join Community 📢", url: 'https://t.me/telegram' }
                ]
            ]
        }
    });
});

// Запуск бота
console.log('Bot Iceberg is running...');
bot.launch();

// Обработка безопасной остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
const { Pool } = require('pg');

const pool = new Pool({
    user: 'user',          // Данные из таблицы
    host: 'localhost',     // Так как ты запускаешь сервер локально
    database: 'avtokraski_db',
    password: 'password',  // Данные из таблицы
    port: 5432,
});

module.exports = pool; // Это позволяет другим файлам "подключаться" к базе
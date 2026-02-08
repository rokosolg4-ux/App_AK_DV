const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// 1. Настройки подключения к базе данных
const pool = new Pool({
  user: 'user',          // Имя пользователя из docker-compose
  host: 'database',      // Имя сервиса базы в сети Docker
  database: 'avtokraski_db', 
  password: 'password',  // Пароль из docker-compose
  port: 5432,
});

// 2. Настройки сервера
app.use(cors());
app.use(express.json());

// 3. Маршруты (Endpoints)

// Проверка работоспособности бэкенда
app.get('/', (req, res) => {
  res.send('Сервер Автокраски ДВ работает корректно! 🚀');
});

// Получение списка красок из таблицы, которую ты создал в Adminer
app.get('/paints', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM paints ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при запросе к базе:', err.message);
    res.status(500).json({ error: 'Ошибка базы данных', details: err.message });
  }
});

// Тестовая аналитика (твоя заготовка)
app.get('/sales-stats', (req, res) => {
    res.json({
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        revenue: [45000, 52000, 38000, 61000, 85000, 92000, 41000],
        ai_insight: "Анализ: Пик продаж в субботу. Рекомендую пополнить запасы бренда Vika."
    });
});

// 4. Запуск сервера (ТОЛЬКО ОДИН РАЗ!)
app.listen(port, () => {
  console.log(`✅ Бэкенд запущен на порту ${port}`);
});
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// Настройки подключения к базе (исправлено для Docker)
const pool = new Pool({
  user: 'user',          // как в docker-compose
  host: 'database',      // имя сервиса в сети docker
  database: 'avtokraski_db', 
  password: 'password',  // как в docker-compose
  port: 5432,
});

app.use(cors());
app.use(express.json());

// Главная страница бэкенда
app.get('/', (req, res) => {
  res.send('Бэкенд Автокраски ДВ запущен и готов к работе!');
});

// ПОЛУЧИТЬ КРАСКИ (маршрут изменен под твою таблицу paints)
app.get('/paints', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM paints ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка базы данных: ' + err.message);
  }
});

// АНАЛИТИКА (твой тестовый маршрут)
app.get('/sales-stats', (req, res) => {
    res.json({
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        revenue: [45000, 52000, 38000, 61000, 85000, 92000, 41000],
        ai_insight: "Рекомендую проверить запасы Vika, бренд пользуется спросом."
    });
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
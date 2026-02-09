const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// 1. Настройки подключения к базе данных
const pool = new Pool({
  user: 'user',
  host: 'database',
  database: 'avtokraski_db',
  password: 'password',
  port: 5432,
});

app.use(cors());
app.use(express.json());

// 2. Проверка, что сервер жив
app.get('/', (req, res) => {
  res.send('AK OS Backend (Enterprise Version) is running! 🚀');
});

// 3. ГЛАВНЫЙ ЗАПРОС: Получить остатки склада (умный запрос)
app.get('/api/stock', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.name as product_name,          
        c.name as variant,               
        c.sku,                           
        c.barcode,                       
        COALESCE(sb.quantity, 0) as qty, 
        COALESCE(pr.price, 0) as price   
      FROM products p
      JOIN characteristics c ON p.id = c.product_id
      LEFT JOIN reg_stock_balance sb ON c.id = sb.characteristic_id
      LEFT JOIN reg_prices pr ON c.id = pr.characteristic_id
      ORDER BY p.name ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка запроса:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. Запуск сервера
app.listen(port, () => {
  console.log(`✅ Сервер AK OS запущен на порту ${port}`);
});

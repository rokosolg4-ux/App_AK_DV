const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ПРАВИЛЬНЫЕ НАСТРОЙКИ (Как на твоем скриншоте)
const pool = new Pool({
  user: 'user',
  host: 'database', // <--- БЫЛО localhost, СТАЛО database (Это самое важное!)
  database: 'avtokraski_db',
  password: 'password',
  port: 5432,
});

// 1. КАТЕГОРИИ
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка соединения с БД" });
  }
});

// 2. ТОВАРЫ
app.get('/api/stock', async (req, res) => {
  const { category } = req.query;
  try {
    let queryText = `
      SELECT 
        p.id, 
        p.name AS product_name, 
        c.sku, 
        pr.price, 
        s.quantity as qty,
        p.category_id 
      FROM products p
      LEFT JOIN characteristics c ON p.id = c.product_id
      LEFT JOIN reg_prices pr ON c.id = pr.characteristic_id
      LEFT JOIN reg_stock_balance s ON c.id = s.characteristic_id
    `;
    
    const queryParams = [];
    if (category) {
      queryText += ` WHERE p.category_id = $1`;
      queryParams.push(category);
    }
    queryText += ` ORDER BY p.name ASC`;

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка соединения с БД" });
  }
});

app.listen(3000, () => console.log('SERVER CONNECTED TO DATABASE'));
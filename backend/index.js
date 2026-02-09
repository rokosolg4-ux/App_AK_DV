const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'user',
  host: 'database', // ПРАВИЛЬНЫЙ ХОСТ
  database: 'avtokraski_db',
  password: 'password',
  port: 5432,
});

// 1. СПИСОК ПАПОК
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. СПИСОК ТОВАРОВ (Для плиток)
app.get('/api/stock', async (req, res) => {
  const { category } = req.query;
  try {
    let queryText = `
      SELECT p.id, p.name AS product_name, p.vendor_code, pr.price, s.quantity as qty, p.category_id 
      FROM products p
      LEFT JOIN characteristics c ON p.id = c.product_id
      LEFT JOIN reg_prices pr ON c.id = pr.characteristic_id
      LEFT JOIN reg_stock_balance s ON c.id = s.characteristic_id
    `;
    const params = [];
    if (category) {
      queryText += ` WHERE p.category_id = $1`;
      params.push(category);
    }
    queryText += ` ORDER BY p.name ASC`;
    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// 3. ПОЛНАЯ КАРТОЧКА ТОВАРА (Как в 1С)
app.get('/api/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        p.*, 
        p.name AS product_name,
        pr.price, 
        s.quantity as qty,
        c.name as cat_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN characteristics ch ON p.id = ch.product_id
      LEFT JOIN reg_prices pr ON ch.id = pr.characteristic_id
      LEFT JOIN reg_stock_balance s ON ch.id = s.characteristic_id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({error: 'Товар не найден'});
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('SERVER READY'));
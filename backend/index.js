const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'user',
  host: 'database',
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

// 2. СПИСОК ТОВАРОВ (Для главной)
app.get('/api/stock', async (req, res) => {
  const { category } = req.query;
  try {
    let queryText = `
      SELECT p.id, p.name AS product_name, p.internal_code, c.sku, pr.price, s.quantity as qty, p.category_id 
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

// 3. ПОЛНАЯ КАРТОЧКА 1С (MEGA ROUTE)
app.get('/api/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Основные данные
    const productQuery = `
      SELECT p.*, c.sku as vendor_code, pr.price, s.quantity as qty
      FROM products p
      LEFT JOIN characteristics c ON p.id = c.product_id
      LEFT JOIN reg_prices pr ON c.id = pr.characteristic_id
      LEFT JOIN reg_stock_balance s ON c.id = s.characteristic_id
      WHERE p.id = $1
    `;
    const productRes = await pool.query(productQuery, [id]);
    
    if (productRes.rows.length === 0) return res.status(404).json({error: 'Нет товара'});

    // Подгружаем мин. остатки (таблица из скриншота)
    const stocksQuery = `SELECT * FROM product_min_stocks WHERE product_id = $1`;
    const stocksRes = await pool.query(stocksQuery, [id]);

    // Отдаем всё вместе
    const fullData = {
        ...productRes.rows[0],
        min_stocks: stocksRes.rows // массив для таблицы складов
    };
    
    res.json(fullData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('1C SERVER READY'));
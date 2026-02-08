const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// Настройки базы данных
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'ak_dv_store',
  password: 'password123',
  port: 5432,
});

app.use(cors());
app.use(express.json());

// ==========================================
// 1. СКЛАД И ТОВАРЫ
// ==========================================

// Получить категории товаров
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// Получить товары (с поиском и фильтром)
app.get('/products', async (req, res) => {
  const { category_id, search } = req.query;
  
  let query = 'SELECT * FROM products WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (category_id) {
    query += ` AND category_id = $${paramIndex}`;
    params.push(category_id);
    paramIndex++;
  }

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY name LIMIT 100';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// Продажа товара (списание 1 шт)
app.put('/products/:id/sell', async (req, res) => {
    try {
      await pool.query('UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});


// ==========================================
// 2. ЗАКУПКИ И ДОКУМЕНТЫ
// ==========================================

// Поставщики
app.get('/suppliers', async (req, res) => {
  const result = await pool.query('SELECT * FROM suppliers ORDER BY id ASC');
  res.json(result.rows);
});

// Создать поступление
app.post('/supplies', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { number, supplier_id, items } = req.body;
    
    // Считаем общую сумму документа
    let totalAmount = 0;
    items.forEach(i => totalAmount += (i.price * i.quantity));

    const docRes = await client.query(
      `INSERT INTO supply_docs (number, supplier_id, date, total_amount) 
       VALUES ($1, $2, NOW(), $3) RETURNING id`, [number, supplier_id, totalAmount]
    );
    const docId = docRes.rows[0].id;

    for (let item of items) {
      await client.query(
        `INSERT INTO supply_items (doc_id, product_id, quantity, price, total)
         VALUES ($1, $2, $3, $4, $5)`,
        [docId, item.product_id, item.quantity, item.price, item.quantity * item.price]
      );
      await client.query(
        `UPDATE products SET stock = stock + $1, price = $2 WHERE id = $3`,
        [item.quantity, item.price, item.product_id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'OK', docId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send(err.message);
  } finally {
    client.release();
  }
});

// Список документов (Журнал)
app.get('/supply-docs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.number, d.date, d.total_amount, s.name as supplier_name 
      FROM supply_docs d
      JOIN suppliers s ON d.supplier_id = s.id
      ORDER BY d.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка получения списка документов');
  }
});


// ==========================================
// 3. CRM (КЛИЕНТЫ)
// ==========================================

// Категории клиентов
app.get('/client-categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM client_categories ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// Список клиентов
app.get('/clients', async (req, res) => {
  const { category_id, search } = req.query;
  
  let query = 'SELECT * FROM clients WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (category_id) {
    query += ` AND category_id = $${paramIndex}`;
    params.push(category_id);
    paramIndex++;
  }

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY name';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});


// ==========================================
// 4. АНАЛИТИКА И AI (НОВОЕ!)
// ==========================================

app.get('/sales-stats', (req, res) => {
    // В будущем здесь будет SQL запрос: SELECT sum(total) ... GROUP BY date
    // Сейчас отдаем готовый JSON для демонстрации
    res.json({
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        revenue: [45000, 52000, 38000, 61000, 85000, 92000, 41000],
        profit: [12000, 15000, 9000, 21000, 35000, 40000, 11000],
        ai_insight: "Анализ данных: Наблюдается устойчивый рост выручки к выходным (+40%). Пик продаж приходится на Субботу (92 000 ₽). Лидер продаж в категории: 'Лаки Mipa'. Рекомендую проверить запасы грунта JetaPro перед следующей пятницей, возможен дефицит."
    });
});


// Запуск сервера
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
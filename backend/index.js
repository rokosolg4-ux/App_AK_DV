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

// 1. КАТЕГОРИИ
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. СПИСОК ТОВАРОВ (С КАРТИНКОЙ!)
app.get('/api/stock', async (req, res) => {
  const { category } = req.query;
  try {
    let queryText = `
      SELECT p.id, p.name AS product_name, p.internal_code, c.sku as vendor_code, 
             pr.price, s.quantity as qty, p.category_id, p.image_url 
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
  } catch (err) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// 3. ПОЛНАЯ КАРТОЧКА
app.get('/api/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const productQuery = `
      SELECT p.*, c.sku as vendor_code 
      FROM products p
      LEFT JOIN characteristics c ON p.id = c.product_id
      WHERE p.id = $1
    `;
    const productRes = await pool.query(productQuery, [id]);
    if (productRes.rows.length === 0) return res.status(404).json({error: 'Товар не найден'});

    const stocksQuery = `
        SELECT w.id as warehouse_id, w.name, 
               COALESCE(pms.min_qty, 0) as min_qty, 
               COALESCE(pms.order_qty, 0) as order_qty
        FROM warehouses w
        LEFT JOIN product_min_stocks pms ON w.id = pms.warehouse_id AND pms.product_id = $1
        ORDER BY w.id
    `;
    const stocksRes = await pool.query(stocksQuery, [id]);

    const fullData = { ...productRes.rows[0], stocks: stocksRes.rows };
    res.json(fullData);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. СОХРАНЕНИЕ (С КАРТИНКОЙ)
app.put('/api/product/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateProduct = `
            UPDATE products SET 
                working_name = $1, print_name = $2, internal_code = $3,
                product_type = $4, vat_rate = $5, 
                unit_storage = $6, unit_report = $7, weight = $8, volume = $9,
                brand = $10, country = $11, description = $12,
                not_in_pricelist = $13, is_gift = $14, is_archive = $15,
                coef_thinner = $16, coef_hardener = $17, matte_additive = $18,
                is_standard_paint = $19, is_paint_can = $20, image_url = $21
            WHERE id = $22
        `;
        
        await client.query(updateProduct, [
            data.working_name, data.print_name, data.internal_code,
            data.product_type, data.vat_rate,
            data.unit_storage, data.unit_report, data.weight, data.volume,
            data.brand, data.country, data.description,
            data.not_in_pricelist, data.is_gift, data.is_archive,
            data.coef_thinner, data.coef_hardener, data.matte_additive,
            data.is_standard_paint, data.is_paint_can, data.image_url,
            id
        ]);

        await client.query('UPDATE characteristics SET sku = $1 WHERE product_id = $2', [data.vendor_code, id]);
        await client.query('DELETE FROM product_min_stocks WHERE product_id = $1', [id]);
        
        if (data.stocks && Array.isArray(data.stocks)) {
            for (const stock of data.stocks) {
                if (stock.min_qty > 0 || stock.order_qty > 0) {
                    await client.query(
                        'INSERT INTO product_min_stocks (product_id, warehouse_id, min_qty, order_qty) VALUES ($1, $2, $3, $4)',
                        [id, stock.warehouse_id, stock.min_qty, stock.order_qty]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ status: 'success' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Ошибка при сохранении' });
    } finally {
        client.release();
    }
});

app.listen(3000, () => console.log('SERVER WITH IMAGES READY'));
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Мы "импортируем" настройки из db.js

const app = express();
app.use(cors());
app.use(express.json());

// Дальше идет твоя логика API...

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'avtokraski_db', // Имя базы из Adminer
    password: 'pass', 
    port: 5432,
});

// Универсальный обработчик запросов для связи с БД
const runQuery = async (res, sql, params) => {
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows[0]?.json_result || { success: true });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

app.post('/api/pos/create', (req, res) => {
    const sql = `INSERT INTO pos.receipts (status, type) VALUES ('draft', $1) RETURNING jsonb_build_object('id', id, 'status', status, 'type', type, 'final_total', 0, 'items', '[]'::jsonb) as json_result`;
    runQuery(res, sql, [req.body.type || 'sale']);
});

app.get('/api/pos/products/search', async (req, res) => {
    const q = req.query.q || '';
    const result = await pool.query("SELECT sku, name, price_retail as price, stock_qty as stock FROM public.products WHERE name ILIKE $1 OR sku ILIKE $1 LIMIT 15", [`%${q}%`]);
    res.json(result.rows);
});

app.post('/api/pos/add-item', (req, res) => {
    const sql = `
        WITH ins AS (
            INSERT INTO pos.receipt_items (receipt_id, product_id, quantity, base_price)
            SELECT $1, id, $3, price_retail FROM public.products WHERE sku = $2
            RETURNING receipt_id
        ), upd AS (
            UPDATE pos.receipts SET subtotal = (SELECT SUM(row_total) FROM pos.receipt_items WHERE receipt_id = $1) WHERE id = $1
        )
        SELECT jsonb_build_object('id', id, 'final_total', final_total, 'items', 
            (SELECT jsonb_agg(jsonb_build_object('product_name', p.name, 'sku', p.sku, 'quantity', i.quantity, 'base_price', i.base_price, 'row_total', i.row_total))
             FROM pos.receipt_items i JOIN public.products p ON p.id = i.product_id WHERE i.receipt_id = receipts.id)
        ) as json_result FROM pos.receipts WHERE id = $1;
    `;
    runQuery(res, sql, [req.body.receiptId, req.body.sku, req.body.qty]);
});

app.listen(3000, () => console.log('POS Backend Active on 3000'));
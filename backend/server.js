const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// НАСТРОЙКИ
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'avtokraski_db',
    password: 'pass',
    port: 5432,
});

const execute = async (res, sql, params) => {
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows[0]?.json_result || { success: true });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

app.post('/api/pos/create', (req, res) => {
    const sql = `INSERT INTO pos.receipts (status, type, shift_id) VALUES ('draft', $1, 1) RETURNING pos.get_receipt_json(id) as json_result`;
    execute(res, sql, [req.body.type || 'sale']);
});

app.get('/api/pos/products/search', async (req, res) => {
    const q = req.query.q || '';
    const result = await pool.query("SELECT sku, name, price_retail as price, stock_qty as stock FROM public.products WHERE name ILIKE $1 OR sku ILIKE $1 LIMIT 10", [`%${q}%`]);
    res.json(result.rows);
});

app.post('/api/pos/add-item', (req, res) => {
    const sql = `
        WITH ins AS (
            INSERT INTO pos.receipt_items (receipt_id, product_id, quantity, base_price)
            SELECT $1, id, $3, price_retail FROM public.products WHERE sku = $2
            RETURNING receipt_id
        )
        SELECT pos.get_receipt_json(receipt_id) as json_result FROM ins;
    `;
    execute(res, sql, [req.body.receiptId, req.body.sku, req.body.qty]);
});

app.listen(3000, () => console.log('Server PRO running on port 3000'));
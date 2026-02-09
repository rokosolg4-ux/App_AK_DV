const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// НАСТРОЙКИ ПОДКЛЮЧЕНИЯ (ПРОВЕРЬ ПАРОЛЬ!)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'avtokraski_db', // Как у тебя в Adminer
    password: 'pass',          // Пароль из docker-compose.yml (скорее всего pass или postgres)
    port: 5432,
});

const getUserId = (req) => 1;

const executeSql = async (res, sql, params) => {
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows[0].json_result);
    } catch (err) {
        console.error('SQL Error:', err.message);
        res.status(400).json({ error: err.message });
    }
};

app.get('/api/pos/shift/status', (req, res) => executeSql(res, "SELECT pos.api_get_shift_status($1) as json_result", [getUserId(req)]));
app.post('/api/pos/shift/open', (req, res) => executeSql(res, "SELECT pos.api_open_shift($1, $2) as json_result", [getUserId(req), req.body.startCash]));
app.post('/api/pos/shift/close', (req, res) => executeSql(res, "SELECT pos.api_close_shift($1) as json_result", [getUserId(req)]));
app.post('/api/pos/create', (req, res) => executeSql(res, "SELECT pos.api_create_receipt($1, $2) as json_result", [getUserId(req), req.body.type || 'sale']));
app.get('/api/pos/products/search', (req, res) => executeSql(res, "SELECT pos.api_search_products($1, $2) as json_result", [req.query.q || '', req.query.priceType || 'retail']));
app.post('/api/pos/add-item', (req, res) => executeSql(res, "SELECT pos.api_add_item($1, $2, $3) as json_result", [req.body.receiptId, req.body.sku, req.body.qty]));
app.post('/api/pos/remove-item', (req, res) => executeSql(res, "SELECT pos.api_remove_item($1, $2) as json_result", [req.body.receiptId, req.body.productId]));
app.post('/api/pos/set-context', (req, res) => executeSql(res, "SELECT pos.api_set_context($1, $2, $3, $4) as json_result", [req.body.receiptId, req.body.clientId, req.body.consultantId, req.body.priceType]));
app.post('/api/pos/apply-bonus', (req, res) => executeSql(res, "SELECT pos.api_apply_bonus($1, $2) as json_result", [req.body.receiptId, req.body.amount]));
app.post('/api/pos/add-payment', (req, res) => executeSql(res, "SELECT pos.api_add_payment($1, $2, $3) as json_result", [req.body.receiptId, req.body.type, req.body.amount]));
app.post('/api/pos/remove-payment', (req, res) => executeSql(res, "SELECT pos.api_remove_payment($1) as json_result", [req.body.paymentId]));
app.post('/api/pos/fiscalize', (req, res) => executeSql(res, "SELECT pos.api_fiscalize($1) as json_result", [req.body.receiptId]));

app.listen(3000, () => {
    console.log(`AK.OS POS Server running on port 3000`);
});
const pool = require('../db');

class DocumentService {
    // Создание реализации и автоматическое движение по регистрам
    async postSale(docId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // 1. Проверяем наличие товара на складе (как в 1С)
            // 2. Списываем товар (Движение по регистру)
            const items = await client.query('SELECT * FROM core.document_items WHERE doc_id = $1', [docId]);
            const doc = await client.query('SELECT * FROM core.documents WHERE id = $1', [docId]);
            
            for (let item of items.rows) {
                await client.query(
                    'INSERT INTO core.reg_stock_balance (doc_id, warehouse_id, nomenclature_id, quantity_change) VALUES ($1, $2, $3, $4)',
                    [docId, doc.rows[0].warehouse_from, item.nomenclature_id, -item.quantity]
                );
            }
            
            await client.query("UPDATE core.documents SET status = 'posted', posted_at = NOW() WHERE id = $1", [docId]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally { client.release(); }
    }
}
module.exports = new DocumentService();
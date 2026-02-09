const pool = require('../db');

class DocumentService {
    // ПРОГРАММНОЕ ПРОВЕДЕНИЕ ДОКУМЕНТА (Аналог "ОбработкаПроведения" в 1С)
    async postDocument(docId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Начало транзакции

            // 1. Получаем данные документа
            const docRes = await client.query('SELECT * FROM core.documents WHERE id = $1', [docId]);
            const doc = docRes.rows[0];
            if (!doc) throw new Error("Документ не найден");
            if (doc.status === 'posted') throw new Error("Документ уже проведен");

            // 2. Получаем товарный состав
            const itemsRes = await client.query('SELECT * FROM core.document_items WHERE doc_id = $1', [docId]);
            const items = itemsRes.rows;

            // 3. Формируем движения по регистрам (Складской учет)
            for (const item of items) {
                // Если это Реализация (sale) - делаем РАСХОД (-)
                // Если это Перемещение (transfer) - делаем РАСХОД (-) со склада А и ПРИХОД (+) на склад Б
                if (doc.doc_type === 'sale') {
                    await client.query(`
                        INSERT INTO core.reg_stock_balance (doc_id, warehouse_id, nomenclature_id, quantity_change)
                        VALUES ($1, $2, $3, $4)`, 
                        [docId, doc.warehouse_from, item.nomenclature_id, -item.quantity]
                    );
                } else if (doc.doc_type === 'transfer') {
                    // Расход с отправителя
                    await client.query(`
                        INSERT INTO core.reg_stock_balance (doc_id, warehouse_id, nomenclature_id, quantity_change)
                        VALUES ($1, $2, $3, $4)`, 
                        [docId, doc.warehouse_from, item.nomenclature_id, -item.quantity]
                    );
                    // Приход на получателя (или склад "В пути")
                    await client.query(`
                        INSERT INTO core.reg_stock_balance (doc_id, warehouse_id, nomenclature_id, quantity_change)
                        VALUES ($1, $2, $3, $4)`, 
                        [docId, doc.warehouse_to, item.nomenclature_id, item.quantity]
                    );
                }
            }

            // 4. Устанавливаем статус "Проведен"
            await client.query("UPDATE core.documents SET status = 'posted', posted_at = NOW() WHERE id = $1", [docId]);

            await client.query('COMMIT'); // Фиксация всех изменений
            return { success: true, status: 'posted' };
        } catch (e) {
            await client.query('ROLLBACK'); // Отмена в случае ошибки
            throw e;
        } finally {
            client.release();
        }
    }
}

module.exports = new DocumentService();
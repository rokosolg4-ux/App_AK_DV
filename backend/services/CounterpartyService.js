const pool = require('../db');

class CounterpartyService {
    // Получить список контрагентов в конкретной папке (или в корне, если parentId = null)
    async getList(parentId = null) {
        const sql = `
            SELECT * FROM core.counterparties 
            WHERE parent_id ${parentId ? '= $1' : 'IS NULL'}
            ORDER BY is_folder DESC, name ASC
        `;
        const res = await pool.query(sql, parentId ? [parentId] : []);
        return res.rows;
    }

    // Поиск контрагента по ИНН или Имени (для быстрой выписки реализации)
    async search(query) {
        const sql = `
            SELECT * FROM core.counterparties 
            WHERE is_folder = false AND (name ILIKE $1 OR inn ILIKE $1)
            LIMIT 10
        `;
        const res = await pool.query(sql, [`%${query}%`]);
        return res.rows;
    }
}

module.exports = new CounterpartyService();м
const pool = require('../db');

class NomenclatureService {
    // Получение списка (папки и товары) для конкретного уровня иерархии
    async getFolderContent(parentId = null) {
        const sql = `
            SELECT id, parent_id, is_folder, type, sku, name, uom, price_retail, stock_total 
            FROM core.nomenclature 
            WHERE parent_id ${parentId ? '= $1' : 'IS NULL'}
            ORDER BY is_folder DESC, name ASC;
        `;
        const res = await pool.query(sql, parentId ? [parentId] : []);
        return res.rows;
    }

    // Создание новой карточки (полноценный реквизитный состав)
    async createItem(data) {
        const { parent_id, is_folder, type, sku, name, uom, price_retail, description } = data;
        const sql = `
            INSERT INTO core.nomenclature (parent_id, is_folder, type, sku, name, uom, price_retail, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const res = await pool.query(sql, [parent_id, is_folder, type, sku, name, uom, price_retail, description]);
        return res.rows[0];
    }
}

module.exports = new NomenclatureService();
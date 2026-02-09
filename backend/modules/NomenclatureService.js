const pool = require('../db');

class NomenclatureService {
    async getCatalog(parentId = null) {
        const sql = `SELECT * FROM core.nomenclature WHERE parent_id ${parentId ? '= $1' : 'IS NULL'} ORDER BY is_folder DESC, name ASC`;
        const res = await pool.query(sql, parentId ? [parentId] : []);
        return res.rows;
    }

    async createProduct(data) {
        const { parent_id, type, sku, name, uom, price_retail } = data;
        const sql = `INSERT INTO core.nomenclature (parent_id, type, sku, name, uom, price_retail) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const res = await pool.query(sql, [parent_id, type, sku, name, uom, price_retail]);
        return res.rows[0];
    }
}
module.exports = new NomenclatureService();
const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { product_id, move_type } = req.query;
    let query = `
      SELECT sm.*, p.name as product_name, p.sku
      FROM stock_moves sm
      LEFT JOIN products p ON sm.product_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (product_id) {
      params.push(product_id);
      conditions.push('sm.product_id = ?');
    }
    if (move_type) {
      params.push(move_type);
      conditions.push('sm.move_type = ?');
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY sm.created_at DESC LIMIT 500';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get moves error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

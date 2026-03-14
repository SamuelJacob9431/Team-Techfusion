const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
        COALESCE((SELECT SUM(s.quantity) FROM stock s WHERE s.product_id = p.id), 0) as stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
      params.push(`%${search}%`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = ?`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    // Fetch stock breakdown per location for each product
    const products = await Promise.all(result.rows.map(async p => {
      const locStock = await pool.query(`
        SELECT l.name as location_name, w.name as warehouse_name, s.quantity
        FROM stock s
        JOIN locations l ON s.location_id = l.id
        JOIN warehouses w ON l.warehouse_id = w.id
        WHERE s.product_id = ?
        ORDER BY w.name, l.name
      `, [p.id]);
      return { ...p, locations_stock: locStock.rows };
    }));

    res.json(products);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    const result = await pool.query(
      'INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, sku, category_id || null, unit_of_measure || 'unit', reorder_level || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;

    const result = await pool.query(
      'UPDATE products SET name=?, sku=?, category_id=?, unit_of_measure=?, reorder_level=? WHERE id=? RETURNING *',
      [name, sku, category_id || null, unit_of_measure || 'unit', reorder_level || 0, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = ? RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

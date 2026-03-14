const pool = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { product_id, quantity, from_location_id, to_location_id } = req.body;
    if (!product_id || !quantity || !from_location_id || !to_location_id) {
      return res.status(400).json({ error: 'product_id, quantity, from_location_id and to_location_id are required' });
    }
    if (from_location_id === to_location_id) {
      return res.status(400).json({ error: 'Source and destination locations must be different' });
    }

    const client = pool.connect();
    await client.query('BEGIN');

    const fromLoc = await pool.query('SELECT name FROM locations WHERE id = ?', [from_location_id]);
    const toLoc = await pool.query('SELECT name FROM locations WHERE id = ?', [to_location_id]);
    const fromName = fromLoc.rows[0]?.name || 'Unknown';
    const toName = toLoc.rows[0]?.name || 'Unknown';

    // Decrease at source
    const srcStock = await pool.query('SELECT id FROM stock WHERE product_id = ? AND location_id = ?', [product_id, from_location_id]);
    if (srcStock.rows.length > 0) {
      await client.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?', [quantity, product_id, from_location_id]);
    } else {
      await client.query('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)', [product_id, from_location_id, -quantity]);
    }

    // Increase at destination
    const dstStock = await pool.query('SELECT id FROM stock WHERE product_id = ? AND location_id = ?', [product_id, to_location_id]);
    if (dstStock.rows.length > 0) {
      await client.query('UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND location_id = ?', [quantity, product_id, to_location_id]);
    } else {
      await client.query('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)', [product_id, to_location_id, quantity]);
    }

    await client.query('INSERT INTO stock_moves (product_id, quantity, move_type, source_location, destination_location) VALUES (?, ?, ?, ?, ?)',
      [product_id, quantity, 'internal_transfer', fromName, toName]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Internal transfer completed', product_id, quantity, from: fromName, to: toName });
  } catch (err) {
    try { await pool.connect().query('ROLLBACK'); } catch(e) {}
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

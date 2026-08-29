const pool = require('../config/db');

exports.create = async (req, res) => {
  let client;
  try {
    const { product_id, location_id, adjustment_quantity, reason } = req.body;
    if (!product_id || !location_id || adjustment_quantity === undefined) {
      return res.status(400).json({ error: 'product_id, location_id and adjustment_quantity are required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Use client for all queries within the transaction
    const stockResult = await client.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [product_id, location_id]);
    const system_quantity = stockResult.rows.length > 0 ? stockResult.rows[0].quantity : 0;
    
    // Calculate new total based on relative adjustment
    const counted_quantity = system_quantity + adjustment_quantity;
    const difference = adjustment_quantity; // The adjustment quantity itself is the difference

    if (counted_quantity < 0) {
      return res.status(400).json({ error: `Adjustment would result in negative stock (${counted_quantity}). Operation aborted.` });
    }

    const adjustmentResult = await client.query('INSERT INTO stock_adjustments (product_id, location_id, counted_quantity, system_quantity, difference, reason) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [product_id, location_id, counted_quantity, system_quantity, difference, reason || null]);
    
    const adjustmentId = adjustmentResult.rows[0]?.id;

    // Update or insert stock
    if (stockResult.rows.length > 0) {
      await client.query('UPDATE stock SET quantity = ? WHERE product_id = ? AND location_id = ?', [counted_quantity, product_id, location_id]);
    } else {
      await client.query('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)', [product_id, location_id, counted_quantity]);
    }

    const locResult = await client.query('SELECT name FROM locations WHERE id = ?', [location_id]);
    const locationName = locResult.rows[0]?.name || 'Unknown';

    await client.query('INSERT INTO stock_moves (product_id, quantity, move_type, source_location, destination_location, reference_id, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product_id, difference, 'adjustment', locationName, locationName, adjustmentId, reason || null]);

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Stock adjustment completed', 
      product_id, 
      system_quantity, 
      counted_quantity, 
      difference 
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch(e) { console.error('Rollback error:', e); }
    }
    console.error('Adjustment error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (client && client.release) client.release();
  }
};

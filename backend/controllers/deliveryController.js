const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM deliveries';
    const params = [];
    
    const conditions = [];
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      const searchId = search.startsWith('DEL-') ? parseInt(search.replace('DEL-', '')) : parseInt(search);
      if (!isNaN(searchId)) {
        conditions.push('(id = ? OR customer_name LIKE ?)');
        params.push(searchId, `%${search}%`);
      } else {
        conditions.push('customer_name LIKE ?');
        params.push(`%${search}%`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const deliveries = await Promise.all(result.rows.map(async d => {
      const items = await pool.query(
        `SELECT di.*, p.name as product_name, p.sku
         FROM delivery_items di
         LEFT JOIN products p ON di.product_id = p.id
         WHERE di.delivery_id = ?`,
        [d.id]
      );
      return { ...d, items: items.rows };
    }));

    res.json(deliveries);
  } catch (err) {
    console.error('Get deliveries error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { customer_name, items, status } = req.body;
    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer name and items are required' });
    }

    const client = pool.connect();
    await client.query('BEGIN');

    const deliveryResult = await client.query(
      'INSERT INTO deliveries (customer_name, status) VALUES (?, ?) RETURNING *',
      [customer_name, status || 'draft']
    );
    const delivery = deliveryResult.rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)',
        [delivery.id, item.product_id, item.quantity]
      );
    }

    await client.query('COMMIT');

    const itemRows = await pool.query(
      `SELECT di.*, p.name as product_name FROM delivery_items di
       LEFT JOIN products p ON di.product_id = p.id WHERE di.delivery_id = ?`,
      [delivery.id]
    );

    res.status(201).json({ ...delivery, items: itemRows.rows });
  } catch (err) {
    try { await pool.connect().query('ROLLBACK'); } catch(e) {}
    console.error('Create delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['picking', 'packing'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update. Use validate for done.' });
    }

    const deliveryResult = await pool.query('SELECT status FROM deliveries WHERE id = ?', [id]);
    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const currentStatus = deliveryResult.rows[0].status;
    if (currentStatus === 'done' || currentStatus === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update a completed or cancelled delivery' });
    }

    const result = await pool.query('UPDATE deliveries SET status = ? WHERE id = ? RETURNING *', [status, id]);
    res.json({ message: `Delivery moved to ${status}`, delivery: result.rows[0] });
  } catch (err) {
    console.error('Update delivery status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.validate = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryResult = await pool.query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    const delivery = deliveryResult.rows[0];
    if (delivery.status === 'done') {
      return res.status(400).json({ error: 'Delivery already validated' });
    }
    if (delivery.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot validate a cancelled delivery' });
    }

    const itemsResult = await pool.query('SELECT * FROM delivery_items WHERE delivery_id = ?', [id]);
    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No items in this delivery' });
    }

    const client = pool.connect();
    await client.query('BEGIN');

    await client.query('UPDATE deliveries SET status = ? WHERE id = ?', ['done', id]);

    const locResult = await pool.query('SELECT id, name FROM locations LIMIT 1');
    const defaultLocation = locResult.rows[0];
    const srcLocationId = defaultLocation ? defaultLocation.id : null;
    const srcLocationName = defaultLocation ? defaultLocation.name : 'Default';

    for (const item of itemsResult.rows) {
      const existing = await pool.query('SELECT id, quantity FROM stock WHERE product_id = ? AND location_id = ?', [item.product_id, srcLocationId]);
      if (existing.rows.length > 0) {
        await client.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?',
          [item.quantity, item.product_id, srcLocationId]);
      } else {
        await client.query('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
          [item.product_id, srcLocationId, -item.quantity]);
      }

      await client.query(
        'INSERT INTO stock_moves (product_id, quantity, move_type, source_location, destination_location, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.product_id, item.quantity, 'delivery', srcLocationName, 'Customer', id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Delivery validated. Stock decreased.', delivery_id: id });
  } catch (err) {
    try { await pool.connect().query('ROLLBACK'); } catch(e) {}
    console.error('Validate delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryResult = await pool.query('SELECT status FROM deliveries WHERE id = ?', [id]);
    if (deliveryResult.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    
    if (deliveryResult.rows[0].status === 'done') {
      return res.status(400).json({ error: 'Cannot cancel a completed delivery' });
    }
    
    await pool.query('UPDATE deliveries SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ message: 'Delivery cancelled successfully' });
  } catch (err) {
    console.error('Cancel delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

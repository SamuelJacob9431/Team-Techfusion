const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM receipts';
    const params = [];
    
    const conditions = [];
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      // Search by ID or Supplier Name
      // Assuming ID is numeric or string match for REC-xxxx
      const searchId = search.startsWith('REC-') ? parseInt(search.replace('REC-', '')) : parseInt(search);
      if (!isNaN(searchId)) {
        conditions.push('(id = ? OR supplier_name LIKE ?)');
        params.push(searchId, `%${search}%`);
      } else {
        conditions.push('supplier_name LIKE ?');
        params.push(`%${search}%`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    // Attach items to each receipt
    const receipts = await Promise.all(result.rows.map(async r => {
      const items = await pool.query(
        `SELECT ri.*, p.name as product_name, p.sku
         FROM receipt_items ri
         LEFT JOIN products p ON ri.product_id = p.id
         WHERE ri.receipt_id = ?`,
        [r.id]
      );
      return { ...r, items: items.rows };
    }));

    res.json(receipts);
  } catch (err) {
    console.error('Get receipts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { supplier_name, items, status } = req.body;
    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier name and items are required' });
    }

    const client = pool.connect();
    await client.query('BEGIN');

    const receiptResult = await client.query(
      'INSERT INTO receipts (supplier_name, status) VALUES (?, ?) RETURNING *',
      [supplier_name, status || 'draft']
    );
    const receipt = receiptResult.rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)',
        [receipt.id, item.product_id, item.quantity]
      );
    }

    await client.query('COMMIT');

    // Fetch items
    const itemRows = await pool.query(
      `SELECT ri.*, p.name as product_name FROM receipt_items ri
       LEFT JOIN products p ON ri.product_id = p.id WHERE ri.receipt_id = ?`,
      [receipt.id]
    );

    res.status(201).json({ ...receipt, items: itemRows.rows });
  } catch (err) {
    try { await pool.connect().query('ROLLBACK'); } catch(e) {}
    console.error('Create receipt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.validate = async (req, res) => {
  try {
    const { id } = req.params;

    const receiptResult = await pool.query('SELECT * FROM receipts WHERE id = ?', [id]);
    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    const receipt = receiptResult.rows[0];
    if (receipt.status === 'done') {
      return res.status(400).json({ error: 'Receipt already validated' });
    }
    if (receipt.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot validate a cancelled receipt' });
    }

    const itemsResult = await pool.query('SELECT * FROM receipt_items WHERE receipt_id = ?', [id]);
    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No items in this receipt' });
    }

    const client = pool.connect();
    await client.query('BEGIN');

    await client.query('UPDATE receipts SET status = ? WHERE id = ?', ['done', id]);

    const locResult = await pool.query('SELECT id, name FROM locations LIMIT 1');
    const defaultLocation = locResult.rows[0];
    const destLocationId = defaultLocation ? defaultLocation.id : null;
    const destLocationName = defaultLocation ? defaultLocation.name : 'Default';

    for (const item of itemsResult.rows) {
      // Upsert stock
      const existing = await pool.query('SELECT id FROM stock WHERE product_id = ? AND location_id = ?', [item.product_id, destLocationId]);
      if (existing.rows.length > 0) {
        await client.query('UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND location_id = ?',
          [item.quantity, item.product_id, destLocationId]);
      } else {
        await client.query('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
          [item.product_id, destLocationId, item.quantity]);
      }

      await client.query(
        'INSERT INTO stock_moves (product_id, quantity, move_type, source_location, destination_location, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.product_id, item.quantity, 'receipt', 'Supplier', destLocationName, id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Receipt validated. Stock increased.', receipt_id: id });
  } catch (err) {
    try { await pool.connect().query('ROLLBACK'); } catch(e) {}
    console.error('Validate receipt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const receiptResult = await pool.query('SELECT status FROM receipts WHERE id = ?', [id]);
    if (receiptResult.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
    
    if (receiptResult.rows[0].status === 'done') {
      return res.status(400).json({ error: 'Cannot cancel a completed receipt' });
    }
    
    await pool.query('UPDATE receipts SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ message: 'Receipt cancelled successfully' });
  } catch (err) {
    console.error('Cancel receipt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

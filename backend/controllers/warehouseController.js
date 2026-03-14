const pool = require('../config/db');

// Warehouses

exports.getAll = async (req, res) => {
  try {
    const whResult = await pool.query('SELECT * FROM warehouses ORDER BY name');
    const warehouses = await Promise.all(whResult.rows.map(async w => {
      const locs = await pool.query('SELECT * FROM locations WHERE warehouse_id = ? ORDER BY name', [w.id]);
      return { ...w, locations: locs.rows };
    }));
    res.json(warehouses);
  } catch (err) {
    console.error('Get warehouses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const result = await pool.query('INSERT INTO warehouses (name, location) VALUES (?, ?) RETURNING *', [name, location || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create warehouse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const result = await pool.query('UPDATE warehouses SET name = ?, location = ? WHERE id = ? RETURNING *', [name, location || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update warehouse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM warehouses WHERE id = ? RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ message: 'Warehouse deleted' });
  } catch (err) {
    console.error('Delete warehouse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Locations

exports.createLocation = async (req, res) => {
  try {
    const { warehouse_id, name } = req.body;
    if (!warehouse_id || !name) return res.status(400).json({ error: 'Warehouse ID and location name are required' });

    const result = await pool.query('INSERT INTO locations (warehouse_id, name) VALUES (?, ?) RETURNING *', [warehouse_id, name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Location name is required' });

    const result = await pool.query('UPDATE locations SET name = ? WHERE id = ? RETURNING *', [name, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM locations WHERE id = ? RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ message: 'Location deleted' });
  } catch (err) {
    console.error('Delete location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

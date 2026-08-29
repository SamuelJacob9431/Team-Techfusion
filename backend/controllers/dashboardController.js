const pool = require('../config/db');

exports.getData = async (req, res) => {
  try {
    const { category_id, warehouse_id } = req.query;

    let productsCondition = '';
    let productsParams = [];
    if (category_id) {
      productsCondition = 'WHERE category_id = ?';
      productsParams.push(category_id);
    }

    let stockJoins = '';
    let stockCondition = '';
    if (warehouse_id) {
      stockJoins = 'JOIN locations l ON s.location_id = l.id';
      stockCondition = 'AND l.warehouse_id = ' + warehouse_id; // Safe if warehouse_id is validated/numeric
    }

    const productsCountQuery = `SELECT COUNT(*) as count FROM products ${productsCondition}`;
    const productsCount = await pool.query(productsCountQuery, productsParams);

    // Low stock: products where total stock <= reorder_level
    const lowStockQuery = `
      SELECT p.id, p.name, p.sku, p.reorder_level,
        COALESCE((SELECT SUM(s.quantity) FROM stock s ${stockJoins} WHERE s.product_id = p.id ${stockCondition}), 0) as stock
      FROM products p
      ${productsCondition}
      WHERE p.reorder_level > 0
      AND COALESCE((SELECT SUM(s.quantity) FROM stock s ${stockJoins} WHERE s.product_id = p.id ${stockCondition}), 0) <= p.reorder_level
    `;
    const lowStock = await pool.query(lowStockQuery, productsParams);

    const pendingReceipts = await pool.query("SELECT COUNT(*) as count FROM receipts WHERE status NOT IN ('done','cancelled')");
    const pendingDeliveries = await pool.query("SELECT COUNT(*) as count FROM deliveries WHERE status NOT IN ('done','cancelled')");
    const transfersCount = await pool.query("SELECT COUNT(*) as count FROM stock_moves WHERE move_type = 'internal_transfer'");

    const stockDistributionQuery = `
      SELECT p.name, COALESCE((SELECT SUM(s.quantity) FROM stock s ${stockJoins} WHERE s.product_id = p.id ${stockCondition}), 0) as stock
      FROM products p
      ${productsCondition}
      ORDER BY stock DESC
      LIMIT 10
    `;
    const stockDistribution = await pool.query(stockDistributionQuery, productsParams);

    const recentMoves = await pool.query(`
      SELECT sm.*, p.name as product_name
      FROM stock_moves sm
      LEFT JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

    res.json({
      kpis: {
        total_products: productsCount.rows[0].count,
        low_stock_items: lowStock.rows.length,
        pending_receipts: pendingReceipts.rows[0].count,
        pending_deliveries: pendingDeliveries.rows[0].count,
        internal_transfers: transfersCount.rows[0].count,
      },
      low_stock_products: lowStock.rows,
      stock_distribution: stockDistribution.rows,
      recent_moves: recentMoves.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

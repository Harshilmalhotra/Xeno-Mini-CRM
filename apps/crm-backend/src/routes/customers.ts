import { Router } from 'express';
import { pool } from '../db';
import { computeChurnScore } from '../services/churnScorer';
import { getCustomerTwinSummary } from '../services/customerTwin';
import { getNextBestAction } from '../services/nextBestAction';

const router = Router();

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { rows: customers } = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    const enriched = await Promise.all(
      customers.map(async (c) => {
        const scoreInfo = await computeChurnScore(c.id);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          city: c.city,
          created_at: c.created_at,
          churnScore: scoreInfo.score,
          churnRisk: scoreInfo.risk,
          daysSinceLastOrder: scoreInfo.daysSinceLastOrder,
          totalOrders: scoreInfo.totalOrders,
          totalSpend: scoreInfo.totalSpend,
          topProduct: scoreInfo.topProduct,
          lastOrderDate: scoreInfo.lastOrderDate,
        };
      })
    );
    res.json(enriched);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers', details: err.message, stack: err.stack });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const customer = rows[0];
    const churn = await computeChurnScore(id);
    const { rows: orders } = await pool.query(
      'SELECT id, product_name, category, amount, ordered_at FROM orders WHERE customer_id = $1 ORDER BY ordered_at DESC',
      [id]
    );

    // Dynamic AI insights
    const [digitalTwin, nextBestAction] = await Promise.all([
      getCustomerTwinSummary(id),
      getNextBestAction(id),
    ]);
    
    res.json({
      ...customer,
      churnScore: churn.score,
      churnRisk: churn.risk,
      daysSinceLastOrder: churn.daysSinceLastOrder,
      totalOrders: churn.totalOrders,
      totalSpend: churn.totalSpend,
      topProduct: churn.topProduct,
      lastOrderDate: churn.lastOrderDate,
      orders,
      digitalTwin,
      nextBestAction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

export default router;

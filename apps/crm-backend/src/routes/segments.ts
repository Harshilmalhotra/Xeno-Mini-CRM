import { Router } from 'express';
import { pool } from '../db';
import * as aiAgent from '../services/aiAgent';

const router = Router();

// GET /api/segments
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM segments ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// POST /api/segments/preview
router.post('/preview', async (req, res) => {
  const { nlQuery } = req.body;
  if (!nlQuery) {
    res.status(400).json({ error: 'nlQuery is required' });
    return;
  }
  try {
    const { sqlFilter, description } = await aiAgent.generateSegmentFilter(nlQuery);
    
    // Execute the SQL filter to get customer IDs and counts
    const query = `
      SELECT c.id, c.name, c.email, c.city,
             MAX(o.ordered_at) AS last_order_date,
             COUNT(o.id) AS order_count,
             SUM(o.amount) AS total_spend,
             EXTRACT(DAY FROM NOW() - MAX(o.ordered_at)) AS days_since_last_order
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id, c.name, c.email, c.city
      HAVING ${sqlFilter}
    `;

    const { rows } = await pool.query(query);
    const customerIds = rows.map((r: any) => r.id);
    
    res.json({
      sqlFilter,
      description,
      customerIds,
      customerCount: rows.length,
      customers: rows, // Send preview of matching customers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

// POST /api/segments
router.post('/', async (req, res) => {
  const { name, nlQuery, sqlFilter, customerIds, description } = req.body;
  if (!name || !nlQuery || !sqlFilter || !customerIds) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  try {
    const customerCount = customerIds.length;
    const { rows } = await pool.query(
      `INSERT INTO segments (name, description, nl_query, sql_filter, customer_ids, customer_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || '', nlQuery, sqlFilter, customerIds, customerCount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save segment' });
  }
});

// DELETE /api/segments/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM segments WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

export default router;

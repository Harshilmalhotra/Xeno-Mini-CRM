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
    
    // Execute the SQL filter to get customer IDs and counts by wrapping aggregates in a subquery c
    const query = `
      SELECT * FROM (
        SELECT c.id, c.name, c.email, c.city,
               MAX(o.ordered_at) AS last_order_date,
               COUNT(o.id) AS order_count,
               COALESCE(SUM(o.amount), 0) AS total_spend,
               COALESCE(EXTRACT(DAY FROM NOW() - MAX(o.ordered_at)), 999) AS days_since_last_order
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id, c.name, c.email, c.city
      ) c
      WHERE ${sqlFilter}
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
    console.error('*** DETAILED ERROR IN POST /api/segments/preview ***');
    console.error(err);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

// POST /api/segments
router.post('/', async (req, res) => {
  const { name, nlQuery, sqlFilter, customerIds, description } = req.body;
  if (!name || !nlQuery || !sqlFilter) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  try {
    let resolvedCustomerIds = customerIds || [];
    
    // Always query database to get actual matching customer IDs for safety
    if (!resolvedCustomerIds || resolvedCustomerIds.length === 0) {
      const query = `
        SELECT id FROM (
          SELECT c.id, c.name, c.email, c.city,
                 MAX(o.ordered_at) AS last_order_date,
                 COUNT(o.id) AS order_count,
                 COALESCE(SUM(o.amount), 0) AS total_spend,
                 COALESCE(EXTRACT(DAY FROM NOW() - MAX(o.ordered_at)), 999) AS days_since_last_order
          FROM customers c
          LEFT JOIN orders o ON o.customer_id = c.id
          GROUP BY c.id, c.name, c.email, c.city
        ) c
        WHERE ${sqlFilter}
      `;
      const { rows } = await pool.query(query);
      resolvedCustomerIds = rows.map((r: any) => r.id);
    }

    const customerCount = resolvedCustomerIds.length;
    const { rows: insertRows } = await pool.query(
      `INSERT INTO segments (name, description, nl_query, sql_filter, customer_ids, customer_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || '', nlQuery, sqlFilter, resolvedCustomerIds, customerCount]
    );
    res.status(201).json(insertRows[0]);
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

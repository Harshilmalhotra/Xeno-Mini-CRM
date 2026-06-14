import { Router } from 'express';
import { pool } from '../db';
import { broadcast } from '../ws/broadcaster';

const router = Router();

const VALID_TRANSITIONS: Record<string, string[]> = {
  sent: ['delivered', 'failed'],
  delivered: ['opened', 'failed'],
  opened: ['clicked'],
  clicked: ['converted'],
  converted: [],
  failed: [],
  pending: ['sent'],
};

// POST /api/receipts
router.post('/', async (req, res) => {
  const { eventId, externalId, event, timestamp } = req.body;
  if (!eventId || !externalId || !event) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // 1. Check if eventId already processed (idempotency check)
    try {
      await pool.query(
        'INSERT INTO processed_event_ids (event_id) VALUES ($1)',
        [eventId]
      );
    } catch (err: any) {
      if (err.code === '23505') {
        // Unique violation: already processed
        res.status(200).json({ status: 'ignored', reason: 'duplicate' });
        return;
      }
      throw err;
    }

    // 2. Fetch campaign message details
    const { rows: msgRows } = await pool.query(
      `SELECT m.*, c.name as customer_name, c.id as customer_id
       FROM campaign_messages m
       JOIN customers c ON c.id = m.customer_id
       WHERE m.external_id = $1`,
      [externalId]
    );

    if (msgRows.length === 0) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const message = msgRows[0];
    const currentStatus = message.status;

    // 3. Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(event)) {
      res.status(200).json({ status: 'ignored', reason: 'invalid_transition', from: currentStatus, to: event });
      return;
    }

    // 4. Update status and event log
    const newLogItem = { event, timestamp, eventId };
    await pool.query(
      `UPDATE campaign_messages
       SET status = $1, event_log = event_log || $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      [event, JSON.stringify([newLogItem]), message.id]
    );

    // 5. Query updated stats for the broadcast
    const statsQuery = `
      SELECT 
        COUNT(id) FILTER (WHERE status != 'pending') AS sent,
        COUNT(id) FILTER (WHERE status IN ('delivered','opened','clicked','converted')) AS delivered,
        COUNT(id) FILTER (WHERE status IN ('opened','clicked','converted')) AS opened,
        COUNT(id) FILTER (WHERE status IN ('clicked','converted')) AS clicked,
        COUNT(id) FILTER (WHERE status = 'converted') AS converted,
        COUNT(id) FILTER (WHERE status = 'failed') AS failed
      FROM campaign_messages
      WHERE campaign_id = $1
    `;
    const { rows: statsRows } = await pool.query(statsQuery, [message.campaign_id]);
    const dbStats = statsRows[0];
    const stats = {
      sent: parseInt(dbStats.sent, 10),
      delivered: parseInt(dbStats.delivered, 10),
      opened: parseInt(dbStats.opened, 10),
      clicked: parseInt(dbStats.clicked, 10),
      converted: parseInt(dbStats.converted, 10),
      failed: parseInt(dbStats.failed, 10),
    };

    // 6. Broadcast via WebSocket
    broadcast({
      type: 'message_update',
      campaignId: message.campaign_id,
      messageId: message.id,
      customerId: message.customer_id,
      customerName: message.customer_name,
      event,
      stats,
    });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

export default router;

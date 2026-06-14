import { pool } from '../db';
import { v4 as uuidv4 } from 'uuid';
import * as aiAgent from './aiAgent';
import { broadcast } from '../ws/broadcaster';
import { computeChurnScore } from './churnScorer';

/**
 * 4.1 Launch Campaign
 * Orchestrates customer loading, message generation, database insertions, and simulator HTTP posts.
 */
export async function launch(campaignId: string): Promise<void> {
  try {
    // 1. Fetch campaign and its segment details
    const campaignQuery = `
      SELECT c.*, s.customer_ids, s.name as segment_name
      FROM campaigns c
      JOIN segments s ON s.id = c.segment_id
      WHERE c.id = $1
    `;
    const { rows: campaignRows } = await pool.query(campaignQuery, [campaignId]);
    if (campaignRows.length === 0) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }
    const campaign = campaignRows[0];
    const customerIds: string[] = campaign.customer_ids;

    if (!customerIds || customerIds.length === 0) {
      // No customers in segment
      await pool.query(
        "UPDATE campaigns SET status = 'completed', sent_at = NOW() WHERE id = $1",
        [campaignId]
      );
      broadcast({ type: 'campaign_completed', campaignId, debriefReady: false });
      return;
    }

    // 2. Fetch customer details + churn scores for AI personalization input
    const customersWithHistory: aiAgent.CustomerWithHistory[] = [];
    for (const cid of customerIds) {
      const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [cid]);
      if (custRows.length > 0) {
        const c = custRows[0];
        const churnInfo = await computeChurnScore(cid);
        customersWithHistory.push({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          city: c.city,
          topProduct: churnInfo.topProduct,
          totalOrders: churnInfo.totalOrders,
          totalSpend: churnInfo.totalSpend,
          daysSinceLastOrder: churnInfo.daysSinceLastOrder,
        });
      }
    }

    // 3. Call AI agent to generate personalized messages in bulk batches
    const personalized = await aiAgent.generatePersonalisedMessages(
      campaign.goal,
      campaign.channel,
      customersWithHistory
    );

    // Map customer ID to message text for quick access during queue loop
    const msgMap = new Map<string, string>();
    personalized.forEach((item) => {
      msgMap.set(item.customerId, item.message);
    });

    // 4. Send messages to simulator
    const stubUrl = process.env.CHANNEL_STUB_URL || 'http://localhost:4001';
    
    // Broadcast starting status
    broadcast({
      type: 'campaign_started',
      campaignId,
      total: customerIds.length,
    });

    for (const customer of customersWithHistory) {
      const messageText = msgMap.get(customer.id) || `Hi ${customer.name}, check out Roastery Co.!`;
      const externalId = uuidv4();
      const recipient = campaign.channel === 'email' ? customer.email : customer.phone;

      // Insert message into database
      const { rows: insertRows } = await pool.query(
        `INSERT INTO campaign_messages (campaign_id, customer_id, message_text, status, external_id, event_log)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [campaignId, customer.id, messageText, 'sent', externalId, JSON.stringify([{ event: 'sent', timestamp: new Date().toISOString() }])]
      );
      const messageId = insertRows[0].id;

      // Dispatch to channel simulator
      try {
        const response = await fetch(`${stubUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalId,
            recipient,
            channel: campaign.channel,
            message: messageText,
            campaignId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Stub HTTP error ${response.status}`);
        }
      } catch (err) {
        console.error(`Failed to dispatch message ${externalId} to channel simulator:`, err);
        // Mark message status as failed locally
        await pool.query(
          `UPDATE campaign_messages
           SET status = 'failed', event_log = event_log || $1::jsonb, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify([{ event: 'failed', timestamp: new Date().toISOString(), error: 'Simulator unreachable' }]), messageId]
        );
      }
    }

    // Check if everything failed instantly
    const { rows: checkRows } = await pool.query(
      `SELECT COUNT(id) as total,
              COUNT(id) FILTER (WHERE status = 'failed') as failed
       FROM campaign_messages
       WHERE campaign_id = $1`,
      [campaignId]
    );
    const counts = checkRows[0];
    if (parseInt(counts.total, 10) === parseInt(counts.failed, 10)) {
      await pool.query(
        "UPDATE campaigns SET status = 'failed' WHERE id = $1",
        [campaignId]
      );
      broadcast({ type: 'campaign_completed', campaignId, debriefReady: false });
    }
  } catch (err) {
    console.error(`Error running campaign ${campaignId}:`, err);
    await pool.query(
      "UPDATE campaigns SET status = 'failed' WHERE id = $1",
      [campaignId]
    );
  }
}

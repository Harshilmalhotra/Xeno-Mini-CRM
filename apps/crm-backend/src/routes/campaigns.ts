import { Router } from 'express';
import { pool } from '../db';
import * as campaignRunner from '../services/campaignRunner';
import * as aiAgent from '../services/aiAgent';
import { broadcast } from '../ws/broadcaster';
import { generateCampaignPlan } from '../services/campaignPlanner';
import { findOpportunities } from '../services/opportunityDiscovery';

const router = Router();

// GET /api/campaigns
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT c.*, s.name as segment_name,
             COUNT(m.id) FILTER (WHERE m.status != 'pending') AS sent_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('delivered','opened','clicked','converted')) AS delivered_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('opened','clicked','converted')) AS opened_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('clicked','converted')) AS clicked_count,
             COUNT(m.id) FILTER (WHERE m.status = 'converted') AS converted_count,
             COUNT(m.id) FILTER (WHERE m.status = 'failed') AS failed_count
      FROM campaigns c
      LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN campaign_messages m ON m.campaign_id = c.id
      GROUP BY c.id, s.name
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(query);
    
    // Parse stats count as numbers
    const formatted = rows.map((r: any) => ({
      ...r,
      sent_count: parseInt(r.sent_count, 10),
      delivered_count: parseInt(r.delivered_count, 10),
      opened_count: parseInt(r.opened_count, 10),
      clicked_count: parseInt(r.clicked_count, 10),
      converted_count: parseInt(r.converted_count, 10),
      failed_count: parseInt(r.failed_count, 10),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await findOpportunities();
    res.json(opportunities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// POST /api/campaigns/plan
router.post('/plan', async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    res.status(400).json({ error: 'Missing goal in request body' });
    return;
  }
  try {
    const plan = await generateCampaignPlan(goal);
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate campaign plan' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT c.*, s.name as segment_name,
             COUNT(m.id) FILTER (WHERE m.status != 'pending') AS sent_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('delivered','opened','clicked','converted')) AS delivered_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('opened','clicked','converted')) AS opened_count,
             COUNT(m.id) FILTER (WHERE m.status IN ('clicked','converted')) AS clicked_count,
             COUNT(m.id) FILTER (WHERE m.status = 'converted') AS converted_count,
             COUNT(m.id) FILTER (WHERE m.status = 'failed') AS failed_count
      FROM campaigns c
      LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN campaign_messages m ON m.campaign_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, s.name
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    const campaign = rows[0];
    const { rows: debriefRows } = await pool.query('SELECT * FROM campaign_debriefs WHERE campaign_id = $1', [id]);
    
    res.json({
      ...campaign,
      sent_count: parseInt(campaign.sent_count, 10),
      delivered_count: parseInt(campaign.delivered_count, 10),
      opened_count: parseInt(campaign.opened_count, 10),
      clicked_count: parseInt(campaign.clicked_count, 10),
      converted_count: parseInt(campaign.converted_count, 10),
      failed_count: parseInt(campaign.failed_count, 10),
      debrief: debriefRows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// POST /api/campaigns
router.post('/', async (req, res) => {
  const { name, segmentId, channel, goal, isAbTest, variantAOffer, variantBOffer } = req.body;
  if (!name || !segmentId || !channel || !goal) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO campaigns (name, segment_id, channel, goal, status, is_ab_test, variant_a_offer, variant_b_offer)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7) RETURNING *`,
      [name, segmentId, channel, goal, isAbTest || false, variantAOffer || null, variantBOffer || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// POST /api/campaigns/:id/launch
router.post('/:id/launch', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Check if campaign exists and is in draft state
    const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const campaign = rows[0];
    if (campaign.status !== 'draft') {
      res.status(400).json({ error: 'Only draft campaigns can be launched' });
      return;
    }

    // 2. Set campaign status to running in DB
    await pool.query(
      'UPDATE campaigns SET status = $1, sent_at = NOW() WHERE id = $2',
      ['running', id]
    );

    // 3. Launch asynchronously
    campaignRunner.launch(id).catch((err) => {
      console.error(`Error in async campaign runner for ${id}:`, err);
    });

    res.status(202).json({ message: 'Campaign launch initiated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// GET /api/campaigns/:id/messages
router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT m.*, c.name as customer_name
      FROM campaign_messages m
      JOIN customers c ON c.id = m.customer_id
      WHERE m.campaign_id = $1
      ORDER BY m.created_at ASC
    `;
    const { rows } = await pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch campaign messages' });
  }
});

// POST /api/campaigns/:id/complete
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Mark campaign as completed in DB
    await pool.query("UPDATE campaigns SET status = 'completed' WHERE id = $1", [id]);

    // 2. Fetch campaign details and stats
    const campaignQuery = `
      SELECT c.*, s.name as segment_name
      FROM campaigns c
      JOIN segments s ON s.id = c.segment_id
      WHERE c.id = $1
    `;
    const { rows: campaignRows } = await pool.query(campaignQuery, [id]);
    if (campaignRows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const campaign = campaignRows[0];

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
    const { rows: statsRows } = await pool.query(statsQuery, [id]);
    const dbStats = statsRows[0];
    const totalSent = parseInt(dbStats.sent, 10) || 0;

    const deliveredRate = totalSent > 0 ? (parseInt(dbStats.delivered, 10) / totalSent) : 0;
    const openedRate = totalSent > 0 ? (parseInt(dbStats.opened, 10) / totalSent) : 0;
    const clickedRate = totalSent > 0 ? (parseInt(dbStats.clicked, 10) / totalSent) : 0;
    const convertedRate = totalSent > 0 ? (parseInt(dbStats.converted, 10) / totalSent) : 0;

    // 3. Find click-but-no-buy customer IDs (status is clicked, not converted)
    const { rows: clickNoBuyRows } = await pool.query(
      "SELECT customer_id FROM campaign_messages WHERE campaign_id = $1 AND status = 'clicked'",
      [id]
    );
    const clickNoBuyIds = clickNoBuyRows.map(r => r.customer_id);

    // 4. Generate AI debrief
    const debriefStats = {
      campaignName: campaign.name,
      channel: campaign.channel,
      goal: campaign.goal,
      totalSent,
      deliveredRate,
      openedRate,
      clickedRate,
      convertedRate,
      clickNoBuyCount: clickNoBuyIds.length,
    };

    const debrief = await aiAgent.generateCampaignDebrief(debriefStats);

    // 5. Save debrief to DB
    await pool.query(
      `INSERT INTO campaign_debriefs (campaign_id, summary, best_channel, click_no_buy_ids, recommendation, best_send_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (campaign_id) DO UPDATE
       SET summary = EXCLUDED.summary,
           best_channel = EXCLUDED.best_channel,
           click_no_buy_ids = EXCLUDED.click_no_buy_ids,
           recommendation = EXCLUDED.recommendation,
           best_send_time = EXCLUDED.best_send_time`,
      [id, debrief.summary, debrief.bestChannel, clickNoBuyIds, debrief.recommendation, debrief.bestSendTime]
    );

    // 6. Broadcast completed status to WebSockets
    broadcast({
      type: 'campaign_completed',
      campaignId: id,
      debriefReady: true,
    });

    res.json({ success: true, debrief });
  } catch (err) {
    console.error("Error completing campaign:", err);
    res.status(500).json({ error: 'Failed to complete campaign and generate debrief' });
  }
});

export default router;

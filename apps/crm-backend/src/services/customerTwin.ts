import { GoogleGenAI } from '@google/genai';
import { computeChurnScore } from './churnScorer';
import { pool } from '../db';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function getCustomerTwinSummary(customerId: string): Promise<string> {
  try {
    // 1. Check cache first
    const cacheQuery = `
      SELECT summary, updated_at 
      FROM customer_twins 
      WHERE customer_id = $1 
        AND updated_at > NOW() - INTERVAL '24 hours'
    `;
    const { rows: cacheRows } = await pool.query(cacheQuery, [customerId]);
    if (cacheRows.length > 0) {
      return cacheRows[0].summary;
    }

    // 2. Fetch fresh database profiles
    const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (custRows.length === 0) {
      throw new Error(`Customer ${customerId} not found`);
    }
    const customer = custRows[0];

    const churn = await computeChurnScore(customerId);

    // Dynamic loyalty tier determination
    let loyaltyTier = 'Bronze';
    if (churn.totalSpend > 10000) loyaltyTier = 'Platinum';
    else if (churn.totalSpend > 5000) loyaltyTier = 'Gold';
    else if (churn.totalSpend > 2000) loyaltyTier = 'Silver';

    // Fetch order history summary
    const { rows: orders } = await pool.query(
      `SELECT product_name, category, amount, ordered_at 
       FROM orders WHERE customer_id = $1 
       ORDER BY ordered_at DESC LIMIT 10`,
      [customerId]
    );

    // Fetch historic campaign messages
    const { rows: campaigns } = await pool.query(
      `SELECT cm.status, c.channel, c.name as campaign_name
       FROM campaign_messages cm
       JOIN campaigns c ON c.id = cm.campaign_id
       WHERE cm.customer_id = $1`,
      [customerId]
    );

    const orderDetails = orders.map(o => `${o.product_name} (${o.category}, ₹${o.amount}) at ${new Date(o.ordered_at).toLocaleDateString()}`).join(', ');
    const campaignDetails = campaigns.map(c => `Campaign "${c.campaign_name}" via ${c.channel} resulted in status ${c.status}`).join(', ');

    // 3. Request summary from Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Generate a digital twin summary for:
      Customer Name: ${customer.name}
      City: ${customer.city}
      Loyalty Tier: ${loyaltyTier}
      Lifetime Spend: ₹${churn.totalSpend}
      Total Orders: ${churn.totalOrders}
      Churn Risk: ${churn.risk} (Score: ${churn.score}/100)
      Recent Order Details: [${orderDetails}]
      Campaign Message Engagements: [${campaignDetails}]`,
      config: {
        systemInstruction: `You are an AI Customer Digital Twin engine for Roastery Co.
Analyze the customer's purchase history and campaign responses. Write a warm, 3-sentence description of this customer in third-person.
Explain:
1. What kind of coffee shopper they are (loyal, lapsed, bargain hunter, etc.) and how frequently they buy.
2. What products they prefer (specialty drinks, beans, subscriptions).
3. What channel they respond to best (e.g. WhatsApp, Email) and what offers work.
Make it concise and read like a brief marketing digest.`,
      },
    });

    const summary = (response.text || `Summary for ${customer.name}`).trim();

    // 4. Save to cache database
    await pool.query(
      `INSERT INTO customer_twins (customer_id, summary, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (customer_id) DO UPDATE
       SET summary = EXCLUDED.summary, updated_at = NOW()`,
      [customerId, summary]
    );

    return summary;
  } catch (err) {
    console.error(`Error generating digital twin for ${customerId}:`, err);
    return 'Customer profile analysis is currently unavailable.';
  }
}

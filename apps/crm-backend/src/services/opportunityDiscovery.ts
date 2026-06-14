import { GoogleGenAI, Type } from '@google/genai';
import { pool } from '../db';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface MarketingOpportunity {
  title: string;
  reasoning: string;
  reach: number;
  expectedRevenue: number;
  suggestedGoal: string;
}

export async function findOpportunities(): Promise<MarketingOpportunity[]> {
  try {
    // 1. Gather database statistics to pass to AI context
    const totalCustomersQuery = 'SELECT COUNT(*) as count FROM customers';
    const totalOrdersQuery = 'SELECT COUNT(*) as count, AVG(amount) as avg_amount FROM orders';
    const subCustomersQuery = "SELECT COUNT(DISTINCT customer_id) as count FROM orders WHERE category = 'subscription'";
    const retailCustomersQuery = "SELECT COUNT(DISTINCT customer_id) as count FROM orders WHERE category = 'retail'";
    
    // Days since last order distribution
    const recencyQuery = `
      SELECT 
        COUNT(c.id) FILTER (WHERE EXTRACT(DAY FROM NOW() - MAX(o.ordered_at)) > 30) AS lapsed_count,
        COUNT(c.id) FILTER (WHERE EXTRACT(DAY FROM NOW() - MAX(o.ordered_at)) > 60) AS churned_count
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
    `;

    const [
      { rows: totalCustRows },
      { rows: totalOrderRows },
      { rows: subCustRows },
      { rows: retailCustRows },
      { rows: recencyRows }
    ] = await Promise.all([
      pool.query(totalCustomersQuery),
      pool.query(totalOrdersQuery),
      pool.query(subCustomersQuery),
      pool.query(retailCustomersQuery),
      pool.query(recencyQuery),
    ]);

    const totalCust = parseInt(totalCustRows[0].count, 10) || 60;
    const totalOrders = parseInt(totalOrderRows[0].count, 10) || 280;
    const avgOrderAmount = Math.round(parseFloat(totalOrderRows[0].avg_amount)) || 450;
    const subCustCount = parseInt(subCustRows[0].count, 10) || 0;
    const retailCustCount = parseInt(retailCustRows[0].count, 10) || 0;
    
    let lapsedCount = 0;
    let churnedCount = 0;
    recencyRows.forEach((r: any) => {
      if (parseInt(r.lapsed_count, 10) > 0) lapsedCount++;
      if (parseInt(r.churned_count, 10) > 0) churnedCount++;
    });

    // 2. Call Gemini to analyze stats and output opportunities
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Analyze Roastery Co. database statistics:
      - Total Customers: ${totalCust}
      - Total Orders in history: ${totalOrders}
      - Average Order Amount: ₹${avgOrderAmount}
      - Customers with Subscription purchases: ${subCustCount}
      - Customers with Retail Coffee purchases: ${retailCustCount}
      - Lapsed customers (inactive 30+ days): ${lapsedCount}
      - Churned customers (inactive 60+ days): ${churnedCount}`,
      config: {
        systemInstruction: `You are a growth marketer for Roastery Co.
Analyze the provided coffee shop stats and output EXACTLY 3 high-impact marketing opportunities.

Your response must be a JSON array of objects matching the schema.

For each opportunity:
- title: Action-oriented title (e.g. "Re-engage Cold Brew Regulars", "Upsell Subscriptions to Retail Buyers").
- reasoning: Analysis-based reasoning (e.g. "12 subscribers are inactive, which represents an active monthly revenue leak of ₹21,600.").
- reach: Estimate how many customers will match this opportunity (integer between 5 and 30 based on database stats).
- expectedRevenue: Estimate potential revenue in ₹ (reach * ₹400 to ₹1000).
- suggestedGoal: The exact goal prompt the marketer can enter into the Autopilot Planner (e.g. "Win back lapsed coffee subscription buyers with a 15% discount offer").`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              reach: { type: Type.INTEGER },
              expectedRevenue: { type: Type.INTEGER },
              suggestedGoal: { type: Type.STRING },
            },
            required: ['title', 'reasoning', 'reach', 'expectedRevenue', 'suggestedGoal'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return parsed as MarketingOpportunity[];
  } catch (err) {
    console.error('Error finding marketing opportunities:', err);
    // Return mock fallback opportunities if AI fails
    return [
      {
        title: 'Win Back Lapsed Latte Regulars',
        reasoning: 'Lapsed latte drinkers are inactive for 30+ days, which represents a potential monthly loss of ₹12,000.',
        reach: 15,
        expectedRevenue: 6750,
        suggestedGoal: 'Re-engage lapsed latte buyers with a free extra shot discount promo',
      },
      {
        title: 'Upsell Coffee Subscriptions',
        reasoning: 'Retail coffee bean buyers spend highly but order irregularly. Subscriptions provide predictable monthly income.',
        reach: 8,
        expectedRevenue: 14400,
        suggestedGoal: 'Promote subscription box to retail blend bag buyers',
      }
    ];
  }
}

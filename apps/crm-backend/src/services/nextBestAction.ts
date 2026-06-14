import { GoogleGenAI, Type } from '@google/genai';
import { computeChurnScore } from './churnScorer';
import { pool } from '../db';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface NextBestAction {
  customerId: string;
  action: string;
  reason: string;
  confidence: number;
}

export async function getNextBestAction(customerId: string): Promise<NextBestAction> {
  try {
    // 1. Fetch customer details
    const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (custRows.length === 0) {
      throw new Error(`Customer ${customerId} not found`);
    }
    const customer = custRows[0];

    // 2. Fetch churn metrics and purchase summary
    const churn = await computeChurnScore(customerId);

    // Dynamic loyalty tier determination
    let loyaltyTier = 'Bronze';
    if (churn.totalSpend > 10000) loyaltyTier = 'Platinum';
    else if (churn.totalSpend > 5000) loyaltyTier = 'Gold';
    else if (churn.totalSpend > 2000) loyaltyTier = 'Silver';

    // 3. Prompt Gemini with context
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Determine Next Best Action for customer profile:
      - Name: ${customer.name}
      - City: ${customer.city}
      - Loyalty Tier: ${loyaltyTier}
      - Lifetime Spend: ₹${churn.totalSpend}
      - Total Orders: ${churn.totalOrders}
      - Days Since Last Order: ${churn.daysSinceLastOrder}
      - Top Product Purchased: ${churn.topProduct}
      - Churn Risk: ${churn.risk} (Score: ${churn.score}/100)`,
      config: {
        systemInstruction: `You are a CRM predictive engine for Roastery Co., a premium coffee brand.
Analyze the customer's history and generate the single Next Best Action to increase retention, engagement, or average order value.

Your output must be a JSON object matching the requested schema.

Rules:
- action: Short marketing action (e.g. "Send Subscription discount", "Cross-sell Seasonal Blend Bag", "Acknowledge Birthday", "Offer free espresso upgrade"). Max 60 characters.
- reason: Explanation of why this action is optimal (e.g. "Bought Flat White 4 times but inactive for 25 days"). Max 120 characters.
- confidence: Integer score between 50 and 99 reflecting prediction certainty based on purchase recency and loyalty strength.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            reason: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
          },
          required: ['action', 'reason', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      customerId,
      action: parsed.action,
      reason: parsed.reason,
      confidence: parsed.confidence,
    };
  } catch (err) {
    console.error(`Error calculating next best action for ${customerId}:`, err);
    return {
      customerId,
      action: 'Send Warm Latte Promo',
      reason: 'General retention outreach for coffee drinkers.',
      confidence: 70,
    };
  }
}

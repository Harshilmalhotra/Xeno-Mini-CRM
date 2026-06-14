import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Gemini SDK. If no key is provided, it falls back to the GEMINI_API_KEY env var
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface CustomerWithHistory {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  topProduct: string;
  totalOrders: number;
  totalSpend: number;
  daysSinceLastOrder: number;
}

export interface DebriefStats {
  campaignName: string;
  channel: string;
  goal: string;
  totalSent: number;
  deliveredRate: number;
  openedRate: number;
  clickedRate: number;
  convertedRate: number;
  clickNoBuyCount: number;
}

export interface DebriefResult {
  summary: string;
  bestChannel: string | null;
  recommendation: string;
  bestSendTime: string | null;
}

/**
 * 3.1 NL to Segment Filter
 * Generates a valid SQL HAVING clause fragment based on plain English user prompt.
 */
export async function generateSegmentFilter(
  nlQuery: string
): Promise<{ sqlFilter: string; description: string }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Generate a SQL segment HAVING filter for: "${nlQuery}"`,
      config: {
        systemInstruction: `You are a SQL expert for a retail CRM. Given a natural language query about customers, generate a HAVING clause filter for the following aggregated view:

Columns available:
- c.id, c.name, c.email, c.city (grouped)
- last_order_date (TIMESTAMPTZ)
- order_count (INTEGER)
- total_spend (NUMERIC)
- days_since_last_order (INTEGER)

Scale context:
- Customer order amounts range from ₹180 to ₹2400.
- Lifetime total spend of customers ranges from ₹180 to ₹15,000.
- Loyalty Tiers: Bronze (total_spend <= 2000), Silver (total_spend BETWEEN 2001 AND 5000), Gold (total_spend BETWEEN 5001 AND 10000), Platinum (total_spend > 10000).
- A "low spend" segment is typically total_spend < 1000 or total_spend < 1500.
- A "high spend" segment is typically total_spend > 5000.

Rules:
- sqlFilter must be a valid PostgreSQL filter that can be placed in a HAVING clause. Use the exact aggregated column names listed above.
- Do NOT include 'HAVING' word itself, only the condition.
- Use inline values, not placeholders. Use string literals like 'Delhi' or 'Mumbai'.
- For days since last order, construct standard comparisons like: "days_since_last_order > 60".
- Output ONLY a JSON object matching the requested schema. Do not write markdown tags outside the JSON.
- If the query is ambiguous, make a logical assumption and reflect it in the description.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sqlFilter: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['sqlFilter', 'description'],
        },
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return {
      sqlFilter: parsed.sqlFilter.trim(),
      description: parsed.description,
    };
  } catch (err) {
    console.error('Error generating segment filter from Gemini:', err);
    throw new Error('AI failed to parse segment request.');
  }
}

/**
 * 3.2 Per-customer message personalization
 * Takes a list of customers and generates custom friendly marketing messages for each.
 */
export async function generatePersonalisedMessages(
  goal: string,
  channel: string,
  customers: CustomerWithHistory[]
): Promise<Array<{ customerId: string; message: string }>> {
  if (customers.length === 0) return [];

  // Batch into chunks of 30 customers to optimize API performance
  const batchSize = 30;
  const batches: CustomerWithHistory[][] = [];
  for (let i = 0; i < customers.length; i += batchSize) {
    batches.push(customers.slice(i, i + batchSize));
  }

  const runBatch = async (batch: CustomerWithHistory[]) => {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: JSON.stringify(batch),
      config: {
        systemInstruction: `You are a CRM messaging agent for Roastery Co., a premium coffee brand.
Generate a friendly, highly personalized marketing message for each customer in the array.

Rules:
- Output ONLY a JSON array containing objects with: "customerId" and "message".
- Each message must reference the customer's actual purchase details (e.g. name, their topProduct, totalOrders, daysSinceLastOrder).
- Keep messages short and within limits: SMS <= 160 chars, WhatsApp/RCS <= 300 chars, Email <= 400 chars.
- Tone: warm, inviting, like a local cafe that knows its regulars.
- Avoid generic phrases like "Dear customer" or just "Hi {name}". Write something genuinely tailored to their coffee habit.
- Channel: ${channel}
- Goal: ${goal}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              customerId: { type: Type.STRING },
              message: { type: Type.STRING },
            },
            required: ['customerId', 'message'],
          },
        },
      },
    });

    const text = response.text || '';
    return JSON.parse(text) as Array<{ customerId: string; message: string }>;
  };

  try {
    const results = await Promise.all(batches.map(runBatch));
    return results.flat();
  } catch (err) {
    console.error('Error personalizing messages via Gemini:', err);
    throw new Error('AI personalization batch request failed.');
  }
}

/**
 * 3.3 Post-campaign AI debrief
 * Aggregates statistics of message conversion/click rates and generates a marketing review.
 */
export async function generateCampaignDebrief(
  stats: DebriefStats
): Promise<DebriefResult> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Campaign Results: ${JSON.stringify(stats)}`,
      config: {
        systemInstruction: `You are a marketing analytics AI for Roastery Co. Analyze the provided campaign stats and write a brief, plain-English summary.

Output ONLY a JSON object matching the requested schema.

Rules:
- summary: A 2-3 sentence review summarizing the outcome (e.g., "The campaign hit its goal, converting 15% of lapsed customers. WhatsApp proved to be extremely responsive, while email lags behind."). If A/B test results are present in statistics, compare Variant A vs Variant B and state the winner.
- bestChannel: The name of the channel that had the best response, or null.
- recommendation: 1-2 sentences with concrete recommendations for what to do next.
- bestSendTime: Recommended send time (e.g. '7–9 PM' or '9–11 AM'), or null.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            bestChannel: { type: Type.STRING, nullable: true },
            recommendation: { type: Type.STRING },
            bestSendTime: { type: Type.STRING, nullable: true },
          },
          required: ['summary', 'recommendation'],
        },
      },
    });

    const text = response.text || '';
    return JSON.parse(text) as DebriefResult;
  } catch (err) {
    console.error('Error generating campaign debrief via Gemini:', err);
    return {
      summary: 'Campaign run completed successfully. No detailed AI analysis could be generated at this time.',
      bestChannel: stats.channel,
      recommendation: 'Monitor customer list for future engagement opportunities.',
      bestSendTime: '9 AM - 12 PM',
    };
  }
}

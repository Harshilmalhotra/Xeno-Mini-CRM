import { pool } from '../db';

export interface ChurnResult {
  score: number;
  risk: 'low' | 'medium' | 'high';
  daysSinceLastOrder: number;
  totalOrders: number;
  totalSpend: number;
  topProduct: string;
  lastOrderDate: Date;
}

export async function computeChurnScore(customerId: string): Promise<ChurnResult> {
  const { rows } = await pool.query(
    `SELECT amount, ordered_at, product_name FROM orders
     WHERE customer_id = $1 ORDER BY ordered_at DESC`,
    [customerId]
  );

  if (rows.length === 0) {
    return { score: 100, risk: 'high', daysSinceLastOrder: 999, totalOrders: 0, totalSpend: 0, topProduct: 'None', lastOrderDate: new Date(0) };
  }

  const now = Date.now();
  const lastOrder = new Date(rows[0].ordered_at);
  const daysSinceLastOrder = Math.floor((now - lastOrder.getTime()) / 86400000);

  let score = 0;
  if (daysSinceLastOrder <= 7) score += 0;
  else if (daysSinceLastOrder <= 30) score += 20;
  else if (daysSinceLastOrder <= 60) score += 40;
  else score += 60;

  const last30 = rows.filter(r => (now - new Date(r.ordered_at).getTime()) < 30 * 86400000).length;
  const prior30 = rows.filter(r => {
    const d = now - new Date(r.ordered_at).getTime();
    return d >= 30 * 86400000 && d < 60 * 86400000;
  }).length;

  if (last30 === 0 && prior30 > 0) score += 25;
  else if (last30 < prior30) score += 15;

  const amounts = rows.map(r => parseFloat(r.amount));
  if (amounts.length >= 4) {
    const recentAvg = (amounts[0] + amounts[1]) / 2;
    const priorAvg = (amounts[2] + amounts[3]) / 2;
    if (recentAvg < priorAvg * 0.85) score += 15;
    else if (recentAvg < priorAvg) score += 5;
  }

  const productCounts: Record<string, number> = {};
  rows.forEach(r => { productCounts[r.product_name] = (productCounts[r.product_name] || 0) + 1; });
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0][0];

  return {
    score: Math.min(100, score),
    risk: score <= 40 ? 'low' : score <= 70 ? 'medium' : 'high',
    daysSinceLastOrder,
    totalOrders: rows.length,
    totalSpend: Math.round(amounts.reduce((a, b) => a + b, 0)),
    topProduct,
    lastOrderDate: lastOrder,
  };
}

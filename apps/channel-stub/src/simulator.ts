import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const CHANNEL_CONFIG: Record<
  string,
  { deliveredRate: number; openedRate: number; clickedRate: number; convertedRate: number; baseDelayMs: number }
> = {
  whatsapp: { deliveredRate: 0.92, openedRate: 0.78, clickedRate: 0.34, convertedRate: 0.15, baseDelayMs: 800 },
  sms:      { deliveredRate: 0.76, openedRate: 0.55, clickedRate: 0.18, convertedRate: 0.08, baseDelayMs: 1200 },
  email:    { deliveredRate: 0.61, openedRate: 0.32, clickedRate: 0.12, convertedRate: 0.05, baseDelayMs: 2000 },
  rcs:      { deliveredRate: 0.88, openedRate: 0.70, clickedRate: 0.28, convertedRate: 0.11, baseDelayMs: 600 },
};

// In-flight messages tracking per campaign to trigger completed state accurately
const inFlight = new Map<string, Set<string>>(); // campaignId -> Set of externalIds
const expectedCount = new Map<string, number>(); // campaignId -> total number expected
const receivedCount = new Map<string, number>(); // campaignId -> total number received

function registerMessage(campaignId: string, externalId: string, total: number) {
  if (!inFlight.has(campaignId)) {
    inFlight.set(campaignId, new Set());
    expectedCount.set(campaignId, total);
    receivedCount.set(campaignId, 0);
  }
  inFlight.get(campaignId)!.add(externalId);
  receivedCount.set(campaignId, receivedCount.get(campaignId)! + 1);
}

async function checkCampaignCompletion(campaignId: string) {
  const set = inFlight.get(campaignId);
  const rec = receivedCount.get(campaignId) || 0;
  const exp = expectedCount.get(campaignId) || 0;

  if (set && set.size === 0 && rec >= exp) {
    console.log(`Campaign ${campaignId} simulation finished completely! Notifying CRM...`);
    inFlight.delete(campaignId);
    receivedCount.delete(campaignId);
    expectedCount.delete(campaignId);
    
    // Notify crm-backend of completion
    const receiptUrl = process.env.CRM_RECEIPT_URL || 'http://localhost:4000/api/receipts';
    const completeUrl = receiptUrl.replace(/\/receipts$/, `/campaigns/${campaignId}/complete`);
    try {
      const response = await fetch(completeUrl, { method: 'POST' });
      if (!response.ok) {
        console.error(`CRM responded with status ${response.status} to completion check`);
      }
    } catch (err) {
      console.error(`Failed to notify CRM of campaign completion for ${campaignId}:`, err);
    }
  }
}

function deregisterMessage(campaignId: string, externalId: string) {
  const set = inFlight.get(campaignId);
  if (set) {
    set.delete(externalId);
  }
  checkCampaignCompletion(campaignId).catch(console.error);
}

async function fireCallback(eventId: string, externalId: string, event: string, isRetry = false): Promise<void> {
  const url = process.env.CRM_RECEIPT_URL || 'http://localhost:4000/api/receipts';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        externalId,
        event,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      throw new Error(`CRM returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`Callback error for ${event} message ${externalId} (isRetry: ${isRetry}):`, err);
    if (!isRetry) {
      // Retry once after 3 seconds with the same eventId
      setTimeout(() => {
        fireCallback(eventId, externalId, event, true).catch(console.error);
      }, 3000);
    }
  }
}

export async function handleSend(req: Request, res: Response) {
  const { externalId, recipient, channel, campaignId, totalMessages } = req.body;
  if (!externalId || !recipient || !channel || !campaignId) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  // Respond 200 immediately
  res.json({ accepted: true });

  const total = parseInt(totalMessages, 10) || 1;
  registerMessage(campaignId, externalId, total);

  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp;

  // Step 1: Delivery Delay
  setTimeout(async () => {
    const delivered = Math.random() < config.deliveredRate;
    if (!delivered) {
      // Failed delivery
      await fireCallback(uuidv4(), externalId, 'failed');
      deregisterMessage(campaignId, externalId);
      return;
    }

    // Success delivery
    const deliveryEventId = uuidv4();
    await fireCallback(deliveryEventId, externalId, 'delivered');

    // Occasionally (10%), send duplicate delivered callback to test idempotency
    if (Math.random() < 0.10) {
      setTimeout(async () => {
        console.log(`Sending duplicate 'delivered' event for message ${externalId}`);
        await fireCallback(deliveryEventId, externalId, 'delivered');
      }, 500);
    }

    // Step 2: Open check
    const opened = Math.random() < config.openedRate;
    if (!opened) {
      deregisterMessage(campaignId, externalId);
      return;
    }

    setTimeout(async () => {
      await fireCallback(uuidv4(), externalId, 'opened');

      // Step 3: Click check
      const clicked = Math.random() < config.clickedRate;
      if (!clicked) {
        deregisterMessage(campaignId, externalId);
        return;
      }

      setTimeout(async () => {
        await fireCallback(uuidv4(), externalId, 'clicked');

        // Step 4: Conversion check
        const converted = Math.random() < config.convertedRate;
        if (!converted) {
          deregisterMessage(campaignId, externalId);
          return;
        }

        setTimeout(async () => {
          await fireCallback(uuidv4(), externalId, 'converted');
          deregisterMessage(campaignId, externalId);
        }, 5000 + Math.random() * 15000); // 5s to 20s

      }, 3000 + Math.random() * 9000); // 3s to 12s

    }, 2000 + Math.random() * 6000); // 2s to 8s

  }, config.baseDelayMs + Math.random() * 500); // base + 0 to 500ms
}

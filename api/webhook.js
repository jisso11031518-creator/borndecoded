/**
 * POST /api/webhook
 * Payhip payment webhook → verify signature → trigger report generation
 */

import crypto from 'crypto';
import { getOrder, isCompleted } from '../lib/error-handler.mjs';
import { generateReport } from './generate-report.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;

    // ---- Step 1: Verify Payhip signature ----
    const apiKey = process.env.PAYHIP_API_KEY;
    if (!apiKey) {
      console.error('[Webhook] PAYHIP_API_KEY not set');
      return res.status(500).end();
    }

    const expectedSig = crypto.createHash('sha256').update(apiKey).digest('hex');
    if (!body.signature || body.signature !== expectedSig) {
      console.warn('[Webhook] Invalid Payhip signature');
      return res.status(401).end();
    }

    // ---- Step 2: Check event type ----
    if (body.type !== 'paid') {
      console.log(`[Webhook] Ignoring event: ${body.type}`);
      return res.status(200).json({ ok: true, skipped: body.type });
    }

    // ---- Step 3: Identify product + orderId ----
    const items = body.items || [];
    const productKey = items[0]?.product_key || '';
    const payhipTxId = body.id;
    const customerEmail = body.email;

    // Determine product type from Payhip product key
    const SAJU_KEY = process.env.PAYHIP_SAJU_KEY || '1dXEc';
    const COMPAT_KEY = process.env.PAYHIP_COMPAT_KEY || 'PIAGa';

    let product = null;
    if (productKey === SAJU_KEY) product = 'saju';
    else if (productKey === COMPAT_KEY) product = 'compatibility';
    else {
      console.warn(`[Webhook] Unknown product key: ${productKey}`);
      return res.status(200).json({ ok: true, error: 'unknown product' });
    }

    // Find order by customer email in KV (Payhip doesn't support custom orderId passthrough)
    // We search recent orders by email match
    const orderId = await findOrderByEmail(customerEmail, product);
    if (!orderId) {
      console.error(`[Webhook] No pending order for ${customerEmail} (${product})`);
      return res.status(200).json({ ok: true, error: 'order not found' });
    }

    // ---- Step 4: Duplicate check ----
    if (await isCompleted(orderId)) {
      console.log(`[Webhook] Already completed: ${orderId}`);
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // ---- Step 5: Get order data from KV ----
    const orderData = await getOrder(orderId);
    if (!orderData) {
      console.error(`[Webhook] Order data not found in KV: ${orderId}`);
      return res.status(200).json({ ok: true, error: 'order data missing' });
    }

    // ---- Step 6: Generate report ----
    const result = await generateReport(orderData, orderId);

    return res.status(200).json({ ok: true, orderId, ...result });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}

/**
 * Find most recent pending order by email + product type
 * Scans KV for orders matching email that aren't completed yet
 */
async function findOrderByEmail(email, product) {
  const { kv } = await import('@vercel/kv');

  // Scan order keys
  let cursor = 0;
  const candidates = [];
  do {
    const [nextCursor, keys] = await kv.scan(cursor, { match: 'order:*', count: 50 });
    cursor = Number(nextCursor);
    candidates.push(...keys);
  } while (cursor !== 0);

  // Check each order for email match (most recent first — keys are UUID-based)
  for (const key of candidates.reverse()) {
    const orderId = key.replace('order:', '');
    const completed = await isCompleted(orderId);
    if (completed) continue;

    const data = await getOrder(orderId);
    if (!data) continue;
    if (data.email?.toLowerCase() === email?.toLowerCase() && data.product === product) {
      return orderId;
    }
  }

  return null;
}

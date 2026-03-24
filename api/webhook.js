/**
 * POST /api/webhook
 * Lemon Squeezy payment webhook → verify signature → trigger report generation
 */

import crypto from 'crypto';
import { getOrder, isCompleted } from '../lib/error-handler.mjs';
import { generateReport } from './generate-report.js';

// Disable Vercel's default body parser so we can read raw body for HMAC
export const config = {
  api: { bodyParser: false },
};

// Read raw body from request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // ---- Step 1: Read raw body + verify signature ----
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET not set');
      return res.status(500).end();
    }

    const rawBody = await getRawBody(req);
    const signature = req.headers['x-signature'];

    if (!signature) {
      console.warn('[Webhook] Missing X-Signature header');
      return res.status(401).end();
    }

    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hmac !== signature) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).end();
    }

    // ---- Step 2: Parse event ----
    const body = JSON.parse(rawBody);
    const eventName = body.meta?.event_name;

    if (eventName !== 'order_created') {
      console.log(`[Webhook] Ignoring event: ${eventName}`);
      return res.status(200).json({ ok: true, skipped: eventName });
    }

    // ---- Step 3: Extract orderId ----
    const orderId = body.meta?.custom_data?.orderId;
    if (!orderId) {
      console.error('[Webhook] No orderId in custom_data');
      return res.status(200).json({ ok: true, error: 'no orderId' });
    }

    // ---- Step 4: Duplicate check ----
    if (await isCompleted(orderId)) {
      console.log(`[Webhook] Already completed: ${orderId}`);
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // ---- Step 5: Get order data from KV ----
    const orderData = await getOrder(orderId);
    if (!orderData) {
      console.error(`[Webhook] Order not found in KV: ${orderId}`);
      return res.status(200).json({ ok: true, error: 'order not found' });
    }

    // ---- Step 6: Generate report ----
    // Run inline (Vercel keeps function alive up to maxDuration)
    // We still return 200 quickly — but await the report so errors are caught
    const result = await generateReport(orderData, orderId);

    return res.status(200).json({ ok: true, orderId, ...result });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    // Always return 200 to prevent Lemon Squeezy retries
    return res.status(200).json({ ok: true, error: err.message });
  }
}

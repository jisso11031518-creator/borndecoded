/**
 * POST /api/capture-payment
 * Capture PayPal payment → verify amount → trigger report generation
 */

export const config = { maxDuration: 300 };

import { getOrder, isCompleted } from '../lib/error-handler.mjs';
import { generateReport } from './generate-report.js';

const PAYPAL_API = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

const PRICES = {
  saju: '9.99',
  compatibility: '12.99',
};

async function getAccessToken() {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  const base = PAYPAL_API[mode];
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) throw new Error('PayPal credentials not set');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paypalOrderId, orderId } = req.body;

    if (!paypalOrderId || !orderId) {
      return res.status(400).json({ error: 'Missing paypalOrderId or orderId' });
    }

    // ---- Step 1: Duplicate check ----
    if (await isCompleted(orderId)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // ---- Step 2: Get order data from KV ----
    const orderData = await getOrder(orderId);
    if (!orderData) {
      return res.status(400).json({ error: 'Order not found' });
    }

    // ---- Step 3: Capture PayPal payment ----
    const accessToken = await getAccessToken();
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const base = PAYPAL_API[mode];

    const captureRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const text = await captureRes.text();
      console.error('[capture-payment] PayPal capture failed:', text.slice(0, 300));
      return res.status(400).json({ error: 'Payment capture failed' });
    }

    const captureData = await captureRes.json();

    // ---- Step 4: Verify payment status and amount ----
    if (captureData.status !== 'COMPLETED') {
      console.error('[capture-payment] Payment not completed:', captureData.status);
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const paidAmount = capture?.amount?.value;
    const expectedAmount = PRICES[orderData.product];

    if (paidAmount !== expectedAmount) {
      console.error(`[capture-payment] Amount mismatch: paid=${paidAmount}, expected=${expectedAmount}`);
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // ---- Step 5: Return OK, then generate report in background ----
    res.status(200).json({ ok: true, orderId });

    // Continue running after response — Vercel keeps function alive until maxDuration
    try {
      await generateReport(orderData, orderId);
    } catch (err) {
      console.error('[capture-payment] Report generation failed:', err.message);
    }
    return;
  } catch (err) {
    console.error('[capture-payment] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

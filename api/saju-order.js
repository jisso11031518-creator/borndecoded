/**
 * POST /api/saju-order
 * Receive saju order → save to KV → redirect to Payhip checkout
 */

import { v4 as uuidv4 } from 'uuid';
import { saveOrder } from '../lib/error-handler.mjs';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;

    // Basic validation
    if (!data.name || !data.birthYear || !data.birthMonth || !data.birthDay || !data.gender || !data.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!data.longitude || !data.timezone) {
      return res.status(400).json({ error: 'Missing longitude/timezone — select a birth city' });
    }

    // Generate order ID
    const orderId = uuidv4();

    // Save to KV
    await saveOrder(orderId, { ...data, product: 'saju' });

    // Payhip product URL
    const productKey = process.env.PAYHIP_SAJU_KEY || '1dXEc';
    const checkoutUrl = `https://payhip.com/b/${productKey}`;

    return res.status(200).json({ checkoutUrl });
  } catch (err) {
    console.error('[saju-order] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

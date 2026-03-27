/**
 * POST /api/compatibility-order
 * Receive compatibility order → save to KV → return orderId
 */

import { v4 as uuidv4 } from 'uuid';
import { saveOrder } from '../lib/error-handler.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;

    // Basic validation
    if (!data.person1?.name || !data.person2?.name || !data.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!data.person1?.longitude || !data.person1?.timezone) {
      return res.status(400).json({ error: 'Missing person1 longitude/timezone' });
    }
    if (!data.person2?.longitude || !data.person2?.timezone) {
      return res.status(400).json({ error: 'Missing person2 longitude/timezone' });
    }

    const orderId = uuidv4();
    await saveOrder(orderId, { ...data, product: 'compatibility' });

    return res.status(200).json({ orderId });
  } catch (err) {
    console.error('[compatibility-order] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

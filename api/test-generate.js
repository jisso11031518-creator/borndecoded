/**
 * POST /api/test-generate
 * Test endpoint: generate report without payment
 * Secured by TEST_SECRET header
 */

export const config = { maxDuration: 300 };

import { generateReport } from './generate-report.js';
import { v4 as uuidv4 } from 'uuid';
import { saveOrder } from '../lib/error-handler.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = req.body;
    const orderId = `test-${uuidv4()}`;

    // Save to KV (for pipeline consistency)
    await saveOrder(orderId, data);

    // Run the full pipeline
    const result = await generateReport(data, orderId);

    return res.status(200).json({ orderId, ...result });
  } catch (err) {
    console.error('[test-generate] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

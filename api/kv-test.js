/**
 * GET /api/kv-test
 * Test KV connection + check failed orders
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const results = {};

  // 1. Test KV connection
  try {
    await kv.set('test:ping', 'pong', { ex: 60 });
    const val = await kv.get('test:ping');
    results.kv_connection = val === 'pong' ? 'OK' : `UNEXPECTED: ${val}`;
  } catch (err) {
    results.kv_connection = `FAILED: ${err.message}`;
  }

  // 2. Check env vars
  results.KV_REST_API_URL = process.env.KV_REST_API_URL ? 'SET' : 'NOT SET';
  results.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT SET';
  results.KV_URL = process.env.KV_URL ? 'SET' : 'NOT SET';

  // 3. Scan for failed orders
  try {
    const keys = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: 'failed:*', count: 100 });
      cursor = Number(nextCursor);
      keys.push(...batch);
    } while (cursor !== 0);
    results.failed_orders = keys.length;
    results.failed_keys = keys;
  } catch (err) {
    results.failed_orders = `SCAN FAILED: ${err.message}`;
  }

  // 4. Scan for pending orders
  try {
    const keys = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: 'order:*', count: 100 });
      cursor = Number(nextCursor);
      keys.push(...batch);
    } while (cursor !== 0);
    results.pending_orders = keys.length;
  } catch (err) {
    results.pending_orders = `SCAN FAILED: ${err.message}`;
  }

  return res.status(200).json(results);
}

/**
 * Born Decoded — Error Handler + Vercel KV helpers
 */

import { kv } from '@vercel/kv';

const ORDER_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// ---- KV Order Storage ----

export async function saveOrder(orderId, data) {
  await kv.set(`order:${orderId}`, JSON.stringify(data), { ex: ORDER_TTL });
}

export async function getOrder(orderId) {
  const raw = await kv.get(`order:${orderId}`);
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
}

export async function markCompleted(orderId) {
  await kv.set(`completed:${orderId}`, '1', { ex: ORDER_TTL });
}

export async function isCompleted(orderId) {
  const val = await kv.get(`completed:${orderId}`);
  return !!val;
}

// ---- Failed Order Queue ----

export async function saveFailedOrder(orderId, orderData, error) {
  const existing = await getFailedOrder(orderId);
  const retryCount = existing ? existing.retryCount + 1 : 1;

  await kv.set(`failed:${orderId}`, JSON.stringify({
    orderId,
    orderData,
    error: error.message || String(error),
    retryCount,
    lastAttempt: Date.now(),
    createdAt: existing?.createdAt || Date.now(),
  }), { ex: ORDER_TTL });

  return retryCount;
}

export async function getFailedOrder(orderId) {
  const raw = await kv.get(`failed:${orderId}`);
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
}

export async function removeFailedOrder(orderId) {
  await kv.del(`failed:${orderId}`);
}

/**
 * Get all failed order keys
 * Note: Vercel KV (Upstash Redis) supports SCAN
 */
export async function getFailedOrderIds() {
  const keys = [];
  let cursor = 0;
  do {
    const [nextCursor, batch] = await kv.scan(cursor, { match: 'failed:*', count: 100 });
    cursor = Number(nextCursor);
    keys.push(...batch);
  } while (cursor !== 0);
  return keys.map(k => k.replace('failed:', ''));
}

// ---- Retry Schedule ----

const RETRY_DELAYS_MS = [
  10 * 60 * 1000,   // 1st: 10 min
  30 * 60 * 1000,   // 2nd: 30 min
  60 * 60 * 1000,   // 3rd: 1 hour
  3 * 60 * 60 * 1000, // 4th: 3 hours
  6 * 60 * 60 * 1000, // 5th: 6 hours
];

export function shouldRetry(failedOrder) {
  const { retryCount, lastAttempt } = failedOrder;
  if (retryCount > 5) return false; // max 5 retries

  const delayIdx = Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1);
  const requiredDelay = RETRY_DELAYS_MS[delayIdx];
  const elapsed = Date.now() - lastAttempt;

  return elapsed >= requiredDelay;
}

export function isMaxRetries(failedOrder) {
  return failedOrder.retryCount >= 6;
}

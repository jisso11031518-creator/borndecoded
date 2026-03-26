/**
 * Born Decoded — Supabase Transaction Log
 * 전자상거래법 5년 보관 의무 충족
 * 생년월일/출생시간/Q&A 질문은 저장하지 않음
 */

import { createClient } from '@supabase/supabase-js';

let client = null;

function getClient() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — skipping log');
      return null;
    }
    client = createClient(url, key);
  }
  return client;
}

/**
 * Log completed order to Supabase
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.customerName
 * @param {string} params.customerEmail
 * @param {string} params.productType — 'personal' | 'compatibility'
 * @param {number} params.amount
 * @param {string} params.currency
 * @param {string} params.deliveryStatus — 'completed' | 'failed'
 */
export async function logOrder({ orderId, customerName, customerEmail, productType, amount, currency = 'USD', deliveryStatus = 'completed' }) {
  const sb = getClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('orders_log').insert({
      order_id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      product_type: productType,
      amount,
      currency,
      order_date: new Date().toISOString(),
      delivery_status: deliveryStatus,
    });

    if (error) {
      console.error('[Supabase] Insert error:', error.message);
      return null;
    }

    console.log(`[Supabase] Order logged: ${orderId}`);
    return data;
  } catch (err) {
    console.error('[Supabase] Error:', err.message);
    return null; // non-blocking
  }
}

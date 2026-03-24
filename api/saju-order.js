/**
 * POST /api/saju-order
 * Receive saju order → save to KV → create Lemon Squeezy checkout → return URL
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

    // Create Lemon Squeezy Checkout
    const checkoutUrl = await createLemonCheckout(orderId, 'saju');

    return res.status(200).json({ checkoutUrl });
  } catch (err) {
    console.error('[saju-order] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function createLemonCheckout(orderId, product) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const variantId = product === 'saju'
    ? process.env.LEMON_SQUEEZY_SAJU_VARIANT_ID
    : process.env.LEMON_SQUEEZY_COMPAT_VARIANT_ID;

  if (!apiKey || !storeId || !variantId) {
    throw new Error('Lemon Squeezy config missing');
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: { orderId },
          },
          product_options: {
            redirect_url: 'https://borndecoded.com/success.html',
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lemon Squeezy ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.data.attributes.url;
}

/**
 * POST /api/compatibility-order
 * Receive compatibility order → save to KV → create Lemon Squeezy checkout → return URL
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

    // Create Lemon Squeezy Checkout
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const variantId = process.env.LEMON_SQUEEZY_COMPAT_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
      throw new Error('Lemon Squeezy config missing');
    }

    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
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

    if (!lsRes.ok) {
      const errText = await lsRes.text();
      throw new Error(`Lemon Squeezy ${lsRes.status}: ${errText.slice(0, 300)}`);
    }

    const json = await lsRes.json();
    return res.status(200).json({ checkoutUrl: json.data.attributes.url });
  } catch (err) {
    console.error('[compatibility-order] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

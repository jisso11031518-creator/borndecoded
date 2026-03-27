/**
 * POST /api/create-order
 * Create a PayPal order for the given product
 */

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, product } = req.body;

    if (!orderId || !product) {
      return res.status(400).json({ error: 'Missing orderId or product' });
    }

    const amount = PRICES[product];
    if (!amount) {
      return res.status(400).json({ error: 'Invalid product type' });
    }

    const accessToken = await getAccessToken();
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const base = PAYPAL_API[mode];

    const ppRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          description: product === 'saju' ? 'Personal Saju Reading' : 'Compatibility Reading',
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        }],
      }),
    });

    if (!ppRes.ok) {
      const text = await ppRes.text();
      console.error('[create-order] PayPal error:', text.slice(0, 300));
      return res.status(500).json({ error: 'Failed to create PayPal order' });
    }

    const ppData = await ppRes.json();
    return res.status(200).json({ paypalOrderId: ppData.id });
  } catch (err) {
    console.error('[create-order] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

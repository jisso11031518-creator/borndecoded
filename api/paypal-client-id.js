/**
 * GET /api/paypal-client-id
 * Return PayPal Client ID for frontend SDK loading
 */

export default function handler(req, res) {
  res.status(200).json({ clientId: process.env.PAYPAL_CLIENT_ID || '' });
}

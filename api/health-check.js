/**
 * GET /api/health-check
 * Test if API keys are working — secured by TEST_SECRET
 */

export default async function handler(req, res) {
  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const results = {};

  // 1. Check Anthropic (Claude) API
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    if (r.ok) {
      results.claude = 'OK';
    } else {
      const text = await r.text();
      results.claude = `FAIL (HTTP ${r.status}): ${text.slice(0, 200)}`;
    }
  } catch (err) {
    results.claude = `ERROR: ${err.message}`;
  }

  // 2. Check Gemini API
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    results.gemini = apiKey ? 'KEY SET' : 'NOT SET';
  } catch (err) {
    results.gemini = `ERROR: ${err.message}`;
  }

  // 3. Check Resend API
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY not set');
    results.resend = apiKey ? 'KEY SET' : 'NOT SET';
  } catch (err) {
    results.resend = `ERROR: ${err.message}`;
  }

  // 4. Check PayPal
  results.paypal_client_id = process.env.PAYPAL_CLIENT_ID ? 'SET' : 'NOT SET';
  results.paypal_secret = process.env.PAYPAL_CLIENT_SECRET ? 'SET' : 'NOT SET';
  results.paypal_mode = process.env.PAYPAL_MODE || 'not set (defaults to sandbox)';

  // 5. Check Telegram
  results.telegram = process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET';

  return res.status(200).json(results);
}

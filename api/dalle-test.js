/**
 * POST /api/dalle-test
 * Generate a single DALL-E cover image for style testing
 * Secured by TEST_SECRET
 */

export const config = { maxDuration: 60 };

import { buildCoverPromptBody } from '../lib/gemini-image.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });

  try {
    const topImage = req.body?.topImage || 'a blazing tiger prowling through autumn orchards with golden light';
    const borderStyle = req.body?.borderStyle || 'delicate vine pattern with small autumn leaves curling at corners';
    const colorTone = req.body?.colorTone || 'warm amber, burnt orange, and gold tones';

    const prompt = `Delicate transparent watercolor painting in the style of traditional Asian ink-wash art combined with Western watercolor. Soft wet-on-wet technique with visible paper texture showing through translucent paint layers. On warm ivory parchment background (#F5EDE4). Content: ${topImage}. The painting fills top 80% with colors gradually dissolving into bare ivory parchment at bottom. Bottom 20% completely empty ivory. MUST look like hand-painted watercolor, NOT digital illustration, NOT graphic art, NOT vector. Loose brushstrokes, paint bleeding at edges, soft gradients. Border: thin single-line ${borderStyle} in ${colorTone}, maximum 30px width. NO text, NO letters, NO words, NO labels, NO text boxes anywhere.`;

    console.log('[DALL-E Test] Generating image...');

    const ppRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1792',
        response_format: 'url',
      }),
    });

    if (!ppRes.ok) {
      const errText = await ppRes.text();
      return res.status(500).json({ error: `DALL-E failed: ${errText.slice(0, 300)}` });
    }

    const data = await ppRes.json();
    const imageUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    console.log('[DALL-E Test] Image generated successfully');

    return res.status(200).json({ imageUrl, revisedPrompt });
  } catch (err) {
    console.error('[DALL-E Test] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

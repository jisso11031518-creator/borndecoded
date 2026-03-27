/**
 * POST /api/dalle-test
 * Generate a single DALL-E cover image for style testing
 * Secured by TEST_SECRET
 */

export const config = { maxDuration: 60 };

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
    const { topImage, borderStyle, colorTone } = req.body || {};

    const prompt = `Premium decorative page for an astrology PDF report. Portrait orientation (tall, like A4 paper).

LAYOUT — top to bottom:
1. THIN DECORATIVE BORDER FRAME around the entire page. Pattern: ${borderStyle || 'delicate vine pattern with small leaves'}. Style: single delicate pen stroke, very thin and airy. Colors: ${colorTone || 'soft gold and warm brown tones'}.
2. WATERCOLOR PAINTING filling the top 75% inside the border: ${topImage || 'a blazing tiger prowling through autumn orchards with golden light'}. Rich, vivid watercolor that fades and dissolves into warm ivory at the bottom edge. Like wet paint bleeding into handmade paper.
3. A thin horizontal gold line (#C9A96E) below where the watercolor fades out.
4. Bottom 20%: completely empty warm ivory (#F5EDE4). No decoration.

BACKGROUND: Warm ivory #F5EDE4.
STYLE: Ethereal watercolor painting style on textured ivory parchment. Soft edges, flowing pigments, dreamy atmosphere. Like a luxury astrology book cover.
CRITICAL: Absolutely NO text, NO numbers, NO labels, NO letters, NO words, NO writing anywhere in the image. This is PURE VISUAL ARTWORK only. Any text will ruin the image. ZERO text.`;

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

/**
 * POST /api/gemini-test
 * Generate a single Gemini cover image for style testing
 * Returns base64 image data
 * Secured by TEST_SECRET
 */

export const config = { maxDuration: 60 };

import { buildCoverPromptBody } from '../lib/gemini-image.mjs';

// Model can be overridden via request body: { model: "gemini-2.0-flash" }
const DEFAULT_MODEL = 'gemini-2.0-flash-exp-image-generation';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const coverArt = {
      topImage: req.body?.topImage || 'a blazing tiger prowling through autumn orchards with golden light',
      borderStyle: req.body?.borderStyle || 'delicate vine pattern with small autumn leaves curling at corners',
      colorTone: req.body?.colorTone || 'warm amber, burnt orange, and gold tones',
    };

    const prompt = `Create a decorative A4 page background for a premium astrology PDF report. EXACT size: 2480x3508 pixels (300 DPI A4).

${buildCoverPromptBody(coverArt)}`;

    console.log('[Gemini Test] Generating image...');

    const model = req.body?.model || DEFAULT_MODEL;
    console.log(`[Gemini Test] Using model: ${model}`);
    const apiRes = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['image', 'text'] },
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(500).json({ error: `Gemini failed: ${errText.slice(0, 300)}` });
    }

    const data = await apiRes.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (!imagePart) {
      return res.status(500).json({ error: 'No image in Gemini response' });
    }

    console.log('[Gemini Test] Image generated successfully');

    // Return as inline image that browser can display directly
    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const base64 = imagePart.inlineData.data;

    res.setHeader('Content-Type', mimeType);
    res.status(200).send(Buffer.from(base64, 'base64'));
  } catch (err) {
    console.error('[Gemini Test] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

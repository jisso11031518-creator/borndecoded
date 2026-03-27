/**
 * Born Decoded — Gemini Image Generation Client
 * Calls Gemini API for cover image, with Sharp fallback
 */

import sharp from 'sharp';
import { buildCoverImagePrompt, buildCompatibilityCoverPrompt, buildCoverPromptBody } from './gemini-image.mjs';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

/**
 * Generate cover image via Gemini API
 * @param {Object} coverArt - from Claude report response
 * @param {string} product - 'saju' | 'compatibility'
 * @returns {Buffer} PNG image buffer
 */
export async function generateCoverImage(coverArt, product) {
  // TEMP: skip Gemini, test DALL-E directly
  const SKIP_GEMINI = process.env.SKIP_GEMINI === 'true';
  const apiKey = SKIP_GEMINI ? null : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] Skipped — going straight to DALL-E');
  }

  const prompt = product === 'compatibility'
    ? buildCompatibilityCoverPrompt(coverArt)
    : buildCoverImagePrompt(coverArt);

  // Try up to 10 times, 10s interval (Gemini 503 usually resolves in 1-2 min)
  for (let attempt = 1; apiKey && attempt <= 10; attempt++) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['image', 'text'] },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

      if (!imagePart) throw new Error('No image in Gemini response');

      const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      // Ensure exact A4 300DPI size
      const imageBuffer = await sharp(rawBuffer).resize(2480, 3508, { fit: 'cover' }).png().toBuffer();
      console.log(`[Gemini] Cover image generated (attempt ${attempt})`);
      return imageBuffer;
    } catch (err) {
      console.error(`[Gemini] Attempt ${attempt}/10 failed:`, err.message);
      if (attempt < 10) await sleep(10000);
    }
  }

  // ---- DALL-E 3 fallback (2 attempts) ----
  console.warn('[Gemini] All attempts failed — trying DALL-E 3');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    // DALL-E specific prompt — optimized to match Gemini watercolor style
    const topImage = coverArt?.topImage || 'flowing elements in nature';
    const borderStyle = coverArt?.borderStyle || 'delicate vine pattern';
    const colorTone = coverArt?.colorTone || 'soft pastel tones with gold accents';

    const dallePrompt = `Delicate transparent watercolor painting in the style of traditional Asian ink-wash art combined with Western watercolor. Soft wet-on-wet technique with visible paper texture showing through translucent paint layers. On warm ivory parchment background (#F5EDE4). Content: ${topImage}. The painting fills top 80% with colors gradually dissolving into bare ivory parchment at bottom. Bottom 20% completely empty ivory. MUST look like hand-painted watercolor, NOT digital illustration, NOT graphic art, NOT vector. Loose brushstrokes, paint bleeding at edges, soft gradients. Border: thin single-line ${borderStyle} in ${colorTone}, maximum 30px width. NO text, NO letters, NO words, NO labels, NO text boxes anywhere.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: dallePrompt,
            n: 1,
            size: '1024x1792',
            response_format: 'b64_json',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`DALL-E HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) throw new Error('No image in DALL-E response');

        const rawBuffer = Buffer.from(b64, 'base64');
        const imageBuffer = await sharp(rawBuffer).resize(2480, 3508, { fit: 'cover' }).png().toBuffer();
        console.log(`[DALL-E] Cover image generated (attempt ${attempt})`);
        return imageBuffer;
      } catch (err) {
        console.error(`[DALL-E] Attempt ${attempt} failed:`, err.message);
        if (attempt < 2) await sleep(10000);
      }
    }
    console.warn('[DALL-E] All attempts failed');
  }

  // No fallback — throw error so pipeline saves to failed queue for retry
  throw new Error('Cover image generation failed: Gemini and DALL-E both exhausted');
}

/**
 * Generate body background from cover image (Sharp)
 * Aggressively covers entire interior with ivory — only border survives.
 * No watercolor remnants, no bleed into border.
 */
export async function generateBodyImage(coverImageBuffer) {
  const resized = await sharp(coverImageBuffer)
    .resize(2480, 3508, { fit: 'cover' })
    .png()
    .toBuffer();

  // Cover everything inside the border (border ~40px each side)
  // Leave 45px border on all sides, fill entire interior with ivory
  const ivoryRect = await sharp({
    create: { width: 2390, height: 3418, channels: 4, background: { r: 245, g: 237, b: 228, alpha: 1 } },
  }).png().toBuffer();

  return sharp(resized)
    .composite([{ input: ivoryRect, top: 45, left: 45 }])
    .png()
    .toBuffer();
}

/**
 * Fallback cover: ivory background + gold separator line
 */
export async function generateFallbackCover() {
  const goldLine = await sharp({
    create: { width: 1880, height: 3, channels: 4, background: { r: 201, g: 169, b: 110, alpha: 1 } },
  }).png().toBuffer();

  return sharp({
    create: { width: 2480, height: 3508, channels: 4, background: { r: 245, g: 237, b: 228, alpha: 1 } },
  })
    .composite([{ input: goldLine, top: 877, left: 300 }])
    .png()
    .toBuffer();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

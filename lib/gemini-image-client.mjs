/**
 * Born Decoded — Gemini Image Generation Client
 * Calls Gemini API for cover image, with Sharp fallback
 */

import sharp from 'sharp';
import { buildCoverImagePrompt, buildCompatibilityCoverPrompt } from './gemini-image.mjs';

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

  // Try up to 3 times (skip if no API key)
  for (let attempt = 1; apiKey && attempt <= 3; attempt++) {
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
      return addBorderOverlay(imageBuffer);
    } catch (err) {
      console.error(`[Gemini] Attempt ${attempt} failed:`, err.message);
      if (attempt < 3) await sleep(3000);
    }
  }

  // ---- DALL-E 3 fallback (2 attempts) ----
  console.warn('[Gemini] All attempts failed — trying DALL-E 3');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const dallePrompt = coverArt?.description || coverArt?.metaphor
      ? `Watercolor painting for a book cover. Theme: ${coverArt.description || coverArt.metaphor}. Soft pastel colors, elegant, mystical, no text or letters.`
      : 'Elegant watercolor painting of flowing elements in soft pastel colors. Mystical, dreamy atmosphere. No text or letters.';

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
        return addBorderOverlay(imageBuffer);
      } catch (err) {
        console.error(`[DALL-E] Attempt ${attempt} failed:`, err.message);
        if (attempt < 2) await sleep(3000);
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

/**
 * Add gold border frame overlay to cover image
 * Ensures consistent border regardless of AI image quality
 */
async function addBorderOverlay(imageBuffer) {
  const W = 2480, H = 3508;
  const BORDER = 30;     // border thickness
  const GOLD = { r: 201, g: 169, b: 110, alpha: 255 };
  const GAP_TOP = 600;   // center gap on top
  const GAP_BOT = 400;   // center gap on bottom

  // Create border lines as separate images
  const leftLine = await sharp({
    create: { width: BORDER, height: H, channels: 4, background: GOLD },
  }).png().toBuffer();

  const rightLine = await sharp({
    create: { width: BORDER, height: H, channels: 4, background: GOLD },
  }).png().toBuffer();

  // Top: left quarter + right quarter (center open)
  const topSegLen = Math.floor((W - GAP_TOP) / 2);
  const topSeg = await sharp({
    create: { width: topSegLen, height: BORDER, channels: 4, background: GOLD },
  }).png().toBuffer();

  // Bottom: left 3/8 + right 3/8 (center open)
  const botSegLen = Math.floor((W - GAP_BOT) / 2);
  const botSeg = await sharp({
    create: { width: botSegLen, height: BORDER, channels: 4, background: GOLD },
  }).png().toBuffer();

  // Inner gold line separator
  const goldSep = await sharp({
    create: { width: 1880, height: 2, channels: 4, background: GOLD },
  }).png().toBuffer();

  return sharp(imageBuffer)
    .composite([
      // Left & right borders
      { input: leftLine, top: 0, left: 0 },
      { input: rightLine, top: 0, left: W - BORDER },
      // Top border segments (with center gap)
      { input: topSeg, top: 0, left: 0 },
      { input: topSeg, top: 0, left: W - topSegLen },
      // Bottom border segments (with center gap)
      { input: botSeg, top: H - BORDER, left: 0 },
      { input: botSeg, top: H - BORDER, left: W - botSegLen },
      // Gold separator line at ~75% height
      { input: goldSep, top: Math.floor(H * 0.75), left: 300 },
    ])
    .png()
    .toBuffer();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

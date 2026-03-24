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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] No API key — using fallback image');
    return generateFallbackCover();
  }

  const prompt = product === 'compatibility'
    ? buildCompatibilityCoverPrompt(coverArt)
    : buildCoverImagePrompt(coverArt);

  // Try up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
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

      const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      console.log(`[Gemini] Cover image generated (attempt ${attempt})`);
      return imageBuffer;
    } catch (err) {
      console.error(`[Gemini] Attempt ${attempt} failed:`, err.message);
      if (attempt < 3) await sleep(3000);
    }
  }

  console.warn('[Gemini] All attempts failed — using fallback');
  return generateFallbackCover();
}

/**
 * Generate body background from cover image (Sharp)
 * Covers top 20% + gold line with ivory, preserves border
 */
export async function generateBodyImage(coverImageBuffer) {
  const ivoryRect = await sharp({
    create: { width: 2240, height: 670, channels: 4, background: { r: 245, g: 237, b: 228, alpha: 1 } },
  }).png().toBuffer();

  return sharp(coverImageBuffer)
    .composite([{ input: ivoryRect, top: 90, left: 120 }])
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

/**
 * POST /api/mini-reading
 * Public API — free mini saju reading (3 pillars only).
 * No authentication required. Rate-limited via Vercel KV.
 */

export const config = { maxDuration: 30 };

import { runSajuEngine } from '../lib/saju-engine.mjs';

// ---- Rate Limiting via Vercel KV ----
let kv = null;
async function getKV() {
  if (kv) return kv;
  try {
    const mod = await import('@vercel/kv');
    kv = mod.kv;
    return kv;
  } catch {
    return null;
  }
}

async function checkRateLimit(ip) {
  const store = await getKV();
  if (!store) return { allowed: true }; // KV unavailable → allow

  const key = `mini:${ip}`;
  try {
    const count = await store.incr(key);
    if (count === 1) {
      await store.expire(key, 60); // 60s window
    }
    if (count > 5) {
      return { allowed: false };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // KV error → allow
  }
}

// ---- Fallback texts per Day Master ----
const FALLBACK_TEXTS = {
  "Yang Wood": {
    personality: "You'd rather break than bend — and you've already broken more than you admit.",
    forecast2026: "2026 strips away every excuse you've been hiding behind. What's left is finally yours."
  },
  "Yin Wood": {
    personality: "You adapt to everyone's shape and then wonder why no one knows your real one.",
    forecast2026: "Something you planted years ago finally breaks through the surface. Don't be modest about it."
  },
  "Yang Fire": {
    personality: "You light up every room and burn through every relationship at the same speed.",
    forecast2026: "2026 is when the right people finally see you — not your performance, but you."
  },
  "Yin Fire": {
    personality: "You see through everyone but let them think they're fooling you. It's lonelier than it looks.",
    forecast2026: "2026 brings someone — or something — that finally matches your depth. Don't flinch."
  },
  "Yang Earth": {
    personality: "You carry everyone and then wonder why your back hurts.",
    forecast2026: "2026 is when 'being the rock' stops being a compliment and starts being a choice."
  },
  "Yin Earth": {
    personality: "You say yes to everything, then quietly resent everyone for asking.",
    forecast2026: "2026 tests whether you can receive as well as you give. Spoiler: it's harder."
  },
  "Yang Metal": {
    personality: "You cut through nonsense so fast that people mistake your clarity for cruelty.",
    forecast2026: "2026 sharpens everything — your ambition, your decisions, and the consequences."
  },
  "Yin Metal": {
    personality: "You look delicate and unbreakable at the same time. Both are true.",
    forecast2026: "2026 reveals what's been hidden inside the pressure. It's worth more than you expected."
  },
  "Yang Water": {
    personality: "You flow around every obstacle but never stop long enough to call anywhere home.",
    forecast2026: "2026 is when the current finally has a direction. Stop swimming in circles."
  },
  "Yin Water": {
    personality: "You feel everything at 11 but present it at a steady 5. Then wonder why no one checks on you.",
    forecast2026: "2026: what you've been quietly carrying gets witnessed. Finally."
  }
};

// ---- Claude API call ----
async function generateWithClaude(name, dayMaster, dayMasterHanja, elementData, pillars, specialStars) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { Wood, Fire, Earth, Metal, Water } = elementData;
  const missingElements = Object.entries(elementData)
    .filter(([, v]) => v === 0)
    .map(([k]) => k)
    .join(', ') || 'None';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a Korean Saju (Four Pillars) reader. Based on the birth chart data below, write TWO things:

1. PERSONALITY (2-3 sentences): A gut-punch accurate personality insight. Tone: brutally honest but empathetic. Like you're calling them out on something they've never told anyone. Short, punchy, conversational English. No fluff, no generic statements. Must feel like "how did you know that?" Maximum 40 words.

2. FORECAST_2026 (2-3 sentences): What 2026 specifically brings for this person based on their chart. Tone: same as above — specific, slightly uncomfortable truth mixed with genuine hope. Not generic "good things are coming." Maximum 40 words.

BIRTH CHART DATA:
- Name: ${name}
- Day Master: ${dayMaster} (${dayMasterHanja})
- Element Distribution: Wood ${Wood}%, Fire ${Fire}%, Earth ${Earth}%, Metal ${Metal}%, Water ${Water}%
- Missing Elements: ${missingElements}
- Year Pillar: ${pillars.year}
- Month Pillar: ${pillars.month}
- Day Pillar: ${pillars.day}
${specialStars ? `- Special Stars: ${specialStars}` : ''}

TONE EXAMPLES (match this exact style):
- "You say yes to everything, then quietly resent everyone for asking. Your mental spreadsheet of who owes you what is more detailed than most people's tax returns."
- "You feel everything at 11 but present it at a steady 5, then wonder why people think you're fine when you're drowning inside."
- "You've perfected the art of being present but emotionally unavailable."
- "Your biggest blind spot? Assuming that if people really cared, they'd dig deeper without you giving them a shovel."
- "You keep attracting ships in distress when what you really want is another lighthouse to keep you company."
- "This is not the year to stay humble — your expertise deserves a platform."

This is the voice. Brutally specific. Conversational. Calls out patterns they've never said out loud. Not generic motivational — it should sting a little, then feel like relief because someone finally named it.

CRITICAL RULES:
- Use "you" directly — talk TO this person
- Reference their specific element balance (e.g., "with 0% Fire, you..." or "your Earth-heavy chart...")
- No astrology jargon. Plain, punchy English.
- No generic statements that could apply to anyone.
- Each section should be 2-3 sentences, punchy and specific.
- Respond in exactly this JSON format, no other text:
{"personality": "...", "forecast2026": "..."}`
        }]
      })
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.personality && parsed.forecast2026) {
      return parsed;
    }
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ---- Main handler ----
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: "You've already decoded your chart! Try again in a minute."
    });
  }

  try {
    const { name, year, month, day, gender } = req.body || {};

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
      return res.status(400).json({ error: 'Name is required (1-50 characters)' });
    }
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (!y || y < 1920 || y > 2012) {
      return res.status(400).json({ error: 'Valid birth year required (1920-2012)' });
    }
    if (!m || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Valid birth month required (1-12)' });
    }
    if (!d || d < 1 || d > 31) {
      return res.status(400).json({ error: 'Valid birth day required (1-31)' });
    }
    if (!['male', 'female', 'non-binary'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be male, female, or non-binary' });
    }

    // Run saju engine (3 pillars — no hour, no city)
    const result = runSajuEngine({
      name: name.trim(),
      year: y,
      month: m,
      day: d,
      hour: null,
      minute: 0,
      longitude: undefined,
      timezone: 'America/New_York',
      gender,
      birthCity: '',
      fixedQuestions: { gender, relationship: '', career: '' },
      freeQuestions: [],
    });

    // Extract data for response
    const dayTiangan = result.fourPillars.day.tiangan;
    const dayMaster = `${dayTiangan.yinYangEn} ${dayTiangan.elementEn}`;
    const dayMasterHanja = dayTiangan.hanja;
    const dayMasterElement = dayTiangan.elementEn;
    const dayMasterYinYang = dayTiangan.yinYangEn;

    // Element distribution (percentages in English)
    const elemEnglish = result.elements.english;
    const elementDistribution = {
      Wood: elemEnglish.Wood.percent,
      Fire: elemEnglish.Fire.percent,
      Earth: elemEnglish.Earth.percent,
      Metal: elemEnglish.Metal.percent,
      Water: elemEnglish.Water.percent,
    };

    const missingElements = result.elements.missing.map(k => {
      const map = { '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water' };
      return map[k];
    });

    // Pillar labels for Claude prompt
    const pillarLabels = {
      year: result.fourPillars.year.hangul,
      month: result.fourPillars.month.hangul,
      day: result.fourPillars.day.hangul,
    };

    // Special stars
    const specialStars = result.shinsal?.length > 0
      ? result.shinsal.map(s => s.nameEn || s.name).join(', ')
      : '';

    // Try Claude AI
    const aiResult = await generateWithClaude(
      name.trim(), dayMaster, dayMasterHanja,
      elementDistribution, pillarLabels, specialStars
    );

    const fallback = FALLBACK_TEXTS[dayMaster] || FALLBACK_TEXTS["Yin Water"];
    const personality = aiResult?.personality || fallback.personality;
    const forecast2026 = aiResult?.forecast2026 || fallback.forecast2026;

    return res.status(200).json({
      success: true,
      dayMaster,
      dayMasterHanja,
      dayMasterElement,
      dayMasterYinYang,
      elementDistribution,
      missingElements,
      personality,
      forecast2026,
      source: aiResult ? 'ai' : 'fallback',
    });

  } catch (err) {
    console.error('[mini-reading] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

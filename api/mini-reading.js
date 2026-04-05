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

// ---- Fallback readings per Day Master (unified) ----
const FALLBACK_READINGS = {
  "Yang Wood": "You'd rather break than bend — and you've already broken more than you admit. People see confidence; you know it's stubbornness dressed up nice. 2026 strips away every excuse you've been hiding behind. The things you've been 'about to start' for years? This is the year they either happen or you finally admit they won't. What's left after that honesty is finally, completely yours.",
  "Yin Wood": "You adapt to everyone's shape and then wonder why no one knows your real one. You've become so good at reading rooms that you forgot you're allowed to change them. 2026 forces something you planted years ago to finally break through the surface. Stop being modest about what's emerging — the people who matter can already see it.",
  "Yang Fire": "You light up every room and burn through every relationship at the same speed. The performance is flawless; the loneliness behind it is the part no one talks about. 2026 is when the right people finally see you — not the show, not the energy, but the actual you sitting quietly behind all that fire. Let them.",
  "Yin Fire": "You see through everyone but let them think they're fooling you. It's lonelier than it looks, carrying that much insight and pretending you don't. 2026 brings someone — or something — that finally matches your depth. The temptation will be to flinch. Don't. This one is real.",
  "Yang Earth": "You carry everyone and then wonder why your back hurts. Your chart screams 'reliable,' and you've turned that into a cage you built yourself. 2026 is when 'being the rock' stops being a compliment and starts being a choice. You're allowed to put yourself down. The people worth keeping will still be there.",
  "Yin Earth": "You say yes to everything, then quietly resent everyone for asking. Your mental spreadsheet of who owes you what is more detailed than most people's tax returns. 2026 tests whether you can receive as well as you give. Spoiler: it's harder than any favor you've ever done. But it's the only way out of the cycle.",
  "Yang Metal": "You cut through nonsense so fast that people mistake your clarity for cruelty. You're not cold — you just refuse to pretend confusion is the same as kindness. 2026 sharpens everything — your ambition, your decisions, and the consequences. The shortcuts you've been tolerating get exposed. Good. You work better without them.",
  "Yin Metal": "You look delicate and unbreakable at the same time. Both are true, and you're exhausted from holding that contradiction together. 2026 reveals what's been hidden inside all that pressure. Like a diamond that forgot it used to be coal — it's worth more than you expected, and it's time to stop apologizing for your edges.",
  "Yang Water": "You flow around every obstacle but never stop long enough to call anywhere home. People think you're adventurous; you know it's just that staying still feels like drowning. 2026 is when the current finally has a direction. Stop swimming in circles — the place you've been avoiding is exactly where you need to land.",
  "Yin Water": "You feel everything at 11 but present it at a steady 5, then wonder why people think you're fine when you're drowning inside. Your intuition is almost supernatural, but you use it to help everyone except yourself. 2026 finally forces what you've been quietly carrying into the light. It's not exposure — it's relief."
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
          content: `You are a Korean Saju (Four Pillars) reader writing a free mini reading. Based on the birth chart data below, write ONE unified reading paragraph.

STRUCTURE (5-6 sentences, max 120 words, one flowing paragraph):
1. Open with a gut-punch personality insight based on their element balance
2. Transition to what 2026's energy specifically brings for them
3. Name one thing to watch out for
4. End with a line that feels like relief — someone finally named it

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
- "You say yes to everything, then quietly resent everyone for asking."
- "You feel everything at 11 but present it at a steady 5, then wonder why people think you're fine when you're drowning inside."
- "Your biggest blind spot? Assuming that if people really cared, they'd dig deeper without you giving them a shovel."
- "You keep attracting ships in distress when what you really want is another lighthouse to keep you company."

This is the voice. Brutally specific. Conversational. Calls out patterns they've never said out loud. Not generic motivational — it should sting a little, then feel like relief because someone finally named it.

IMPORTANT: The tone examples above are for STYLE REFERENCE ONLY. Do NOT copy or closely paraphrase these exact sentences. Write completely original sentences that match the same energy and specificity level. Every reading must be unique.

CRITICAL RULES:
- Use "you" directly — talk TO this person
- Reference their specific element balance (e.g., "with 0% Fire, you..." or "your Earth-heavy chart...")
- No astrology jargon. Plain, punchy English.
- No generic statements that could apply to anyone.
- One continuous paragraph, not bullet points.
- Respond in exactly this JSON format, no other text:
{"reading": "..."}`
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
    if (parsed.reading) {
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
    const { name, year, month, day, gender, hour, minute, birthCity, longitude, timezone } = req.body || {};

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

    // Parse optional time fields
    const parsedHour = (hour !== null && hour !== undefined && hour !== '') ? parseInt(hour) : null;
    const parsedMinute = (minute !== null && minute !== undefined && minute !== '') ? parseInt(minute) : 0;

    // Run saju engine (3 or 4 pillars depending on hour)
    const result = runSajuEngine({
      name: name.trim(),
      year: y,
      month: m,
      day: d,
      hour: parsedHour,
      minute: parsedMinute,
      longitude: longitude || undefined,
      timezone: timezone || 'America/New_York',
      gender,
      birthCity: birthCity || '',
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

    const fallback = FALLBACK_READINGS[dayMaster] || FALLBACK_READINGS["Yin Water"];
    const reading = aiResult?.reading || fallback;

    return res.status(200).json({
      success: true,
      dayMaster,
      dayMasterHanja,
      dayMasterElement,
      dayMasterYinYang,
      elementDistribution,
      missingElements,
      reading,
      source: aiResult ? 'ai' : 'fallback',
    });

  } catch (err) {
    console.error('[mini-reading] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

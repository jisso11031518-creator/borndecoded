/**
 * Born Decoded — Report Generation Pipeline
 * Saju Engine → Claude API → Gemini Image → Sharp → PDF → Email → Telegram
 *
 * Called by webhook.js and test-generate.js
 */

import { runSajuEngine, runCompatibilityEngine } from '../lib/saju-engine.mjs';
import {
  buildSajuApiBody,
  buildCompatibilityApiBody,
  buildSajuUserPrompt,
  buildCompatibilityUserPrompt,
  SAJU_SYSTEM_PROMPT,
  COMPATIBILITY_SYSTEM_PROMPT,
} from '../lib/report-prompt.mjs';
import { generateCoverImage, generateBodyImage } from '../lib/gemini-image-client.mjs';
import { generateSajuPdf, generateCompatibilityPdf, getCleanCjkCount } from '../lib/pdf-generator.mjs';
import { sendReportEmail, sendPreparingEmail } from '../lib/email-sender.mjs';
import { notifySuccess, notifyFailure, notifyQaWarning } from '../lib/telegram.mjs';
import { saveFailedOrder, markCompleted } from '../lib/error-handler.mjs';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GPT_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Main pipeline
 * @param {Object} orderData - Full order data from KV
 * @param {string} orderId
 */
export async function generateReport(orderData, orderId) {
  const { product, email } = orderData;
  const customerName = product === 'compatibility' ? orderData.person1.name : orderData.name;

  try {
    console.log(`[Pipeline] Starting ${product} report for ${customerName}`);

    // ---- Step 1: Run Saju Engine ----
    let engineResult;
    if (product === 'saju') {
      engineResult = runSajuEngine({
        name: orderData.name,
        year: orderData.birthYear,
        month: orderData.birthMonth,
        day: orderData.birthDay,
        hour: orderData.birthTimeUnknown ? null : orderData.birthHour,
        minute: orderData.birthTimeUnknown ? 0 : (orderData.birthMinute || 0),
        longitude: orderData.longitude,
        timezone: orderData.timezone,
        gender: orderData.gender,
        birthCity: orderData.birthCity,
        fixedQuestions: {
          gender: orderData.gender,
          relationship: orderData.contextRelationship || '',
          career: orderData.contextCareer || '',
        },
        freeQuestions: backfillQuestions([orderData.question1, orderData.question2, orderData.question3]),
      });
    } else {
      engineResult = runCompatibilityEngine(
        {
          name: orderData.person1.name,
          year: orderData.person1.birthYear,
          month: orderData.person1.birthMonth,
          day: orderData.person1.birthDay,
          hour: orderData.person1.birthTimeUnknown ? null : orderData.person1.birthHour,
          minute: orderData.person1.birthTimeUnknown ? 0 : (orderData.person1.birthMinute || 0),
          longitude: orderData.person1.longitude,
          timezone: orderData.person1.timezone,
          gender: orderData.person1.gender,
          birthCity: orderData.person1.birthCity,
        },
        {
          name: orderData.person2.name,
          year: orderData.person2.birthYear,
          month: orderData.person2.birthMonth,
          day: orderData.person2.birthDay,
          hour: orderData.person2.birthTimeUnknown ? null : orderData.person2.birthHour,
          minute: orderData.person2.birthTimeUnknown ? 0 : (orderData.person2.birthMinute || 0),
          longitude: orderData.person2.longitude,
          timezone: orderData.person2.timezone,
          gender: orderData.person2.gender,
          birthCity: orderData.person2.birthCity,
        },
        orderData.relationshipType || 'romantic',
        [orderData.question1, orderData.question2].filter(Boolean),
      );
    }
    // Add next year energy data for the prompt
    // Engine already calculates yearlyEnergy for current year; duplicate pattern for next year
    const nextYear = new Date().getFullYear() + 1;
    if (product === 'saju' && engineResult.yearlyEnergy) {
      // Simple: copy the structure and note next year info will be in the prompt data
      // The actual nextYear pillar calculation happens inside buildSajuUserPrompt via the engine data
    }
    // Inject nextYearEnergy placeholder — prompt builder will handle it
    if (!engineResult.nextYearEnergy) {
      engineResult.nextYearEnergy = null; // prompt builder checks for this
    }
    console.log('[Pipeline] Engine complete');

    // ---- Step 2: Claude API ----
    let report;
    try {
      report = await callClaudeApi(engineResult, product);
      console.log('[Pipeline] Claude report complete');
    } catch (claudeErr) {
      console.warn('[Pipeline] Claude failed, trying GPT-4o:', claudeErr.message);
      report = await callGptFallback(engineResult, product);
      console.log('[Pipeline] GPT-4o fallback complete');
    }

    // ---- Step 3: Gemini Cover Image ----
    const coverImageBuffer = await generateCoverImage(report.coverArt, product);
    console.log('[Pipeline] Cover image ready');

    // ---- Step 4: Body Background (Sharp) ----
    const bodyImageBuffer = await generateBodyImage(coverImageBuffer);
    console.log('[Pipeline] Body image ready');

    // ---- Step 5: Generate PDF ----
    let pdfBuffer;
    if (product === 'saju') {
      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const birthDate = `${MONTHS[orderData.birthMonth - 1]} ${orderData.birthDay}, ${orderData.birthYear}`;
      pdfBuffer = await generateSajuPdf({
        report,
        coverImageBuffer,
        bodyImageBuffer,
        name: orderData.name,
        birthDate,
      });
    } else {
      const birthDate = `${orderData.person1.name} & ${orderData.person2.name}`;
      pdfBuffer = await generateCompatibilityPdf({
        report,
        coverImageBuffer,
        bodyImageBuffer,
        person1Name: orderData.person1.name,
        person2Name: orderData.person2.name,
        birthDate,
      });
    }
    console.log(`[Pipeline] PDF generated (${Math.round(pdfBuffer.length / 1024)}KB)`);

    // ---- Step 5b: QA check — warn if CJK characters were stripped ----
    const cjkStripped = getCleanCjkCount();
    if (cjkStripped > 0) {
      console.warn(`[Pipeline] QA WARNING: ${cjkStripped} CJK characters stripped from report`);
      try {
        await notifyQaWarning(customerName, `${cjkStripped} CJK chars stripped in PDF. Report sent but may have blank terms.`, orderId, email);
      } catch (_) { /* non-blocking */ }
    }

    // ---- Step 6: Send Email (with retry) ----
    await retryAsync(() => sendReportEmail(email, customerName, product, pdfBuffer), 3, 2000);
    console.log('[Pipeline] Email sent');

    // ---- Step 7: Mark completed + notify ----
    await markCompleted(orderId);
    await notifySuccess(customerName, product, email);
    console.log('[Pipeline] Complete!');

    return { success: true };
  } catch (err) {
    console.error('[Pipeline] FAILED:', err.message);

    // Save to failed queue
    const retryCount = await saveFailedOrder(orderId, orderData, err);

    // Send preparing notice on first failure only
    if (retryCount === 1) {
      try { await sendPreparingEmail(email, customerName); } catch (e) { /* ignore */ }
    }

    // Notify admin
    await notifyFailure(customerName, err.message, orderId, email);

    return { success: false, error: err.message };
  }
}

// ---- Claude API Call ----
async function callClaudeApi(engineResult, product, retries = 2) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const body = product === 'saju'
    ? buildSajuApiBody(engineResult)
    : buildCompatibilityApiBody(engineResult);

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Claude HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const textContent = data.content?.find(c => c.type === 'text')?.text;
      if (!textContent) throw new Error('No text content in Claude response');

      return JSON.parse(textContent);
    } catch (err) {
      if (attempt <= retries) {
        console.warn(`[Claude] Attempt ${attempt} failed, retrying in 3s...`);
        await sleep(3000);
      } else {
        throw err;
      }
    }
  }
}

// ---- GPT-4o Fallback ----
async function callGptFallback(engineResult, product) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set — cannot fall back to GPT-4o');

  const systemPrompt = product === 'saju' ? SAJU_SYSTEM_PROMPT : COMPATIBILITY_SYSTEM_PROMPT;
  const userPrompt = product === 'saju'
    ? buildSajuUserPrompt(engineResult)
    : buildCompatibilityUserPrompt(engineResult);

  const res = await fetch(GPT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 10000,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT-4o HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const textContent = data.choices?.[0]?.message?.content;
  if (!textContent) throw new Error('No content in GPT-4o response');

  return JSON.parse(textContent);
}

// ---- Helpers ----
const DEFAULT_QUESTIONS = [
  'What does this year hold for me?',
  'What career path suits me best?',
  'What should I know about my love life?',
];

function backfillQuestions(raw) {
  const filled = (raw || []).filter(Boolean);
  let i = 0;
  while (filled.length < 3 && i < DEFAULT_QUESTIONS.length) {
    if (!filled.includes(DEFAULT_QUESTIONS[i])) filled.push(DEFAULT_QUESTIONS[i]);
    i++;
  }
  return filled;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function retryAsync(fn, maxRetries, delayMs) {
  for (let i = 1; i <= maxRetries; i++) {
    try { return await fn(); } catch (err) {
      if (i === maxRetries) throw err;
      await sleep(delayMs);
    }
  }
}

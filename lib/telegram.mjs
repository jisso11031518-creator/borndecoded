/**
 * Born Decoded — Telegram Bot Notification
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Send a message via Telegram Bot
 * @param {string} text - Message text (supports HTML)
 * @param {Object} [options]
 * @param {string} [options.botToken] - Override env
 * @param {string} [options.chatId] - Override env
 */
export async function sendTelegramMessage(text, options = {}) {
  const botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping notification');
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram] Send failed:', err);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[Telegram] Error:', err.message);
    return null;
  }
}

// Convenience helpers
export async function notifySuccess(customerName, product, email) {
  await sendTelegramMessage(
    `✅ <b>리포트 발송 완료</b>\n` +
    `👤 ${customerName}\n` +
    `📦 ${product}\n` +
    `📧 ${email}`
  );
}

export async function notifyFailure(customerName, error, orderId, email) {
  await sendTelegramMessage(
    `❌ <b>리포트 생성 실패</b>\n` +
    `👤 ${customerName}\n` +
    `⚠️ ${error}\n` +
    `🆔 ${orderId}\n` +
    `📧 ${email}`
  );
}

export async function notifyRecovery(customerName, orderId) {
  await sendTelegramMessage(
    `✅ <b>자동 복구 완료</b>\n` +
    `👤 ${customerName}\n` +
    `🆔 ${orderId}`
  );
}

export async function notifyManualRequired(customerName, orderId, email) {
  await sendTelegramMessage(
    `🚨 <b>수동 처리 필요</b>\n` +
    `👤 ${customerName}\n` +
    `🆔 ${orderId}\n` +
    `📧 ${email}\n` +
    `5회 자동 재시도 모두 실패`
  );
}

export async function notifyQaWarning(customerName, message, orderId, email) {
  await sendTelegramMessage(
    `⚠️ <b>QA WARNING</b>\n` +
    `👤 ${customerName}\n` +
    `📋 ${message}\n` +
    `🆔 ${orderId}\n` +
    `📧 ${email}`
  );
}

export async function notifySafetyReplace(customerName, replaced, orderId, email) {
  await sendTelegramMessage(
    `⚠️ <b>SAFETY: 위험 표현 치환됨</b>\n` +
    `👤 ${customerName}\n` +
    `🔄 치환된 표현: ${replaced.join(', ')}\n` +
    `🆔 ${orderId}\n` +
    `📧 ${email}\n` +
    `리포트 정상 발송됨`
  );
}

export async function notifyBounce(email, orderId) {
  await sendTelegramMessage(
    `⚠️ <b>이메일 반송</b>\n` +
    `📧 ${email}\n` +
    `🆔 ${orderId}`
  );
}

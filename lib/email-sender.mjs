/**
 * Born Decoded — Email Sender (Resend)
 */

import { Resend } from 'resend';
import {
  reportDeliveryHtml,
  preparingNoticeHtml,
  delayNoticeHtml,
  reportSubject,
} from './email-templates.mjs';

let resendClient = null;

function getClient() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    resendClient = new Resend(key);
  }
  return resendClient;
}

const FROM = 'Born Decoded ✨ <stars@borndecoded.com>';
const REPLY_TO = 'borndecoded@gmail.com';

/**
 * Send report delivery email with PDF attachment
 * @param {string} toEmail
 * @param {string} name - Customer name
 * @param {string} product - 'saju' | 'compatibility'
 * @param {Buffer} pdfBuffer - PDF file buffer
 */
export async function sendReportEmail(toEmail, name, product, pdfBuffer) {
  const client = getClient();
  const safeName = name.replace(/\s+/g, '_').replace(/&/g, 'and');
  const filename = product === 'saju'
    ? `BornDecoded_Saju_${safeName}.pdf`
    : `BornDecoded_Compatibility_${safeName}.pdf`;

  const { data, error } = await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: [toEmail],
    subject: reportSubject(product, name),
    html: reportDeliveryHtml(name, product),
    attachments: [
      {
        filename,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data;
}

/**
 * Send admin copy of report with PDF attachment
 * @param {string} name - Customer name
 * @param {string} product - 'saju' | 'compatibility'
 * @param {string} customerEmail - Customer's email
 * @param {Buffer} pdfBuffer - PDF file buffer
 */
export async function sendAdminReportEmail(name, product, customerEmail, pdfBuffer) {
  const client = getClient();
  const safeName = name.replace(/\s+/g, '_').replace(/&/g, 'and');
  const productLabel = product === 'saju' ? 'Personal Saju' : 'Compatibility';
  const filename = product === 'saju'
    ? `BornDecoded_Saju_${safeName}.pdf`
    : `BornDecoded_Compatibility_${safeName}.pdf`;

  const { data, error } = await client.emails.send({
    from: FROM,
    to: [REPLY_TO],
    subject: `[Born Decoded] ${productLabel} - ${name}`,
    html: `<div style="font-family:sans-serif;color:#3D3028;padding:20px;">
      <h2>리포트 발송 완료</h2>
      <p><b>고객:</b> ${name}</p>
      <p><b>이메일:</b> ${customerEmail}</p>
      <p><b>상품:</b> ${productLabel}</p>
      <p><b>시간:</b> ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
      <p>PDF가 첨부되어 있습니다.</p>
    </div>`,
    attachments: [
      {
        filename,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) {
    console.error('[Admin Email] Error:', JSON.stringify(error));
  }
  return data;
}

/**
 * Send "preparing" notice (on first failure)
 */
export async function sendPreparingEmail(toEmail, name) {
  const client = getClient();

  const { data, error } = await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: [toEmail],
    subject: 'Your reading is being prepared 🔮',
    html: preparingNoticeHtml(name),
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data;
}

/**
 * Send delay notice (after 5 failures)
 */
export async function sendDelayEmail(toEmail, name) {
  const client = getClient();

  const { data, error } = await client.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: [toEmail],
    subject: 'Update on your Born Decoded reading',
    html: delayNoticeHtml(name),
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data;
}

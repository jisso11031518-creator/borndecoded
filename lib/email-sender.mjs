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

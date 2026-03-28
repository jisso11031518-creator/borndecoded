/**
 * Born Decoded — Email HTML Templates
 * 3 templates: report delivery, preparing notice, delay notice
 */

const BRAND_COLOR = '#C9A96E';
const BG_COLOR = '#F5EDE4';
const TEXT_COLOR = '#3D3028';
const SITE_URL = 'https://borndecoded.com';

function wrapper(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(201,169,110,0.15);">
  <!-- Header -->
  <tr><td style="padding:32px 40px 16px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:600;color:${TEXT_COLOR};font-family:'Georgia',serif;">Born Decoded</p>
    <p style="margin:4px 0 0;font-size:12px;color:${BRAND_COLOR};letter-spacing:0.15em;">✦ YOUR BIRTH WAS CODED ✦</p>
  </td></tr>
  <!-- Gold line -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:${BRAND_COLOR};opacity:0.3;"></div></td></tr>
  <!-- Content -->
  <tr><td style="padding:28px 40px 36px;color:${TEXT_COLOR};font-size:15px;line-height:1.7;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:20px 40px 28px;text-align:center;border-top:1px solid rgba(201,169,110,0.1);">
    <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
      For entertainment and self-reflection purposes only.<br>
      Questions? Email <a href="mailto:borndecoded@gmail.com" style="color:${BRAND_COLOR};">borndecoded@gmail.com</a><br>
      <a href="${SITE_URL}" style="color:${BRAND_COLOR};">borndecoded.com</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Template 1: Report delivery email
 */
export function reportDeliveryHtml(name, product) {
  const isSaju = product === 'saju';
  const crossSellText = isSaju
    ? 'Curious about your love compatibility? Try our <a href="' + SITE_URL + '/compatibility.html" style="color:' + BRAND_COLOR + ';font-weight:600;">Compatibility Reading →</a>'
    : 'Want to understand yourself deeper? Get your <a href="' + SITE_URL + '/saju.html" style="color:' + BRAND_COLOR + ';font-weight:600;">Personal Saju Reading →</a>';

  const couplesChallenge = isSaju ? '' : `
    <div style="background:${BG_COLOR};border-radius:10px;padding:16px 20px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND_COLOR};">💕 COUPLES CHALLENGE 💕</p>
      <p style="margin:0;font-size:13px;color:${TEXT_COLOR};line-height:1.6;">Share your Compatibility Reading together and tag <strong>@borndecoded</strong> — couples who share get featured first!<br>Which element pairing are you? Your followers want to know 👀</p>
    </div>`;

  return wrapper(`
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">Your ${isSaju ? 'Saju' : 'Compatibility'} reading is ready! ✨</p>
    <p style="margin:0 0 16px;">Open the attached PDF to discover what the stars encoded in your birth.</p>
    <p style="margin:0 0 24px;">Take your time with it — there's a lot to unpack. Some parts might surprise you. 🔮</p>
    <div style="background:${BG_COLOR};border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;">${crossSellText}</p>
    </div>
    <!-- Share CTA -->
    <div style="border-top:1px solid rgba(201,169,110,0.2);padding-top:20px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${BRAND_COLOR};">✨ SHARE YOUR READING ✨</p>
      <p style="margin:0 0 12px;font-size:13px;color:${TEXT_COLOR};line-height:1.6;">Love what you discovered? We'd love to see your reaction!</p>
      <p style="margin:0 0 4px;font-size:13px;color:${TEXT_COLOR};">📸 Screenshot your favorite insight</p>
      <p style="margin:0 0 4px;font-size:13px;color:${TEXT_COLOR};">📱 Post it on Instagram</p>
      <p style="margin:0 0 12px;font-size:13px;color:${TEXT_COLOR};">🏷️ Tag <strong>@borndecoded</strong></p>
      <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">Every week, we feature the most interesting charts on our page.<br>Yours could be next! 🔮</p>
    </div>
    ${couplesChallenge}
    <p style="margin:0;font-size:13px;color:#888;">Your report is attached as a PDF file. If you can't see the attachment, check your spam folder or reply to this email.</p>
  `);
}

/**
 * Template 2: Preparing notice (sent on first failure)
 */
export function preparingNoticeHtml(name) {
  return wrapper(`
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">We're putting extra care into your reading to make sure every detail is perfect. 🔮</p>
    <p style="margin:0 0 16px;">Your personalized PDF report will be delivered within <strong>1 hour</strong>. No action needed on your end.</p>
    <p style="margin:0;font-size:13px;color:#888;">If you have any questions, just reply to this email.</p>
  `);
}

/**
 * Template 3: Final delay notice (sent after all retries exhausted)
 */
export function delayNoticeHtml(name) {
  return wrapper(`
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">We sincerely apologize for the delay with your reading.</p>
    <p style="margin:0 0 16px;">You have two options:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#3D3028;">
      <li style="margin-bottom:8px;"><strong>Full refund</strong> — simply reply to this email and we'll process it right away.</li>
      <li><strong>Wait for delivery</strong> — we will deliver your report within <strong>24 hours</strong>.</li>
    </ul>
    <p style="margin:0 0 16px;">If we don't hear from you, we'll continue working on your reading and deliver it as soon as it's ready.</p>
    <p style="margin:0;font-size:13px;color:#888;">We truly appreciate your patience. ✨</p>
  `);
}

export function reportSubject(product, name) {
  return product === 'saju'
    ? `${name}, Your Born Decoded Reading is Ready ✨`
    : `${name} — Your Compatibility Reading is Ready ✨`;
}

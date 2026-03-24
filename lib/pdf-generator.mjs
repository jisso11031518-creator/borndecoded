/**
 * Born Decoded — PDF Generator v5 (@react-pdf/renderer)
 *
 * v5: cover image full-bleed, intro page with Day Master,
 * unified margins, Life Cycles restructured (no Year by Year),
 * "Born Decoded" in body font to avoid script 'r' drop.
 */

import React from 'react';
import { renderToBuffer, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';

// ---- Fonts ----
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: 'Script',
    src: 'https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTQ.ttf',
  });
  Font.register({
    family: 'Body',
    src: 'https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZqFCjwA.ttf',
  });
  Font.register({
    family: 'BodyBold',
    src: 'https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZT1ejwA.ttf',
  });

  Font.registerHyphenationCallback(word => [word]);
  fontsRegistered = true;
}

// ---- Sanitize ----
function clean(text) {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  return text.replace(/[\u3000-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ---- Colors ----
const GOLD = '#C9A96E';
const BROWN = '#3C322D';
const MUTED = '#6B5E53';
const IVORY = '#F5EDE4';

// ---- Margins matching cover border (~55pt each side) ----
const M = { top: 55, right: 55, bottom: 50, left: 55 };

const s = StyleSheet.create({
  page: { width: 595.28, height: 841.89, position: 'relative' },
  bgFull: { position: 'absolute', top: 0, left: 0, width: 595.28, height: 841.89 },
  bgBody: { position: 'absolute', top: 0, left: 0, width: 595.28, height: 841.89 },
  body: { padding: `${M.top} ${M.right} ${M.bottom} ${M.left}`, flex: 1 },

  // Cover overlay text at bottom
  coverOverlay: {
    position: 'absolute', bottom: 50, left: 60, right: 60,
    textAlign: 'center', backgroundColor: 'rgba(245,237,228,0.85)',
    padding: '14 20', borderRadius: 6,
  },
  coverBrand: { fontFamily: 'BodyBold', fontSize: 22, color: GOLD, letterSpacing: 2, marginBottom: 3 },
  coverTagline: { fontFamily: 'Body', fontSize: 8.5, color: GOLD, letterSpacing: 3, marginBottom: 2 },

  // Intro page (p.2)
  introCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: `${M.top} ${M.right} ${M.bottom} ${M.left}` },
  introBrand: { fontFamily: 'BodyBold', fontSize: 20, color: GOLD, letterSpacing: 2, marginBottom: 4 },
  introTagline: { fontFamily: 'Body', fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 14 },
  introDivider: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 180, marginBottom: 14 },
  introProduct: { fontFamily: 'Body', fontSize: 13, color: MUTED, marginBottom: 18 },
  introName: { fontFamily: 'Script', fontSize: 28, color: BROWN, marginBottom: 4 },
  introDate: { fontFamily: 'Body', fontSize: 12, color: MUTED, marginBottom: 24 },
  introDivider2: { height: 1, backgroundColor: GOLD, opacity: 0.25, width: 120, marginBottom: 18 },
  introMetaphor: { fontFamily: 'Script', fontSize: 17, color: GOLD, textAlign: 'center', marginBottom: 14, paddingHorizontal: 30 },
  introBody: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, textAlign: 'center', paddingHorizontal: 20 },

  // Section title (Dancing Script)
  sectionTitle: { fontFamily: 'Script', fontSize: 30, color: GOLD, textAlign: 'center', marginBottom: 4 },
  goldLine: { height: 1, backgroundColor: GOLD, opacity: 0.3, marginBottom: 12, marginTop: 2 },
  sectionSpacer: { height: 26 },

  // Subtitle
  subTitle: { fontFamily: 'BodyBold', fontSize: 12, color: BROWN, marginBottom: 5, marginTop: 12 },

  // Body text
  text: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 6, textAlign: 'justify' },

  // Metaphor
  metaphor: { fontFamily: 'Script', fontSize: 18, color: GOLD, textAlign: 'center', marginBottom: 10, marginTop: 2 },

  // Q&A
  question: { fontFamily: 'BodyBold', fontSize: 12, color: GOLD, marginBottom: 3, marginTop: 10 },
  answer: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 6 },

  // Bullet
  bullet: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 3, paddingLeft: 14 },

  // Closing
  closingMsg: { fontFamily: 'Body', fontSize: 14, color: GOLD, textAlign: 'center', marginTop: 14, marginBottom: 14 },
  ctaBox: { backgroundColor: GOLD, borderRadius: 8, padding: '10 20', marginTop: 16, marginBottom: 12, textAlign: 'center' },
  ctaBoxText: { fontFamily: 'BodyBold', fontSize: 11, color: '#FFFFFF', textAlign: 'center' },
  disclaimer: { fontFamily: 'Body', fontSize: 8, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 1.4 },
});

// ---- Helpers ----
function sectionParagraphs(data) {
  if (!data) return [];
  if (typeof data === 'string') return [data];
  return Object.entries(data).filter(([k, v]) => typeof v === 'string' && k !== 'title').map(([, v]) => v);
}

const el = React.createElement;

// ---- Cover (full-bleed image + small overlay) ----
function CoverPage({ coverImage }) {
  return el(Page, { size: 'A4', style: s.page },
    coverImage && el(Image, { src: coverImage, style: s.bgFull }),
    el(View, { style: s.coverOverlay },
      el(Text, { style: s.coverBrand }, 'BORN DECODED'),
      el(Text, { style: s.coverTagline }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
    ),
  );
}

// ---- Intro Page (p.2) ----
function IntroPage({ bodyImage, name, birthDate, product, metaphorText, dayMasterText }) {
  const productLabel = product === 'compatibility' ? 'Compatibility Reading' : 'Personal Saju Reading';
  return el(Page, { size: 'A4', style: s.page },
    bodyImage && el(Image, { src: bodyImage, style: s.bgBody }),
    el(View, { style: s.introCenter },
      el(Text, { style: s.introBrand }, 'BORN DECODED'),
      el(Text, { style: s.introTagline }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
      el(View, { style: s.introDivider }),
      el(Text, { style: s.introProduct }, productLabel),
      el(Text, { style: s.introName }, clean(name)),
      el(Text, { style: s.introDate }, clean(birthDate)),
      el(View, { style: s.introDivider2 }),
      metaphorText && el(Text, { style: s.introMetaphor }, clean(metaphorText)),
      dayMasterText && el(Text, { style: s.introBody }, clean(dayMasterText)),
    ),
  );
}

// ---- Section Block ----
function SectionBlock({ title, metaphorText, paragraphs, isFirst }) {
  const paras = (paragraphs || []).map(p => clean(p));
  const elements = [];

  if (!isFirst) elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));

  const titleGroup = [
    el(Text, { style: s.sectionTitle, key: 'tit' }, clean(title || '')),
    el(View, { style: s.goldLine, key: 'gl' }),
  ];
  if (metaphorText) titleGroup.push(el(Text, { style: s.metaphor, key: 'met' }, clean(metaphorText)));
  if (paras[0]) titleGroup.push(el(Text, { style: s.text, key: 'p0' }, paras[0]));
  elements.push(el(View, { wrap: false, key: 'tg' }, ...titleGroup));

  for (let i = 1; i < paras.length; i++) {
    elements.push(el(Text, { style: s.text, key: `p${i}` }, paras[i]));
  }
  return el(View, { style: { marginBottom: 2 } }, ...elements);
}

// ---- Life Cycles (대운 + This Year + Next Year, no Year by Year) ----
function LifeCyclesBlock({ data }) {
  if (!data) return el(View, {});
  const elements = [];

  elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));

  const titleGroup = [
    el(Text, { style: s.sectionTitle, key: 'lct' }, 'Life Cycles'),
    el(View, { style: s.goldLine, key: 'lcgl' }),
  ];
  if (data.grandCycleNarrative) titleGroup.push(el(Text, { style: s.text, key: 'gc' }, clean(data.grandCycleNarrative)));
  elements.push(el(View, { wrap: false, key: 'tg' }, ...titleGroup));

  if (data.currentCycleDeep) {
    elements.push(el(View, { wrap: false, key: 'cc' },
      el(Text, { style: s.subTitle }, 'Current Cycle'),
      el(Text, { style: s.text }, clean(data.currentCycleDeep)),
    ));
  }

  // This Year in Detail
  if (data.thisYearDetail) {
    const tyEls = [el(Text, { style: s.subTitle, key: 'tyt' }, `This Year in Detail`)];
    Object.entries(data.thisYearDetail).forEach(([, v], i) => {
      if (typeof v === 'string') tyEls.push(el(Text, { style: s.text, key: `ty${i}` }, clean(v)));
    });
    elements.push(el(View, { key: 'tyd' }, ...tyEls));
  }

  // Next Year Preview
  if (data.nextYearDetail) {
    const nyEls = [el(Text, { style: s.subTitle, key: 'nyt' }, `Next Year Preview`)];
    Object.entries(data.nextYearDetail).forEach(([, v], i) => {
      if (typeof v === 'string') nyEls.push(el(Text, { style: s.text, key: `ny${i}` }, clean(v)));
    });
    elements.push(el(View, { key: 'nyd' }, ...nyEls));
  }

  return el(View, {}, ...elements);
}

// ---- Q&A ----
function QABlock({ questions }) {
  const elements = [];
  elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));
  elements.push(el(View, { wrap: false, key: 'tg' },
    el(Text, { style: s.sectionTitle }, 'Your Questions Answered'),
    el(View, { style: s.goldLine }),
  ));
  if (Array.isArray(questions)) {
    questions.forEach((qa, i) => {
      elements.push(el(View, { wrap: false, key: `qa${i}` },
        el(Text, { style: s.question }, clean(`Q: ${qa.question}`)),
        el(Text, { style: s.answer }, clean(qa.answer)),
      ));
    });
  }
  return el(View, {}, ...elements);
}

// ---- Survival Guide + CTA + Disclaimer (inline) ----
function ClosingBlock({ data, product }) {
  if (!data) return el(View, {});
  const ctaUrl = product === 'saju' ? 'borndecoded.com/compatibility.html' : 'borndecoded.com/saju.html';
  const ctaLabel = product === 'saju' ? 'Get Your Compatibility Reading' : 'Get Your Personal Saju Reading';

  return el(View, {},
    el(View, { style: s.sectionSpacer }),
    el(View, { wrap: false },
      el(Text, { style: s.sectionTitle }, 'Your Survival Guide'),
      el(View, { style: s.goldLine }),
      ...(data.threeLineSummary || []).map((line, i) =>
        el(Text, { style: s.bullet, key: `b${i}` }, clean(`* ${line}`))
      ),
    ),
    data.practicalActions && el(Text, { style: { ...s.text, marginTop: 8 } }, clean(data.practicalActions)),
    data.closingMessage && el(Text, { style: s.closingMsg }, clean(data.closingMessage)),
    el(View, { style: s.ctaBox },
      el(Text, { style: s.ctaBoxText }, `${ctaLabel} → ${ctaUrl}`),
    ),
    el(Text, { style: s.disclaimer },
      'For entertainment and self-reflection purposes only.\nborndecoded.com | borndecoded@gmail.com'
    ),
  );
}

// ============================================================
// Saju PDF
// ============================================================

export async function generateSajuPdf({ report, coverImageBuffer, bodyImageBuffer, name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  // Extract Birth Chart data for intro page
  const metaphor = report.section1_birthChart?.dayMasterMetaphor || '';
  const dayMasterExpl = report.section1_birthChart?.dayMasterExplanation || '';

  const doc = el(Document, {},
    // p.1: Cover (full-bleed image)
    el(CoverPage, { coverImage: coverSrc }),

    // p.2: Intro (brand + name + Day Master)
    el(IntroPage, {
      bodyImage: bodySrc, name, birthDate, product: 'saju',
      metaphorText: metaphor, dayMasterText: dayMasterExpl,
    }),

    // p.3+: Body (continuous flow)
    // NOTE: Image must be INSIDE body View to avoid creating blank first page
    el(Page, { size: 'A4', style: s.page, wrap: true },
      el(View, { style: { ...s.body, position: 'relative' } },
        bodySrc && el(Image, { src: bodySrc, style: s.bgBody, fixed: true }),

        // S2: Essence (starts body — first section)
        el(SectionBlock, {
          key: 's2', isFirst: true,
          title: report.section2_essence?.title || 'Your Essence',
          paragraphs: sectionParagraphs(report.section2_essence),
        }),

        el(SectionBlock, {
          key: 's3',
          title: report.section3_realYou?.title || 'The Real You',
          paragraphs: sectionParagraphs(report.section3_realYou),
        }),

        el(SectionBlock, {
          key: 's4',
          title: report.section4_hiddenPower?.title || 'Hidden Power',
          paragraphs: sectionParagraphs(report.section4_hiddenPower),
        }),

        el(SectionBlock, {
          key: 's5',
          title: report.section5_careerMoney?.title || 'Career and Money',
          paragraphs: sectionParagraphs(report.section5_careerMoney),
        }),

        el(SectionBlock, {
          key: 's6',
          title: report.section6_loveMarriage?.title || 'Love and Marriage',
          paragraphs: sectionParagraphs(report.section6_loveMarriage),
        }),

        el(SectionBlock, {
          key: 's7',
          title: report.section7_familyFriends?.title || 'Family and Friends',
          paragraphs: sectionParagraphs(report.section7_familyFriends),
        }),

        el(LifeCyclesBlock, { key: 's8', data: report.section8_lifeCycles }),
        el(QABlock, { key: 's9', questions: report.section9_questions }),
        el(ClosingBlock, { key: 's10', data: report.section10_survivalGuide, product: 'saju' }),
      ),
    ),
  );

  return renderToBuffer(doc);
}

// ============================================================
// Compatibility PDF
// ============================================================

export async function generateCompatibilityPdf({ report, coverImageBuffer, bodyImageBuffer, person1Name, person2Name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  const sectionMap = [
    ['section2_firstSpark', 'First Spark'],
    ['section3_attraction', 'What Pulls You Together'],
    ['section4_minefield', 'The Minefield'],
    ['section5_dating', 'Dating Energy'],
    ['section6_marriage', 'Marriage Reality'],
    ['section7_kidsFamily', 'Kids and Family'],
    ['section8_mirror', 'How You See Each Other'],
  ];

  const doc = el(Document, {},
    el(CoverPage, { coverImage: coverSrc }),

    el(IntroPage, {
      bodyImage: bodySrc,
      name: `${person1Name} & ${person2Name}`,
      birthDate,
      product: 'compatibility',
      metaphorText: report.section1_twoCharts?.headline,
      dayMasterText: report.section1_twoCharts?.scoreJustification,
    }),

    el(Page, { size: 'A4', style: s.page, wrap: true },
      el(View, { style: { ...s.body, position: 'relative' } },
        bodySrc && el(Image, { src: bodySrc, style: s.bgBody, fixed: true }),
        ...sectionMap.map(([key, fallback], i) =>
          el(SectionBlock, {
            key: `c${i + 2}`, isFirst: i === 0,
            title: report[key]?.title || fallback,
            paragraphs: sectionParagraphs(report[key]),
          })
        ),
        el(QABlock, { key: 'c9', questions: report.section9_questions }),
        el(ClosingBlock, { key: 'c10', data: report.section10_coupleGuide, product: 'compatibility' }),
      ),
    ),
  );

  return renderToBuffer(doc);
}

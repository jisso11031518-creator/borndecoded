/**
 * Born Decoded — PDF Generator v3 (@react-pdf/renderer)
 *
 * v3 fixes: ligature breaking, single-page cover, continuous flow layout,
 * larger fonts, no CJK, clean body background, compact closing.
 */

import React from 'react';
import { renderToBuffer, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';

// ---- Font Registration ----
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;

  // Script font for titles — Dancing Script (replaces GreatVibes which had ligature drops)
  Font.register({
    family: 'Script',
    src: 'https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTQ.ttf',
  });
  Font.register({
    family: 'ScriptBold',
    src: 'https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i0HTQ.ttf',
  });

  // Body font — Noto Serif (clean ligature handling in @react-pdf)
  Font.register({
    family: 'Body',
    src: 'https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZqFCjwA.ttf',
  });
  Font.register({
    family: 'BodyBold',
    src: 'https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZT1ejwA.ttf',
  });

  // Disable hyphenation
  Font.registerHyphenationCallback(word => [word]);
  fontsRegistered = true;
}

// ---- Text Sanitizer: remove CJK only (NO ligature hacks) ----
function clean(text) {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  // Remove CJK characters (Hanja, Hangul, Kanji)
  let result = text.replace(/[\u3000-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, '');
  // Clean up leftover empty parens and double spaces
  result = result.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  return result;
}

// ---- Styles ----
const GOLD = '#C9A96E';
const BROWN = '#3C322D';
const MUTED = '#6B5E53';

const s = StyleSheet.create({
  page: { width: 595.28, height: 841.89, position: 'relative' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: 595.28, height: 841.89 },

  // ---- Cover ----
  coverContent: { position: 'relative', flex: 1, padding: '0 50 0 50' },
  coverBottom: {
    position: 'absolute', bottom: 60, left: 50, right: 50,
    textAlign: 'center',
  },
  coverBrand: { fontFamily: 'Script', fontSize: 28, color: GOLD, marginBottom: 5 },
  coverTagline: { fontFamily: 'Body', fontSize: 10, color: GOLD, letterSpacing: 3, marginBottom: 10 },
  coverDivider: { height: 1, backgroundColor: GOLD, opacity: 0.4, marginBottom: 12, marginHorizontal: 80 },
  coverProduct: { fontFamily: 'Body', fontSize: 14, color: MUTED, marginBottom: 14 },
  coverName: { fontFamily: 'Script', fontSize: 24, color: BROWN, marginBottom: 4 },
  coverDate: { fontFamily: 'Body', fontSize: 12, color: MUTED },

  // ---- Body ----
  body: { position: 'relative', padding: '50 52 45 52', flex: 1 },

  // Section title — Dancing Script, +2pt from before
  sectionTitle: { fontFamily: 'Script', fontSize: 30, color: GOLD, textAlign: 'center', marginBottom: 4 },
  goldLine: { height: 1, backgroundColor: GOLD, opacity: 0.3, marginBottom: 12, marginTop: 2 },
  sectionSpacer: { height: 28 },

  // Subtitle — Noto Serif Bold
  subTitle: { fontFamily: 'BodyBold', fontSize: 12, color: BROWN, marginBottom: 5, marginTop: 12 },

  // Body text — Noto Serif 12pt, lineHeight 1.65
  text: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 6, textAlign: 'justify' },
  textSmall: { fontFamily: 'Body', fontSize: 12, color: MUTED, lineHeight: 1.65, marginBottom: 4 },

  // Metaphor — Dancing Script
  metaphor: { fontFamily: 'Script', fontSize: 19, color: GOLD, textAlign: 'center', marginBottom: 10, marginTop: 2 },

  // Q&A — Noto Serif Bold for question, regular for answer
  question: { fontFamily: 'BodyBold', fontSize: 12, color: GOLD, marginBottom: 3, marginTop: 10 },
  answer: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 6 },

  // Bullet
  bullet: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, marginBottom: 3, paddingLeft: 14 },

  // Closing — Dancing Script
  closingMsg: { fontFamily: 'Script', fontSize: 16, color: GOLD, textAlign: 'center', marginTop: 14, marginBottom: 14 },

  // CTA box
  ctaBox: {
    backgroundColor: GOLD, borderRadius: 8,
    padding: '10 20', marginTop: 16, marginBottom: 12,
    textAlign: 'center',
  },
  ctaBoxText: { fontFamily: 'BodyBold', fontSize: 11, color: '#FFFFFF', textAlign: 'center' },

  // Disclaimer (small, bottom)
  disclaimer: { fontFamily: 'Body', fontSize: 8, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 1.4 },
});

// ---- Helpers ----
function sectionParagraphs(data) {
  if (!data) return [];
  if (typeof data === 'string') return [data];
  return Object.entries(data)
    .filter(([k, v]) => typeof v === 'string' && k !== 'title')
    .map(([, v]) => v);
}

const el = React.createElement;

// ---- Cover Page ----
function CoverPage({ coverImage, name, birthDate, product }) {
  const productLabel = product === 'compatibility' ? 'Compatibility Reading' : 'Personal Saju Reading';
  return el(Page, { size: 'A4', style: s.page },
    coverImage && el(Image, { src: coverImage, style: s.bgImage }),
    el(View, { style: s.coverContent }),
    el(View, { style: s.coverBottom },
      el(Text, { style: s.coverBrand }, 'Born Decoded'),
      el(Text, { style: s.coverTagline }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
      el(View, { style: s.coverDivider }),
      el(Text, { style: s.coverProduct }, productLabel),
      el(Text, { style: s.coverName }, clean(name)),
      el(Text, { style: s.coverDate }, clean(birthDate)),
    ),
  );
}

// ---- Section Block (wrap:false on title + first para to prevent orphan titles) ----
function SectionBlock({ title, metaphorText, paragraphs, isFirst }) {
  const paras = (paragraphs || []).map(p => clean(p));
  const elements = [];

  // Spacer between sections (not before first)
  if (!isFirst) elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));

  // Title + gold line + first paragraph grouped together (won't split)
  const titleGroup = [
    el(Text, { style: s.sectionTitle, key: 'tit' }, clean(title || '')),
    el(View, { style: s.goldLine, key: 'gl' }),
  ];
  if (metaphorText) titleGroup.push(el(Text, { style: s.metaphor, key: 'met' }, clean(metaphorText)));
  if (paras[0]) titleGroup.push(el(Text, { style: s.text, key: 'p0' }, paras[0]));

  elements.push(el(View, { wrap: false, key: 'tg' }, ...titleGroup));

  // Remaining paragraphs flow normally
  for (let i = 1; i < paras.length; i++) {
    elements.push(el(Text, { style: s.text, key: `p${i}` }, paras[i]));
  }

  return el(View, { style: { marginBottom: 2 } }, ...elements);
}

// ---- Life Cycles ----
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

  if (data.decadeYearByYear?.length) {
    const yrEls = [el(Text, { style: s.subTitle, key: 'yrt' }, 'Year by Year')];
    data.decadeYearByYear.forEach((y, i) => {
      yrEls.push(el(Text, { style: s.textSmall, key: `yr${i}` }, clean(`${y.year}: ${y.oneLiner}`)));
    });
    elements.push(el(View, { key: 'yrs' }, ...yrEls));
  }

  if (data.thisYearDetail) {
    const tyEls = [el(Text, { style: s.subTitle, key: 'tyt' }, 'This Year in Detail')];
    Object.entries(data.thisYearDetail).forEach(([, v], i) => {
      if (typeof v === 'string') tyEls.push(el(Text, { style: s.text, key: `ty${i}` }, clean(v)));
    });
    elements.push(el(View, { key: 'tyd' }, ...tyEls));
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

// ---- Survival Guide + CTA + Disclaimer (all in one flow) ----
function ClosingBlock({ data, product }) {
  if (!data) return el(View, {});
  const ctaUrl = product === 'saju'
    ? 'borndecoded.com/compatibility.html'
    : 'borndecoded.com/saju.html';
  const ctaLabel = product === 'saju'
    ? 'Get Your Compatibility Reading'
    : 'Get Your Personal Saju Reading';

  return el(View, {},
    el(View, { style: s.sectionSpacer }),

    // Title group
    el(View, { wrap: false },
      el(Text, { style: s.sectionTitle }, 'Your Survival Guide'),
      el(View, { style: s.goldLine }),
      ...(data.threeLineSummary || []).map((line, i) =>
        el(Text, { style: s.bullet, key: `b${i}` }, clean(`* ${line}`))
      ),
    ),

    data.practicalActions && el(Text, { style: { ...s.text, marginTop: 8 } }, clean(data.practicalActions)),
    data.closingMessage && el(Text, { style: s.closingMsg }, clean(data.closingMessage)),

    // CTA box
    el(View, { style: s.ctaBox },
      el(Text, { style: s.ctaBoxText }, `${ctaLabel} → ${ctaUrl}`),
    ),

    // Disclaimer
    el(Text, { style: s.disclaimer },
      'For entertainment and self-reflection purposes only.\nborndecoded.com | borndecoded@gmail.com'
    ),
  );
}

// ============================================================
// Main: Saju PDF
// ============================================================

export async function generateSajuPdf({ report, coverImageBuffer, bodyImageBuffer, name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  const doc = el(Document, {},
    // ---- Cover (single page) ----
    el(CoverPage, { coverImage: coverSrc, name, birthDate, product: 'saju' }),

    // ---- Body (continuous flow, auto page breaks) ----
    el(Page, { size: 'A4', style: s.page, wrap: true },
      bodySrc && el(Image, { src: bodySrc, style: s.bgImage, fixed: true }),
      el(View, { style: s.body },

        // S1: Birth Chart
        el(SectionBlock, {
          key: 's1', isFirst: true,
          title: 'Your Birth Chart',
          metaphorText: report.section1_birthChart?.dayMasterMetaphor,
          paragraphs: [report.section1_birthChart?.dayMasterExplanation].filter(Boolean),
        }),

        // S2: Essence
        el(SectionBlock, {
          key: 's2',
          title: report.section2_essence?.title || 'Your Essence',
          paragraphs: sectionParagraphs(report.section2_essence),
        }),

        // S3: Real You
        el(SectionBlock, {
          key: 's3',
          title: report.section3_realYou?.title || 'The Real You',
          paragraphs: sectionParagraphs(report.section3_realYou),
        }),

        // S4: Hidden Power
        el(SectionBlock, {
          key: 's4',
          title: report.section4_hiddenPower?.title || 'Hidden Power',
          paragraphs: sectionParagraphs(report.section4_hiddenPower),
        }),

        // S5: Career & Money
        el(SectionBlock, {
          key: 's5',
          title: report.section5_careerMoney?.title || 'Career and Money',
          paragraphs: sectionParagraphs(report.section5_careerMoney),
        }),

        // S6: Love & Marriage
        el(SectionBlock, {
          key: 's6',
          title: report.section6_loveMarriage?.title || 'Love and Marriage',
          paragraphs: sectionParagraphs(report.section6_loveMarriage),
        }),

        // S7: Family & Friends
        el(SectionBlock, {
          key: 's7',
          title: report.section7_familyFriends?.title || 'Family and Friends',
          paragraphs: sectionParagraphs(report.section7_familyFriends),
        }),

        // S8: Life Cycles
        el(LifeCyclesBlock, { key: 's8', data: report.section8_lifeCycles }),

        // S9: Q&A
        el(QABlock, { key: 's9', questions: report.section9_questions }),

        // S10: Survival Guide + CTA + Disclaimer
        el(ClosingBlock, { key: 's10', data: report.section10_survivalGuide, product: 'saju' }),
      ),
    ),
  );

  return renderToBuffer(doc);
}

// ============================================================
// Main: Compatibility PDF
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
    el(CoverPage, {
      coverImage: coverSrc,
      name: `${person1Name} & ${person2Name}`,
      birthDate,
      product: 'compatibility',
    }),

    el(Page, { size: 'A4', style: s.page, wrap: true },
      bodySrc && el(Image, { src: bodySrc, style: s.bgImage, fixed: true }),
      el(View, { style: s.body },

        // S1: Two Charts
        el(SectionBlock, {
          key: 'c1', isFirst: true,
          title: report.section1_twoCharts?.headline || 'Your Charts',
          paragraphs: [report.section1_twoCharts?.scoreJustification].filter(Boolean),
        }),

        // S2-S8
        ...sectionMap.map(([key, fallback], i) =>
          el(SectionBlock, {
            key: `c${i + 2}`,
            title: report[key]?.title || fallback,
            paragraphs: sectionParagraphs(report[key]),
          })
        ),

        // S9: Q&A
        el(QABlock, { key: 'c9', questions: report.section9_questions }),

        // S10: Couple's Guide + CTA
        el(ClosingBlock, { key: 'c10', data: report.section10_coupleGuide, product: 'compatibility' }),
      ),
    ),
  );

  return renderToBuffer(doc);
}

/**
 * Born Decoded — PDF Generator v2 (@react-pdf/renderer)
 *
 * Redesigned: single cover page, continuous flowing body,
 * no empty pages, larger fonts, no ligature issues, no Hanja.
 */

import React from 'react';
import { renderToBuffer, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';

// ---- Register Fonts (CDN) ----
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: 'GreatVibes',
    src: 'https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf',
  });
  Font.register({
    family: 'Cormorant',
    src: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_v86GnM.ttf',
  });
  Font.register({
    family: 'CormorantBold',
    src: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_hg9GnM.ttf',
  });
  Font.register({
    family: 'Lora',
    src: 'https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787z5vCJG.ttf',
  });

  // Disable hyphenation to prevent ligature/split issues
  Font.registerHyphenationCallback(word => [word]);

  fontsRegistered = true;
}

// ---- Sanitize text: remove Hanja, fix encoding ----
function clean(text) {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  // Remove CJK characters (Hanja/Hangul/Kanji)
  return text.replace(/[\u3000-\u9FFF\uF900-\uFAFF]/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ---- Styles ----
const GOLD = '#C9A96E';
const BROWN = '#3C322D';
const MUTED = '#6B5E53';
const IVORY = '#F5EDE4';

const s = StyleSheet.create({
  page: { width: 595.28, height: 841.89, position: 'relative' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: 595.28, height: 841.89 },

  // Cover layout
  coverContent: {
    position: 'relative', flex: 1,
    padding: '0 50 40 50',
    justifyContent: 'flex-end',
  },
  coverRight: {
    position: 'absolute', top: 100, right: 50,
    width: 220, textAlign: 'right',
  },
  coverName: { fontFamily: 'GreatVibes', fontSize: 28, color: BROWN, marginBottom: 4 },
  coverDate: { fontFamily: 'Cormorant', fontSize: 13, color: MUTED },
  coverBottom: { textAlign: 'center', paddingBottom: 10 },
  coverTitle: { fontFamily: 'GreatVibes', fontSize: 38, color: BROWN, marginBottom: 6 },
  coverTagline: { fontFamily: 'Cormorant', fontSize: 10, color: GOLD, letterSpacing: 3, marginBottom: 4 },
  coverProduct: { fontFamily: 'Cormorant', fontSize: 12, color: MUTED },

  // Body content
  body: { position: 'relative', padding: '55 55 50 55', flex: 1 },

  // Section title (Great Vibes)
  sectionTitle: { fontFamily: 'GreatVibes', fontSize: 26, color: GOLD, textAlign: 'center', marginBottom: 6 },
  goldLine: { height: 1, backgroundColor: GOLD, opacity: 0.3, marginBottom: 14, marginTop: 4 },

  // Subtitle
  subTitle: { fontFamily: 'Lora', fontSize: 13, color: BROWN, marginBottom: 6, marginTop: 14 },

  // Body text — larger for mobile readability
  text: { fontFamily: 'Cormorant', fontSize: 12.5, color: BROWN, lineHeight: 1.75, marginBottom: 7, textAlign: 'justify' },
  textSmall: { fontFamily: 'Cormorant', fontSize: 11, color: MUTED, lineHeight: 1.65, marginBottom: 5 },

  // Metaphor / highlight
  metaphor: { fontFamily: 'GreatVibes', fontSize: 18, color: GOLD, textAlign: 'center', marginBottom: 12, marginTop: 4 },

  // Q&A
  question: { fontFamily: 'Lora', fontSize: 12, color: GOLD, marginBottom: 4, marginTop: 12 },
  answer: { fontFamily: 'Cormorant', fontSize: 12.5, color: BROWN, lineHeight: 1.75, marginBottom: 7 },

  // Bullet
  bullet: { fontFamily: 'Cormorant', fontSize: 12.5, color: BROWN, lineHeight: 1.75, marginBottom: 3, paddingLeft: 14 },

  // Closing
  closingCenter: { textAlign: 'center', marginTop: 20 },
  closingMsg: { fontFamily: 'GreatVibes', fontSize: 15, color: GOLD, textAlign: 'center', marginTop: 14 },

  // Disclaimer (small)
  disclaimer: { fontFamily: 'Cormorant', fontSize: 8.5, color: '#999', textAlign: 'center', marginTop: 30, lineHeight: 1.5 },
  ctaText: { fontFamily: 'Lora', fontSize: 11, color: GOLD, textAlign: 'center', marginTop: 16 },

  // Section wrapper (keeps sections together, avoids mid-break)
  section: { marginBottom: 8 },
  sectionWrap: { marginBottom: 20 },
});

// ---- Helper: extract paragraphs from section object ----
function sectionParagraphs(data) {
  if (!data) return [];
  if (typeof data === 'string') return [data];
  return Object.entries(data)
    .filter(([k, v]) => typeof v === 'string' && k !== 'title')
    .map(([, v]) => v);
}

// ---- Components ----

function CoverPage({ coverImage, name, birthDate, product }) {
  const productLabel = product === 'compatibility' ? 'Compatibility Reading' : 'Personal Saju Reading';
  return React.createElement(Page, { size: 'A4', style: s.page },
    coverImage && React.createElement(Image, { src: coverImage, style: s.bgImage }),
    // Customer info top-right
    React.createElement(View, { style: s.coverRight },
      React.createElement(Text, { style: s.coverName }, clean(name)),
      React.createElement(Text, { style: s.coverDate }, clean(birthDate)),
    ),
    // Bottom area below gold line
    React.createElement(View, { style: s.coverContent },
      React.createElement(View, { style: s.coverBottom },
        React.createElement(Text, { style: s.coverTitle }, 'Born Decoded'),
        React.createElement(Text, { style: s.coverTagline }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
        React.createElement(Text, { style: s.coverProduct }, productLabel),
      ),
    ),
  );
}

function SectionBlock({ title, metaphorText, paragraphs }) {
  const els = [];
  if (title) {
    els.push(React.createElement(Text, { style: s.sectionTitle, key: 't' }, clean(title)));
    els.push(React.createElement(View, { style: s.goldLine, key: 'gl' }));
  }
  if (metaphorText) {
    els.push(React.createElement(Text, { style: s.metaphor, key: 'meta' }, clean(metaphorText)));
  }
  const paras = paragraphs || [];
  paras.forEach((p, i) => {
    els.push(React.createElement(Text, { style: s.text, key: `p${i}` }, clean(p)));
  });
  return React.createElement(View, { style: s.sectionWrap, wrap: false }, ...els);
}

function LifeCyclesBlock({ data }) {
  if (!data) return React.createElement(View, {});
  const els = [];
  els.push(React.createElement(Text, { style: s.sectionTitle, key: 'lct' }, 'Life Cycles'));
  els.push(React.createElement(View, { style: s.goldLine, key: 'lcgl' }));

  if (data.grandCycleNarrative) {
    els.push(React.createElement(Text, { style: s.text, key: 'gc' }, clean(data.grandCycleNarrative)));
  }
  if (data.currentCycleDeep) {
    els.push(React.createElement(Text, { style: s.subTitle, key: 'cst' }, 'Current Cycle'));
    els.push(React.createElement(Text, { style: s.text, key: 'ccd' }, clean(data.currentCycleDeep)));
  }

  // Year by year
  if (data.decadeYearByYear?.length) {
    els.push(React.createElement(Text, { style: s.subTitle, key: 'dyt' }, 'Year by Year'));
    data.decadeYearByYear.forEach((y, i) => {
      els.push(React.createElement(Text, { style: s.textSmall, key: `yr${i}` },
        `${y.year}: ${clean(y.oneLiner)}`));
    });
  }

  // This year detail
  if (data.thisYearDetail) {
    els.push(React.createElement(Text, { style: s.subTitle, key: 'tyt' }, 'This Year in Detail'));
    Object.entries(data.thisYearDetail).forEach(([k, v], i) => {
      if (typeof v === 'string') {
        els.push(React.createElement(Text, { style: s.text, key: `ty${i}` }, clean(v)));
      }
    });
  }

  return React.createElement(View, { style: s.sectionWrap }, ...els);
}

function QABlock({ questions }) {
  const els = [];
  els.push(React.createElement(Text, { style: s.sectionTitle, key: 'qat' }, 'Your Questions Answered'));
  els.push(React.createElement(View, { style: s.goldLine, key: 'qagl' }));

  if (Array.isArray(questions)) {
    questions.forEach((qa, i) => {
      els.push(React.createElement(View, { style: s.section, key: `qa${i}`, wrap: false },
        React.createElement(Text, { style: s.question }, `Q: ${clean(qa.question)}`),
        React.createElement(Text, { style: s.answer }, clean(qa.answer)),
      ));
    });
  }
  return React.createElement(View, { style: s.sectionWrap }, ...els);
}

function SurvivalGuideBlock({ data, product }) {
  if (!data) return React.createElement(View, {});
  const crossSell = product === 'saju'
    ? 'Curious about your compatibility? borndecoded.com/compatibility.html'
    : 'Understand yourself deeper: borndecoded.com/saju.html';

  return React.createElement(View, { style: s.sectionWrap },
    React.createElement(Text, { style: s.sectionTitle }, 'Your Survival Guide'),
    React.createElement(View, { style: s.goldLine }),
    ...(data.threeLineSummary || []).map((line, i) =>
      React.createElement(Text, { style: s.bullet, key: `b${i}` }, `* ${clean(line)}`)
    ),
    data.practicalActions && React.createElement(Text, { style: { ...s.text, marginTop: 10 } }, clean(data.practicalActions)),
    data.closingMessage && React.createElement(Text, { style: s.closingMsg }, clean(data.closingMessage)),
    React.createElement(View, { style: { ...s.goldLine, marginTop: 20 } }),
    React.createElement(Text, { style: s.ctaText }, crossSell),
    React.createElement(Text, { style: s.disclaimer },
      'For entertainment and self-reflection purposes only.\nborndecoded.com | borndecoded@gmail.com'
    ),
  );
}

// ---- Main: Saju PDF ----

export async function generateSajuPdf({ report, coverImageBuffer, bodyImageBuffer, name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  // Build all body sections as elements for continuous flow
  const sections = [];

  // Section 1: Birth Chart
  sections.push(React.createElement(SectionBlock, {
    key: 's1',
    title: 'Your Birth Chart',
    metaphorText: report.section1_birthChart?.dayMasterMetaphor,
    paragraphs: [report.section1_birthChart?.dayMasterExplanation].filter(Boolean),
  }));

  // Section 2: Essence
  sections.push(React.createElement(SectionBlock, {
    key: 's2',
    title: report.section2_essence?.title || 'Your Essence',
    paragraphs: sectionParagraphs(report.section2_essence),
  }));

  // Section 3: Real You
  sections.push(React.createElement(SectionBlock, {
    key: 's3',
    title: report.section3_realYou?.title || 'The Real You',
    paragraphs: sectionParagraphs(report.section3_realYou),
  }));

  // Section 4: Hidden Power
  sections.push(React.createElement(SectionBlock, {
    key: 's4',
    title: report.section4_hiddenPower?.title || 'Hidden Power',
    paragraphs: sectionParagraphs(report.section4_hiddenPower),
  }));

  // Section 5: Career & Money
  sections.push(React.createElement(SectionBlock, {
    key: 's5',
    title: report.section5_careerMoney?.title || 'Career and Money',
    paragraphs: sectionParagraphs(report.section5_careerMoney),
  }));

  // Section 6: Love & Marriage
  sections.push(React.createElement(SectionBlock, {
    key: 's6',
    title: report.section6_loveMarriage?.title || 'Love and Marriage',
    paragraphs: sectionParagraphs(report.section6_loveMarriage),
  }));

  // Section 7: Family & Friends
  sections.push(React.createElement(SectionBlock, {
    key: 's7',
    title: report.section7_familyFriends?.title || 'Family and Friends',
    paragraphs: sectionParagraphs(report.section7_familyFriends),
  }));

  // Section 8: Life Cycles
  sections.push(React.createElement(LifeCyclesBlock, { key: 's8', data: report.section8_lifeCycles }));

  // Section 9: Q&A
  sections.push(React.createElement(QABlock, { key: 's9', questions: report.section9_questions }));

  // Section 10: Survival Guide
  const guideData = report.section10_survivalGuide || {};
  sections.push(React.createElement(SurvivalGuideBlock, { key: 's10', data: guideData, product: 'saju' }));

  const doc = React.createElement(Document, {},
    // Cover (1 page)
    React.createElement(CoverPage, { coverImage: coverSrc, name, birthDate, product: 'saju' }),
    // Body — continuous flow, react-pdf handles page breaks
    React.createElement(Page, { size: 'A4', style: s.page, wrap: true },
      bodySrc && React.createElement(Image, { src: bodySrc, style: s.bgImage, fixed: true }),
      React.createElement(View, { style: s.body },
        ...sections,
      ),
    ),
  );

  return renderToBuffer(doc);
}

// ---- Main: Compatibility PDF ----

export async function generateCompatibilityPdf({ report, coverImageBuffer, bodyImageBuffer, person1Name, person2Name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  const sections = [];

  // Section 1: Two Charts
  sections.push(React.createElement(SectionBlock, {
    key: 'c1',
    title: report.section1_twoCharts?.headline || 'Your Charts',
    paragraphs: [report.section1_twoCharts?.scoreJustification].filter(Boolean),
  }));

  // Sections 2-8
  const sectionMap = [
    ['section2_firstSpark', 'First Spark'],
    ['section3_attraction', 'What Pulls You Together'],
    ['section4_minefield', 'The Minefield'],
    ['section5_dating', 'Dating Energy'],
    ['section6_marriage', 'Marriage Reality'],
    ['section7_kidsFamily', 'Kids and Family'],
    ['section8_mirror', 'How You See Each Other'],
  ];
  sectionMap.forEach(([key, fallback], i) => {
    sections.push(React.createElement(SectionBlock, {
      key: `c${i + 2}`,
      title: report[key]?.title || fallback,
      paragraphs: sectionParagraphs(report[key]),
    }));
  });

  // Section 9: Q&A
  sections.push(React.createElement(QABlock, { key: 'c9', questions: report.section9_questions }));

  // Section 10: Couple's Guide
  const guideData = report.section10_coupleGuide || {};
  sections.push(React.createElement(SurvivalGuideBlock, { key: 'c10', data: guideData, product: 'compatibility' }));

  const doc = React.createElement(Document, {},
    React.createElement(CoverPage, {
      coverImage: coverSrc,
      name: `${person1Name} & ${person2Name}`,
      birthDate,
      product: 'compatibility',
    }),
    React.createElement(Page, { size: 'A4', style: s.page, wrap: true },
      bodySrc && React.createElement(Image, { src: bodySrc, style: s.bgImage, fixed: true }),
      React.createElement(View, { style: s.body },
        ...sections,
      ),
    ),
  );

  return renderToBuffer(doc);
}

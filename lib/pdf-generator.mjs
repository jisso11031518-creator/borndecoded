/**
 * Born Decoded — PDF Generator (@react-pdf/renderer)
 *
 * Generates A4 PDF reports with cover image + body background
 * Fonts: Great Vibes (titles), Cormorant Garamond (body), Playfair Display (subheadings)
 */

import React from 'react';
import { renderToBuffer, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

// ---- Register Fonts ----
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;

  try {
    Font.register({ family: 'GreatVibes', src: path.join(FONTS_DIR, 'GreatVibes-Regular.ttf') });
    Font.register({ family: 'Cormorant', src: path.join(FONTS_DIR, 'CormorantGaramond-Regular.ttf') });
    Font.register({ family: 'CormorantBold', src: path.join(FONTS_DIR, 'CormorantGaramond-Bold.ttf') });
    Font.register({ family: 'Playfair', src: path.join(FONTS_DIR, 'Lora-Bold.ttf') });
    fontsRegistered = true;
  } catch (err) {
    console.warn('[PDF] Font registration warning:', err.message);
  }
}

// ---- Styles ----
const s = StyleSheet.create({
  page: { width: 595.28, height: 841.89, position: 'relative' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: 595.28, height: 841.89 },
  content: { position: 'relative', padding: '80 60 60 60', flex: 1 },
  coverContent: { position: 'relative', padding: '60 60', flex: 1, justifyContent: 'flex-end' },

  // Cover
  coverTitle: { fontFamily: 'GreatVibes', fontSize: 36, color: '#3C322D', textAlign: 'center', marginBottom: 8 },
  coverName: { fontFamily: 'Playfair', fontSize: 20, color: '#3C322D', textAlign: 'center', marginBottom: 4 },
  coverDate: { fontFamily: 'Cormorant', fontSize: 13, color: '#5A4A3A', textAlign: 'center', marginBottom: 4 },
  coverTagline: { fontFamily: 'Cormorant', fontSize: 11, color: '#C9A96E', textAlign: 'center', marginTop: 12, letterSpacing: 2 },

  // Section
  sectionTitle: { fontFamily: 'GreatVibes', fontSize: 24, color: '#C9A96E', marginBottom: 12, textAlign: 'center' },
  subTitle: { fontFamily: 'Playfair', fontSize: 14, color: '#3C322D', marginBottom: 8, marginTop: 16 },
  body: { fontFamily: 'Cormorant', fontSize: 11.5, color: '#3C322D', lineHeight: 1.7, marginBottom: 8, textAlign: 'justify' },
  bodySmall: { fontFamily: 'Cormorant', fontSize: 10, color: '#5A4A3A', lineHeight: 1.6, marginBottom: 6 },
  goldLine: { height: 1, backgroundColor: '#C9A96E', opacity: 0.3, marginVertical: 16 },

  // Q&A
  question: { fontFamily: 'Playfair', fontSize: 12, color: '#C9A96E', marginBottom: 6, marginTop: 14 },
  answer: { fontFamily: 'Cormorant', fontSize: 11.5, color: '#3C322D', lineHeight: 1.7, marginBottom: 8 },

  // Summary
  bulletItem: { fontFamily: 'Cormorant', fontSize: 11.5, color: '#3C322D', lineHeight: 1.7, marginBottom: 4, paddingLeft: 12 },

  // Closing
  closingPage: { padding: '80 60 60 60', flex: 1, justifyContent: 'center', alignItems: 'center' },
  disclaimer: { fontFamily: 'Cormorant', fontSize: 9, color: '#999', textAlign: 'center', marginTop: 24, lineHeight: 1.5 },
  ctaText: { fontFamily: 'Playfair', fontSize: 13, color: '#C9A96E', textAlign: 'center', marginTop: 20 },
});

// ---- Document Components ----

function CoverPage({ coverImage, name, birthDate, product }) {
  return React.createElement(Page, { size: 'A4', style: s.page },
    coverImage && React.createElement(Image, { src: coverImage, style: s.bgImage }),
    React.createElement(View, { style: s.coverContent },
      React.createElement(Text, { style: s.coverTitle }, 'Born Decoded'),
      React.createElement(Text, { style: s.coverName }, name),
      React.createElement(Text, { style: s.coverDate }, birthDate),
      React.createElement(Text, { style: s.coverDate }, product === 'compatibility' ? 'Compatibility Reading' : 'Personal Saju Reading'),
      React.createElement(Text, { style: s.coverTagline }, 'YOUR BIRTH WAS CODED. WE DECODE IT.')
    )
  );
}

function BodyPage({ bodyImage, children }) {
  return React.createElement(Page, { size: 'A4', style: s.page },
    bodyImage && React.createElement(Image, { src: bodyImage, style: s.bgImage }),
    React.createElement(View, { style: s.content }, ...children)
  );
}

function SectionBlock({ title, paragraphs }) {
  const elements = [
    React.createElement(Text, { style: s.sectionTitle, key: 'title' }, title),
    React.createElement(View, { style: s.goldLine, key: 'line' }),
  ];
  if (typeof paragraphs === 'string') {
    elements.push(React.createElement(Text, { style: s.body, key: 'p0' }, paragraphs));
  } else if (Array.isArray(paragraphs)) {
    paragraphs.forEach((p, i) => {
      elements.push(React.createElement(Text, { style: s.body, key: `p${i}` }, p));
    });
  } else if (typeof paragraphs === 'object') {
    Object.entries(paragraphs).forEach(([key, val], i) => {
      if (typeof val === 'string') {
        elements.push(React.createElement(Text, { style: s.body, key: `p${i}` }, val));
      }
    });
  }
  return elements;
}

function QABlock({ questions }) {
  const elements = [
    React.createElement(Text, { style: s.sectionTitle, key: 'title' }, 'Your Questions Answered'),
    React.createElement(View, { style: s.goldLine, key: 'line' }),
  ];
  if (Array.isArray(questions)) {
    questions.forEach((qa, i) => {
      elements.push(
        React.createElement(Text, { style: s.question, key: `q${i}` }, `Q: ${qa.question}`),
        React.createElement(Text, { style: s.answer, key: `a${i}` }, qa.answer),
      );
    });
  }
  return elements;
}

function ClosingPage({ bodyImage, product, threeLineSummary, practicalActions, closingMessage }) {
  const crossSell = product === 'saju'
    ? 'Curious about your compatibility? → borndecoded.com/compatibility.html'
    : 'Understand yourself deeper → borndecoded.com/saju.html';

  return React.createElement(Page, { size: 'A4', style: s.page },
    bodyImage && React.createElement(Image, { src: bodyImage, style: s.bgImage }),
    React.createElement(View, { style: s.closingPage },
      React.createElement(Text, { style: s.sectionTitle }, 'Your Survival Guide'),
      React.createElement(View, { style: s.goldLine }),
      ...(threeLineSummary || []).map((line, i) =>
        React.createElement(Text, { style: s.bulletItem, key: `s${i}` }, `✦ ${line}`)
      ),
      practicalActions && React.createElement(Text, { style: { ...s.body, marginTop: 16 } }, practicalActions),
      closingMessage && React.createElement(Text, { style: { ...s.body, marginTop: 16, fontFamily: 'GreatVibes', fontSize: 13, color: '#C9A96E' } }, closingMessage),
      React.createElement(View, { style: { ...s.goldLine, marginTop: 24 } }),
      React.createElement(Text, { style: s.ctaText }, crossSell),
      React.createElement(Text, { style: s.disclaimer },
        'For entertainment and self-reflection purposes only.\nborndecoded.com | borndecoded@gmail.com'
      ),
    )
  );
}

// ---- Main PDF Builder ----

/**
 * Generate PDF buffer for a Saju report
 */
export async function generateSajuPdf({ report, coverImageBuffer, bodyImageBuffer, name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  const sections = [
    { title: report.section2_essence?.title || 'Your Essence', data: report.section2_essence },
    { title: report.section3_realYou?.title || 'The Real You', data: report.section3_realYou },
    { title: report.section4_hiddenPower?.title || 'Hidden Power', data: report.section4_hiddenPower },
    { title: report.section5_careerMoney?.title || 'Career & Money', data: report.section5_careerMoney },
    { title: report.section6_loveMarriage?.title || 'Love & Marriage', data: report.section6_loveMarriage },
    { title: report.section7_familyFriends?.title || 'Family & Friends', data: report.section7_familyFriends },
  ];

  const doc = React.createElement(Document, {},
    // Cover
    React.createElement(CoverPage, { coverImage: coverSrc, name, birthDate, product: 'saju' }),

    // Section 1: Birth Chart
    React.createElement(BodyPage, { bodyImage: bodySrc, children: [
      React.createElement(Text, { style: s.sectionTitle, key: 'bc-t' }, 'Your Birth Chart'),
      React.createElement(View, { style: s.goldLine, key: 'bc-l' }),
      React.createElement(Text, { style: { ...s.body, fontFamily: 'GreatVibes', fontSize: 16, textAlign: 'center', marginBottom: 16, color: '#C9A96E' }, key: 'bc-m' },
        report.section1_birthChart?.dayMasterMetaphor || ''),
      React.createElement(Text, { style: s.body, key: 'bc-e' },
        report.section1_birthChart?.dayMasterExplanation || ''),
    ]}),

    // Sections 2-7
    ...sections.map((sec, i) =>
      React.createElement(BodyPage, { bodyImage: bodySrc, key: `sec${i}`, children:
        SectionBlock({ title: sec.title, paragraphs: sec.data })
      })
    ),

    // Section 8: Life Cycles
    React.createElement(BodyPage, { bodyImage: bodySrc, children: [
      React.createElement(Text, { style: s.sectionTitle, key: 'lc-t' }, 'Life Cycles'),
      React.createElement(View, { style: s.goldLine, key: 'lc-l' }),
      React.createElement(Text, { style: s.body, key: 'lc-gc' }, report.section8_lifeCycles?.grandCycleNarrative || ''),
      React.createElement(Text, { style: s.subTitle, key: 'lc-st' }, 'Current Cycle'),
      React.createElement(Text, { style: s.body, key: 'lc-cc' }, report.section8_lifeCycles?.currentCycleDeep || ''),
      ...(report.section8_lifeCycles?.decadeYearByYear || []).map((y, i) =>
        React.createElement(Text, { style: s.bodySmall, key: `yr${i}` },
          `${y.year}: ${y.oneLiner}`)
      ),
      React.createElement(Text, { style: s.subTitle, key: 'ty-t' }, 'This Year'),
      ...Object.entries(report.section8_lifeCycles?.thisYearDetail || {}).map(([k, v], i) =>
        React.createElement(Text, { style: s.body, key: `ty${i}` }, v)
      ),
    ]}),

    // Section 9: Q&A
    React.createElement(BodyPage, { bodyImage: bodySrc, children:
      QABlock({ questions: report.section9_questions })
    }),

    // Section 10: Survival Guide + Closing
    React.createElement(ClosingPage, {
      bodyImage: bodySrc,
      product: 'saju',
      threeLineSummary: report.section10_survivalGuide?.threeLineSummary,
      practicalActions: report.section10_survivalGuide?.practicalActions,
      closingMessage: report.section10_survivalGuide?.closingMessage,
    }),
  );

  return renderToBuffer(doc);
}

/**
 * Generate PDF buffer for a Compatibility report
 */
export async function generateCompatibilityPdf({ report, coverImageBuffer, bodyImageBuffer, person1Name, person2Name, birthDate }) {
  registerFonts();

  const coverSrc = coverImageBuffer ? { data: coverImageBuffer, format: 'png' } : null;
  const bodySrc = bodyImageBuffer ? { data: bodyImageBuffer, format: 'png' } : null;

  const sections = [
    { title: report.section2_firstSpark?.title || 'First Spark', data: report.section2_firstSpark },
    { title: report.section3_attraction?.title || 'What Pulls You Together', data: report.section3_attraction },
    { title: report.section4_minefield?.title || 'The Minefield', data: report.section4_minefield },
    { title: report.section5_dating?.title || 'Dating Energy', data: report.section5_dating },
    { title: report.section6_marriage?.title || 'Marriage Reality', data: report.section6_marriage },
    { title: report.section7_kidsFamily?.title || 'Kids & Family', data: report.section7_kidsFamily },
    { title: report.section8_mirror?.title || 'How You See Each Other', data: report.section8_mirror },
  ];

  const doc = React.createElement(Document, {},
    React.createElement(CoverPage, {
      coverImage: coverSrc,
      name: `${person1Name} & ${person2Name}`,
      birthDate,
      product: 'compatibility',
    }),

    // Section 1: Two Charts
    React.createElement(BodyPage, { bodyImage: bodySrc, children: [
      React.createElement(Text, { style: s.sectionTitle, key: 'tc-t' }, report.section1_twoCharts?.headline || 'Your Charts'),
      React.createElement(View, { style: s.goldLine, key: 'tc-l' }),
      React.createElement(Text, { style: s.body, key: 'tc-s' }, report.section1_twoCharts?.scoreJustification || ''),
    ]}),

    // Sections 2-8
    ...sections.map((sec, i) =>
      React.createElement(BodyPage, { bodyImage: bodySrc, key: `csec${i}`, children:
        SectionBlock({ title: sec.title, paragraphs: sec.data })
      })
    ),

    // Section 9: Q&A
    React.createElement(BodyPage, { bodyImage: bodySrc, children:
      QABlock({ questions: report.section9_questions })
    }),

    // Section 10: Couple's Survival Guide
    React.createElement(ClosingPage, {
      bodyImage: bodySrc,
      product: 'compatibility',
      threeLineSummary: report.section10_coupleGuide?.threeLineSummary,
      practicalActions: report.section10_coupleGuide?.practicalActions,
      closingMessage: report.section10_coupleGuide?.closingMessage,
    }),
  );

  return renderToBuffer(doc);
}

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
  Font.register({
    family: 'Symbol',
    src: 'https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTsg7yUXVnStjVRRfDdE0-I-Oy.ttf',
  });

  Font.registerHyphenationCallback(word => [word]);
  fontsRegistered = true;
}

// ---- Sanitize (with Korean→Romanized fallback) ----
const KR_ROMAN = {
  // Shinsal
  '역마살':'Yeokma-sal','도화살':'Dohwa-sal','화개살':'Hwagae-sal','백호살':'Baekho-sal',
  '귀문관살':'Gwimun-gwansal','현침살':'Hyeonchim-sal','홍염살':'Hongyeom-sal',
  '천라지망':'Cheolla-jimang','괴강살':'Goegang-sal','고란과숙':'Goran-gwasuk',
  '나체도화':'Nachae-dohwa','의처의부살':'Uicheo-uibu-sal','재고귀인':'Jaego-gwiin',
  '천을귀인':'Cheoneul-gwiin','문창귀인':'Munchang-gwiin','겁살':'Geop-sal','망신살':'Mangsin-sal',
  // Shortened forms (partial matches)
  '역마':'Yeokma','도화':'Dohwa','화개':'Hwagae','백호':'Baekho','귀문':'Gwimun',
  '현침':'Hyeonchim','홍염':'Hongyeom','천라':'Cheolla','괴강':'Goegang','고란':'Goran',
  '나체':'Nachae','의처':'Uicheo','재고':'Jaego','천을':'Cheoneul','문창':'Munchang','겁':'Geop','망신':'Mangsin',
  // Stems
  '갑':'Gap','을':'Eul','병':'Byeong','정':'Jeong','무':'Mu','기':'Gi','경':'Gyeong','신':'Sin','임':'Im','계':'Gye',
  // Branches
  '자':'Ja','축':'Chuk','인':'In','묘':'Myo','진':'Jin','사':'Sa','오':'O','미':'Mi','유':'Yu','술':'Sul','해':'Hae',
  // Elements
  '목':'Mok','화':'Hwa','토':'To','금':'Geum','수':'Su',
  // Relations
  '충':'Chung','형':'Hyeong','파':'Pa','해':'Hae','원진':'Wonjin','육합':'Yukhap','삼합':'Samhap',
  // Common terms
  '일간':'Day Master','일지':'Day Branch','월지':'Month Branch','년지':'Year Branch','시지':'Hour Branch',
  '대운':'Grand Cycle','세운':'Yearly Energy','신살':'Special Star',
};
// Sort by length descending so longer matches replace first
const KR_KEYS = Object.keys(KR_ROMAN).sort((a, b) => b.length - a.length);

// ---- Banned phrase auto-replacement (safety net for prompt leaks) ----
const BANNED_REPLACE = [
  [/superpower in disguise/gi, 'hidden advantage'],
  [/Let'?s be brutally honest/gi, 'No sugarcoating this —'],
  [/Let'?s be real/gi, 'No sugarcoating this —'],
  [/Here'?s where it gets messy/gi, 'This is where your chart gets interesting —'],
  [/not a bug,? it'?s a feature/gi, ''],
  [/like moths to (a )?flame/gi, ''],
  [/curse is actually your gift/gi, ''],
  [/not weakness\s*[-—]\s*it'?s strength/gi, ''],
  [/Avoid get-rich-quick schemes/gi, ''],
  [/trust the process/gi, ''],
  [/the universe has a plan/gi, ''],
  [/you are enough/gi, ''],
  [/embrace your authentic self/gi, ''],
  [/everything happens for a reason/gi, ''],
  [/Stop trying to (.+?) and start/gi, 'Consider shifting from $1 toward'],
  [/Your survival strategy depends on/gi, 'Your next move is'],
  // ---- Shinsal label auto-removal (English names) ----
  [/\s*\(Peach Blossom\)/gi, ''],
  [/\s*\(White Tiger\)/gi, ''],
  [/\s*\(Traveling Horse\)/gi, ''],
  [/\s*\(Ghost Gate\)/gi, ''],
  [/\s*\(Literary Star\)/gi, ''],
  [/\s*\(Heavenly Noble\)/gi, ''],
  [/\s*\(Lonely Phoenix\)/gi, ''],
  [/\s*\(Jealousy Star\)/gi, ''],
  [/\s*\(Unveiled Blossom\)/gi, ''],
  [/\s*\(Wealth Vault\)/gi, ''],
  [/\s*\(Canopy Star\)/gi, ''],
  [/\s*\(Suspended Needle\)/gi, ''],
  [/\s*\(Red Flame\)/gi, ''],
  [/\s*\(Heaven Net\)/gi, ''],
  [/\s*\(Fearsome Star\)/gi, ''],
  [/\s*\(Robbery Star\)/gi, ''],
  [/\s*\(Reputation Star\)/gi, ''],
  [/\s*\(Eating God\)/gi, ''],
  [/\s*\(Hurting Officer\)/gi, ''],
  [/\s*\(Seven Killings\)/gi, ''],
  [/\s*\(Direct Seal\)/gi, ''],
  [/\s*\(Direct Wealth\)/gi, ''],
  // Romanized Korean catch-all pattern
  [/\s*\([A-Z][a-z]+-(?:sal|gwiin|gwansal|dohwa|gwasuk)\)/gi, ''],
  // ---- Cultural sensitivity — Western couples ----
  [/separate bedrooms?/gi, 'personal recharging spaces'],
  [/separate cars?/gi, 'your own arrival rhythm'],
  [/sleep in different rooms?/gi, 'create personal wind-down spaces'],
  [/take a break from each other/gi, 'schedule individual recharging time'],
  [/spend time apart/gi, 'enjoy intentional solo adventures'],
  // ---- Terminology — spouse palace clash ----
  [/spouse palace clash/gi, 'day branch tension'],
  [/spouse palace conflict/gi, 'day branch tension'],
];

let _cleanCjkCount = 0;
function getCleanCjkCount() { return _cleanCjkCount; }

function clean(text) {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  // Step 1: Replace known Korean terms with romanized equivalents
  for (const kr of KR_KEYS) {
    if (text.includes(kr)) text = text.split(kr).join(KR_ROMAN[kr]);
  }
  // Step 2: Remove any remaining CJK characters (safety net) and count them
  text = text.replace(/[\u3000-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, (m) => { _cleanCjkCount++; return ''; });
  // Step 3: Auto-replace banned phrases
  for (const [pattern, replacement] of BANNED_REPLACE) {
    text = text.replace(pattern, replacement);
  }
  // Step 4: Clean up curly quotes, empty parentheses, double spaces
  text = text.replace(/[\u2018\u2019\u201C\u201D]/g, '');
  text = text.replace(/\(\s*\)/g, '');
  text = text.replace(/\s{2,}/g, ' ');
  return text.trim();
}

export { getCleanCjkCount };

// Strip romanized Korean prefix from Day Master labels
// e.g. "Gyeong (Yang Metal)" → "Yang Metal", "Gye (Yin Water)" → "Yin Water"
function stripRomanized(text) {
  if (!text) return '';
  return text.replace(/^[A-Za-z]+\s*\(\s*/i, '').replace(/\s*\)\s*$/, '');
}

// ---- Colors ----
const GOLD = '#C9A96E';
const BROWN = '#3C322D';
const MUTED = '#6B5E53';
const IVORY = '#F5EDE4';

// ---- Page size: 6×9 in (432×648pt) for mobile-friendly reading ----
const PW = 432;
const PH = 648;

// ---- Margins (proportionally scaled from A4 original) ----
const M = { top: 47, right: 45, bottom: 44, left: 45 };

const s = StyleSheet.create({
  page: { width: PW, height: PH, position: 'relative' },
  // Page with padding — applied to ALL auto-generated pages in wrap mode
  pageBody: {
    width: PW, height: PH, position: 'relative', backgroundColor: IVORY,
    paddingTop: M.top, paddingRight: M.right, paddingBottom: M.bottom, paddingLeft: M.left,
  },
  bgFull: { position: 'absolute', top: 0, left: 0, width: PW, height: PH },
  body: { flex: 1 },

  // Cover overlay text at bottom
  coverOverlay: {
    position: 'absolute', bottom: 36, left: 44, right: 44,
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
  disclaimer: { fontFamily: 'Body', fontSize: 8, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 1.4 },
});

// ---- Helpers ----
function sectionParagraphs(data) {
  if (!data) return [];
  if (typeof data === 'string') return [data];
  return Object.entries(data).filter(([k, v]) => typeof v === 'string' && k !== 'title').map(([, v]) => v);
}

const el = React.createElement;

// ---- Cover (full-bleed image + name tagline at bottom) ----
function CoverPage({ coverImage, name }) {
  return el(Page, { size: [PW, PH], style: s.page },
    coverImage && el(Image, { src: coverImage, style: s.bgFull }),
    name && el(Text, {
      style: {
        position: 'absolute', bottom: 70, left: 40, right: 40,
        fontFamily: 'Script', fontSize: 14, color: GOLD,
        textAlign: 'center',
      },
    }, `${clean(name)}, your birth — decoded into art.`),
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
  const qas = Array.isArray(questions) ? questions : [];
  const elements = [];
  elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));

  // Title + first Q&A together so they never split across pages
  const titleGroup = [
    el(Text, { style: s.sectionTitle, key: 'tit' }, 'Your Questions Answered'),
    el(View, { style: s.goldLine, key: 'gl' }),
  ];
  if (qas[0]) {
    titleGroup.push(el(Text, { style: s.question, key: 'q0' }, clean(`Q: ${qas[0].question}`)));
    titleGroup.push(el(Text, { style: s.answer, key: 'a0' }, clean(qas[0].answer)));
  }
  elements.push(el(View, { wrap: false, key: 'tg' }, ...titleGroup));

  // Remaining Q&As flow naturally (no wrap:false, no forced page break)
  for (let i = 1; i < qas.length; i++) {
    elements.push(el(Text, { style: s.question, key: `q${i}` }, clean(`Q: ${qas[i].question}`)));
    elements.push(el(Text, { style: s.answer, key: `a${i}` }, clean(qas[i].answer)));
  }
  return el(View, {}, ...elements);
}

// ---- Survival Guide (inline in body flow) ----
function SurvivalGuideBlock({ data }) {
  if (!data) return el(View, {});
  const elements = [];
  elements.push(el(View, { style: s.sectionSpacer, key: 'sp' }));
  elements.push(el(View, { wrap: false, key: 'tg' },
    el(Text, { style: s.sectionTitle }, 'Your Survival Guide'),
    el(View, { style: s.goldLine }),
    ...(data.threeLineSummary || []).map((line, i) =>
      el(Text, { style: s.bullet, key: `b${i}` }, clean(`* ${line}`))
    ),
  ));
  if (data.practicalActions) {
    elements.push(el(Text, { style: { ...s.text, marginTop: 8 }, key: 'pa' }, clean(data.practicalActions)));
  }
  return el(View, {}, ...elements);
}

// ---- Saju Card — shareable last page ----
function SajuCard({ name, dayMaster, metaphor, coverImage }) {
  return el(Page, { size: [PW, PH], style: { ...s.pageBody, justifyContent: 'center', alignItems: 'center' } },
    coverImage && el(Image, { src: coverImage, style: { width: 180, height: 180, marginBottom: 20, borderRadius: 8 } }),
    el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 160, marginBottom: 18 } }),
    el(Text, { style: { fontFamily: 'BodyBold', fontSize: 18, color: BROWN, textAlign: 'center', marginBottom: 4 } }, clean(name)),
    dayMaster && el(Text, { style: { fontFamily: 'Body', fontSize: 13, color: GOLD, textAlign: 'center', marginBottom: 16 } },
      el(Text, { style: { fontFamily: 'Symbol' } }, '\u2726'),
      ` ${clean(stripRomanized(dayMaster))} `,
      el(Text, { style: { fontFamily: 'Symbol' } }, '\u2726'),
    ),
    metaphor && el(Text, { style: { fontFamily: 'Script', fontSize: 20, color: GOLD, textAlign: 'center', lineHeight: 1.6, paddingHorizontal: 40, marginBottom: 20 } }, `"${clean(metaphor)}"`),
    el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 160, marginBottom: 18 } }),
    el(Text, { style: { fontFamily: 'Body', fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 2 } }, 'borndecoded.com'),
    el(Text, { style: { fontFamily: 'Body', fontSize: 10, color: MUTED, textAlign: 'center' } }, '@borndecoded'),
  );
}

function CompatibilityCard({ person1Name, person2Name, score, gradeName, metaphor, coverImage }) {
  return el(Page, { size: [PW, PH], style: { ...s.pageBody, justifyContent: 'center', alignItems: 'center' } },
    coverImage && el(Image, { src: coverImage, style: { width: 180, height: 180, marginBottom: 20, borderRadius: 8 } }),
    el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 160, marginBottom: 18 } }),
    el(Text, { style: { fontFamily: 'BodyBold', fontSize: 18, color: BROWN, textAlign: 'center', marginBottom: 4 } }, `${clean(person1Name)} & ${clean(person2Name)}`),
    el(Text, { style: { fontFamily: 'Body', fontSize: 14, color: GOLD, textAlign: 'center', marginBottom: 4 } }, `Score: ${score}`),
    gradeName && el(Text, { style: { fontFamily: 'Body', fontSize: 13, color: GOLD, textAlign: 'center', marginBottom: 16 } },
      el(Text, { style: { fontFamily: 'Symbol' } }, '\u2726'),
      ` ${clean(gradeName)} `,
      el(Text, { style: { fontFamily: 'Symbol' } }, '\u2726'),
    ),
    metaphor && el(Text, { style: { fontFamily: 'Script', fontSize: 20, color: GOLD, textAlign: 'center', lineHeight: 1.6, paddingHorizontal: 40, marginBottom: 20 } }, `"${clean(metaphor)}"`),
    el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 160, marginBottom: 18 } }),
    el(Text, { style: { fontFamily: 'Body', fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 2 } }, 'borndecoded.com'),
    el(Text, { style: { fontFamily: 'Body', fontSize: 10, color: MUTED, textAlign: 'center' } }, '@borndecoded'),
  );
}

// ---- Final Page: closing message + disclaimer only ----
function FinalPage({ closingMessage }) {
  return el(Page, { size: [PW, PH], style: { ...s.pageBody, justifyContent: 'center', alignItems: 'center' } },
    closingMessage && el(Text, {
      style: { fontFamily: 'Body', fontSize: 14, color: GOLD, textAlign: 'center', lineHeight: 1.8, paddingHorizontal: 20, marginBottom: 24 },
    }, clean(closingMessage)),
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
    // p.1: Cover (full-bleed image + name tagline)
    el(CoverPage, { coverImage: coverSrc, name }),

    // p.2: Intro page (BORN DECODED + name + date + Day Master only)
    el(Page, { size: [PW, PH], style: s.pageBody },
      el(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
        el(Text, { style: { fontFamily: 'BodyBold', fontSize: 20, color: GOLD, letterSpacing: 2, marginBottom: 4 } }, 'BORN DECODED'),
        el(Text, { style: { fontFamily: 'Body', fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 16 } }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 180, marginBottom: 16 } }),
        el(Text, { style: { fontFamily: 'Body', fontSize: 13, color: MUTED, marginBottom: 20 } }, 'Personal Saju Reading'),
        el(Text, { style: { fontFamily: 'Script', fontSize: 28, color: BROWN, marginBottom: 4 } }, clean(name)),
        el(Text, { style: { fontFamily: 'Body', fontSize: 12, color: MUTED, marginBottom: 24 } }, clean(birthDate)),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.25, width: 120, marginBottom: 14 } }),
        el(Text, { style: { fontFamily: 'Body', fontSize: 9, color: MUTED, lineHeight: 1.5, textAlign: 'center', paddingHorizontal: 20, marginBottom: 14 } },
          'Saju (Four Pillars) maps the energy at the exact moment you were born \u2014 a personal blueprint of Wood, Fire, Earth, Metal, and Water that shapes who you are.'
        ),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.25, width: 120, marginBottom: 14 } }),
        dayMasterExpl && el(Text, { style: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, textAlign: 'center', paddingHorizontal: 30 } }, clean(dayMasterExpl)),
      ),
    ),

    // p.3+: Body (continuous flow — starts with metaphor title)
    el(Page, { size: [PW, PH], style: s.pageBody, wrap: true },
      el(View, { style: s.body },

        // S2: Essence (section title is the metaphor — no separate metaphorText)
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
        el(SurvivalGuideBlock, { key: 's10', data: report.section10_survivalGuide }),
      ),
    ),

    // Final page: closing message + disclaimer only
    el(FinalPage, { key: 'final', closingMessage: report.section10_survivalGuide?.closingMessage }),

    // Saju Card — shareable page
    el(SajuCard, {
      key: 'card',
      name,
      dayMaster: report.section1_birthChart?.dayMasterExplanation?.match(/you're a ([^—–\n]+)/i)?.[1]?.trim() || '',
      metaphor: report.coverArt?.metaphor || '',
      coverImage: coverSrc,
    }),
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

  const compatName = `${person1Name} & ${person2Name}`;
  const compatMetaphor = report.section1_twoCharts?.headline || '';
  const compatIntro = report.section1_twoCharts?.scoreJustification || '';

  const doc = el(Document, {},
    el(CoverPage, { coverImage: coverSrc, name: compatName }),

    // p.2: Intro page
    el(Page, { size: [PW, PH], style: s.pageBody },
      el(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
        el(Text, { style: { fontFamily: 'BodyBold', fontSize: 20, color: GOLD, letterSpacing: 2, marginBottom: 4 } }, 'BORN DECODED'),
        el(Text, { style: { fontFamily: 'Body', fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 16 } }, 'YOUR BIRTH WAS CODED. WE DECODE IT.'),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.4, width: 180, marginBottom: 16 } }),
        el(Text, { style: { fontFamily: 'Body', fontSize: 13, color: MUTED, marginBottom: 20 } }, 'Compatibility Reading'),
        el(Text, { style: { fontFamily: 'Script', fontSize: 26, color: BROWN, marginBottom: 4 } }, clean(compatName)),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.25, width: 120, marginBottom: 14 } }),
        el(Text, { style: { fontFamily: 'Body', fontSize: 9, color: MUTED, lineHeight: 1.5, textAlign: 'center', paddingHorizontal: 20, marginBottom: 14 } },
          'Saju (Four Pillars) reveals how two people\u2019s birth energies interact \u2014 where they harmonize, where they create tension, and why they can\u2019t stay away from each other.'
        ),
        el(View, { style: { height: 1, backgroundColor: GOLD, opacity: 0.25, width: 120, marginBottom: 14 } }),
        compatIntro && el(Text, { style: { fontFamily: 'Body', fontSize: 12, color: BROWN, lineHeight: 1.65, textAlign: 'center', paddingHorizontal: 30 } }, clean(compatIntro)),
      ),
    ),

    // p.3+: Body
    el(Page, { size: [PW, PH], style: s.pageBody, wrap: true },
      el(View, { style: s.body },
        ...sectionMap.map(([key, fallback], i) =>
          el(SectionBlock, {
            key: `c${i + 2}`, isFirst: i === 0,
            title: report[key]?.title || fallback,
            paragraphs: sectionParagraphs(report[key]),
          })
        ),
        el(QABlock, { key: 'c9', questions: report.section9_questions }),
        el(SurvivalGuideBlock, { key: 'c10', data: report.section10_coupleGuide }),
      ),
    ),

    // Final page: closing message + disclaimer only
    el(FinalPage, { key: 'final', closingMessage: report.section10_coupleGuide?.closingMessage }),

    // Compatibility Card — shareable page
    el(CompatibilityCard, {
      key: 'card',
      person1Name,
      person2Name,
      score: report.section1_twoCharts?.scoreJustification?.match(/scored\s+(\d+)/i)?.[1] || '',
      gradeName: report.section1_twoCharts?.headline || '',
      metaphor: report.coverArt?.metaphor || '',
      coverImage: coverSrc,
    }),
  );

  return renderToBuffer(doc);
}

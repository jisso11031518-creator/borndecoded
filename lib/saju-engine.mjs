/**
 * Born Decoded - Saju Engine Module v2.0
 * 
 * manseryeok-js 위에 오행 분포, 십신, 일간 강약, 대운, 세운,
 * 지장간, 12운성, 신살, 형충파해, 궁합, 월운을 계산하는 엔진.
 */

import {
  calculateSaju,
  calculateSajuSimple,
  solarToLunar,
  getPillarByHangul,
  getPillarById,
  SIXTY_PILLARS,
  getSolarTermsByYear,
} from '@fullstackfamily/manseryeok';

import {
  getJijanggan,
  getTwelveStage,
  calculateShinsal,
  analyzeAllBranchRelations,
  analyzeTianganHops,
  calculateCompatibility,
  calculateMonthlyEnergy,
} from './saju-advanced.mjs';

// ============================================================
// 1. 기초 데이터 테이블
// ============================================================

/** 천간 (Heavenly Stems) */
const TIANGAN = [
  { id: 0, hangul: '갑', hanja: '甲', english: 'Jia',  element: '목', yinYang: '양' },
  { id: 1, hangul: '을', hanja: '乙', english: 'Yi',   element: '목', yinYang: '음' },
  { id: 2, hangul: '병', hanja: '丙', english: 'Bing', element: '화', yinYang: '양' },
  { id: 3, hangul: '정', hanja: '丁', english: 'Ding', element: '화', yinYang: '음' },
  { id: 4, hangul: '무', hanja: '戊', english: 'Wu',   element: '토', yinYang: '양' },
  { id: 5, hangul: '기', hanja: '己', english: 'Ji',   element: '토', yinYang: '음' },
  { id: 6, hangul: '경', hanja: '庚', english: 'Geng', element: '금', yinYang: '양' },
  { id: 7, hangul: '신', hanja: '辛', english: 'Xin',  element: '금', yinYang: '음' },
  { id: 8, hangul: '임', hanja: '壬', english: 'Ren',  element: '수', yinYang: '양' },
  { id: 9, hangul: '계', hanja: '癸', english: 'Gui',  element: '수', yinYang: '음' },
];

/** 지지 (Earthly Branches) */
const DIZHI = [
  { id: 0,  hangul: '자', hanja: '子', english: 'Zi',   element: '수', yinYang: '양', animal: 'Rat',     animalKr: '쥐',      timeRange: '23:00-01:00' },
  { id: 1,  hangul: '축', hanja: '丑', english: 'Chou', element: '토', yinYang: '음', animal: 'Ox',      animalKr: '소',      timeRange: '01:00-03:00' },
  { id: 2,  hangul: '인', hanja: '寅', english: 'Yin',  element: '목', yinYang: '양', animal: 'Tiger',   animalKr: '호랑이',  timeRange: '03:00-05:00' },
  { id: 3,  hangul: '묘', hanja: '卯', english: 'Mao',  element: '목', yinYang: '음', animal: 'Rabbit',  animalKr: '토끼',    timeRange: '05:00-07:00' },
  { id: 4,  hangul: '진', hanja: '辰', english: 'Chen', element: '토', yinYang: '양', animal: 'Dragon',  animalKr: '용',      timeRange: '07:00-09:00' },
  { id: 5,  hangul: '사', hanja: '巳', english: 'Si',   element: '화', yinYang: '음', animal: 'Snake',   animalKr: '뱀',      timeRange: '09:00-11:00' },
  { id: 6,  hangul: '오', hanja: '午', english: 'Wu',   element: '화', yinYang: '양', animal: 'Horse',   animalKr: '말',      timeRange: '11:00-13:00' },
  { id: 7,  hangul: '미', hanja: '未', english: 'Wei',  element: '토', yinYang: '음', animal: 'Goat',    animalKr: '양',      timeRange: '13:00-15:00' },
  { id: 8,  hangul: '신', hanja: '申', english: 'Shen', element: '금', yinYang: '양', animal: 'Monkey',  animalKr: '원숭이',  timeRange: '15:00-17:00' },
  { id: 9,  hangul: '유', hanja: '酉', english: 'You',  element: '금', yinYang: '음', animal: 'Rooster', animalKr: '닭',      timeRange: '17:00-19:00' },
  { id: 10, hangul: '술', hanja: '戌', english: 'Xu',   element: '토', yinYang: '양', animal: 'Dog',     animalKr: '개',      timeRange: '19:00-21:00' },
  { id: 11, hangul: '해', hanja: '亥', english: 'Hai',  element: '수', yinYang: '음', animal: 'Pig',     animalKr: '돼지',    timeRange: '21:00-23:00' },
];

/** 오행 영어 매핑 */
const ELEMENT_EN = { '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water' };

/** 음양 영어 매핑 */
const YINYANG_EN = { '양': 'Yang', '음': 'Yin' };

// ============================================================
// 2. 십신(十神) 계산
// ============================================================

/**
 * 십신 관계 매트릭스
 * 행: 일간의 오행 인덱스 (목=0, 화=1, 토=2, 금=3, 수=4)
 * 열: 대상의 오행 인덱스
 * 값: [동음양일 때, 이음양일 때]
 */
const ELEMENT_ORDER = ['목', '화', '토', '금', '수'];

/**
 * 십신(Ten Gods) 계산
 * @param {string} dayMasterElement - 일간 오행
 * @param {string} dayMasterYinYang - 일간 음양
 * @param {string} targetElement - 대상 오행
 * @param {string} targetYinYang - 대상 음양
 * @returns {{ korean: string, english: string, category: string }}
 */
function calculateTenGod(dayMasterElement, dayMasterYinYang, targetElement, targetYinYang) {
  const meIdx = ELEMENT_ORDER.indexOf(dayMasterElement);
  const targetIdx = ELEMENT_ORDER.indexOf(targetElement);
  const samePolarity = dayMasterYinYang === targetYinYang;

  // 오행 관계: 나와의 상생상극 관계
  const diff = ((targetIdx - meIdx) + 5) % 5;

  // diff: 0=같은오행, 1=내가생(식상), 2=내가극(재성), 3=나를극(관성), 4=나를생(인성)
  const TEN_GODS = {
    0: samePolarity
      ? { korean: '비견', english: 'Companion (Bi-Jian)', category: 'peer' }
      : { korean: '겁재', english: 'Rob Wealth (Jie-Cai)', category: 'peer' },
    1: samePolarity
      ? { korean: '식신', english: 'Eating God (Shi-Shen)', category: 'output' }
      : { korean: '상관', english: 'Hurting Officer (Shang-Guan)', category: 'output' },
    2: samePolarity
      ? { korean: '편재', english: 'Indirect Wealth (Pian-Cai)', category: 'wealth' }
      : { korean: '정재', english: 'Direct Wealth (Zheng-Cai)', category: 'wealth' },
    3: samePolarity
      ? { korean: '편관', english: 'Seven Killings (Qi-Sha)', category: 'power' }
      : { korean: '정관', english: 'Direct Officer (Zheng-Guan)', category: 'power' },
    4: samePolarity
      ? { korean: '편인', english: 'Indirect Seal (Pian-Yin)', category: 'resource' }
      : { korean: '정인', english: 'Direct Seal (Zheng-Yin)', category: 'resource' },
  };

  return TEN_GODS[diff];
}

// ============================================================
// 3. 천간/지지 ID 추출 헬퍼
// ============================================================

function getTianganById(id) { return TIANGAN[id]; }
function getDizhiById(id) { return DIZHI[id]; }

function getTianganByHangul(hangul) {
  return TIANGAN.find(t => t.hangul === hangul);
}

function getDizhiByHangul(hangul) {
  return DIZHI.find(d => d.hangul === hangul);
}

/**
 * "경오" 같은 2글자 기둥에서 천간/지지 분리
 */
function parsePillar(pillarHangul) {
  if (!pillarHangul || pillarHangul.length < 2) return null;
  const tg = getTianganByHangul(pillarHangul[0]);
  const dz = getDizhiByHangul(pillarHangul[1]);
  return { tiangan: tg, dizhi: dz };
}

// ============================================================
// 4. 오행 분포 계산
// ============================================================

function calculateElementDistribution(pillars) {
  const counts = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  for (const p of pillars) {
    if (!p) continue;
    const parsed = parsePillar(p);
    if (!parsed) continue;
    if (parsed.tiangan) counts[parsed.tiangan.element]++;
    if (parsed.dizhi) counts[parsed.dizhi.element]++;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    counts,
    percentages: {
      '목': Math.round((counts['목'] / total) * 100),
      '화': Math.round((counts['화'] / total) * 100),
      '토': Math.round((counts['토'] / total) * 100),
      '금': Math.round((counts['금'] / total) * 100),
      '수': Math.round((counts['수'] / total) * 100),
    },
    dominant: Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
    missing: Object.entries(counts).filter(([, v]) => v === 0).map(([k]) => k),
    english: Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [ELEMENT_EN[k], { count: v, percent: Math.round((v / total) * 100) }])
    ),
  };
}

// ============================================================
// 5. 십신 관계 전체 분석
// ============================================================

function analyzeTenGods(dayMasterPillar, pillars) {
  const dm = parsePillar(dayMasterPillar);
  if (!dm) return null;

  const dayElement = dm.tiangan.element;
  const dayYinYang = dm.tiangan.yinYang;

  const results = [];

  for (const [label, pillarHangul] of pillars) {
    if (!pillarHangul) continue;
    const parsed = parsePillar(pillarHangul);
    if (!parsed) continue;

    // 천간 십신
    const tgGod = calculateTenGod(dayElement, dayYinYang, parsed.tiangan.element, parsed.tiangan.yinYang);
    results.push({
      position: label,
      type: 'tiangan',
      character: parsed.tiangan.hangul,
      hanja: parsed.tiangan.hanja,
      element: parsed.tiangan.element,
      elementEn: ELEMENT_EN[parsed.tiangan.element],
      tenGod: tgGod,
    });

    // 지지 십신
    const dzGod = calculateTenGod(dayElement, dayYinYang, parsed.dizhi.element, parsed.dizhi.yinYang);
    results.push({
      position: label,
      type: 'dizhi',
      character: parsed.dizhi.hangul,
      hanja: parsed.dizhi.hanja,
      element: parsed.dizhi.element,
      elementEn: ELEMENT_EN[parsed.dizhi.element],
      tenGod: dzGod,
    });
  }

  return results;
}

// ============================================================
// 6. 일간(Day Master) 강약 분석
// ============================================================

function analyzeDayMasterStrength(dayMasterPillar, elementDist, tenGodResults) {
  const dm = parsePillar(dayMasterPillar);
  if (!dm) return null;

  const myElement = dm.tiangan.element;

  // 나를 생해주는(인성) + 같은 오행(비견/겁재) 카운트
  const generatingElement = {
    '목': '수', '화': '목', '토': '화', '금': '토', '수': '금'
  }[myElement];

  const supportCount = elementDist.counts[myElement] + elementDist.counts[generatingElement];
  const totalChars = Object.values(elementDist.counts).reduce((a, b) => a + b, 0);
  const supportRatio = supportCount / totalChars;

  // 월지(월주 지지)의 오행이 일간을 생하거나 같으면 득령
  // 이건 간단 판정 — 정밀 판정은 프롬프트에서 Claude가 보완

  let strength, strengthEn, description, descriptionEn;

  if (supportRatio >= 0.5) {
    strength = '신강';
    strengthEn = 'Strong';
    description = '일간의 힘이 강합니다. 자기 주장이 뚜렷하고 독립적입니다.';
    descriptionEn = 'Your Day Master is strong. You are self-assured, independent, and naturally take the lead.';
  } else if (supportRatio >= 0.3) {
    strength = '중화';
    strengthEn = 'Balanced';
    description = '일간의 힘이 균형잡혀 있습니다. 유연하고 적응력이 좋습니다.';
    descriptionEn = 'Your Day Master is balanced. You are flexible, adaptable, and harmonious.';
  } else {
    strength = '신약';
    strengthEn = 'Weak';
    description = '일간의 힘이 약합니다. 협력과 지원을 통해 빛나는 타입입니다.';
    descriptionEn = 'Your Day Master is gentle. You shine through collaboration and support from others.';
  }

  return {
    dayMaster: {
      tiangan: dm.tiangan,
      dizhi: dm.dizhi,
      element: myElement,
      elementEn: ELEMENT_EN[myElement],
      yinYang: dm.tiangan.yinYang,
      yinYangEn: YINYANG_EN[dm.tiangan.yinYang],
    },
    strength,
    strengthEn,
    supportRatio: Math.round(supportRatio * 100),
    description,
    descriptionEn,
    favorableElements: supportRatio < 0.4
      ? [myElement, generatingElement].map(e => ({ korean: e, english: ELEMENT_EN[e] }))
      : Object.keys(elementDist.counts).filter(e => e !== myElement && e !== generatingElement).map(e => ({ korean: e, english: ELEMENT_EN[e] })),
  };
}

// ============================================================
// 7. 대운(Grand Cycle) 계산
// ============================================================

/**
 * 대운 계산
 * @param {string} yearPillar - 년주 한글 (예: "경오")
 * @param {string} monthPillar - 월주 한글 (예: "신사")
 * @param {string} gender - 'male' | 'female'
 * @param {number} birthYear - 출생 양력 연도
 * @param {number} birthMonth - 출생 양력 월
 * @param {number} birthDay - 출생 양력 일
 */
function calculateGrandCycle(yearPillar, monthPillar, gender, birthYear, birthMonth, birthDay) {
  const yearTg = getTianganByHangul(yearPillar[0]);
  if (!yearTg) return null;

  // 순행/역행 결정: 양남음녀 = 순행, 음남양녀 = 역행
  // non-binary는 양년생=순행, 음년생=역행 (중립 기본값)
  const yearYinYang = yearTg.yinYang;
  const forward = gender === 'non-binary'
    ? yearYinYang === '양'
    : (yearYinYang === '양' && gender === 'male') ||
      (yearYinYang === '음' && gender === 'female');

  // 월주의 60갑자 ID 찾기
  const monthPillarData = getPillarByHangul(monthPillar);
  if (!monthPillarData) return null;

  let currentPillarId = monthPillarData.id;

  // 대운 시작 나이 계산 (간략 버전: 보통 2~8세)
  // 정밀 계산: 출생일에서 다음/이전 절기까지 일수 ÷ 3 = 대운 시작 나이
  // 여기서는 절기 데이터로 계산 시도, 실패 시 기본값 사용
  let startAge = 4; // 기본값 (절기 계산 실패 시 폴백)
  let startAgeEstimated = true; // 정밀 계산 여부 추적

  try {
    const terms = getSolarTermsByYear(birthYear);
    if (terms && terms.length > 0) {
      // 절기(節氣)만 필터 (중기 제외) - 월주가 바뀌는 기준
      // 24절기에서 절기(節氣)는 even index: 소한=0, 입춘=2, 경칩=4, 청명=6...
      // 중기(中氣)는 odd index: 대한=1, 우수=3, 춘분=5, 곡우=7...
      // 대운 시작나이 계산에는 절기(節)만 사용 (월주 전환 기준)
      const jeolgi = terms.filter((_, i) => i % 2 === 0);

      const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

      if (forward) {
        // 순행: 출생일 이후 가장 가까운 절기
        const nextTerm = jeolgi.find(t => {
          const termDate = new Date(birthYear, t.month - 1, t.day);
          return termDate > birthDate;
        });
        if (nextTerm) {
          const termDate = new Date(birthYear, nextTerm.month - 1, nextTerm.day);
          const diffDays = Math.round((termDate - birthDate) / (1000 * 60 * 60 * 24));
          startAge = Math.max(1, Math.round(diffDays / 3));
          startAgeEstimated = false;
        }
      } else {
        // 역행: 출생일 이전 가장 가까운 절기
        const prevTerms = jeolgi.filter(t => {
          const termDate = new Date(birthYear, t.month - 1, t.day);
          return termDate < birthDate;
        });
        if (prevTerms.length > 0) {
          const prevTerm = prevTerms[prevTerms.length - 1];
          const termDate = new Date(birthYear, prevTerm.month - 1, prevTerm.day);
          const diffDays = Math.round((birthDate - termDate) / (1000 * 60 * 60 * 24));
          startAge = Math.max(1, Math.round(diffDays / 3));
          startAgeEstimated = false;
        }
      }
    }
  } catch (e) {
    // 절기 데이터 없으면 기본값 사용
  }

  // 대운 10개 생성 (10년 × 10 = 100년분)
  const cycles = [];
  for (let i = 0; i < 10; i++) {
    if (forward) {
      currentPillarId = (monthPillarData.id + 1 + i) % 60;
    } else {
      currentPillarId = ((monthPillarData.id - 1 - i) % 60 + 60) % 60;
    }

    const pillar = getPillarById(currentPillarId);
    const age = startAge + (i * 10);
    const calendarYear = birthYear + age;

    cycles.push({
      order: i + 1,
      startAge: age,
      endAge: age + 9,
      calendarYearStart: calendarYear,
      calendarYearEnd: calendarYear + 9,
      pillar: {
        hangul: pillar.combined.hangul,
        hanja: pillar.combined.hanja,
        romanization: pillar.combined.romanization,
      },
      tiangan: {
        hangul: pillar.tiangan.hangul,
        hanja: pillar.tiangan.hanja,
        element: pillar.tiangan.element,
        elementEn: ELEMENT_EN[pillar.tiangan.element],
      },
      dizhi: {
        hangul: pillar.dizhi.hangul,
        hanja: pillar.dizhi.hanja,
        element: pillar.dizhi.element,
        elementEn: ELEMENT_EN[pillar.dizhi.element],
        animal: pillar.dizhi.animal,
      },
      isCurrent: false, // 아래에서 설정
    });
  }

  // 현재 대운 표시
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;
  for (const cycle of cycles) {
    if (currentAge >= cycle.startAge && currentAge <= cycle.endAge) {
      cycle.isCurrent = true;
      break;
    }
  }

  return {
    direction: forward ? '순행' : '역행',
    directionEn: forward ? 'Forward' : 'Reverse',
    startAge,
    startAgeEstimated,
    cycles,
  };
}

// ============================================================
// 8. 세운(Yearly Energy) 계산
// ============================================================

function calculateYearlyEnergy(targetYear, dayMasterPillar) {
  const dm = parsePillar(dayMasterPillar);
  if (!dm) return null;

  // 년주 계산: (년도 - 4) % 60 = 60갑자 인덱스
  const pillarId = ((targetYear - 4) % 60 + 60) % 60;
  const pillar = getPillarById(pillarId);

  // 세운과 일간의 십신 관계
  const tgGod = calculateTenGod(
    dm.tiangan.element, dm.tiangan.yinYang,
    TIANGAN[pillar.tiangan.id].element, TIANGAN[pillar.tiangan.id].yinYang
  );
  const dzGod = calculateTenGod(
    dm.tiangan.element, dm.tiangan.yinYang,
    DIZHI[pillar.dizhi.id].element, DIZHI[pillar.dizhi.id].yinYang
  );

  return {
    year: targetYear,
    pillar: {
      hangul: pillar.combined.hangul,
      hanja: pillar.combined.hanja,
      romanization: pillar.combined.romanization,
    },
    tiangan: {
      hangul: pillar.tiangan.hangul,
      hanja: pillar.tiangan.hanja,
      element: pillar.tiangan.element,
      elementEn: ELEMENT_EN[pillar.tiangan.element],
      tenGod: tgGod,
    },
    dizhi: {
      hangul: pillar.dizhi.hangul,
      hanja: pillar.dizhi.hanja,
      element: pillar.dizhi.element,
      elementEn: ELEMENT_EN[pillar.dizhi.element],
      animal: pillar.dizhi.animal,
      tenGod: dzGod,
    },
  };
}

// ============================================================
// 9. 해외 DST 보정
// ============================================================

// ============================================================
// 9-A. 균시차(Equation of Time) 계산
// ============================================================

/**
 * 균시차(Equation of Time) 계산
 * 지구 공전 궤도의 이심률 + 자전축 기울기로 인한 시간 보정.
 * 최대 ±16분까지 차이 발생 → 시주 경계에서 결정적.
 *
 * Spencer 공식 사용 (정확도 ±0.5분)
 *
 * @param {number} year
 * @param {number} month - 1~12
 * @param {number} day
 * @returns {number} 균시차 (분). 양수 = 진태양이 평균태양보다 빠름 (시계보다 빠름)
 */
function getEquationOfTime(year, month, day) {
  // Day of year
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let N = day;
  for (let i = 1; i < month; i++) N += daysInMonth[i];

  // B in radians
  const B = (2 * Math.PI / 365) * (N - 81);

  // Equation of Time (minutes)
  // Spencer formula: 결과를 부호 반전하여 양수 = 진태양이 평균보다 빠름 (해시계 앞섬)
  const EoT = -(9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B));

  return Math.round(EoT * 10) / 10;
}

// ============================================================
// 9-B. 주요 도시 경도/타임존 매핑 (Geocoding 폴백용)
// ============================================================

/**
 * 주요 도시 → 경도/타임존 매핑
 * 실제 서비스에서는 Google Geocoding API 사용.
 * 이 테이블은 API 실패 시 폴백 + 테스트용.
 */
const CITY_DATABASE = {
  // US
  'new york':     { longitude: -74.006, timezone: 'America/New_York' },
  'los angeles':  { longitude: -118.244, timezone: 'America/Los_Angeles' },
  'chicago':      { longitude: -87.630, timezone: 'America/Chicago' },
  'houston':      { longitude: -95.370, timezone: 'America/Chicago' },
  'phoenix':      { longitude: -112.074, timezone: 'America/Phoenix' },
  'san francisco':{ longitude: -122.419, timezone: 'America/Los_Angeles' },
  // UK
  'london':       { longitude: -0.118, timezone: 'Europe/London' },
  'manchester':   { longitude: -2.244, timezone: 'Europe/London' },
  // Australia
  'sydney':       { longitude: 151.209, timezone: 'Australia/Sydney' },
  'melbourne':    { longitude: 144.963, timezone: 'Australia/Melbourne' },
  'brisbane':     { longitude: 153.023, timezone: 'Australia/Brisbane' },
  'perth':        { longitude: 115.861, timezone: 'Australia/Perth' },
  // Europe
  'paris':        { longitude: 2.352, timezone: 'Europe/Paris' },
  'berlin':       { longitude: 13.405, timezone: 'Europe/Berlin' },
  // Asia
  'seoul':        { longitude: 127.0, timezone: 'Asia/Seoul' },
  'tokyo':        { longitude: 139.692, timezone: 'Asia/Tokyo' },
  'busan':        { longitude: 129.0, timezone: 'Asia/Seoul' },
};

/**
 * 도시명으로 경도/타임존 조회 (폴백용)
 */
export function lookupCity(cityName) {
  const key = cityName.toLowerCase().trim();
  return CITY_DATABASE[key] || null;
}

/**
 * 타임존별 표준경도 매핑
 */
const TIMEZONE_MERIDIANS = {
  // Americas
  'America/New_York':    -75,
  'America/Chicago':     -90,
  'America/Denver':      -105,
  'America/Los_Angeles': -120,
  'America/Anchorage':   -135,
  'America/Phoenix':     -105, // Arizona, no DST
  // Europe
  'Europe/London':       0,
  'Europe/Paris':        15,
  'Europe/Berlin':       15,
  // Asia-Pacific
  'Asia/Seoul':          135,
  'Asia/Tokyo':          135,
  'Australia/Sydney':    150,
  'Australia/Melbourne': 150,
  'Australia/Brisbane':  150, // Queensland, no DST
  'Australia/Perth':     120,
  // UTC offsets as fallback
  'UTC-5': -75, 'UTC-6': -90, 'UTC-7': -105, 'UTC-8': -120,
  'UTC+0': 0, 'UTC+1': 15, 'UTC+9': 135, 'UTC+10': 150, 'UTC+11': 165,
};

/**
 * DST 체크 (간략 룰 기반)
 * 정밀 계산은 Intl API 사용 권장. 여기서는 주요 국가의 룰만 커버.
 *
 * @param {number} year
 * @param {number} month - 1~12
 * @param {number} day
 * @param {number} hour
 * @param {string} timezone - IANA timezone string
 * @returns {number} DST offset in minutes (60 = DST active, subtract from input)
 */
function getDSTOffset(year, month, day, hour, timezone) {
  // Node.js Intl API로 정확한 DST 판정
  try {
    // DST 기간의 UTC offset과 비DST 기간의 offset 비교
    const jan = new Date(year, 0, 15, 12);
    const jul = new Date(year, 6, 15, 12);

    const janOffset = getUTCOffsetMinutes(jan, timezone);
    const julOffset = getUTCOffsetMinutes(jul, timezone);

    const standardOffset = Math.min(janOffset, julOffset); // 표준시 = 더 작은 offset
    const targetDate = new Date(year, month - 1, day, hour);
    const targetOffset = getUTCOffsetMinutes(targetDate, timezone);

    // DST 활성 = 현재 offset이 표준시보다 큰 경우
    return targetOffset - standardOffset; // 보통 60 (DST) 또는 0
  } catch (e) {
    return 0; // Intl 실패 시 보정 없음
  }
}

function getUTCOffsetMinutes(date, timezone) {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate - utcDate) / 60000;
}

/**
 * 한국 역사적 DST 테이블 (1948~1988)
 * 우리 타겟(US/UK/AU 1990~2005년생)에는 해당 없지만, 한국 출생자용으로 포함
 */
const KOREA_DST_PERIODS = [
  { start: [1948, 6, 1], end: [1948, 9, 12] },
  { start: [1949, 4, 3], end: [1949, 9, 10] },
  { start: [1950, 4, 1], end: [1950, 9, 9] },
  { start: [1951, 5, 6], end: [1951, 9, 8] },
  { start: [1955, 5, 5], end: [1955, 9, 8] },
  { start: [1956, 5, 20], end: [1956, 9, 29] },
  { start: [1957, 5, 5], end: [1957, 9, 21] },
  { start: [1958, 5, 4], end: [1958, 9, 20] },
  { start: [1959, 5, 3], end: [1959, 9, 19] },
  { start: [1960, 5, 1], end: [1960, 9, 17] },
  { start: [1987, 5, 10], end: [1987, 10, 11] },
  { start: [1988, 5, 8], end: [1988, 10, 9] },
];

function isKoreaDST(year, month, day) {
  for (const period of KOREA_DST_PERIODS) {
    const [sy, sm, sd] = period.start;
    const [ey, em, ed] = period.end;
    if (year !== sy) continue;
    const birthVal = month * 100 + day;
    const startVal = sm * 100 + sd;
    const endVal = em * 100 + ed;
    if (birthVal >= startVal && birthVal <= endVal) return true;
  }
  return false;
}

// ============================================================
// 10. 메인 엔진 함수
// ============================================================

/**
 * Born Decoded 사주 엔진 - 메인 함수
 *
 * @param {Object} input
 * @param {string} input.name - 유저 이름
 * @param {number} input.year - 출생 양력 연도
 * @param {number} input.month - 출생 양력 월 (1~12)
 * @param {number} input.day - 출생 양력 일
 * @param {number|null} input.hour - 출생 시 (0~23), null이면 시주 생략
 * @param {number} input.minute - 출생 분 (0~59), 기본값 0
 * @param {number} input.longitude - 출생지 경도
 * @param {string} input.timezone - IANA 타임존 (예: 'America/New_York')
 * @param {string} input.gender - 'male' | 'female'
 * @param {string} input.birthCity - 출생 도시명
 * @param {Object} input.fixedQuestions - 고정 질문 3개
 * @param {string} input.fixedQuestions.gender - 성별 (이미 gender와 동일)
 * @param {string} input.fixedQuestions.relationship - 연애 상태
 * @param {string} input.fixedQuestions.career - 직업 상태
 * @param {string[]} input.freeQuestions - 자유 질문 3개
 * @returns {Object} 전체 사주 분석 JSON
 */
export function runSajuEngine(input) {
  const {
    name,
    year, month, day,
    hour = null,
    minute = 0,
    longitude,
    timezone = 'Asia/Seoul',
    gender,
    birthCity = '',
    fixedQuestions = { gender: '', relationship: '', career: '' },
    freeQuestions = [],
  } = input;

  // ---- 표준경도 결정 ----
  const standardMeridian = TIMEZONE_MERIDIANS[timezone] ?? 135;
  console.log(`[SajuEngine] timezone="${timezone}", standardMeridian=${standardMeridian}, longitude=${longitude}, matched=${TIMEZONE_MERIDIANS[timezone] !== undefined}`);

  // ---- DST 보정 ----
  let adjustedHour = hour;
  let adjustedMinute = minute;
  let dstApplied = false;
  let dstMinutesApplied = 0;

  if (hour !== null) {
    // 한국 역사적 DST
    if (timezone === 'Asia/Seoul' && isKoreaDST(year, month, day)) {
      adjustedHour = hour - 1;
      if (adjustedHour < 0) adjustedHour += 24;
      dstApplied = true;
      dstMinutesApplied = 60;
    }
    // 해외 DST (Node.js Intl 기반)
    else if (timezone !== 'Asia/Seoul') {
      const dstMinutes = getDSTOffset(year, month, day, hour, timezone);
      if (dstMinutes > 0) {
        const totalMin = hour * 60 + minute - dstMinutes;
        adjustedHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
        adjustedMinute = ((totalMin % 1440) + 1440) % 1440 - adjustedHour * 60;
        dstApplied = true;
        dstMinutesApplied = dstMinutes;
      }
    }
  }

  // ---- 진태양시(True Solar Time) 보정 ----
  // 기획서: 보정 = 경도 차이 + 균시차(Equation of Time)
  // 라이브러리 내장 보정은 한국 전용이라 직접 계산 후 calculateSajuSimple 사용.
  let trueSolarHour = adjustedHour;
  let trueSolarMinute = adjustedMinute;
  let longitudeCorrectionMin = 0;
  let eotMinutes = 0;
  let totalCorrectionMinutes = 0;

  if (hour !== null) {
    // 1) 경도 보정 = (도시경도 - 표준경도) × 4분
    longitudeCorrectionMin = (longitude - standardMeridian) * 4;

    // 2) 균시차(Equation of Time) — 최대 ±16분
    eotMinutes = getEquationOfTime(year, month, day);

    // 3) 총 보정 = 경도보정 + 균시차
    totalCorrectionMinutes = Math.round(longitudeCorrectionMin + eotMinutes);

    const totalMin = adjustedHour * 60 + adjustedMinute + totalCorrectionMinutes;
    trueSolarHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    trueSolarMinute = ((totalMin % 1440) + 1440) % 1440 - trueSolarHour * 60;
  }

  // ---- 사주 계산 ----
  let saju;
  const hasHour = hour !== null;

  if (hasHour) {
    // 이미 진태양시 보정 완료 → Simple 버전 사용 (추가 보정 방지)
    saju = calculateSajuSimple(year, month, day, trueSolarHour);
    saju.isTimeCorrected = true;
    saju.correctedTime = { hour: trueSolarHour, minute: trueSolarMinute };
  } else {
    // 시주 없이 3기둥만
    const result = solarToLunar(year, month, day);
    saju = {
      yearPillar: result.gapja.yearPillar,
      yearPillarHanja: result.gapja.yearPillarHanja,
      monthPillar: result.gapja.monthPillar,
      monthPillarHanja: result.gapja.monthPillarHanja,
      dayPillar: result.gapja.dayPillar,
      dayPillarHanja: result.gapja.dayPillarHanja,
      hourPillar: null,
      hourPillarHanja: null,
      isTimeCorrected: false,
      correctedTime: null,
    };
  }

  // ---- 기둥 데이터 구조화 ----
  const pillarsArray = [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].filter(Boolean);

  const fourPillars = {
    year: formatPillarDetail(saju.yearPillar, saju.yearPillarHanja, 'Year Pillar'),
    month: formatPillarDetail(saju.monthPillar, saju.monthPillarHanja, 'Month Pillar'),
    day: formatPillarDetail(saju.dayPillar, saju.dayPillarHanja, 'Day Pillar'),
    hour: hasHour ? formatPillarDetail(saju.hourPillar, saju.hourPillarHanja, 'Hour Pillar') : null,
    hourUnavailable: !hasHour,
  };

  // ---- 오행 분포 ----
  const elements = calculateElementDistribution(pillarsArray);

  // ---- 십신 분석 ----
  const tenGodPillars = [
    ['year', saju.yearPillar],
    ['month', saju.monthPillar],
    ['day', saju.dayPillar],
  ];
  if (hasHour) tenGodPillars.push(['hour', saju.hourPillar]);

  const tenGods = analyzeTenGods(saju.dayPillar, tenGodPillars);

  // ---- 일간 강약 ----
  const dayMasterAnalysis = analyzeDayMasterStrength(saju.dayPillar, elements, tenGods);

  // ---- 대운 ----
  const grandCycle = calculateGrandCycle(
    saju.yearPillar, saju.monthPillar, gender, year, month, day
  );

  // ---- 세운 (당해년도 + 내년) ----
  const currentYear = new Date().getFullYear();
  const yearlyEnergyCurrent = calculateYearlyEnergy(currentYear, saju.dayPillar);
  const yearlyEnergyNext = calculateYearlyEnergy(currentYear + 1, saju.dayPillar);

  // ---- 음력 정보 ----
  const lunar = solarToLunar(year, month, day);

  // ============================================================
  // v2.0 확장 계산
  // ============================================================

  // ---- 천간/지지 배열 추출 ----
  const allTiangan = [saju.yearPillar?.[0], saju.monthPillar?.[0], saju.dayPillar?.[0], saju.hourPillar?.[0]].filter(Boolean);
  const allDizhi = [saju.yearPillar?.[1], saju.monthPillar?.[1], saju.dayPillar?.[1], saju.hourPillar?.[1]].filter(Boolean);
  const dayTiangan = saju.dayPillar[0];
  const dayDizhi = saju.dayPillar[1];

  // ---- 지장간(藏干) ----
  const jijanggan = {};
  for (const [key, pillarHangul] of [['year', saju.yearPillar], ['month', saju.monthPillar], ['day', saju.dayPillar], ['hour', saju.hourPillar]]) {
    if (!pillarHangul) { jijanggan[key] = null; continue; }
    const dz = pillarHangul[1];
    const jj = getJijanggan(dz);
    if (jj) {
      const ELEMENT_MAP = { '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토', '기': '토', '경': '금', '신': '금', '임': '수', '계': '수' };
      const fmt = (h) => h ? { hangul: h, element: ELEMENT_MAP[h], elementEn: ELEMENT_EN[ELEMENT_MAP[h]] } : null;
      jijanggan[key] = { main: fmt(jj.main), mid: fmt(jj.mid), init: fmt(jj.init) };
    } else {
      jijanggan[key] = null;
    }
  }

  // ---- 12운성 ----
  const twelveStages = {};
  for (const [key, pillarHangul] of [['year', saju.yearPillar], ['month', saju.monthPillar], ['day', saju.dayPillar], ['hour', saju.hourPillar]]) {
    if (!pillarHangul) { twelveStages[key] = null; continue; }
    const dz = pillarHangul[1];
    twelveStages[key] = getTwelveStage(dayTiangan, dz);
  }

  // ---- 신살(神煞) ----
  const shinsal = calculateShinsal(dayTiangan, dayDizhi, allTiangan, allDizhi, tenGods);

  // ---- 형충파해/원진/합 ----
  const branchRelations = analyzeAllBranchRelations(allDizhi);
  const stemCombinations = analyzeTianganHops(allTiangan);

  // ---- 월운 (당해년도) ----
  const monthlyEnergy = calculateMonthlyEnergy(currentYear, dayTiangan, dayDizhi);

  // ---- 현재 대운 10년 년도별 세운 ----
  let decadeBreakdown = null;
  if (grandCycle) {
    const currentCycle = grandCycle.cycles.find(c => c.isCurrent);
    if (currentCycle) {
      decadeBreakdown = {
        cyclePillar: currentCycle.pillar,
        startYear: currentCycle.calendarYearStart,
        endYear: currentCycle.calendarYearEnd,
        years: [],
      };
      for (let y = currentCycle.calendarYearStart; y <= currentCycle.calendarYearEnd; y++) {
        const ye = calculateYearlyEnergy(y, saju.dayPillar);
        const isPast = y < currentYear;
        const isCurrent = y === currentYear;
        decadeBreakdown.years.push({
          year: y,
          isPast,
          isCurrent,
          pillar: ye.pillar,
          tiangan: ye.tiangan,
          dizhi: ye.dizhi,
        });
      }
    }
  }

  // ---- 최종 JSON 출력 ----
  return {
    meta: {
      service: 'Born Decoded',
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
    },
    user: {
      name,
      birthCity,
      gender,
      genderEn: gender === 'male' ? 'Male' : (gender === 'female' ? 'Female' : 'Non-binary'),
    },
    birth: {
      solar: { year, month, day, hour, minute },
      lunar: {
        year: lunar.lunar.year,
        month: lunar.lunar.month,
        day: lunar.lunar.day,
        isLeapMonth: lunar.lunar.isLeapMonth,
      },
      timezone,
      longitude,
      standardMeridian,
      dstApplied,
      dstMinutes: dstMinutesApplied,
      correction: {
        longitudeMinutes: Math.round(longitudeCorrectionMin * 10) / 10,
        equationOfTimeMinutes: Math.round(eotMinutes * 10) / 10,
        totalMinutes: totalCorrectionMinutes,
      },
      trueSolarTime: hasHour ? { hour: trueSolarHour, minute: trueSolarMinute } : null,
    },
    fourPillars,
    jijanggan,
    twelveStages,
    elements,
    tenGods,
    dayMaster: dayMasterAnalysis,
    shinsal,
    branchRelations,
    stemCombinations,
    grandCycle,
    yearlyEnergy: yearlyEnergyCurrent,
    nextYearEnergy: yearlyEnergyNext,
    decadeBreakdown,
    monthlyEnergy,
    questions: {
      fixed: {
        gender: fixedQuestions.gender || gender,
        relationship: fixedQuestions.relationship || '',
        career: fixedQuestions.career || '',
      },
      free: freeQuestions.slice(0, 3),
    },
  };
}

// ============================================================
// Helper: 기둥 상세 포맷
// ============================================================

function formatPillarDetail(hangul, hanja, englishLabel) {
  if (!hangul) return null;
  const parsed = parsePillar(hangul);
  if (!parsed) return null;

  const pillarData = getPillarByHangul(hangul);

  return {
    label: englishLabel,
    hangul,
    hanja,
    romanization: pillarData?.combined?.romanization || '',
    tiangan: {
      hangul: parsed.tiangan.hangul,
      hanja: parsed.tiangan.hanja,
      element: parsed.tiangan.element,
      elementEn: ELEMENT_EN[parsed.tiangan.element],
      yinYang: parsed.tiangan.yinYang,
      yinYangEn: YINYANG_EN[parsed.tiangan.yinYang],
    },
    dizhi: {
      hangul: parsed.dizhi.hangul,
      hanja: parsed.dizhi.hanja,
      element: parsed.dizhi.element,
      elementEn: ELEMENT_EN[parsed.dizhi.element],
      yinYang: parsed.dizhi.yinYang,
      yinYangEn: YINYANG_EN[parsed.dizhi.yinYang],
      animal: parsed.dizhi.animal || '',
      animalKr: parsed.dizhi.animalKr || '',
    },
  };
}

export default runSajuEngine;

// ============================================================
// 궁합 엔진 — 두 사람의 사주 분석 + 궁합
// ============================================================

/**
 * 궁합 엔진 메인 함수
 * 
 * @param {Object} input1 - 본인 runSajuEngine 입력
 * @param {Object} input2 - 상대방 runSajuEngine 입력
 * @param {string} relationshipType - 관계 유형
 * @param {string[]} freeQuestions - 자유 질문 2개
 * @returns {Object} 궁합 분석 전체 JSON
 */
export function runCompatibilityEngine(input1, input2, relationshipType = 'romantic', freeQuestions = []) {
  // 각각 사주 계산
  const person1 = runSajuEngine(input1);
  const person2 = runSajuEngine(input2);

  // 궁합 분석
  const compatibility = calculateCompatibility(person1, person2, relationshipType);

  return {
    meta: {
      service: 'Born Decoded — Compatibility',
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
    },
    person1,
    person2,
    compatibility,
    relationshipType,
    freeQuestions: freeQuestions.slice(0, 2),
  };
}

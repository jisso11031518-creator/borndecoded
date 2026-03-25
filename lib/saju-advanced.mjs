/**
 * Born Decoded - Saju Advanced Module (v2.0)
 * 
 * 지장간(藏干), 12운성, 신살 20종+, 형충파해, 원진살, 궁합 엔진
 * saju-engine.mjs에서 import하여 사용
 */

// ============================================================
// 1. 지장간(藏干) — Hidden Stems
// ============================================================

/**
 * 지지별 지장간 테이블
 * 각 지지에 숨어있는 천간 (여기=본기, 중기, 초기 순서)
 * 본기가 가장 강한 영향력
 */
const JIJANGGAN = {
  '자': { main: '계', mid: null,  init: null  }, // 子: 癸
  '축': { main: '기', mid: '계',  init: '신'  }, // 丑: 己癸辛
  '인': { main: '갑', mid: '병',  init: '무'  }, // 寅: 甲丙戊
  '묘': { main: '을', mid: null,  init: null  }, // 卯: 乙
  '진': { main: '무', mid: '을',  init: '계'  }, // 辰: 戊乙癸
  '사': { main: '병', mid: '무',  init: '경'  }, // 巳: 丙戊庚
  '오': { main: '정', mid: '기',  init: null  }, // 午: 丁己
  '미': { main: '기', mid: '정',  init: '을'  }, // 未: 己丁乙
  '신': { main: '경', mid: '임',  init: '무'  }, // 申: 庚壬戊
  '유': { main: '신', mid: null,  init: null  }, // 酉: 辛
  '술': { main: '무', mid: '신',  init: '정'  }, // 戌: 戊辛丁
  '해': { main: '임', mid: '갑',  init: null  }, // 亥: 壬甲
};

/**
 * 지장간 조회
 * @param {string} dizhiHangul - 지지 한글 (예: '자', '축')
 * @returns {Object} { main, mid, init } — 천간 한글
 */
export function getJijanggan(dizhiHangul) {
  return JIJANGGAN[dizhiHangul] || null;
}

// ============================================================
// 2. 12운성 — Twelve Life Stages
// ============================================================

const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const TWELVE_STAGES_EN = ['Growth', 'Bath', 'Crown', 'Prosperity', 'Peak', 'Decline', 'Illness', 'Death', 'Tomb', 'Severance', 'Embryo', 'Nurture'];

const DIZHI_ORDER = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/**
 * 12운성 시작점 테이블
 * 일간(천간)에 대해 '장생'이 위치하는 지지 인덱스
 * 양간: 순행, 음간: 역행
 */
const STAGE_START = {
  '갑': 11, // 갑목 장생 = 해(亥)
  '을': 6,  // 을목 장생 = 오(午)
  '병': 2,  // 병화 장생 = 인(寅)
  '정': 9,  // 정화 장생 = 유(酉)
  '무': 2,  // 무토 장생 = 인(寅)
  '기': 9,  // 기토 장생 = 유(酉)
  '경': 5,  // 경금 장생 = 사(巳)
  '신': 0,  // 신금 장생 = 자(子)
  '임': 8,  // 임수 장생 = 신(申)
  '계': 3,  // 계수 장생 = 묘(卯)
};

const YANG_STEMS = ['갑', '병', '무', '경', '임'];

/**
 * 12운성 계산
 * @param {string} tianganHangul - 일간 천간 한글
 * @param {string} dizhiHangul - 대상 지지 한글
 * @returns {{ korean: string, english: string, index: number }}
 */
export function getTwelveStage(tianganHangul, dizhiHangul) {
  const startIdx = STAGE_START[tianganHangul];
  if (startIdx === undefined) return null;

  const dizhiIdx = DIZHI_ORDER.indexOf(dizhiHangul);
  if (dizhiIdx === -1) return null;

  const isYang = YANG_STEMS.includes(tianganHangul);

  let stageIdx;
  if (isYang) {
    // 양간: 순행 (장생에서 +)
    stageIdx = ((dizhiIdx - startIdx) % 12 + 12) % 12;
  } else {
    // 음간: 역행 (장생에서 -)
    stageIdx = ((startIdx - dizhiIdx) % 12 + 12) % 12;
  }

  return {
    korean: TWELVE_STAGES[stageIdx],
    english: TWELVE_STAGES_EN[stageIdx],
    index: stageIdx,
  };
}

// ============================================================
// 3. 신살(神煞) — Special Stars (20종+)
// ============================================================

/**
 * 신살 계산에 필요한 지지 인덱스
 */
function dizhiIdx(hangul) {
  return DIZHI_ORDER.indexOf(hangul);
}

/**
 * 역마살(驛馬殺) — 변동, 이동, 해외
 * 일지 기준: 인→신, 신→인, 사→해, 해→사
 */
function hasYeokma(dayDizhi, allDizhi) {
  const map = { '인': '신', '오': '신', '술': '신', '신': '인', '자': '인', '진': '인', '사': '해', '유': '해', '축': '해', '해': '사', '묘': '사', '미': '사' };
  const target = map[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 도화살(桃花殺) — 이성 매력, 인기
 * 일지 기준
 */
function hasDohwa(dayDizhi, allDizhi) {
  const map = { '인': '묘', '오': '묘', '술': '묘', '신': '유', '자': '유', '진': '유', '사': '오', '유': '오', '축': '오', '해': '자', '묘': '자', '미': '자' };
  const target = map[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 화개살(華蓋殺) — 예술, 종교, 고독
 */
function hasHwagae(dayDizhi, allDizhi) {
  const map = { '인': '술', '오': '술', '술': '술', '신': '진', '자': '진', '진': '진', '사': '축', '유': '축', '축': '축', '해': '미', '묘': '미', '미': '미' };
  const target = map[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 백호살(白虎殺) — 사고, 수술, 돌발 상황
 * 일간 기준
 */
function hasBaekho(dayTiangan, allDizhi) {
  const map = { '갑': '진', '을': '사', '병': '오', '정': '미', '무': '오', '기': '미', '경': '신', '신': '유', '임': '술', '계': '해' };
  const target = map[dayTiangan];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 귀문관살(鬼門關殺) — 예민, 영감, 정신세계
 * 일지 기준 특정 조합
 */
function hasGwimun(dayDizhi, allDizhi) {
  const pairs = { '자': '묘', '묘': '자', '축': '오', '오': '축', '인': '미', '미': '인', '진': '유', '유': '진', '사': '술', '술': '사', '신': '해', '해': '신' };
  const target = pairs[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 현침살(懸針殺) — 침, 의료, 정밀 작업
 * 일주가 갑(甲)인 경우 해당 (갑의 한자 형태가 바늘)
 * 실제로는 사주 내 辛이 甲을 충하거나 특정 조합
 */
function hasHyunchim(dayTiangan, allTiangan) {
  // 간략 판정: 甲+辛 조합, 또는 辛일간+甲 조합
  return (dayTiangan === '갑' && allTiangan.includes('신')) ||
         (dayTiangan === '신' && allTiangan.includes('갑'));
}

/**
 * 홍염살(紅艶殺) — 색정, 매력, 인기
 */
function hasHongyeom(dayTiangan, allDizhi) {
  const map = { '갑': '오', '을': '신', '병': '인', '정': '미', '무': '진', '기': '진', '경': '술', '신': '유', '임': '자', '계': '신' };
  const target = map[dayTiangan];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 천라지망(天羅地網) — 법적 문제, 구속, 치유 능력
 * 술+해 조합 또는 진+사 조합
 */
function hasCheonra(allDizhi) {
  return (allDizhi.includes('술') && allDizhi.includes('해')) ||
         (allDizhi.includes('진') && allDizhi.includes('사'));
}

/**
 * 괴강살(魁罡殺) — 강한 성격, 리더십, 극단적
 * 일주가 庚辰, 庚戌, 壬辰, 壬戌
 */
function hasGoegang(dayTiangan, dayDizhi) {
  return (dayTiangan === '경' && (dayDizhi === '진' || dayDizhi === '술')) ||
         (dayTiangan === '임' && (dayDizhi === '진' || dayDizhi === '술'));
}

/**
 * 고란과숙(孤鸞寡宿) — 배우자 인연 약함, 고독
 * 일주: 甲寅, 乙巳, 丁巳, 辛亥, 戊申, 壬子 등
 */
function hasGoran(dayTiangan, dayDizhi) {
  const goranPairs = [
    ['갑', '인'], ['을', '사'], ['정', '사'], ['신', '해'],
    ['무', '신'], ['임', '자'], ['병', '자'], ['경', '오'],
  ];
  return goranPairs.some(([t, d]) => t === dayTiangan && d === dayDizhi);
}

/**
 * 나체도화(裸體桃花) — 강한 성적 매력
 * 일주: 甲子, 庚午, 乙巳, 辛亥 등
 */
function hasNachae(dayTiangan, dayDizhi) {
  const pairs = [['갑', '자'], ['경', '오'], ['을', '사'], ['신', '해']];
  return pairs.some(([t, d]) => t === dayTiangan && d === dayDizhi);
}

/**
 * 의처의부살 — 배우자 의심
 * 일지에 도화+겁재 동시
 */
function hasUicheo(dayDizhi, allDizhi, tenGods) {
  // 간략: 도화살 + 일지에 겁재가 있으면 해당
  const dohwa = hasDohwa(dayDizhi, allDizhi);
  const hasJiebcai = tenGods?.some(tg => tg.position === 'day' && tg.type === 'dizhi' && tg.tenGod?.category === 'peer');
  return dohwa && hasJiebcai;
}

/**
 * 재고귀인(財庫貴人) — 재물 창고
 * 일간 기준 재성의 묘지(墓)
 */
function hasJaego(dayTiangan, allDizhi) {
  // 재성의 고지(庫): 목→미, 화→술, 토→진, 금→축, 수→진
  const map = { '갑': '술', '을': '술', '병': '축', '정': '축', '무': '미', '기': '미', '경': '진', '신': '진', '임': '술', '계': '술' };
  const target = map[dayTiangan];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 천을귀인(天乙貴人) — 귀인, 도움
 */
function hasCheoneul(dayTiangan, allDizhi) {
  const map = {
    '갑': ['축', '미'], '을': ['자', '신'], '병': ['해', '유'], '정': ['해', '유'],
    '무': ['축', '미'], '기': ['자', '신'], '경': ['축', '미'], '신': ['인', '오'],
    '임': ['묘', '사'], '계': ['묘', '사'],
  };
  const targets = map[dayTiangan];
  return targets ? targets.some(t => allDizhi.includes(t)) : false;
}

/**
 * 문창귀인(文昌貴人) — 학문, 시험
 */
function hasMunchang(dayTiangan, allDizhi) {
  const map = { '갑': '사', '을': '오', '병': '신', '정': '유', '무': '신', '기': '유', '경': '해', '신': '자', '임': '인', '계': '묘' };
  const target = map[dayTiangan];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 겁살(劫殺) — 강도, 사고
 */
function hasGeopsal(dayDizhi, allDizhi) {
  const map = { '인': '해', '오': '해', '술': '해', '신': '사', '자': '사', '진': '사', '사': '인', '유': '인', '축': '인', '해': '신', '묘': '신', '미': '신' };
  const target = map[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 망신살(亡身殺) — 명예 손상
 */
function hasMangsin(dayDizhi, allDizhi) {
  const map = { '인': '사', '오': '사', '술': '사', '신': '해', '자': '해', '진': '해', '사': '신', '유': '신', '축': '신', '해': '인', '묘': '인', '미': '인' };
  const target = map[dayDizhi];
  return target ? allDizhi.includes(target) : false;
}

/**
 * 전체 신살 계산
 * @param {string} dayTiangan - 일간 천간 한글
 * @param {string} dayDizhi - 일지 지지 한글
 * @param {string[]} allTiangan - 4기둥 천간 배열
 * @param {string[]} allDizhi - 4기둥 지지 배열
 * @param {Array} tenGods - 십신 결과 (optional)
 * @returns {Object[]} 해당되는 신살 목록
 */
export function calculateShinsal(dayTiangan, dayDizhi, allTiangan, allDizhi, tenGods = []) {
  const results = [];

  const checks = [
    { fn: () => hasYeokma(dayDizhi, allDizhi), kr: '역마살', en: 'Traveling Horse', desc: 'Movement, travel, overseas connections. Restless energy seeking change.' },
    { fn: () => hasDohwa(dayDizhi, allDizhi), kr: '도화살', en: 'Peach Blossom', desc: 'Romantic charm and magnetism. Natural ability to attract others.' },
    { fn: () => hasHwagae(dayDizhi, allDizhi), kr: '화개살', en: 'Canopy Star', desc: 'Artistic sensitivity, spiritual depth. Tendency toward solitude and contemplation.' },
    { fn: () => hasBaekho(dayTiangan, allDizhi), kr: '백호살', en: 'White Tiger', desc: 'Sudden events, accidents, surgery. Also indicates courage and decisive action.' },
    { fn: () => hasGwimun(dayDizhi, allDizhi), kr: '귀문관살', en: 'Ghost Gate', desc: 'Heightened intuition, psychic sensitivity. Sees what others miss.' },
    { fn: () => hasHyunchim(dayTiangan, allTiangan), kr: '현침살', en: 'Suspended Needle', desc: 'Precision, medical talent, attention to fine detail.' },
    { fn: () => hasHongyeom(dayTiangan, allDizhi), kr: '홍염살', en: 'Red Flame', desc: 'Intense romantic allure. Passionate but potentially complicated love life.' },
    { fn: () => hasCheonra(allDizhi), kr: '천라지망', en: 'Heaven Net', desc: 'Entanglement with systems, law, or institutions. Also healing and transformation ability.' },
    { fn: () => hasGoegang(dayTiangan, dayDizhi), kr: '괴강살', en: 'Fearsome Star', desc: 'Extreme personality — powerful leader or lone wolf. All-or-nothing approach.' },
    { fn: () => hasGoran(dayTiangan, dayDizhi), kr: '고란과숙', en: 'Lonely Phoenix', desc: 'Delayed marriage blessing. Independence in relationships. Inner solitude.' },
    { fn: () => hasNachae(dayTiangan, dayDizhi), kr: '나체도화', en: 'Unveiled Blossom', desc: 'Raw, magnetic sensuality. Unfiltered charm that draws people in.' },
    { fn: () => hasUicheo(dayDizhi, allDizhi, tenGods), kr: '의처의부살', en: 'Jealousy Star', desc: 'Tendency to doubt partner. Trust issues in intimate relationships.' },
    { fn: () => hasJaego(dayTiangan, allDizhi), kr: '재고귀인', en: 'Wealth Vault', desc: 'Natural ability to accumulate wealth. Best when assets are locked away.' },
    { fn: () => hasCheoneul(dayTiangan, allDizhi), kr: '천을귀인', en: 'Heavenly Noble', desc: 'Protected by benefactors. Help appears in times of crisis.' },
    { fn: () => hasMunchang(dayTiangan, allDizhi), kr: '문창귀인', en: 'Literary Star', desc: 'Academic talent, eloquence, success in exams and certifications.' },
    { fn: () => hasGeopsal(dayDizhi, allDizhi), kr: '겁살', en: 'Robbery Star', desc: 'Risk of sudden loss. Also indicates boldness and survival instinct.' },
    { fn: () => hasMangsin(dayDizhi, allDizhi), kr: '망신살', en: 'Reputation Star', desc: 'Risk of public embarrassment. Channel this into performance or public speaking.' },
  ];

  for (const check of checks) {
    if (check.fn()) {
      results.push({ korean: check.kr, english: check.en, description: check.desc });
    }
  }

  return results;
}

// ============================================================
// 4. 형충파해(刑沖破害) + 원진살 — Branch Relationships
// ============================================================

/**
 * 육충(六沖) — 정면 충돌
 */
const CHUNG_PAIRS = [
  ['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해'],
];

/**
 * 삼형(三刑) — 형벌
 */
const HYUNG_GROUPS = [
  ['인', '사', '신'], // 무은지형
  ['축', '술', '미'], // 무례지형
  ['자', '묘'],       // 무예지형
  // 자형: 진진, 오오, 유유, 해해 (같은 지지끼리)
];

/**
 * 육파(六破) — 파괴
 */
const PA_PAIRS = [
  ['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['미', '술'],
];

/**
 * 육해(六害) — 해침
 */
const HAE_PAIRS = [
  ['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술'],
];

/**
 * 원진살(怨嗔殺) — 원망, 불화
 */
const WONJIN_PAIRS = [
  ['자', '미'], ['축', '오'], ['인', '유'], ['묘', '신'], ['진', '해'], ['사', '술'],
];

/**
 * 천간합(天干合)
 */
const TIANGAN_HOP = [
  { pair: ['갑', '기'], element: '토', name: '갑기합' },
  { pair: ['을', '경'], element: '금', name: '을경합' },
  { pair: ['병', '신'], element: '수', name: '병신합' },
  { pair: ['정', '임'], element: '화', name: '정임합' },
  { pair: ['무', '계'], element: '화', name: '무계합' },
];

/**
 * 지지 육합(六合)
 */
const DIZHI_YUKHAP = [
  { pair: ['자', '축'], element: '토', name: '자축합' },
  { pair: ['인', '해'], element: '목', name: '인해합' },
  { pair: ['묘', '술'], element: '화', name: '묘술합' },
  { pair: ['진', '유'], element: '금', name: '진유합' },
  { pair: ['사', '신'], element: '수', name: '사신합' },
  { pair: ['오', '미'], element: '토', name: '오미합' },
];

/**
 * 지지 삼합(三合)
 */
const DIZHI_SAMHAP = [
  { trio: ['인', '오', '술'], element: '화', name: '인오술 화국' },
  { trio: ['사', '유', '축'], element: '금', name: '사유축 금국' },
  { trio: ['신', '자', '진'], element: '수', name: '신자진 수국' },
  { trio: ['해', '묘', '미'], element: '목', name: '해묘미 목국' },
];

function findPairMatch(pairs, dz1, dz2) {
  return pairs.some(([a, b]) => (dz1 === a && dz2 === b) || (dz1 === b && dz2 === a));
}

/**
 * 두 지지 간 관계 분석
 */
export function analyzeBranchRelation(dz1, dz2) {
  const results = [];

  if (findPairMatch(CHUNG_PAIRS, dz1, dz2)) {
    results.push({ type: '충', typeEn: 'Clash', korean: `${dz1}${dz2}충`, severity: 'high' });
  }
  if (findPairMatch(PA_PAIRS, dz1, dz2)) {
    results.push({ type: '파', typeEn: 'Break', korean: `${dz1}${dz2}파`, severity: 'medium' });
  }
  if (findPairMatch(HAE_PAIRS, dz1, dz2)) {
    results.push({ type: '해', typeEn: 'Harm', korean: `${dz1}${dz2}해`, severity: 'medium' });
  }
  if (findPairMatch(WONJIN_PAIRS, dz1, dz2)) {
    results.push({ type: '원진', typeEn: 'Resentment', korean: `${dz1}${dz2}원진`, severity: 'medium' });
  }

  // 형(刑) 체크 — 2자 조합에서 확인 가능한 것만
  for (const group of HYUNG_GROUPS) {
    if (group.length === 2) {
      if (findPairMatch([group], dz1, dz2)) {
        results.push({ type: '형', typeEn: 'Punishment', korean: `${dz1}${dz2}형`, severity: 'high' });
      }
    } else if (group.includes(dz1) && group.includes(dz2) && dz1 !== dz2) {
      results.push({ type: '형', typeEn: 'Punishment', korean: `${dz1}${dz2}형`, severity: 'high' });
    }
  }

  // 자형 (같은 지지)
  if (dz1 === dz2 && ['진', '오', '유', '해'].includes(dz1)) {
    results.push({ type: '자형', typeEn: 'Self-Punishment', korean: `${dz1}${dz2}자형`, severity: 'low' });
  }

  // 합(合) 체크
  for (const hop of DIZHI_YUKHAP) {
    if (findPairMatch([hop.pair], dz1, dz2)) {
      results.push({ type: '육합', typeEn: 'Six Harmony', korean: hop.name, element: hop.element, severity: 'positive' });
    }
  }

  return results;
}

/**
 * 사주 전체의 지지 관계 분석
 * @param {string[]} allDizhi - 4기둥 지지 배열 (년/월/일/시)
 * @returns {Object[]} 모든 관계 목록
 */
export function analyzeAllBranchRelations(allDizhi) {
  const results = [];
  const labels = ['year', 'month', 'day', 'hour'];

  for (let i = 0; i < allDizhi.length; i++) {
    for (let j = i + 1; j < allDizhi.length; j++) {
      if (!allDizhi[i] || !allDizhi[j]) continue;
      const relations = analyzeBranchRelation(allDizhi[i], allDizhi[j]);
      for (const rel of relations) {
        results.push({
          ...rel,
          between: [labels[i], labels[j]],
          branches: [allDizhi[i], allDizhi[j]],
        });
      }
    }
  }

  // 삼합 체크
  for (const samhap of DIZHI_SAMHAP) {
    const found = samhap.trio.filter(dz => allDizhi.includes(dz));
    if (found.length >= 2) {
      results.push({
        type: found.length === 3 ? '삼합' : '반합',
        typeEn: found.length === 3 ? 'Triple Harmony' : 'Partial Triple',
        korean: samhap.name,
        element: samhap.element,
        severity: 'positive',
        branches: found,
      });
    }
  }

  return results;
}

/**
 * 천간 합 분석
 */
export function analyzeTianganHops(allTiangan) {
  const results = [];
  const labels = ['year', 'month', 'day', 'hour'];

  for (let i = 0; i < allTiangan.length; i++) {
    for (let j = i + 1; j < allTiangan.length; j++) {
      if (!allTiangan[i] || !allTiangan[j]) continue;
      for (const hop of TIANGAN_HOP) {
        if (findPairMatch([hop.pair], allTiangan[i], allTiangan[j])) {
          results.push({
            type: '천간합',
            typeEn: 'Heavenly Combination',
            korean: hop.name,
            element: hop.element,
            between: [labels[i], labels[j]],
            stems: [allTiangan[i], allTiangan[j]],
          });
        }
      }
    }
  }

  return results;
}

// ============================================================
// 5. 궁합(Compatibility) 엔진
// ============================================================

/**
 * 궁합 점수 + 분석
 * @param {Object} person1 - runSajuEngine 결과
 * @param {Object} person2 - runSajuEngine 결과
 * @param {string} relationshipType - 관계 유형
 * @returns {Object} 궁합 분석 결과
 */
export function calculateCompatibility(person1, person2, relationshipType = 'romantic') {
  let score = 55; // 기본 55점 (평균 궁합은 보통 50~60 구간)
  const factors = [];

  // ---- 일간 추출 ----
  const dm1 = person1.fourPillars.day.tiangan.hangul;
  const dm2 = person2.fourPillars.day.tiangan.hangul;
  const dz1 = person1.fourPillars.day.dizhi.hangul;
  const dz2 = person2.fourPillars.day.dizhi.hangul;

  const el1 = person1.dayMaster.dayMaster.element;
  const el2 = person2.dayMaster.dayMaster.element;

  // ---- 1. 천간합 (일간끼리) ----
  for (const hop of TIANGAN_HOP) {
    if (findPairMatch([hop.pair], dm1, dm2)) {
      score += 15;
      factors.push({
        category: 'harmony',
        korean: `일간 ${hop.name}`,
        english: `Day Master ${hop.name} combination`,
        impact: +15,
        description: 'Your Day Masters form a natural combination — deep spiritual and emotional resonance.',
      });
    }
  }

  // ---- 2. 일지 관계 (배우자궁) ----
  const dayBranchRelations = analyzeBranchRelation(dz1, dz2);
  for (const rel of dayBranchRelations) {
    if (rel.type === '충') {
      score -= 15;
      factors.push({ category: 'conflict', korean: `일지 ${rel.korean}`, english: `Spouse Palace ${rel.typeEn}`, impact: -15, description: 'The spouse positions clash directly — passionate but volatile. Physical distance can be a remedy.' });
    } else if (rel.type === '형') {
      score -= 10;
      factors.push({ category: 'conflict', korean: `일지 ${rel.korean}`, english: `Spouse Palace ${rel.typeEn}`, impact: -10, description: 'Punishment energy between spouse positions — disagreements can escalate quickly.' });
    } else if (rel.type === '원진') {
      score -= 8;
      factors.push({ category: 'conflict', korean: `일지 ${rel.korean}`, english: `Spouse Palace ${rel.typeEn}`, impact: -8, description: 'Subtle resentment energy — unexplained irritation with each other.' });
    } else if (rel.type === '육합') {
      score += 12;
      factors.push({ category: 'harmony', korean: `일지 ${rel.korean}`, english: `Spouse Palace ${rel.typeEn}`, impact: +12, description: 'Natural harmony in the spouse positions — comfortable domestic life.' });
    }
  }

  // ---- 3. 오행 상생/상극 (일간끼리) ----
  const ELEMENT_ORDER = ['목', '화', '토', '금', '수'];
  const idx1 = ELEMENT_ORDER.indexOf(el1);
  const idx2 = ELEMENT_ORDER.indexOf(el2);
  const diff = ((idx2 - idx1) + 5) % 5;

  if (diff === 0) {
    // 같은 오행
    score += 5;
    factors.push({ category: 'element', korean: '동오행', english: 'Same element', impact: +5, description: 'You share the same core element — instant understanding but potential competition.' });
  } else if (diff === 1) {
    // 나→상대 상생
    score += 10;
    factors.push({ category: 'element', korean: '상생 (내가 생)', english: 'I nurture you', impact: +10, description: 'You naturally support and nurture your partner\'s growth.' });
  } else if (diff === 4) {
    // 상대→나 상생
    score += 10;
    factors.push({ category: 'element', korean: '상생 (상대가 생)', english: 'Partner nurtures me', impact: +10, description: 'Your partner naturally supports and nurtures your growth.' });
  } else if (diff === 2) {
    // 나→상대 상극
    score -= 5;
    factors.push({ category: 'element', korean: '상극 (내가 극)', english: 'I challenge you', impact: -5, description: 'You tend to control or challenge your partner — needs awareness.' });
  } else if (diff === 3) {
    // 상대→나 상극
    score -= 5;
    factors.push({ category: 'element', korean: '상극 (상대가 극)', english: 'Partner challenges me', impact: -5, description: 'Your partner tends to control or challenge you — needs communication.' });
  }

  // ---- 4. 오행 보완 ----
  const missing1 = person1.elements.missing;
  const missing2 = person2.elements.missing;
  const dominant1 = person1.elements.dominant;
  const dominant2 = person2.elements.dominant;

  if (missing1.length > 0 && missing1.some(m => m === dominant2)) {
    score += 8;
    factors.push({ category: 'complement', korean: '오행 보완', english: 'Element complement', impact: +8, description: 'Your partner fills what\'s missing in your chart — magnetic attraction.' });
  }
  if (missing2.length > 0 && missing2.some(m => m === dominant1)) {
    score += 8;
    factors.push({ category: 'complement', korean: '오행 보완 (역)', english: 'Reverse complement', impact: +8, description: 'You fill what\'s missing in your partner\'s chart — they feel drawn to you.' });
  }

  // ---- 5. 전체 지지 충 카운트 ----
  const allDz1 = [person1.fourPillars.year, person1.fourPillars.month, person1.fourPillars.day, person1.fourPillars.hour]
    .filter(Boolean).map(p => p.dizhi.hangul);
  const allDz2 = [person2.fourPillars.year, person2.fourPillars.month, person2.fourPillars.day, person2.fourPillars.hour]
    .filter(Boolean).map(p => p.dizhi.hangul);

  // ---- 6. 전체 천간 교차 합 체크 (일간 외 년주/월주/시주 간 합) ----
  const allTg1 = [person1.fourPillars.year, person1.fourPillars.month, person1.fourPillars.day, person1.fourPillars.hour]
    .filter(Boolean).map(p => p.tiangan.hangul);
  const allTg2 = [person2.fourPillars.year, person2.fourPillars.month, person2.fourPillars.day, person2.fourPillars.hour]
    .filter(Boolean).map(p => p.tiangan.hangul);

  let crossTianganHopCount = 0;
  const crossTianganHops = [];
  for (let i = 0; i < allTg1.length; i++) {
    for (let j = 0; j < allTg2.length; j++) {
      if (i === 2 && j === 2) continue; // 일간끼리는 이미 위에서 체크함
      for (const hop of TIANGAN_HOP) {
        if (findPairMatch([hop.pair], allTg1[i], allTg2[j])) {
          crossTianganHopCount++;
          crossTianganHops.push(hop.name);
        }
      }
    }
  }
  if (crossTianganHopCount > 0) {
    const bonus = Math.min(crossTianganHopCount * 5, 15);
    score += bonus;
    factors.push({ category: 'harmony', korean: `천간 교차합 ${crossTianganHopCount}개`, english: `${crossTianganHopCount} cross-pillar stem combination(s)`, impact: +bonus, description: `Additional stem harmonies across your charts (${crossTianganHops.join(', ')}) — deep multi-layered connection.` });
  }

  let crossClashCount = 0;
  let crossHarmonyCount = 0;
  for (const d1 of allDz1) {
    for (const d2 of allDz2) {
      const rels = analyzeBranchRelation(d1, d2);
      for (const r of rels) {
        if (r.type === '충') crossClashCount++;
        if (r.type === '육합') crossHarmonyCount++;
      }
    }
  }

  if (crossClashCount > 2) {
    score -= 5;
    factors.push({ category: 'conflict', korean: '다중충돌', english: 'Multiple clashes', impact: -5, description: `${crossClashCount} clash points across both charts — a turbulent but never boring relationship.` });
  }
  if (crossHarmonyCount > 1) {
    score += 5;
    factors.push({ category: 'harmony', korean: '다중합', english: 'Multiple harmonies', impact: +5, description: `${crossHarmonyCount} harmony points across both charts — natural comfort together.` });
  }

  // ---- raw 점수 범위 제한 ----
  score = Math.max(15, Math.min(95, score));

  // ---- Phase A: 60~120 스케일 매핑 ----
  // raw 15~95 → mapped 60~100 (선형)
  let mapped = 60 + ((score - 15) / 80) * 40;  // 15→60, 95→100

  // 천간합(일간 합) 보너스: 100 초과 가능 (+8~12)
  const hasDayMasterHop = factors.some(f => f.category === 'harmony' && f.english?.includes('Day Master'));
  if (hasDayMasterHop) {
    // 보너스 크기: raw 점수가 높을수록 더 큰 보너스 (8~12)
    const hopBonus = 8 + Math.round((score - 15) / 80 * 4);
    mapped += hopBonus;
  }

  // 최종 범위: 60~120
  mapped = Math.max(60, Math.min(120, Math.round(mapped)));

  // ---- 등급 (새 스케일 기준) ----
  let grade, gradeEn;
  if (mapped >= 101) { grade = '우주적 정렬'; gradeEn = 'Cosmic Alignment'; }
  else if (mapped >= 90) { grade = '깊은 공명'; gradeEn = 'Deep Resonance'; }
  else if (mapped >= 80) { grade = '자연스러운 조화'; gradeEn = 'Natural Harmony'; }
  else if (mapped >= 70) { grade = '함께 성장'; gradeEn = 'Growth Partnership'; }
  else { grade = '단단한 유대'; gradeEn = 'Grounding Bond'; }

  return {
    score: mapped,
    rawScore: score,
    grade: { korean: grade, english: gradeEn },
    relationshipType,
    factors,
    person1Summary: {
      name: person1.user.name,
      dayMaster: `${person1.fourPillars.day.tiangan.hanja}${person1.fourPillars.day.dizhi.hanja}`,
      element: person1.dayMaster.dayMaster.elementEn,
    },
    person2Summary: {
      name: person2.user.name,
      dayMaster: `${person2.fourPillars.day.tiangan.hanja}${person2.fourPillars.day.dizhi.hanja}`,
      element: person2.dayMaster.dayMaster.elementEn,
    },
    tianganHop: (() => { const h = analyzeTianganHops([dm1, dm2]); return h.length > 0 ? h : null; })(),
    dayBranchRelation: dayBranchRelations,
    crossClashCount,
    crossHarmonyCount,
  };
}

// ============================================================
// 6. 월운(Monthly Energy) — 연도별 운세 확장
// ============================================================

const MONTH_DIZHI = ['인', '묘', '진', '사', '오', '미', '신', '유', '술', '해', '자', '축'];

/**
 * 월별 운세 포인트 계산
 * @param {number} year - 대상 연도
 * @param {string} dayTiangan - 일간 천간 한글
 * @param {string} dayDizhi - 일지 지지 한글
 * @returns {Object[]} 12개월 간략 분석
 */
export function calculateMonthlyEnergy(year, dayTiangan, dayDizhi) {
  const months = [];

  // 인월=2월, 묘월=3월, ... 축월=1월
  const ACTUAL_MONTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1];

  for (let m = 0; m < 12; m++) {
    const monthDizhi = MONTH_DIZHI[m];
    const actualMonth = ACTUAL_MONTHS[m];

    // 월지와 일간의 12운성
    const stage = getTwelveStage(dayTiangan, monthDizhi);

    // 월지와 일지의 관계
    const relations = analyzeBranchRelation(dayDizhi, monthDizhi);

    // 에너지 레벨 (12운성 기반)
    let energy = 'neutral';
    if (stage) {
      if (['장생', '관대', '건록', '제왕'].includes(stage.korean)) energy = 'high';
      else if (['쇠', '병', '사', '묘'].includes(stage.korean)) energy = 'low';
      else if (['목욕', '절', '태', '양'].includes(stage.korean)) energy = 'mixed';
    }

    // 충이 있으면 변동
    const hasClash = relations.some(r => r.type === '충');
    const hasHarmony = relations.some(r => r.type === '육합');

    months.push({
      month: actualMonth,
      dizhi: monthDizhi,
      stage: stage,
      energy,
      hasClash,
      hasHarmony,
      relations: relations.filter(r => r.severity !== 'positive' || r.type === '육합'),
    });
  }

  return months;
}

export default {
  getJijanggan,
  getTwelveStage,
  calculateShinsal,
  analyzeBranchRelation,
  analyzeAllBranchRelations,
  analyzeTianganHops,
  calculateCompatibility,
  calculateMonthlyEnergy,
  TIANGAN_HOP,
  DIZHI_YUKHAP,
  DIZHI_SAMHAP,
};

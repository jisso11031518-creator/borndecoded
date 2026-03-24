/**
 * Born Decoded - Gemini Image Prompt Generator (FINAL)
 * 
 * Claude의 coverArt 데이터를 Gemini 이미지 생성 프롬프트로 변환.
 * Gemini 1회 호출 → 표지 이미지 → ImageMagick으로 본문 이미지 자동 생성.
 * 
 * 테스트 완료: 목(덩굴), 수(파도) 오행 확인됨.
 */

// ============================================================
// 표지 이미지 프롬프트 (Gemini 1회 호출)
// ============================================================

/**
 * @param {Object} coverArt - Claude가 생성한 coverArt 객체
 * @returns {string} Gemini 이미지 생성 프롬프트
 */
export function buildCoverImagePrompt(coverArt) {
  return `Create a decorative A4 page background for a premium astrology PDF report. EXACT size: 2480x3508 pixels (300 DPI A4).

STRICT RULES:
- DO NOT write any numbers, coordinates, labels, or text on the image
- The final image must look like beautiful finished stationery

LAYOUT:

1. BORDER PATTERN:
   - LEFT side: thin decorative line running full height, continuous
   - RIGHT side: thin decorative line running full height, continuous
   - TOP side: decorative line on LEFT QUARTER and RIGHT QUARTER only. CENTER HALF is OPEN.
   - BOTTOM side: decorative line on LEFT 3/8 and RIGHT 3/8 only. CENTER QUARTER is OPEN.
   - All corners: pattern curves naturally to connect sides.
   - Pattern: ${coverArt.borderStyle}
   - Style: a SINGLE THIN line — like one stroke of a fine-tip pen. Total visual width including accents: no more than 30-40px. Very airy, very minimal. Think single-stroke calligraphy, not dense illustration.
   - Colors: ${coverArt.colorTone}

2. WATERCOLOR IMAGE:
   - Fills 80% of the interior space (inside the border)
   - Starts from the top, extends down to about 80% of the page height
   - About 2300px wide × 2600px tall
   - Content: ${coverArt.topImage}
   - The watercolor FADES and DISSOLVES naturally into the ivory background at the BOTTOM edge only — no hard edges. Like wet paint bleeding into paper.
   - The top and sides should be vivid and rich, filling the space fully.

3. GOLD SEPARATOR LINE:
   - Thin horizontal gold line below the watercolor fade-out area
   - About 1880px wide, very thin
   - Color: #C9A96E

4. BELOW THE GOLD LINE:
   - COMPLETELY EMPTY warm ivory (#F5EDE4). No decoration. About 15-20% of page height.

BACKGROUND: Warm ivory #F5EDE4

COLORS:
- Ivory: #F5EDE4
- Accent: ${coverArt.colorTone}
- Gold line: #C9A96E

CRITICAL: The border must be EXTREMELY THIN — a single fine pen stroke with tiny accents. NOT multiple lines, NOT thick patterns. One delicate line only. Below the gold line must be 100% empty ivory.

THIS IS A FINISHED ARTWORK — no labels, no numbers, no text.`;
}

// ============================================================
// 본문 이미지 — ImageMagick으로 표지에서 자동 생성
// ============================================================

/**
 * 표지 이미지에서 상단 수채화 영역을 ivory로 덮어씌워 본문 배경 생성.
 * 테두리 100% 동일 보장.
 * 
 * @param {string} coverImagePath - 표지 이미지 파일 경로
 * @param {string} bodyImagePath - 저장할 본문 이미지 경로
 * @returns {string} ImageMagick 명령어
 */
export function buildBodyImageCommand(coverImagePath, bodyImagePath) {
  // 상단 20% (약 700px) + 골드라인 영역까지 ivory로 덮어씌움
  // 테두리 영역(120px)은 보존
  return `convert "${coverImagePath}" -fill "#F5EDE4" -draw "rectangle 120,90 2360,760" "${bodyImagePath}"`;
}

// ============================================================
// 궁합 표지 프롬프트
// ============================================================

/**
 * @param {Object} coverArt - 궁합용 coverArt (intensityLevel 포함)
 * @returns {string} Gemini 이미지 생성 프롬프트
 */
export function buildCompatibilityCoverPrompt(coverArt) {
  const intensity = coverArt.intensityLevel || 'warm';
  
  let decorationLevel;
  if (intensity === 'radiant') {
    decorationLevel = 'Rich and celebratory. Add golden sparkles in the border. The border should be slightly more elaborate than usual. Think royal wedding invitation.';
  } else if (intensity === 'warm') {
    decorationLevel = 'Warm and inviting. Standard elegant decoration. Think anniversary card from a luxury brand.';
  } else if (intensity === 'subtle') {
    decorationLevel = 'Understated and refined. Minimal decoration.';
  } else {
    decorationLevel = 'Very minimal. Thin simple border only.';
  }

  return `Create a decorative A4 page background for a COMPATIBILITY/COUPLES astrology PDF report cover. EXACT size: 2480x3508 pixels (300 DPI A4).

STRICT RULES:
- DO NOT write any numbers, coordinates, labels, or text on the image
- The final image must look like beautiful finished stationery

LAYOUT:

1. BORDER PATTERN:
   - LEFT side: thin decorative line running full height, continuous
   - RIGHT side: thin decorative line running full height, continuous
   - TOP side: decorative line on LEFT QUARTER and RIGHT QUARTER only. CENTER HALF is OPEN.
   - BOTTOM side: decorative line on LEFT 3/8 and RIGHT 3/8 only. CENTER QUARTER is OPEN.
   - Pattern: ${coverArt.borderStyle}
   - ${decorationLevel}
   - Style: THIN — single fine line with accents. Visual width no more than 30-40px.
   - Colors: ${coverArt.colorTone}

2. WATERCOLOR IMAGE:
   - Fills 80% of the interior space (inside the border)
   - Starts from the top, extends down to about 80% of the page height
   - About 2300px wide × 2600px tall
   - Content: ${coverArt.topImage}
   - Two energies meeting/interacting — NOT literal people. Abstract, symbolic, beautiful.
   - The watercolor FADES naturally into ivory (#F5EDE4) at the BOTTOM edge only. Top and sides vivid and rich.

3. GOLD SEPARATOR LINE:
   - Thin horizontal gold line below the watercolor fade-out area
   - About 1880px wide, very thin
   - Color: #C9A96E

4. BELOW THE GOLD LINE:
   - COMPLETELY EMPTY warm ivory (#F5EDE4). No decoration.

BACKGROUND: Warm ivory #F5EDE4

COLORS:
- Ivory: #F5EDE4
- Accent: ${coverArt.colorTone}
- Gold line: #C9A96E
${intensity === 'radiant' ? '- Extra: golden sparkle/glow effect on border' : ''}

CRITICAL: Border THIN — single fine line. Below gold line 100% empty ivory. No text anywhere.

THIS IS A FINISHED ARTWORK — no labels, no numbers, no text.`;
}

// ============================================================
// n8n 워크플로우 가이드
// ============================================================

/**
 * n8n 워크플로우에서의 사용법:
 * 
 * 1. Claude API 호출 → 리포트 JSON 받음 (coverArt 필드 포함)
 * 
 * 2. Function 노드에서 Gemini 프롬프트 생성:
 *    const coverPrompt = buildCoverImagePrompt(reportJson.coverArt);
 * 
 * 3. HTTP Request 노드로 Gemini API 호출 (1회만):
 *    - 표지 이미지 1장 생성
 * 
 * 4. Execute Command 노드로 본문 이미지 생성:
 *    - buildBodyImageCommand()로 ImageMagick 명령어 실행
 *    - 표지에서 상단 수채화만 ivory로 덮고 테두리 보존 → 본문 배경
 * 
 * 5. Puppeteer에서 PDF 생성:
 *    - 표지 페이지: 표지 이미지 배경
 *    - 나머지 페이지: 본문 이미지 배경 (테두리 동일 보장)
 * 
 * Gemini 호출: 1회만 (비용 ~$0.02, 시간 ~15초)
 */

export default {
  buildCoverImagePrompt,
  buildBodyImageCommand,
  buildCompatibilityCoverPrompt,
};

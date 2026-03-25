# Full Session Log: 2026-03-25

## 1. 프로젝트 셋업
- `git clone https://github.com/jisso11031518-creator/borndecoded.git`
- `backup/v10-a4-final/`에 현재 상태 백업
- git config: `borndecoded@gmail.com` / `jisso11031518-creator`

## 2. PDF 페이지 사이즈 변경 (A4 -> 6x9 inch)
**Branch:** `feature/pdf-mobile-size` -> `master` merge
**Commit:** `bb16f62`

| 항목 | A4 | 6x9 inch |
|------|-----|----------|
| 너비 | 595.28pt | 432pt |
| 높이 | 841.89pt | 648pt |
| 여백 top | 65 | 47 |
| 여백 right/left | 62 | 45 |
| 여백 bottom | 60 | 44 |
| 본문 폰트 | 12pt | 12pt (유지) |

## 3. 5가지 수정사항 (`5eb2796`)
1. 마지막 페이지 빈 공간 제거 (ClosingBlock -> wrap:false 내부로)
2. CTA 버튼 따옴표 제거 (-> 기호 제거)
3. 프롬프트 톤 조정 (positive reframing 4:6, ALL-CAPS 금지)
4. Q&A 기본 질문 3개 backfill (generate-report.js)
5. contextCareer 빈 값 대응 (프롬프트 룰 추가)

## 4. 표지 하단 문구 추가 (`62a50eb`)
- "{이름}, your birth -- decoded into art."
- Dancing Script 14pt, 골드, 중앙 정렬
- 사주: 고객 이름 / 궁합: "Person1 & Person2"

## 5. Survival Guide 페이지 분리 (`032fe0b`)
- ClosingBlock -> ClosingPage (별도 Page 컴포넌트)
- justifyContent: space-between (상단 가이드, 하단 CTA)
- curly quote 스트립 추가

## 6. Q&A 섹션 page break 제거 (`15f918e`)
- 제목 + Q1을 하나의 wrap:false 블록
- Q2, Q3는 자연스럽게 흘러가도록 wrap:false 제거

## 7. 프로필 이미지 추가/제거
- `fb232ce`: 프로필 이미지 CTA 위에 추가 (120px)
- `0f28be5`: 프로필 이미지 제거, CTA 텍스트 줄바꿈으로 변경

## 8. 레이아웃 대규모 수정 (`4ddce64`)
1. CTA 섹션 완전 제거
2. 클로징 메시지 별도 마지막 페이지 (FinalPage)
3. Survival Guide는 body flow로 복귀
4. 표지 문구 bottom:40pt -> 70pt (`e51515a`)
5. 메타포 소제목 중복 수정 (metaphorText 제거)
6. 프롬프트: 클리셰 금지 리스트 (10개)
7. 프롬프트: unique content guarantee 룰

## 9. CTA 스타일 코드 완전 삭제 (`e51515a`)
- ctaBox, ctaBoxText, closingMsg StyleSheet에서 제거
- 표지 문구 bottom: 70pt

## 10. 테스트 발송 결과

### Emily Carter (사주)
- 1992.3.15, 14:30, Philadelphia
- 일간: 庚 (Geng) Metal Yang (진태양시 보정 결과)
- 사주: 壬申 / 癸卯 / 庚寅 / 癸未
- 여러 차례 테스트 발송 성공

### 8건 대량 테스트 (전부 성공)
1. Olivia Bennett - LA, 요가 강사
2. James Mitchell - London, 야간 출생
3. Sophia Nguyen - Sydney, 기혼 간호사
4. Daniel Park - NYC, SW 엔지니어
5. Rachel Kim - **contextCareer 빈 값 테스트** 성공
6. Marcus Williams - Atlanta, 식당 사장
7. Emma Thompson - **birthTimeUnknown 테스트** 성공
8. Liam Chen - SF, 사진작가

### Lee (이승희 본인 사주)
- 1982.11.18, 20:20, Seoul
- 일간: 乙 (Yi) Yin Wood
- 사주: 壬戌 / 辛亥 / 乙巳 / 丙戌
- 만세력 앱과 네 기둥/일간/오행 100% 일치 확인

### 궁합 테스트
- Olivia Bennett & Daniel Park (romantic)
- 점수: 57 (Growth Partnership)
- 성공적으로 발송

## 11. 궁합 시스템 전체 확인
- 6개 영역 전부 완전 구현 확인
  1. API 엔드포인트 (product 분기)
  2. 사주 엔진 (runCompatibilityEngine + calculateCompatibility)
  3. 리포트 프롬프트 (10섹션 구조)
  4. 이미지 생성 (점수별 장식 강도)
  5. PDF 레이아웃 (8섹션 + Q&A 2개)
  6. 입력 스키마 (person1/person2 + relationshipType)

## 12. Sample Report 섹션 활성화 (`9f4ac1f`)
- Mia Roberts PDF에서 4장 PNG 추출 (1296x1944px)
- 3장으로 축소: Cover / Your Reading / Q&A Section
- 라이트박스 모달 구현 (순수 CSS/JS)
  - 클릭 확대, X/배경 닫기, 좌우 화살표
  - 키보드 Escape/Arrow, 모바일 핀치줌

## 13. CJK 문자 3단계 방어 체계 (`b7b4021`)

### 문제
Claude API가 한글 신살명 출력 -> clean()이 삭제 -> 빈 괄호/누락 텍스트

### 해결 (3-layer)
1. **프롬프트** (95% 방지): 17개 신살 로마자 매핑 테이블, 천간/지지/오행 매핑, correct/wrong 예시
2. **clean()** (안전망): 60+ 한글->로마자 딕셔너리, longest-match-first, 빈 괄호 정리
3. **QA 로깅** (감지): CJK 제거 카운트 -> 텔레그램 경고 알림

## 현재 최신 커밋
`b7b4021` on master, pushed to origin

## 기본 브랜치
`master` (main 아님)

## 환경 정보
- Vercel 배포: borndecoded.vercel.app
- TEST_SECRET: borndecoded2026test
- 테스트 이메일: borndecoded@gmail.com
- GitHub: https://github.com/jisso11031518-creator/borndecoded.git

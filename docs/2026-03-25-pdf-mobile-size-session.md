# Session Log: PDF 6x9 Mobile Size 변경

**Date**: 2026-03-25
**Branch**: `feature/pdf-mobile-size` → `master` merge
**Commit**: `bb16f62`

---

## 1. 프로젝트 셋업

- `git clone https://github.com/jisso11031518-creator/borndecoded.git`
- 현재 상태를 `backup/v10-a4-final/` 폴더에 백업

## 2. PDF 페이지 사이즈 변경 (A4 → 6x9 inch)

**파일**: `lib/pdf-generator.mjs`

### 변경 내역

| 항목 | 변경 전 (A4) | 변경 후 (6x9 inch) |
|------|-------------|-------------------|
| 페이지 너비 | 595.28pt | 432pt |
| 페이지 높이 | 841.89pt | 648pt |
| 여백 top | 65pt | 47pt |
| 여백 right/left | 62pt | 45pt |
| 여백 bottom | 60pt | 44pt |
| 커버 오버레이 | bottom:50, left/right:60 | bottom:36, left/right:44 |
| `size: 'A4'` (6곳) | A4 문자열 | `[PW, PH]` 배열 |
| 본문 폰트 | 12pt | 12pt (유지) |

### 비례 계산

- 축소 비율: 432 / 595.28 = **0.726 (72.6%)**
- 여백은 이 비율로 비례 축소
- 폰트 사이즈는 전부 유지

## 3. 로컬 테스트 (PDF only)

- `test-pdf-size.mjs` 스크립트 작성
- 사주 엔진만 로컬에서 돌리고 mock 리포트 데이터로 PDF 생성
- Emily Carter 결과: **庚金 (Geng Metal, Yang)** 일간 (甲木이 아님 — 진태양시 보정 때문)
- `test-emily-carter-6x9.pdf` (41KB) 생성 확인

### Emily Carter 사주 결과

```
Name: Emily Carter
Date: March 15, 1992, 2:30 PM
Timezone: America/New_York (UTC-5)
Longitude: -75.1652 (Philadelphia area)

Day Master: 庚 (Geng) — Metal Yang
Strength: Balanced (support 38%)

Four Pillars:
  Year:  壬申 (Water Monkey)
  Month: 癸卯 (Water Rabbit)
  Day:   庚寅 (Metal Tiger)
  Hour:  癸未 (Water Goat)
```

## 4. Git 작업

```
git checkout -b feature/pdf-mobile-size
# ... 코드 수정 ...
git config --global user.email "borndecoded@gmail.com"
git config --global user.name "jisso11031518-creator"
git commit -m "feat: change PDF page size from A4 to 6×9 inch (432×648pt)"
git push -u origin feature/pdf-mobile-size
git checkout master
git merge feature/pdf-mobile-size
git push origin master
```

## 5. 프로덕션 테스트 발송

- **Endpoint**: `https://borndecoded.vercel.app/api/test-generate`
- **TEST_SECRET**: `borndecoded2026test`
- **수신 이메일**: `borndecoded@gmail.com`
- **테스트 데이터**: Emily Carter (위 사주 데이터와 동일)
- **결과**: `success: true`
- **orderId**: `test-1f409f10-ae95-4e2b-8653-d806eefd715c`
- **소요시간**: ~2분 45초 (Claude API → Gemini Image → PDF → Email 전체 파이프라인)

## 6. 참고사항

- Preview URL (`borndecoded-47b7aovq2-...vercel.app`)이 `DEPLOYMENT_NOT_FOUND` 에러 발생
- master에 직접 merge 후 프로덕션(`borndecoded.vercel.app`)으로 테스트 성공
- 기본 브랜치 이름은 `main`이 아니라 `master`

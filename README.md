# 식단표

사용 주소: https://ghdwnsvy1025.github.io/meal-planner/ (main에 푸시하면 GitHub Actions가 자동으로 배포)

자주 먹는 조합을 템플릿으로 저장해 두고, 하루하루는 고르고 조정만 하는 개인용 식단표 PWA. 설계는 [DESIGN.md](DESIGN.md), 화면 디자인 노트는 [DESIGN-UI.md](DESIGN-UI.md)에 있습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. 휴대폰 폭에 맞춰 만들었으므로 데스크톱에서는 가운데 480px 열로 보입니다.

## 검사와 빌드

```bash
npm test          # 통계, 템플릿 로직 단위 테스트
npm run typecheck
npm run build     # dist/ 에 PWA 빌드
```

GitHub Pages 배포는 `.github/workflows/deploy.yml`이 맡습니다. 로컬에서 같은 빌드를 만들려면 `BASE_PATH=/meal-planner/ npm run build` 입니다.

## 식약처 데이터 갱신

`public/food-db-dish.json`(음식)과 `public/food-db-processed.json`(가공식품)이 검색 데이터입니다. 새 원본을 받아 다시 만드는 방법은 [data/README.md](data/README.md)를 보세요.

## 구조

- `src/domain/` 데이터 모델, 날짜, 영양소 계산, 통계, 템플릿 적용 로직. UI와 무관하고 테스트가 여기에 있습니다.
- `src/db/` Dexie(IndexedDB) 스키마, 저장소 함수, JSON 백업.
- `src/data/` 내장 식약처 DB 검색.
- `src/components/` 식판 칸, 음식 선택 시트, 폼, 차트 같은 공용 UI.
- `src/screens/` 오늘, 그룹, 음식, 통계, 설정 화면.
- `scripts/` 식약처 데이터 가공, 아이콘 생성.

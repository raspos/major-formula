# 메이저의 공식 | THE MAJOR FORMULA

> 우승에는 공식이 있는가. — databrew SPORTS

남녀 프로골프 메이저대회(현행 9개 + 과거 여자 메이저 3개)의 역대 우승 기록과 라운드별 순위표를 대회 단위로 모아, 우승 연령·54홀 선두 유지율·역전·국가별 패권을 독자가 직접 탐색하는 데이터저널리즘 서비스입니다. 이전 기획 「지배의 기록(eras-of-dominance)」을 메이저대회로 좁혀 새로 만든 프로젝트이며, 기존 프로젝트는 그대로 두었습니다.

## 구성

```
pipeline/mf/        Python 수집·정규화·검증·분석 (표준 라이브러리 + SQLite)
  sources/majors.py   12개 대회 문서의 역대 우승자 표 파서
  sources/editions.py 개별 대회 문서(날짜·파·라운드 순위표) 파서
  wikidata.py         생년월일·국적(위키데이터)
  collect_years.py    개별 대회 문서 일괄 내려받기
  build.py            DB 재구성 → data/db/majors.sqlite, data/processed/*.csv
  validate.py         자동 검증 + 교차검증
  analyze.py          통계 계산 + 웹 데이터 내보내기 → web/public/data/*.json
  report.py           DATA_QUALITY.md 수치 자동 갱신
data/raw/           원본(위키백과·위키데이터 응답) + 메타(판 번호·sha256·시각)
web/                React + TypeScript + Vite + Tailwind + Recharts + d3-geo
tests/              pytest (파서·DB 무결성)  ·  web/src/stats.test.ts (vitest)
```

## 실행

```powershell
$env:PYTHONPATH = "pipeline"
python -m mf.collect_years   # 처음 한 번: 개별 대회 문서 약 800개 (요청 간격 3초, 약 1시간)
python -m mf.build           # DB 재구성 (없는 원본만 내려받음)
python -m mf.validate        # 자동 검증
python -m mf.analyze         # 통계 계산 + web/public/data 내보내기
python -m mf.report          # DATA_QUALITY.md 갱신
python -m pytest -q tests
```

```powershell
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # web/dist (정적 파일)
```

## 배포 (GitHub Pages)

`.github/workflows/pages.yml`이 main 브랜치 push 때 테스트 → `web` 빌드 → Pages 배포를 합니다. 설정 순서:

```powershell
git remote add origin https://github.com/<계정>/major-formula.git
git push -u origin main
```

저장소 Settings → Pages → Source를 **GitHub Actions**로 바꿉니다. `vite.config.ts`의 `base: "./"`라 저장소 이름과 관계없이 동작합니다. 서버가 필요 없습니다.

## 데이터 업데이트

1. 새 메이저가 끝나면 `pipeline/mf/config.py`의 `COLLECTION_CUTOFF`(및 해가 바뀌면 `LAST_SEASON`)를 바꿉니다.
2. `python -m mf.build`(위키백과 대회 문서는 캐시돼 있으므로 바뀐 문서를 받으려면 해당 원본 파일을 지우거나 `fetch(..., refresh=True)`), `validate`, `analyze`, `report` 순서로 실행합니다.
3. 검증 오류가 0인지 확인하고 커밋합니다.

자동 수집(GitHub Actions 예약 실행)은 아직 켜지 않았습니다. 위키백과는 판이 바뀔 수 있어, 갱신 때마다 검증 결과를 사람이 확인하는 편이 안전합니다.

## 문서

[DATA_SOURCES.md](DATA_SOURCES.md) · [DATA_DICTIONARY.md](DATA_DICTIONARY.md) · [METHODOLOGY.md](METHODOLOGY.md) · [DATA_QUALITY.md](DATA_QUALITY.md) · [USER_GUIDE.md](USER_GUIDE.md)

## 라이선스와 출처

우승 기록·성적·국기: 영문 위키백과(Wikipedia contributors, CC BY-SA 4.0). 생년월일: 위키데이터(CC0). 데이터를 재배포할 때는 CC BY-SA 4.0 조건을 따릅니다. 이 사이트의 비율·순위는 자체 계산값이며 주관 기관의 공식 통계가 아닙니다.

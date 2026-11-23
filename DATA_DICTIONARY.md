# DATA_DICTIONARY — 테이블과 필드

DB: `data/db/majors.sqlite` (정의: `pipeline/mf/schema.sql`). 모든 테이블이 `data/processed/*.csv`로도 나간다. 웹사이트는 `web/public/data/*.json`을 읽는다.

**공통 규칙**: 모르는 값은 `NULL`이며 0으로 채우지 않는다. 출처에 없는 기록은 만들지 않는다. 금액은 저장하지만 분석에는 쓰지 않는다.

## 출처 계층
- **sources** — `source_id`, 이름, 발행처, URL, 공식 여부, 약관 요지(`terms`), 접근 상태(`used` / `blocked` / `not_reviewed` / `terms_restrict_reuse` / `consent_required` / `not_accessible`), 용도.
- **raw_fetches** — 내려받은 원본 1건 = 1행. `url`(고유: 중복 수집 방지), `title`, `revid`(위키백과 판 번호), `fetched_at`(UTC), `sha256`, `local_path`(`data/raw/...`), `parse_status`.

## 대회
- **tournaments** — `tournament_id`(masters, us_open, the_open, pga, chevron, us_womens_open, womens_pga, womens_open, evian, western, titleholders, du_maurier), `gender`(M/W), 공식·한글 이름, 위키백과 문서명, `first_held`(창설), `major_from`·`major_to`(메이저 인정 기간), `is_current`(현행 9개 = 1), `host_country`, `note`.
- **tournament_names** — 연도별 당시 대회명(개별 대회 문서 제목에서 연도를 뗀 이름. 예: 1983 Nabisco Dinah Shore).
- **editions** — 대회 1회 = 1행. `edition_id` = `<tournament_id>-<연도>`.

| 필드 | 뜻 |
|---|---|
| status | `held` / `not_held`(미개최, 우승자 없음) / `in_progress_excluded` |
| year_article | 그 대회의 위키백과 문서 제목 |
| end_date, date_basis | 마지막 날(ISO). 근거: `champion table dates`(우승자 표의 날짜) / `infobox dates` / `date range in article`. 모르면 NULL |
| par | 코스 파(개별 문서 인포박스) |
| venue, location, host_country | 개최 골프장, 지역, 개최 국가(대회 단위) |
| format | `stroke` / `match` |
| holes | 진행 홀 수(우승자 라운드 점수 개수 × 18, 없으면 72로 기록하되 매치플레이는 NULL) |
| playoff | 1 = 플레이오프로 결정, 0 = 정규 홀에서 결정, NULL = 모름 |
| margin, margin_text | 우승자와 2위의 타수 차(플레이오프 0), 원문 |
| match_result | 매치플레이 결과 원문(예: `5 & 4`) |
| data_tier | `leaderboard_top`(3라운드·최종 순위표 확보) / `champion_only` / `not_applicable` |
| champion_fetch_id, edition_fetch_id | 원본 추적 |

## 선수
- **players** — `player_id` = `wp:<위키백과 정식 문서명>`(리다이렉트를 따라간 최종 제목, 동명이인은 문서명이 다름) 또는 링크가 없으면 `nm:<정규화 이름>`. `birth_date`, `birth_precision`(day/month/year, 위키데이터), `wikidata_qid`, `image_file`(위키미디어 공용 파일명, 아직 표시하지 않음).
- **player_photos** — 위키미디어 공용 사진. `file`, `thumb`(섬네일 URL), `page`(파일 설명 페이지), `license`, `license_url`, `artist`. 자유 라이선스(CC0·PD·CC BY·CC BY-SA)만 저장한다.
- **nationalities** — 선수가 메이저 결과에서 표시된 국기의 구간. `from_year`·`to_year`, `basis = flag_at_major_result`, `n_obs`. 국적 변경 선수(예: Jim Barnes ENG↔USA, Bernhard Langer FRG→GER)는 여러 행이 된다.

동일인 처리: 위키백과는 표에서 선수를 처음 한 번만 링크한다. 링크 없는 이름은 정규화 키(악센트·대소문자·하이픈 제거, 단어 순서 무시)가 링크된 선수 한 명과만 맞을 때 그 선수로 합친다.

## 결과
- **champions** — 우승자(대회당 1행).

| 필드 | 뜻 |
|---|---|
| nation_code, nation_basis | 우승 당시 국기. 근거: `flag_in_table`(대회 표의 국기) / `wikidata_citizenship`(표에 국기가 없을 때 위키데이터 현재 국적, 우승 당시와 다를 수 있음) / `unknown` |
| amateur | 표에 `(a)` 표시가 있으면 1 |
| win_number_in_event | 표에 적힌 "(n)" = 그 대회 n번째 우승 |
| total, to_par | 총타수, 기준 타수 대비 |
| r1–r4, rounds_basis | 우승자 라운드 점수와 출처(`champion_table` / `edition_article`) |
| age_days, age_years, age_precision | 우승 당시 나이. `day` = 마지막 날 − 생년월일, `year` = 연도 차(±1세) |

- **results** — 대회 최종 순위(출처에 실린 상위권만). `position`, `tied`, `place_text`(T3 등), `total`, `to_par`, `nation_code`, `source`(`champion_table` = 우승자 표의 우승자·준우승자 / `edition_article` = 개별 문서의 최종 순위표).
- **round_standings** — 1~3라운드 종료 순위표(출처에 실린 상위권). `after_round`, `position`, `tied`, `total`, `to_par`. **54홀 선두는 `after_round = 3`의 최소 타수다.**
- **rounds** — 선수별 라운드 점수(`round_no`, `strokes`, `source`).

## 검증·분석
- **crosscheck** — 두 번째 출처와의 비교(`ours`, `theirs`, `agree`).
- **analysis** — 계산된 지표(`metric_id`, `scope`, `value`, `n` 표본 수, `period`, `formula`).
- **validation_log** — 자동 검증 결과. 고치지 않고 기록만 한다.

## 웹 데이터 (`web/public/data/`)
- `editions.json` — editions + 우승자 + 준우승자 + `lead54`(54홀 계산값: `leaders`, `lead_total`, `solo`, `lead_margin`, `champion_54`, `deficit`, `champion_led`, `board_size`).
- `players.json`, `tournaments.json`, `nations.json`(국가 코드 → 한·영 이름), `boards.json`(대회별 54홀·최종 순위표), `meta.json`(확보율, 출처, 검증 건수, 요약 지표).

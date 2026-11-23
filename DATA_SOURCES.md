# DATA_SOURCES — 원자료 출처와 접근 조건

조사일 2026-11-22. 2026년 대회는 이날까지 끝난 결과만 반영한다(남녀 메이저 9개 모두 8월 이전에 끝나 2026년분은 전부 포함).

## 1. 결론

공식 주관 기관 사이트는 자동 수집이 막혀 있거나 이용 약관이 재사용을 허락하지 않았다. 그래서 **영문 위키백과(CC BY-SA 4.0)를 기본 출처**로, **위키데이터(CC0)를 생년월일 출처**로 썼다. 공식 기록과의 대조는 이번 단계에서 하지 못했다. 대신 위키백과 안의 서로 다른 문서끼리 교차검증했다(DATA_QUALITY.md).

## 2. 공식 출처 조사 결과

| 기관 / 사이트 | 확인한 것 | 결과 | 사용 |
|---|---|---|---|
| Masters Tournament (masters.com) | 역대 챔피언 페이지 | 정적 HTML이 3KB짜리 앱 껍데기뿐(자바스크립트로만 렌더링). 약관 페이지도 같은 상태라 읽을 수 없음 | 사용 안 함 |
| USGA (US오픈·US여자오픈) | 대회 페이지, 약관 | **HTTP 403**(스크립트 요청 차단). uswomensopen.com도 403 | 사용 안 함, 우회하지 않음 |
| PGA of America (PGA 챔피언십·KPMG 여자 PGA) | 역사 페이지, pga.com 약관 | 역사 페이지는 접속됨(200). 약관 페이지가 403이라 재사용 조건을 확인할 수 없음 | 사용 안 함 |
| The R&A (디 오픈·AIG 여자오픈) | Previous Opens, 웹사이트 약관 | 약관: 콘텐츠는 **개인적·비상업적 이용만**, 출처 표기, 그 밖의 복제 금지 | 사용 안 함 |
| LPGA (lpga.com, Media Center) | 약관 §2.1 | 데이터베이스를 만들기 위한 체계적 수집은 서면 동의 없이 금지. LPGA 통계 DB는 로그인 필요 | 사용 안 함 |
| Evian Championship | 사이트 접속 | 접속됨(amundi.evianchampionship.com). 약관 미검토 | 사용 안 함 |
| Chevron Championship | 사이트 접속 | 연결 실패(2026-11-22) | 사용 안 함 |
| PGA Tour 통계 | robots.txt | 남자 메이저 4개만 관련, 이번 단계에서는 검토 안 함 | 사용 안 함 |

로그인·유료 인증·차단을 우회한 요청은 하나도 없다.

## 3. 실제로 쓴 출처

| source_id | 무엇 | 라이선스 | 무엇에 썼나 |
|---|---|---|---|
| `wikipedia` | 각 대회 문서의 역대 우승자 표(12개 문서) | CC BY-SA 4.0 | 연도, 우승자, 우승 당시 국기, 총타수, 기준 타수 대비, 타수 차, 플레이오프, 준우승자, 개최지, 경기 날짜(여자 대회 일부) |
| `wikipedia` | 개별 대회 문서(예: 「1986 Masters Tournament」) 약 800개 | CC BY-SA 4.0 | 대회 날짜, 파, 1~3라운드 종료 순위표, 최종 순위표(상위권), 라운드별 점수 |
| `wikipedia` | 「List of men's major championships winning golfers」, 「List of LPGA major championship winning golfers」 | CC BY-SA 4.0 | 선수×대회 우승 횟수 교차검증 |
| `wikidata` | 선수 항목의 생년월일(P569), 국적(P27), 이미지 파일명(P18) | CC0 | 우승 당시 나이, 국기가 없는 표(여자 웨스턴 오픈)의 보조 국적 |
| `commons` | 위키미디어 공용의 선수 사진(위키데이터 P18 파일) | 파일별: CC0·퍼블릭 도메인·CC BY·CC BY-SA만 채택 | 선수 사진(촬영자·라이선스·원본 링크 표시, 섬네일은 공용 서버에서 불러옴) |

12개 대회 문서: Masters Tournament, U.S. Open (golf), The Open Championship, PGA Championship, Chevron Championship, U.S. Women's Open, Women's PGA Championship, Women's British Open, The Evian Championship, Titleholders Championship, Women's Western Open, Du Maurier Classic(→ Canadian Women's Open).

모든 원본은 `data/raw/`에 그대로 보관한다. `raw_fetches` 테이블에 URL, 위키백과 판 번호(revid), sha256, 수집 시각이 있어 어떤 판을 읽었는지 재현할 수 있다.

## 4. 메이저 인정 기간 (위키백과 「Men's / Women's major golf championships」 기준)

| 대회 | 창설 | 메이저 인정 | 비고 |
|---|---|---|---|
| 디 오픈 | 1860 | 1860– | 1871년 미개최, 세계대전·2020 코로나 미개최 |
| US오픈 | 1895 | 1895– | 1917–18, 1942–45 미개최 |
| PGA 챔피언십 | 1916 | 1916– | **1916–1957 매치플레이, 1958년부터 스트로크플레이**. 1917–18, 1943 미개최 |
| 마스터스 | 1934 | 1934– | 1943–45 미개최 |
| 여자 웨스턴 오픈 | 1930 | 1930–1967 | 1954년까지 매치플레이 |
| 타이틀홀더스 | 1937 | 1937–1972 | 1943–45, 1967–71 미개최 |
| US여자오픈 | 1946 | 1946– | 1946년 매치플레이 |
| 여자 PGA 챔피언십 | 1955 | 1955– | 1955년 매치플레이 |
| 뒤모리에 클래식 | 1973 | 1979–2000 | 캐나다 여자오픈 |
| 셰브론 챔피언십 | 1972 | **1983–** | 다이나 쇼어·나비스코·크래프트 나비스코·ANA 인스퍼레이션 |
| AIG 여자오픈 | 1976 | **2001–** (LPGA 메이저) | |
| 에비앙 챔피언십 | 1994 | **2013–** | 2020년 미개최, 2013년 54홀 |

메이저 인정 이전 연도(예: 셰브론 1972–82)는 데이터베이스에 넣지 않는다.

## 5. 출처 표기

이 데이터를 쓰거나 다시 배포할 때는 "Wikipedia contributors, CC BY-SA 4.0"을 밝히고 같은 조건으로 공유해야 한다. 위키데이터 값(CC0)은 조건이 없다.

## 6. PHASE 2 — 선수 통산 기록·신체·기술 통계 (2026-11-23 조사)

| 필요한 자료 | 확인한 출처 | 결과 | 사용 |
|---|---|---|---|
| 투어 통산 공식 우승(PGA 투어·LPGA 투어) | PGA Tour 선수 프로필(pgatour.com), LPGA 선수 프로필 | pgatour.com 약관 페이지 404로 재사용 조건 확인 불가, 통계 화면은 자바스크립트 렌더링. lpga.com은 약관 §2.1로 자동 수집 금지 | 사용 안 함 |
| 같은 자료 (대체) | **선수별 영문 위키백과 문서**: 인포박스 `pga_wins`/`lpga_wins`·`pro_wins`, 「PGA/LPGA Tour wins (N)」 표·목록, 「Summary」 표 | 메이저 우승자 382명 문서 수집 | 사용 (CC BY-SA, 2차 자료) |
| 신장·몸무게 | 투어 공식 프로필(위와 같은 이유로 불가) → 위키백과 인포박스, 없으면 위키데이터 P2048/P2067 | 측정 시점이 적혀 있지 않음 | 사용, `verification_status = listed_undated` |
| 시즌 기술 통계(비거리·정확도·GIR·스크램블링·퍼트·SG) | PGA Tour Stats, LPGA Stats & Rankings, LPGA Statistical Database | PGA Tour는 이용 조건 미확인·비공개 API, LPGA는 약관상 자동 수집 금지. LPGA 통계 DB는 로그인 자격과 내부 저장·파생 지수 공개 허락이 있으나(지배의 기록 프로젝트) 사용자가 직접 내려받아야 함 | **미수집** — `player_season_stats`, `player_styles` 테이블은 비어 있음 |
| 시즌 기술 통계 (대체) | Data Golf, Sportradar 등 | 유료·계약 필요 | 사용 안 함 |

투어 통산 승수는 투어별로만 기록한다. PGA 투어와 DP 월드투어 등 다른 투어 승수를 더하지 않으며, 모든 투어를 합친 프로 통산 승수(`worldwide_pro_wins`)는 별도 필드로만 둔다.

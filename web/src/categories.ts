export const CATEGORIES = [
  {
    slug: "players",
    kicker: "THE PLAYERS",
    title: "선수와 전설",
    summary: "역대 최고 선수부터 메이저에 강한 골퍼의 특징까지.",
    items: [
      { to: "/goat", title: "GOAT OF GOATs", detail: "메이저·통산 우승과 전성기 기록으로 나만의 순위를 만듭니다." },
      { to: "/specialist", title: "메이저 스페셜리스트", detail: "투어 통산 우승 중 메이저가 차지하는 비중을 비교합니다." },
      { to: "/champion-dna", title: "챔피언의 DNA", detail: "신체 조건과 경기 기술 자료로 선수 스타일을 살펴봅니다." },
      { to: "/versus", title: "전설의 대결", detail: "서로 다른 두 선수의 메이저 기록을 직접 비교합니다." },
      { to: "/legends", title: "메이저의 지배자", detail: "역대 다승, 전성기, 시대별 최강자의 기록을 확인합니다." },
    ],
  },
  {
    slug: "formula",
    kicker: "THE FORMULA",
    title: "우승의 조건",
    summary: "메이저 우승자에게 반복되는 패턴을 데이터로 검증합니다.",
    items: [
      { to: "/formula", title: "우승의 공식", detail: "우승 연령, 54홀 선두 유지율, 역전 우승을 조건별로 분석합니다." },
      { to: "/dna", title: "메이저 DNA", detail: "각 메이저대회의 우승 연령, 역전 빈도, 플레이오프를 비교합니다." },
    ],
  },
  {
    slug: "history",
    kicker: "THE ARCHIVE",
    title: "역사와 기록",
    summary: "시대별 패권 변화와 오래 기억할 만한 메이저의 순간들.",
    items: [
      { to: "/nations", title: "미국 vs 세계", detail: "미국과 비미국 국가들의 패권 변화, 아시아의 부상을 살펴봅니다." },
      { to: "/records", title: "역대 명승부", detail: "역전 폭, 최저타, 나이 등 다양한 기준으로 기록을 찾아봅니다." },
      { to: "/archive", title: "역사 아카이브", detail: "연도와 대회를 골라 역대 챔피언과 성적을 탐색합니다." },
    ],
  },
] as const;

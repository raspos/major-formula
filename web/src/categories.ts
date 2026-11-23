export const CATEGORIES = [
  {
    slug: "legends",
    kicker: "THE LEGENDS",
    title: "전설과 GOAT",
    summary: "역대 최고 선수와 전설들의 메이저 기록.",
    items: [
      { to: "/goat", title: "GOAT OF GOATs", detail: "메이저·통산 우승·전성기를 기준으로 선수를 비교합니다." },
      { to: "/versus", title: "전설의 대결", detail: "두 선수의 메이저 기록을 직접 비교합니다." },
      { to: "/legends", title: "메이저의 지배자", detail: "다승·전성기·시대별 지배력을 살펴봅니다." },
    ],
  },
  {
    slug: "players",
    kicker: "THE PLAYERS",
    title: "선수의 조건",
    summary: "메이저에 강한 선수와 챔피언의 신체적 특성.",
    items: [
      { to: "/specialist", title: "메이저 스페셜리스트", detail: "통산 우승 중 메이저 우승 비중을 분석합니다." },
      { to: "/champion-dna", title: "챔피언의 DNA", detail: "우승자의 신체 조건과 선수 스타일을 분석합니다." },
    ],
  },
  {
    slug: "formula",
    kicker: "THE FORMULA",
    title: "우승의 공식",
    summary: "우승 연령과 선두 유지, 역전 우승의 패턴.",
    items: [
      { to: "/formula", title: "우승의 공식 분석", detail: "우승 연령과 54홀 선두·역전 우승 기록을 비교합니다." },
      { to: "/dna", title: "메이저 DNA", detail: "대회별 우승·역전·플레이오프 기록을 비교합니다." },
    ],
  },
  {
    slug: "history",
    kicker: "THE ARCHIVE",
    title: "역사와 기록",
    summary: "국가별 패권과 역대 명승부, 메이저 아카이브.",
    items: [
      { to: "/nations", title: "미국 vs 세계", detail: "국가별 메이저 우승 점유율 변화를 추적합니다." },
      { to: "/records", title: "역대 명승부", detail: "최대 역전·최저 타수·플레이오프 기록을 찾습니다." },
      { to: "/archive", title: "역사 아카이브", detail: "연도와 대회로 메이저 우승자 기록을 탐색합니다." },
    ],
  },
] as const;

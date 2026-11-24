// Editorial facts for the nine current majors. Numbers (editions, wins) are computed from the
// database at render time; only verified history lives here (sources: each event's English
// Wikipedia article, revisions fetched 2026-11-23/24, stored under data/raw/wikipedia).
export type MajorInfo = {
  id: string;
  host: string;      // venue or rotation
  intro: string;     // 70–120 Korean characters
  official?: string;
};

export const MAJORS_INFO: Record<string, MajorInfo> = {
  masters: {
    id: "masters",
    host: "오거스타 내셔널 골프클럽 (매년 같은 코스)",
    intro: "남자 메이저 가운데 유일하게 매년 같은 코스에서 열리고, 국가 협회가 아닌 사설 클럽이 주관한다. 1949년부터 우승자에게 그린재킷을 입히며, 재킷은 1년 뒤 클럽에 돌려준다.",
    official: "https://www.masters.com",
  },
  pga: {
    id: "pga",
    host: "미국 내 코스 순회 · PGA 오브 아메리카 주관",
    intro: "1916년부터 1957년까지는 매치플레이로 우승자를 가렸고 1958년 스트로크플레이로 바뀌었다. 출전 156명 중 20자리를 클럽 프로에게 배정하는 유일한 메이저다.",
    official: "https://www.pgachampionship.com",
  },
  us_open: {
    id: "us_open",
    host: "미국 내 코스 순회 · USGA 주관",
    intro: "1895년 뉴포트CC의 9홀 코스에서 하루 36홀 경기로 시작했다. 정확한 티샷을 요구하도록 점수가 잘 나지 않게 코스를 세팅하는 것이 전통이며, 2017년까지는 동타 때 다음 날 18홀 연장을 치렀다.",
    official: "https://www.usopen.com",
  },
  the_open: {
    id: "the_open",
    host: "영국 해안 링크스 순회 · R&A 주관",
    intro: "1860년 프레스트윅에서 시작된 세계에서 가장 오래된 골프 대회다. 영국 해안의 링크스 코스를 돌아가며 열고, 우승자는 '올해의 챔피언 골퍼'로 불리며 1872년부터 클라렛 저그를 받는다.",
    official: "https://www.theopen.com",
  },
  chevron: {
    id: "chevron",
    host: "미션힐스CC(1972–2022) → 휴스턴 지역(2023–)",
    intro: "1972년 가수 다이나 쇼어가 창설해 1983년 메이저가 됐다. 2022년까지 미션힐스CC에서 열렸고, 1988년 에이미 올컷이 시작한 18번 홀 연못 다이빙은 장소를 옮긴 뒤에도 우승 세리머니로 남았다.",
  },
  us_womens_open: {
    id: "us_womens_open",
    host: "미국 내 코스 순회 · USGA 주관(1953–)",
    intro: "1946년 창설됐다. 첫 3년은 WPGA, 다음 4년은 LPGA가 운영했고 1953년부터 USGA가 주관한다. LPGA는 창립 때부터 이 대회를 메이저로 인정해 왔으며, 남자 US오픈처럼 매년 개최 코스가 바뀐다.",
  },
  womens_pga: {
    id: "womens_pga",
    host: "미국 내 코스 순회 · PGA 오브 아메리카 공동 운영(2015–)",
    intro: "1955년 LPGA 챔피언십으로 출발했다. 2015년부터 PGA 오브 아메리카가 운영에 참여하면서 KPMG 여자 PGA 챔피언십으로 이름을 바꿨고, 남자 PGA 챔피언십처럼 해마다 개최지가 바뀐다.",
    official: "https://www.kpmgwomenspgachampionship.com",
  },
  womens_open: {
    id: "womens_open",
    host: "영국 링크스 순회 · R&A 주관",
    intro: "1976년 여자골프연맹(LGU)이 아마추어 대회를 프로에게 개방하며 시작됐고 2001년 LPGA 메이저가 됐다. 2007년 처음 세인트앤드루스 올드코스에서 열리는 등 디오픈 개최 링크스를 순회한다.",
    official: "https://www.aigwomensopen.com",
  },
  evian: {
    id: "evian",
    host: "에비앙 리조트 골프클럽 (매년 같은 코스)",
    intro: "1994년 에비앙 마스터스로 시작해 2013년 LPGA의 다섯 번째 메이저가 됐다. 9월로 옮겼던 2017년 대회가 54홀로 줄어든 뒤 2019년부터 다시 7월에 열린다.",
    official: "https://www.evianchampionship.com",
  },
};

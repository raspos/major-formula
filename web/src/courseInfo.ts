// Major venues. Each course has a canonical id and the exact venue strings used in
// editions.json (aliases) — matching is by exact alias, never substring, so e.g.
// "Augusta Country Club" (Titleholders) is not counted as Augusta National.
// Facts: English Wikipedia course articles (revisions fetched 2026-11-23), official sites linked.
import { COURSES, type CoursePhoto } from "./courses";

export type CourseInfo = {
  id: string;
  name: string;          // Korean display name
  official_name: string; // official English name
  location: string;
  opened: string;        // as stated by the source; "자료 미확인" if not verified
  design: string[];
  type: string;
  aliases: string[];     // exact editions.venue strings
  features: { title: string; text: string }[];
  url: string;
  photo?: CoursePhoto;
};

export const COURSE_INFO: CourseInfo[] = [
  {
    id: "augusta",
    name: "오거스타 내셔널 골프클럽",
    official_name: "Augusta National Golf Club",
    location: "미국 조지아주 오거스타",
    opened: "1932년",
    design: ["보비 존스 · 앨리스터 매켄지"],
    type: "사설 클럽 · 내륙 코스",
    aliases: ["Augusta National Golf Club"],
    features: [
      { title: "고저차", text: "옛 묘목장 '프루트랜즈' 부지에 지었다. 코스 안 표고가 약 49m에서 94m까지 달라 오르막·내리막 샷이 이어진다." },
      { title: "아멘 코너", text: "래스 크리크가 지나는 11번 홀 두 번째 샷부터 12번, 13번 홀 첫 두 샷까지. 1958년 허버트 워런 윈드가 처음 이 이름을 썼다." },
      { title: "그린재킷", text: "18번 홀 옆 버틀러 캐빈에서 우승자에게 그린재킷을 입힌다." },
    ],
    url: "https://www.masters.com",
    photo: COURSES.augusta,
  },
  {
    id: "standrews",
    name: "세인트앤드루스 올드코스",
    official_name: "The Old Course, St Andrews",
    location: "영국 스코틀랜드 파이프 세인트앤드루스",
    opened: "1552년 기록",
    design: ["자연 발생 링크스", "올드 톰 모리스(1·18번 홀)"],
    type: "공공 링크스 · 해안",
    aliases: ["St Andrews"],
    features: [
      { title: "더블 그린", text: "그린 7개를 두 홀이 함께 쓰고 단독 그린은 4개뿐이다. 19세기까지는 시계 방향으로 돌았다." },
      { title: "벙커 112개", text: "이름이 붙은 벙커가 많다. 17번 '로드 홀'의 로드 벙커가 대표적이다." },
      { title: "죄의 계곡", text: "18번 그린 앞 깊이 약 2.4m 움푹한 지대. 같은 홀 페어웨이를 스윌칸 다리가 가로지른다." },
    ],
    url: "https://www.standrews.com",
    photo: COURSES.standrews,
  },
  {
    id: "pebble",
    name: "페블비치 골프 링크스",
    official_name: "Pebble Beach Golf Links",
    location: "미국 캘리포니아주 페블비치 (몬터레이반도)",
    opened: "1919년",
    design: ["잭 네빌 · 더글러스 그랜트(1919)", "아널드 파머 · 새드 레이턴(2016 개보수)"],
    type: "퍼블릭 · 해안",
    aliases: ["Pebble Beach", "Pebble Beach Golf Links"],
    features: [
      { title: "해안선", text: "몬터레이반도 남쪽, 태평양으로 열린 카멜만의 거친 해안선을 따라 홀이 놓였다." },
      { title: "18번 파5", text: "바다를 끼고 도는 마지막 홀. 1982년 US오픈에서 톰 왓슨이 이 홀 버디로 2타 차 우승을 굳혔다." },
      { title: "순회 대회의 단골", text: "고정 개최지가 아니라 US오픈이 돌아가며 찾는 코스 가운데 하나다. 2001년 골프다이제스트 미국 1위에 오른 첫 퍼블릭 코스." },
    ],
    url: "https://www.pebblebeach.com/golf/pebble-beach-golf-links/",
    photo: COURSES["pebble-bay"],
  },
  {
    id: "shinnecock",
    name: "시네콕 힐스 골프클럽",
    official_name: "Shinnecock Hills Golf Club",
    location: "미국 뉴욕주 사우샘프턴",
    opened: "1891년",
    design: ["윌리 데이비스(1891) · 윌리 던(1894) · C. B. 맥도널드(1901)", "윌리엄 플린(1931)", "쿠어 · 크렌쇼(2013 복원)"],
    type: "사설 클럽 · 링크스풍",
    aliases: ["Shinnecock Hills"],
    features: [
      { title: "미국 골프의 뿌리", text: "1894년 USGA를 만든 5개 클럽 중 하나이고, 1892년 문을 연 미국 첫 골프 클럽하우스로 꼽히는 건물이 있다." },
      { title: "바람", text: "1931년 플린의 설계는 홀을 여러 방향으로 놓아, 같은 바람이 홀마다 다른 방향에서 분다." },
      { title: "2004년 7번 홀", text: "메마른 날씨에 단단해진 그린, 특히 파3 7번 그린이 경기하기 어려울 만큼 단단해져 논란이 됐다." },
    ],
    url: "https://www.shinnecockhillsgolfclub.org",
    photo: COURSES.shinnecock,
  },
  {
    id: "evian",
    name: "에비앙 리조트 골프클럽",
    official_name: "Evian Resort Golf Club",
    location: "프랑스 오트사부아 에비앙레뱅",
    opened: "자료 미확인",
    design: ["스티브 스마이어스 · 유러피언 골프 디자인(2012–13 전면 개보수)"],
    type: "리조트 · 산악 경사지",
    aliases: ["Evian Resort Golf Club"],
    features: [
      { title: "레만호 경사지", text: "평균 해발 약 480m 비탈에 자리 잡아 북쪽으로 레만호를 내려다본다." },
      { title: "개보수", text: "메이저 승격에 맞춰 2012–13년 티·페어웨이·그린·벙커를 모두 손봤다." },
      { title: "바운스 논란", text: "경사 탓에 좋은 샷도 불운한 바운스를 맞는다는 비판이 있었다(렉시 톰프슨)." },
    ],
    url: "https://www.evianchampionship.com",
    photo: COURSES.evian,
  },
];

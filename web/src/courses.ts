// Course landscape photos (Wikimedia Commons, free licences). Files live in public/courses/.
export type CoursePhoto = { key: string; src: string; course: string; event: string; artist: string; license: string; page: string };

const C = (key: string, file: string, course: string, event: string, artist: string, license: string): CoursePhoto => ({
  key, src: `courses/${key}.jpg`, course, event, artist, license,
  page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(file.replace(/ /g, "_"))}`,
});

export const COURSES: Record<string, CoursePhoto> = Object.fromEntries([
  C("augusta", "File:Augusta National Golf Club, Hole 10 (Camellia) - cropped.jpg", "오거스타 내셔널 10번 홀", "마스터스", "Mbrooks", "퍼블릭 도메인"),
  C("standrews", "File:R&A Clubhouse, Old Course, Swilcan Burn bridge.jpg", "세인트앤드루스 올드코스", "디 오픈", "Optograph", "CC BY-SA 3.0"),
  C("pebble-bay", "File:Pebble Beach Golf Links, 18th green.jpg", "페블비치 18번 홀", "US 오픈", "WilliamFMeyer", "CC BY-SA 4.0"),
  C("pebble-cliff", "File:Pebble Beach 6th hole.jpg", "페블비치 6번 홀", "US 오픈", "Bernard Gagnon", "CC BY-SA 3.0"),
  C("oldcourse", "File:The Old Course, St Andrews-Geograph-3632139-by-Neil-Theasby.jpg", "세인트앤드루스", "디 오픈", "Neil Theasby", "CC BY-SA 2.0"),
  C("shinnecock", "File:Shinnecock Hills GC 03.jpg", "시네콕 힐스", "US 오픈", "Peetlesnumber1", "CC BY-SA 4.0"),
  C("pebble-green", "File:Pebble Beach Golf Links 02.jpg", "페블비치", "US 오픈", "Tewy", "CC BY 2.5"),
].map((c) => [c.key, c]));

export const courseCredit = (c: CoursePhoto) => `${c.course} · ${c.artist} · ${c.license}`;

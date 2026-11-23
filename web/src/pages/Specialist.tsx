import { useMemo, useState } from "react";
import { useData } from "../data";
import { legends, pct, type Legend } from "../stats";
import { Empty, Pill, PlayerLink, Section } from "../ui";

function Ranking({ title, rows, value, fmt, extra }: { title: string; rows: Legend[]; value: (l: Legend) => number | null; fmt: (l: Legend) => string; extra: (l: Legend) => string }) {
  const list = rows.filter((l) => value(l) !== null).sort((a, b) => value(b)! - value(a)! || b.majors - a.majors).slice(0, 12);
  return (
    <div className="card p-4">
      <div className="font-serif font-bold text-green-deep">{title}</div>
      <div className="mb-2 text-[11px] text-charcoal-soft">대상 {rows.filter((l) => value(l) !== null).length}명</div>
      {list.length ? (
        <ol className="space-y-1 text-sm">
          {list.map((l, i) => (
            <li key={l.p.player_id} className="flex justify-between gap-2">
              <span><span className="num mr-1 text-charcoal-soft">{i + 1}</span><PlayerLink id={l.p.player_id} name={l.p.name} /></span>
              <span className="num whitespace-nowrap"><b>{fmt(l)}</b> <span className="text-xs text-charcoal-soft">{extra(l)}</span></span>
            </li>
          ))}
        </ol>
      ) : <Empty>계산할 수 있는 선수가 없습니다.</Empty>}
    </div>
  );
}

export default function Specialist() {
  const { editions, players } = useData();
  const [gender, setGender] = useState<"M" | "W">("M");
  const all = useMemo(() => legends(editions, players, gender, "all"), [editions, players, gender]);
  const ok = all.filter((l) => l.share !== null && l.tourWins !== null);
  return (
    <Section kicker="Major specialist" title="메이저에 유난히 강한 선수" note="메이저 우승 비중 = 투어 공식 승수로 인정된 메이저 우승 ÷ 투어 통산 공식 승수(남자 PGA 투어, 여자 LPGA 투어). 다른 투어 승수는 더하지 않습니다. 비중은 통산 5승·10승 이상만 순위에 넣어 ‘1승이 메이저라 100%’ 같은 경우를 막습니다. 출전당 우승률·톱10 진입률은 선수 문서 Summary 표의 메이저 출전 수가 20회 이상인 선수만 계산합니다. ‘일반 대회 우승률과 메이저 우승률의 차이’는 투어 전체 출전 수 자료가 없어 계산하지 않았습니다.">
      <div className="flex gap-2">
        <Pill active={gender === "M"} onClick={() => setGender("M")}>남자</Pill>
        <Pill active={gender === "W"} onClick={() => setGender("W")}>여자</Pill>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Ranking title="메이저 우승 비중 — 투어 통산 5승 이상" rows={ok.filter((l) => l.tourWins! >= 5)} value={(l) => l.share} fmt={(l) => pct(l.share, 1)} extra={(l) => `${Math.round(l.share! * l.tourWins!)}/${l.tourWins}`} />
        <Ranking title="메이저 우승 비중 — 투어 통산 10승 이상" rows={ok.filter((l) => l.tourWins! >= 10)} value={(l) => l.share} fmt={(l) => pct(l.share, 1)} extra={(l) => `${Math.round(l.share! * l.tourWins!)}/${l.tourWins}`} />
        <Ranking title="메이저 출전당 우승률 (출전 20회 이상)" rows={all} value={(l) => l.winPerStart} fmt={(l) => pct(l.winPerStart, 1)} extra={(l) => `${l.starts}회 출전`} />
        <Ranking title="메이저 톱10 진입률 (출전 20회 이상)" rows={all} value={(l) => l.top10Rate} fmt={(l) => pct(l.top10Rate)} extra={(l) => `${l.starts}회 출전`} />
      </div>
      <p className="mt-4 text-xs text-charcoal-soft">메이저 우승자 {all.length}명 중 {ok.length}명 계산</p>
    </Section>
  );
}

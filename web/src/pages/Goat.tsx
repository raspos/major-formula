import { useMemo, useState } from "react";
import { useData } from "../data";
import { legends, num, pct, percentiles, type Legend } from "../stats";
import { NationTag, PhotoCredit, Pill, PlayerLink, Portrait, Section } from "../ui";
import type { Mode } from "../types";

type Crit = { id: string; label: string; get: (l: Legend) => number | null; fmt: (l: Legend) => string };

const CRITERIA: Crit[] = [
  { id: "majors", label: "메이저 우승", get: (l) => l.majors, fmt: (l) => `${l.majors}승` },
  { id: "tour", label: "투어 통산 우승", get: (l) => l.tourWins, fmt: (l) => (l.tourWins === null ? "—" : `${l.tourWins}승`) },
  { id: "share", label: "메이저 우승 비중", get: (l) => l.share, fmt: (l) => pct(l.share, 1) },
  { id: "wps", label: "메이저 출전당 우승률", get: (l) => l.winPerStart, fmt: (l) => pct(l.winPerStart, 1) },
  { id: "top10", label: "메이저 톱10 진입률", get: (l) => l.top10Rate, fmt: (l) => pct(l.top10Rate) },
  { id: "prime", label: "전성기 5년 메이저 우승", get: (l) => l.best5, fmt: (l) => `${l.best5}승` },
  { id: "span", label: "장기 지배력(첫~마지막 우승 햇수)", get: (l) => l.span, fmt: (l) => `${l.span}년` },
  { id: "slam", label: "커리어 그랜드슬램", get: (l) => (l.slam ? 1 : 0), fmt: (l) => (l.slam ? "달성" : "—") },
];
const DEFAULT: Record<string, number> = { majors: 3, tour: 1, share: 1, wps: 1, top10: 1, prime: 2, span: 1, slam: 1 };

export default function Goat() {
  const { editions, players } = useData();
  const [gender, setGender] = useState<"M" | "W" | "all">("M");
  const [mode, setMode] = useState<Mode>("current");
  const [minMajors, setMinMajors] = useState(3);
  const [w, setW] = useState<Record<string, number>>(DEFAULT);
  const rows = useMemo(() => legends(editions, players, gender, mode).filter((l) => l.majors >= minMajors), [editions, players, gender, mode, minMajors]);
  const scored = useMemo(() => {
    const pc: Record<string, (number | null)[]> = {};
    CRITERIA.forEach((c) => (pc[c.id] = percentiles(rows.map(c.get))));
    return rows
      .map((l, i) => {
        let s = 0, ws = 0;
        const missing: string[] = [];
        for (const c of CRITERIA) {
          if (!w[c.id]) continue;
          const v = pc[c.id][i];
          if (v === null) missing.push(c.label);
          else { s += w[c.id] * v; ws += w[c.id]; }
        }
        return { l, score: ws ? s / ws : null, missing };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.l.majors - a.l.majors);
  }, [rows, w]);
  const top = scored.slice(0, 4);

  return (
    <>
      <Section kicker="GOAT of GOATs" title="역사상 가장 위대한 메이저 골퍼는?" note="이 순위는 서비스가 자체 계산한 결과이며 공식 순위가 아닙니다. 각 기준을 후보 선수들 사이의 백분위(0~100)로 바꾼 뒤 가중 평균합니다. 값이 없는 기준은 그 선수의 평균에서 빠지고 ‘빠진 기준’에 표시됩니다. 메이저 우승 비중은 투어 공식 승수에 포함된 메이저만 분자로 세며, 정의가 맞지 않는 선수는 비워 둡니다. 출전당 우승률·톱10 진입률은 메이저 출전 20회 이상만 계산합니다. 여자 그랜드슬램은 서로 다른 메이저 4개 우승 기준입니다.">
        <div className="flex flex-wrap items-center gap-2">
          <Pill active={gender === "M"} onClick={() => setGender("M")}>남자</Pill>
          <Pill active={gender === "W"} onClick={() => setGender("W")}>여자</Pill>
          <Pill active={gender === "all"} onClick={() => setGender("all")}>남녀 통합</Pill>
          <span className="mx-2 h-5 w-px bg-charcoal/20" />
          <Pill active={mode === "current"} onClick={() => setMode("current")}>현행 메이저</Pill>
          <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 메이저 포함</Pill>
          <label className="ml-2 flex items-center gap-1 text-sm">메이저
            <select value={minMajors} onChange={(e) => setMinMajors(+e.target.value)}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}승 이상</option>)}</select>
          </label>
        </div>
        {gender === "all" && <p className="mt-2 text-xs text-charcoal-soft">⚠ 남녀는 메이저 수·투어 규모가 달라 직접 비교에 한계가 있습니다.</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {top.map(({ l, score }, i) => (
            <div key={l.p.player_id} className="card p-4">
              <div className="flex items-center gap-3">
                <Portrait name={l.p.name} size={64} src={l.p.photo?.thumb} />
                <div>
                  <div className="text-xs text-gold">#{i + 1} · {num(score, 0)}점</div>
                  <div className="font-serif text-lg font-bold"><PlayerLink id={l.p.player_id} name={l.p.name} /></div>
                </div>
              </div>
              <div className="num mt-2 text-xs text-charcoal-soft">메이저 {l.majors} · 투어 {l.tourWins ?? "—"} · 비중 {pct(l.share, 1)}</div>
              <PhotoCredit pid={l.p.player_id} className="mt-1" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="card p-4 text-sm">
            <div className="mb-2 font-medium">기준별 가중치</div>
            {CRITERIA.map((c) => (
              <label key={c.id} className="mb-2 block">
                <span className="flex justify-between text-xs"><span>{c.label}</span><span className="num">{w[c.id]}</span></span>
                <input type="range" min={0} max={5} value={w[c.id]} onChange={(e) => setW({ ...w, [c.id]: +e.target.value })} className="w-full" />
              </label>
            ))}
            <button className="mt-1 text-xs underline" onClick={() => setW(DEFAULT)}>기본값으로</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>#</th><th>선수</th><th>점수</th>{CRITERIA.filter((c) => w[c.id]).map((c) => <th key={c.id}>{c.label}</th>)}<th>빠진 기준</th></tr></thead>
              <tbody>
                {scored.map(({ l, score, missing }, i) => (
                  <tr key={l.p.player_id}>
                    <td className="num">{i + 1}</td>
                    <td className="whitespace-nowrap"><PlayerLink id={l.p.player_id} name={l.p.name} /> {l.p.wins[0] && <NationTag code={l.p.wins[0].nation_code} />}</td>
                    <td className="num font-bold text-green-deep">{num(score, 0)}</td>
                    {CRITERIA.filter((c) => w[c.id]).map((c) => <td key={c.id} className="num">{c.fmt(l)}</td>)}
                    <td className="text-[11px] text-charcoal-soft">{missing.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-charcoal-soft">후보 {rows.length}명</p>
          </div>
        </div>
      </Section>
    </>
  );
}

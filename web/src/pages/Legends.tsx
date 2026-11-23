import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData, playerSlug } from "../data";
import { isHeld, num, playerStats, type PlayerStat } from "../stats";
import { NationTag, Pill, PlayerLink, Section, TournamentName, cleanName } from "../ui";
import type { Edition, Mode } from "../types";

function fastest(list: PlayerStat[], eds: Edition[], k: number) {
  // shortest span (years) between a player's 1st and k-th major win
  const out: { p: PlayerStat; years: number; from: number; to: number }[] = [];
  for (const p of list) {
    if (p.wins < k) continue;
    const ys = eds.filter((e) => e.champion!.player_id === p.player_id).map((e) => e.year).sort((a, b) => a - b);
    out.push({ p, years: ys[k - 1] - ys[0], from: ys[0], to: ys[k - 1] });
  }
  return out.sort((a, b) => a.years - b.years || a.from - b.from).slice(0, 5);
}

export default function Legends() {
  const { editions } = useData();
  const [gender, setGender] = useState<"M" | "W">("M");
  const [mode, setMode] = useState<Mode>("current");
  const eds = useMemo(() => editions.filter((e) => isHeld(e) && e.gender === gender && (mode === "all" || e.is_current)), [editions, gender, mode]);
  const list = useMemo(() => playerStats(eds), [eds]);
  const decades = useMemo(() => {
    const m = new Map<number, Map<string, { name: string; n: number }>>();
    eds.forEach((e) => {
      const d = Math.floor(e.year / 10) * 10;
      const dm = m.get(d) ?? new Map();
      const c = dm.get(e.champion!.player_id) ?? { name: e.champion!.name, n: 0 };
      c.n++;
      dm.set(e.champion!.player_id, c);
      m.set(d, dm);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, dm]) => {
      const best = Math.max(...[...dm.values()].map((x) => x.n));
      return { d, best, who: [...dm.entries()].filter(([, x]) => x.n === best).map(([id, x]) => ({ id, name: x.name })), total: [...dm.values()].reduce((s, x) => s + x.n, 0) };
    });
  }, [eds]);
  const byYear = [...list].sort((a, b) => b.maxInYear - a.maxInYear || b.wins - a.wins).slice(0, 6);
  const bySpan = [...list].filter((p) => p.wins > 1).sort((a, b) => b.spanYears - a.spanYears).slice(0, 6);
  const bySame = [...list].sort((a, b) => b.maxSameEvent.count - a.maxSameEvent.count || b.wins - a.wins).slice(0, 6);

  return (
    <>
      <Section kicker="The legends" title="메이저의 지배자" note="공식 기록(우승 횟수)에 근거한 비교만 합니다. 별도의 종합 지수는 만들지 않았습니다. 여자 메이저는 시대마다 대회 수와 구성이 달라(연 2~5개) ‘과거 메이저 포함’과 ‘현행 대회만’ 순위가 크게 다릅니다.">
        <div className="flex flex-wrap gap-2">
          <Pill active={gender === "M"} onClick={() => setGender("M")}>남자</Pill>
          <Pill active={gender === "W"} onClick={() => setGender("W")}>여자</Pill>
          <span className="mx-2 h-5 w-px bg-charcoal/20" />
          <Pill active={mode === "current"} onClick={() => setMode("current")}>현행 메이저만</Pill>
          <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 메이저 포함</Pill>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="data">
            <thead><tr><th>#</th><th>선수</th><th>국적</th><th>우승</th><th>기간</th><th>첫·마지막 우승 나이</th><th>한 해 최다</th><th>5년 최다</th><th>같은 대회 최다</th></tr></thead>
            <tbody>
              {list.slice(0, 30).map((p, i) => (
                <tr key={p.player_id}>
                  <td className="num">{i + 1}</td>
                  <td><PlayerLink id={p.player_id} name={p.name} /></td>
                  <td>{p.nations.map((c) => <NationTag key={c} code={c} />)}</td>
                  <td className="num font-bold">{p.wins}</td>
                  <td className="num">{p.first.year}–{p.last.year}</td>
                  <td className="num">{num(p.firstAge)} · {num(p.lastAge)}</td>
                  <td className="num">{p.maxInYear}</td>
                  <td className="num">{p.best5}</td>
                  <td className="num">{p.maxSameEvent.count} <span className="text-xs text-charcoal-soft"><TournamentName id={p.maxSameEvent.tournament_id} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-charcoal-soft">우승 {eds.length}건 기준</p>
        </div>
      </Section>

      <Section kicker="Records" title="기록으로 본 지배">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["한 해 최다 메이저 우승", byYear.map((p) => [p, `${p.maxInYear}승`] as const)],
            ["첫 우승부터 마지막 우승까지 가장 긴 기간", bySpan.map((p) => [p, `${p.spanYears}년 (${p.first.year}–${p.last.year})`] as const)],
            ["같은 대회 최다 우승", bySame.map((p) => [p, `${p.maxSameEvent.count}승`] as const)],
            ["첫 우승 → 5승까지 가장 짧은 기간", fastest(list, eds, 5).map((x) => [x.p, `${x.years}년 (${x.from}–${x.to})`] as const)],
          ].map(([title, items]) => (
            <div key={title as string} className="card p-4">
              <div className="font-serif font-bold text-green-deep">{title as string}</div>
              <ol className="mt-2 space-y-1 text-sm">
                {(items as readonly (readonly [PlayerStat, string])[]).map(([p, v]) => (
                  <li key={p.player_id} className="flex justify-between gap-2"><PlayerLink id={p.player_id} name={p.name} /><span className="num whitespace-nowrap text-charcoal-soft">{v}</span></li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Section kicker="By era" title="시대별 메이저 최다 우승자" note="10년 단위로 가장 많이 우승한 선수입니다. 같은 수면 함께 표시합니다.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {decades.map((d) => (
            <div key={d.d} className="flex items-baseline justify-between gap-3 card px-4 py-2 text-sm">
              <span className="num font-serif font-bold text-green-deep">{d.d}년대</span>
              <span className="text-right">
                {d.who.map((w, i) => <span key={w.id}>{i ? ", " : ""}<Link className="underline decoration-gold/50" to={`/player/${playerSlug(w.id)}`}>{cleanName(w.name, w.id)}</Link></span>)}
                <span className="num ml-1 text-charcoal-soft">{d.best}승 / {d.total}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

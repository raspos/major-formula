import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { useData, useNation } from "../data";
import { isHeld, nationShareSeries, nationTable, pct } from "../stats";
import { EditionLine, Pill, Section, SampleNote } from "../ui";
import { ASIA, ISO_NUM } from "../geo";
import type { Edition, Gender, Mode } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countries = (feature(world as any, (world as any).objects.countries) as any).features as { id: string; properties: { name: string } }[];
const COLORS = ["#14352A", "#A8854A", "#6B8F71", "#8A4B1A", "#3C6E91", "#9C6B9E", "#555"];
const LAST = 2026;

/** USA share and rest-of-world share of all majors held in each rolling window. */
function usVsWorld(eds: Edition[], window: number) {
  const held = eds.filter(isHeld);
  if (!held.length) return [];
  const y0 = Math.min(...held.map((e) => e.year));
  const y1 = Math.max(...held.map((e) => e.year));
  const out = [];
  for (let y = y0 + window - 1; y <= y1; y++) {
    const sub = held.filter((e) => e.year > y - window && e.year <= y);
    const known = sub.filter((e) => e.champion!.nation_code);
    out.push({
      year: y, n: sub.length,
      미국: known.length ? known.filter((e) => e.champion!.nation_code === "USA").length / sub.length : null,
      "미국 외": known.length ? known.filter((e) => e.champion!.nation_code !== "USA").length / sub.length : null,
    });
  }
  return out;
}

function recent(eds: Edition[], years: number) {
  const sub = eds.filter((e) => isHeld(e) && e.year > LAST - years);
  return { n: sub.length, t: nationTable(sub) };
}

export default function Nations() {
  const { editions } = useData();
  const nation = useNation();
  const [mode, setMode] = useState<Mode>("current");
  const [win, setWin] = useState(10);
  const [g2, setG2] = useState<Gender>("W");
  const base = useMemo(() => editions.filter((e) => isHeld(e) && (mode === "all" || e.is_current)), [editions, mode]);
  const byG = (g: Gender) => base.filter((e) => e.gender === g);

  // world without the USA (share of ALL majors kept as denominator)
  const gEds = byG(g2);
  const all = useMemo(() => nationTable(gEds, true), [gEds]);
  const r5 = useMemo(() => recent(gEds, 5), [gEds]);
  const r10 = useMemo(() => recent(gEds, 10), [gEds]);
  const nonUSwins = gEds.filter((e) => e.champion!.nation_code && e.champion!.nation_code !== "USA").length;
  const topNonUS = [...new Map([...r10.t.rows, ...all.rows].filter((r) => r.code !== "USA").map((r) => [r.code, r])).keys()].slice(0, 6);
  const series = useMemo(() => nationShareSeries(gEds, topNonUS, win), [gEds, topNonUS.join(), win]);

  const asiaW = byG("W");
  const asia = useMemo(() => ({ series: nationShareSeries(asiaW, ASIA, win), list: asiaW.filter((e) => ASIA.includes(e.champion!.nation_code ?? "")).sort((a, b) => b.year - a.year) }), [asiaW, win]);
  const firstKor = [...asia.list].reverse().find((e) => e.champion!.nation_code === "KOR");

  const full = useMemo(() => nationTable(base), [base]);
  const byIso = useMemo(() => {
    const m = new Map<string, number>();
    full.rows.forEach((r) => { const iso = ISO_NUM[r.code]; if (iso) m.set(iso, (m.get(iso) ?? 0) + r.wins); });
    return m;
  }, [full]);
  const max = Math.max(1, ...byIso.values());
  const path = geoPath(geoNaturalEarth1().fitSize([800, 400], { type: "Sphere" } as never));

  const Controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Pill active={mode === "current"} onClick={() => setMode("current")}>현행 메이저</Pill>
      <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 포함</Pill>
      <span className="mx-2 h-5 w-px bg-charcoal/20" />
      <Pill active={win === 5} onClick={() => setWin(5)}>5년 이동</Pill>
      <Pill active={win === 10} onClick={() => setWin(10)}>10년 이동</Pill>
    </div>
  );

  return (
    <>
      <Section kicker="USA vs the world" title="미국 vs 세계" note="이동 구간(해당 연도 포함 직전 5년 또는 10년)에 열린 메이저 가운데 미국 선수와 그 밖의 나라 선수가 우승한 비율입니다. 국적은 우승 당시 대회 기록의 국기 기준입니다.">
        {Controls}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(["M", "W"] as const).map((g) => {
            const d = usVsWorld(byG(g), win);
            const last = d[d.length - 1];
            return (
              <div key={g} className="rounded-sm border border-charcoal/10 bg-white/70 p-3">
                <div className="flex items-baseline justify-between">
                  <div className="font-serif font-bold text-green-deep">{g === "M" ? "남자" : "여자"} 메이저</div>
                  {last && <div className="num text-xs text-charcoal-soft">최근 {win}년 미국 {pct(last["미국"] as number)} · 미국 외 {pct(last["미국 외"] as number)} ({last.n}개 대회)</div>}
                </div>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={d}>
                      <CartesianGrid stroke="#0001" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} width={40} />
                      <Tooltip formatter={(v: number) => pct(v, 1)} labelFormatter={(l) => `${Number(l) - win + 1}–${l}`} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line dataKey="미국" dot={false} stroke="#8A4B1A" strokeWidth={2} connectNulls={false} />
                      <Line dataKey="미국 외" dot={false} stroke="#14352A" strokeWidth={2} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section kicker="The world without the USA" title="미국을 제외한 세계" note="점유율의 분모는 선택한 성별의 전체 메이저 수입니다(미국 우승 포함). ‘미국 외 우승 중 비중’만 미국 외 우승 수를 분모로 다시 계산한 별도 지표입니다.">
        <div className="flex flex-wrap gap-2">
          <Pill active={g2 === "M"} onClick={() => setG2("M")}>남자</Pill>
          <Pill active={g2 === "W"} onClick={() => setG2("W")}>여자</Pill>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data">
            <thead><tr><th>국가</th><th>최근 5년</th><th>최근 10년</th><th>통산 우승</th><th>전체 메이저 대비</th><th>미국 외 우승 중 비중</th><th>마지막 우승</th></tr></thead>
            <tbody>
              {all.rows.slice(0, 15).map((r) => {
                const a5 = r5.t.rows.find((x) => x.code === r.code)?.wins ?? 0;
                const a10 = r10.t.rows.find((x) => x.code === r.code)?.wins ?? 0;
                return (
                  <tr key={r.code}>
                    <td>{nation(r.code)}</td>
                    <td className="num font-bold">{a5}<span className="text-xs font-normal text-charcoal-soft"> / {r5.n}</span></td>
                    <td className="num">{a10}<span className="text-xs text-charcoal-soft"> / {r10.n}</span></td>
                    <td className="num">{r.wins}</td>
                    <td className="num">{pct(r.share, 1)}</td>
                    <td className="num">{pct(nonUSwins ? r.wins / nonUSwins : null, 1)}</td>
                    <td className="num text-xs">{r.lastYear}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-charcoal-soft">최근 5년·10년 = {LAST - 4}–{LAST}, {LAST - 9}–{LAST}. 정렬은 통산 우승 순.</p>
        </div>
        <div className="mt-4 h-72 rounded-sm border border-charcoal/10 bg-white/70 p-3">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke="#0001" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => pct(v, 1)} labelFormatter={(l) => `${Number(l) - win + 1}–${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => nation(v)} />
              {topNonUS.map((c, i) => <Line key={c} dataKey={c} dot={false} stroke={COLORS[i]} strokeWidth={2} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <SampleNote n={gEds.length} period={gEds.length ? [Math.min(...gEds.map((e) => e.year)), Math.max(...gEds.map((e) => e.year))] : null} />
      </Section>

      <Section kicker="Asia" title="아시아의 메이저 역사" note="여자 메이저에서 한국·일본·태국·대만·중국·필리핀 선수의 우승입니다. 그래프는 선택한 이동 구간의 전체 여자 메이저 대비 점유율입니다.">
        <div className="grid gap-3 sm:grid-cols-3">
          {(["KOR", "JPN", "THA"] as const).map((c) => {
            const a5 = r5Of(asiaW, c, 5), a10 = r5Of(asiaW, c, 10);
            return (
              <div key={c} className="rounded-sm border border-charcoal/10 bg-white/70 p-4">
                <div className="text-xs text-charcoal-soft">{nation(c)} · 여자 메이저</div>
                <div className="num mt-1 font-serif text-2xl font-bold text-green-deep">최근 5년 {a5.k}승</div>
                <div className="num text-xs text-charcoal-soft">최근 10년 {a10.k}승 / {a10.n}개 대회 · 통산 {asiaW.filter((e) => e.champion!.nation_code === c).length}승</div>
              </div>
            );
          })}
        </div>
        {firstKor && <p className="mt-3 text-sm">한국 선수의 첫 여자 메이저 우승: <EditionLine e={firstKor} /></p>}
        <div className="mt-3 h-64 rounded-sm border border-charcoal/10 bg-white/70 p-3">
          <ResponsiveContainer>
            <LineChart data={asia.series}>
              <CartesianGrid stroke="#0001" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => pct(v, 1)} labelFormatter={(l) => `${Number(l) - win + 1}–${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => nation(v)} />
              {ASIA.map((c, i) => <Line key={c} dataKey={c} dot={false} stroke={COLORS[i]} strokeWidth={c === "KOR" ? 3 : 1.5} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-gold">아시아 선수 여자 메이저 우승 전체 ({asia.list.length}건)</summary>
          <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {asia.list.map((e) => <div key={e.edition_id} className="flex gap-2"><span className="w-16 shrink-0 text-xs text-charcoal-soft">{nation(e.champion!.nation_code)}</span><EditionLine e={e} /></div>)}
          </div>
        </details>
      </Section>

      <Section kicker="All time" title="통산 국가 순위와 지도">
        <details>
          <summary className="cursor-pointer text-sm text-gold">펼치기 — 남녀 통합 통산 순위·세계 지도</summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="overflow-x-auto">
              <table className="data">
                <thead><tr><th>#</th><th>국가</th><th>우승</th><th>남</th><th>여</th><th>점유율</th></tr></thead>
                <tbody>{full.rows.slice(0, 20).map((r, i) => <tr key={r.code}><td className="num">{i + 1}</td><td>{nation(r.code)}</td><td className="num font-bold">{r.wins}</td><td className="num">{r.men}</td><td className="num">{r.women}</td><td className="num">{pct(r.share, 1)}</td></tr>)}</tbody>
              </table>
              <p className="mt-1 text-xs text-charcoal-soft">남녀 통합 점유율은 남녀의 연간 대회 수(4개 대 2~5개) 차이의 영향을 받습니다.</p>
            </div>
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-2">
              <svg viewBox="0 0 800 400" className="h-auto w-full" role="img" aria-label="국가별 메이저 우승 지도">
                {countries.map((c) => {
                  const v = byIso.get(c.id) ?? 0;
                  return <path key={c.id + c.properties.name} d={path(c as never) ?? ""} fill={v ? `rgba(20,53,42,${0.18 + 0.82 * Math.sqrt(v / max)})` : "#ECE4D2"} stroke="#fff" strokeWidth={0.4}><title>{c.properties.name}{v ? `: ${v}승` : ""}</title></path>;
                })}
              </svg>
              <p className="px-2 pb-1 text-[11px] text-charcoal-soft">잉글랜드·스코틀랜드·북아일랜드·웨일스·저지는 영국 한 곳으로 칠합니다.</p>
            </div>
          </div>
        </details>
      </Section>
    </>
  );
}

function r5Of(eds: Edition[], code: string, years: number) {
  const sub = eds.filter((e) => e.year > LAST - years);
  return { k: sub.filter((e) => e.champion!.nation_code === code).length, n: sub.length };
}

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { useData, useNation } from "../data";
import { isHeld, nationShareSeries, nationTable, pct } from "../stats";
import { EditionLine, Pill, Section, SampleNote } from "../ui";
import { ASIA, ISO_NUM } from "../geo";
import type { Mode } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countries = (feature(world as any, (world as any).objects.countries) as any).features as { id: string; properties: { name: string } }[];
const COLORS = ["#14352A", "#A8854A", "#6B8F71", "#8A4B1A", "#3C6E91", "#9C6B9E", "#555"];

export default function Nations() {
  const { editions } = useData();
  const nation = useNation();
  const [gender, setGender] = useState<"all" | "M" | "W">("all");
  const [mode, setMode] = useState<Mode>("current");
  const [noUSA, setNoUSA] = useState(false);
  const [year, setYear] = useState(2026);
  const eds = useMemo(() => editions.filter((e) => isHeld(e) && (gender === "all" || e.gender === gender) && (mode === "all" || e.is_current)), [editions, gender, mode]);
  const table = useMemo(() => nationTable(eds, noUSA), [eds, noUSA]);
  const top = table.rows.slice(0, 6).map((r) => r.code);
  const series = useMemo(() => nationShareSeries(eds, top, 5), [eds, top.join()]);
  const decades = useMemo(() => nationShareSeries(eds, top, 10, 10), [eds, top.join()]);
  const upto = useMemo(() => nationTable(eds.filter((e) => e.year <= year && e.year > year - 10), false), [eds, year]);
  const byIso = useMemo(() => {
    const m = new Map<string, number>();
    table.rows.forEach((r) => { const iso = ISO_NUM[r.code]; if (iso) m.set(iso, (m.get(iso) ?? 0) + r.wins); });
    return m;
  }, [table]);
  const max = Math.max(1, ...byIso.values());
  const proj = geoNaturalEarth1().fitSize([800, 400], { type: "Sphere" } as never);
  const path = geoPath(proj);
  const asia = useMemo(() => {
    const w = editions.filter((e) => isHeld(e) && e.gender === "W" && (mode === "all" || e.is_current));
    return { series: nationShareSeries(w, ASIA, 5), list: w.filter((e) => ASIA.includes(e.champion!.nation_code ?? "")).sort((a, b) => a.year - b.year), n: w.length };
  }, [editions, mode]);
  const firstKor = asia.list.find((e) => e.champion!.nation_code === "KOR");

  return (
    <>
      <Section kicker="Global power" title="국가별 패권" note="국적은 우승 당시 대회 기록에 표시된 국기 기준입니다(영국은 출처대로 잉글랜드·스코틀랜드 등으로 나눕니다). ‘미국 제외’를 켜도 점유율의 분모는 선택한 전체 메이저 그대로입니다.">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "M", "W"] as const).map((g) => <Pill key={g} active={gender === g} onClick={() => setGender(g)}>{g === "all" ? "남녀 통합" : g === "M" ? "남자" : "여자"}</Pill>)}
          <span className="mx-2 h-5 w-px bg-charcoal/20" />
          <Pill active={mode === "current"} onClick={() => setMode("current")}>현행 메이저</Pill>
          <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 포함</Pill>
          <span className="mx-2 h-5 w-px bg-charcoal/20" />
          <Pill active={noUSA} onClick={() => setNoUSA(!noUSA)}>미국 제외 순위</Pill>
        </div>
        <SampleNote n={table.total} period={eds.length ? [Math.min(...eds.map((e) => e.year)), Math.max(...eds.map((e) => e.year))] : null} scope={table.unknown ? `국적 미상 ${table.unknown}건` : undefined} />
        {gender === "all" && <p className="mt-2 text-xs text-charcoal-soft">남녀 통합: 원시 우승 횟수와 남녀 각각의 점유율을 따로 보여 줍니다. 연간 대회 수가 남녀(4개 대 2~5개)로 달라 통합 점유율은 남녀 대회 수 비중의 영향을 받습니다.</p>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>#</th><th>국가</th><th>우승</th>{gender === "all" && <><th>남</th><th>여</th></>}<th>점유율</th><th>기간</th></tr></thead>
              <tbody>
                {table.rows.slice(0, 20).map((r, i) => (
                  <tr key={r.code}><td className="num">{i + 1}</td><td>{nation(r.code)}</td><td className="num font-bold">{r.wins}</td>
                    {gender === "all" && <><td className="num">{r.men}</td><td className="num">{r.women}</td></>}
                    <td className="num">{pct(r.share, 1)}</td><td className="num text-xs">{r.firstYear}–{r.lastYear}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-sm border border-charcoal/10 bg-white/70 p-2">
            <svg viewBox="0 0 800 400" className="h-auto w-full" role="img" aria-label="국가별 메이저 우승 지도">
              {countries.map((c) => {
                const v = byIso.get(c.id) ?? 0;
                const fill = v ? `rgba(20,53,42,${0.18 + 0.82 * Math.sqrt(v / max)})` : "#ECE4D2";
                return <path key={c.id + c.properties.name} d={path(c as never) ?? ""} fill={fill} stroke="#fff" strokeWidth={0.4}><title>{c.properties.name}{v ? `: ${v}승` : ""}</title></path>;
              })}
            </svg>
            <p className="px-2 pb-1 text-[11px] text-charcoal-soft">색이 짙을수록 우승이 많습니다. 잉글랜드·스코틀랜드·북아일랜드·웨일스·저지는 지도에서 영국 한 곳으로 합쳐 칠합니다.</p>
          </div>
        </div>
      </Section>

      <Section kicker="Timeline" title="시대별 우승 점유율" note="5년 이동 구간(해당 연도 포함 직전 5년)에 열린 메이저 가운데 각 나라 선수가 우승한 비율입니다. 상위 6개국만 그립니다.">
        <div className="h-72 rounded-sm border border-charcoal/10 bg-white/70 p-3">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke="#0001" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => pct(v, 1)} labelFormatter={(l) => `${Number(l) - 4}–${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => nation(v)} />
              {top.map((c, i) => <Line key={c} dataKey={c} name={c} dot={false} stroke={COLORS[i]} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="data">
            <thead><tr><th>10년 구간</th><th>대회 수</th>{top.map((c) => <th key={c}>{nation(c)}</th>)}</tr></thead>
            <tbody>{decades.map((d) => <tr key={String(d.label)}><td className="num">{d.label}</td><td className="num">{d.n}</td>{top.map((c) => <td key={c} className="num">{pct(d[c] as number)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-6 rounded-sm border border-charcoal/10 bg-white/70 p-4">
          <label className="flex items-center gap-3 text-sm">기준 연도 <input type="range" min={1870} max={2026} value={year} onChange={(e) => setYear(+e.target.value)} className="flex-1" /> <span className="num w-12">{year}</span></label>
          <div className="mt-2 text-xs text-charcoal-soft">{year - 9}–{year}년의 메이저 {upto.total}개</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {upto.rows.slice(0, 8).map((r) => <span key={r.code} className="rounded-sm bg-green-soft px-2 py-1 text-sm">{nation(r.code)} <b className="num">{pct(r.share)}</b></span>)}
          </div>
        </div>
      </Section>

      <Section kicker="Asia" title="한국 여자골프와 아시아" note="여자 메이저 가운데 한국·일본·태국·대만·중국·필리핀 선수의 우승입니다. 선택한 범위(현행/과거 포함)를 따릅니다.">
        {firstKor && <p className="mb-3 text-sm">한국 선수의 첫 여자 메이저 우승: <EditionLine e={firstKor} /></p>}
        <div className="h-64 rounded-sm border border-charcoal/10 bg-white/70 p-3">
          <ResponsiveContainer>
            <LineChart data={asia.series}>
              <CartesianGrid stroke="#0001" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => pct(v, 1)} labelFormatter={(l) => `${Number(l) - 4}–${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => nation(v)} />
              {ASIA.map((c, i) => <Line key={c} dataKey={c} dot={false} stroke={COLORS[i]} strokeWidth={c === "KOR" ? 3 : 1.5} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {asia.list.map((e) => <div key={e.edition_id} className="flex items-center gap-2"><span className="w-20 shrink-0 text-xs text-charcoal-soft">{nation(e.champion!.nation_code)}</span><EditionLine e={e} /></div>)}
        </div>
      </Section>
    </>
  );
}

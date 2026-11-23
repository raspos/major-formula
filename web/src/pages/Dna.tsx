import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useData } from "../data";
import { filterEditions, num, pct, priorWins, repeatMap, summarize, toParStr, type Rate, type Summary } from "../stats";
import { Section } from "../ui";

/** Two-sided two-proportion z test; returns p-value or null. */
export function twoProp(a: Rate, b: Rate): number | null {
  if (!a.n || !b.n) return null;
  const p = (a.k + b.k) / (a.n + b.n);
  const se = Math.sqrt(p * (1 - p) * (1 / a.n + 1 / b.n));
  if (!se) return null;
  const z = Math.abs((a.k / a.n - b.k / b.n) / se);
  // normal CDF via erf approximation
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(z * z) / 2);
  return 1 - erf;
}

const verdict = (p: number | null) =>
  p === null ? "비교할 표본 없음" : p < 0.05 ? `차이가 우연일 가능성 낮음 (p=${p.toFixed(3)})` : `통계적으로 뚜렷한 차이 없음 (p=${p.toFixed(2)})`;

export default function Dna() {
  const { editions, tournaments } = useData();
  const [a, setA] = useState("masters");
  const [b, setB] = useState("us_open");
  const prior = useMemo(() => priorWins(editions, "all"), [editions]);
  const repeat = useMemo(() => repeatMap(editions), [editions]);
  const sums = useMemo(() => {
    const m: Record<string, Summary> = {};
    tournaments.forEach((t) => (m[t.tournament_id] = summarize(filterEditions(editions, { tournaments: [t.tournament_id] }), prior, repeat)));
    return m;
  }, [editions, tournaments, prior]);
  const name = (id: string) => tournaments.find((t) => t.tournament_id === id)?.name_ko ?? id;
  const SA = sums[a], SB = sums[b];
  const radar = [
    ["54홀 선두 우승률", (s: Summary) => s.lead.led.rate],
    ["역전 우승률", (s: Summary) => s.lead.comeback.rate],
    ["플레이오프 비율", (s: Summary) => s.playoff.rate],
    ["첫 메이저 우승 비율", (s: Summary) => s.firstMajor.rate],
    ["같은 대회 재우승 비율", (s: Summary) => s.repeatInEvent.rate],
  ].map(([label, fn]) => ({ metric: label as string, va: (fn as (s: Summary) => number | null)(SA), vb: (fn as (s: Summary) => number | null)(SB) }));
  // a missing rate is not 0%: plot only metrics both events have, list the rest
  const radarOk = radar.filter((r) => r.va !== null && r.vb !== null && r.va !== undefined && r.vb !== undefined)
    .map((r) => ({ metric: r.metric, [name(a)]: r.va, [name(b)]: r.vb }));
  const radarMissing = radar.filter((r) => r.va === null || r.vb === null || r.va === undefined || r.vb === undefined).map((r) => r.metric);

  const rows: [string, (s: Summary) => string, ((x: Summary, y: Summary) => string) | null][] = [
    ["분석 기간 · 대회 수", (s) => (s.period ? `${s.period[0]}–${s.period[1]} · ${s.n}개` : "—"), null],
    ["평균 우승 나이", (s) => `${num(s.age.mean)}세 (n=${s.age.n})`, null],
    ["평균 우승 성적(72홀)", (s) => `${toParStr(s.toPar.mean === null ? null : Math.round(s.toPar.mean * 10) / 10)} (n=${s.toPar.n})`, null],
    ["54홀 선두(공동 포함) 우승률", (s) => `${pct(s.lead.led.rate)} (${s.lead.led.k}/${s.lead.led.n})`, (x, y) => verdict(twoProp(x.lead.led, y.lead.led))],
    ["최종일 역전 우승률", (s) => `${pct(s.lead.comeback.rate)} (${s.lead.comeback.k}/${s.lead.comeback.n})`, (x, y) => verdict(twoProp(x.lead.comeback, y.lead.comeback))],
    ["플레이오프 발생률", (s) => `${pct(s.playoff.rate)} (${s.playoff.k}/${s.playoff.n})`, (x, y) => verdict(twoProp(x.playoff, y.playoff))],
    ["평균 우승 타수 차", (s) => `${num(s.marginMean.mean)}타 (n=${s.marginMean.n})`, null],
    ["생애 첫 메이저 우승 비율", (s) => `${pct(s.firstMajor.rate)} (${s.firstMajor.k}/${s.firstMajor.n})`, (x, y) => verdict(twoProp(x.firstMajor, y.firstMajor))],
    ["같은 대회 재우승 비율", (s) => `${pct(s.repeatInEvent.rate)} (${s.repeatInEvent.k}/${s.repeatInEvent.n})`, (x, y) => verdict(twoProp(x.repeatInEvent, y.repeatInEvent))],
  ];

  return (
    <>
      <Section kicker="Major DNA" title="메이저 DNA — 대회 비교" note="두 대회를 고르면 같은 산식으로 계산한 지표를 나란히 보여 줍니다. 두 비율의 차이가 표본 크기에 비해 우연으로 설명될 수 있으면 ‘뚜렷한 차이 없음’으로 표시합니다(두 비율 z검정, 유의수준 5%). 대회마다 분석 기간과 표본 수가 다릅니다.">
        <div className="flex flex-wrap gap-3 text-sm">
          {[["A", a, setA], ["B", b, setB]].map(([k, v, set]) => (
            <label key={k as string} className="flex items-center gap-2">대회 {k as string}
              <select value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value)}>
                {tournaments.map((t) => <option key={t.tournament_id} value={t.tournament_id}>{t.gender === "M" ? "남 · " : "여 · "}{t.name_ko}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>지표</th><th>{name(a)}</th><th>{name(b)}</th><th>차이 판정</th></tr></thead>
              <tbody>
                {rows.map(([label, fn, cmp]) => (
                  <tr key={label}><td>{label}</td><td className="num">{fn(SA)}</td><td className="num">{fn(SB)}</td><td className="text-xs text-charcoal-soft">{cmp ? cmp(SA, SB) : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-80 rounded-sm border border-charcoal/10 bg-white/70 p-2">
            <ResponsiveContainer>
              <RadarChart data={radarOk} outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <Radar name={name(a)} dataKey={name(a)} stroke="#14352A" fill="#14352A" fillOpacity={0.25} />
                <Radar name={name(b)} dataKey={name(b)} stroke="#A8854A" fill="#A8854A" fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => pct(v)} />
              </RadarChart>
            </ResponsiveContainer>
            {radarMissing.length > 0 && <p className="px-2 text-[11px] text-charcoal-soft">자료가 없어 그리지 않은 항목: {radarMissing.join(", ")}</p>}
          </div>
        </div>
      </Section>

      <Section kicker="All majors" title="12개 대회 한눈에" note="비율 옆 괄호는 표본 수입니다. 54홀 지표는 3라운드 순위표가 있는 대회만 셉니다.">
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>대회</th><th>기간</th><th>대회 수</th><th>평균 나이</th><th>54홀 선두 우승</th><th>역전 우승</th><th>플레이오프</th><th>첫 메이저 우승</th></tr></thead>
            <tbody>
              {tournaments.map((t) => {
                const s = sums[t.tournament_id];
                return (
                  <tr key={t.tournament_id}>
                    <td>{t.gender === "M" ? "남" : "여"} · {t.name_ko}{!t.is_current && <span className="ml-1 text-xs text-charcoal-soft">(과거)</span>}</td>
                    <td className="num">{s.period ? `${s.period[0]}–${s.period[1]}` : "—"}</td>
                    <td className="num">{s.n}</td>
                    <td className="num">{num(s.age.mean)}</td>
                    <td className="num">{pct(s.lead.led.rate)} <span className="text-xs text-charcoal-soft">({s.lead.n})</span></td>
                    <td className="num">{pct(s.lead.comeback.rate)} <span className="text-xs text-charcoal-soft">({s.lead.n})</span></td>
                    <td className="num">{pct(s.playoff.rate)} <span className="text-xs text-charcoal-soft">({s.playoff.n})</span></td>
                    <td className="num">{pct(s.firstMajor.rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { koCompare } from "../names";
import { useData } from "../data";
import { isHeld, num, playerStats } from "../stats";
import { NationTag, PlayerLink, Section, cleanName } from "../ui";

const PRESETS: [string, string, string][] = [
  ["잭 니클라우스 vs 타이거 우즈", "wp:Jack Nicklaus", "wp:Tiger Woods"],
  ["안니카 소렌스탐 vs 박인비", "wp:Annika Sörenstam", "wp:Inbee Park"],
  ["박세리 vs 고진영", "wp:Pak Se-ri", "wp:Ko Jin-young"],
];

export default function Versus() {
  const { editions, players, tById } = useData();
  const [sp, setSp] = useSearchParams();
  const a = sp.get("a") ?? "wp:Jack Nicklaus";
  const b = sp.get("b") ?? "wp:Tiger Woods";
  const all = useMemo(() => playerStats(editions.filter(isHeld)), [editions]);
  const A = all.find((p) => p.player_id === a);
  const B = all.find((p) => p.player_id === b);
  const sorted = useMemo(() => [...players].sort((x, y) => y.wins.length - x.wins.length || koCompare(cleanName(x.name, x.player_id), cleanName(y.name, y.player_id))), [players]);
  const set = (k: "a" | "b", v: string) => { const n = new URLSearchParams(sp); n.set(k, v); setSp(n); };
  const events = [...new Set([...(A ? Object.keys(A.byEvent) : []), ...(B ? Object.keys(B.byEvent) : [])])];
  const dist = events.map((t) => ({ t: tById[t]?.name_ko ?? t, [A?.name ?? "A"]: A?.byEvent[t] ?? 0, [B?.name ?? "B"]: B?.byEvent[t] ?? 0 }));
  const mixed = A && B && A.gender !== B.gender;
  const rows: [string, (p: NonNullable<typeof A>) => string][] = [
    ["메이저 우승", (p) => `${p.wins}승`],
    ["첫 메이저 우승 나이", (p) => `${num(p.firstAge)}세 (${p.first.year})`],
    ["마지막 메이저 우승 나이", (p) => `${num(p.lastAge)}세 (${p.last.year})`],
    ["첫~마지막 우승 간격", (p) => `${p.spanYears}년`],
    ["가장 많이 우승한 5년", (p) => `${p.best5}승`],
    ["한 해 최다", (p) => `${p.maxInYear}승`],
    ["같은 대회 최다 우승", (p) => `${p.maxSameEvent.count}승 (${tById[p.maxSameEvent.tournament_id]?.name_ko})`],
    ["우승한 메이저 종류", (p) => `${Object.keys(p.byEvent).length}개 대회`],
  ];
  return (
    <Section kicker="Head to head" title="전설의 대결" note="메이저 우승 기록만 비교합니다. 남녀를 비교할 때는 연간 메이저 수(남자 4개, 여자는 시대별 2~5개)와 대회 구성이 달라 단순 횟수 비교에 한계가 있습니다.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(([label, x, y]) => (
          <button key={label} className="rounded-full border border-charcoal/20 bg-white px-3 py-1 text-sm hover:border-gold" onClick={() => setSp({ a: x, b: y })}>{label}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {(["a", "b"] as const).map((k) => (
          <select key={k} className="w-full min-w-0" value={k === "a" ? a : b} onChange={(e) => set(k, e.target.value)}>
            {sorted.map((p) => <option key={p.player_id} value={p.player_id}>{cleanName(p.name, p.player_id)} ({p.gender === "M" ? "남" : "여"} · {p.wins.length}승)</option>)}
          </select>
        ))}
      </div>
      {mixed && <p className="mt-3 text-xs text-charcoal-soft">⚠ 남녀는 메이저 수가 달라 직접 비교에 한계가 있습니다.</p>}
      {A && B && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[A, B].map((p) => (
              <div key={p.player_id} className="flex items-center gap-3 card p-4">
                <div><div className="font-serif text-lg font-bold"><PlayerLink id={p.player_id} name={p.name} /></div><div>{p.nations.map((c) => <NationTag key={c} code={c} />)}</div></div>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="data">
              <thead><tr><th>항목</th><th>{cleanName(A.name)}</th><th>{cleanName(B.name)}</th></tr></thead>
              <tbody>{rows.map(([l, f]) => <tr key={l}><td>{l}</td><td className="num">{f(A)}</td><td className="num">{f(B)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-4 h-64 card p-3">
            <div className="text-sm font-medium">메이저 대회별 우승 분포</div>
            <ResponsiveContainer height="90%">
              <BarChart data={dist}>
                <CartesianGrid stroke="#0001" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={A.name} name={cleanName(A.name, A.player_id)} fill="#14352A" />
                <Bar dataKey={B.name} name={cleanName(B.name, B.player_id)} fill="#A8854A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  );
}

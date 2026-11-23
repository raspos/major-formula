import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useData } from "../data";
import { isHeld, median, num, pct } from "../stats";
import { PlayerLink, Section, Stat, cleanName } from "../ui";
import type { Gender, Player } from "../types";

function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 10) return null;
  const rank = (v: number[]) => {
    const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    for (let i = 0; i < n; ) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2;
      i = j + 1;
    }
    return r as number[];
  };
  const a = rank(xs), b = rank(ys);
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num_ = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num_ += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num_ / Math.sqrt(da * db);
}

export default function ChampionDna() {
  const { editions, players } = useData();
  const champs = useMemo(() => {
    const majors = new Map<string, number>();
    const firstYear = new Map<string, number>();
    editions.filter(isHeld).forEach((e) => {
      const p = e.champion!.player_id;
      majors.set(p, (majors.get(p) ?? 0) + 1);
      firstYear.set(p, Math.min(firstYear.get(p) ?? 9999, e.year));
    });
    return players.filter((p) => majors.has(p.player_id)).map((p) => ({ p, majors: majors.get(p.player_id)!, first: firstYear.get(p.player_id)! }));
  }, [editions, players]);

  const byG = (g: Gender) => champs.filter((c) => c.p.gender === g);
  const H = (g: Gender) => byG(g).filter((c) => c.p.profile?.height_cm);
  const stats = (["M", "W"] as const).map((g) => {
    const all = byG(g), h = H(g);
    const hs = h.map((c) => c.p.profile!.height_cm!);
    const ws = all.filter((c) => c.p.profile?.weight_kg).map((c) => c.p.profile!.weight_kg!);
    const eras = ([["1959년 이전 첫 우승", 0, 1959], ["1960–1999", 1960, 1999], ["2000년 이후", 2000, 3000]] as const).map(([label, lo, hi]) => {
      const sub = h.filter((c) => c.first >= lo && c.first <= hi);
      const tot = all.filter((c) => c.first >= lo && c.first <= hi).length;
      return { label, n: sub.length, tot, med: median(sub.map((c) => c.p.profile!.height_cm!)) };
    });
    const hist = new Map<number, number>();
    hs.forEach((x) => hist.set(Math.floor(x / 5) * 5, (hist.get(Math.floor(x / 5) * 5) ?? 0) + 1));
    return {
      g, total: all.length, n: hs.length, med: median(hs), min: Math.min(...hs), max: Math.max(...hs), weights: ws,
      eras, hist: [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ band: `${k}–${k + 4}`, 선수: v })),
      rho: spearman(h.map((c) => c.p.profile!.height_cm!), h.map((c) => c.majors)),
      scatter: h.map((c) => ({ x: c.p.profile!.height_cm!, y: c.majors, name: cleanName(c.p.name, c.p.player_id) })),
      tallest: [...h].sort((a, b) => b.p.profile!.height_cm! - a.p.profile!.height_cm!).slice(0, 3),
      shortest: [...h].sort((a, b) => a.p.profile!.height_cm! - b.p.profile!.height_cm!).slice(0, 3),
    };
  });

  const li = (list: { p: Player }[]) => list.map((c, i) => <span key={c.p.player_id}>{i ? ", " : ""}<PlayerLink id={c.p.player_id} name={c.p.name} /> {num(c.p.profile!.height_cm, 0)}cm</span>);

  return (
    <>
      <Section kicker="The champion's DNA" title="메이저 우승자는 어떤 몸을 가졌나" note="신장·몸무게는 선수별 위키백과 문서 인포박스(없으면 위키데이터)에 실린 값입니다. 측정 시점이 기록돼 있지 않아 ‘우승 당시’ 값으로 보지 않습니다. 같은 시기 메이저 출전 선수 전체의 신장 자료가 없어 비교군이 없습니다. 그래서 ‘키가 크면 유리하다’ 같은 결론은 내리지 않고 우승자들의 분포만 보여 줍니다. 몸무게는 자료가 적어(우승자의 일부) 개수만 표시합니다.">
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.map((s) => (
            <div key={s.g} className="card p-4">
              <div className="font-serif text-lg font-bold text-green-deep">{s.g === "M" ? "남자" : "여자"} 메이저 우승자</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Stat label="신장 중앙값" value={s.n ? `${num(s.med, 1)}cm` : "—"} sub={`${s.n}명 / 우승자 ${s.total}명 (${pct(s.total ? s.n / s.total : null)})`} />
                <Stat label="신장 범위" value={s.n ? `${num(s.min, 0)}–${num(s.max, 0)}` : "—"} sub="cm" />
              </div>
              <div className="mt-3 h-44">
                <ResponsiveContainer>
                  <BarChart data={s.hist}><CartesianGrid stroke="#0001" vertical={false} /><XAxis dataKey="band" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={24} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="선수" fill={s.g === "M" ? "#14352A" : "#A8854A"} /></BarChart>
                </ResponsiveContainer>
              </div>
              <table className="data mt-2"><thead><tr><th>첫 메이저 우승 시기</th><th>신장 중앙값</th><th>자료</th></tr></thead>
                <tbody>{s.eras.map((e) => <tr key={e.label}><td>{e.label}</td><td className="num">{e.n ? `${num(e.med, 1)}cm` : "—"}</td><td className="num text-xs">{e.n}/{e.tot}명{e.n > 0 && e.n < 15 ? " ⚠" : ""}</td></tr>)}</tbody></table>
              <p className="mt-2 text-xs text-charcoal-soft">가장 큰 우승자: {li(s.tallest)}<br />가장 작은 우승자: {li(s.shortest)}</p>
              <p className="mt-1 text-xs text-charcoal-soft">몸무게: 자료 부족으로 제외</p>
            </div>
          ))}
        </div>
      </Section>

      <Section kicker="Height × majors" title="키와 메이저 우승 수" note="점 하나가 선수 한 명입니다. 순위상관(스피어만)은 우승자들 안에서 키와 메이저 우승 수가 함께 움직이는 정도일 뿐, 키가 우승에 영향을 준다는 뜻이 아닙니다.">
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.map((s) => (
            <div key={s.g} className="h-64 card p-3">
              <div className="text-sm font-medium">{s.g === "M" ? "남자" : "여자"} · 순위상관 {s.rho === null ? "—" : num(s.rho, 2)} (n={s.n})</div>
              <ResponsiveContainer height="88%">
                <ScatterChart>
                  <CartesianGrid stroke="#0001" />
                  <XAxis type="number" dataKey="x" name="신장" unit="cm" domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="메이저" allowDecimals={false} width={24} tick={{ fontSize: 10 }} />
                  <ZAxis range={[30, 30]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: number, k: string) => [v, k]} labelFormatter={() => ""} content={({ payload }) => payload?.[0] ? <div className="rounded bg-white px-2 py-1 text-xs shadow">{String(payload[0].payload.name)} · {payload[0].payload.x}cm · {payload[0].payload.y}승</div> : null} />
                  <Scatter data={s.scatter} fill={s.g === "M" ? "#14352A" : "#A8854A"} fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </Section>

      <p className="mx-auto max-w-6xl px-4 text-xs text-charcoal-soft sm:px-6">비거리·정확도·퍼팅 통계는 이용 허락을 받은 자료가 생기면 추가합니다.</p>
    </>
  );
}

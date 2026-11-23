import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "../data";
import { filterEditions, isHeld, legends, median, nationShareSeries, num, pct, playerStats, priorWins, rate, summarize } from "../stats";
import { PlayerLink, Reveal, Section, SampleNote, TournamentName, cleanName } from "../ui";
import { COURSES, courseCredit, type CoursePhoto } from "../courses";
import { twoProp } from "./Dna";
import { scoreGoat } from "./Goat";
import type { Player } from "../types";

function Banner({ c, title, sub }: { c: CoursePhoto; title: string; sub?: string }) {
  return (
    <Reveal>
      <figure className="relative my-6 h-[42vh] min-h-[260px] overflow-hidden">
        <img src={c.src} alt={c.course} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 text-white sm:px-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/80">{c.event}</div>
          <div className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{title}</div>
          {sub && <div className="mt-1 text-sm text-white/85">{sub}</div>}
        </figcaption>
        <a href={c.page} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80">{c.artist} · {c.license}</a>
      </figure>
    </Reveal>
  );
}

export default function Home() {
  const { editions, tournaments, players, pById } = useData();
  const allLeg = useMemo(() => legends(editions, players, "all", "all"), [editions, players]);
  const held = useMemo(() => editions.filter(isHeld), [editions]);
  // same scoring as the GOAT page with default weights (current majors, 3+ wins), top 2 per tour
  const goat = useMemo(() => (["M", "W"] as const).flatMap((g) =>
    scoreGoat(legends(editions, players, g, "current").filter((l) => l.majors >= 3)).slice(0, 2)), [editions, players]);
  const spec = (["M", "W"] as const).map((g) => allLeg.filter((l) => l.p.gender === g && l.share !== null && (l.tourWins ?? 0) >= 10)
    .sort((a, b) => b.share! - a.share!)[0]);
  const dna = (["M", "W"] as const).map((g) => {
    const hs = allLeg.filter((l) => l.p.gender === g && l.p.profile?.height_cm).map((l) => l.p.profile!.height_cm!);
    return { g, n: hs.length, med: median(hs) };
  });

  const facts = useMemo(() => {
    const out: { text: string; value: string; n: number; period: [number, number] | null }[] = [];
    const prior = priorWins(editions, "current");
    for (const [g, lab] of [["M", "남자"], ["W", "여자"]] as const) {
      const s = summarize(filterEditions(editions, { gender: g, mode: "current" }), prior);
      if (s.age.n) out.push({ text: `${lab} 우승 나이 중앙값`, value: `${num(s.age.median)}세`, n: s.age.n, period: s.period });
      if (s.firstMajor.n) out.push({ text: `${lab} 생애 첫 메이저 우승 비율`, value: pct(s.firstMajor.rate), n: s.firstMajor.n, period: s.period });
    }
    return out;
  }, [editions]);

  const leadBlocks = useMemo(() => (["M", "W"] as const).map((g) => {
    const eds = filterEditions(editions, { gender: g, mode: "current" });
    const lead = eds.filter((e) => e.lead54);
    if (!lead.length) return null;
    const s = summarize(eds);
    const per: [number, number] = [Math.min(...lead.map((e) => e.year)), Math.max(...lead.map((e) => e.year))];
    const byT = tournaments.filter((t) => t.gender === g && t.is_current).map((t) => {
      const sub = lead.filter((e) => e.tournament_id === t.tournament_id);
      return { t, r: rate(sub.filter((e) => e.lead54!.deficit > 0).length, sub.length) };
    }).filter((x) => x.r.n >= 8).sort((a, b) => (b.r.rate ?? 0) - (a.r.rate ?? 0));
    return { g, lab: g === "M" ? "남자" : "여자", n: lead.length, all: eds.length, per, led: s.lead.led.k,
      behind: lead.length - s.lead.led.k, k3: lead.filter((e) => e.lead54!.deficit >= 3).length,
      margins: s.lead.byMargin, byT, p: byT.length >= 2 ? twoProp(byT[0].r, byT[byT.length - 1].r) : null };
  }).filter((x): x is NonNullable<typeof x> => !!x), [editions, tournaments]);

  // the dominant player of each decade, men and women
  const eras = useMemo(() => {
    const out: { d: number; M?: { p: Player; wins: number }; W?: { p: Player; wins: number } }[] = [];
    for (let d = 1900; d <= 2020; d += 10) {
      const row: (typeof out)[number] = { d };
      for (const g of ["M", "W"] as const) {
        const best = playerStats(held.filter((e) => e.gender === g && e.year >= d && e.year < d + 10))[0];
        if (best && pById[best.player_id]) row[g] = { p: pById[best.player_id], wins: best.wins };
      }
      if (row.M || row.W) out.push(row);
    }
    return out;
  }, [held, pById]);

  const usWorld = useMemo(() => (["M", "W"] as const).map((g) => ({
    g, data: nationShareSeries(held.filter((e) => e.gender === g && e.is_current), ["USA"], 10)
      .map((r) => ({ year: r.year as number, 미국: r.USA as number | null, 세계: r.USA === null ? null : 1 - (r.USA as number) })),
  })), [held]);

  const latest = useMemo(() => [...held].sort((a, b) => (b.end_date ?? `${b.year}`).localeCompare(a.end_date ?? `${a.year}`)).slice(0, 4), [held]);
  const cur = tournaments.filter((t) => t.is_current);

  return (
    <>
      {/* hero */}
      <div className="relative min-h-[78vh] overflow-hidden">
        <img src={COURSES.augusta.src} alt={COURSES.augusta.course} className="absolute inset-0 h-full w-full animate-[slowZoom_18s_ease-out_both] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/5" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-4 py-16 text-white sm:px-6">
          <div className="animate-[fadeUp_.8s_ease-out_both]">
            <div className="text-xs uppercase tracking-[0.3em] text-white/80">databrew SPORTS · PGA · LPGA</div>
            <h1 className="mt-4 font-serif text-5xl font-black leading-tight sm:text-7xl">메이저의 공식</h1>
            <div className="mt-2 font-serif text-xl tracking-[0.25em] text-[#E8D9A8] sm:text-2xl">THE MAJOR FORMULA</div>
            <p className="mt-8 font-serif text-2xl">“우승에는 공식이 있는가.”</p>
            <div className="num mt-8 grid max-w-md grid-cols-3 gap-3">
              {[[held.length.toLocaleString(), "메이저 우승"], [String(tournaments.length), "대회"], [`${Math.min(...held.map((e) => e.year))}–`, "기록 시작"]].map(([v, l]) => (
                <div key={l} className="rounded-xl border border-white/25 bg-white/15 px-3 py-3 backdrop-blur-md"><div className="font-serif text-2xl font-bold">{v}</div><div className="text-[11px] text-white/80">{l}</div></div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/goat" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-green-deep shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">GOAT 순위 만들기</Link>
              <Link to="/archive" className="rounded-full border border-white/60 px-5 py-2.5 text-sm text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10">나의 메이저 시대</Link>
            </div>
          </div>
        </div>
        <a href={COURSES.augusta.page} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80">{courseCredit(COURSES.augusta)}</a>
      </div>

      {/* GOAT */}
      <Section kicker="GOAT of GOATs" title="역사상 가장 위대한 메이저 골퍼">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {goat.map(({ l, score }, i) => (
            <Link key={l.p.player_id} to={`/player/${encodeURIComponent(l.p.player_id)}`} className="card card-hover block p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gold">{l.p.gender === "M" ? "남자" : "여자"} #{(i % 2) + 1}</span>
                <span className="num font-serif text-2xl font-bold text-gold">{num(score, 0)}<span className="text-xs">점</span></span>
              </div>
              <div className="mt-1 font-serif text-xl font-bold text-green-deep">{cleanName(l.p.name)}</div>
              <dl className="num mt-4 grid grid-cols-3 gap-1 text-center">
                <div><dt className="text-[10px] text-charcoal-soft">메이저</dt><dd className="font-serif text-3xl font-bold">{l.majors}</dd></div>
                <div><dt className="text-[10px] text-charcoal-soft">투어 통산</dt><dd className="font-serif text-3xl font-bold">{l.tourWins ?? "—"}</dd></div>
                <div><dt className="text-[10px] text-charcoal-soft">메이저 비중</dt><dd className="font-serif text-3xl font-bold">{pct(l.share)}</dd></div>
              </dl>
            </Link>
          ))}
        </div>
        <Link to="/goat" className="mt-5 inline-block text-sm font-medium text-green-deep underline decoration-gold underline-offset-4">기준을 바꿔 순위 만들기 →</Link>
      </Section>

      <Banner c={COURSES.standrews} title="골프의 고향" sub="세인트앤드루스 올드코스 · 스윌칸 다리" />

      {/* era leaders */}
      <Section kicker="Rulers of each era" title="시대의 지배자">
        <div className="-mx-4 overflow-x-auto px-4 pb-3">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {eras.map((r) => (
              <div key={r.d} className="w-40 shrink-0">
                <div className="num mb-2 font-serif text-sm font-bold text-gold">{r.d}년대</div>
                {(["M", "W"] as const).map((g) => {
                  const x = r[g];
                  return x ? (
                    <Link key={g} to={`/player/${encodeURIComponent(x.p.player_id)}`} className={`card card-hover mb-3 block border-t-4 px-3 py-3 ${g === "M" ? "border-t-green-deep" : "border-t-gold"}`}>
                      <div className="text-[10px] text-charcoal-soft">{g === "M" ? "남자" : "여자"}</div>
                      <div className="mt-0.5 line-clamp-2 min-h-[2.5rem] font-serif text-sm font-bold leading-tight text-green-deep">{cleanName(x.p.name)}</div>
                      <div className="num mt-1 font-serif text-2xl font-bold">{x.wins}<span className="text-xs font-normal text-charcoal-soft">승</span></div>
                    </Link>
                  ) : <div key={g} className="mb-3 flex h-[104px] items-center justify-center rounded-xl border border-dashed border-charcoal/15 text-[10px] text-charcoal-soft">{g === "M" ? "남" : "여"} 기록 없음</div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 54 holes */}
      <Section kicker="After 54 holes" title="54홀 선두는 지켜낼까">
        <div className="grid gap-6 lg:grid-cols-2">
          {leadBlocks.map((b) => (
            <div key={b.g} className="card p-5">
              <div className="font-serif text-lg font-bold text-green-deep">{b.lab} 메이저</div>
              <div className="mt-3 flex h-10 overflow-hidden rounded-full text-sm text-ivory">
                <div className="flex items-center bg-green-deep px-3" style={{ width: `${(100 * b.led) / b.n}%` }}>선두 우승 {pct(b.led / b.n)}</div>
                <div className="flex items-center justify-end bg-gold px-3" style={{ width: `${(100 * b.behind) / b.n}%` }}>역전 {pct(b.behind / b.n)}</div>
              </div>
              <div className="num mt-1 text-xs text-charcoal-soft">54홀 순위표 확보 {b.n}/{b.all}개 대회 · {b.per[0]}–{b.per[1]}</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-ivory p-3">
                  <div className="text-xs text-charcoal-soft">3타 이상 뒤졌다가 우승</div>
                  <div className="num font-serif text-3xl font-bold text-green-deep">{pct(b.k3 / b.n, 1)}</div>
                  <div className="num text-xs text-charcoal-soft">{b.k3}/{b.n} · 약 {Math.round(b.n / Math.max(1, b.k3))}개 대회에 한 번</div>
                </div>
                <div className="rounded-xl bg-ivory p-3">
                  <div className="text-xs text-charcoal-soft">단독 선두 우승 · 1타 차 → 3타 차+</div>
                  <div className="num font-serif text-3xl font-bold text-green-deep">{pct(b.margins[0].r.rate)} → {pct(b.margins[2].r.rate)}</div>
                  <div className="num text-xs text-charcoal-soft">{b.margins[0].r.n} · {b.margins[2].r.n}개 대회{b.margins[0].r.n < 30 ? " ⚠" : ""}</div>
                </div>
              </div>
              <div className="mt-5 text-xs text-charcoal-soft">선두가 가장 자주 무너진 대회</div>
              <div className="mt-1 space-y-1.5">
                {b.byT.map((x) => (
                  <div key={x.t.tournament_id} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 truncate">{x.t.name_ko}</span>
                    <span className="h-2.5 flex-1 rounded-full bg-ivory-dark"><span className="block h-2.5 rounded-full bg-gold" style={{ width: `${100 * (x.r.rate ?? 0)}%` }} /></span>
                    <span className="num w-24 shrink-0 text-right text-xs">{pct(x.r.rate)} <span className="text-charcoal-soft">({x.r.k}/{x.r.n})</span></span>
                  </div>
                ))}
              </div>
              {b.p !== null && b.p >= 0.05 && <div className="mt-1 text-[11px] text-charcoal-soft">대회 간 차이는 통계적으로 뚜렷하지 않음 (p={b.p.toFixed(2)})</div>}
            </div>
          ))}
        </div>
      </Section>

      <Banner c={COURSES["pebble-bay"]} title="태평양 위의 18번 홀" sub="페블비치 골프 링크스" />

      {/* USA vs world mini charts */}
      <Section kicker="USA vs the world" title="미국 vs 세계">
        <div className="grid gap-4 md:grid-cols-2">
          {usWorld.map(({ g, data }) => {
            const last = data[data.length - 1];
            return (
              <Link key={g} to="/nations" className="card card-hover block p-4">
                <div className="flex items-baseline justify-between">
                  <div className="font-serif font-bold text-green-deep">{g === "M" ? "남자" : "여자"} 메이저</div>
                  {last && <div className="num text-xs text-charcoal-soft">최근 10년 미국 <b className="text-[#8A4B1A]">{pct(last["미국"])}</b> · 세계 <b className="text-green-deep">{pct(last["세계"])}</b></div>}
                </div>
                <div className="mt-2 h-40">
                  <ResponsiveContainer>
                    <AreaChart data={data} stackOffset="expand">
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis hide domain={[0, 1]} />
                      <Tooltip formatter={(v: number) => pct(v)} labelFormatter={(l) => `${Number(l) - 9}–${l}`} />
                      <Area type="monotone" dataKey="미국" stackId="1" stroke="#8A4B1A" fill="#C79A6B" fillOpacity={0.85} />
                      <Area type="monotone" dataKey="세계" stackId="1" stroke="#14352A" fill="#2D5A46" fillOpacity={0.85} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* DNA + specialist */}
      <Reveal>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2">
          <Link to="/champion-dna" className="card card-hover p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">The champion&apos;s DNA</div>
            <div className="mt-1 font-serif text-xl font-bold text-green-deep">메이저 우승자의 키</div>
            <div className="num mt-3 flex gap-8">
              {dna.map((d) => <div key={d.g}><div className="text-xs text-charcoal-soft">{d.g === "M" ? "남자" : "여자"} 중앙값</div><div className="font-serif text-4xl font-bold">{d.med ? `${num(d.med, 0)}` : "—"}<span className="text-lg">cm</span></div><div className="text-[11px] text-charcoal-soft">{d.n}명</div></div>)}
            </div>
          </Link>
          <Link to="/specialist" className="card card-hover p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Major specialist</div>
            <div className="mt-1 font-serif text-xl font-bold text-green-deep">투어 우승 중 메이저 비중 1위</div>
            <div className="mt-3 space-y-3">
              {spec.map((s) => s && (
                <div key={s.p.player_id}>
                  <div className="num text-sm"><b>{cleanName(s.p.name)}</b> {pct(s.share, 1)}<div className="text-xs text-charcoal-soft">{s.p.gender === "M" ? "PGA" : "LPGA"} {s.tourWins}승 중 메이저 {Math.round(s.share! * s.tourWins!)}승</div></div>
                </div>
              ))}
            </div>
          </Link>
        </div>
      </Reveal>

      <Section kicker="Findings" title="숫자로 본 메이저 챔피언">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.text} className="card border-l-4 border-l-gold p-4">
              <div className="text-sm text-charcoal">{f.text}</div>
              <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">{f.value}</div>
              <SampleNote n={f.n} period={f.period} />
            </div>
          ))}
        </div>
      </Section>

      <Section kicker="Explore" title="더 둘러보기">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[["/dna", "메이저대회별 DNA"], ["/formula", "우승의 공식"], ["/nations", "미국 vs 세계"], ["/records", "역대 명승부"], ["/archive", "역사 아카이브"], ["/versus", "전설의 대결"]].map(([to, t]) => (
            <Link key={to} to={to} className="card card-hover flex items-center justify-between p-4 font-serif text-base font-bold text-green-deep sm:text-lg">{t}<span className="text-gold">→</span></Link>
          ))}
        </div>
      </Section>

      <Section kicker="The stages" title="메이저의 무대">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[COURSES["pebble-cliff"], COURSES.oldcourse, COURSES.shinnecock, COURSES["pebble-green"]].map((c) => (
            <a key={c.key} href={c.page} target="_blank" rel="noreferrer" className="zoom group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_10px_30px_-14px_rgba(20,53,42,0.5)]">
              <img src={c.src} alt={c.course} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <div className="font-serif text-base font-bold">{c.course}</div>
                <div className="text-[11px] text-white/80">{c.event}</div>
                <div className="text-[9px] text-white/60">{c.artist} · {c.license}</div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      <Section kicker="The Nine" title="현행 남녀 메이저 9개 대회">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {cur.map((t) => (
            <Link key={t.tournament_id} to={`/archive?t=${t.tournament_id}`} className="card card-hover p-4">
              <div className="text-[11px] uppercase tracking-widest text-gold">{t.gender === "M" ? "남자" : "여자"}</div>
              <div className="mt-1 font-serif text-base font-bold text-green-deep sm:text-lg">{t.name_ko}</div>
              <div className="num mt-2 text-xs text-charcoal-soft">{t.major_from}– · {held.filter((e) => e.tournament_id === t.tournament_id).length}회</div>
            </Link>
          ))}
        </div>
      </Section>

      <Section kicker="Most recent" title="가장 최근 메이저 우승자">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {latest.map((e) => {
            return (
              <div key={e.edition_id} className="card card-hover border-l-4 border-l-gold p-4">
                <div className="text-xs text-charcoal-soft">{e.year} · <TournamentName id={e.tournament_id} /></div>
                <div className="mt-1 font-serif text-lg font-bold"><PlayerLink id={e.champion!.player_id} name={e.champion!.name} /></div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

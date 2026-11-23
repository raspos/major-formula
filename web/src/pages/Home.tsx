import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useData } from "../data";
import { filterEditions, isHeld, num, pct, playerStats, priorWins, summarize } from "../stats";
import { PlayerLink, Section, SampleNote, TournamentName, cleanName } from "../ui";

export default function Home() {
  const { editions, tournaments } = useData();
  const cur = tournaments.filter((t) => t.is_current);
  const past = tournaments.filter((t) => !t.is_current);

  const facts = useMemo(() => {
    const out: { text: string; value: string; n: number; period: [number, number] | null; scope?: string }[] = [];
    const prior = priorWins(editions, "current");
    for (const [g, lab] of [["M", "남자"], ["W", "여자"]] as const) {
      const eds = filterEditions(editions, { gender: g, mode: "current" });
      const s = summarize(eds, prior);
      if (s.lead.n) {
        const lead = eds.filter((e) => e.lead54);
        const per: [number, number] = [Math.min(...lead.map((e) => e.year)), Math.max(...lead.map((e) => e.year))];
        out.push({ text: `${lab} 메이저: 54홀 종료 때 선두(공동 포함)가 우승한 비율`, value: pct(s.lead.led.rate), n: s.lead.n, period: per, scope: "3라운드 순위표가 있는 대회" });
        out.push({ text: `${lab} 메이저: 최종 라운드 역전 우승 비율`, value: pct(s.lead.comeback.rate), n: s.lead.n, period: per, scope: "3라운드 순위표가 있는 대회" });
      }
      if (s.age.n) out.push({ text: `${lab} 메이저 우승 당시 나이(중앙값)`, value: `${num(s.age.median)}세`, n: s.age.n, period: s.period });
      if (s.firstMajor.n) out.push({ text: `${lab} 메이저 우승 가운데 생애 첫 메이저 우승의 비율`, value: pct(s.firstMajor.rate), n: s.firstMajor.n, period: s.period, scope: "현행 메이저 기준" });
    }
    return out;
  }, [editions]);

  const top = useMemo(() => {
    const all = editions.filter(isHeld);
    return (["M", "W"] as const).map((g) => playerStats(all.filter((e) => e.gender === g))[0]);
  }, [editions]);
  const latest = useMemo(() => editions.filter(isHeld).sort((a, b) => (b.end_date ?? `${b.year}`).localeCompare(a.end_date ?? `${a.year}`)).slice(0, 4), [editions]);

  return (
    <>
      <div className="border-b border-gold/30 bg-green-deep text-ivory">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:py-24">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold-light">databrew SPORTS · PGA · LPGA</div>
            <h1 className="mt-4 font-serif text-5xl font-black leading-tight sm:text-6xl">메이저의 공식</h1>
            <div className="mt-2 font-serif text-xl tracking-[0.25em] text-gold-light sm:text-2xl">THE MAJOR FORMULA</div>
            <p className="mt-8 font-serif text-2xl text-ivory/95">“우승에는 공식이 있는가.”</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ivory/75">
              남녀 프로골프 메이저대회 {editions.filter(isHeld).length.toLocaleString()}개의 우승 기록을 대회별로 쌓았습니다. 나이, 54홀 선두, 역전,
              국적을 직접 골라 다시 계산해 보세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/formula" className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-green-deep hover:bg-gold-light">우승의 공식 탐색</Link>
              <Link to="/archive" className="rounded-sm border border-ivory/40 px-4 py-2 text-sm hover:border-ivory">나의 메이저 시대</Link>
            </div>
          </div>
          <div className="ball mx-auto hidden h-44 w-44 rounded-full md:block" aria-hidden />
        </div>
      </div>

      <Section kicker="The Nine" title="현행 남녀 메이저 9개 대회" note="역사 분석에서는 과거 여자 메이저(웨스턴 오픈·타이틀홀더스·뒤모리에)도 함께 볼 수 있습니다. 메이저로 인정된 해부터만 셉니다.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cur.map((t) => {
            const held = editions.filter((e) => e.tournament_id === t.tournament_id && isHeld(e)).length;
            return (
              <Link key={t.tournament_id} to={`/archive?t=${t.tournament_id}`} className="group rounded-sm border border-charcoal/10 bg-white/70 p-4 hover:border-gold">
                <div className="text-[11px] uppercase tracking-widest text-gold">{t.gender === "M" ? "남자" : "여자"} 메이저</div>
                <div className="mt-1 font-serif text-lg font-bold text-green-deep group-hover:text-green-mid">{t.name_ko}</div>
                <div className="text-xs text-charcoal-soft">{t.name}</div>
                <div className="num mt-3 text-xs text-charcoal-soft">
                  메이저 인정 {t.major_from}년부터 · {held}회 개최{t.first_held !== t.major_from ? ` (창설 ${t.first_held})` : ""}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-charcoal-soft">
          과거 여자 메이저:{" "}
          {past.map((t, i) => (
            <span key={t.tournament_id}>
              {i ? " · " : ""}
              {t.name_ko} ({t.major_from}–{t.major_to})
            </span>
          ))}
        </div>
      </Section>

      <Section kicker="Findings" title="데이터에서 뽑은 핵심 사실" note="아래 수치는 이 사이트의 데이터베이스에서 직접 계산했습니다. 상관관계일 뿐 원인을 말하지 않습니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.text} className="rounded-sm border-l-4 border-gold bg-white/70 p-4">
              <div className="text-sm text-charcoal">{f.text}</div>
              <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">{f.value}</div>
              <SampleNote n={f.n} period={f.period} scope={f.scope} />
            </div>
          ))}
        </div>
      </Section>

      <Section kicker="Explore" title="둘러보기">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["/formula", "우승의 공식", "성별·대회·기간·나이·54홀 선두 여부를 골라 우승 조건을 다시 계산합니다."],
            ["/dna", "메이저 DNA", "두 대회를 골라 역전율·선두 우승률·우승 나이·플레이오프 비율을 비교합니다."],
            ["/legends", "메이저의 지배자", "남녀 최다 우승, 한 해 최다, 최장 기간 우승, 같은 대회 최다 우승."],
            ["/nations", "국가별 패권", "국가별 우승 순위와 시대별 점유율, 미국 제외 순위, 세계 지도."],
            ["/records", "역대 명승부", "최대 역전, 최저 타수, 최연소·최고령, 최대 타수 차를 기준별로 정렬합니다."],
            ["/archive", "역사 아카이브", "연도를 고르면 그해 남녀 메이저 우승자가, 대회를 고르면 그 대회의 역사가 나옵니다."],
          ].map(([to, t, d]) => (
            <Link key={to} to={to} className="rounded-sm border border-charcoal/10 bg-white/70 p-5 hover:border-gold">
              <div className="font-serif text-lg font-bold text-green-deep">{t}</div>
              <p className="mt-2 text-sm text-charcoal-soft">{d}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section kicker="Most recent" title="가장 최근 메이저 우승자">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((e) => (
            <div key={e.edition_id} className="rounded-sm border border-charcoal/10 bg-white/70 p-4">
              <div className="text-xs text-charcoal-soft">{e.year} · <TournamentName id={e.tournament_id} /></div>
              <div className="mt-1 font-serif text-lg font-bold"><PlayerLink id={e.champion!.player_id} name={e.champion!.name} /></div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-charcoal-soft">
          역대 최다 우승 — 남자 {top[0] && <><PlayerLink id={top[0].player_id} name={top[0].name} /> {top[0].wins}승</>}, 여자{" "}
          {top[1] && <><PlayerLink id={top[1].player_id} name={cleanName(top[1].name)} /> {top[1].wins}승 (과거 메이저 포함)</>}
        </p>
      </Section>
    </>
  );
}

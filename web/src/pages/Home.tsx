import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useData } from "../data";
import { CATEGORIES } from "../categories";
import { isHeld, legends, median, num, pct } from "../stats";
import { scoreGoat } from "./Goat";
import { cleanName } from "../ui";
import { COURSES, courseCredit } from "../courses";

export default function Home() {
  const { editions, players } = useData();

  const picks = useMemo(() => {
    const all = legends(editions, players, "all", "all");
    const genders = (["M", "W"] as const);
    const goats = genders.map((gender) => ({
      gender,
      top: scoreGoat(
        legends(editions, players, gender, "current").filter((l) => l.majors >= 3),
      )[0],
    }));
    const specialists = genders.map((gender) => ({
      gender,
      top: all
        .filter((l) => l.p.gender === gender && l.share !== null && (l.tourWins ?? 0) >= 10)
        .sort((a, b) => b.share! - a.share! || b.majors - a.majors)[0],
    }));
    const heights = genders.map((gender) => {
      const values = all
        .filter((l) => l.p.gender === gender && l.p.profile?.height_cm)
        .map((l) => l.p.profile!.height_cm!);
      return { gender, n: values.length, value: median(values) };
    });
    return { goats, specialists, heights };
  }, [editions, players]);

  const leads = useMemo(() => (["M", "W"] as const).map((gender) => {
    const rows = editions.filter((e) => isHeld(e) && e.gender === gender && e.is_current && e.lead54);
    return {
      gender,
      n: rows.length,
      retained: rows.filter((e) => e.lead54?.champion_led).length,
      period: rows.length
        ? [Math.min(...rows.map((e) => e.year)), Math.max(...rows.map((e) => e.year))]
        : null,
    };
  }), [editions]);

  return (
    <>
      <section className="relative min-h-[52vh] md:min-h-[62vh] overflow-hidden bg-green-deep text-white">
        <img src={COURSES.augusta.src} alt={COURSES.augusta.course} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/10" />
        <div className="relative mx-auto flex min-h-[52vh] md:min-h-[62vh] max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs tracking-[0.22em] text-white/80">databrew SPORTS · PGA · LPGA</p>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-6xl">메이저의 공식</h1>
          <p className="mt-2 font-serif text-sm tracking-[0.18em] text-[#E8D9A8] sm:text-lg">THE MAJOR FORMULA</p>
          <p className="mt-5 font-serif text-xl sm:text-2xl">우승에는 공식이 있는가.</p>
        </div>
        <a href={COURSES.augusta.page} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80">
          {courseCredit(COURSES.augusta)}
        </a>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 pt-10 sm:px-6 sm:pt-12" aria-labelledby="featured-title">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Featured</p>
          <h2 id="featured-title" className="mt-1 font-serif text-2xl font-bold text-green-deep sm:text-3xl">메이저에서 발견한 이야기</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Link to="/goat" className="card card-hover flex flex-col p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-gold">GOAT of GOATs</p>
            <h3 className="mt-2 font-serif text-xl font-bold text-green-deep sm:text-2xl">역대 최고 골퍼는 누구일까</h3>
            <p className="mt-1 text-sm text-charcoal-soft">메이저·투어 승수·전성기 등 가중치를 바꾸면 순위도 달라집니다.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {picks.goats.map(({ gender, top }) => (
                <div key={gender} className="rounded-lg bg-ivory p-4">
                  <p className="text-xs text-charcoal-soft">{gender === "M" ? "남자" : "여자"} · 자체 지수 기본값 1위</p>
                  {top ? (
                    <>
                      <p className="mt-1 font-serif text-lg font-bold text-green-deep">{cleanName(top.l.p.name, top.l.p.player_id)}</p>
                      <div className="num mt-3 text-2xl font-bold text-green-deep">{top.l.majors}<span className="ml-1 text-xs font-normal text-charcoal-soft">메이저 승</span></div>
                      <p className="mt-1 text-xs text-charcoal-soft">투어 통산 {top.l.tourWins ?? "—"}승 · 자체 점수 {num(top.score, 0)}</p>
                    </>
                  ) : <p className="mt-3 text-sm text-charcoal-soft">계산할 자료 없음</p>}
                </div>
              ))}
            </div>
            <span className="mt-auto pt-5 text-right text-sm font-semibold text-green-deep">내 기준으로 순위 만들기 →</span>
            <p className="mt-1 text-[11px] text-charcoal-soft">서비스 자체 계산 순위이며 공식 GOAT 순위는 아닙니다. 남녀는 따로 계산합니다.</p>
          </Link>

          <Link to="/formula" className="card card-hover flex flex-col p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-gold">The winning formula</p>
            <h3 className="mt-2 font-serif text-xl font-bold text-green-deep sm:text-2xl">54홀 선두, 끝까지 지킬까</h3>
            <p className="mt-1 text-sm text-charcoal-soft">선두 우승과 역전 우승은 하나의 경기 결과를 나눈 두 비율입니다.</p>
            <div className="mt-6 space-y-5">
              {leads.map(({ gender, n, retained, period }) => (
                <div key={gender}>
                  <div className="mb-2 flex justify-between gap-2 text-sm">
                    <span className="font-semibold text-green-deep">{gender === "M" ? "남자" : "여자"} 메이저</span>
                    <span className="num text-charcoal-soft">{n ? `선두 ${pct(retained / n)} · 역전 ${pct((n - retained) / n)}` : "자료 없음"}</span>
                  </div>
                  {n > 0 && (
                    <div className="flex h-5 overflow-hidden rounded-full" role="img" aria-label={`선두 우승 ${pct(retained / n)}, 역전 우승 ${pct((n - retained) / n)}`}>
                      <div className="bg-green-deep" style={{ width: `${100 * retained / n}%` }} />
                      <div className="bg-gold" style={{ width: `${100 * (n - retained) / n}%` }} />
                    </div>
                  )}
                  <p className="num mt-1 text-xs text-charcoal-soft">{n ? `54홀 순위표 ${n}개 대회 · ${period?.[0]}–${period?.[1]}년` : "54홀 순위표 확보 대회 없음"}</p>
                </div>
              ))}
            </div>
            <span className="mt-auto pt-5 text-right text-sm font-semibold text-green-deep">역전 우승의 조건 분석 →</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6" aria-label="더 살펴볼 핵심 분석">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/specialist" className="card card-hover block p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-gold">Major specialist</p>
            <h3 className="mt-2 font-serif text-xl font-bold text-green-deep">메이저에 유난히 강한 선수</h3>
            <p className="mt-1 text-sm text-charcoal-soft">전체 투어 우승 중 메이저 우승 비중을 비교합니다.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {picks.specialists.map(({ gender, top }) => (
                <div key={gender}>
                  <p className="text-xs text-charcoal-soft">{gender === "M" ? "남자" : "여자"} · 통산 10승 이상</p>
                  <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">{top ? pct(top.share, 1) : "—"}</div>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-soft">{top ? cleanName(top.p.name, top.p.player_id) : "기록 없음"}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-charcoal-soft">투어 공식 승수와 메이저 승수의 집계 기준이 맞는 선수만 비교합니다.</p>
            <span className="mt-4 block text-right text-sm font-semibold text-green-deep">스페셜리스트 보기 →</span>
          </Link>

          <Link to="/champion-dna" className="card card-hover block p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-gold">The champion's DNA</p>
            <h3 className="mt-2 font-serif text-xl font-bold text-green-deep">우승자는 어떤 몸을 가졌을까</h3>
            <p className="mt-1 text-sm text-charcoal-soft">역대 메이저 우승자의 신장 분포부터 탐색합니다.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {picks.heights.map(({ gender, n, value }) => (
                <div key={gender}>
                  <p className="text-xs text-charcoal-soft">{gender === "M" ? "남자" : "여자"} · 신장 중앙값</p>
                  <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">
                    {value === null ? "—" : num(value, 0)}{value !== null && <span className="ml-1 text-sm">cm</span>}
                  </div>
                  <p className="mt-1 text-xs text-charcoal-soft">신장 확인 {n}명</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-charcoal-soft">우승자만을 대상으로 한 분석입니다. 키가 우승에 유리하다는 뜻은 아닙니다.</p>
            <span className="mt-4 block text-right text-sm font-semibold text-green-deep">챔피언 DNA 보기 →</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6" aria-labelledby="category-title">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Explore</p>
          <h2 id="category-title" className="mt-1 font-serif text-2xl font-bold text-green-deep sm:text-3xl">주제별 분석</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((category) => (
            <article key={category.slug} className="card p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-gold">{category.kicker}</p>
              <h3 className="mt-2 font-serif text-xl font-bold text-green-deep">{category.title}</h3>
              <div className="mt-4 space-y-1 border-t border-charcoal/10 pt-3">
                {category.items.map((item) => (
                  <Link key={item.to} to={item.to} className="group flex items-center justify-between gap-2 rounded-md py-2 text-sm text-charcoal hover:text-green-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                    <span>{item.title}</span>
                    <span aria-hidden="true" className="text-gold transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

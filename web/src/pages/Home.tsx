import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useData } from "../data";
import { CATEGORIES } from "../categories";
import { isHeld, pct } from "../stats";
import { COURSES, courseCredit } from "../courses";

export default function Home() {
  const { editions } = useData();
  const lead = useMemo(
    () => editions.filter((e) => isHeld(e) && e.gender === "M" && e.is_current && e.lead54),
    [editions],
  );
  const retained = lead.filter((e) => e.lead54?.champion_led).length;
  const years = lead.length
    ? [Math.min(...lead.map((e) => e.year)), Math.max(...lead.map((e) => e.year))]
    : null;

  return (
    <>
      <section className="relative min-h-[42vh] overflow-hidden bg-green-deep text-white">
        <img src={COURSES.augusta.src} alt={COURSES.augusta.course} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto flex min-h-[42vh] max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs tracking-[0.22em] text-white/80">databrew SPORTS · PGA · LPGA</p>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-6xl">메이저의 공식</h1>
          <p className="mt-2 font-serif text-sm tracking-[0.18em] text-[#E8D9A8] sm:text-lg">THE MAJOR FORMULA</p>
          <p className="mt-5 font-serif text-xl sm:text-2xl">우승에는 공식이 있는가.</p>
        </div>
        <a href={COURSES.augusta.page} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80">{courseCredit(COURSES.augusta)}</a>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12" aria-labelledby="category-title">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Explore</p>
          <h2 id="category-title" className="mt-2 font-serif text-2xl font-bold text-green-deep sm:text-3xl">세 가지 시선으로 보는 메이저</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link key={category.slug} to={"/category/" + category.slug} className="card card-hover flex min-h-44 flex-col justify-between p-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold">{category.kicker}</p>
                <h3 className="mt-2 font-serif text-2xl font-bold text-green-deep">{category.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{category.summary}</p>
              </div>
              <span className="mt-5 text-right text-sm font-medium text-green-deep">들어가기 →</span>
            </Link>
          ))}
        </div>
      </section>

      {lead.length > 0 && years && (
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6" aria-label="오늘의 발견">
          <Link to="/formula" className="group flex flex-col gap-3 border-t border-charcoal/15 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-gold">데이터로 확인한 한 가지</p>
              <p className="mt-2 font-serif text-lg font-bold text-green-deep">남자 메이저, 54홀 선두가 끝까지 우승한 비율</p>
              <p className="mt-1 text-xs text-charcoal-soft">3라운드 순위표 확보 {lead.length}개 대회 · {years[0]}–{years[1]}년</p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-6">
              <span className="num font-serif text-4xl font-bold text-green-deep">{pct(retained / lead.length)}</span>
              <span className="text-sm text-gold group-hover:underline">분석 보기 →</span>
            </div>
          </Link>
        </section>
      )}
    </>
  );
}

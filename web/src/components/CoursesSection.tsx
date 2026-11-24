import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../data";
import { isHeld, toParStr } from "../stats";
import { COURSE_INFO } from "../courseInfo";
import { cleanName } from "../ui";

export default function CoursesSection() {
  const { editions, tById } = useData();
  const [sel, setSel] = useState(COURSE_INFO[0].id);
  const c = COURSE_INFO.find((x) => x.id === sel)!;

  const rec = useMemo(() => {
    const alias = new Set(c.aliases);
    const eds = editions.filter((e) => isHeld(e) && e.venue && alias.has(e.venue)).sort((a, b) => b.year - a.year);
    const byT = new Map<string, number>();
    eds.forEach((e) => byT.set(e.tournament_id, (byT.get(e.tournament_id) ?? 0) + 1));
    const wins = new Map<string, { id: string; name: string; n: number }>();
    eds.forEach((e) => {
      const r = wins.get(e.champion!.player_id) ?? { id: e.champion!.player_id, name: e.champion!.name, n: 0 };
      r.n++; wins.set(r.id, r);
    });
    const ws = [...wins.values()].sort((a, b) => b.n - a.n);
    const scored = eds.filter((e) => e.champion!.to_par !== null && e.format === "stroke");
    const low = scored.length ? Math.min(...scored.map((e) => e.champion!.to_par!)) : null;
    return {
      eds, n: eds.length,
      byT: [...byT.entries()].sort((a, b) => b[1] - a[1]),
      top: ws.filter((w) => w.n === ws[0]?.n && w.n > 1),
      low, lowEds: low === null ? [] : scored.filter((e) => e.champion!.to_par === low),
      first: eds.length ? eds[eds.length - 1].year : null,
    };
  }, [c, editions]);

  return (
    <section className="py-12" aria-labelledby="courses-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">The Courses</p>
        <h2 id="courses-title" className="mt-1 font-serif text-2xl font-bold text-green-deep sm:text-3xl">메이저의 무대</h2>
        <div className="-mx-4 mt-5 overflow-x-auto px-4" role="tablist">
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {COURSE_INFO.map((x) => (
              <button key={x.id} role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${sel === x.id ? "border-green-deep bg-green-deep text-ivory" : "border-green-deep/20 bg-white text-green-deep hover:border-gold"}`}>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-24px_rgba(20,53,42,0.55)]">
          <figure className="relative h-[34vh] min-h-[220px] overflow-hidden bg-green-deep sm:h-[46vh]">
            {c.photo ? (
              <img key={c.id} src={c.photo.src} alt={c.photo.course} className="h-full w-full animate-[fadeUp_.6s_ease-out_both] object-cover" />
            ) : (
              <div className="flex h-full items-end bg-[radial-gradient(circle_at_70%_20%,#2D5A46,#14352A)] p-6 text-ivory/70">
                <span className="text-xs">자유 이용 가능한 코스 사진을 확보하지 못했습니다</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <p className="text-xs tracking-[0.18em] text-white/80">{c.official_name}</p>
              <h3 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{c.name}</h3>
              <p className="mt-1 text-sm text-white/85">{c.location}</p>
            </figcaption>
            {c.photo && <a href={c.photo.page} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded bg-black/35 px-1.5 py-0.5 text-[10px] text-white/80">{c.photo.artist} · {c.photo.license}</a>}
          </figure>

          <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-[11px] text-charcoal-soft">개장</dt><dd className="font-medium">{c.opened}</dd></div>
                <div><dt className="text-[11px] text-charcoal-soft">유형</dt><dd className="font-medium">{c.type}</dd></div>
                <div className="col-span-2 sm:col-span-1"><dt className="text-[11px] text-charcoal-soft">설계</dt><dd className="font-medium">{c.design.map((d) => <span key={d} className="block">{d}</span>)}</dd></div>
              </dl>
              <div className="mt-6 space-y-4">
                {c.features.map((f) => (
                  <div key={f.title} className="border-l-2 border-gold pl-4">
                    <p className="font-serif text-lg font-bold text-green-deep">{f.title}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-charcoal">{f.text}</p>
                  </div>
                ))}
              </div>
              <a href={c.url} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs text-charcoal-soft underline decoration-charcoal/30">공식 사이트</a>
            </div>

            <div className="rounded-xl bg-ivory p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Major record</p>
              <p className="num mt-2 font-serif text-4xl font-bold text-green-deep">{rec.n}<span className="ml-1 text-base font-normal">회</span></p>
              <p className="text-xs text-charcoal-soft">이 코스에서 열린 메이저{rec.first ? ` · ${rec.first}년부터` : ""}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {rec.byT.map(([tid, k]) => (
                  <li key={tid} className="flex justify-between"><Link to={`/archive?t=${tid}`} className="hover:underline">{tById[tid]?.name_ko}</Link><span className="num">{k}회</span></li>
                ))}
              </ul>
              <div className="mt-4 space-y-3 border-t border-charcoal/10 pt-4 text-sm">
                {rec.top.length > 0 && (
                  <div>
                    <p className="text-[11px] text-charcoal-soft">이 코스 최다 우승</p>
                    <p>{rec.top.slice(0, 4).map((w, i) => <span key={w.id}>{i ? ", " : ""}<Link to={`/player/${encodeURIComponent(w.id)}`} className="font-medium hover:underline">{cleanName(w.name, w.id)}</Link></span>)} {rec.top.length > 4 && `외 ${rec.top.length - 4}명 `}<span className="num text-charcoal-soft">{rec.top[0].n}승</span></p>
                  </div>
                )}
                {rec.low !== null && (
                  <div>
                    <p className="text-[11px] text-charcoal-soft">최저 우승 스코어(파 대비)</p>
                    <p><span className="num font-serif text-xl font-bold text-green-deep">{toParStr(rec.low)}</span>{" "}
                      {rec.lowEds.map((e, i) => <span key={e.edition_id}>{i ? ", " : ""}<Link to={`/edition/${e.edition_id}`} className="hover:underline">{e.year} {cleanName(e.champion!.name, e.champion!.player_id)}</Link></span>)}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 border-t border-charcoal/10 pt-4">
                <p className="text-[11px] text-charcoal-soft">최근 대회</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {rec.eds.slice(0, 6).map((e) => (
                    <li key={e.edition_id}>
                      <Link to={`/edition/${e.edition_id}`} className="flex justify-between gap-2 hover:underline">
                        <span className="num">{e.year} <span className="text-charcoal-soft">{tById[e.tournament_id]?.name_ko}</span></span>
                        <span className="truncate">{cleanName(e.champion!.name, e.champion!.player_id)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

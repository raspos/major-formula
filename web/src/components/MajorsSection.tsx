import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../data";
import { isHeld } from "../stats";
import { MAJORS_INFO } from "../majorsInfo";
import { cleanName } from "../ui";
import type { Edition } from "../types";

const ORDER = { M: ["masters", "pga", "us_open", "the_open"], W: ["chevron", "womens_pga", "us_womens_open", "evian", "womens_open"] } as const;

function topWinners(eds: Edition[]) {
  const m = new Map<string, { id: string; name: string; n: number }>();
  for (const e of eds) {
    const c = e.champion!;
    const r = m.get(c.player_id) ?? { id: c.player_id, name: c.name, n: 0 };
    r.n++;
    m.set(c.player_id, r);
  }
  const all = [...m.values()].sort((a, b) => b.n - a.n);
  return all.filter((r) => r.n === all[0]?.n);
}

export default function MajorsSection() {
  const { editions, tById } = useData();
  const [g, setG] = useState<"M" | "W">("M");
  const cards = useMemo(() => ORDER[g].map((id) => {
    const t = tById[id];
    const eds = editions.filter((e) => e.tournament_id === id && isHeld(e));
    const last = [...eds].sort((a, b) => b.year - a.year)[0];
    return { id, t, info: MAJORS_INFO[id], n: eds.length, top: topWinners(eds), last };
  }), [editions, tById, g]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="majors-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">The Majors</p>
          <h2 id="majors-title" className="mt-1 font-serif text-2xl font-bold text-green-deep sm:text-3xl">현행 메이저 9개 대회</h2>
        </div>
        <div className="flex rounded-full border border-green-deep/20 bg-white p-1 text-sm" role="tablist">
          {(["M", "W"] as const).map((x) => (
            <button key={x} role="tab" aria-selected={g === x} onClick={() => setG(x)}
              className={`rounded-full px-4 py-1.5 transition ${g === x ? "bg-green-deep text-ivory" : "text-green-deep hover:bg-ivory"}`}>
              {x === "M" ? "남자 4개" : "여자 5개"}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-6 grid gap-4 md:grid-cols-2 ${g === "W" ? "lg:grid-cols-3" : ""}`}>
        {cards.map(({ id, t, info, n, top, last }) => (
          <article key={id} className="card flex flex-col p-5 sm:p-6">
            <h3 className="font-serif text-2xl font-bold text-green-deep">{t?.name_ko}</h3>
            <p className="num mt-1 text-xs text-charcoal-soft">
              창설 {t?.first_held} · 메이저 {t?.major_from}{t && t.major_from !== t.first_held ? " 승격" : "부터"}
            </p>
            <p className="mt-1 text-xs font-medium text-gold">{info.host}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-charcoal">{info.intro}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-charcoal/10 pt-4">
              <div>
                <p className="text-[11px] text-charcoal-soft">최다 우승</p>
                {top[0] && top[0].n > 1 ? (
                  <>
                    <p className="num font-serif text-3xl font-bold text-green-deep">{top[0].n}<span className="ml-0.5 text-sm font-normal">승</span></p>
                    <p className="text-xs leading-snug text-charcoal">
                      {top.slice(0, 4).map((w, i) => <span key={w.id}>{i ? ", " : ""}<Link to={`/player/${encodeURIComponent(w.id)}`} className="hover:underline">{cleanName(w.name, w.id)}</Link></span>)}
                      {top.length > 4 && ` 외 ${top.length - 4}명`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="num font-serif text-3xl font-bold text-green-deep">{top.length}<span className="ml-0.5 text-sm font-normal">명</span></p>
                    <p className="text-xs leading-snug text-charcoal">모두 1승 · 2승 선수 없음</p>
                  </>
                )}
              </div>
              <div>
                <p className="text-[11px] text-charcoal-soft">메이저로 열린 대회</p>
                <p className="num font-serif text-3xl font-bold text-green-deep">{n}<span className="ml-0.5 text-sm font-normal">회</span></p>
                {last && <p className="text-xs text-charcoal">최근 {last.year} · {cleanName(last.champion!.name, last.champion!.player_id)}</p>}
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between pt-5 text-sm">
              {info.official ? <a href={info.official} target="_blank" rel="noreferrer" className="text-xs text-charcoal-soft underline decoration-charcoal/30">공식 사이트</a> : <span />}
              <Link to={`/archive?t=${id}`} className="font-semibold text-green-deep">역대 우승 기록 →</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { CATEGORIES } from "../categories";
import { COURSES, courseCredit } from "../courses";
import { useData } from "../data";
import { cleanName } from "../ui";

const PORTRAIT_IDS = ["wp:Jack Nicklaus", "wp:Inbee Park"];

export default function CategoryShowcase() {
  const { pById } = useData();
  const portraits = PORTRAIT_IDS.map((id) => pById[id]).filter((p) => p?.photo);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-9 sm:px-6 sm:pb-20" aria-labelledby="category-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-charcoal/15 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.23em] text-gold">THE COLLECTION</p>
          <h2 id="category-title" className="mt-1 font-serif text-3xl font-bold tracking-tight text-green-deep sm:text-4xl">주제별 분석</h2>
        </div>
        <span className="num text-xs tracking-[0.16em] text-charcoal-soft">01 — 04</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {CATEGORIES.map((category, index) => {
          const dark = index === 0 || index === 3;
          return (
            <article key={category.slug} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-[0_6px_24px_-16px_rgba(20,53,42,0.4)] transition-shadow duration-300 hover:shadow-[0_18px_36px_-18px_rgba(20,53,42,0.38)]">
              <div className={`relative flex h-44 flex-col justify-between overflow-hidden px-5 pb-5 pt-4 sm:h-48 sm:px-6 ${index === 0 ? "bg-[#16382D] text-white" : index === 1 ? "bg-[#e9e1d2] text-green-deep" : index === 2 ? "bg-[#cfddcf] text-green-deep" : "bg-[#2C453A] text-white"}`}>
                {index === 0 && (
                  <>
                    <div className="absolute inset-y-0 right-0 flex w-[58%] items-end justify-end gap-1 pr-3">
                      {portraits.map((p) => (
                        <img
                          key={p.player_id}
                          src={p.photo!.thumb}
                          alt={cleanName(p.name, p.player_id)}
                          loading="lazy"
                          className="h-[90%] w-[43%] rounded-t object-cover object-top grayscale-[35%] opacity-80 transition duration-500 group-hover:scale-[1.035]"
                        />
                      ))}
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#16382D] via-[#16382D]/90 to-[#16382D]/30" />
                  </>
                )}
                {index === 1 && (
                  <div className="pointer-events-none absolute -right-10 -top-14 h-72 w-72 rounded-full border border-[#b39d76]/45">
                    <div className="absolute inset-6 rounded-full border border-[#b39d76]/40" />
                    <div className="absolute inset-12 rounded-full border border-[#b39d76]/30" />
                    <div className="absolute inset-[4.5rem] rounded-full border border-[#b39d76]/25" />
                    <span className="absolute bottom-11 left-0 -rotate-90 font-serif text-sm tracking-[0.28em] text-[#816c47]/60">PROFILE</span>
                  </div>
                )}
                {index === 2 && (
                  <div className="pointer-events-none absolute -bottom-10 right-5 font-serif text-[10rem] font-bold leading-none tracking-[-0.08em] text-[#6d9275]/25 sm:text-[11rem]">54</div>
                )}
                {index === 3 && (
                  <>
                    <img src={COURSES.standrews.src} alt={COURSES.standrews.course} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 transition-transform duration-700 group-hover:scale-105" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#102a21]/95 via-[#102a21]/60 to-[#102a21]/15" />
                    <a href={COURSES.standrews.page} target="_blank" rel="noopener noreferrer" className="absolute bottom-1.5 right-2 z-20 rounded bg-black/30 px-1 text-[9px] text-white/90" title={courseCredit(COURSES.standrews)}>
                      {COURSES.standrews.artist} · {COURSES.standrews.license}
                    </a>
                  </>
                )}

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <span className={`num text-xs font-semibold tracking-[0.12em] ${dark ? "text-white/75" : "text-green-deep/65"}`}>NO. 0{index + 1}</span>
                  <span className={`text-[10px] font-semibold tracking-[0.2em] ${dark ? "text-[#dec58d]" : "text-[#806943]"}`}>{category.kicker}</span>
                </div>

                <div className="relative z-10">
                  <h3 className="font-serif text-3xl font-bold leading-tight sm:text-[2.15rem]">{category.title}</h3>
                  <div className={`mt-3 h-[2px] w-10 ${dark ? "bg-[#DEC58D]" : "bg-[#92744F]"}`} />
                </div>

                {index === 0 && portraits.length > 0 && (
                  <div className="absolute bottom-1.5 right-2 z-20 flex max-w-[55%] flex-wrap justify-end gap-x-2 gap-y-0 text-[9px] text-white/80">
                    {portraits.map((p) => (
                      <a key={p.player_id} href={p.photo!.page} target="_blank" rel="noopener noreferrer" title={`사진: ${p.photo!.artist}, ${p.photo!.license}`} className="underline decoration-white/30 hover:text-white">
                        {p.photo!.artist} · {p.photo!.license}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <nav aria-label={`${category.title} 바로가기`} className="flex flex-1 flex-col px-4 py-2 sm:px-5">
                {category.items.map((item, itemIndex) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group/item flex min-h-14 items-center gap-3 border-b border-charcoal/10 px-2 py-2 text-green-deep transition-colors last:border-b-0 hover:bg-[#f5f1e9] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <span className="num w-5 shrink-0 text-[11px] text-[#9e895e]">0{itemIndex + 1}</span>
                    <span className="min-w-0 flex-1 font-serif text-base font-semibold leading-snug">{item.title}</span>
                    <span aria-hidden="true" className="shrink-0 text-lg text-[#a08048] transition-transform duration-200 group-hover/item:translate-x-1">↗</span>
                  </Link>
                ))}
              </nav>
            </article>
          );
        })}
      </div>
    </section>
  );
}

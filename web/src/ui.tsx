import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SMALL_SAMPLE, pct, type Rate } from "./stats";
import { playerSlug, useData, useNation } from "./data";
import type { Edition } from "./types";

/** Fades its children up the first time they scroll into view. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setIn(true); return; }
    let seen = false;
    const io = new IntersectionObserver(([e]) => { seen = true; if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    const t = window.setTimeout(() => { if (!seen) setIn(true); }, 1500); // observer never reported: show anyway
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, []);
  return <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`}>{children}</div>;
}

export function Section({ kicker, title, children, note }: { kicker?: string; title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <Reveal><section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {kicker && <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-gold">{kicker}</div>}
      <h2 className="font-serif text-2xl font-bold text-green-deep sm:text-3xl">{title}</h2>
      <div className="rule my-4" />
      {note && (
        <details className="mb-6 max-w-3xl text-sm text-charcoal-soft">
          <summary className="cursor-pointer select-none text-xs text-gold">기준 보기</summary>
          <p className="mt-2 leading-relaxed">{note}</p>
        </details>
      )}
      {children}
    </section></Reveal>
  );
}

export function SampleNote({ n, period, scope }: { n: number; period?: [number, number] | null; scope?: string }) {
  return (
    <div className="mt-1 text-xs text-charcoal-soft">
      표본 {n.toLocaleString()}개 대회{period ? ` · ${period[0]}–${period[1]}` : ""}
      {scope ? ` · ${scope}` : ""}
      {n > 0 && n < SMALL_SAMPLE && <span className="ml-1 font-medium text-[#8a4b1a]">· 표본이 작아 해석에 주의</span>}
    </div>
  );
}

export function Stat({ label, value, sub, n, period }: { label: string; value: ReactNode; sub?: ReactNode; n?: number; period?: [number, number] | null }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-charcoal-soft">{label}</div>
      <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">{value}</div>
      {sub && <div className="mt-1 text-xs text-charcoal-soft">{sub}</div>}
      {n !== undefined && <SampleNote n={n} period={period} />}
    </div>
  );
}

export function RateStat({ label, r, period, scope }: { label: string; r: Rate; period?: [number, number] | null; scope?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-charcoal-soft">{label}</div>
      <div className="num mt-1 font-serif text-3xl font-bold text-green-deep">{r.n ? pct(r.rate) : "—"}</div>
      <div className="num mt-1 text-xs text-charcoal-soft">
        {r.n ? `${r.k} / ${r.n}` : "계산할 자료 없음"}
        {r.ci && ` · 95% 신뢰구간 ${pct(r.ci[0])}–${pct(r.ci[1])}`}
      </div>
      <SampleNote n={r.n} period={period} scope={scope} />
    </div>
  );
}

/** Real photo (Wikimedia Commons, free licence) when available, otherwise a monogram. Never an AI image. */
export function Portrait({ name, size = 56, src }: { name: string; size?: number; src?: string | null }) {
  if (src)
    return (
      <img src={src} alt={cleanName(name)} loading="lazy" width={size} height={size}
        className="shrink-0 rounded-full border border-gold/60 object-cover object-top grayscale-[15%]" style={{ width: size, height: size }} />
    );
  const initials = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-green-deep font-serif text-ivory"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
      title="자유 이용 가능한 사진을 찾지 못한 선수입니다"
    >
      {initials}
    </div>
  );
}

/** Author + licence line for a Commons photo (required by CC BY / CC BY-SA). */
export function PhotoCredit({ pid, className = "" }: { pid: string; className?: string }) {
  const { pById } = useData();
  const ph = pById[pid]?.photo;
  if (!ph) return null;
  return (
    <div className={`text-[10px] leading-tight text-charcoal-soft ${className}`}>
      사진 <a className="underline" href={ph.page} target="_blank" rel="noreferrer">{ph.artist}</a> · {ph.license_url ? <a className="underline" href={ph.license_url} target="_blank" rel="noreferrer">{ph.license}</a> : ph.license}
    </div>
  );
}

export function PlayerLink({ id, name }: { id: string; name: string }) {
  return (
    <Link className="underline decoration-gold/50 underline-offset-2 hover:text-green-mid" to={`/player/${playerSlug(id)}`}>
      {cleanName(name)}
    </Link>
  );
}

export const cleanName = (n: string) => n.replace(/\s*\((golfer|American golfer|footballer)\)$/, "");

export function NationTag({ code }: { code: string | null | undefined }) {
  const name = useNation()(code);
  return <span className="whitespace-nowrap rounded-sm bg-green-soft px-1.5 py-0.5 text-[11px] text-green-deep">{name}</span>;
}

export function TournamentName({ id }: { id: string }) {
  const { tById } = useData();
  return <>{tById[id]?.name_ko ?? id}</>;
}

export function EditionLine({ e }: { e: Edition }) {
  const c = e.champion;
  return (
    <span>
      {e.year} <TournamentName id={e.tournament_id} /> — {c ? <PlayerLink id={c.player_id} name={c.name} /> : "—"}
    </span>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${active ? "border-green-deep bg-green-deep text-ivory" : "border-charcoal/20 bg-white text-charcoal hover:border-green-mid"}`}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-sm border border-dashed border-charcoal/30 p-6 text-sm text-charcoal-soft">{children}</div>;
}

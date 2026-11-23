// Pure statistics used by every page. Inputs are the exported database rows;
// nothing is estimated. Every result carries the sample size it was computed from.
import type { Edition, Gender, Mode } from "./types";

export const SMALL_SAMPLE = 30;

export interface Filter {
  gender?: Gender | "all";
  mode?: Mode;
  tournaments?: string[];
  yearFrom?: number;
  yearTo?: number;
  ageMin?: number;
  ageMax?: number;
  led54?: "any" | "led" | "behind";
}

export const isHeld = (e: Edition) => e.status === "held" && !!e.champion;

export function filterEditions(eds: Edition[], f: Filter): Edition[] {
  return eds.filter((e) => {
    if (!isHeld(e)) return false;
    if (f.gender && f.gender !== "all" && e.gender !== f.gender) return false;
    if (f.mode === "current" && !e.is_current) return false;
    if (f.tournaments && f.tournaments.length && !f.tournaments.includes(e.tournament_id)) return false;
    if (f.yearFrom !== undefined && e.year < f.yearFrom) return false;
    if (f.yearTo !== undefined && e.year > f.yearTo) return false;
    const a = e.champion!.age_years;
    if ((f.ageMin !== undefined || f.ageMax !== undefined) && a === null) return false;
    if (f.ageMin !== undefined && a !== null && a < f.ageMin) return false;
    if (f.ageMax !== undefined && a !== null && a >= f.ageMax) return false;
    if (f.led54 && f.led54 !== "any") {
      if (!e.lead54) return false;
      if (f.led54 === "led" && !e.lead54.champion_led) return false;
      if (f.led54 === "behind" && e.lead54.champion_led) return false;
    }
    return true;
  });
}

export interface Rate {
  k: number;
  n: number;
  rate: number | null;
  ci: [number, number] | null;
}

export function wilson(k: number, n: number, z = 1.96): [number, number] | null {
  if (!n) return null;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export const rate = (k: number, n: number): Rate => ({ k, n, rate: n ? k / n : null, ci: wilson(k, n) });

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Number of earlier major wins for each champion, counted inside the same set of events. */
export function priorWins(all: Edition[], mode: Mode): Map<string, number> {
  const held = all
    .filter((e) => isHeld(e) && (mode === "all" || e.is_current))
    .sort((a, b) => a.year - b.year || (a.end_date ?? "").localeCompare(b.end_date ?? ""));
  const seen = new Map<string, number>();
  const out = new Map<string, number>();
  for (const e of held) {
    const p = e.champion!.player_id;
    out.set(e.edition_id, seen.get(p) ?? 0);
    seen.set(p, (seen.get(p) ?? 0) + 1);
  }
  return out;
}

export interface Summary {
  n: number;
  period: [number, number] | null;
  age: { n: number; nDay: number; mean: number | null; median: number | null; min: Edition | null; max: Edition | null };
  ageBands: { band: string; k: number; n: number }[];
  toPar: { n: number; mean: number | null; best: Edition | null; worst: Edition | null };
  playoff: Rate;
  lead: {
    n: number;
    led: Rate;
    soloLed: Rate;
    comeback: Rate;
    byMargin: { label: string; r: Rate }[];
    deficits: { deficit: number; count: number }[];
    maxDeficit: Edition | null;
  };
  firstMajor: Rate;
  repeatInEvent: Rate;
  marginMean: { n: number; mean: number | null };
}

/** Whether each champion had already won the same event before — over the WHOLE history, never the filtered slice. */
export function repeatMap(all: Edition[]): Map<string, boolean> {
  const held = all.filter(isHeld).sort((a, b) => a.year - b.year);
  const seen = new Set<string>();
  const out = new Map<string, boolean>();
  for (const e of held) {
    const k = `${e.tournament_id}|${e.champion!.player_id}`;
    out.set(e.edition_id, seen.has(k));
    seen.add(k);
  }
  return out;
}

export function summarize(eds: Edition[], prior?: Map<string, number>, repeat?: Map<string, boolean>): Summary {
  const held = eds.filter(isHeld);
  const years = held.map((e) => e.year);
  const withAge = held.filter((e) => e.champion!.age_years !== null);
  const ages = withAge.map((e) => e.champion!.age_years!);
  const bands = [
    ["20세 미만", 0, 20],
    ["20대", 20, 30],
    ["30대", 30, 40],
    ["40대 이상", 40, 200],
  ] as const;
  const stroke72 = held.filter((e) => e.format === "stroke" && e.holes === 72 && e.champion!.to_par !== null);
  const lead = held.filter((e) => e.lead54);
  const solo = lead.filter((e) => e.lead54!.solo);
  const dmap = new Map<number, number>();
  lead.forEach((e) => dmap.set(e.lead54!.deficit, (dmap.get(e.lead54!.deficit) ?? 0) + 1));
  const byMargin = [1, 2, 3].map((m) => {
    const sub = solo.filter((e) => e.lead54!.lead_margin !== null && (m < 3 ? e.lead54!.lead_margin === m : e.lead54!.lead_margin! >= 3));
    return { label: m < 3 ? `${m}타 차 단독 선두` : "3타 차 이상 단독 선두", r: rate(sub.filter((e) => e.lead54!.champion_led).length, sub.length) };
  });
  const byAge = (dir: 1 | -1) =>
    withAge.reduce<Edition | null>((acc, e) => (!acc || dir * (e.champion!.age_years! - acc.champion!.age_years!) < 0 ? e : acc), null);
  const byPar = (dir: 1 | -1) =>
    stroke72.reduce<Edition | null>((acc, e) => (!acc || dir * (e.champion!.to_par! - acc.champion!.to_par!) < 0 ? e : acc), null);
  const pf = held.filter((e) => e.playoff !== null);
  const withPrior = prior ? held.filter((e) => prior.has(e.edition_id)) : [];
  // career history decides "already won this event"; the filter only decides which editions are counted
  const rep = repeat ?? repeatMap(eds);
  const repeatK = held.filter((e) => rep.get(e.edition_id)).length;
  const margins = held.filter((e) => e.margin !== null && e.format === "stroke").map((e) => e.margin!);
  return {
    n: held.length,
    period: years.length ? [Math.min(...years), Math.max(...years)] : null,
    age: { n: ages.length, nDay: withAge.filter((e) => e.champion!.age_precision === "day").length, mean: mean(ages), median: median(ages), min: byAge(1), max: byAge(-1) },
    ageBands: bands.map(([band, lo, hi]) => ({ band, k: ages.filter((a) => a >= lo && a < hi).length, n: ages.length })),
    toPar: { n: stroke72.length, mean: mean(stroke72.map((e) => e.champion!.to_par!)), best: byPar(1), worst: byPar(-1) },
    playoff: rate(pf.filter((e) => e.playoff === 1).length, pf.length),
    lead: {
      n: lead.length,
      led: rate(lead.filter((e) => e.lead54!.champion_led).length, lead.length),
      soloLed: rate(solo.filter((e) => e.lead54!.champion_led).length, solo.length),
      comeback: rate(lead.filter((e) => e.lead54!.deficit > 0).length, lead.length),
      byMargin,
      deficits: [...dmap.entries()].sort((a, b) => a[0] - b[0]).map(([deficit, count]) => ({ deficit, count })),
      maxDeficit: lead.reduce<Edition | null>((acc, e) => (!acc || e.lead54!.deficit > acc.lead54!.deficit ? e : acc), null),
    },
    firstMajor: rate(withPrior.filter((e) => prior!.get(e.edition_id) === 0).length, withPrior.length),
    repeatInEvent: rate(repeatK, held.length),
    marginMean: { n: margins.length, mean: mean(margins) },
  };
}

// ---- nations -------------------------------------------------------------------------
export interface NationRow {
  code: string;
  wins: number;
  men: number;
  women: number;
  share: number; // of all wins in the selection (denominator always the full selection)
  firstYear: number;
  lastYear: number;
}

export function nationTable(eds: Edition[], excludeUSA = false): { rows: NationRow[]; total: number; unknown: number } {
  const held = eds.filter(isHeld);
  const total = held.length;
  const m = new Map<string, NationRow>();
  let unknown = 0;
  for (const e of held) {
    const c = e.champion!.nation_code;
    if (!c) {
      unknown++;
      continue;
    }
    const r = m.get(c) ?? { code: c, wins: 0, men: 0, women: 0, share: 0, firstYear: e.year, lastYear: e.year };
    r.wins++;
    if (e.gender === "M") r.men++;
    else r.women++;
    r.firstYear = Math.min(r.firstYear, e.year);
    r.lastYear = Math.max(r.lastYear, e.year);
    m.set(c, r);
  }
  let rows = [...m.values()].map((r) => ({ ...r, share: total ? r.wins / total : 0 }));
  if (excludeUSA) rows = rows.filter((r) => r.code !== "USA"); // share keeps the full denominator
  rows.sort((a, b) => b.wins - a.wins || a.code.localeCompare(b.code));
  return { rows, total, unknown };
}

/** Share of a nation's wins among all majors held in each window (decade or rolling). */
export function nationShareSeries(eds: Edition[], codes: string[], window: number, step = 1) {
  const held = eds.filter(isHeld);
  if (!held.length) return [];
  const y0 = Math.min(...held.map((e) => e.year));
  const y1 = Math.max(...held.map((e) => e.year));
  const out: Record<string, number | string | null>[] = [];
  for (let y = y0 + window - 1; y <= y1; y += step) {
    const sub = held.filter((e) => e.year > y - window && e.year <= y);
    const row: Record<string, number | string | null> = { year: y, label: window > 1 ? `${y - window + 1}–${y}` : `${y}`, n: sub.length };
    // no major held in the window -> null (blank), never 0%
    for (const c of codes) row[c] = sub.length ? sub.filter((e) => e.champion!.nation_code === c).length / sub.length : null;
    out.push(row);
  }
  return out;
}

// ---- players ---------------------------------------------------------------------------
export interface PlayerStat {
  player_id: string;
  name: string;
  gender: Gender;
  wins: number;
  first: Edition;
  last: Edition;
  spanYears: number;
  firstAge: number | null;
  lastAge: number | null;
  maxInYear: number;
  maxSameEvent: { tournament_id: string; count: number };
  best5: number;
  byEvent: Record<string, number>;
  nations: string[];
}

export function playerStats(eds: Edition[]): PlayerStat[] {
  const held = eds.filter(isHeld).sort((a, b) => a.year - b.year || (a.end_date ?? "").localeCompare(b.end_date ?? ""));
  const g = new Map<string, Edition[]>();
  held.forEach((e) => g.set(e.champion!.player_id, [...(g.get(e.champion!.player_id) ?? []), e]));
  const out: PlayerStat[] = [];
  for (const [pid, list] of g) {
    const byYear = new Map<number, number>();
    const byEvent: Record<string, number> = {};
    list.forEach((e) => {
      byYear.set(e.year, (byYear.get(e.year) ?? 0) + 1);
      byEvent[e.tournament_id] = (byEvent[e.tournament_id] ?? 0) + 1;
    });
    const years = list.map((e) => e.year);
    let best5 = 0;
    for (const y of years) best5 = Math.max(best5, years.filter((x) => x >= y && x < y + 5).length);
    const se = Object.entries(byEvent).sort((a, b) => b[1] - a[1])[0];
    out.push({
      player_id: pid,
      name: list[0].champion!.name,
      gender: list[0].gender,
      wins: list.length,
      first: list[0],
      last: list[list.length - 1],
      spanYears: list[list.length - 1].year - list[0].year,
      firstAge: list[0].champion!.age_years,
      lastAge: list[list.length - 1].champion!.age_years,
      maxInYear: Math.max(...byYear.values()),
      maxSameEvent: { tournament_id: se[0], count: se[1] },
      best5,
      byEvent,
      nations: [...new Set(list.map((e) => e.champion!.nation_code).filter(Boolean) as string[])],
    });
  }
  return out.sort((a, b) => b.wins - a.wins || a.first.year - b.first.year);
}

export const pct = (x: number | null | undefined, d = 0) => (x === null || x === undefined ? "—" : `${(x * 100).toFixed(d)}%`);
export const num = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? "—" : x.toFixed(d));
export const toParStr = (x: number | null | undefined) => (x === null || x === undefined ? "—" : x === 0 ? "E" : x > 0 ? `+${x}` : `${x}`);

// ---- GOAT / specialist -----------------------------------------------------------------
import type { Player } from "./types";

export const MEN_SLAM = ["masters", "us_open", "the_open", "pga"];

export interface Legend {
  p: Player;
  majors: number;
  tourWins: number | null;
  share: number | null;          // only when numerator and denominator follow one definition
  winPerStart: number | null;    // Summary-table wins / starts (same table), min 20 starts
  top10Rate: number | null;
  starts: number | null;
  best3: number;
  best5: number;
  best10: number;
  span: number;
  slam: boolean;
  distinctMajors: number;
}

export function legends(eds: Edition[], players: Player[], gender: Gender | "all", mode: Mode, minStarts = 20): Legend[] {
  const held = eds.filter((e) => isHeld(e) && (gender === "all" || e.gender === gender) && (mode === "all" || e.is_current));
  const byP = new Map<string, Edition[]>();
  held.forEach((e) => byP.set(e.champion!.player_id, [...(byP.get(e.champion!.player_id) ?? []), e]));
  const pById = new Map(players.map((p) => [p.player_id, p]));
  const out: Legend[] = [];
  for (const [pid, list] of byP) {
    const p = pById.get(pid);
    if (!p) continue;
    const ys = list.map((e) => e.year).sort((a, b) => a - b);
    const best = (k: number) => Math.max(...ys.map((y) => ys.filter((x) => x >= y && x < y + k).length));
    const events = new Set(list.map((e) => e.tournament_id));
    const c = p.career;
    const starts = c?.major_starts ?? null;
    const okStarts = starts !== null && starts >= minStarts && c?.summary_major_wins !== null && c?.summary_major_wins !== undefined;
    out.push({
      p, majors: list.length,
      tourWins: c?.official_tour_wins ?? null,
      share: c && c.share_status === "ok" ? c.major_win_share : null,
      winPerStart: okStarts ? c!.summary_major_wins! / starts! : null,
      top10Rate: okStarts && c!.major_top10 !== null ? c!.major_top10! / starts! : null,
      starts,
      best3: best(3), best5: best(5), best10: best(10),
      span: ys[ys.length - 1] - ys[0],
      slam: p.gender === "M" ? MEN_SLAM.every((t) => events.has(t)) : events.size >= 4,
      distinctMajors: events.size,
    });
  }
  return out.sort((a, b) => b.majors - a.majors);
}

/** Percentile rank (0-100) of each value among non-null values; null stays null. */
export function percentiles(vals: (number | null)[]): (number | null)[] {
  const xs = vals.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (xs.length < 2) return vals.map((v) => (v === null ? null : 100));
  return vals.map((v) => {
    if (v === null) return null;
    const below = xs.filter((x) => x < v).length;
    const equal = xs.filter((x) => x === v).length;
    return (100 * (below + (equal - 1) / 2)) / (xs.length - 1);
  });
}

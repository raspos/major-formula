// Synthetic rows below exist only to test the arithmetic; they are never shipped as data.
import { describe, expect, it } from "vitest";
import { filterEditions, median, nationTable, priorWins, summarize, wilson } from "./stats";
import type { Edition } from "./types";

function ed(id: string, year: number, pid: string, opt: Partial<Edition> & { age?: number; nation?: string; deficit?: number; solo?: boolean; margin54?: number } = {}): Edition {
  const deficit = opt.deficit;
  return {
    edition_id: id, tournament_id: opt.tournament_id ?? "t1", year, status: "held", year_article: null, end_date: `${year}-04-10`,
    par: 72, venue: null, location: null, host_country: null, format: "stroke", holes: 72, playoff: opt.playoff ?? 0, margin: opt.margin ?? 1,
    margin_text: null, match_result: null, data_tier: "leaderboard_top", gender: opt.gender ?? "M", is_current: opt.is_current ?? 1,
    name_ko: "t", t_name: "t",
    champion: { player_id: pid, name: pid, nation_code: opt.nation ?? "USA", nation_basis: "flag_in_table", amateur: 0, win_number_in_event: null,
      total: 280, to_par: -8, r1: 70, r2: 70, r3: 70, r4: 70, rounds_basis: null, age_days: null, age_years: opt.age ?? 30, age_precision: "day",
      birth_date: null, image_file: null, photo: null },
    runners_up: [],
    lead54: deficit === undefined ? null : { leaders: deficit === 0 ? [pid] : ["x"], lead_total: 210, solo: opt.solo ?? true, lead_margin: opt.margin54 ?? 1,
      champion_54: 210 + deficit, deficit, champion_led: deficit === 0, board_size: 10 },
  };
}

describe("stats", () => {
  const eds = [
    ed("a", 2000, "p1", { deficit: 0, margin54: 1, age: 24 }),
    ed("b", 2001, "p2", { deficit: 3, age: 35, nation: "KOR" }),
    ed("c", 2002, "p1", { deficit: 0, margin54: 3, age: 26 }),
    ed("d", 2003, "p3", { age: 41, gender: "W", nation: "KOR" }),
  ];

  it("filters by gender, period and 54-hole status", () => {
    expect(filterEditions(eds, { gender: "M" }).length).toBe(3);
    expect(filterEditions(eds, { yearFrom: 2002 }).length).toBe(2);
    expect(filterEditions(eds, { led54: "behind" }).map((e) => e.edition_id)).toEqual(["b"]);
  });

  it("computes event-level lead and comeback rates only over editions with a board", () => {
    const s = summarize(eds);
    expect(s.lead.n).toBe(3);
    expect(s.lead.led.k).toBe(2);
    expect(s.lead.comeback.k).toBe(1);
    expect(s.lead.maxDeficit?.edition_id).toBe("b");
    expect(s.lead.byMargin[2].r).toMatchObject({ k: 1, n: 1 });
  });

  it("counts first majors and repeat wins", () => {
    const prior = priorWins(eds, "all");
    const s = summarize(eds, prior);
    expect(s.firstMajor).toMatchObject({ k: 3, n: 4 });
    expect(s.repeatInEvent.k).toBe(1);
  });

  it("keeps the full denominator when the USA is excluded", () => {
    const t = nationTable(eds, true);
    expect(t.total).toBe(4);
    expect(t.rows.map((r) => r.code)).toEqual(["KOR"]);
    expect(t.rows[0].share).toBe(0.5);
  });

  it("median and wilson interval", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    const [lo, hi] = wilson(5, 10)!;
    expect(lo).toBeCloseTo(0.2366, 3);
    expect(hi).toBeCloseTo(0.7634, 3);
  });
});

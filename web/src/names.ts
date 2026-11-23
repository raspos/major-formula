// Korean display names (public/data/names_ko.json, built by pipeline/mf/names_ko.py).
let byId: Record<string, string> = {};
let byName: Record<string, string> = {};

export function setNames(d: { byId: Record<string, string>; byName: Record<string, string> }) {
  byId = d.byId ?? {};
  byName = d.byName ?? {};
}

const strip = (n: string) => n.split("|")[0].replace(/\s*\([^)]*\)/g, "").trim();

/** Korean name for a person; falls back to the English name without disambiguators. */
export function koName(name: string, id?: string): string {
  return (id && byId[id]) || byName[name] || byName[strip(name)] || strip(name);
}

export const koCompare = (a: string, b: string) => a.localeCompare(b, "ko");

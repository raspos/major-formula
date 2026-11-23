// Nation code (as printed in the sources, IOC-style) -> ISO 3166-1 numeric id used by world-atlas.
// England, Scotland, Wales, Northern Ireland and Jersey are drawn on the United Kingdom shape (826);
// rankings keep them separate, exactly as the sources print them.
export const ISO_NUM: Record<string, string> = {
  USA: "840", SCO: "826", ENG: "826", NIR: "826", WAL: "826", GBR: "826", JEY: "826",
  KOR: "410", AUS: "036", RSA: "710", SWE: "752", ESP: "724", JPN: "392", NZL: "554", TWN: "158",
  IRL: "372", GER: "276", FRG: "276", FRA: "250", CAN: "124", ZIM: "716", THA: "764", FIJ: "242",
  ARG: "032", URU: "858", NOR: "578", MEX: "484", CHN: "156", PHI: "608", PER: "604", ITA: "380",
  BEL: "056", DEN: "208", AUT: "040", BRA: "076", COL: "170", PAR: "600", IND: "356", FIN: "246",
};
export const ASIA = ["KOR", "JPN", "THA", "TWN", "CHN", "PHI"];

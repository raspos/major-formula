import { setNames } from "./names";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Edition, Meta, Player, Tournament } from "./types";

interface Data {
  editions: Edition[];
  players: Player[];
  tournaments: Tournament[];
  nations: Record<string, { en: string; ko: string }>;
  meta: Meta;
  tById: Record<string, Tournament>;
  pById: Record<string, Player>;
}

const Ctx = createContext<Data | null>(null);

async function load<T>(name: string): Promise<T> {
  // 'no-cache' = revalidate with the server, so a data refresh is never hidden by a stale browser copy
  const r = await fetch(`${import.meta.env.BASE_URL}data/${name}`, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.json();
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Omit<Data, "tById" | "pById"> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      load<Edition[]>("editions.json"),
      load<Player[]>("players.json"),
      load<Tournament[]>("tournaments.json"),
      load<Record<string, { en: string; ko: string }>>("nations.json"),
      load<Meta>("meta.json"),
      load<{ byId: Record<string, string>; byName: Record<string, string> }>("names_ko.json"),
    ])
      .then(([editions, players, tournaments, nations, meta, names]) => { setNames(names); setRaw({ editions, players, tournaments, nations, meta }); })
      .catch((e) => setErr(String(e)));
  }, []);
  const value = useMemo(() => {
    if (!raw) return null;
    return {
      ...raw,
      tById: Object.fromEntries(raw.tournaments.map((t) => [t.tournament_id, t])),
      pById: Object.fromEntries(raw.players.map((p) => [p.player_id, p])),
    };
  }, [raw]);
  if (err) return <div className="p-8 text-red-800">데이터를 불러오지 못했습니다: {err}</div>;
  if (!value) return <div className="p-8 font-serif text-lg text-green-deep">기록 보관소를 여는 중…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const d = useContext(Ctx);
  if (!d) throw new Error("useData outside provider");
  return d;
}

export function useNation() {
  const { nations } = useData();
  return (code: string | null | undefined) => (code ? nations[code]?.ko ?? code : "국적 미상");
}

export const playerSlug = (pid: string) => encodeURIComponent(pid);

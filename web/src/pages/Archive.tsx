import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData, useNation } from "../data";
import { filterEditions, isHeld, nationTable, num, pct, summarize, toParStr } from "../stats";
import { NationTag, Pill, PhotoCredit, PlayerLink, Portrait, Section, TournamentName, Empty, cleanName } from "../ui";
import type { Edition } from "../types";

function EditionCard({ e }: { e: Edition }) {
  const c = e.champion;
  return (
    <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4">
      <div className="text-[11px] uppercase tracking-widest text-gold">{e.gender === "M" ? "남자" : "여자"} · <TournamentName id={e.tournament_id} /></div>
      {e.status !== "held" || !c ? (
        <div className="mt-2 text-sm text-charcoal-soft">{e.status === "not_held" ? "열리지 않음" : "수집 시점에 끝나지 않은 대회"}</div>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-3">
            <Portrait name={c.name} size={44} src={c.photo} />
            <div>
              <div className="font-serif text-lg font-bold"><PlayerLink id={c.player_id} name={c.name} /></div>
              <div className="flex items-center gap-1 text-xs text-charcoal-soft"><NationTag code={c.nation_code} /> {c.age_years !== null && `${num(c.age_years)}세`}{c.amateur ? " · 아마추어" : ""}</div>
            </div>
          </div>
          <PhotoCredit pid={c.player_id} className="mt-1" />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-charcoal-soft">성적</dt><dd className="num">{e.match_result ?? `${c.total ?? "—"} (${toParStr(c.to_par)})`}</dd>
            <dt className="text-charcoal-soft">결정</dt><dd>{e.playoff ? "플레이오프" : e.margin !== null ? `${e.margin}타 차` : "—"}</dd>
            <dt className="text-charcoal-soft">준우승</dt><dd>{e.runners_up.length ? e.runners_up.map((r) => cleanName(r.name)).join(", ") : "자료 없음"}</dd>
            <dt className="text-charcoal-soft">개최지</dt><dd>{e.venue ?? "—"}</dd>
          </dl>
          <Link to={`/edition/${e.edition_id}`} className="mt-2 inline-block text-xs underline">대회 상세</Link>
        </>
      )}
    </div>
  );
}

export function EditionPage() {
  const { id = "" } = useParams();
  const { editions } = useData();
  const e = editions.find((x) => x.edition_id === id);
  const [boards, setBoards] = useState<Record<string, { final: { player_id: string; name: string; place: string; total: number | null; to_par: number | null; nation_code: string | null; rounds: string | null }[]; after54: { player_id: string; name: string; position: number; tied: number; total: number | null; to_par: number | null }[] }> | null>(null);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/boards.json`).then((r) => r.json()).then(setBoards).catch(() => setBoards({})); }, []);
  if (!e) return <div className="mx-auto max-w-6xl px-4 py-10"><Empty>대회를 찾을 수 없습니다.</Empty></div>;
  const b = boards?.[id];
  return (
    <Section kicker={`${e.year} · ${e.gender === "M" ? "남자" : "여자"} 메이저`} title={`${e.year} ${e.name_ko}`} note={e.year_article ? `출처: 위키백과 「${e.year_article}」` : undefined}>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <EditionCard e={e} />
        <div>
          {e.lead54 && (
            <p className="mb-3 text-sm">54홀 종료 때 우승자는 {e.lead54.champion_led ? (e.lead54.solo ? "단독 선두" : "공동 선두") : `선두에 ${e.lead54.deficit}타 뒤져 있었습니다`}
              {e.lead54.solo && e.lead54.lead_margin !== null && e.lead54.champion_led ? ` (2위와 ${e.lead54.lead_margin}타 차)` : ""}.</p>
          )}
          {!b ? <Empty>이 대회의 라운드별 순위표는 확보하지 못했습니다(우승 기록만 있음).</Empty> : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium">최종 순위표 (대회 문서에 실린 상위권)</div>
                <table className="data"><thead><tr><th>순위</th><th>선수</th><th>라운드</th><th>합계</th></tr></thead>
                  <tbody>{b.final.map((r) => <tr key={r.player_id}><td className="num">{r.place}</td><td><PlayerLink id={r.player_id} name={r.name} /></td><td className="num text-xs">{r.rounds ?? "—"}</td><td className="num">{r.total ?? "—"} ({toParStr(r.to_par)})</td></tr>)}</tbody></table>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">54홀 종료 순위표</div>
                {b.after54.length ? (
                  <table className="data"><thead><tr><th>순위</th><th>선수</th><th>54홀</th></tr></thead>
                    <tbody>{b.after54.map((r) => <tr key={r.player_id}><td className="num">{r.tied ? "T" : ""}{r.position}</td><td><PlayerLink id={r.player_id} name={r.name} /></td><td className="num">{r.total ?? "—"} ({toParStr(r.to_par)})</td></tr>)}</tbody></table>
                ) : <Empty>3라운드 순위표 없음</Empty>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

export default function Archive() {
  const { editions, tournaments } = useData();
  const nation = useNation();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("t") ? "event" : (sp.get("tab") ?? "year");
  const [year, setYear] = useState(Number(sp.get("y") ?? 2008));
  const tid = sp.get("t") ?? "masters";
  const yearEds = editions.filter((e) => e.year === year).sort((a, b) => a.gender.localeCompare(b.gender) || (a.end_date ?? "").localeCompare(b.end_date ?? ""));
  const tEds = useMemo(() => editions.filter((e) => e.tournament_id === tid).sort((a, b) => b.year - a.year), [editions, tid]);
  const s = useMemo(() => summarize(filterEditions(editions, { tournaments: [tid] })), [editions, tid]);
  const nt = useMemo(() => nationTable(tEds.filter(isHeld)), [tEds]);
  const ageDist = useMemo(() => {
    const m = new Map<number, number>();
    tEds.filter(isHeld).forEach((e) => { const a = e.champion!.age_years; if (a !== null) m.set(Math.floor(a / 5) * 5, (m.get(Math.floor(a / 5) * 5) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ band: `${k}–${k + 4}세`, n: v }));
  }, [tEds]);
  const T = tournaments.find((t) => t.tournament_id === tid);

  return (
    <>
      <Section kicker="Archive" title="메이저 역사 아카이브">
        <div className="flex gap-2">
          <Pill active={tab === "year"} onClick={() => setSp({ tab: "year", y: String(year) })}>연도로 보기 · 나의 메이저 시대</Pill>
          <Pill active={tab === "event"} onClick={() => setSp({ t: tid })}>대회로 보기</Pill>
        </div>
      </Section>
      {tab === "year" ? (
        <Section kicker="My major era" title={`${year}년의 메이저`} note="태어난 해나 기억하는 해를 넣어 보세요. 그해 열린 남녀 메이저의 우승자가 나옵니다.">
          <div className="flex items-center gap-2">
            <button className="rounded border border-charcoal/20 px-2" onClick={() => setYear(year - 1)}>‹</button>
            <input type="number" min={1860} max={2026} value={year} onChange={(e) => setYear(+e.target.value)} className="w-24" />
            <button className="rounded border border-charcoal/20 px-2" onClick={() => setYear(year + 1)}>›</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {yearEds.length ? yearEds.map((e) => <EditionCard key={e.edition_id} e={e} />) : <Empty>{year}년에는 기록된 메이저가 없습니다.</Empty>}
          </div>
        </Section>
      ) : (
        <Section kicker={T?.gender === "M" ? "남자 메이저" : "여자 메이저"} title={T?.name_ko ?? tid} note={`${T?.name} · 메이저 인정 ${T?.major_from}${T?.major_to ? `–${T.major_to}` : "년부터"}${T?.note ? ` · ${T.note}` : ""}`}>
          <select value={tid} onChange={(e) => setSp({ t: e.target.value })}>
            {tournaments.map((t) => <option key={t.tournament_id} value={t.tournament_id}>{t.gender === "M" ? "남 · " : "여 · "}{t.name_ko}</option>)}
          </select>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4 text-sm"><div className="text-xs text-charcoal-soft">개최</div><div className="num font-serif text-2xl font-bold text-green-deep">{s.n}회</div><div className="text-xs">미개최 {tEds.filter((e) => e.status === "not_held").length}년</div></div>
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4 text-sm"><div className="text-xs text-charcoal-soft">최연소 · 최고령</div><div>{s.age.min && <>{num(s.age.min.champion!.age_years)}세 {cleanName(s.age.min.champion!.name)} ({s.age.min.year})</>}</div><div>{s.age.max && <>{num(s.age.max.champion!.age_years)}세 {cleanName(s.age.max.champion!.name)} ({s.age.max.year})</>}</div></div>
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4 text-sm"><div className="text-xs text-charcoal-soft">최저 우승 성적(72홀)</div><div>{s.toPar.best ? <>{toParStr(s.toPar.best.champion!.to_par)} · {cleanName(s.toPar.best.champion!.name)} ({s.toPar.best.year})</> : "—"}</div></div>
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4 text-sm"><div className="text-xs text-charcoal-soft">최종일 역전 우승</div><div className="num">{s.lead.n ? `${s.lead.comeback.k}회 / ${s.lead.n}개 대회 (${pct(s.lead.comeback.rate)})` : "자료 없음"}</div></div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="h-56 rounded-sm border border-charcoal/10 bg-white/70 p-3"><div className="text-sm font-medium">우승 연령 분포</div>
              <ResponsiveContainer height="88%"><BarChart data={ageDist}><CartesianGrid stroke="#0001" vertical={false} /><XAxis dataKey="band" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" name="우승" fill="#2D5A46" /></BarChart></ResponsiveContainer></div>
            <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4"><div className="mb-2 text-sm font-medium">국가별 우승</div>
              <div className="flex flex-wrap gap-2">{nt.rows.map((r) => <span key={r.code} className="rounded-sm bg-green-soft px-2 py-1 text-sm">{nation(r.code)} <b className="num">{r.wins}</b></span>)}</div></div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="data">
              <thead><tr><th>연도</th><th>우승자</th><th>국적</th><th>나이</th><th>성적</th><th>결정</th><th>54홀</th><th>준우승</th><th>개최지</th></tr></thead>
              <tbody>
                {tEds.map((e) => (
                  <tr key={e.edition_id}>
                    <td className="num"><Link className="underline decoration-gold/50" to={`/edition/${e.edition_id}`}>{e.year}</Link></td>
                    {e.status !== "held" || !e.champion ? <td colSpan={8} className="text-charcoal-soft">{e.status === "not_held" ? "열리지 않음" : "수집 시점 미종료"}</td> : (
                      <>
                        <td><PlayerLink id={e.champion.player_id} name={e.champion.name} />{e.champion.amateur ? <span className="text-xs"> (a)</span> : ""}</td>
                        <td><NationTag code={e.champion.nation_code} /></td>
                        <td className="num">{num(e.champion.age_years)}</td>
                        <td className="num">{e.match_result ?? `${e.champion.total ?? "—"} (${toParStr(e.champion.to_par)})`}</td>
                        <td className="text-xs">{e.playoff ? "플레이오프" : e.margin !== null ? `${e.margin}타` : ""}</td>
                        <td className="text-xs">{e.lead54 ? (e.lead54.champion_led ? "선두" : `${e.lead54.deficit}타 역전`) : ""}</td>
                        <td className="text-xs">{e.runners_up.map((r) => cleanName(r.name)).join(", ")}</td>
                        <td className="text-xs">{e.venue}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
}

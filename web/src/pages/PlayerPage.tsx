import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../data";
import { isHeld, num, playerStats, toParStr } from "../stats";
import { NationTag, Portrait, Section, TournamentName, cleanName, Empty } from "../ui";

export default function PlayerPage() {
  const { id = "" } = useParams();
  const pid = decodeURIComponent(id);
  const { editions, pById } = useData();
  const p = pById[pid];
  const wins = useMemo(() => editions.filter((e) => isHeld(e) && e.champion!.player_id === pid).sort((a, b) => a.year - b.year), [editions, pid]);
  const runnerUps = useMemo(() => editions.filter((e) => e.runners_up.some((r) => r.player_id === pid)), [editions, pid]);
  const st = useMemo(() => playerStats(wins)[0], [wins]);
  if (!p) return <div className="mx-auto max-w-6xl px-4 py-10"><Empty>이 선수의 메이저 우승 기록이 없습니다.</Empty></div>;
  const current = wins.filter((e) => e.is_current).length;
  return (
    <>
      <Section kicker={p.gender === "M" ? "남자 골프" : "여자 골프"} title={cleanName(p.name)}>
        <div className="flex flex-wrap items-start gap-6">
          <figure className="shrink-0">
            <Portrait name={p.name} size={112} src={p.photo?.thumb} />
            {p.photo && (
              <figcaption className="mt-1 max-w-[140px] text-[10px] leading-tight text-charcoal-soft">
                사진: <a className="underline" href={p.photo.page} target="_blank" rel="noreferrer">{p.photo.artist}</a> ·{" "}
                {p.photo.license_url ? <a className="underline" href={p.photo.license_url} target="_blank" rel="noreferrer">{p.photo.license}</a> : p.photo.license} · 위키미디어 공용
              </figcaption>
            )}
          </figure>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="text-xs text-charcoal-soft">메이저 우승</div><div className="num font-serif text-3xl font-bold text-green-deep">{wins.length}</div>
              {current !== wins.length && <div className="text-xs text-charcoal-soft">현행 메이저 {current}승</div>}</div>
            <div><div className="text-xs text-charcoal-soft">생년월일</div><div className="num">{p.birth_date ?? "확인 안 됨"}</div><div className="text-[11px] text-charcoal-soft">출처: 위키데이터</div></div>
            <div><div className="text-xs text-charcoal-soft">첫·마지막 우승 나이</div><div className="num">{num(st?.firstAge)}세 · {num(st?.lastAge)}세</div></div>
            <div><div className="text-xs text-charcoal-soft">우승 당시 국적</div><div>{st?.nations.map((c) => <NationTag key={c} code={c} />)}</div></div>
          </div>
        </div>
        <div className="mt-4 flex gap-3 text-sm">
          <Link className="rounded-sm border border-green-deep px-3 py-1 text-green-deep hover:bg-green-deep hover:text-ivory" to={`/versus?a=${encodeURIComponent(pid)}`}>다른 선수와 비교</Link>
        </div>
      </Section>
      <Section kicker="Wins" title="메이저 우승 이력">
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>연도</th><th>대회</th><th>나이</th><th>국적</th><th>성적</th><th>라운드</th><th>타수 차</th><th>54홀</th><th>개최지</th></tr></thead>
            <tbody>
              {wins.map((e) => {
                const c = e.champion!;
                return (
                  <tr key={e.edition_id}>
                    <td className="num">{e.year}</td>
                    <td><TournamentName id={e.tournament_id} />{!e.is_current && <span className="text-xs text-charcoal-soft"> (과거)</span>}</td>
                    <td className="num">{num(c.age_years)}{c.age_precision === "year" && <span className="text-[10px] text-charcoal-soft">±1</span>}</td>
                    <td><NationTag code={c.nation_code} /></td>
                    <td className="num">{e.match_result ?? `${c.total ?? "—"} (${toParStr(c.to_par)})`}</td>
                    <td className="num text-xs">{[c.r1, c.r2, c.r3, c.r4].filter((x) => x !== null).join("-") || "—"}</td>
                    <td className="num">{e.playoff ? "플레이오프" : e.margin !== null ? `${e.margin}타` : "—"}</td>
                    <td className="num text-xs">{e.lead54 ? (e.lead54.champion_led ? (e.lead54.solo ? "단독 선두" : "공동 선두") : `${e.lead54.deficit}타 뒤 역전`) : "—"}</td>
                    <td className="text-xs">{e.venue ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {runnerUps.length > 0 && (
          <p className="mt-4 text-sm text-charcoal-soft">
            준우승(대회 문서에 준우승자가 실린 경우만): {runnerUps.map((e) => `${e.year} `).join("")}
            — {runnerUps.length}회
          </p>
        )}
      </Section>
    </>
  );
}

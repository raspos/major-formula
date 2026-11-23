import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../data";
import { isHeld, num, toParStr } from "../stats";
import { NationTag, Pill, PlayerLink, Section, TournamentName } from "../ui";
import type { Edition, Mode } from "../types";

type Crit = { id: string; label: string; value: (e: Edition) => number | null; dir: 1 | -1; fmt: (v: number) => string; note: string };

const CRITERIA: Crit[] = [
  { id: "comeback", label: "최종 라운드 역전 폭", value: (e) => (e.lead54 && e.lead54.deficit > 0 ? e.lead54.deficit : null), dir: -1, fmt: (v) => `${v}타 뒤`, note: "54홀 종료 때 선두와의 타수 차. 3라운드 순위표가 있는 대회만." },
  { id: "low", label: "최저 우승 성적(72홀)", value: (e) => (e.format === "stroke" && e.holes === 72 ? e.champion!.to_par : null), dir: 1, fmt: (v) => toParStr(v), note: "기준 타수 대비. 코스·파·날씨가 달라 대회 간 난도 비교 지표가 아님." },
  { id: "high", label: "가장 높은 우승 성적(72홀)", value: (e) => (e.format === "stroke" && e.holes === 72 ? e.champion!.to_par : null), dir: -1, fmt: (v) => toParStr(v), note: "기준 타수 대비." },
  { id: "young", label: "최연소 우승", value: (e) => e.champion!.age_years, dir: 1, fmt: (v) => `${num(v, 2)}세`, note: "일 단위가 아닌 값은 연도 차(±1세)." },
  { id: "old", label: "최고령 우승", value: (e) => e.champion!.age_years, dir: -1, fmt: (v) => `${num(v, 2)}세`, note: "일 단위가 아닌 값은 연도 차(±1세)." },
  { id: "margin", label: "최대 타수 차 우승", value: (e) => (e.format === "stroke" ? e.margin : null), dir: -1, fmt: (v) => `${v}타`, note: "우승자와 2위의 타수 차." },
  { id: "playoff", label: "플레이오프 결정 대회", value: (e) => (e.playoff === 1 ? e.year : null), dir: -1, fmt: () => "플레이오프", note: "플레이오프 홀 수는 아직 수집하지 않아 연도순으로 보여 줍니다." },
  { id: "final", label: "우승자 최종 라운드 최저타", value: (e) => e.champion!.r4, dir: 1, fmt: (v) => `${v}타`, note: "4라운드 대회 우승자의 마지막 날 타수(라운드 성적이 확보된 대회)." },
];

export default function Records() {
  const { editions } = useData();
  const [crit, setCrit] = useState("comeback");
  const [gender, setGender] = useState<"all" | "M" | "W">("all");
  const [mode, setMode] = useState<Mode>("current");
  const C = CRITERIA.find((c) => c.id === crit)!;
  const rows = useMemo(() => {
    const eds = editions.filter((e) => isHeld(e) && (gender === "all" || e.gender === gender) && (mode === "all" || e.is_current));
    const withV = eds.map((e) => ({ e, v: C.value(e) })).filter((x) => x.v !== null) as { e: Edition; v: number }[];
    return { n: withV.length, list: withV.sort((a, b) => C.dir * (a.v - b.v) || a.e.year - b.e.year).slice(0, 25) };
  }, [editions, crit, gender, mode]);
  return (
    <Section kicker="Greatest majors" title="역대 명승부 — 기준을 고르세요" note="‘가장 극적인 대회’는 객관적인 통계가 아니어서 정하지 않습니다. 대신 객관적인 기준별 순위를 보여 줍니다. 기준을 바꿔 직접 정렬해 보세요.">
      <div className="flex flex-wrap gap-2">{CRITERIA.map((c) => <Pill key={c.id} active={crit === c.id} onClick={() => setCrit(c.id)}>{c.label}</Pill>)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "M", "W"] as const).map((g) => <Pill key={g} active={gender === g} onClick={() => setGender(g)}>{g === "all" ? "남녀" : g === "M" ? "남자" : "여자"}</Pill>)}
        <span className="mx-2 h-5 w-px bg-charcoal/20" />
        <Pill active={mode === "current"} onClick={() => setMode("current")}>현행 메이저</Pill>
        <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 포함</Pill>
      </div>
      <p className="mt-3 text-xs text-charcoal-soft">{C.note} 이 기준을 계산할 수 있는 대회 {rows.n}개.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="data">
          <thead><tr><th>#</th><th>기록</th><th>연도</th><th>대회</th><th>우승자</th><th>국적</th><th>성적</th><th></th></tr></thead>
          <tbody>
            {rows.list.map(({ e, v }, i) => (
              <tr key={e.edition_id}>
                <td className="num">{i + 1}</td><td className="num font-bold text-green-deep">{C.fmt(v)}</td><td className="num">{e.year}</td>
                <td><TournamentName id={e.tournament_id} /></td><td><PlayerLink id={e.champion!.player_id} name={e.champion!.name} /></td>
                <td><NationTag code={e.champion!.nation_code} /></td>
                <td className="num">{e.match_result ?? `${e.champion!.total ?? "—"} (${toParStr(e.champion!.to_par)})`}</td>
                <td><Link className="text-xs underline" to={`/edition/${e.edition_id}`}>상세</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

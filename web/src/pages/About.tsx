import { useData } from "../data";
import { pct } from "../stats";
import { Section } from "../ui";

export default function About() {
  const { meta, tById, players } = useData();
  return (
    <>
      <Section kicker="Data coverage" title="대회별 자료 확보율" note="‘우승 기록’은 모든 개최 연도에 있습니다. 준우승·나이·라운드 성적·54홀 순위표는 출처에 실린 범위만 들어 있고, 없는 값은 비워 둡니다.">
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>대회</th><th>개최</th><th>미개최</th><th>준우승</th><th>나이(일 단위)</th><th>우승자 라운드 성적</th><th>54홀 순위표</th></tr></thead>
            <tbody>
              {meta.coverage.map((c) => (
                <tr key={c.tournament_id}>
                  <td>{tById[c.tournament_id]?.name_ko}</td><td className="num">{c.editions_held}</td><td className="num">{c.not_held}</td>
                  <td className="num">{c.with_runner_up} ({pct(c.with_runner_up / c.editions_held)})</td>
                  <td className="num">{c.with_age} ({c.with_age_day})</td>
                  <td className="num">{c.with_rounds} ({pct(c.with_rounds / c.editions_held)})</td>
                  <td className="num">{c.with_54_board} ({pct(c.with_54_board / c.stroke_play)} of 스트로크)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-charcoal-soft">자료 생성 {meta.generated_at} · 수집 기준일 {meta.cutoff} · 자동 검증 {Object.entries(meta.validation).map(([k, v]) => `${k} ${v}`).join(", ")}</p>
      </Section>
      <Section kicker="Sources" title="출처와 접근 조건">
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>출처</th><th>공식</th><th>조건</th><th>상태</th></tr></thead>
            <tbody>{meta.sources.map((s) => <tr key={s.source_id}><td>{s.name}</td><td>{s.official ? "공식" : "2차"}</td><td className="text-xs">{s.terms}</td><td className="text-xs">{s.access_status}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
      <Section kicker="Photos" title="사진 출처">
        <p className="mb-3 text-xs text-charcoal-soft">위키미디어 공용 자유 라이선스</p>
        <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {players.filter((p) => p.photo).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
            <div key={p.player_id}>{p.name.replace(/\s*\(golfer\)$/, "")} — <a className="underline" href={p.photo!.page} target="_blank" rel="noreferrer">{p.photo!.artist}</a>, {p.photo!.license}</div>
          ))}
        </div>
      </Section>
      <Section kicker="Method" title="산식 요약">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>우승 나이 = 대회 마지막 날 − 생년월일(위키데이터). 마지막 날을 모르면 연도 차로 계산하고 ±1세로 표시합니다.</li>
          <li>54홀 선두 우승률 = 54홀 종료 때 선두(공동 포함)였던 선수가 우승한 대회 수 ÷ 3라운드 순위표가 있는 스트로크플레이 대회 수. 대회 단위 비율입니다.</li>
          <li>역전 우승 = 54홀 종료 때 선두보다 1타 이상 뒤져 있던 선수의 우승. 플레이오프 대회는 72홀 종료가 아니라 54홀 종료 시점 기준입니다.</li>
          <li>국가 점유율 = 그 나라 선수 우승 ÷ 선택한 범위의 전체 메이저 수. 미국 제외 모드에서도 분모는 그대로입니다.</li>
          <li>비율의 95% 신뢰구간은 윌슨 방법, 두 대회 비교는 두 비율 z검정(유의수준 5%)입니다. 표본 30개 미만은 경고를 붙입니다.</li>
          <li>상금은 시대별 차이가 커서 비교에 쓰지 않습니다.</li>
        </ul>
      </Section>
    </>
  );
}

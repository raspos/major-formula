import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "../data";
import { filterEditions, num, pct, priorWins, rate, summarize, toParStr, type Filter } from "../stats";
import { EditionLine, Pill, RateStat, Section, SampleNote, Stat, Empty } from "../ui";
import type { Mode } from "../types";

export default function Formula() {
  const { editions, tournaments } = useData();
  const [gender, setGender] = useState<"all" | "M" | "W">("all");
  const [mode, setMode] = useState<Mode>("current");
  const [tid, setTid] = useState<string>("");
  const [yearFrom, setYearFrom] = useState(1860);
  const [yearTo, setYearTo] = useState(2026);
  const [age, setAge] = useState<string>("any");
  const [led, setLed] = useState<Filter["led54"]>("any");

  const ageRange: Record<string, [number | undefined, number | undefined]> = {
    any: [undefined, undefined], u25: [0, 25], "25-30": [25, 30], "30-35": [30, 35], "35-40": [35, 40], "40+": [40, 200],
  };
  const f: Filter = {
    gender, mode, tournaments: tid ? [tid] : [], yearFrom, yearTo,
    ageMin: ageRange[age][0], ageMax: ageRange[age][1], led54: led,
  };
  const prior = useMemo(() => priorWins(editions, mode), [editions, mode]);
  const eds = useMemo(() => filterEditions(editions, f), [editions, gender, mode, tid, yearFrom, yearTo, age, led]);
  const s = useMemo(() => summarize(eds, prior), [eds, prior]);
  const ageHist = useMemo(() => {
    const m = new Map<number, number>();
    eds.forEach((e) => {
      const a = e.champion!.age_years;
      if (a !== null) m.set(Math.floor(a / 2) * 2, (m.get(Math.floor(a / 2) * 2) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ band: `${k}–${k + 1}`, 우승: v }));
  }, [eds]);
  const eras = useMemo(() => {
    const lead = eds.filter((e) => e.lead54);
    return ([["1959년 이전", 0, 1959], ["1960–1999", 1960, 1999], ["2000년 이후", 2000, 3000]] as const).map(([label, lo, hi]) => {
      const sub = lead.filter((e) => e.year >= lo && e.year <= hi);
      return { label, r: rate(sub.filter((e) => e.lead54!.deficit > 0).length, sub.length) };
    });
  }, [eds]);
  const opts = tournaments.filter((t) => (gender === "all" || t.gender === gender) && (mode === "all" || t.is_current));

  return (
    <>
      <Section kicker="Winning formula" title="우승의 공식" note="조건을 고르면 그 조건에 맞는 메이저 우승 기록만으로 다시 계산합니다. 54홀 관련 수치는 3라운드 순위표가 위키백과 대회 문서에 실린 스트로크플레이 대회만 씁니다. 우승자 명단만으로는 선두 우승 확률을 계산하지 않습니다.">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "M", "W"] as const).map((g) => (
            <Pill key={g} active={gender === g} onClick={() => { setGender(g); setTid(""); }}>{g === "all" ? "남녀 전체" : g === "M" ? "남자" : "여자"}</Pill>
          ))}
          <span className="mx-2 h-5 w-px bg-charcoal/20" />
          <Pill active={mode === "current"} onClick={() => { setMode("current"); setTid(""); }}>현행 9개 메이저</Pill>
          <Pill active={mode === "all"} onClick={() => setMode("all")}>과거 메이저 포함</Pill>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">대회
            <select value={tid} onChange={(e) => setTid(e.target.value)}>
              <option value="">선택한 범위 전체</option>
              {opts.map((t) => <option key={t.tournament_id} value={t.tournament_id}>{t.name_ko}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">기간
            <span className="flex items-center gap-1">
              <input type="number" value={yearFrom} min={1860} max={2026} onChange={(e) => setYearFrom(+e.target.value)} className="w-20" /> –
              <input type="number" value={yearTo} min={1860} max={2026} onChange={(e) => setYearTo(+e.target.value)} className="w-20" />
            </span>
          </label>
          <label className="flex flex-col gap-1">우승 당시 나이
            <select value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="any">전체</option><option value="u25">25세 미만</option><option value="25-30">25–29세</option>
              <option value="30-35">30–34세</option><option value="35-40">35–39세</option><option value="40+">40세 이상</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">54홀 종료 시
            <select value={led} onChange={(e) => setLed(e.target.value as Filter["led54"])}>
              <option value="any">구분 없음</option><option value="led">선두(공동 포함)였던 우승자</option><option value="behind">뒤져 있던 우승자(역전)</option>
            </select>
          </label>
        </div>
        <div className="mt-4 rounded-sm bg-green-soft/60 px-4 py-3 text-sm text-green-deep">
          조건에 맞는 우승 기록 <b className="num">{s.n}</b>개 대회{s.period ? ` (${s.period[0]}–${s.period[1]})` : ""}
          {s.n > 0 && s.n < 30 && <span className="ml-2 font-medium text-[#8a4b1a]">표본이 30개 미만입니다. 비율의 오차가 큽니다.</span>}
        </div>
      </Section>

      {s.n === 0 ? (
        <div className="mx-auto max-w-6xl px-4 sm:px-6"><Empty>조건에 맞는 대회가 없습니다.</Empty></div>
      ) : (
        <>
          <Section kicker="① Age" title="우승 연령">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="평균 우승 나이" value={`${num(s.age.mean)}세`} n={s.age.n} period={s.period} />
              <Stat label="중앙값" value={`${num(s.age.median)}세`} sub={`일 단위 계산 ${s.age.nDay}건, 나머지는 연도 차(±1세)`} />
              <Stat label="최연소 우승" value={s.age.min ? `${num(s.age.min.champion!.age_years)}세` : "—"} sub={s.age.min && <EditionLine e={s.age.min} />} />
              <Stat label="최고령 우승" value={s.age.max ? `${num(s.age.max.champion!.age_years)}세` : "—"} sub={s.age.max && <EditionLine e={s.age.max} />} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="h-64 rounded-sm border border-charcoal/10 bg-white/70 p-3">
                <ResponsiveContainer>
                  <BarChart data={ageHist}>
                    <CartesianGrid stroke="#0001" vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Bar dataKey="우승" fill="#2D5A46" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4 text-sm">
                {s.ageBands.map((b) => (
                  <div key={b.band} className="flex justify-between border-b border-charcoal/10 py-1.5 last:border-0">
                    <span>{b.band}</span><span className="num">{b.k}건 · {pct(b.n ? b.k / b.n : null)}</span>
                  </div>
                ))}
                <p className="mt-3 text-xs text-charcoal-soft">출전 선수의 나이 분포 자료가 없어, “어떤 나이가 유리하다”는 결론은 내릴 수 없습니다. 우승자의 나이 분포만 보여 줍니다.</p>
              </div>
            </div>
          </Section>

          <Section kicker="② Lead after 54 holes" title="선두 유지율과 역전" note="대회 단위 비율입니다. 공동 선두가 여럿이면 그 가운데 한 명이 우승한 경우 ‘선두 우승’으로 셉니다(선수 단위 확률이 아님). 1950년대까지는 3·4라운드를 같은 날 치른 대회가 많아 ‘최종일’ 대신 ‘최종 라운드’ 역전으로 씁니다. 54홀 순위표는 남자 1898년, 여자 1987년 무렵부터 주로 확보돼 있습니다.">
            {s.lead.n === 0 ? (
              <Empty>선택한 조건에는 3라운드 순위표가 있는 대회가 없습니다.</Empty>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <RateStat label="54홀 선두(공동 포함)가 우승" r={s.lead.led} />
                  <RateStat label="54홀 단독 선두가 우승" r={s.lead.soloLed} />
                  <RateStat label="최종 라운드 역전 우승" r={s.lead.comeback} />
                  <Stat label="최대 역전 타수" value={s.lead.maxDeficit ? `${s.lead.maxDeficit.lead54!.deficit}타` : "—"} sub={s.lead.maxDeficit && <EditionLine e={s.lead.maxDeficit} />} />
                </div>
                <div className="mt-4 rounded-sm border border-charcoal/10 bg-white/70 p-4">
                  <div className="mb-2 text-sm font-medium">시대별 최종 라운드 역전 우승</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {eras.map((x) => (
                      <div key={x.label} className="num flex justify-between border-b border-charcoal/10 py-1 text-sm sm:block sm:border-0">
                        <span className="text-charcoal-soft">{x.label}</span>{" "}
                        <b>{x.r.n ? pct(x.r.rate) : "—"}</b> <span className="text-xs text-charcoal-soft">({x.r.k}/{x.r.n}){x.r.n > 0 && x.r.n < 30 ? " ⚠" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-sm border border-charcoal/10 bg-white/70 p-4">
                    <div className="mb-2 text-sm font-medium">단독 선두의 타수 차별 우승률</div>
                    {s.lead.byMargin.map((b) => (
                      <div key={b.label} className="num flex justify-between border-b border-charcoal/10 py-1.5 text-sm last:border-0">
                        <span>{b.label}</span>
                        <span>{b.r.n ? `${pct(b.r.rate)} (${b.r.k}/${b.r.n})` : "—"}{b.r.n > 0 && b.r.n < 30 ? " ⚠" : ""}</span>
                      </div>
                    ))}
                    <p className="mt-2 text-xs text-charcoal-soft">⚠ 표본 30개 미만</p>
                  </div>
                  <div className="h-60 rounded-sm border border-charcoal/10 bg-white/70 p-3">
                    <div className="mb-1 text-sm font-medium">54홀 종료 시 우승자의 선두와 타수 차</div>
                    <ResponsiveContainer height="88%">
                      <BarChart data={s.lead.deficits.map((d) => ({ ...d, label: d.deficit === 0 ? "선두" : `-${d.deficit}` }))}>
                        <CartesianGrid stroke="#0001" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                        <Tooltip />
                        <Bar dataKey="count" name="대회 수" fill="#A8854A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </Section>

          <Section kicker="③ Score & experience" title="우승 성적과 메이저 경험" note="코스 파, 진행 홀 수, 날씨, 개최 코스가 대회마다 달라 언더파만으로 ‘어려운 대회’를 판단하지 않습니다.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="평균 우승 성적(72홀 스트로크플레이)" value={toParStr(s.toPar.mean === null ? null : Math.round(s.toPar.mean * 10) / 10)} n={s.toPar.n} />
              <Stat label="가장 낮은 우승 성적" value={s.toPar.best ? toParStr(s.toPar.best.champion!.to_par) : "—"} sub={s.toPar.best && <EditionLine e={s.toPar.best} />} />
              <RateStat label="플레이오프로 결정" r={s.playoff} />
              <RateStat label="생애 첫 메이저 우승" r={s.firstMajor} scope={mode === "current" ? "현행 메이저 안에서 센 첫 우승" : "과거 메이저 포함"} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RateStat label="같은 대회를 이미 우승한 선수의 재우승" r={s.repeatInEvent} />
              <Stat label="평균 우승 타수 차(스트로크플레이)" value={`${num(s.marginMean.mean)}타`} n={s.marginMean.n} sub="플레이오프는 0타" />
            </div>
          </Section>
          <div className="mx-auto max-w-6xl px-4 sm:px-6"><SampleNote n={s.n} period={s.period} scope="선택 조건 전체" /></div>
        </>
      )}
    </>
  );
}

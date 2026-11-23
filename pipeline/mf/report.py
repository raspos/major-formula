"""Regenerate the numeric sections of DATA_QUALITY.md from the database.

    python -m mf.report
Text between <!--AUTO:START--> and <!--AUTO:END--> is replaced; the rest is kept.
"""
from __future__ import annotations

import json
import re

from . import config
from .build import connect
from .sources import majors as M


def _pct(a, b):
    return f"{a / b * 100:.0f}%" if b else "—"


def block(con) -> str:
    q = lambda s, *a: con.execute(s, a).fetchall()
    L = []
    held = q("SELECT COUNT(*) FROM editions WHERE status='held'")[0][0]
    nh = q("SELECT COUNT(*) FROM editions WHERE status='not_held'")[0][0]
    ch = q("SELECT COUNT(*) FROM champions")[0][0]
    yr = q("SELECT MIN(year), MAX(year) FROM editions WHERE status='held'")[0]
    L.append(f"- 대회 {len(M.MAJORS)}개(현행 9 + 과거 여자 메이저 3), 개최 {held}회, 미개최 기록 {nh}년, 우승 기록 {ch}건, 기간 {yr[0]}–{yr[1]}")
    L.append(f"- 원본 페이지 {q('SELECT COUNT(*) FROM raw_fetches')[0][0]}개 (모두 판 번호·sha256·수집 시각 기록)")
    L.append(f"- 선수 {q('SELECT COUNT(*) FROM players')[0][0]}명, 생년월일 확인 {q('SELECT COUNT(*) FROM players WHERE birth_date IS NOT NULL')[0][0]}명")
    n_final = q("SELECT COUNT(*) FROM results WHERE source='edition_article'")[0][0]
    n_stand = q("SELECT COUNT(*) FROM round_standings")[0][0]
    n_rounds = q("SELECT COUNT(*) FROM rounds")[0][0]
    L.append(f"- 최종 순위표 행 {n_final}, 1~3라운드 순위표 행 {n_stand}, 라운드 점수 {n_rounds}")
    L.append("")
    L.append("| 대회 | 메이저 기간 | 개최 | 미개최 | 준우승 | 나이(일 단위) | 우승자 라운드 점수 | 54홀 순위표 | 확보 수준 |")
    L.append("|---|---|---|---|---|---|---|---|---|")
    for m in M.MAJORS:
        t = m["id"]
        h = q("SELECT COUNT(*) FROM editions WHERE tournament_id=? AND status='held'", t)[0][0]
        n_nh = q("SELECT COUNT(*) FROM editions WHERE tournament_id=? AND status='not_held'", t)[0][0]
        ru = q("""SELECT COUNT(DISTINCT r.edition_id) FROM results r JOIN editions e USING(edition_id)
                  WHERE e.tournament_id=? AND r.position=2 AND r.source='champion_table'""", t)[0][0]
        age = q("SELECT COUNT(*) FROM champions c JOIN editions e USING(edition_id) WHERE e.tournament_id=? AND c.age_years IS NOT NULL", t)[0][0]
        aged = q("SELECT COUNT(*) FROM champions c JOIN editions e USING(edition_id) WHERE e.tournament_id=? AND c.age_precision='day'", t)[0][0]
        rd = q("SELECT COUNT(*) FROM champions c JOIN editions e USING(edition_id) WHERE e.tournament_id=? AND c.r1 IS NOT NULL", t)[0][0]
        b54 = q("""SELECT COUNT(DISTINCT s.edition_id) FROM round_standings s JOIN editions e USING(edition_id)
                   WHERE e.tournament_id=? AND s.after_round=3""", t)[0][0]
        stroke = q("SELECT COUNT(*) FROM editions WHERE tournament_id=? AND status='held' AND format='stroke'", t)[0][0]
        tier = "우승+순위표" if b54 >= 0.8 * stroke else ("부분 순위표" if b54 else "우승 기록만")
        L.append(f"| {m['name_ko']} | {m['major_from']}–{m['major_to'] or ''} | {h} | {n_nh} | {ru} ({_pct(ru, h)}) | "
                 f"{age} ({aged}) | {rd} ({_pct(rd, h)}) | {b54} / 스트로크 {stroke} ({_pct(b54, stroke)}) | {tier} |")
    L.append("")
    v = dict(q("SELECT severity, COUNT(*) FROM validation_log GROUP BY 1"))
    L.append(f"**자동 검증**: 오류 {v.get('error', 0)}, 경고 {v.get('warning', 0)}, 정보 {v.get('info', 0)}")
    L.append("")
    L.append("| 검증 | 심각도 | 건수 | 예시 |")
    L.append("|---|---|---|---|")
    for cid, sev, n, ex in q("""SELECT check_id, severity, COUNT(*), MIN(COALESCE(entity,'') || ' ' || detail)
                                FROM validation_log GROUP BY 1, 2 ORDER BY 2, 1"""):
        L.append(f"| {cid} | {sev} | {n} | {ex[:110].replace('|', '/')} |")
    L.append("")
    L.append("**PHASE 2 — 선수 통산·신체 자료 (메이저 우승자 기준)**")
    L.append("")
    L.append("| 구분 | 우승자 | 투어 통산 우승 | 메이저 비중 계산 | 메이저 출전·톱10 | 신장 | 몸무게 | 시즌 기술 통계 |")
    L.append("|---|---|---|---|---|---|---|---|")
    for g, lab in (("M", "남자"), ("W", "여자")):
        for lo, hi, el in ((0, 3000, "전체"), (0, 1959, "첫 우승 ~1959"), (1960, 1999, "1960–1999"), (2000, 3000, "2000~")):
            ids = [r[0] for r in q("""SELECT c.player_id FROM champions c JOIN editions e USING(edition_id)
                                      JOIN players p USING(player_id) WHERE p.gender=? GROUP BY c.player_id
                                      HAVING MIN(e.year) BETWEEN ? AND ?""", g, lo, hi)]
            if not ids:
                continue
            ph = ",".join("?" * len(ids))
            one = lambda sql: con.execute(sql.format(ph=ph), ids).fetchone()[0]
            tw = one("SELECT COUNT(*) FROM player_career_stats WHERE player_id IN ({ph}) AND official_tour_wins IS NOT NULL")
            sh = one("SELECT COUNT(*) FROM player_career_stats WHERE player_id IN ({ph}) AND share_status='ok'")
            st = one("SELECT COUNT(*) FROM player_career_stats WHERE player_id IN ({ph}) AND major_starts IS NOT NULL")
            h = one("SELECT COUNT(*) FROM player_profiles WHERE player_id IN ({ph}) AND height_cm IS NOT NULL")
            w = one("SELECT COUNT(*) FROM player_profiles WHERE player_id IN ({ph}) AND weight_kg IS NOT NULL")
            ss = one("SELECT COUNT(DISTINCT player_id) FROM player_season_stats WHERE player_id IN ({ph})")
            n = len(ids)
            L.append(f"| {lab} · {el} | {n} | {tw} ({_pct(tw, n)}) | {sh} ({_pct(sh, n)}) | {st} ({_pct(st, n)}) | "
                     f"{h} ({_pct(h, n)}) | {w} ({_pct(w, n)}) | {ss} |")
    L.append("")
    L.append("비중 미계산 사유: " + ", ".join(f"{s} {n}명" for s, n in q(
        "SELECT share_status, COUNT(*) FROM player_career_stats WHERE share_status<>'ok' GROUP BY 1")))
    cc = q("SELECT COUNT(*), SUM(agree) FROM crosscheck")[0]
    L.append("")
    c1 = q("SELECT COUNT(*), SUM(agree) FROM crosscheck WHERE check_id='C1_list_counts'")[0]
    c2 = q("SELECT COUNT(*), SUM(agree) FROM crosscheck WHERE check_id='C2_summary_major_wins'")[0]
    L.append(f"**교차검증**: 위키백과 「List of men's major championships winning golfers」·「List of LPGA major championship winning golfers」의 선수×대회 우승 횟수 {c1[0]}건 중 {c1[1] or 0}건 일치. "
             f"선수 문서 Summary 표의 메이저 우승 합계와 DB 메이저 우승 수 {c2[0]}명 중 {c2[1] or 0}명 일치(여자 선수 문서는 일부 과거 메이저를 Summary에서 빼므로 불일치는 정의 차이일 수 있음).")
    return "\n".join(L)


def run():
    con = connect()
    path = config.ROOT / "DATA_QUALITY.md"
    text = path.read_text(encoding="utf-8")
    new = re.sub(r"<!--AUTO:START-->.*?<!--AUTO:END-->", "<!--AUTO:START-->\n" + block(con) + "\n<!--AUTO:END-->",
                 text, flags=re.S)
    path.write_text(new, encoding="utf-8")
    con.close()


if __name__ == "__main__":
    run()
    print("DATA_QUALITY.md updated")

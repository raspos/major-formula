"""Nation codes as used by Wikipedia {{flagicon}} (mostly IOC-style) -> names.

The code is kept exactly as observed in the source; this table only adds
display names. Unknown codes are kept (never dropped) and reported by the
validator so the table can be extended.
"""
from __future__ import annotations

NATIONS: dict[str, tuple[str, str]] = {
    "USA": ("United States", "미국"),
    "KOR": ("South Korea", "한국"),
    "JPN": ("Japan", "일본"),
    "THA": ("Thailand", "태국"),
    "TWN": ("Chinese Taipei", "대만"),
    "TPE": ("Chinese Taipei", "대만"),
    "CHN": ("China", "중국"),
    "AUS": ("Australia", "호주"),
    "NZL": ("New Zealand", "뉴질랜드"),
    "SWE": ("Sweden", "스웨덴"),
    "NOR": ("Norway", "노르웨이"),
    "DEN": ("Denmark", "덴마크"),
    "FIN": ("Finland", "핀란드"),
    "ENG": ("England", "잉글랜드"),
    "SCO": ("Scotland", "스코틀랜드"),
    "WAL": ("Wales", "웨일스"),
    "NIR": ("Northern Ireland", "북아일랜드"),
    "IRL": ("Ireland", "아일랜드"),
    "GBR": ("Great Britain", "영국"),
    "FRA": ("France", "프랑스"),
    "GER": ("Germany", "독일"),
    "FRG": ("West Germany", "서독"),
    "ESP": ("Spain", "스페인"),
    "ITA": ("Italy", "이탈리아"),
    "NED": ("Netherlands", "네덜란드"),
    "BEL": ("Belgium", "벨기에"),
    "SUI": ("Switzerland", "스위스"),
    "AUT": ("Austria", "오스트리아"),
    "CZE": ("Czech Republic", "체코"),
    "SVK": ("Slovakia", "슬로바키아"),
    "SLO": ("Slovenia", "슬로베니아"),
    "CAN": ("Canada", "캐나다"),
    "MEX": ("Mexico", "멕시코"),
    "COL": ("Colombia", "콜롬비아"),
    "ARG": ("Argentina", "아르헨티나"),
    "BRA": ("Brazil", "브라질"),
    "PAR": ("Paraguay", "파라과이"),
    "PER": ("Peru", "페루"),
    "URU": ("Uruguay", "우루과이"),
    "VEN": ("Venezuela", "베네수엘라"),
    "PUR": ("Puerto Rico", "푸에르토리코"),
    "RSA": ("South Africa", "남아프리카공화국"),
    "ZIM": ("Zimbabwe", "짐바브웨"),
    "IND": ("India", "인도"),
    "PHI": ("Philippines", "필리핀"),
    "MAS": ("Malaysia", "말레이시아"),
    "SIN": ("Singapore", "싱가포르"),
    "INA": ("Indonesia", "인도네시아"),
    "VIE": ("Vietnam", "베트남"),
    "HKG": ("Hong Kong", "홍콩"),
    "ISR": ("Israel", "이스라엘"),
    "RUS": ("Russia", "러시아"),
    "POL": ("Poland", "폴란드"),
    "POR": ("Portugal", "포르투갈"),
    "ISL": ("Iceland", "아이슬란드"),
    "HUN": ("Hungary", "헝가리"),
    "CHI": ("Chile", "칠레"),
    "ECU": ("Ecuador", "에콰도르"),
    "BAN": ("Bangladesh", "방글라데시"),
    "JEY": ("Jersey", "저지(영국 왕실령)"),
    "FIJ": ("Fiji", "피지"),
    "TTO": ("Trinidad and Tobago", "트리니다드 토바고"),
    "NAM": ("Namibia", "나미비아"),
    "FIJ": ("Fiji", "피지"),
    "NAM": ("Namibia", "나미비아"),
    "TTO": ("Trinidad and Tobago", "트리니다드 토바고"),
}

# Full-name forms occasionally used in {{flagicon|United States}} style.
ALIASES = {
    "UNITED STATES": "USA", "US": "USA", "SOUTH KOREA": "KOR", "KOREA": "KOR",
    "JAPAN": "JPN", "THAILAND": "THA", "TAIWAN": "TWN", "CHINESE TAIPEI": "TWN",
    "AUSTRALIA": "AUS", "SWEDEN": "SWE", "ENGLAND": "ENG", "SCOTLAND": "SCO",
    "CANADA": "CAN", "MEXICO": "MEX", "NEW ZEALAND": "NZL", "CHINA": "CHN",
    "FRANCE": "FRA", "SPAIN": "ESP", "GERMANY": "GER", "URUGUAY": "URU",
    "NORWAY": "NOR", "DENMARK": "DEN", "SOUTH AFRICA": "RSA", "WEST GERMANY": "FRG",
    "UNITED KINGDOM": "GBR", "GREAT BRITAIN": "GBR", "TPE": "TWN",
    # ISO-3166 alpha-3 forms that differ from the IOC-style codes used above
    "DEU": "GER", "ZAF": "RSA", "NLD": "NED", "CHE": "SUI", "DNK": "DEN", "PRY": "PAR",
    "PHL": "PHI", "MYS": "MAS", "SGP": "SIN", "IDN": "INA", "VNM": "VIE", "PRT": "POR",
    "URY": "URU", "CHL": "CHI", "ZWE": "ZIM", "SVN": "SLO", "PRC": "CHN", "FJI": "FIJ", "PRI": "PUR", "TRI": "TTO",
    # team labels (not nations) — kept distinct so they never enter nation totals
    "EU": "EUR", "EUROPE": "EUR", "JERSEY": "JEY",
}


def normalize_code(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().upper()
    # {{flagicon|USA|1912}} variants carry extra params; caller passes first only.
    s = ALIASES.get(s, s)
    return s


def name_en(code: str | None) -> str | None:
    return NATIONS.get(code, (None, None))[0] if code else None


def name_ko(code: str | None) -> str | None:
    return NATIONS.get(code, (None, None))[1] if code else None

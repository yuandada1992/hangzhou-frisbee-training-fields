#!/usr/bin/env python3
import datetime as dt
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_JSON = ROOT / "data" / "site-data.json"
DATA_JS = ROOT / "data" / "site-data.js"
TIMEZONE = dt.timezone(dt.timedelta(hours=8))
INCLUDE_KEYWORDS = ("足球", "橄榄球", "飞盘", "草地")
EXCLUDE_KEYWORDS = ("篮球", "羽毛球", "游泳", "乒乓", "健身", "网球")

SEARCH_QUERIES = {
    "拱墅区": [
        "site:huodong.com/venue/detail 杭州 拱墅 足球场 活动网",
        "site:huodong.com/venue/detail 杭州 拱墅 运动公园 足球场 活动网",
    ],
    "余杭区": [
        "site:huodong.com/venue/detail 杭州 余杭 足球场 活动网",
        "site:huodong.com/venue/detail 杭州 余杭 橄榄球 活动网",
    ],
    "西湖区": [
        "site:huodong.com/venue/detail 杭州 西湖 足球场 活动网",
        "site:huodong.com/venue/detail 杭州 西湖 屋顶 足球场 活动网",
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36"
}


def fetch_text(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", "ignore")


def strip_tags(value):
    cleaned = re.sub(r"<[^>]+>", " ", value)
    cleaned = html.unescape(cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def search_duckduckgo(query):
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    page = fetch_text(url)
    links = []

    for match in re.finditer(r'result__a.*?href="([^"]+)"', page, re.S):
        href = html.unescape(match.group(1))

        if "uddg=" not in href:
            continue

        parsed = urllib.parse.urlparse(href)
        target = urllib.parse.parse_qs(parsed.query).get("uddg", [""])[0]

        if "huodong.com/venue/detail/" not in target:
            continue

        if target not in links:
            links.append(target)

    return links[:8]


def extract_first(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text, re.I | re.S)

        if match:
            return strip_tags(match.group(1))

    return ""


def normalize_phone(text):
    phone = extract_first(
        [
            r"联系电话[:：]?\s*([0-9\-\/ ]{7,})",
            r"咨询电话[:：]?\s*([0-9\-\/ ]{7,})",
        ],
        text,
    )
    return phone or "待补公开电话"


def parse_venue_page(url, district):
    page = fetch_text(url)
    title = extract_first(
        [
            r"<title>(.*?) - 杭州.*?</title>",
            r"<h1[^>]*>(.*?)</h1>",
        ],
        page,
    )

    if not title:
        return None

    overview = extract_first(
        [
            r"场地概况.*?<p[^>]*>(.*?)</p>",
            r"详情介绍.*?<p[^>]*>(.*?)</p>",
        ],
        page,
    )
    address = extract_first(
        [
            r"(杭州市[^。；<]{6,60})",
            r"(拱墅区[^。；<]{4,60})",
            r"(余杭区[^。；<]{4,60})",
            r"(西湖区[^。；<]{4,60})",
        ],
        page,
    )
    price = extract_first(
        [
            r"费用说明.*?<p[^>]*>(.*?)</p>",
            r"场地价格.*?<p[^>]*>(.*?)</p>",
        ],
        page,
    )
    hours = extract_first(
        [
            r"开放时间.*?<p[^>]*>(.*?)</p>",
            r"营业时间.*?<p[^>]*>(.*?)</p>",
        ],
        page,
    )
    booking = extract_first(
        [
            r"预订方式.*?<p[^>]*>(.*?)</p>",
            r"订场方式.*?<p[^>]*>(.*?)</p>",
        ],
        page,
    )
    note = overview or "公开页面已出现可租赁或训练用途线索，待人工二次确认。"
    keyword_blob = f"{title} {overview}"

    if not any(keyword in keyword_blob for keyword in INCLUDE_KEYWORDS):
        return None

    if any(keyword in title for keyword in EXCLUDE_KEYWORDS):
        return None

    if "飞盘" not in note and "足球" not in note and "橄榄球" not in note:
        note = f"{note} 适合先作为扩展池候选收录。"

    return {
        "status": "今日新发现",
        "name": title,
        "address": f"{district} · {address}" if address and not address.startswith(district) else (address or f"{district} · 待补详细地址"),
        "phone": normalize_phone(page),
        "price": f"价格：{price}" if price else "价格：待电话确认",
        "lighting": f"开放：{hours}" if hours else "灯光 / 时段：待确认",
        "booking": booking or "电话 / 场地方沟通为主",
        "note": note,
        "sourceUrl": url,
    }


def load_data():
    return json.loads(DATA_JSON.read_text(encoding="utf-8"))


def save_data(payload):
    DATA_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DATA_JS.write_text(
        "window.siteData = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


def refresh():
    data = load_data()
    now = dt.datetime.now(TIMEZONE)
    discovered_today = 0
    core_titles = {venue["name"] for venue in data["coreVenues"]}

    existing_titles = {
        venue["name"]
        for district in data["districtExpansion"]["districts"]
        for venue in district["venues"]
    }
    existing_titles.update(core_titles)

    district_map = {
        district["name"].replace("扩展池", ""): district
        for district in data["districtExpansion"]["districts"]
    }

    for district in data["districtExpansion"]["districts"]:
        for venue in district["venues"]:
            if venue.get("status") == "今日新发现":
                venue["status"] = "已收录"

    for district_name, queries in SEARCH_QUERIES.items():
        urls = []

        for query in queries:
            try:
                results = search_duckduckgo(query)
            except Exception:
                continue

            for url in results:
                if url not in urls:
                    urls.append(url)

        for url in urls:
            try:
                venue = parse_venue_page(url, district_name)
            except Exception:
                continue

            if not venue or venue["name"] in existing_titles:
                continue

            district = district_map.get(district_name)
            if not district:
                continue

            district["venues"].insert(0, venue)
            existing_titles.add(venue["name"])
            discovered_today += 1

    data["districtExpansion"]["todayNewCount"] = discovered_today
    data["meta"]["generatedAt"] = now.strftime("%Y-%m-%d")
    data["meta"]["lastAutoScan"] = now.strftime("%Y-%m-%d %H:%M")
    data["meta"]["heroKicker"] = f"Hangzhou Frisbee Training Fieldbook / {data['meta']['generatedAt']}"

    save_data(data)


if __name__ == "__main__":
    refresh()

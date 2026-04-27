#!/usr/bin/env python3
"""
環境省 WBGT データ（実況値 + 予測値）を一括取得して
GitHub Pages で公開するための JSON に変換する。

データソース:
  - 実況値: https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_{YYYYMM}.csv
           1時間毎。地点コードごとに時系列のWBGT値。
           ユーザーが「今」見たいのはこちら。
  - 予測値: https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv
           3時間毎の48時間予報。将来判断に使える。

出力:
  docs/wbgt/{code}.json : 地点別 JSON
    {
      code, name, prefecture,
      generatedAt, updated,
      current:  { time, wbgt, level },           # 実況値の最新点
      history:  [{ time, wbgt }...],             # 直近24時間の実況
      forecast: [{ time, wbgt, level }...]       # 先48時間の予測
    }
  docs/wbgt/index.json : 都道府県代表地点のサマリ
"""

import csv
import io
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

JST = timezone(timedelta(hours=9))
BASE = 'https://www.wbgt.env.go.jp'
OUTDIR = os.environ.get('OUTDIR', 'docs/wbgt')
USER_AGENT = os.environ.get('USER_AGENT', 'genbarger-wbgt-proxy/1.0')

# 47都道府県の代表地点
PREF_STATIONS = [
    ('14163', '札幌',     '北海道'),
    ('31312', '青森',     '青森県'),
    ('33431', '盛岡',     '岩手県'),
    ('34392', '仙台',     '宮城県'),
    ('32402', '秋田',     '秋田県'),
    ('35426', '山形',     '山形県'),
    ('36127', '福島',     '福島県'),
    ('40201', '水戸',     '茨城県'),
    ('41277', '宇都宮',   '栃木県'),
    ('42251', '前橋',     '群馬県'),
    ('43241', 'さいたま', '埼玉県'),
    ('45212', '千葉',     '千葉県'),
    ('44132', '東京',     '東京都'),
    ('46106', '横浜',     '神奈川県'),
    ('54232', '新潟',     '新潟県'),
    ('55102', '富山',     '富山県'),
    ('56227', '金沢',     '石川県'),
    ('57066', '福井',     '福井県'),
    ('49142', '甲府',     '山梨県'),
    ('48156', '長野',     '長野県'),
    ('52586', '岐阜',     '岐阜県'),
    ('50331', '静岡',     '静岡県'),
    ('51106', '名古屋',   '愛知県'),
    ('53133', '津',       '三重県'),
    ('60131', '彦根',     '滋賀県'),
    ('61286', '京都',     '京都府'),
    ('62078', '大阪',     '大阪府'),
    ('63518', '神戸',     '兵庫県'),
    ('64036', '奈良',     '奈良県'),
    ('65042', '和歌山',   '和歌山県'),
    ('69122', '鳥取',     '鳥取県'),
    ('68132', '松江',     '島根県'),
    ('66408', '岡山',     '岡山県'),
    ('67437', '広島',     '広島県'),
    ('81286', '山口',     '山口県'),
    ('71106', '徳島',     '徳島県'),
    ('72086', '高松',     '香川県'),
    ('73166', '松山',     '愛媛県'),
    ('74182', '高知',     '高知県'),
    ('82182', '福岡',     '福岡県'),
    ('85142', '佐賀',     '佐賀県'),
    ('84496', '長崎',     '長崎県'),
    ('86141', '熊本',     '熊本県'),
    ('83216', '大分',     '大分県'),
    ('87376', '宮崎',     '宮崎県'),
    ('88317', '鹿児島',   '鹿児島県'),
    ('91197', '那覇',     '沖縄県'),
]
PREF_CODES = {c: (n, p) for c, n, p in PREF_STATIONS}

# 全国845地点のコード→（名前, 都道府県）マップ
# generate_stations.py が出力した stations.json から読み込む
def load_all_stations():
    paths = [
        os.path.join(OUTDIR, 'stations.json'),
        'docs/wbgt/stations.json',
        'widgets/wbgt-simple/stations.json',
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return {s['code']: (s['name'], s['prefecture']) for s in data.get('stations', [])}
            except (json.JSONDecodeError, OSError):
                continue
    return {}

ALL_STATIONS = load_all_stations()


def fetch_url(url):
    print(f'fetching {url}', file=sys.stderr)
    req = Request(url, headers={'User-Agent': USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        return resp.read().decode('utf-8')


def wbgt_level(wbgt):
    if wbgt is None:
        return None
    if wbgt >= 31: return '危険'
    if wbgt >= 28: return '厳重警戒'
    if wbgt >= 25: return '警戒'
    if wbgt >= 21: return '注意'
    return 'ほぼ安全'


# ---------- 実況値 CSV のパース ----------
# 形式:
#   Date,Time,<code1>,<code2>,...
#   2026/4/1,1:00,12.3,11.5,...
#   2026/4/1,2:00,12.5,11.8,...
def parse_est_csv(raw):
    """実況値CSV → {code: [{time, wbgt}, ...]}"""
    reader = csv.reader(io.StringIO(raw))
    header = next(reader)
    codes = header[2:]  # [0]=Date, [1]=Time
    series = {code: [] for code in codes}

    for row in reader:
        if len(row) < 3:
            continue
        date_str = row[0].strip()  # "2026/4/22"
        time_str = row[1].strip()  # "10:00"
        if not date_str or not time_str:
            continue
        # "24:00" は翌日 0:00 として処理
        h_part = time_str.split(':')[0]
        try:
            hr = int(h_part)
        except ValueError:
            continue
        try:
            y, m, d = [int(x) for x in date_str.split('/')]
            if hr == 24:
                dt = datetime(y, m, d, 0, tzinfo=JST) + timedelta(days=1)
            else:
                dt = datetime(y, m, d, hr, tzinfo=JST)
        except ValueError:
            continue

        for i, code in enumerate(codes):
            val_str = row[2 + i].strip() if 2 + i < len(row) else ''
            if not val_str:
                continue
            try:
                wbgt = float(val_str)
            except ValueError:
                continue
            series[code].append({'time': dt.isoformat(), 'wbgt': wbgt})

    return series


# ---------- 予測値 CSV のパース ----------
# 形式:
#   ,,2026042212,2026042215,... (YYYYMMDDHH)
#   62078,2026/04/22 09:25,170,150,... (値は×10)
def parse_yohou_csv(raw):
    """予測値CSV → {code: {'updated': ..., 'forecast': [{time, wbgt}, ...]}}"""
    rows = list(csv.reader(io.StringIO(raw)))
    header = rows[0]
    time_cols = header[2:]

    results = {}
    for row in rows[1:]:
        if not row or not row[0].strip() or not row[0].strip().isdigit():
            continue
        code = row[0].strip()
        updated_str = row[1].strip()
        try:
            updated = datetime.strptime(updated_str, '%Y/%m/%d %H:%M').replace(tzinfo=JST)
        except ValueError:
            updated = None

        forecast = []
        for i, ts in enumerate(time_cols):
            ts = ts.strip()
            if not ts or len(ts) != 10:
                continue
            try:
                y, m, d, h = int(ts[:4]), int(ts[4:6]), int(ts[6:8]), int(ts[8:10])
                if h == 24:
                    dt = datetime(y, m, d, 0, tzinfo=JST) + timedelta(days=1)
                else:
                    dt = datetime(y, m, d, h, tzinfo=JST)
            except ValueError:
                continue
            val_str = row[2 + i].strip() if 2 + i < len(row) else ''
            if not val_str or val_str == '-':
                continue
            try:
                wbgt = int(val_str) / 10.0
            except ValueError:
                continue
            forecast.append({'time': dt.isoformat(), 'wbgt': wbgt})

        results[code] = {
            'updated': updated.isoformat() if updated else None,
            'forecast': forecast,
        }
    return results


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    now = datetime.now(JST)

    # --- 実況値の取得 ---
    yyyymm = now.strftime('%Y%m')
    est_url = f'{BASE}/est15WG/dl/wbgt_all_{yyyymm}.csv'
    try:
        est_raw = fetch_url(est_url)
        est_series = parse_est_csv(est_raw)
        print(f'parsed est (actual/now): {len(est_series)} stations', file=sys.stderr)
    except (URLError, HTTPError) as e:
        print(f'est fetch failed: {e}', file=sys.stderr)
        est_series = {}

    # --- 予測値の取得 ---
    yohou_url = f'{BASE}/prev15WG/dl/yohou_all.csv'
    try:
        yohou_raw = fetch_url(yohou_url)
        yohou_data = parse_yohou_csv(yohou_raw)
        print(f'parsed yohou (forecast): {len(yohou_data)} stations', file=sys.stderr)
    except (URLError, HTTPError) as e:
        print(f'yohou fetch failed: {e}', file=sys.stderr)
        yohou_data = {}

    # --- 全地点コードを収集 ---
    all_codes = set(est_series.keys()) | set(yohou_data.keys())

    summary = {
        'generatedAt': now.isoformat(),
        'sources': {
            'actual':   est_url,
            'forecast': yohou_url,
        },
        'stations': [],
    }

    written = 0
    for code in all_codes:
        series = est_series.get(code, [])
        # 直近24時間の実況値
        history = series[-24:] if series else []
        # 最新の非null値を current として抽出（実況値）
        current = None
        for rec in reversed(series):
            if rec.get('wbgt') is not None:
                current = {
                    'time': rec['time'],
                    'wbgt': rec['wbgt'],
                    'level': wbgt_level(rec['wbgt']),
                }
                break

        yohou = yohou_data.get(code, {})
        # 予測値は未来の分のみ残す
        forecast_all = yohou.get('forecast', [])
        forecast_future = [f for f in forecast_all
                           if datetime.fromisoformat(f['time']) >= now]
        # レベルも予測値に付与
        forecast_with_level = [
            {'time': f['time'], 'wbgt': f['wbgt'], 'level': wbgt_level(f['wbgt'])}
            for f in forecast_future
        ]

        # 全845地点リストを優先、無ければ47都道府県代表、最後は仮名
        name, pref = ALL_STATIONS.get(code) or PREF_CODES.get(code, ('', ''))
        record = {
            'code': code,
            'name': name or f'地点{code}',
            'prefecture': pref or '',
            'generatedAt': now.isoformat(),
            'updated': yohou.get('updated'),
            'current':  current,
            'history':  history,
            'forecast': forecast_with_level,
        }

        out_path = os.path.join(OUTDIR, f'{code}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(record, f, ensure_ascii=False, separators=(',', ':'))

        # JSONP 版も生成（<script> タグで読み込める形式）
        # XHR が塞がれた環境（Yodeckテンプレ配布時など）の代替手段
        js_path = os.path.join(OUTDIR, f'{code}.js')
        json_str = json.dumps(record, ensure_ascii=False, separators=(',', ':'))
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(f'window.__WBGT_CB && window.__WBGT_CB({json_str});\n')

        written += 1

        if code in PREF_CODES:
            summary['stations'].append({
                'code': code,
                'name': record['name'],
                'prefecture': record['prefecture'],
                'current': current,
            })

    # 都道府県並び順を守る
    order = {c: i for i, (c, _, _) in enumerate(PREF_STATIONS)}
    summary['stations'].sort(key=lambda s: order.get(s['code'], 9999))

    with open(os.path.join(OUTDIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f'written {written} station files + index.json to {OUTDIR}/', file=sys.stderr)


if __name__ == '__main__':
    main()

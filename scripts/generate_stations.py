#!/usr/bin/env python3
"""
env.go.jp の point.js を取得してパース、全国全地点の
コード・名前・所属都道府県を含む station list を生成する。

出力:
  docs/wbgt/stations.json   ← 公開用、全地点リスト
  widgets/wbgt-simple/stations.json  ← ウィジェット同梱用（同内容）
  widgets/wbgt-simple/widget.json    ← Yodeck管理画面の Select 選択肢を更新

使用:
  python scripts/generate_stations.py
"""

import json
import os
import re
import sys
from urllib.request import urlopen, Request

POINT_JS_URL = 'https://www.wbgt.env.go.jp/js/point.js'
OUT_DOCS = 'docs/wbgt/stations.json'
OUT_WIDGET = 'widgets/wbgt-simple/stations.json'
OUT_WIDGET_JSON = 'widgets/wbgt-simple/widget.json'
OUT_YODECK_UI = 'yodeck-ui-settings/wbgt-simple.json'

# 都道府県内サブ地域コード（point.js の prefecture セクション）→ 47都道府県名
# 北海道は14のサブ地域に分かれているので全部「北海道」に丸める。
SUBREGION_TO_PREF = {
    # 北海道地方
    '11': '北海道', '12': '北海道', '13': '北海道', '14': '北海道', '15': '北海道',
    '16': '北海道', '17': '北海道', '18': '北海道', '19': '北海道', '20': '北海道',
    '21': '北海道', '22': '北海道', '23': '北海道', '24': '北海道',
    # 東北
    '31': '青森県', '32': '秋田県', '33': '岩手県', '34': '宮城県', '35': '山形県', '36': '福島県',
    # 関東
    '40': '茨城県', '41': '栃木県', '42': '群馬県', '43': '埼玉県', '44': '東京都', '45': '千葉県', '46': '神奈川県',
    # 甲信
    '48': '長野県', '49': '山梨県',
    # 東海
    '50': '静岡県', '51': '愛知県', '52': '岐阜県', '53': '三重県',
    # 北陸
    '54': '新潟県', '55': '富山県', '56': '石川県', '57': '福井県',
    # 近畿
    '60': '滋賀県', '61': '京都府', '62': '大阪府', '63': '兵庫県', '64': '奈良県', '65': '和歌山県',
    # 中国
    '66': '岡山県', '67': '広島県', '68': '島根県', '69': '鳥取県', '81': '山口県',
    # 四国
    '71': '徳島県', '72': '香川県', '73': '愛媛県', '74': '高知県',
    # 九州
    '82': '福岡県', '83': '大分県', '84': '長崎県', '85': '佐賀県', '86': '熊本県', '87': '宮崎県', '88': '鹿児島県',
    # 沖縄（point.js では特殊コード "9194"）
    '9194': '沖縄県',
}

# 47都道府県の表示順（地理順、北→南）
PREF_ORDER = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県',
    '岐阜県','静岡県','愛知県','三重県',
    '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
    '鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県',
    '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]


def fetch_point_js():
    print(f'fetching {POINT_JS_URL}', file=sys.stderr)
    req = Request(POINT_JS_URL, headers={'User-Agent': 'genbarger-wbgt-station-list/1.0'})
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def parse_point_js(text):
    """point.js から point = { "<subregion>": [["<code>","<name>"],...], ... } を抜き出す"""
    # `var point = {...};` の塊を取得
    m = re.search(r'var\s+point\s*=\s*(\{.*?\})\s*;', text, re.DOTALL)
    if not m:
        raise RuntimeError('point object not found in point.js')
    obj_text = m.group(1)
    # JS のキーは "11":[...] のように既にダブルクォート付きなので JSON でほぼ読める
    # 末尾カンマの除去（念のため）
    obj_text = re.sub(r',\s*([\}\]])', r'\1', obj_text)
    return json.loads(obj_text)


def build_stations(point_obj):
    stations = []
    for subregion, items in point_obj.items():
        pref = SUBREGION_TO_PREF.get(subregion)
        if not pref:
            print(f'WARN: unknown subregion code {subregion}', file=sys.stderr)
            continue
        for entry in items:
            code, name = entry[0], entry[1]
            # ｵﾎｰﾂｸ 等の半角カナを全角に整える（読みやすさ優先）
            stations.append({
                'code': code,
                'name': name,
                'prefecture': pref,
            })
    # 並び順: 都道府県順 → コード順
    pref_index = {p: i for i, p in enumerate(PREF_ORDER)}
    stations.sort(key=lambda s: (pref_index.get(s['prefecture'], 999), s['code']))
    return stations


def write_widget_json(stations):
    """Yodeck UI を Select ドロップダウン（地点名先頭で検索可能）に。
    ラベルを「地点名 / 都道府県」形式にすることで、ブラウザの type-ahead 検索で
    地点名先頭一致が効くようにしている。例: 「くまとり」と打つと熊取にジャンプ。
    """
    options = []
    # 先頭にデフォルト（東京）
    options.append({'val': '44132', 'label': '東京 / 東京都'})
    seen = {'44132'}

    # 地点名でソート（type-ahead 用）
    for s in sorted(stations, key=lambda x: (x['name'], x['code'])):
        if s['code'] in seen:
            continue
        seen.add(s['code'])
        options.append({
            'val': s['code'],
            'label': f"{s['name']} / {s['prefecture']}",
        })

    widget = {
        'type': 'dynamic',
        'fields': ['stationCode', 'refreshMin'],
        'meta': {
            'description': '暑さ指数（WBGT）シンプル版',
            'details': '環境省が公開する全国841地点のWBGT実況値を表示。地点名を入力すると候補にジャンプします（例: 「くまとり」「とうきょう」）。',
        },
        'schema': {
            'stationCode': {
                'title': '観測地点',
                'type': 'Select',
                'help': '一覧から選択、またはドロップダウンを開いて地点名をキーボード入力すると該当地点にジャンプします（例: 「くまとり」と打つと熊取/大阪府）',
                'options': options,
            },
            'refreshMin': {
                'title': '更新間隔（分）',
                'type': 'Select',
                'help': 'データを再取得する間隔',
                'options': [
                    {'val': '15', 'label': '15分（推奨）'},
                    {'val': '5',  'label': '5分'},
                    {'val': '10', 'label': '10分'},
                    {'val': '30', 'label': '30分'},
                    {'val': '60', 'label': '60分'},
                ],
            },
        },
    }
    with open(OUT_WIDGET_JSON, 'w', encoding='utf-8') as f:
        json.dump(widget, f, ensure_ascii=False, indent=2)
    print(f'wrote {OUT_WIDGET_JSON}: Select検索可UI ({len(options)} options)', file=sys.stderr)

    # Yodeck 管理画面用の widget 定義（Yodeck にアップロードする側）
    os.makedirs(os.path.dirname(OUT_YODECK_UI), exist_ok=True)
    with open(OUT_YODECK_UI, 'w', encoding='utf-8') as f:
        json.dump(widget, f, ensure_ascii=False, indent=2)
    print(f'wrote {OUT_YODECK_UI}: 同内容', file=sys.stderr)


def write_stations_md(stations):
    """検索しやすい全地点コード一覧を Markdown で生成"""
    out_md = 'docs/STATIONS.md'
    lines = ['# WBGT 観測地点コード一覧（全845地点）', '']
    lines.append('Yodeck の wbgt-simple ウィジェット設定で「観測地点コード」欄に5桁の数字を入力してください。')
    lines.append('')

    pref_index = {p: i for i, p in enumerate(PREF_ORDER)}
    by_pref = {}
    for s in stations:
        by_pref.setdefault(s['prefecture'], []).append(s)

    for pref in PREF_ORDER:
        if pref not in by_pref:
            continue
        lines.append(f'## {pref}')
        lines.append('')
        lines.append('| 地点名 | コード |')
        lines.append('|---|---|')
        for s in sorted(by_pref[pref], key=lambda x: x['code']):
            lines.append(f"| {s['name']} | `{s['code']}` |")
        lines.append('')

    with open(out_md, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'wrote {out_md}', file=sys.stderr)


def main():
    raw = fetch_point_js()
    point_obj = parse_point_js(raw)
    stations = build_stations(point_obj)
    print(f'parsed {len(stations)} stations', file=sys.stderr)

    payload = {
        'generatedAt': None,
        'count': len(stations),
        'stations': stations,
    }

    os.makedirs(os.path.dirname(OUT_DOCS), exist_ok=True)
    with open(OUT_DOCS, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f'wrote {OUT_DOCS}', file=sys.stderr)

    os.makedirs(os.path.dirname(OUT_WIDGET), exist_ok=True)
    with open(OUT_WIDGET, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f'wrote {OUT_WIDGET}', file=sys.stderr)

    write_widget_json(stations)
    write_stations_md(stations)


if __name__ == '__main__':
    main()

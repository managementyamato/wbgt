#!/usr/bin/env python3
"""
ゲンバルジャー ローカル開発サーバー
=====================================
Yodeck (Raspberry Pi) 環境をローカルPCで再現します。

  python -m http.server 8080 の代わりにこれを使う

提供する機能:
  - 静的ファイル配信 (widgets/, preview.html 等)
  - GET  /device       → Yodeck GPS API モック（lat/lon を返す）
  - POST /set-location → preview.html の地点コントロールから位置を更新

使い方:
  python mock_server.py              # デフォルト: 東京
  python mock_server.py 35.69 139.69 # 緯度 経度 を直接指定

  → http://localhost:8080/preview.html を開く
"""

import http.server
import json
import os
import sys
from urllib.parse import urlparse

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# モック位置情報（起動時に設定、/set-location で動的変更可）
mock_device = {
    "location": [35.6895, 139.6917],   # デフォルト: 東京
    "name": "Mock Yodeck Device",
    "id": "mock-device-001"
}


class MockYodeckHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # ------------------------------------------------------------------ GET
    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/device':
            self._handle_device()
        else:
            super().do_GET()

    # ----------------------------------------------------------------- POST
    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/set-location':
            self._handle_set_location()
        else:
            self.send_error(404)

    # --------------------------------------------------------------- OPTIONS
    def do_OPTIONS(self):
        # CORS プリフライト対応
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    # -------------------------------------------------------- /device handler
    def _handle_device(self):
        body = json.dumps(mock_device, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)
        lat, lon = mock_device['location']
        self._log(f'[GPS Mock] → lat={lat}, lon={lon}')

    # ------------------------------------------------- /set-location handler
    def _handle_set_location(self):
        global mock_device
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
            lat = float(data['lat'])
            lon = float(data['lon'])
            mock_device['location'] = [lat, lon]
            resp = json.dumps({'ok': True, 'location': mock_device['location']}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp)))
            self._cors_headers()
            self.end_headers()
            self.wfile.write(resp)
            name = data.get('name', '')
            self._log(f'[GPS Mock] 位置更新 → lat={lat}, lon={lon}  {name}')
        except Exception as e:
            self.send_error(400, str(e))

    # ---------------------------------------------------------- CORS headers
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')

    # --------------------------------------------------- ログ（必要分のみ）
    def _log(self, msg):
        print(msg)

    def log_message(self, format, *args):
        # /device と /set-location のみ表示（静的ファイルはノイズなので抑制）
        path = args[0] if args else ''
        if '/device' in path or '/set-location' in path:
            super().log_message(format, *args)


# ============================================================= エントリポイント
if __name__ == '__main__':
    # コマンドライン引数: python mock_server.py <lat> <lon>
    if len(sys.argv) >= 3:
        try:
            mock_device['location'] = [float(sys.argv[1]), float(sys.argv[2])]
        except ValueError:
            print('引数エラー: python mock_server.py <緯度> <経度>')
            sys.exit(1)

    lat, lon = mock_device['location']
    print('=' * 50)
    print('  ゲンバルジャー ローカル開発サーバー')
    print('=' * 50)
    print(f'  URL    : http://localhost:{PORT}/preview.html')
    print(f'  初期GPS: lat={lat}, lon={lon}')
    print(f'  停止   : Ctrl+C')
    print('=' * 50)

    try:
        with http.server.HTTPServer(('', PORT), MockYodeckHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nサーバーを停止しました')

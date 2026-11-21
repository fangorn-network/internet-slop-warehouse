"""Serve the Warehouse locally with the public community vote counts."""
import argparse
import json
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

SITE = Path(__file__).resolve().parents[1] / "site"
PUBLIC_VOTES = "https://internet-slop-warehouse.quickbeam.workers.dev/api/votes"


class WarehousePreview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path != "/api/votes":
            return super().do_GET()
        try:
            response = subprocess.check_output(
                ["curl", "-fsS", "--max-time", "5", PUBLIC_VOTES], stderr=subprocess.DEVNULL,
            )
            votes = json.loads(response)
            body = json.dumps({"tally": votes["tally"], "mine": {}}).encode()
        except (OSError, subprocess.CalledProcessError, ValueError, KeyError):
            self.send_error(502, "Public vote totals unavailable")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), WarehousePreview) as server:
        print(f"Warehouse running at http://localhost:{server.server_port}/", flush=True)
        server.serve_forever()

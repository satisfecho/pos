# proxy.py - simple logging proxy for llama-server
import http.server
import socketserver
import requests
import json

TARGET = "http://127.0.0.1:8080"  # llama-server
PORT = 8081                      # Pi points here

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", 0))
        body = self.rfile.read(length) if length else b""
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = None

        print("\n=== POST", self.path, "===")
        if data is not None:
            print(json.dumps(data, indent=2))
        else:
            print(body[:500])

        resp = requests.post(
            TARGET + self.path,
            headers={k: v for k, v in self.headers.items()
                     if k.lower() != "host"},
            data=body,
            stream=True,
        )

        self.send_response(resp.status_code)
        for k, v in resp.headers.items():
            if k.lower() == "transfer-encoding":
                continue
            self.send_header(k, v)
        self.end_headers()
        for chunk in resp.iter_content(chunk_size=8192):
            if chunk:
                self.wfile.write(chunk)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Proxy listening on http://127.0.0.1:{PORT}, forwarding to {TARGET}")
        httpd.serve_forever()



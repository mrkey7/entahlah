from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
import json
import webbrowser


ROOT = Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"
PORT = 4000
URL = f"http://{HOST}:{PORT}"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/ikon.json":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 1024:
                raise ValueError("Ukuran data tidak valid")

            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError("Format JSON tidak valid")

            left = data.get("left")
            top = data.get("top")
            if (not isinstance(left, int) or isinstance(left, bool)
                    or not isinstance(top, int) or isinstance(top, bool)):
                raise ValueError("Posisi harus berupa bilangan bulat")

            (ROOT / "ikon.json").write_text(
                json.dumps({"left": left, "top": top}, indent=2) + "\n",
                encoding="utf-8"
            )

            response = b'{"saved":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except (ValueError, json.JSONDecodeError) as error:
            self.send_error(400, str(error))

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} - {format % args}")


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Folder proyek : {ROOT}")
    print(f"Server lokal  : {URL}")
    print("Tekan Ctrl+C untuk menghentikan server.\n", flush=True)

    Timer(0.8, lambda: webbrowser.open(URL)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

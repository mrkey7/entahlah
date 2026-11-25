from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
import webbrowser


ROOT = Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"
PORT = 4000
URL = f"http://{HOST}:{PORT}"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

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

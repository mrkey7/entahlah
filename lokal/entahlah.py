from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
from urllib.parse import urlsplit
from threading import Timer
from pathlib import Path
import json
import webbrowser
import os
import math


port = 4002
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
PATH_FILE = ROOT / "app" / "path.json"
with PATH_FILE.open("r", encoding="utf-8") as file:
    PATHS = json.load(file)

def file_path(value):
    return ROOT.joinpath(*Path(value).parts)

CONFIG_FILE = file_path(PATHS["rules"]["utama"])
KALIBRASI_FILE = file_path(PATHS["data"]["kalibrasi"])
API_SAVE_CONFIG = PATHS["api"]["saveConfig"]
API_SAVE_KALIBRASI = PATHS["api"]["saveKalibrasi"]
API_SAVE_PAGE = PATHS["api"].get("savePage", "/__save_page")
API_SAVE_CONTENT = PATHS["api"].get("saveContent", "/__save_content")
PAGE_LIST_FILE = ROOT / "app" / "menu" / "halaman.json"
PAGE_ROOT = ROOT / "app-builder" / "halaman"
FONT_KALIBRASI = ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic", "Traditional Arabic")
reload_count = 0

class Handler(SimpleHTTPRequestHandler):
    def cache_disabled(self):
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as file:
                config = json.load(file)
            return config.get("general", {}).get("cache", True) is False
        except (OSError, ValueError, TypeError):
            return False

    def end_headers(self):
        if self.cache_disabled():
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        global reload_count
        path = urlsplit(self.path).path
        if path in ("/", "/index.html"):
            reload_count += 1
            label = "START" if reload_count == 1 else f"RELOAD {reload_count - 1}"
            print(f"\n{label}  |  {datetime.now():%d-%m-%Y %H:%M:%S}", flush=True)
        super().do_GET()

    def do_POST(self):
        route = urlsplit(self.path).path
        if route == API_SAVE_KALIBRASI:
            self.save_kalibrasi_config()
            return
        if route == API_SAVE_PAGE:
            self.save_page()
            return
        if route == API_SAVE_CONTENT:
            self.save_content()
            return
        if route != API_SAVE_CONFIG:
            self.send_error(404, "Endpoint tidak ditemukan")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16384:
                raise ValueError("Ukuran data tidak valid")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            group, data = payload.get("group"), payload.get("data")
            if not isinstance(data, dict):
                raise ValueError("Data konfigurasi tidak valid")
            with CONFIG_FILE.open("r", encoding="utf-8") as file:
                config = json.load(file)
            if not isinstance(config, dict):
                raise ValueError("Struktur rules.json tidak sesuai")
            if group == "sampul":
                if not isinstance(config.get("sampul"), dict):
                    raise ValueError("Struktur sampul tidak sesuai")
                tampilkan, judul, penyusun = data.get("tampilkan"), data.get("judul"), data.get("penyusun")
                if not isinstance(tampilkan, bool):
                    raise ValueError("Nilai tampilkan harus boolean")
                if isinstance(judul, bool) or not isinstance(judul, (int, float)) or not 0 <= judul <= 40:
                    raise ValueError("Ukuran judul di luar batas 0-40")
                if isinstance(penyusun, bool) or not isinstance(penyusun, (int, float)) or not 0 <= penyusun <= 20:
                    raise ValueError("Ukuran penyusun di luar batas 0-20")
                config["sampul"] = {**config["sampul"], "tampilkan": tampilkan, "judul": judul, "penyusun": penyusun}
                message = "Konfigurasi sampul tersimpan"
            elif group == "general":
                cache = data.get("cache")
                if not isinstance(cache, bool):
                    raise ValueError("Nilai cache harus boolean")
                config.setdefault("general", {})
                if not isinstance(config["general"], dict):
                    raise ValueError("Struktur general tidak sesuai")
                config["general"]["cache"] = cache
                message = "Pengaturan General tersimpan"
            else:
                raise ValueError("Grup konfigurasi tidak diizinkan")
            temp_file = CONFIG_FILE.with_suffix(".json.tmp")
            with temp_file.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(config, file, ensure_ascii=False, indent=2)
                file.write("\n")
            os.replace(temp_file, CONFIG_FILE)
            self.send_json(200, {"ok": True, "message": message})
            print(f"[SAVE] rules.json | {group} | {datetime.now():%H:%M:%S}", flush=True)
        except Exception as error:
            self.send_json(400, {"ok": False, "error": str(error)})

    def save_kalibrasi_config(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 4096:
                raise ValueError("Ukuran data tidak valid")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            data = payload.get("data")
            if not isinstance(data, dict):
                raise ValueError("Data kalibrasi tidak valid")
            font = data.get("font")
            if font not in FONT_KALIBRASI:
                raise ValueError("Nama font tidak dikenal")
            a, b, faktor = data.get("autofit"), data.get("target"), data.get("faktor")
            for nama, nilai in (("A", a), ("B", b), ("Faktor", faktor)):
                if isinstance(nilai, bool) or not isinstance(nilai, (int, float)) or not math.isfinite(nilai):
                    raise ValueError(f"Nilai {nama} harus berupa angka valid")
            if a <= 0 or b <= 0 or not 0.1 <= faktor <= 5:
                raise ValueError("Nilai A/B atau faktor berada di luar batas")
            if not math.isclose(faktor, b / a, rel_tol=1e-5, abs_tol=1e-5):
                raise ValueError("Faktor tidak sesuai dengan perbandingan B/A")
            if KALIBRASI_FILE.exists():
                with KALIBRASI_FILE.open("r", encoding="utf-8") as file:
                    config = json.load(file)
            else:
                config = {}
            if not isinstance(config, dict):
                raise ValueError("Struktur kalibrasi.json tidak sesuai")
            skala = config.setdefault("skala", {})
            if not isinstance(skala, dict):
                raise ValueError("Bagian skala tidak sesuai")
            skala[font] = {"autofit": round(float(a), 2), "target": round(float(b), 2), "faktor": round(float(faktor), 6)}
            KALIBRASI_FILE.parent.mkdir(parents=True, exist_ok=True)
            temp_file = KALIBRASI_FILE.with_suffix(".json.tmp")
            with temp_file.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(config, file, ensure_ascii=False, indent=2)
                file.write("\n")
            os.replace(temp_file, KALIBRASI_FILE)
            self.send_json(200, {"ok": True, "message": f"Kalibrasi {font} tersimpan"})
            print(f"[SAVE] kalibrasi.json | {font} | A={a:.2f} B={b:.2f} F={faktor:.6f}", flush=True)
        except Exception as error:
            self.send_json(400, {"ok": False, "error": str(error)})



    def save_content(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 65536:
                raise ValueError("Ukuran data tidak valid")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            slug, blocks = payload.get("slug"), payload.get("konten")
            if not isinstance(slug, str) or not __import__("re").fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
                raise ValueError("ID halaman tidak valid")
            if not isinstance(blocks, list) or len(blocks) > 500:
                raise ValueError("Daftar blok tidak valid")
            folder = (PAGE_ROOT / slug).resolve()
            if folder.parent != PAGE_ROOT.resolve() or not folder.is_dir():
                raise ValueError("Halaman tidak ditemukan")
            config_file = folder / "halaman.json"
            with config_file.open("r", encoding="utf-8") as file:
                page = json.load(file)
            for index, block in enumerate(blocks, 1):
                if not isinstance(block, dict):
                    raise ValueError(f"Blok {index} tidak valid")
                if block.get("jenis") not in ("teks", "ikon"):
                    raise ValueError(f"Jenis blok {index} tidak dikenal")
                if not isinstance(block.get("id"), str) or not block["id"]:
                    raise ValueError(f"ID blok {index} tidak valid")
                if not isinstance(block.get("nilai"), str) or len(block["nilai"]) > 5000:
                    raise ValueError(f"Isi blok {index} tidak valid")
                if not isinstance(block.get("target"), str) or not __import__("re").fullmatch(r"[A-Z]+[1-9][0-9]*", block["target"]):
                    raise ValueError(f"Posisi A1 blok {index} tidak valid")
            page["konten"] = blocks
            page["versi"] = max(1, int(page.get("versi", 1)))
            temp_file = config_file.with_suffix(".json.tmp")
            with temp_file.open("w", encoding="utf-8", newline="\\n") as file:
                json.dump(page, file, ensure_ascii=False, indent=2)
                file.write("\\n")
            os.replace(temp_file, config_file)
            self.send_json(200, {"ok": True, "jumlah": len(blocks)})
            print(f"[CONTENT] {slug} | {len(blocks)} blok | {datetime.now():%H:%M:%S}", flush=True)
        except Exception as error:
            self.send_json(400, {"ok": False, "error": str(error)})

    def save_page(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 8192:
                raise ValueError("Ukuran data tidak valid")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            nama, slug = payload.get("nama"), payload.get("id")
            keterangan = payload.get("keterangan", "")
            if not isinstance(nama, str) or not 1 <= len(nama.strip()) <= 60:
                raise ValueError("Nama halaman harus 1-60 karakter")
            if not isinstance(slug, str) or not __import__("re").fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or len(slug) > 48:
                raise ValueError("ID halaman hanya boleh berisi huruf kecil, angka, dan tanda hubung")
            if not isinstance(keterangan, str) or len(keterangan) > 180:
                raise ValueError("Keterangan maksimal 180 karakter")
            with PAGE_LIST_FILE.open("r", encoding="utf-8") as file:
                daftar = json.load(file)
            if not isinstance(daftar, dict) or not isinstance(daftar.get("halaman"), list):
                raise ValueError("Struktur halaman.json tidak sesuai")
            if any(item.get("id") == f"page-{slug}" or item.get("slug") == slug for item in daftar["halaman"]):
                raise ValueError("ID halaman sudah digunakan")
            folder = PAGE_ROOT / slug
            if folder.exists():
                raise ValueError("Folder halaman sudah ada")
            page_id = f"page-{slug}"
            relative = f"app-builder/halaman/{slug}/index.html"
            data = {"versi": 1, "id": page_id, "slug": slug, "nama": nama.strip(),
                    "keterangan": keterangan.strip(), "template": "kosong", "konten": []}
            folder.mkdir(parents=True, exist_ok=False)
            with (folder / "halaman.json").open("w", encoding="utf-8", newline="\n") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")
            import html
            document = ("<!doctype html>\n<html lang=\"id\">\n<head>\n"
                        "  <meta charset=\"utf-8\">\n"
                        "  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
                        f"  <title>{html.escape(nama.strip())}</title>\n"
                        "</head>\n"
                        f"<body data-page-name=\"{html.escape(nama.strip(), quote=True)}\">\n"
                        f"  <main id=\"page-canvas\" data-page-id=\"{page_id}\"></main>\n"
                        "  <script src=\"../../../app/path.js\" data-page=\"blank\"></script>\n"
                        "</body>\n</html>\n")
            with (folder / "index.html").open("w", encoding="utf-8", newline="\n") as file:
                file.write(document)
            daftar["halaman"].append({"id": page_id, "nama": nama.strip(), "url": relative,
                                      "aktif": True, "slug": slug})
            temp_file = PAGE_LIST_FILE.with_suffix(".json.tmp")
            with temp_file.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(daftar, file, ensure_ascii=False, indent=2)
                file.write("\n")
            os.replace(temp_file, PAGE_LIST_FILE)
            self.send_json(200, {"ok": True, "page": data, "url": relative})
            print(f"[PAGE] Dibuat: {page_id} | {datetime.now():%H:%M:%S}", flush=True)
        except Exception as error:
            self.send_json(400, {"ok": False, "error": str(error)})

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
url = f"http://localhost:{port}"
print(f"Root proyek : {ROOT}", flush=True)
print(f"Server      : {url}", flush=True)
print(f"Penyimpanan konfigurasi aktif: POST {API_SAVE_CONFIG} dan {API_SAVE_KALIBRASI}", flush=True)
Timer(1, lambda: webbrowser.open(url)).start()
server.serve_forever()

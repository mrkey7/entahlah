(() => {
  "use strict";

  const DEFAULTS = Object.freeze({
    peta: "G", kolom: 4, baris: 4, target: "A1",
    konten: { jenis: "teks", nilai: "" },
    ukuran: { kolom: 1, baris: 1, mode: "sel", lebar: 28, tinggi: 28 },
    teks: { skala: 0.8, horizontal: "tengah", vertikal: "tengah", bungkus: false, arah: "auto" },
    tampilan: { warna: null, latar: null, tebal: false, miring: false, padding: 0 }
  });

  const gabung = (dasar, tambahan) => {
    const hasil = { ...dasar, ...(tambahan || {}) };
    for (const key of Object.keys(dasar)) {
      if (dasar[key] && typeof dasar[key] === "object" && !Array.isArray(dasar[key])) {
        hasil[key] = { ...dasar[key], ...(tambahan?.[key] || {}) };
      }
    }
    return hasil;
  };

  function parse(nilai) {
    const match = /^([A-Z]+)([1-9]\\d*)$/i.exec(String(nilai || "").trim());
    if (!match) throw new Error("Notasi A1 tidak valid: " + nilai);
    let kolom = 0;
    for (const huruf of match[1].toUpperCase()) kolom = kolom * 26 + huruf.charCodeAt(0) - 64;
    return { kolom: kolom - 1, baris: Number(match[2]) - 1 };
  }

  function notasi(kolom, baris) {
    if (!Number.isInteger(kolom) || kolom < 0 || !Number.isInteger(baris) || baris < 0) {
      throw new Error("Indeks kolom/baris tidak valid.");
    }
    let n = kolom + 1, huruf = "";
    while (n > 0) {
      const sisa = (n - 1) % 26;
      huruf = String.fromCharCode(65 + sisa) + huruf;
      n = Math.floor((n - 1) / 26);
    }
    return huruf + (baris + 1);
  }

  function posisi(parameter, geometri) {
    const config = gabung(DEFAULTS, parameter);
    for (const key of ["ukuran", "teks", "tampilan", "konten"]) {
      config[key] = gabung(DEFAULTS[key], parameter?.[key]);
    }
    config.kolom = Number(config.kolom);
    config.baris = Number(config.baris);
    if (!Number.isInteger(config.kolom) || config.kolom < 1 || !Number.isInteger(config.baris) || config.baris < 1) {
      throw new Error("Jumlah kolom dan baris harus bilangan bulat positif.");
    }
    const awal = parse(config.target);
    const rentangKolom = Math.max(1, Number(config.ukuran.kolom) || 1);
    const rentangBaris = Math.max(1, Number(config.ukuran.baris) || 1);
    if (awal.kolom + rentangKolom > config.kolom || awal.baris + rentangBaris > config.baris) {
      throw new Error("Target " + config.target + " melewati batas grid " + config.kolom + " × " + config.baris + ".");
    }
    if (!geometri || !(geometri.width > 0) || !(geometri.height > 0)) {
      throw new Error("Geometri area grid belum siap.");
    }
    const cellWidth = geometri.width / config.kolom;
    const cellHeight = geometri.height / config.baris;
    const left = geometri.left + awal.kolom * cellWidth;
    const top = geometri.top + awal.baris * cellHeight;
    const width = rentangKolom * cellWidth;
    const height = rentangBaris * cellHeight;
    const tetap = config.ukuran.mode === "tetap";
    return {
      ...config, sel: awal,
      left: tetap ? left + width / 2 : left,
      top: tetap ? top + height / 2 : top,
      width: tetap ? Number(config.ukuran.lebar || 28) : width,
      height: tetap ? Number(config.ukuran.tinggi || 28) : height,
      cellWidth, cellHeight, centered: tetap
    };
  }

  function sequence(parameter, geometri) {
    const config = gabung(DEFAULTS, parameter);
    const mulai = parse(config.mulai || config.target || "A1");
    const daftar = Array.isArray(config.konten?.nilai) ? config.konten.nilai : (Array.isArray(config.items) ? config.items : []);
    const jumlah = Math.max(0, Math.floor(Number(config.jumlah ?? daftar.length)));
    const langkah = Math.max(1, Math.floor(Number(config.langkah) || 1));
    const arah = config.arah || "bawah";
    if (!["bawah", "kanan"].includes(arah)) throw new Error("Arah sequence tidak dikenal: " + arah);
    return Array.from({ length: jumlah }, (_, i) => {
      const item = daftar[i];
      const khusus = item && typeof item === "object" && !Array.isArray(item) ? item : {};
      const nilai = typeof item === "string" ? item : khusus.nilai;
      const cfg = gabung(config, khusus);
      cfg.target = notasi(mulai.kolom + (arah === "kanan" ? i * langkah : 0), mulai.baris + (arah === "bawah" ? i * langkah : 0));
      cfg.konten = gabung(config.konten || DEFAULTS.konten, khusus.konten || {});
      if (nilai !== undefined) cfg.konten.nilai = nilai;
      return posisi(cfg, geometri);
    });
  }

  function terapkan(element, layout) {
    if (!element) throw new Error("Elemen target tidak ditemukan.");
    Object.assign(element.style, {
      position: "absolute", left: layout.left + "px", top: layout.top + "px",
      width: layout.width + "px", height: layout.height + "px",
      transform: layout.centered ? "translate(-50%, -50%)" : "none",
      display: "flex",
      alignItems: ({ atas: "flex-start", tengah: "center", bawah: "flex-end" })[layout.teks.vertikal] || "center",
      justifyContent: ({ kiri: "flex-start", tengah: "center", kanan: "flex-end" })[layout.teks.horizontal] || "center",
      textAlign: layout.teks.horizontal || "center", direction: layout.teks.arah || "auto",
      whiteSpace: layout.teks.bungkus ? "normal" : "nowrap",
      fontSize: (layout.cellWidth * Number(layout.teks.skala || 0.8)) + "px",
      color: layout.tampilan.warna || "", background: layout.tampilan.latar || "transparent",
      fontWeight: layout.tampilan.tebal ? "bold" : "normal",
      fontStyle: layout.tampilan.miring ? "italic" : "normal",
      padding: (Number(layout.tampilan.padding) || 0) + "px", boxSizing: "border-box"
    });
    if (["teks", "ikon"].includes(layout.konten?.jenis) && layout.konten.nilai !== undefined && layout.konten.nilai !== "") {
      element.textContent = String(layout.konten.nilai);
    }
    return element;
  }

  window.A1Layout = Object.freeze({ defaults: DEFAULTS, parse, notasi, posisi, sequence, terapkan });
})();

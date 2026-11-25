(() => {
  "use strict";

  window.initGridBuilder = async area => {
    const response = await fetch("builder/grid/config.json", { cache: "no-store" });
    const config = await response.json();
    const overlay = document.createElement("div");
    overlay.id = "gridOverlay";
    const previewOverlay = document.createElement("div");
    previewOverlay.id = "gridPreviewOverlay";

    const panel = document.createElement("section");
    panel.className = "grid-panel";
    panel.hidden = true;
    panel.innerHTML = '<div class="grid-head"><h2>Pembentuk Grid</h2><button type="button" class="grid-close" aria-label="Tutup">×</button></div><div class="grid-controls"><label><input type="checkbox" class="grid-toggle"> Tampilkan Grid</label><label><input type="checkbox" class="grid-outline"> Garis luar tebal</label></div><div class="grid-picker" role="group" aria-label="Pilih jumlah kolom dan baris"></div><div class="grid-controls"><label>Kolom <input type="number" class="grid-cols" min="1" max="64"></label><label>Baris <input type="number" class="grid-rows" min="1" max="64"></label><span class="grid-status" aria-live="polite"></span></div>';
    area.append(overlay, previewOverlay, panel);

    const picker = panel.querySelector(".grid-picker");
    const toggle = panel.querySelector(".grid-toggle");
    const outline = panel.querySelector(".grid-outline");
    const cols = panel.querySelector(".grid-cols");
    const rows = panel.querySelector(".grid-rows");
    const status = panel.querySelector(".grid-status");
    const close = panel.querySelector(".grid-close");
    let preview = false;

    cols.value = String(config.kolom || 4);
    rows.value = String(config.baris || 4);
    toggle.checked = Boolean(config.aktif);
    outline.checked = Boolean(config.tebalLuar);

    function save() {
      config.kolom = Math.max(1, Math.min(64, Math.floor(Number(cols.value) || 1)));
      config.baris = Math.max(1, Math.min(64, Math.floor(Number(rows.value) || 1)));
      config.aktif = toggle.checked;
      config.tebalLuar = outline.checked;
      status.textContent = config.kolom + " × " + config.baris;
      localStorage.setItem("entahlah.grid.config", JSON.stringify(config));
      render();
      renderPicker();
    }

    function renderPicker(kolom = config.kolom, baris = config.baris) {
      status.textContent = kolom + " × " + baris;
      for (const button of picker.children) {
        const c = Number(button.dataset.kolom);
        const r = Number(button.dataset.baris);
        button.classList.toggle("is-preview", c <= kolom && r <= baris);
        button.classList.toggle("is-current", c <= config.kolom && r <= config.baris);
      }
    }

    for (let baris = 1; baris <= 10; baris++) {
      for (let kolom = 1; kolom <= 10; kolom++) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.kolom = String(kolom);
        button.dataset.baris = String(baris);
        button.title = kolom + " kolom × " + baris + " baris";
        button.setAttribute("aria-label", button.title);
        button.addEventListener("mouseenter", () => {
          preview = true;
          render(previewOverlay, kolom, baris);
          renderPicker(kolom, baris);
        });
        button.addEventListener("focus", () => {
          preview = true;
          render(previewOverlay, kolom, baris);
          renderPicker(kolom, baris);
        });
        button.addEventListener("click", () => {
          cols.value = String(kolom);
          rows.value = String(baris);
          preview = false;
          save();
        });
        picker.append(button);
      }
    }

    function render(target = overlay, kolom = config.kolom, baris = config.baris) {
      const visible = target === previewOverlay || config.aktif;
      target.style.left = "0";
      target.style.top = "0";
      target.style.width = area.clientWidth + "px";
      target.style.height = area.clientHeight + "px";
      target.style.setProperty("--grid-kolom", String(kolom));
      target.style.setProperty("--grid-baris", String(baris));
      target.style.setProperty("--grid-outline-width", config.tebalLuar ? "2px" : "1px");
      target.classList.toggle("aktif", visible);
    }

    function resetPreview() {
      preview = false;
      previewOverlay.classList.remove("aktif");
      renderPicker();
    }

    picker.addEventListener("mouseleave", resetPreview);
    picker.addEventListener("focusout", event => {
      if (!picker.contains(event.relatedTarget)) resetPreview();
    });
    cols.addEventListener("change", save);
    rows.addEventListener("change", save);
    toggle.addEventListener("change", save);
    outline.addEventListener("change", save);
    close.addEventListener("click", () => panel.hidden = true);
    window.addEventListener("resize", () => render());

    function togglePanel() {
      panel.hidden = !panel.hidden;
    }

    window.GridBuilder = Object.freeze({ toggle: togglePanel, open: () => panel.hidden = false, close: () => panel.hidden = true, render });
    render();
    renderPicker();
  };
})();

(() => {
  "use strict";

  window.initGridBuilder = async ({ panelArea, areas }) => {
    if (window.GridBuilder) return window.GridBuilder;

    const response = await fetch("builder/grid/config.json", { cache: "no-store" });
    const config = await response.json();
    try {
      const saved = JSON.parse(localStorage.getItem("entahlah.grid.config") || "null");
      if (saved && typeof saved === "object") Object.assign(config, saved);
    } catch (error) {
      console.warn("Konfigurasi Grid lokal tidak dapat dimuat:", error);
    }

    const overlay = document.createElement("div");
    overlay.id = "gridOverlay";
    const previewOverlay = document.createElement("div");
    previewOverlay.id = "gridPreviewOverlay";

    const panel = document.createElement("section");
    panel.className = "grid-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="grid-toolbar">
        <label><input type="checkbox" class="grid-toggle"> Grid</label>
        <label><input type="checkbox" class="grid-outline"> Luar ++</label>
      </div>
      <div class="grid-body">
        <div class="grid-picker-wrap">
          <div class="grid-caption">Sisipkan Grid</div>
          <div class="grid-picker" role="group" aria-label="Pilih jumlah kolom dan baris"></div>
        </div>
        <div class="grid-settings">
          <label>Jumlah kolom<input type="number" class="grid-cols" min="1" max="64"></label>
          <label>Jumlah baris<input type="number" class="grid-rows" min="1" max="64"></label>
          <span class="grid-status" aria-live="polite"></span>
          <div class="grid-areas" role="group" aria-label="Area Grid">
            <button type="button" data-area="G" aria-label="Global">G</button>
            <button type="button" data-area="S" aria-label="Sidebar">S</button>
            <button type="button" data-area="P" aria-label="Pages">P</button>
          </div>
        </div>
      </div>`;
    const menu = panelArea.querySelector('.sidebar-menu');
    (menu || panelArea).append(panel);

    const picker = panel.querySelector(".grid-picker");
    const toggle = panel.querySelector(".grid-toggle");
    const outline = panel.querySelector(".grid-outline");
    const cols = panel.querySelector(".grid-cols");
    const rows = panel.querySelector(".grid-rows");
    const status = panel.querySelector(".grid-status");
    const areaButtons = [...panel.querySelectorAll("[data-area]")];

    let selectedArea = ["G", "S", "P"].includes(config.area) ? config.area : "P";
    cols.value = String(config.kolom || 4);
    rows.value = String(config.baris || 4);
    toggle.checked = Boolean(config.aktif);
    outline.checked = Boolean(config.tebalLuar);

    function render(target = overlay, kolom = config.kolom, baris = config.baris) {
      target.style.setProperty("--grid-kolom", String(kolom));
      target.style.setProperty("--grid-baris", String(baris));
      target.style.setProperty("--grid-outline-width", config.tebalLuar ? "2px" : "1px");
      target.classList.toggle("aktif", target === previewOverlay || config.aktif);
    }

    function resetPreview() {
      previewOverlay.classList.remove("aktif");
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

    function save() {
      config.kolom = Math.max(1, Math.min(64, Math.floor(Number(cols.value) || 1)));
      config.baris = Math.max(1, Math.min(64, Math.floor(Number(rows.value) || 1)));
      config.aktif = toggle.checked;
      config.tebalLuar = outline.checked;
      config.area = selectedArea;
      try {
        localStorage.setItem("entahlah.grid.config", JSON.stringify(config));
      } catch (error) {
        console.warn("Konfigurasi Grid tidak dapat disimpan:", error);
      }
      render();
      renderPicker();
    }

    function selectArea(area) {
      selectedArea = area;
      config.area = area;
      areas[area].append(overlay, previewOverlay);
      areaButtons.forEach(button => button.classList.toggle("is-active", button.dataset.area === area));
      save();
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
          render(previewOverlay, kolom, baris);
          renderPicker(kolom, baris);
        });
        button.addEventListener("focus", () => {
          render(previewOverlay, kolom, baris);
          renderPicker(kolom, baris);
        });
        button.addEventListener("click", () => {
          cols.value = String(kolom);
          rows.value = String(baris);
          save();
        });
        picker.append(button);
      }
    }

    picker.addEventListener("mouseleave", resetPreview);
    picker.addEventListener("focusout", event => {
      if (!picker.contains(event.relatedTarget)) resetPreview();
    });

    cols.addEventListener("change", save);
    rows.addEventListener("change", save);
    toggle.addEventListener("change", save);
    outline.addEventListener("change", save);
    areaButtons.forEach(button => button.addEventListener("click", () => selectArea(button.dataset.area)));

    selectArea(selectedArea);
    render();
    renderPicker();

    window.GridBuilder = Object.freeze({
      open: () => panel.hidden = false,
      close: () => panel.hidden = true,
      toggle: () => panel.hidden = !panel.hidden,
      render
    });
    return window.GridBuilder;
  };
})();
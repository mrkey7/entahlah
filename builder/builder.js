const petaG = document.querySelector("#petaG");
const petaS = document.querySelector("#petaS");
const petaP = document.querySelector("#petaP");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

const SIDEBAR_SIZE_DEFAULT = { width: 48, height: 48 };
let sidebarSize = { ...SIDEBAR_SIZE_DEFAULT };
const SIDEBAR_VISIBILITY_KEY = "entahlah.sidebar.hidden";
const THEME_STORAGE_KEY = "entahlah.theme";
const GRID_CONFIG_STORAGE_KEY = "entahlah.grid.config";
const SIDEBAR_SIZE_MIN = 16;
const SIDEBAR_SIZE_MAX = 160;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartWidth = SIDEBAR_SIZE_DEFAULT.width;
let pointerStartHeight = SIDEBAR_SIZE_DEFAULT.height;
let pointerStartCenterY = 0;
let resizeAxes = { x: false, y: false };
let resizeSigns = { x: -1, y: 1 };
let saveChangesEnabled = false;
let pointerActive = false;
let pointerMoved = false;
let suppressClick = false;
let clickTimer = null;

function applySidebarSize(width, height) {
  sidebarSize = {
    width: Math.max(SIDEBAR_SIZE_MIN, Math.min(SIDEBAR_SIZE_MAX, Number(width))),
    height: Math.max(SIDEBAR_SIZE_MIN, Math.min(SIDEBAR_SIZE_MAX, Number(height)))
  };
  petaG.style.setProperty("--sidebar-icon-width", sidebarSize.width + "px");
  petaG.style.setProperty("--sidebar-icon-height", sidebarSize.height + "px");
}

async function loadSidebarConfig() {
  try {
    const response = await fetch("builder/sidebar.json", { cache: "no-store" });
    if (!response.ok) return;
    const config = await response.json();
    const width = Number(config.width);
    const height = Number(config.height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      applySidebarSize(width, height);
    }
  } catch (error) {
    console.warn("Konfigurasi ukuran ikon sidebar tidak dapat dimuat:", error);
  }
}

async function saveSidebarConfig() {
  try {
    const response = await fetch("/builder/sidebar.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sidebarSize)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
  } catch (error) {
    console.warn("Ukuran bawaan ikon sidebar tidak dapat disimpan. Jalankan Builder melalui lokal/entahlah.py:", error);
  }
}

function updateSidebarIconPosition() {
  if (petaG.classList.contains("sidebar-hidden")) return;
  const groupRect = petaG.getBoundingClientRect();
  const sidebarRect = petaS.getBoundingClientRect();
  const edge = sidebarRect.left - groupRect.left + petaS.clientWidth;
  petaG.style.setProperty("--sidebar-edge", edge + "px");
}

function observeSidebarArea() {
  updateSidebarIconPosition();

  if (!("ResizeObserver" in window)) {
    window.addEventListener("resize", updateSidebarIconPosition);
    return;
  }

  const observer = new ResizeObserver(updateSidebarIconPosition);
  observer.observe(petaS);

  const menu = petaS.querySelector(".sidebar-menu");
  if (menu) observer.observe(menu);
}

function resetSidebarSize() {
  applySidebarSize(SIDEBAR_SIZE_DEFAULT.width, SIDEBAR_SIZE_DEFAULT.height);
}

function setSidebarHidden(hidden) {
  petaG.classList.toggle("sidebar-hidden", hidden);
  sidebarIcon.setAttribute("aria-expanded", String(!hidden));
  if (!hidden) requestAnimationFrame(updateSidebarIconPosition);
  try {
    localStorage.setItem(SIDEBAR_VISIBILITY_KEY, String(hidden));
  } catch (error) {
    console.warn("Status sidebar tidak dapat disimpan:", error);
  }
}

function loadSidebarVisibility() {
  try {
    setSidebarHidden(localStorage.getItem(SIDEBAR_VISIBILITY_KEY) === "true");
  } catch (error) {
    console.warn("Status sidebar tidak dapat dimuat:", error);
    setSidebarHidden(false);
  }
}

function toggleSidebar() {
  setSidebarHidden(!petaG.classList.contains("sidebar-hidden"));
}

function buildSidebarMenu() {
  petaS.innerHTML = `
    <div class="sidebar-menu" aria-label="Pengaturan">
      <h2>Pengaturan</h2>
      <label for="themeChoice">Tema</label>
      <select id="themeChoice">
        <option value="system">System</option>
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
        <option value="none">Tanpa</option>
      </select>
      <label class="sidebar-check" for="saveChangesChoice">
        <input type="checkbox" id="saveChangesChoice">
        Perubahan
      </label>
      <label class="sidebar-check" for="gridToolChoice">
        <input type="checkbox" id="gridToolChoice">
        Grid
      </label>
    </div>
  `;

  const themeChoice = petaS.querySelector("#themeChoice");
  const gridToolChoice = petaS.querySelector("#gridToolChoice");
  const saveChangesChoice = petaS.querySelector("#saveChangesChoice");

  saveChangesChoice.checked = false;
  saveChangesEnabled = false;
  sidebarIcon.classList.remove("resize-enabled");
  saveChangesChoice.addEventListener("change", () => {
    saveChangesEnabled = saveChangesChoice.checked;
    sidebarIcon.classList.toggle("resize-enabled", saveChangesEnabled);
    sidebarIcon.setAttribute("aria-label", saveChangesEnabled
      ? "Editor ukuran aktif: tarik sisi atau sudut untuk mengubah ukuran"
      : "Buka atau tutup sidebar");
  });

  function applyTheme(theme) {
    const selected = ["system", "light", "dark", "none"].includes(theme) ? theme : "system";
    petaS.dataset.theme = selected;
    themeChoice.value = selected;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, selected);
    } catch (error) {
      console.warn("Tema tidak dapat disimpan:", error);
    }
  }

  let savedTheme = "system";
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "system";
  } catch (error) {
    console.warn("Tema tidak dapat dimuat:", error);
  }

  themeChoice.addEventListener("change", () => applyTheme(themeChoice.value));
  applyTheme(savedTheme);

  async function setGridToolOpen(open) {
    if (!window.GridBuilder && window.initGridBuilder) {
      await window.initGridBuilder({ panelArea: petaS, areas: { G: petaG, S: petaS, P: petaP } });
    }
    if (open) window.GridBuilder?.open();
    else window.GridBuilder?.close();
  }

  gridToolChoice.checked = false;
  gridToolChoice.addEventListener("change", () => setGridToolOpen(gridToolChoice.checked));
}

function getResizeHandle(event, rect) {
  const edge = Math.min(10, Math.max(5, Math.min(rect.width, rect.height) * 0.22));
  const left = event.clientX - rect.left <= edge;
  const right = rect.right - event.clientX <= edge;
  const top = event.clientY - rect.top <= edge;
  const bottom = rect.bottom - event.clientY <= edge;

  const horizontal = left || right;
  const vertical = top || bottom;
  const corner = horizontal && vertical;
  const side = horizontal ? "ew-resize" : vertical ? "ns-resize" : "pointer";
  const cornerCursor = (left && top) || (right && bottom) ? "nwse-resize" : "nesw-resize";
  return {
    x: horizontal,
    y: vertical,
    signX: -1,
    signY: top ? -1 : 1,
    cursor: corner ? cornerCursor : side
  };
}

sidebarIcon.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !saveChangesEnabled) return;
  const currentSize = sidebarIcon.getBoundingClientRect();
  resizeAxes = getResizeHandle(event, currentSize);
  sidebarIcon.style.cursor = resizeAxes.cursor;
  if (!resizeAxes.x && !resizeAxes.y) return;

  pointerActive = true;
  pointerMoved = false;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerStartWidth = currentSize.width;
  pointerStartHeight = currentSize.height;
  pointerStartCenterY = currentSize.top + currentSize.height / 2;
  resizeSigns = { x: resizeAxes.signX, y: resizeAxes.signY };
  sidebarIcon.setPointerCapture(event.pointerId);
});

sidebarIcon.addEventListener("pointermove", event => {
  if (!pointerActive) {
    if (!saveChangesEnabled) {
      sidebarIcon.style.cursor = "pointer";
      return;
    }
    const rect = sidebarIcon.getBoundingClientRect();
    sidebarIcon.style.cursor = getResizeHandle(event, rect).cursor;
    return;
  }
  const deltaX = event.clientX - pointerStartX;
  const deltaY = event.clientY - pointerStartY;
  if ((resizeAxes.x && Math.abs(deltaX) > 3) ||
      (resizeAxes.y && Math.abs(deltaY) > 3)) pointerMoved = true;
  if (!pointerMoved) return;

  const width = resizeAxes.x
    ? pointerStartWidth + deltaX * resizeSigns.x
    : pointerStartWidth;
  const height = resizeAxes.y
    ? pointerStartHeight + deltaY * resizeSigns.y
    : pointerStartHeight;
  applySidebarSize(width, height);
  if (resizeAxes.y) {
    const groupTop = petaG.getBoundingClientRect().top;
    const centerY = pointerStartCenterY + deltaY / 2;
    petaG.style.setProperty("--sidebar-y", (centerY - groupTop) + "px");
  }
});

sidebarIcon.addEventListener("pointerup", event => {
  if (!pointerActive) return;
  pointerActive = false;
  sidebarIcon.style.cursor = "pointer";
  if (pointerMoved) {
    suppressClick = true;
    saveSidebarConfig();
  }
  if (sidebarIcon.hasPointerCapture(event.pointerId)) {
    sidebarIcon.releasePointerCapture(event.pointerId);
  }
});

sidebarIcon.addEventListener("pointercancel", () => {
  pointerActive = false;
  sidebarIcon.style.cursor = "pointer";
  if (pointerMoved) {
    saveSidebarConfig();
  }
});

sidebarIcon.addEventListener("click", () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    toggleSidebar();
    clickTimer = null;
  }, 250);
});

sidebarIcon.addEventListener("dblclick", event => {
  event.preventDefault();
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = null;
  resetSidebarSize();
  saveSidebarConfig();
});

sidebarIcon.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSidebar();
  }
});

buildSidebarMenu();
loadSidebarVisibility();
loadSidebarConfig().then(updateSidebarIconPosition);
observeSidebarArea();

const petaG = document.querySelector("#petaG");
const petaS = document.querySelector("#petaS");
const petaP = document.querySelector("#petaP");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

const SIDEBAR_STORAGE_KEY = "entahlah.sidebar.position";
const SIDEBAR_VISIBILITY_KEY = "entahlah.sidebar.hidden";
const THEME_STORAGE_KEY = "entahlah.theme";
const GRID_CONFIG_STORAGE_KEY = "entahlah.grid.config";
const SIDEBAR_DEFAULT = 25;
let sidebarPosition = SIDEBAR_DEFAULT;
let pointerStartX = 0;
let pointerStartPosition = SIDEBAR_DEFAULT;
let pointerActive = false;
let pointerMoved = false;
let suppressClick = false;
let clickTimer = null;

function applySidebarPosition(value) {
  sidebarPosition = Math.max(0, Math.min(100, Number(value)));
  petaG.style.setProperty("--sidebar-width", sidebarPosition + "%");
}

function saveSidebarPosition() {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarPosition));
  } catch (error) {
    console.warn("Posisi sidebar tidak dapat disimpan:", error);
  }
}

function loadSidebarPosition() {
  try {
    const savedValue = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const saved = Number(savedValue);
    if (savedValue !== null && Number.isFinite(saved)) {
      applySidebarPosition(saved);
      return;
    }
  } catch (error) {
    console.warn("Posisi sidebar tidak dapat dimuat:", error);
  }
  applySidebarPosition(SIDEBAR_DEFAULT);
}

function resetSidebarPosition() {
  setSidebarHidden(false);
  applySidebarPosition(SIDEBAR_DEFAULT);
  saveSidebarPosition();
}

window.setSidebarPosition = value => {
  applySidebarPosition(value);
  saveSidebarPosition();
};

function setSidebarHidden(hidden) {
  petaG.classList.toggle("sidebar-hidden", hidden);
  sidebarIcon.setAttribute("aria-expanded", String(!hidden));
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
      <label class="sidebar-check" for="gridToolChoice">
        <input type="checkbox" id="gridToolChoice">
        Grid
      </label>
    </div>
  `;

  const themeChoice = petaS.querySelector("#themeChoice");
  const gridToolChoice = petaS.querySelector("#gridToolChoice");

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

sidebarIcon.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  pointerActive = true;
  pointerMoved = false;
  pointerStartX = event.clientX;
  pointerStartPosition = sidebarPosition;
  sidebarIcon.setPointerCapture(event.pointerId);
});

sidebarIcon.addEventListener("pointermove", event => {
  if (!pointerActive) return;
  const deltaX = event.clientX - pointerStartX;
  if (Math.abs(deltaX) > 3) pointerMoved = true;
  if (!pointerMoved) return;
  if (petaG.classList.contains("sidebar-hidden")) setSidebarHidden(false);

  const width = petaG.getBoundingClientRect().width;
  if (!width) return;
  applySidebarPosition(pointerStartPosition + (deltaX / width) * 100);
});

sidebarIcon.addEventListener("pointerup", event => {
  if (!pointerActive) return;
  pointerActive = false;
  if (pointerMoved) {
    suppressClick = true;
    saveSidebarPosition();
  }
  if (sidebarIcon.hasPointerCapture(event.pointerId)) {
    sidebarIcon.releasePointerCapture(event.pointerId);
  }
});

sidebarIcon.addEventListener("pointercancel", () => {
  pointerActive = false;
  if (pointerMoved) saveSidebarPosition();
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
  resetSidebarPosition();
});

sidebarIcon.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSidebar();
  }
});

buildSidebarMenu();
loadSidebarPosition();
loadSidebarVisibility();

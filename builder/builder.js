const petaG = document.querySelector("#petaG");
const petaS = document.querySelector("#petaS");
const petaP = document.querySelector("#petaP");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

const SIDEBAR_STORAGE_KEY = "entahlah.sidebar.position";
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
    const saved = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
    if (localStorage.getItem(SIDEBAR_STORAGE_KEY) !== null && Number.isFinite(saved)) {
      applySidebarPosition(saved);
      return;
    }
  } catch (error) {
    console.warn("Posisi sidebar tidak dapat dimuat:", error);
  }
  applySidebarPosition(SIDEBAR_DEFAULT);
}

function resetSidebarPosition() {
  applySidebarPosition(SIDEBAR_DEFAULT);
  saveSidebarPosition();
}

window.setSidebarPosition = value => {
  applySidebarPosition(value);
  saveSidebarPosition();
};

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
    window.GridBuilder?.toggle();
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
    window.GridBuilder?.toggle();
  }
});

loadSidebarPosition();
window.initGridBuilder?.(petaP);

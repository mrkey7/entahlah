const petaG = document.querySelector("#petaG");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

let sidebarDragging = false;
let sidebarOffsetX = 0;
let sidebarOffsetY = 0;
let sidebarPosition = { x: 1, y: 0 };

function renderSidebarPosition() {
  const maxX = Math.max(0, petaG.clientWidth - sidebarIcon.offsetWidth);
  const maxY = Math.max(0, petaG.clientHeight - sidebarIcon.offsetHeight);

  sidebarIcon.style.left = (sidebarPosition.x * maxX) + "px";
  sidebarIcon.style.top = (sidebarPosition.y * maxY) + "px";
}

async function loadSidebarPosition() {
  try {
    const response = await fetch("/builder/sidebar.json", { cache: "no-store" });
    if (!response.ok) return;

    const saved = await response.json();
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      sidebarPosition = {
        x: Math.max(0, Math.min(1, saved.x)),
        y: Math.max(0, Math.min(1, saved.y))
      };
    }
  } catch (error) {
    console.warn("Posisi sidebar belum dapat dimuat:", error);
  }

  renderSidebarPosition();
}

function moveSidebar(event) {
  if (!sidebarDragging) return;

  sidebarIcon.dataset.dragged = "1";
  const area = petaG.getBoundingClientRect();
  const maxX = Math.max(0, area.width - sidebarIcon.offsetWidth);
  const maxY = Math.max(0, area.height - sidebarIcon.offsetHeight);
  const left = Math.max(0, Math.min(maxX, event.clientX - area.left - sidebarOffsetX));
  const top = Math.max(0, Math.min(maxY, event.clientY - area.top - sidebarOffsetY));

  sidebarPosition = {
    x: maxX ? left / maxX : 0,
    y: maxY ? top / maxY : 0
  };

  renderSidebarPosition();
}

async function saveSidebarPosition() {
  try {
    const response = await fetch("/builder/sidebar.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sidebarPosition)
    });

    if (!response.ok) throw new Error("HTTP " + response.status);
  } catch (error) {
    console.error("Posisi sidebar gagal disimpan:", error);
  }
}

sidebarIcon.addEventListener("click", () => {
  if (sidebarIcon.dataset.dragged !== "1") window.GridBuilder?.toggle();
  sidebarIcon.dataset.dragged = "0";
});

sidebarIcon.addEventListener("pointerdown", event => {
  sidebarDragging = true;
  sidebarIcon.dataset.dragged = "0";
  const rect = sidebarIcon.getBoundingClientRect();
  sidebarOffsetX = event.clientX - rect.left;
  sidebarOffsetY = event.clientY - rect.top;
  sidebarIcon.setPointerCapture(event.pointerId);
  event.preventDefault();
});

sidebarIcon.addEventListener("pointermove", moveSidebar);

sidebarIcon.addEventListener("pointerup", async event => {
  if (!sidebarDragging) return;
  sidebarDragging = false;
  sidebarIcon.releasePointerCapture(event.pointerId);
  await saveSidebarPosition();
});

sidebarIcon.addEventListener("pointercancel", () => {
  sidebarDragging = false;
});

window.addEventListener("resize", renderSidebarPosition);
loadSidebarPosition();
window.initGridBuilder?.(petaG);

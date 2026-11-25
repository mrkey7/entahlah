const petaG = document.querySelector("#petaG");
const icon = petaG.querySelector(".emergency-icon");

let dragging = false;
let offsetX = 0;
let offsetY = 0;
let position = { x: 1, y: 0 };

function renderPosition() {
  const maxX = Math.max(0, petaG.clientWidth - icon.offsetWidth);
  const maxY = Math.max(0, petaG.clientHeight - icon.offsetHeight);

  icon.style.left = (position.x * maxX) + "px";
  icon.style.top = (position.y * maxY) + "px";
}

async function loadIconPosition() {
  try {
    const response = await fetch("/builder/ikon.json", { cache: "no-store" });
    if (!response.ok) return;

    const saved = await response.json();
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position = {
        x: Math.max(0, Math.min(1, saved.x)),
        y: Math.max(0, Math.min(1, saved.y))
      };
    }
  } catch (error) {
    console.warn("Posisi ikon belum dapat dimuat:", error);
  }

  renderPosition();
}

function moveIcon(event) {
  if (!dragging) return;

  const area = petaG.getBoundingClientRect();
  const maxX = Math.max(0, area.width - icon.offsetWidth);
  const maxY = Math.max(0, area.height - icon.offsetHeight);
  const left = Math.max(0, Math.min(maxX, event.clientX - area.left - offsetX));
  const top = Math.max(0, Math.min(maxY, event.clientY - area.top - offsetY));

  position = {
    x: maxX ? left / maxX : 0,
    y: maxY ? top / maxY : 0
  };

  renderPosition();
}

async function saveIconPosition() {
  try {
    const response = await fetch("/builder/ikon.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position)
    });

    if (!response.ok) throw new Error("HTTP " + response.status);
  } catch (error) {
    console.error("Posisi ikon gagal disimpan:", error);
  }
}

icon.addEventListener("pointerdown", event => {
  dragging = true;
  const rect = icon.getBoundingClientRect();
  offsetX = event.clientX - rect.left;
  offsetY = event.clientY - rect.top;
  icon.setPointerCapture(event.pointerId);
  event.preventDefault();
});

icon.addEventListener("pointermove", moveIcon);

icon.addEventListener("pointerup", async event => {
  if (!dragging) return;
  dragging = false;
  icon.releasePointerCapture(event.pointerId);
  await saveIconPosition();
});

icon.addEventListener("pointercancel", () => {
  dragging = false;
});

window.addEventListener("resize", renderPosition);
loadIconPosition();

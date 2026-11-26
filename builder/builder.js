const petaG = document.querySelector("#petaG");
const petaS = document.querySelector("#petaS");
const petaP = document.querySelector("#petaP");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

window.setSidebarPosition = value => {
  const position = Math.max(0, Math.min(100, Number(value) || 0));
  petaG.style.setProperty("--sidebar-width", position + "%");
};

sidebarIcon.addEventListener("click", () => {
  window.GridBuilder?.toggle();
});

sidebarIcon.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    window.GridBuilder?.toggle();
  }
});

window.initGridBuilder?.(petaP);

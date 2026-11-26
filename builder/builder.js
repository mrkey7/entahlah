const petaG = document.querySelector("#petaG");
const sidebarIcon = petaG.querySelector(".sidebar-icon");

sidebarIcon.addEventListener("click", () => {
  window.GridBuilder?.toggle();
});

window.initGridBuilder?.(petaG);

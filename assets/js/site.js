(() => {
  document.documentElement.classList.add("js");

  const siteUpdate = {
    iso: "2026-07-30",
    label: "30 de julio de 2026",
  };

  document.querySelectorAll("[data-site-updated]").forEach((element) => {
    element.setAttribute("datetime", siteUpdate.iso);
    element.textContent = siteUpdate.label;
  });

  const toggle = document.querySelector(".nav-toggle");
  const navigation = document.querySelector("#site-navigation");

  if (!toggle || !navigation) {
    return;
  }

  const setMenuState = (isOpen) => {
    navigation.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Cerrar menú principal" : "Abrir menú principal");
  };

  toggle.addEventListener("click", () => {
    setMenuState(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenuState(false);
      toggle.focus();
    }
  });

  const desktopMedia = window.matchMedia("(min-width: 641px)");
  const resetDesktopMenu = (event) => {
    if (event.matches) {
      setMenuState(false);
    }
  };

  if (typeof desktopMedia.addEventListener === "function") {
    desktopMedia.addEventListener("change", resetDesktopMenu);
  } else {
    desktopMedia.addListener(resetDesktopMenu);
  }
})();

/*
 * Etiqueta de Google Ads de la cuenta Google Ad Grants de la AEMCiCD (158-027-8244).
 *
 * conversions: etiquetas de las acciones de conversión creadas en Google Ads
 * ("AW-18480905412/xxxx"). Vacío = el clic no se reporta como conversión.
 * La medición nunca debe impedir que el enlace funcione.
 */
(() => {
  const GOOGLE_ADS_ID = "AW-18480905412";

  const conversions = {
    apoyarBraillelab: "AW-18480905412/CwYnCK3HkpgdEMT5sOxE",
    reportarTransferencia: "",
    participarBrailletech: "",
    contactoCorreo: "",
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);

  const conversionFor = (link) => {
    const href = link.getAttribute("href") || "";

    if (href.startsWith("mailto:")) {
      return conversions.contactoCorreo;
    }

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return "";
    }

    if (url.hostname !== "braillelab.org") {
      return "";
    }

    if (url.pathname.startsWith("/alianzas")) {
      return url.hash === "#aviso" ? conversions.reportarTransferencia : conversions.apoyarBraillelab;
    }

    if (/^\/(participar|reto|cronograma)(\/|$)/.test(url.pathname)) {
      return conversions.participarBrailletech;
    }

    return "";
  };

  // Delegado en document para cubrir también los enlaces que campaign.js crea después.
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) {
      return;
    }

    try {
      const sendTo = conversionFor(link);
      if (sendTo) {
        window.gtag("event", "conversion", { send_to: sendTo, transport_type: "beacon" });
      }
    } catch {
      // La medición es secundaria: el enlace siempre sigue su curso.
    }
  });
})();

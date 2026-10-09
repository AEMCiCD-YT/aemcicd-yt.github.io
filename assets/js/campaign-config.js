/*
 * Configuración pública de campañas (AEMCiCD-YT/aemcicd-yt.github.io#1).
 *
 * platformApiUrl: origen de la API pública de AEMCiCD Platform, por ejemplo "https://api.example.org".
 * Vacío = el sitio muestra que los datos todavía no están conectados y nunca inventa cifras.
 * Debe ser el mismo origen que usa braillelab-web (variable PLATFORM_API_URL) para mostrar el mismo corte.
 */
window.AEMCICD_CAMPAIGNS = {
  platformApiUrl: "",
  braillelab: {
    slug: "braillelab-ecuador-2027",
    site: "https://braillelab.org",
  },
};

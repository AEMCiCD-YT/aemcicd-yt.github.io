/*
 * Resumen financiero público de una campaña (AEMCiCD-YT/aemcicd-platform#20).
 *
 * Uso: <div data-campaign-summary="braillelab"> … texto de respaldo … </div>
 *
 * - Solo toma de la API los campos que muestra (DTO mínimo): nunca nombres, correos, referencias
 *   ni comprobantes.
 * - Estados distintos para sin conectar, no publicada, no disponible y desactualizada: los datos
 *   faltantes nunca se muestran como ceros.
 * - Consulta con cache "no-cache" (revalidación con ETag), igual que braillelab-web, para mostrar
 *   el mismo corte y versión.
 */
(() => {
  const config = window.AEMCICD_CAMPAIGNS || {};
  const apiBase = String(config.platformApiUrl || "").replace(/\/$/, "");
  const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
  const usd = (amount) => (amount === null || amount === undefined ? "No disponible" : money.format(Number(amount)));
  const dateTime = (iso) =>
    new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(iso));

  /** DTO mínimo: lo único que este sitio necesita de la proyección pública. */
  function toSummary(body) {
    const pick = (value) => (typeof value === "string" ? value : null);
    return {
      name: String(body.campaign?.name ?? ""),
      status: String(body.campaign?.status ?? ""),
      version: Number(body.publication?.version),
      asOf: String(body.publication?.asOf ?? ""),
      freshness: String(body.publication?.freshness ?? ""),
      goal: pick(body.goal),
      milestone: body.budget?.milestones?.[0]
        ? { target: pick(body.budget.milestones[0].target), reached: pick(body.budget.milestones[0].reachedAmount) }
        : null,
      published: body.cash !== null && body.execution !== null,
      netReceived: pick(body.cash?.netReceived),
      grossIncome: pick(body.cash?.grossIncome),
      refunds: pick(body.cash?.refunds),
      paid: pick(body.execution?.paid),
      committed: pick(body.execution?.committedPending),
      available: pick(body.execution?.available),
      inKind: pick(body.inKind?.substituted),
      pendingNeed: pick(body.pendingMonetaryNeed),
      empty: body.dataState === "empty",
    };
  }

  function element(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.append(child);
    return node;
  }

  function notice(message, alert = false) {
    return element("p", { class: alert ? "notice campaign-alert" : "notice", role: "status", text: message });
  }

  function figure(label, value, note) {
    return element("div", {}, [element("dt", { text: label }), element("dd", { text: usd(value) }), note ? element("dd", { class: "campaign-figure-note", text: note }) : null]);
  }

  function render(container, summary, detailUrl) {
    const statusLabel = { active: "activa", paused: "pausada", closed: "cerrada" }[summary.status] || summary.status;
    const parts = [
      element("p", {
        class: "campaign-meta",
        text: `Corte del ${dateTime(summary.asOf)} · versión ${summary.version} · campaña ${statusLabel}.`,
      }),
    ];
    if (summary.freshness === "stale") {
      parts.push(notice(`Datos desactualizados: se muestra el último corte publicado (${dateTime(summary.asOf)}).`, true));
    }
    if (summary.published) {
      parts.push(
        element("dl", { class: "campaign-figures" }, [
          figure("Recibido y verificado (neto)", summary.netReceived, `Bruto ${usd(summary.grossIncome)} · devoluciones ${usd(summary.refunds)}`),
          figure("Gastado (pagos verificados)", summary.paid),
          figure("Comprometido pendiente", summary.committed, "No se suma de nuevo a lo pagado."),
          figure("Aportes en especie", summary.inKind, "Costo cubierto con bienes; no es efectivo."),
          figure("Necesidad pendiente", summary.pendingNeed, `Meta ${usd(summary.goal)}`),
        ]),
      );
      if (summary.empty) parts.push(notice("Todavía no hay movimientos verificados: las cifras en cero son reales."));
    } else {
      parts.push(notice("La campaña no publica cifras de avance por ahora."));
    }
    parts.push(
      element("p", { class: "campaign-meta" }, [
        "Las mismas cifras se muestran en BrailleLab. ",
        element("a", { href: detailUrl, text: "Ver el detalle de ingresos y gastos" }),
        ".",
      ]),
    );
    container.replaceChildren(...parts);
  }

  async function load(container) {
    const campaign = config[container.dataset.campaignSummary];
    if (!campaign) return;
    const detailUrl = `${campaign.site}/transparencia/`;
    container.setAttribute("aria-busy", "true");
    if (!apiBase) {
      container.replaceChildren(
        notice("Las cifras en vivo todavía no están conectadas a la plataforma de la asociación. No mostramos montos hasta que lo estén."),
      );
      container.removeAttribute("aria-busy");
      return;
    }
    container.replaceChildren(notice("Cargando el resumen de la campaña…"));
    try {
      const response = await fetch(`${apiBase}/api/public/v1/campaigns/${encodeURIComponent(campaign.slug)}`, {
        credentials: "omit",
        cache: "no-cache",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 404 && body?.code === "CAMPAIGN_NOT_PUBLISHED") {
        container.replaceChildren(notice("La campaña aún no publica información financiera."));
      } else if (!response.ok || !body) {
        throw new Error(String(response.status));
      } else {
        render(container, toSummary(body), detailUrl);
      }
    } catch {
      const retry = element("button", { type: "button", class: "button", text: "Reintentar" });
      retry.addEventListener("click", () => load(container));
      container.replaceChildren(
        element("div", { class: "notice campaign-alert", role: "alert" }, [
          element("p", { text: "No pudimos cargar el resumen en este momento. No mostramos montos para no dar datos incorrectos." }),
          retry,
        ]),
      );
    } finally {
      container.removeAttribute("aria-busy");
    }
  }

  document.querySelectorAll("[data-campaign-summary]").forEach((container) => load(container));
})();

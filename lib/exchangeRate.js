// Obtiene la tasa USD -> COP para convertir los precios antes de crear la
// preferencia de pago. No usa ninguna clave secreta (es una API pública de
// tasas de cambio). Si la consulta en vivo falla, usa una tasa de respaldo
// fija para que el checkout no se caiga por completo.

const FALLBACK_RATE = 3150; // Red de seguridad. Actualizala cada tanto revisando "1 USD a COP".
const TIMEOUT_MS = 4000;

async function getUsdToCopRate() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const r = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!r.ok) throw new Error(`Servicio de tasas respondió ${r.status}`);

    const data = await r.json();
    const rate = data?.rates?.COP;

    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error("La tasa COP no vino válida en la respuesta");
    }

    return { rate, source: "live" };
  } catch (err) {
    console.error("[exchangeRate] Falló la tasa en vivo, uso respaldo:", err.message);
    return { rate: FALLBACK_RATE, source: "fallback" };
  }
}

module.exports = { getUsdToCopRate };

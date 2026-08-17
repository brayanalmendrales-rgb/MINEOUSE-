// POST /api/create-preference
// Recibe el carrito en USD desde la tienda, lo convierte a COP con la tasa
// del día (con respaldo si la consulta falla) y crea la preferencia de pago
// en Mercado Pago. Devuelve la URL a la que hay que mandar al cliente.

const { MercadoPagoConfig, Preference } = require("mercadopago");
const { getUsdToCopRate } = require("../lib/exchangeRate");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const { items, buyer, externalReference } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // 1. Tasa de cambio USD -> COP (en vivo, con respaldo si falla la consulta)
    const { rate } = await getUsdToCopRate();
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      return res.status(500).json({
        error: "No pudimos calcular el precio en este momento. Intentá de nuevo en unos minutos.",
      });
    }

    // 2. Convertimos cada item de USD a COP. Los precios de la tienda quedan
    // en USD en el frontend — la conversión pasa siempre acá, en el servidor.
    let itemsCop;
    try {
      itemsCop = items.map((it) => {
        const usdPrice = Number(it.price);
        if (!usdPrice || !Number.isFinite(usdPrice) || usdPrice <= 0) {
          throw new Error(`Precio inválido para "${it.name}"`);
        }
        const copPrice = Math.round(usdPrice * rate);
        if (!copPrice || copPrice <= 0) {
          throw new Error(`No se pudo convertir el precio de "${it.name}"`);
        }
        return {
          title: it.name,
          quantity: it.qty,
          unit_price: copPrice,
          currency_id: "COP",
        };
      });
    } catch (priceErr) {
      console.error("[create-preference] Error de precios:", priceErr.message);
      return res.status(400).json({ error: "No se pudo calcular el precio del pedido. Revisá el carrito e intentá de nuevo." });
    }

    // 3. Back_urls reales, dentro de este mismo proyecto (no rutas inventadas)
    const baseUrl = `https://${req.headers.host}`;
    const ref = externalReference || "";

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: itemsCop,
        payer: {
          name: buyer?.nombre || "",
          email: buyer?.email || "",
        },
        external_reference: ref,
        back_urls: {
          success: `${baseUrl}/pago-exitoso?pedido=${encodeURIComponent(ref)}`,
          failure: `${baseUrl}/pago-fallido?pedido=${encodeURIComponent(ref)}`,
          pending: `${baseUrl}/pago-pendiente?pedido=${encodeURIComponent(ref)}`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/webhook`,
      },
    });

    return res.status(200).json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      id: result.id,
    });
  } catch (err) {
    console.error("Error de Mercado Pago:", err);
    return res.status(500).json({ error: "No se pudo crear la preferencia de pago" });
  }
  } ;

// POST /api/create-preference
// Recibe el carrito desde la tienda y crea una preferencia de pago en Mercado Pago.
// Devuelve la URL a la que hay que mandar al cliente para que pague.

const { MercadoPagoConfig, Preference } = require("mercadopago");

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

    const baseUrl = `https://${req.headers.host}`;

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: items.map((it) => ({
          title: it.name,
          quantity: it.qty,
          unit_price: Number(it.price),
          currency_id: "COP", // cambiá a la moneda que uses para cobrar
        })),
        payer: {
          name: buyer?.nombre || "",
          email: buyer?.email || "",
        },
        external_reference: externalReference || "",
        back_urls: {
          success: `${baseUrl.replace("api.", "")}/?pago=exitoso`,
          failure: `${baseUrl.replace("api.", "")}/?pago=fallido`,
          pending: `${baseUrl.replace("api.", "")}/?pago=pendiente`,
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
};

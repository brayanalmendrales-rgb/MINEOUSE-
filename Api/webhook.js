// POST /api/webhook
// Mercado Pago llama esta URL cada vez que cambia el estado de un pago.
// Si el pago fue aprobado, mandamos un email al cliente y otro a vos (la tienda).

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end(); // MP a veces prueba con GET

  try {
    const paymentId = req.query["data.id"] || req.body?.data?.id;
    const type = req.query.type || req.body?.type;

    if (type !== "payment" || !paymentId) {
      return res.status(200).json({ received: true });
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await paymentRes.json();

    if (payment.status !== "approved") {
      return res.status(200).json({ received: true, status: payment.status });
    }

    const buyerEmail = payment.payer?.email || "";
    const buyerName = payment.payer?.first_name || "";
    const total = payment.transaction_amount;
    const orderId = payment.external_reference || payment.id;
    const items = (payment.additional_info?.items || [])
      .map((it) => `${it.title} × ${it.quantity}`)
      .join(", ");

    await sendEmail({
      to: process.env.STORE_OWNER_EMAIL,
      subject: `Nuevo pedido pagado — ${orderId}`,
      html: `<p><b>Pedido:</b> ${orderId}</p><p><b>Cliente:</b> ${buyerName} (${buyerEmail})</p><p><b>Productos:</b> ${items}</p><p><b>Total:</b> $${total}</p>`,
    });

    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Confirmamos tu pedido ${orderId} — Mineouse`,
        html: `<p>¡Gracias por tu compra, ${buyerName}!</p><p>Tu pedido <b>${orderId}</b> fue confirmado por un total de $${total}.</p><p>Te avisaremos por este mismo correo cuando se despache y cuando llegue a tu ciudad.</p>`,
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ received: true, error: true });
  }
};

async function sendEmail({ to, subject, html }) {
  if (!to) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.STORE_FROM_EMAIL, // ej: "Mineouse <pedidos@tudominio.com>"
      to,
      subject,
      html,
    }),
  });
  if (!r.ok) {
    console.error("Error enviando email:", await r.text());
  }
}

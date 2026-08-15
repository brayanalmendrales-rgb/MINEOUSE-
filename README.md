# Backend de Mineouse

Este es el servidor que le falta a tu tienda para cobrar de verdad con Mercado Pago
y mandar emails automáticos (a vos y al cliente) cuando se aprueba un pago.

No reemplaza el artifact de la tienda — se conecta a él. Primero desplegás esto,
después me pasás la URL final y actualizo el checkout de la tienda para que hable
con este backend en vez de simular el pago.

---

## Paso 1 — Cuenta de Mercado Pago

1. Entrá a https://www.mercadopago.com.co y creá una cuenta (si no tenés).
2. Andá a https://www.mercadopago.com.co/developers/panel/app y creá una aplicación.
3. En **Credenciales de producción**, copiá el **Access Token**. Empieza con `APP_USR-`.
   - Mientras probás, también podés usar las **credenciales de prueba** (empiezan con `TEST-`).

## Paso 2 — Cuenta de Resend (para los emails)

1. Entrá a https://resend.com y creá una cuenta gratis.
2. En **API Keys**, generá una y copiala.
3. En **Domains**, agregá tu dominio y seguí los pasos para verificarlo (agregar
   registros DNS). Sin esto, Resend no te deja mandar desde `pedidos@tudominio.com`.
   - Si todavía no tenés dominio propio, Resend te deja mandar de prueba desde
     `onboarding@resend.dev` mientras consegís uno.

## Paso 3 — Cuenta de Vercel (donde vive el backend)

1. Entrá a https://vercel.com y creá una cuenta gratis (podés entrar con GitHub).
2. Subí esta carpeta a un repositorio de GitHub (o usá `vercel` desde la terminal
   si preferís no usar GitHub — te lo explico si querés esa vía).
3. En Vercel, click en **Add New → Project** e importá el repositorio.
4. Antes de darle a "Deploy", andá a **Environment Variables** y cargá estas cuatro,
   con tus valores reales (están explicadas en `.env.example`):
   - `MP_ACCESS_TOKEN`
   - `RESEND_API_KEY`
   - `STORE_FROM_EMAIL`
   - `STORE_OWNER_EMAIL`
5. Dale a **Deploy**. En un minuto te da una URL tipo `https://mineouse-backend.vercel.app`.

## Paso 4 — Conectar el webhook en Mercado Pago

1. En el panel de tu aplicación de Mercado Pago, andá a **Webhooks**.
2. Agregá esta URL: `https://TU-PROYECTO.vercel.app/api/webhook`
3. Marcá el evento **payments**.

## Paso 5 — Avisame

Pasame la URL que te dio Vercel (`https://tu-proyecto.vercel.app`) y actualizo el
botón "Confirmar pedido" de la tienda para que, en vez de simular el pago, llame a
`/api/create-preference` y mande al cliente a pagar de verdad en Mercado Pago.

---

### Qué hace cada archivo

- `api/create-preference.js` — recibe el carrito desde la tienda y crea el link de
  pago de Mercado Pago.
- `api/webhook.js` — Mercado Pago avisa acá cuando alguien paga. Si el pago quedó
  aprobado, manda el email de confirmación al cliente y el aviso de pedido nuevo a vos.

### Sobre el WhatsApp automático

Todavía no está conectado — pedirlo en el checkout ya lo hace la tienda, pero para
mandar un mensaje automático de WhatsApp hace falta dar de alta un número de
WhatsApp Business con Meta o Twilio, que es un trámite de verificación aparte
(puede tardar días). Lo dejamos como segunda etapa una vez que esto esté funcionando.

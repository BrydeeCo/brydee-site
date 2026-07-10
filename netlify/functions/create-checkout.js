// Creates a Stripe Checkout Session from the site cart and returns its URL.
// The secret key lives only in the Netlify env var STRIPE_SECRET_KEY, never in the page.
const Stripe = require('stripe');

// All current products are $40 / box. Price is fixed server-side so it can't be
// tampered with from the browser. When products with different prices are added,
// replace this with a name->amount map (amounts in cents).
const UNIT_AMOUNT = 4000; // AUD $40.00

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Stripe key not configured' }) };
  }

  try {
    const stripe = Stripe(key);
    const { items } = JSON.parse(event.body || '{}');

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    const line_items = items.map((it) => ({
      price_data: {
        currency: 'aud',
        product_data: { name: String(it.name || 'Cookie box').slice(0, 120) },
        unit_amount: UNIT_AMOUNT,
      },
      quantity: Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1)),
    }));

    const origin = event.headers.origin || 'https://brydeeco.com.au';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['AU'] },
      phone_number_collection: { enabled: true },
      success_url: origin + '/?order=success',
      cancel_url: origin + '/?order=cancelled',
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

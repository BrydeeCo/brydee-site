// Cloudflare Pages Function: creates a Stripe Checkout Session from the cart.
// Calls Stripe's REST API directly (no npm dependency). The secret key lives
// only in the Cloudflare env var STRIPE_SECRET_KEY, never in the page.
//
// Prices are fixed server-side (never trust the browser) via a name -> cents map.
// Add a new line here whenever a new product or pack size is added to the site.
const PRICES = {
  'Choc Chip (8 Pack)': 3000,  // AUD $30.00
  'Choc Chip (12 Pack)': 4500, // AUD $45.00
  'Peanut Butter & Honey (8 Pack)': 3000,  // AUD $30.00
  'Peanut Butter & Honey (12 Pack)': 4500, // AUD $45.00
  'Sticky Date Pudding (4 Slices)': 2000,  // AUD $20.00
  'Sticky Date Pudding (8 Pieces)': 4000,  // AUD $40.00
  'Lemon Cake (4 Slices)': 2000,  // AUD $20.00
  'Lemon Cake (8 Pieces)': 4000,  // AUD $40.00
};
const DEFAULT_UNIT_AMOUNT = 4000; // AUD $40.00 — all other products (box of 10)

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const key = context.env.STRIPE_SECRET_KEY;
  if (!key) {
    return json({ error: 'Stripe key not configured' }, 500);
  }

  try {
    const { items } = await context.request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Cart is empty' }, 400);
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');

    let subtotal = 0;
    items.forEach((it, i) => {
      const name = String(it.name || 'Cookie box').slice(0, 120);
      const unit = Object.prototype.hasOwnProperty.call(PRICES, name)
        ? PRICES[name]
        : DEFAULT_UNIT_AMOUNT;
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      subtotal += unit * qty;
      params.append('line_items[' + i + '][price_data][currency]', 'aud');
      params.append('line_items[' + i + '][price_data][product_data][name]', name);
      params.append('line_items[' + i + '][price_data][unit_amount]', String(unit));
      params.append('line_items[' + i + '][quantity]', String(qty));
    });

    // Shipping: flat $10, free when the order subtotal is $100 or more.
    const freeShipping = subtotal >= 10000; // $100.00 in cents
    params.append('shipping_address_collection[allowed_countries][0]', 'AU');
    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', freeShipping ? '0' : '1000');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'aud');
    params.append('shipping_options[0][shipping_rate_data][display_name]', freeShipping ? 'Free delivery (orders over $100)' : 'Flat-rate delivery');
    params.append('phone_number_collection[enabled]', 'true');

    const origin = context.request.headers.get('origin') || 'https://brydeeco.com.au';
    // Pass the real order value + a unique order id to the success page so
    // Google Ads records the actual revenue per sale (not just a flat count).
    // Stripe substitutes {CHECKOUT_SESSION_ID} with the real session id, which
    // we use as the conversion transaction_id so a page refresh can't double-count.
    const grandTotal = subtotal + (freeShipping ? 0 : 1000); // goods + shipping, in cents
    const orderValue = (grandTotal / 100).toFixed(2);
    params.append('success_url', origin + '/?order=success&value=' + orderValue + '&cur=aud&oid={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', origin + '/?order=cancelled');

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: (data.error && data.error.message) || 'Stripe error' }, 500);
    }
    return json({ url: data.url }, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

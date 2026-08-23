# Brydee & Co — website

Static site for **Brydee & Co**, a small home bakery in Berwick, south-east Melbourne,
making gluten-free and lactose-free cookies, biscuits, cakes and puddings.
Live at **https://brydeeco.com.au**.

---

## ⚠️ Allergen wording — read before changing ANY copy

**The kitchen is a SHARED home kitchen.** Gluten and non-gluten baking both happen in it.
Ingredients are stored separately and everything is cleaned down before each gluten-free
bake, but it is **not** a dedicated gluten-free facility.

The site previously made false claims about this. They were removed in commit `0002170`.
**Do not reintroduce them.**

**NEVER write, in page copy, meta descriptions, schema/JSON-LD, alt text, or social copy:**

- "dedicated gluten-free kitchen" / "dedicated gluten-free bakery"
- "no cross-contamination"
- "no gluten on site" / "no gluten is used at all"
- "coeliac-safe", "safe for coeliacs", "coeliac-friendly"

**DO keep using "gluten free"** as the product descriptor. It is the brand, the SEO term,
and the Google Ads keyword set. It means *made to gluten-free recipes with no
gluten-containing ingredients* — not a facility guarantee.

**The standing disclaimer** (in every page footer, and on the homepage shop section):

> Made in a shared home kitchen that also handles gluten, wheat, dairy and nuts. We store
> gluten-free ingredients separately and clean down before every gluten-free bake to keep
> traces to a minimum. We can't guarantee zero traces, so we don't recommend our food for
> anyone with coeliac disease or a diagnosed food allergy.

Every mention of "coeliac" on this site should be a *warning*, never a safety claim.
Audience is people avoiding gluten by choice, sensitivity or intolerance.

Related: `/blog/dedicated-gluten-free-kitchen/` keeps its slug (for SEO) but is now an
honest transparency post, *"How We Handle Gluten in Our Shared Kitchen"*. The phrase
appears there only inside a FAQ **question** that is answered "No".

Also: use **"lactose free"**, not "dairy free", as the product claim.
(Exception: Brydee's own "gluten and dairy intolerance/diagnosis" is a real medical term
and stays as-is.)

---

## Deploying

Hosted on **Cloudflare Pages**. Push to `main` → auto-deploys in ~20 seconds.
There is no build step; the HTML is served as-is.

Verify against the edge rather than trusting local DNS (which may still point at the old
Netlify host):

```bash
curl -s --resolve brydeeco.com.au:443:104.21.39.183 https://brydeeco.com.au/ | grep -o "<title>[^<]*</title>"
```

---

## Repo layout & editing gotchas

| Path | What it is |
|---|---|
| `index.html` | Homepage. **Special — see below.** |
| `gluten-free-biscuits/`, `gluten-free-chocolate-chip-cookies/`, `gluten-free-peanut-butter-cookies/`, `dairy-free-cookies/`, `vegan-cookies/`, `gluten-free-gift-boxes/` | SEO cluster pages |
| `our-story/`, `contact/`, `delivery-returns/`, `privacy/` | E-E-A-T / trust pages |
| `blog/` | Blog index + 5 posts |
| `images/` | Product photos (`choc-chip-*`, `lemon-*`, `pb-*`, `sdp-*`, `hero-bakery`) |
| `functions/api/create-checkout.js` | Cloudflare Pages Function → Stripe Checkout |

### `index.html` is NOT hand-written HTML

It is a **JS-hydrating Design Component bundle**: essentially one enormous line, where the
page body lives inside a JS string. That means:

- Closing tags are escaped as `</div>`, not `</div>`
- Newlines inside the body are the literal two characters `\n`
- Quotes inside attributes are escaped as `\"`
- There are exactly **219 real newlines** in the file (all in `<head>`/`<script>` regions).
  If that count changes after an edit, the edit was wrong.

**Edit it with exact-string replacement** (Python `.find()` / `str.replace`), never with a
formatter, prettifier, or naive regex — reformatting will destroy the bundle.

**Escaping trap:** typing `\\u002F` or `\\n` in a script has repeatedly been corrupted in
transit. Build backslashes with `chr(92)` instead:

```python
BS = chr(92)
SLASH = BS + "u002F"   # literal /
```

A malformed edit shows up as `Bad control character in string literal in JSON` in the browser.

The cluster and blog pages are ordinary readable HTML — no such constraints.

### Preserve the `/dairy-free-cookies/` URL

The lactose-free page still lives at `/dairy-free-cookies/`. A blanket
"dairy-free" → "lactose-free" replace once silently rewrote canonical, og:url and
breadcrumb URLs and broke the page. When doing bulk copy passes, **protect URL strings
first** (swap them for a token, replace, then restore).

---

## Before you commit

- Grep the site for the banned phrases above — zero hits, excluding this file and the
  one FAQ question in `/blog/dedicated-gluten-free-kitchen/` that is answered "No":

  ```bash
  grep -rn "dedicated gluten-free kitchen\|no cross-contamination\|coeliac-safe" \
    --include="*.html" . | grep -v "blog/dedicated-gluten-free-kitchen"
  ```
- Every page needs: one `<h1>`, canonical, unique title + meta description, valid JSON-LD.
- Check `index.html` still has 219 real newlines.
- Keep the footer disclaimer present on every page.

## Weekly check

1. Site loads over HTTPS, no broken pages (`sitemap.xml` lists every live URL).
2. No banned allergen phrasing anywhere.
3. Stripe checkout still completes.
4. Google Search Console: coverage errors, and whether cluster pages are indexed.

## Current state (Aug 2026)

- **Live:** site, SSL, `hello@brydeeco.com.au`, Stripe checkout, Google Business Profile.
- **Google Ads:** Search campaign built but **paused** — awaiting a payment card, plus a
  conversion action ID. Server-side conversion data already ships (`create-checkout.js`
  passes order value + Stripe session id to the success URL); the gtag snippet is not yet
  installed and needs the real `AW-…` ID and label.
- **Council:** home-based food business registration with City of Casey in progress
  (Ref RM2881851). Describe the kitchen exactly as above — accuracy matters legally here.

# Forms and Turnstile

A site starts without a form, and a site without a form is unaffected by anything on this page: no script, no header, no request to another site. This page is for the site that adds one.

A form needs somewhere to send its data and a way to keep out bots. The template builds neither. The place is the shared Trislab form endpoint (decision D-14 of the product-ideas repository; not built yet). The way is [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/), a challenge that sets no tracking cookie. `src/components/forms/Turnstile.astro` puts its widget in a form.

## 1. The component

```astro
---
import Turnstile from "../../components/forms/Turnstile.astro";
const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY; // or a constant in src/site.config.ts
---
<form method="post" action="...">
  <!-- the fields -->
  <Turnstile siteKey={siteKey} action="contact" theme="auto" />
  <button type="submit">Send</button>
</form>
```

| Prop | Meaning |
| --- | --- |
| `siteKey` | The widget's public site key. **Optional: when it is empty the component renders nothing and loads no script**, so a page can use it before the widget exists. |
| `action` | A name for the form, shown in Cloudflare's analytics, for example `contact`. |
| `theme` | `auto` (default), `light` or `dark`. |

With a key it renders `<div class="cf-turnstile" data-sitekey="...">` and `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer>`. The script adds a hidden field `cf-turnstile-response` to the form. No page of the template uses the component.

## 2. Keys

- **The site key is public.** It is in the page, so it is not a secret and may be a `PUBLIC_` setting ([configuration.md](configuration.md)).
- **The secret key lives only on the form endpoint** that verifies the token with Cloudflare. It never goes into this repository, the build, the site's settings or `/config.json`. The endpoint rejects a submission whose token is missing, already used or invalid.
- **The widget is created by the infrastructure repository:** the resource `cloudflare_turnstile_widget`, switched on by `turnstile: true` on the product's environment in tl-cloud-infrastructure `catalog/products.yaml`. Its pull request gives the site key; the secret goes to the form endpoint.

## 3. Headers for the form page

The default Content-Security-Policy in `public/_headers` allows nothing from another site, so Turnstile is blocked until the form page's own rule allows it. The rule is for **the form page's path only**, so that no other page may load anything from Cloudflare. For example, for `/en/contact`:

```
/en/contact
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Add one rule per language path of the form page, and the form endpoint's origin to `form-action` (and to `connect-src` if a script sends the form).

How rules combine (see the comment at the top of `public/_headers`): rules with different paths that match a page **add their headers**. A page that matches both `/*` and `/en/contact` would be sent two Content-Security-Policy headers, and a browser applies both, so the stricter one wins and Turnstile stays blocked. Set the Content-Security-Policy once per path: either the form page's path is left out of the `/*` rule, or the `/*` rule keeps only the other headers and every path with a form has the full policy. Two rules with the same path do not add up: only the last counts.

## 4. What else changes

- **The privacy policy** of every language names Cloudflare as the processor of the challenge, and says that the form's data goes to the form endpoint.
- **The template's claims** are about a site without a form: "no JavaScript" and no third-party requests (`scripts/check-claims.mjs`, `scripts/check-browser.mjs`, the sustainability page and the accessibility statement). A site that adds a form with Turnstile reviews those statements and adapts the checks for the form page; the template does not do it for it.
- **Accessibility:** test the form with a keyboard and a screen reader, widget included.

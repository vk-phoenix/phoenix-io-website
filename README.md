# phoenixio.co

The Phoenix I/O LLC website. It is a static [Astro](https://astro.build) site served by Cloudflare Workers (static assets), with one small Worker route for the contact form.

## Run it locally

Requires Node 22.

```sh
npm ci
npm run dev        # http://localhost:4321, live reload
npm run build      # writes the site to dist/
npm run preview    # builds, then runs the site and contact form Worker locally with wrangler
```

For `npm run preview`, copy `.dev.vars.example` to `.dev.vars`. It holds Cloudflare's always-pass Turnstile test key; add a Resend key to send real email.

## Where things are

| Path | What it is |
| --- | --- |
| `src/pages/` | One file per page. Edit copy here. |
| `src/layouts/Base.astro` | Header, footer, page metadata |
| `src/styles/global.css` | All styles |
| `public/site.js` | Motion, menu, contact form submit |
| `public/brand/` | Logo images. The header logo is two layers so only the phoenix glows. |
| `public/_headers` | Security headers and caching |
| `worker/index.js` | `POST /api/contact`: checks Turnstile, validates, emails the inbox. Stores nothing. |
| `wrangler.jsonc` | Cloudflare Worker settings |
| `scripts/check-site.mjs` | Page checks used by CI |

### Capability statement PDF

Put the public, anonymized capability statement at `public/phoenix-io-capability-statement.pdf`. When the file is there, the Contracting page shows a Download PDF button; when it is not, the button asks visitors to request it by email instead. Client names are withheld on the site, so the public PDF should withhold them too.

## Deploying on Cloudflare

One-time setup, in this order. Steps 2 to 4 keep Google Workspace email working.

1. Create a Cloudflare account with a shared company address and turn on two-factor login. Invite a second admin.
2. **Add site** → `phoenixio.co` → Free plan. Cloudflare imports the current DNS records from GoDaddy.
3. Before changing anything at GoDaddy, check these records came across:
   - MX record(s) for Google (`smtp.google.com`, or the older `aspmx.l.google.com` set)
   - TXT `v=spf1 include:_spf.google.com ~all`
   - TXT `google._domainkey` (DKIM)
   - TXT `_dmarc` (if one exists)
   - Any `google-site-verification` TXT record
4. At GoDaddy, **Domain → Manage DNS → Nameservers → Change** to the two Cloudflare nameservers. Send a test email in and out afterwards.
5. In Cloudflare, **Workers & Pages → Create → Import a repository** → this repo. Build command `npm run build`, deploy command `npx wrangler deploy`. Every push to `main` deploys; other branches get preview URLs.
6. **Turnstile → Add widget** for `phoenixio.co`. The site key is public and lives in `src/pages/contact.astro`. Save the secret key on the Worker as the secret `TURNSTILE_SECRET` (Settings → Variables and Secrets → Add → type Secret).
7. Contact form email: create a free [Resend](https://resend.com) account, verify `phoenixio.co` there (it gives DNS records to add in Cloudflare), and save the API key as the secret `RESEND_API_KEY`. The sender is `website@phoenixio.co` and replies go to the visitor.
8. **Worker → Settings → Domains & Routes**: add `phoenixio.co` and `www.phoenixio.co`. Add a redirect rule from `www` to the bare domain.
9. **Analytics & Logs → Web Analytics**: enable for the site (no cookies, no banner needed).
10. Security settings: SSL/TLS **Full (strict)**, Always Use HTTPS, minimum TLS 1.2, DNSSEC on (add the DS record at GoDaddy), Bot Fight Mode on, and one rate-limiting rule for `/api/contact` (for example 5 requests per minute per IP). Turn on HSTS after the first stable week.
11. Lock preview URLs with Cloudflare Access (Zero Trust → Access → Applications) if drafts should stay private.

### Why Resend for the form

Cloudflare's built-in email sending from Workers needs Cloudflare Email Routing, which would replace the Google MX records. Resend sends over HTTPS without touching inbound mail. Its free tier covers far more than a contact form needs.

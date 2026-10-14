// Serves the static site and handles the contact form at POST /api/contact.
// Static files are served by Cloudflare directly; only /api/* reaches this code
// (see run_worker_first in wrangler.jsonc).

const LIMITS = { name: 120, organization: 160, email: 200, phone: 40, reason: 60, message: 5000 };
const REASONS = ['Contracting inquiry', 'Teaming opportunity', 'Other'];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Returns '' when the check passes, otherwise Cloudflare's error codes.
async function verifyTurnstile(token, ip, secret) {
  if (!token) return 'missing-input-response';
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = await res.json().catch(() => ({}));
  if (out.success === true) return '';
  const codes = (out['error-codes'] || []).join(', ') || `http-${res.status}`;
  console.error('turnstile rejected', codes);
  return codes;
}

async function sendEmail(env, f) {
  const text = [
    `Name: ${f.name}`,
    `Organization: ${f.organization || '-'}`,
    `Email: ${f.email}`,
    `Phone: ${f.phone || '-'}`,
    `Reason: ${f.reason}`,
    '',
    f.message,
  ].join('\n');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: f.email,
      subject: `Website: ${f.reason} from ${f.name}${f.organization ? `, ${f.organization}` : ''}`,
      text,
    }),
  });
  if (!res.ok) console.error('email send failed', res.status, await res.text());
  return res.ok;
}

async function handleContact(request, env) {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  let form;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'The form could not be read. Please try again.' });
  }
  const f = {};
  for (const [key, max] of Object.entries(LIMITS)) f[key] = String(form.get(key) || '').trim().slice(0, max);

  // Honeypot field: people never see it, bots fill it in. Pretend success.
  if (String(form.get('website') || '').trim()) return json(200, { ok: true });

  if (!f.name || !f.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    return json(400, { error: 'Please fill in your name, a valid email and a message.' });
  }
  if (!REASONS.includes(f.reason)) f.reason = 'Other';

  if (!env.TURNSTILE_SECRET) {
    console.error('TURNSTILE_SECRET is not set');
    return json(503, { error: 'The form is not available right now. Please email info@phoenixio.co.' });
  }
  const ip = request.headers.get('cf-connecting-ip');
  const rejected = await verifyTurnstile(String(form.get('cf-turnstile-response') || ''), ip, env.TURNSTILE_SECRET);
  if (rejected) {
    // The codes are Cloudflare's public reason names; showing them makes setup problems easy to report.
    return json(400, { error: `The spam check did not pass. Please try again. (${rejected})` });
  }
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return json(503, { error: 'The form is not available right now. Please email info@phoenixio.co.' });
  }
  if (!(await sendEmail(env, f))) {
    return json(502, { error: 'Your message could not be sent. Please email info@phoenixio.co.' });
  }
  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (url.pathname.startsWith('/api/')) return json(404, { error: 'Not found.' });
    return env.ASSETS.fetch(request);
  },
};

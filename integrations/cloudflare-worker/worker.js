/**
 * Cloudflare Worker for Blind Index visitor logging.
 *
 * Bind GOOGLE_APPS_SCRIPT_URL as an encrypted Worker secret, then point the
 * site's visit endpoint at this Worker. Cloudflare supplies IP and approximate
 * country/region/city at the edge without asking the browser for location.
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const form = await request.formData();
    const cf = request.cf || {};
    form.set('ip', request.headers.get('CF-Connecting-IP') || '');
    form.set('location', [cf.country, cf.region, cf.city].filter(Boolean).join(' / '));

    await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      body: form
    });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
};

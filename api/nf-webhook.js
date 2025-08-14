// api/nf-webhook.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  // só para debug/visualização
  if (req.method === "POST") {
    return res.status(200).json({
      ok: true,
      received_at: Date.now(),
      headers: req.headers,
      body: req.body ?? null,
    });
  }

  // GET/others -> útil para ping
  return res.status(200).json({ ok: true, method: req.method, ts: Date.now() });
}


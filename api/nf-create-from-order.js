// api/nf-create-from-order.js
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const API_BASE = process.env.SPEDY_API_BASE; // https://stage-api.spedy.com.br
  const TOKEN = process.env.SPEDY_TOKEN;       // token gerado em “Minha empresa > Credenciais da API”
  const BACKOFFICE = process.env.SPEDY_BACKOFFICE_URL || "https://stage-app.spedy.com.br";

  if (!API_BASE || !TOKEN) {
    return res.status(500).json({
      error: "Missing SPEDY_API_BASE or SPEDY_TOKEN environment variables",
    });
  }

  try {
    const input = req.body ?? {};

    // Validações mínimas (sem exigir id_empresa)
    if (!input?.type || !["nfe", "nfse"].includes(input.type)) {
      return res.status(400).json({ error: 'type deve ser "nfe" ou "nfse"' });
    }
    if (!input?.emitter?.cnpj) {
      return res.status(400).json({ error: "emitter.cnpj é obrigatório" });
    }
    if (input.type === "nfe" && (!Array.isArray(input.items) || input.items.length === 0)) {
      return res.status(400).json({ error: "items obrigatórios para NF-e" });
    }
    if (input.type === "nfse" && (!Array.isArray(input.services) || input.services.length === 0)) {
      return res.status(400).json({ error: "services obrigatórios para NFS-e" });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const webhookUrl = input?.callbacks?.webhook_url || `${proto}://${host}/api/nf-webhook`;

    const orderPayload = {
      type: input.type,                         // "nfe" | "nfse"
      order_id: input.order_id || cryptoId(),   // opcional
      emitter: input.emitter,
      buyer: input.buyer,
      items: input.type === "nfe" ? input.items : undefined,
      services: input.type === "nfse" ? input.services : undefined,
      totals: input.totals,
      fiscal_details: input.fiscal_details,
      callbacks: { webhook_url: webhookUrl },
      // NÃO incluí id_empresa (já que você não tem esse identificador)
    };

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    };

    const spedyRes = await fetch(`${API_BASE}/v1/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderPayload),
    });

    const spedyJson = await spedyRes.json().catch(() => ({}));

    if (!spedyRes.ok) {
      return res.status(502).json({
        error: "spedy_error",
        httpStatus: spedyRes.status,
        response: spedyJson,
      });
    }

    return res.status(201).json({
      ok: true,
      spedy_order_id: spedyJson?.id ?? spedyJson?.order_id,
      backoffice_link: BACKOFFICE,
      spedy_response: spedyJson,
    });
  } catch (err) {
    return res.status(500).json({
      error: "internal_error",
      details: String(err?.message || err),
    });
  }
}

function cryptoId() {
  return `fs_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

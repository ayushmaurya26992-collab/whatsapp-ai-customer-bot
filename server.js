import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "conversations.json");

const required = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "OPENAI_API_KEY"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) console.warn("Missing environment variables:", missing.join(", "));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function loadStore() {
  try { return JSON.parse(await fs.readFile(LOG_FILE, "utf8")); }
  catch { return {}; }
}
async function saveStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LOG_FILE, JSON.stringify(store, null, 2));
}
function admin(req) {
  return req.get("x-admin-key") === process.env.ADMIN_KEY;
}

app.get("/", (_req, res) => res.json({
  ok: true,
  service: "WhatsApp AI Customer Bot",
  status: "running",
  webhook: "/webhook"
}));

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  // Acknowledge Meta quickly.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages || [];

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      const from = msg.from;
      const text = msg.text?.body?.trim();
      if (!from || !text) continue;

      await handleMessage(from, text, msg.id);
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }
});

async function handleMessage(from, text, messageId) {
  const store = await loadStore();
  const history = store[from]?.messages || [];

  history.push({ role: "user", content: text, id: messageId, at: new Date().toISOString() });

  let reply = "अभी मैं जवाब देने में असमर्थ हूँ। कृपया थोड़ी देर बाद दोबारा संदेश भेजें।";

  if (openai) {
    const system = `
You are the customer-support AI for ${process.env.BUSINESS_NAME || "the business"}.
Reply naturally and helpfully in ${process.env.SYSTEM_LANGUAGE || "Hindi/Hinglish"}.
Business information:
${process.env.BUSINESS_INFO || "No business information configured."}

Rules:
- Do not invent prices, policies, availability, guarantees, order status, or personal data.
- If information is missing, clearly say a human representative can confirm it.
- Keep normal WhatsApp replies concise and easy to read.
- Never claim to have performed an action you did not perform.
- If the customer asks for a human, say you can hand the conversation to a representative.
`;

    const recent = history.slice(-12).map(x => ({ role: x.role, content: x.content }));
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...recent],
      temperature: 0.3
    });
    reply = completion.choices?.[0]?.message?.content?.trim() || reply;
  }

  history.push({ role: "assistant", content: reply, at: new Date().toISOString() });
  store[from] = { messages: history.slice(-40), updatedAt: new Date().toISOString() };
  await saveStore(store);

  await sendWhatsAppText(from, reply);
}

async function sendWhatsAppText(to, body) {
  const version = process.env.GRAPH_API_VERSION || "v23.0";
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) throw new Error("WhatsApp credentials are not configured.");

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });

  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`WhatsApp send failed: ${r.status} ${detail}`);
  }
}

// Simple protected admin API
app.get("/admin/status", (req, res) => {
  if (!admin(req)) return res.sendStatus(401);
  res.json({
    ok: true,
    whatsappConfigured: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    businessName: process.env.BUSINESS_NAME || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  });
});

app.get("/admin/conversations", async (req, res) => {
  if (!admin(req)) return res.sendStatus(401);
  const store = await loadStore();
  res.json(store);
});

app.listen(PORT, () => {
  console.log(`WhatsApp AI bot running on port ${PORT}`);
});

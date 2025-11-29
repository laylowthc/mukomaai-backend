// index.js - Mukoma.ai backend (Render-ready)
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const dotenv = require("dotenv");
const memory = require("./memory");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load persona and global prompts
const { loadPersona } = require("./personas/config/index.js");
const { GLOBAL_CORE, GLOBAL_GUARDRAILS } = require("./config/globalPrompts.js");

// Health check
app.get("/", (req, res) => {
  res.send("Mukoma.ai backend is live ✅");
});

// Main AI endpoint
app.post("/mukoma-ai", async (req, res) => {
  try {
    const { message, persona, language, userId } = req.body || {};
    console.log("[MukomaAI] Incoming:", { message, persona, language, userId });

    if (!message || typeof message !== "string") {
      console.log("[MukomaAI] Invalid message payload:", req.body);
      return res.status(400).json({
        success: false,
        error: "Invalid message payload",
      });
    }

    // Load persona and build system prompt
    const personaPrompt = loadPersona(persona);

    const systemPrompt = `
${GLOBAL_CORE}

${GLOBAL_GUARDRAILS}

${personaPrompt}

Language preference: ${language || "Shona"}
    `.trim();

    // Load recent conversation memory for this user (if any)
    const recent = memory.getRecent(userId);
    const historyMessages = recent.map((m) => ({ role: m.role, content: m.content }));

    // Build messages: system prompt, recent history, then the new user message
    const inputMessages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ];

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: inputMessages,
    });

    const reply =
      completion.output_text?.trim() ||
      "Ndati ngatiedzei zvakare, pane chakakanganisika.";

    console.log("[MukomaAI] Reply:", reply);

    // Persist the exchange to memory
    try {
      memory.addEntry(userId, 'user', message);
      memory.addEntry(userId, 'assistant', reply);
    } catch (memErr) {
      console.error('[MukomaAI] memory save error', memErr);
    }

    res.json({
      success: true,
      reply,
    });
  } catch (err) {
    console.error("[MukomaAI] ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Mukoma.ai backend error",
    });
  }
});

// Simple memory management endpoints (for debugging / control)
app.get('/memory/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const convo = memory.getConversation(userId);
    res.json({ success: true, userId, conversation: convo });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load memory' });
  }
});

app.delete('/memory/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    memory.clearMemory(userId);
    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear memory' });
  }
});

// Render port binding
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Running on ${PORT}`));

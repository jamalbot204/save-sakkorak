/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { KeyPoolManager } from "./keyPool";
import { localTimestamp, localToday } from "./datetimeUtils";

dotenv.config();

// Initialize Key Pool
KeyPoolManager.initialize();

const app = express();
const PORT = 3000;

// Enable CORS for mobile Capacitor origins and local development
app.use(cors({
  origin: [
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:1234",
    "https://ais-dev-hz5bbfhxhm2dfoyjnguqya-26768304059.europe-west2.run.app",
    "https://ais-pre-hz5bbfhxhm2dfoyjnguqya-26768304059.europe-west2.run.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Increase JSON payload size to support base64 uploading of meal/screenshot images
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Initialize Supabase Admin Client using service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// System Instructions tailored for Syrian Diabetic Patients with warm, local phrases and affordable options
const SYRIAN_DIABETES_SYSTEM_INSTRUCTION = `You are 'Sokkarak Mazboot' (سكرك مظبوط - "Your Sugar is Perfect"), a compassionate, highly professional, and empathetic AI Diabetes Assistant. Your purpose is to help diabetic Syrian patients track and manage their disease securely and with ease.

Guidelines to follow:
1. Speak primarily in warm, welcoming, and clear Syrian-flavored Arabic (لهجة شامية مبسطة ممزوجة بالفصحى). Respond in English only if the user prompts in English.
2. Be highly aware of Syrian context, economical challenges, and culinary ingredients available locally:
   - Suggest affordable, accessible local Syrian food ingredients (e.g., Bulgur برغل, lentils عدس, chickpeas حمص, olive oil زيت زيتون, local vegetables/herbs such as mint, parsley, cucumber, freekeh فريكة, labneh لبنة, zahter) instead of expensive, complex, or imported foods.
   - Reassure patients warmly with empathetic Syrian phrases like "صحتك بالدنيا", "الله يقويك", "سلامة قلبك", "إن شاء الله معافى".
3. Provide informative, educational feedback about blood sugar levels:
   - Fasting target standard is 70 - 130 mg/dL.
   - Post-meal target standard is < 180 mg/dL.
   - If levels are too low (< 70 mg/dL), guide them immediately to eat/drink fast-acting sugar (half cup of juice, spoonful of honey, sugary water) and check again in 15 minutes (Rule of 15).
   - If levels are dangerously high (> 250 mg/dL), offer calming advice, recommend hydrating with drinking water, avoiding high exertion, and contacting their direct clinician.
4. Always structure your responses beautifully with bullet points, numbered lists, and bold words for critical alerts.
5. Emphasize that you are a tracker assistant and NOT a replacement for their doctor. Always append the Arabic medical disclaimer banner at the bottom of your messages:
   "⚠️ تذكير: سكرك مظبوط هو مساعد تنظيمي ذكي لمساعدتك على تتبع حالتك، ولا يغني أبداً عن استشارة طبيبك المعالج أو أخصائي السكري في سوريا."`;

// Health check and Key Pool stats endpoint
app.get("/api/status", (req, res) => {
  try {
    const stats = KeyPoolManager.getStats();
    return res.json({
      status: "online",
      project: "Sokkarak Mazboot",
      time: localTimestamp(),
      keyPoolStats: stats
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Gemini AI Chat Proxy — client sends full chatHistory, server injects context + calls Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, chatHistory, profile, healthData } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
      return res.status(400).json({ error: "Chat history is required" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No bearer token found" });
    }

    const token = authHeader.split(" ")[1];
    let userId: string | null = null;

    try { const decoded: any = jwt.decode(token); if (decoded?.sub) userId = decoded.sub; } catch {}
    try { const { data: { user } } = await supabase.auth.getUser(token); if (user) userId = user.id; } catch {}

    if (!userId) {
      return res.status(401).json({ error: "تاريخ هويتك غير صالح أو منتهي الصلاحية. يرجى تسجيل الدخول مجددًا." });
    }

    const todayStr = localToday();
    const { data: rateProfile, error: rateErr } = await supabase
      .from("profiles").select("daily_chat_count,last_chat_date").eq("id", userId).single();

    let dailyChatCount = 0;
    let lastChatDate = todayStr;
    if (rateErr) {
      console.error("[Chat] Rate-limit fetch failed (fail-open):", rateErr);
    } else if (rateProfile) {
      dailyChatCount = rateProfile.daily_chat_count || 0;
      lastChatDate = rateProfile.last_chat_date || todayStr;
    }
    if (lastChatDate !== todayStr) { dailyChatCount = 0; lastChatDate = todayStr; }

    if (dailyChatCount >= 100) {
      return res.status(429).json({
        error: "لقد وصلت إلى الحد الأقصى للمحادثات اليومية (100 رسالة). يرجى المحاولة غدًا لتتبع حالتك بأمان وصحة ممتازة! ❤️"
      });
    }

    // Build patient context snippet from client-provided profile and health data
    const p = profile || {};
    const hd = healthData || {};
    const medsFromHealth = (hd.medications || []) as any[];
    const allReadings = (hd.glucoseReadings || []) as any[];

    let patientContextSnippet = `Patient Profile:
- Age: ${p.age || "Not specified"}
- Gender: ${p.gender || "Not specified"}
- Diabetes Type: ${p.diabetesType || "Type 2 (default)"}
- Comorbidities: ${p.comorbidities ? p.comorbidities.join(", ") : "None"}`;

    if (medsFromHealth.length > 0) {
      const medList = medsFromHealth.map((m: any) => `- ${m.name} (dosage: ${m.dosage}, frequency: ${m.frequency}, time slots: ${(m.timeSlots || []).join(",")})`).join("\n");
      patientContextSnippet += `\nMedications:\n${medList}`;
    } else {
      patientContextSnippet += `\nMedications: No active medical therapies are logged in the app yet.`;
    }

    if (allReadings.length > 0) {
      const latestReadings = allReadings.sort((a: any, b: any) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).slice(0, 5);
      const readingsList = latestReadings.map((r: any) => `- Value: ${r.value} mg/dL (${r.mealRelation}, Status: ${r.status}, time: ${r.loggedAt})`).join("\n");
      patientContextSnippet += `\nRecent Blood Sugar Readings:\n${readingsList}`;
    }

    // Transform client chatHistory into Gemini contents format
    const contents: any[] = [];
    for (const msg of chatHistory) {
      const parts: any[] = [{ text: msg.content }];
      if (msg.attachment && msg.attachment.dataUrl) {
        const rawBase64 = msg.attachment.dataUrl.split(",")[1] || msg.attachment.dataUrl;
        parts.unshift({
          inlineData: {
            mimeType: msg.attachment.mimeType || "image/png",
            data: rawBase64,
          },
        });
      }
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: parts,
      });
    }

    const assembledSystemInstructions = `${SYRIAN_DIABETES_SYSTEM_INSTRUCTION}\n\n=== RECIPIENT INFORMATION (DO NOT OUTPUT THESE DETAILS DIRECTLY UNLESS RELEVANT) ===\n${patientContextSnippet}`;

    const activeApiKey = KeyPoolManager.getActiveKey();
    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let replyText = "";
    const gemAbort = new AbortController();
    const gemTimeout = setTimeout(() => gemAbort.abort(), 70_000);
    try {
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: contents,
        config: {
          systemInstruction: assembledSystemInstructions,
          temperature: 0.35,
          topP: 0.3,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          abortSignal: gemAbort.signal,
        },
      });

      KeyPoolManager.markSuccess(activeApiKey);
      replyText = geminiResponse.text || "عذرًا، لم أستطع فهم معطيات الحالة. يرجى المحاولة بشكل أوضح.";
    } catch (gemError: any) {
      if (gemAbort.signal.aborted) {
        console.error("[Gemini] Request timed out after 70 seconds.");
        throw new Error("استغرق مساعد السكري وقتاً طويلاً جداً. يرجى المحاولة مرة أخرى.");
      }
      KeyPoolManager.markFailure(activeApiKey, gemError.status || 500, gemError.message);
      console.error("[Gemini API Error]:", gemError);
      throw gemError;
    } finally {
      clearTimeout(gemTimeout);
    }

    const now = localTimestamp();
    const modelMsgId = randomUUID();

    const modelMsg = {
      id: modelMsgId,
      role: "model",
      content: replyText,
      timestamp: now,
    };

    const fullChatHistory = [...chatHistory, modelMsg];

    // Upsert session with full chat_history JSONB — creates on first use, overwrites on subsequent
    // Retry once on failure; next message turn self-heals Supabase via full overwrite
    let syncFailed = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error } = await supabase.from("chat_sessions").upsert({
          id: sessionId,
          user_id: userId,
          status: "active",
          chat_history: fullChatHistory,
          updated_at: now,
        });
        if (!error) { syncFailed = false; break; }
        syncFailed = true;
        console.error(`[Chat] Session upsert attempt ${attempt + 1} failed:`, error);
      } catch (err) {
        syncFailed = true;
        console.error(`[Chat] Session upsert attempt ${attempt + 1} error:`, err);
      }
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    }

    // Increment rate-limit counter (same retry pattern)
    const nextChatCount = dailyChatCount + 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error } = await supabase.from("profiles").upsert({
          id: userId,
          daily_chat_count: nextChatCount,
          last_chat_date: todayStr,
          updated_at: now,
        });
        if (!error) break;
        console.error(`[Chat] Rate-limit upsert attempt ${attempt + 1} failed:`, error);
      } catch (err) {
        console.error(`[Chat] Rate-limit upsert attempt ${attempt + 1} error:`, err);
      }
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    }

    return res.json({
      content: replyText,
      messageId: modelMsgId,
      sessionId: sessionId,
      syncFailed,
    });

  } catch (error: any) {
    console.error("[Express API Error]:", error);
    return res.status(500).json({
      error: error.message || "حدث خطأ فني أثناء المعالجة الطبية للطلب. يرجى التحقق وإعادة المحاولة."
    });
  }
});

// Archive session (client handles new sessionId generation)
app.post("/api/chat/clear", async (req, res) => {
  try {
    const { sessionId, chatHistory } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No bearer token found" });
    }

    const token = authHeader.split(" ")[1];
    let userId: string | null = null;
    try { const d: any = jwt.decode(token); userId = d?.sub; } catch {}
    try { const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id; } catch {}
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const now = localTimestamp();

    await supabase.from("chat_sessions").upsert({
      id: sessionId,
      user_id: userId,
      status: "archived",
      chat_history: chatHistory || null,
      archived_at: now,
      updated_at: now,
    });

    return res.json({ sessionId });
  } catch (e: any) {
    console.error("[Chat Clear] Error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Setup Express routing with Vite Middleware in Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Sokkarak Mazboot] Full-stack Server listening on port ${PORT}`);
  });
}

startServer();

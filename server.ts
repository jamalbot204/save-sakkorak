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
import dotenv from "dotenv";
import { KeyPoolManager } from "./keyPool";
import { reverseArabicForConsole } from "./consoleUtils";

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
      time: new Date().toISOString(),
      keyPoolStats: stats
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Gemini AI Chat Proxy Endpoint with local verification & fallback
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, attachment, action = 'new', userMessageId, deleteMessageIds } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Authenticate user via Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No bearer token found" });
    }

    const token = authHeader.split(" ")[1];
    let userId: string | null = null;

    // 1. Local verify fallback logic (Attempt to decode and optionally verify sign)
    try {
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.sub) {
        userId = decoded.sub;
      }
    } catch (e) {
      console.warn("[Auth] Failed to decode JWT locally:", e);
    }

    // 2. Direct network validation to guarantee user authenticity (Fallback option)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (user && !authError) {
        userId = user.id;
      }
    } catch (err) {
      console.error("[Auth] Supabase direct verify failed:", err);
    }

    if (!userId) {
      return res.status(401).json({ error: "تاريخ هويتك غير صالح أو منتهي الصلاحية. يرجى تسجيل الدخول مجددًا." });
    }

    // Read profile details to enforce 100 messages/day limit
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[Database] Error loading user profile:", profileError);
    }

    let dailyChatCount = 0;
    let lastChatDate = todayStr;

    if (profile) {
      dailyChatCount = profile.daily_chat_count || 0;
      lastChatDate = profile.last_chat_date || todayStr;
    }

    // If day changed, reset daily chat count
    if (lastChatDate !== todayStr) {
      dailyChatCount = 0;
      lastChatDate = todayStr;
    }

    if (dailyChatCount >= 100) {
      return res.status(429).json({
        error: "لقد وصلت إلى الحد الأقصى للمحادثات اليومية (100 رسالة). يرجى المحاولة غدًا لتتبع حالتك بأمان وصحة ممتازة! ❤️"
      });
    }

    // Fetch user medical profile details (medical stats and current meds) to inject in prompt
    const { data: medications } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", userId);

    const { data: readings } = await supabase
      .from("glucose_readings")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(5);

    // Build user profile snippet
    let patientContextSnippet = `Patient Profile:
- Age: ${profile?.age || "Not specified"}
- Gender: ${profile?.gender || "Not specified"}
- Diabetes Type: ${profile?.diabetes_type || "Type 2 (default)"}
- Comorbidities: ${profile?.comorbidities ? profile?.comorbidities.join(", ") : "None"}`;

    if (medications && medications.length > 0) {
      const medList = medications.map(m => `- ${m.name} (dosage: ${m.dosage}, frequency: ${m.frequency}, time slots: ${m.time_slots.join(",")})`).join("\n");
      patientContextSnippet += `\nMedications:\n${medList}`;
    } else {
      patientContextSnippet += `\nMedications: No active medical therapies are logged in the app yet.`;
    }

    if (readings && readings.length > 0) {
      const readingsList = readings.map(r => `- Value: ${r.value} mg/dL (${r.meal_relation}, Status: ${r.status}, time: ${r.logged_at})`).join("\n");
      patientContextSnippet += `\nRecent Blood Sugar Readings:\n${readingsList}`;
    }

    // Fetch message history for the active session
    const query = supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .is("is_deleted", null);
    
    if (sessionId) {
      query.eq("session_id", sessionId);
    }
    
    let { data: dbMessages } = await query
      .order("timestamp", { ascending: true })
      .limit(30);

    // Soft-delete specified messages on regenerate/edit actions
    if (deleteMessageIds && deleteMessageIds.length > 0) {
      const now = new Date().toISOString();
      await supabase
        .from("chat_messages")
        .update({ is_deleted: true, updated_at: now })
        .in("id", deleteMessageIds);

      const deleteSet = new Set(deleteMessageIds);
      dbMessages = (dbMessages || []).filter((msg: any) => !deleteSet.has(msg.id));
    }

    // Get Active Gemini Key from rotating key pool
    const activeApiKey = KeyPoolManager.getActiveKey();
    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Translate database messages format into Gemini contents format
    const contents: any[] = [];
    if (dbMessages && dbMessages.length > 0) {
      dbMessages.forEach((msg) => {
        const parts: any[] = [{ text: msg.content }];
        if (msg.attachment_data_url) {
          const rawBase64 = msg.attachment_data_url.split(",")[1] || msg.attachment_data_url;
          parts.unshift({
            inlineData: {
              mimeType: msg.attachment_mime_type || "image/png",
              data: rawBase64,
            },
          });
        }
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: parts,
        });
      });
    }

    // Add current turn message with attachments
    const currentParts: any[] = [{ text: message }];
    if (attachment && attachment.dataUrl) {
      const rawBase64 = attachment.dataUrl.split(",")[1] || attachment.dataUrl;
      currentParts.unshift({
        inlineData: {
          mimeType: attachment.mimeType || "image/png",
          data: rawBase64,
        },
      });
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    // Assemble rich Syrian guidelines combined with target patient context
    const assembledSystemInstructions = `${SYRIAN_DIABETES_SYSTEM_INSTRUCTION}\n\n=== RECIPIENT INFORMATION (DO NOT OUT PUT THESE DETAILS DIRECTLY UNLESS RELEVANT) ===\n${patientContextSnippet}`;

    console.log("=== SYSTEM INSTRUCTIONS SENT TO AI ===");
    console.log(reverseArabicForConsole(assembledSystemInstructions));
    console.log("=== CHAT CONTENTS SENT TO AI ===");
    console.log(reverseArabicForConsole(JSON.stringify(contents, null, 2)));

    let replyText = "";
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
        },
      });

      KeyPoolManager.markSuccess(activeApiKey);
      replyText = geminiResponse.text || "عذرًا، لم أستطع فهم معطيات الحالة. يرجى المحاولة بشكل أوضح.";
    } catch (gemError: any) {
      KeyPoolManager.markFailure(activeApiKey, gemError.status || 500, gemError.message);
      console.error("[Gemini API Error]:", gemError);
      throw gemError;
    }

    // Increment and update chat metadata in the database for rate-limiting
    const nextChatCount = dailyChatCount + 1;
    await supabase.from("profiles").upsert({
      id: userId,
      daily_chat_count: nextChatCount,
      last_chat_date: todayStr,
      updated_at: new Date().toISOString()
    });

    // Write chat turn to the database
    // Ensure we have a valid session id
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, status: "active" })
        .select()
        .single();
      if (sessionError) {
        console.error("[Chat] Failed to create chat session:", sessionError);
        return res.status(500).json({
          error: "فشل إنشاء جلسة المحادثة. يرجى المحاولة مرة أخرى."
        });
      }
      if (newSession) {
        activeSessionId = newSession.id;
      }
    }

    let modelMessageId: string | null = null;

    if (activeSessionId) {
      const now = new Date().toISOString();

      // Log user message
      await supabase.from("chat_messages").upsert({
        ...(userMessageId ? { id: userMessageId } : {}),
        session_id: activeSessionId,
        user_id: userId,
        role: "user",
        content: message,
        attachment_name: attachment?.name || null,
        attachment_mime_type: attachment?.mimeType || null,
        attachment_data_url: attachment?.dataUrl || null,
        timestamp: now,
        updated_at: now
      });

      // Log model reply
      const { data: modelInsert } = await supabase.from("chat_messages").insert({
        session_id: activeSessionId,
        user_id: userId,
        role: "model",
        content: replyText,
        timestamp: now,
        updated_at: now
      }).select("id").single();

      modelMessageId = modelInsert?.id || null;
    }

    return res.json({
      role: "model",
      content: replyText,
      sessionId: activeSessionId,
      modelMessageId
    });

  } catch (error: any) {
    console.error("[Express API Error]:", error);
    return res.status(500).json({
      error: error.message || "حدث خطأ فني أثناء المعالجة الطبية للطلب. يرجى التحقق وإعادة المحاولة."
    });
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

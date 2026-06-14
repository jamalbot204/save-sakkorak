/**
 * Supabase Chat Exporter — fetches all chat sessions for a given user
 * and writes them to a formatted Markdown file.
 *
 * Usage:   node export-chats.cjs <userId>
 * Example: node export-chats.cjs abc123-def456
 * Output:  exported-chats-<userId>.md
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const USER_ID = process.argv[2];

if (!USER_ID) {
  console.error("Missing user ID. Usage: node export-chats.cjs <userId>");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function formatArabicTimestamp(timestamp) {
  if (!timestamp) return "?";
  try {
    const d = new Date(timestamp);
    return d.toLocaleString("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return timestamp;
  }
}

function buildMd(sessions) {
  const lines = [];

  lines.push(`# سجل محادثات المستخدم: \`${USER_ID}\``);
  lines.push("");
  lines.push(`**عدد الجلسات:** ${sessions.length}`);
  lines.push(`**تاريخ التصدير:** ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const session of sessions) {
    const history = session.chat_history || [];
    lines.push(`## جلسة: \`${session.id}\``);
    lines.push(`- **الحالة:** ${session.status || "?"}`);
    lines.push(`- **آخر تحديث:** ${formatArabicTimestamp(session.updated_at)}`);
    lines.push(`- **عدد الرسائل:** ${history.length}`);
    lines.push("");

    for (const msg of history) {
      const roleLabel = msg.role === "user" ? "👤 المستخدم" : "🤖 المساعد";
      const timeStr = formatArabicTimestamp(msg.timestamp);
      lines.push(`### ${roleLabel} _(${timeStr})_`);
      lines.push("");

      if (msg.role === "model" && msg.thought) {
        lines.push("<details>");
        lines.push("<summary>🧠 سلسلة التفكير</summary>");
        lines.push("");
        lines.push("```");
        lines.push(msg.thought);
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }

      lines.push(msg.content || "(رسالة فارغة)");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  console.log(`Fetching chats for user: ${USER_ID}...`);

  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase query failed:", error.message);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log("No chat sessions found for this user.");
    // Still write a file with empty info
  }

  const md = buildMd(sessions || []);
  const fileName = `exported-chats-${USER_ID}.md`;

  require("fs").writeFileSync(fileName, md, "utf-8");
  console.log(`Done. ${(sessions || []).length} sessions written to ${fileName}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

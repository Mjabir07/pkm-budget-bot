const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = {
  food: "Food", breakfast: "Food", lunch: "Food", dinner: "Food",
  shawarma: "Food", broast: "Food", grill: "Food", burger: "Food",
  transport: "Transport", metro: "Transport", taxi: "Transport", uber: "Transport", bus: "Transport",
  grocery: "Grocery", supermarket: "Grocery", nesto: "Grocery", lulu: "Grocery",
  rent: "Rent",
  shopping: "Shopping", tamara: "Shopping", clothes: "Shopping",
  snacks: "Snacks", biscuit: "Snacks", chips: "Snacks",
  icecream: "Dessert", ice: "Dessert", dessert: "Dessert", chocolate: "Dessert", sprinkles: "Dessert",
  coffee: "Food", tea: "Food",
};

function guessCategory(desc) {
  const lower = desc.toLowerCase().replace(/[^a-z]/g, "");
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(key)) return cat;
  }
  return "Other";
}

function formatAED(n) { return `AED ${Number(n).toFixed(2)}`; }
function todayDate() { return new Date().toISOString().split("T")[0]; }
function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const CAT_ICONS = {
  Food: "🍽️", Transport: "🚇", Grocery: "🛒", Rent: "🏠",
  Shopping: "🛍️", Snacks: "🍿", Dessert: "🍦", Other: "💰"
};

async function sendLong(chatId, msg) {
  if (msg.length <= 4000) return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
  const lines = msg.split("\n");
  let chunk = "";
  for (const line of lines) {
    if ((chunk + line + "\n").length > 3800) {
      await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
      chunk = "";
    }
    chunk += line + "\n";
  }
  if (chunk.trim()) await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;
  const lower = text.toLowerCase();

  if (lower === "/start" || lower === "/help") {
    return bot.sendMessage(chatId, `👋 *PKM Budget Tracker*\n\n*➕ Add expense:*\n\`Lunch 15\`\n\`Metro 6\`\n\`Nesto 87 Grocery\`\n\n*📊 Commands:*\n• \`today\` — today\n• \`yesterday\` — yesterday\n• \`week\` — last 7 days\n• \`month\` — this month\n• \`all\` — every expense ever\n• \`report\` — full summary\n• \`total\` — grand total\n• \`list\` — last 10\n• \`cats\` — by category\n• \`delete 5\` — delete #5`, { parse_mode: "Markdown" });
  }

  if (lower.startsWith("delete ") || lower.startsWith("del ")) {
    const id = parseInt(text.split(" ")[1]);
    if (isNaN(id)) return bot.sendMessage(chatId, "❌ Usage: `delete 123`", { parse_mode: "Markdown" });
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    return bot.sendMessage(chatId, `🗑️ Expense #${id} deleted.`);
  }

  if (lower === "today") {
    const { data, error } = await supabase.from("expenses").select("*").eq("date", todayDate()).order("created_at");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses today yet.\n\nTry: `Lunch 15`", { parse_mode: "Markdown" });
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `📅 *Today — ${formatDate(todayDate())}*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}* _[${e.category}]_ \`#${e.id}\`\n`; });
    m += `\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (lower === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const date = d.toISOString().split("T")[0];
    const { data, error } = await supabase.from("expenses").select("*").eq("date", date).order("created_at");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yesterday.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `📅 *Yesterday — ${formatDate(date)}*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}* _[${e.category}]_ \`#${e.id}\`\n`; });
    m += `\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (lower === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    const from = d.toISOString().split("T")[0];
    const { data, error } = await supabase.from("expenses").select("*").gte("date", from).order("date", { ascending: false });
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses this week.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byDate = {};
    data.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + e.amount; });
    let m = `📊 *Last 7 Days*\n\n`;
    Object.entries(byDate).sort((a,b) => new Date(b[0]) - new Date(a[0])).forEach(([d, amt]) => {
      m += `📅 ${formatDate(d)} — ${formatAED(amt)}\n`;
    });
    m += `\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (lower === "month") {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data, error } = await supabase.from("expenses").select("*").gte("date", from).order("date", { ascending: false });
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses this month.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byDate = {};
    data.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    let m = `📅 *${now.toLocaleString("en-GB", { month: "long", year: "numeric" })}*\n\n`;
    for (const [date, items] of Object.entries(byDate).sort((a,b) => new Date(b[0]) - new Date(a[0]))) {
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);
      m += `📆 *${formatDate(date)}* — ${formatAED(dayTotal)}\n`;
      items.forEach(e => { m += `  ${CAT_ICONS[e.category] || "💰"} ${e.description} — ${formatAED(e.amount)} \`#${e.id}\`\n`; });
      m += `\n`;
    }
    m += `💰 *Total: ${formatAED(total)}* | 📝 ${data.length} transactions`;
    return sendLong(chatId, m);
  }

  if (lower === "all") {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byDate = {};
    data.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    let m = `📋 *All Expenses*\n\n`;
    for (const [date, items] of Object.entries(byDate).sort((a,b) => new Date(b[0]) - new Date(a[0]))) {
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);
      m += `📆 *${formatDate(date)}* — ${formatAED(dayTotal)}\n`;
      items.forEach(e => { m += `  ${CAT_ICONS[e.category] || "💰"} ${e.description} — ${formatAED(e.amount)} \`#${e.id}\`\n`; });
      m += `\n`;
    }
    m += `💰 *Grand Total: ${formatAED(total)}* | 📝 ${data.length} transactions`;
    return sendLong(chatId, m);
  }

  if (lower === "total") {
    const { data, error } = await supabase.from("expenses").select("amount, date");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    const total = data.reduce((s, e) => s + e.amount, 0);
    const days = new Set(data.map(e => e.date)).size;
    return bot.sendMessage(chatId, `💰 *Grand Total: ${formatAED(total)}*\n📝 ${data.length} transactions\n📅 ${days} days tracked`, { parse_mode: "Markdown" });
  }

  if (lower === "list") {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    let m = `📋 *Last 10 Expenses*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)} _${formatDate(e.date)}_ \`#${e.id}\`\n`; });
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (lower === "cats" || lower === "categories") {
    const { data, error } = await supabase.from("expenses").select("category, amount");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    const map = {};
    data.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `🏷️ *By Category*\n\n`;
    sorted.forEach(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      const bar = "▓".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
      m += `${CAT_ICONS[cat] || "💰"} *${cat}*\n${bar} ${pct}%\n${formatAED(amt)}\n\n`;
    });
    m += `💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  if (lower === "report") {
    const { data, error } = await supabase.from("expenses").select("*");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    data.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const byDate = {};
    data.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + e.amount; });
    const days = Object.keys(byDate).length;
    const maxDay = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0];
    let m = `📊 *Full Report*\n━━━━━━━━━━━━━━━━\n\n`;
    m += `💰 *Grand Total: ${formatAED(total)}*\n`;
    m += `📝 ${data.length} transactions\n`;
    m += `📅 ${days} days tracked\n`;
    m += `📈 Avg/day: ${formatAED(total / days)}\n`;
    m += `🔥 Most spent: ${formatDate(maxDay[0])} — ${formatAED(maxDay[1])}\n\n`;
    m += `🏷️ *By Category:*\n━━━━━━━━━━━━━━━━\n`;
    sorted.forEach(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      m += `${CAT_ICONS[cat] || "💰"} *${cat}*: ${formatAED(amt)} _(${pct}%)_\n`;
    });
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  const match = text.match(/^(.+?)\s+([\d.]+)\s*([a-zA-Z]*)$/);
  if (match) {
    const description = match[1].trim();
    const amount = parseFloat(match[2]);
    const catRaw = match[3]?.trim();
    if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ Invalid amount. Try: `Lunch 15`", { parse_mode: "Markdown" });
    const category = catRaw
      ? (Object.values(CATEGORIES).includes(catRaw.charAt(0).toUpperCase() + catRaw.slice(1).toLowerCase())
        ? catRaw.charAt(0).toUpperCase() + catRaw.slice(1).toLowerCase()
        : guessCategory(catRaw) !== "Other" ? guessCategory(catRaw) : guessCategory(description))
      : guessCategory(description);
    const { data, error } = await supabase.from("expenses").insert([{ date: todayDate(), description, amount, category }]).select().single();
    if (error) return bot.sendMessage(chatId, `❌ Error saving: ${error.message}`);
    return bot.sendMessage(chatId, `✅ *Saved!*\n\n${CAT_ICONS[category] || "💰"} ${description}\n💵 ${formatAED(amount)}\n🏷️ ${category}\n📅 Today\n\n_Type \`today\` to see all today's expenses_`, { parse_mode: "Markdown" });
  }

  bot.sendMessage(chatId, `❓ I didn't understand that.\n\nTry:\n• \`Lunch 15\` to add expense\n• \`today\` to see today\n• \`all\` to see everything\n• \`report\` for full summary\n• \`/help\` for all commands`, { parse_mode: "Markdown" });
});

console.log("🤖 PKM Budget Bot is running...");

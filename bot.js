const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CATEGORIES & KEYWORDS ────────────────────────────────
const CATEGORIES = {
  // Food & Dining
  food: "Food & Dining", lunch: "Food & Dining", dinner: "Food & Dining",
  breakfast: "Food & Dining", shawarma: "Food & Dining", broast: "Food & Dining",
  grill: "Food & Dining", burger: "Food & Dining", pizza: "Food & Dining",
  biryani: "Food & Dining", rice: "Food & Dining", chicken: "Food & Dining",
  restaurant: "Food & Dining", cafe: "Food & Dining", coffee: "Food & Dining",
  tea: "Food & Dining", juice: "Food & Dining", outside: "Food & Dining",

  // Transport
  metro: "Transport", taxi: "Transport", uber: "Transport", careem: "Transport",
  bus: "Transport", transport: "Transport", fuel: "Transport", petrol: "Transport",
  parking: "Transport", toll: "Transport", salik: "Transport",

  // Grocery & Supermarket
  grocery: "Grocery & Supermarket", nesto: "Grocery & Supermarket",
  lulu: "Grocery & Supermarket", carrefour: "Grocery & Supermarket",
  spinneys: "Grocery & Supermarket", supermarket: "Grocery & Supermarket",
  vegetables: "Grocery & Supermarket", fruits: "Grocery & Supermarket",
  market: "Grocery & Supermarket", baqala: "Grocery & Supermarket",

  // Rent & Housing
  rent: "Rent & Housing", electricity: "Rent & Housing", dewa: "Rent & Housing",
  water: "Rent & Housing", internet: "Rent & Housing", wifi: "Rent & Housing",
  maintenance: "Rent & Housing", housing: "Rent & Housing",

  // Shopping & Clothes
  shopping: "Shopping & Clothes", tamara: "Shopping & Clothes",
  clothes: "Shopping & Clothes", shirt: "Shopping & Clothes",
  shoes: "Shopping & Clothes", amazon: "Shopping & Clothes",
  noon: "Shopping & Clothes", mall: "Shopping & Clothes",

  // Fashion
  fashion: "Fashion", watch: "Fashion", bag: "Fashion", wallet: "Fashion",
  perfume: "Fashion", accessories: "Fashion", sunglasses: "Fashion",
  belt: "Fashion", cap: "Fashion",

  // Cosmetics
  cosmetics: "Cosmetics", skincare: "Cosmetics", haircut: "Cosmetics",
  salon: "Cosmetics", barber: "Cosmetics", shampoo: "Cosmetics",
  cream: "Cosmetics", makeup: "Cosmetics", lotion: "Cosmetics",

  // Snacks & Beverages
  snacks: "Snacks & Beverages", biscuit: "Snacks & Beverages",
  chips: "Snacks & Beverages", water: "Snacks & Beverages",
  drink: "Snacks & Beverages", energy: "Snacks & Beverages",
  pepsi: "Snacks & Beverages", coke: "Snacks & Beverages",
  redbull: "Snacks & Beverages", sandwich: "Snacks & Beverages",
  peanut: "Snacks & Beverages", popcorn: "Snacks & Beverages",

  // Dessert & Sweets
  icecream: "Dessert & Sweets", ice: "Dessert & Sweets",
  dessert: "Dessert & Sweets", chocolate: "Dessert & Sweets",
  sprinkles: "Dessert & Sweets", cake: "Dessert & Sweets",
  sweet: "Dessert & Sweets", candy: "Dessert & Sweets",
  kunafa: "Dessert & Sweets", baklava: "Dessert & Sweets",

  // Health & Medical
  health: "Health & Medical", medical: "Health & Medical",
  doctor: "Health & Medical", pharmacy: "Health & Medical",
  medicine: "Health & Medical", tablet: "Health & Medical",
  hospital: "Health & Medical", clinic: "Health & Medical",
  vitamin: "Health & Medical", gym: "Health & Medical",

  // Entertainment
  entertainment: "Entertainment", movie: "Entertainment",
  cinema: "Entertainment", netflix: "Entertainment",
  spotify: "Entertainment", game: "Entertainment",
  bowling: "Entertainment", park: "Entertainment",
  ticket: "Entertainment", event: "Entertainment",

  // Family & Kids
  family: "Family & Kids", kids: "Family & Kids",
  baby: "Family & Kids", school: "Family & Kids",
  toys: "Family & Kids", diapers: "Family & Kids",
  hawwa: "Family & Kids", milk: "Family & Kids",
  formula: "Family & Kids", stroller: "Family & Kids",
};

// ─── CATEGORY ICONS ───────────────────────────────────────
const CAT_ICONS = {
  "Food & Dining": "🍽️",
  "Transport": "🚇",
  "Grocery & Supermarket": "🛒",
  "Rent & Housing": "🏠",
  "Shopping & Clothes": "🛍️",
  "Fashion": "👔",
  "Cosmetics": "💄",
  "Snacks & Beverages": "🍿",
  "Dessert & Sweets": "🍦",
  "Health & Medical": "💊",
  "Entertainment": "🎬",
  "Family & Kids": "👨‍👩‍👧",
  "Others": "💰",
};

// ─── ALL VALID CATEGORIES LIST ────────────────────────────
const VALID_CATEGORIES = Object.values(CAT_ICONS);

function guessCategory(desc) {
  const lower = desc.toLowerCase().replace(/[^a-z]/g, "");
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(key)) return cat;
  }
  return "Others";
}

function formatAED(n) { return `AED ${Number(n).toFixed(2)}`; }
function todayDate() { return new Date().toISOString().split("T")[0]; }
function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// ─── SEND LONG MESSAGE IN CHUNKS ──────────────────────────
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

// ─── MESSAGE HANDLER ──────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;
  const lower = text.toLowerCase();

  // ── HELP ──────────────────────────────────────────────
  if (lower === "/start" || lower === "/help") {
    return bot.sendMessage(chatId, `
👋 *PKM Budget Tracker*
_Your personal expense manager_

━━━━━━━━━━━━━━━━━━━━━━

*➕ Add an expense:*
\`Description Amount\`
\`Description Amount Category\`

*Examples:*
• \`Lunch 25\`
• \`Metro 6\`
• \`Nesto 87 Grocery & Supermarket\`
• \`Gym 150 Health & Medical\`

━━━━━━━━━━━━━━━━━━━━━━

*📊 View commands:*
• \`today\` — today's expenses
• \`yesterday\` — yesterday
• \`week\` — last 7 days
• \`month\` — this month
• \`all\` — every expense ever
• \`report\` — full summary & stats
• \`total\` — grand total
• \`list\` — last 10 entries
• \`cats\` — by category
• \`delete 5\` — delete entry #5

━━━━━━━━━━━━━━━━━━━━━━

*🏷️ Your categories:*
🍽️ Food & Dining
🚇 Transport
🛒 Grocery & Supermarket
🏠 Rent & Housing
🛍️ Shopping & Clothes
👔 Fashion
💄 Cosmetics
🍿 Snacks & Beverages
🍦 Dessert & Sweets
💊 Health & Medical
🎬 Entertainment
👨‍👩‍👧 Family & Kids
💰 Others
    `, { parse_mode: "Markdown" });
  }

  // ── CATEGORIES LIST ───────────────────────────────────
  if (lower === "categories" || lower === "cats list") {
    let m = `🏷️ *Your Categories*\n\n`;
    Object.entries(CAT_ICONS).forEach(([cat, icon]) => { m += `${icon} ${cat}\n`; });
    m += `\n_Type category name when adding expense_\n_Example: \`Gym 150 Health & Medical\`_`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── DELETE ────────────────────────────────────────────
  if (lower.startsWith("delete ") || lower.startsWith("del ")) {
    const id = parseInt(text.split(" ")[1]);
    if (isNaN(id)) return bot.sendMessage(chatId, "❌ Usage: `delete 5`", { parse_mode: "Markdown" });
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    return bot.sendMessage(chatId, `🗑️ Expense #${id} deleted.`);
  }

  // ── TODAY ─────────────────────────────────────────────
  if (lower === "today") {
    const { data, error } = await supabase.from("expenses").select("*").eq("date", todayDate()).order("created_at");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses today yet.\n\nTry: `Lunch 25`", { parse_mode: "Markdown" });
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `📅 *Today — ${formatDate(todayDate())}*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}*\n_${e.category}_ \`#${e.id}\`\n\n`; });
    m += `━━━━━━━━━━━━━━━━\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── YESTERDAY ─────────────────────────────────────────
  if (lower === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const date = d.toISOString().split("T")[0];
    const { data, error } = await supabase.from("expenses").select("*").eq("date", date).order("created_at");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yesterday.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `📅 *Yesterday — ${formatDate(date)}*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}*\n_${e.category}_ \`#${e.id}\`\n\n`; });
    m += `━━━━━━━━━━━━━━━━\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── WEEK ──────────────────────────────────────────────
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
    Object.entries(byDate).sort((a, b) => new Date(b[0]) - new Date(a[0])).forEach(([d, amt]) => {
      m += `📅 ${formatDate(d)} — *${formatAED(amt)}*\n`;
    });
    m += `\n━━━━━━━━━━━━━━━━\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── MONTH ─────────────────────────────────────────────
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
    for (const [date, items] of Object.entries(byDate).sort((a, b) => new Date(b[0]) - new Date(a[0]))) {
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);
      m += `📆 *${formatDate(date)}* — ${formatAED(dayTotal)}\n`;
      items.forEach(e => { m += `  ${CAT_ICONS[e.category] || "💰"} ${e.description} — ${formatAED(e.amount)} \`#${e.id}\`\n`; });
      m += `\n`;
    }
    m += `━━━━━━━━━━━━━━━━\n💰 *Total: ${formatAED(total)}* | 📝 ${data.length} transactions`;
    return sendLong(chatId, m);
  }

  // ── ALL ───────────────────────────────────────────────
  if (lower === "all") {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.\n\nStart by typing: `Lunch 25`", { parse_mode: "Markdown" });
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byDate = {};
    data.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    let m = `📋 *All Expenses*\n\n`;
    for (const [date, items] of Object.entries(byDate).sort((a, b) => new Date(b[0]) - new Date(a[0]))) {
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);
      m += `📆 *${formatDate(date)}* — ${formatAED(dayTotal)}\n`;
      items.forEach(e => { m += `  ${CAT_ICONS[e.category] || "💰"} ${e.description} — ${formatAED(e.amount)} \`#${e.id}\`\n`; });
      m += `\n`;
    }
    m += `━━━━━━━━━━━━━━━━\n💰 *Grand Total: ${formatAED(total)}* | 📝 ${data.length} transactions`;
    return sendLong(chatId, m);
  }

  // ── TOTAL ─────────────────────────────────────────────
  if (lower === "total") {
    const { data, error } = await supabase.from("expenses").select("amount, date");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    const total = data.reduce((s, e) => s + e.amount, 0);
    const days = new Set(data.map(e => e.date)).size;
    return bot.sendMessage(chatId,
      `💰 *Grand Total: ${formatAED(total)}*\n📝 ${data.length} transactions\n📅 ${days} days tracked`,
      { parse_mode: "Markdown" });
  }

  // ── LIST ──────────────────────────────────────────────
  if (lower === "list") {
    const { data, error } = await supabase.from("expenses").select("*")
      .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    let m = `📋 *Last 10 Expenses*\n\n`;
    data.forEach(e => { m += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)}\n_${e.category} | ${formatDate(e.date)}_ \`#${e.id}\`\n\n`; });
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── CATS ──────────────────────────────────────────────
  if (lower === "cats") {
    const { data, error } = await supabase.from("expenses").select("category, amount");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
    const map = {};
    data.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `🏷️ *Spending by Category*\n\n`;
    sorted.forEach(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      const filled = Math.round(pct / 5);
      const bar = "▓".repeat(filled) + "░".repeat(20 - filled);
      m += `${CAT_ICONS[cat] || "💰"} *${cat}*\n${bar} ${pct}%\n${formatAED(amt)}\n\n`;
    });
    m += `━━━━━━━━━━━━━━━━\n💰 *Total: ${formatAED(total)}*`;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── REPORT ────────────────────────────────────────────
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
    const minDay = Object.entries(byDate).sort((a, b) => a[1] - b[1])[0];
    let m = `📊 *Full Report*\n━━━━━━━━━━━━━━━━\n\n`;
    m += `💰 *Grand Total: ${formatAED(total)}*\n`;
    m += `📝 ${data.length} transactions\n`;
    m += `📅 ${days} days tracked\n`;
    m += `📈 Avg/day: ${formatAED(total / days)}\n`;
    m += `🔥 Most spent: ${formatDate(maxDay[0])} — ${formatAED(maxDay[1])}\n`;
    m += `✅ Least spent: ${formatDate(minDay[0])} — ${formatAED(minDay[1])}\n\n`;
    m += `🏷️ *By Category:*\n━━━━━━━━━━━━━━━━\n`;
    sorted.forEach(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      m += `${CAT_ICONS[cat] || "💰"} *${cat}*: ${formatAED(amt)} _(${pct}%)_\n`;
    });
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── ADD EXPENSE ───────────────────────────────────────
  // Format: Description Amount [Category]
  const match = text.match(/^(.+?)\s+([\d.]+)\s*(.*)$/);
  if (match) {
    const description = match[1].trim();
    const amount = parseFloat(match[2]);
    const catRaw = match[3]?.trim();

    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ Invalid amount.\n\nTry: `Lunch 25`", { parse_mode: "Markdown" });
    }

    // Find category
    let category = "Others";
    if (catRaw) {
      // Check if typed category matches any valid category (case insensitive)
      const matchedCat = VALID_CATEGORIES.find(c => c.toLowerCase() === catRaw.toLowerCase());
      if (matchedCat) {
        category = matchedCat;
      } else {
        // Try to guess from the typed category text
        category = guessCategory(catRaw) !== "Others" ? guessCategory(catRaw) : guessCategory(description);
      }
    } else {
      category = guessCategory(description);
    }

    const { data, error } = await supabase.from("expenses")
      .insert([{ date: todayDate(), description, amount, category }])
      .select().single();

    if (error) return bot.sendMessage(chatId, `❌ Error saving: ${error.message}`);

    return bot.sendMessage(chatId,
      `✅ *Saved!*\n\n${CAT_ICONS[category] || "💰"} *${description}*\n💵 ${formatAED(amount)}\n🏷️ ${category}\n📅 ${formatDate(todayDate())}\n\n_Type \`today\` to see today's expenses_`,
      { parse_mode: "Markdown" }
    );
  }

  // ── UNKNOWN ───────────────────────────────────────────
  bot.sendMessage(chatId,
    `❓ I didn't understand that.\n\n*To add expense:* \`Lunch 25\`\n*To view:* \`today\`, \`month\`, \`report\`\n*All commands:* \`/help\``,
    { parse_mode: "Markdown" }
  );
});

console.log("🤖 PKM Budget Bot v3 running with professional categories...");

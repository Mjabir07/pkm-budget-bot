const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CATEGORIES & AUTO-DETECTION KEYWORDS ─────────────────
const KEYWORDS = {
  "Food & Dining": ["food","lunch","dinner","breakfast","shawarma","broast","grill","burger","pizza","biryani","rice","chicken","restaurant","cafe","coffee","tea","juice","outside","meal","eating","iftar","suhoor"],
  "Transport": ["metro","taxi","uber","careem","bus","transport","fuel","petrol","parking","toll","salik","ride","cab"],
  "Grocery & Supermarket": ["grocery","nesto","lulu","carrefour","spinneys","supermarket","vegetables","fruits","market","baqala","shop","hypermarket"],
  "Rent & Housing": ["rent","electricity","dewa","water","internet","wifi","maintenance","housing","flat","apartment","villa","ac","repair"],
  "Shopping & Clothes": ["shopping","tamara","clothes","shirt","shoes","amazon","noon","mall","tshirt","trouser","jacket","dress"],
  "Fashion": ["fashion","watch","bag","wallet","perfume","accessories","sunglasses","belt","cap","bracelet","ring","necklace"],
  "Cosmetics": ["cosmetics","skincare","haircut","salon","barber","shampoo","cream","makeup","lotion","facewash","deodorant","razor"],
  "Snacks & Beverages": ["snacks","biscuit","chips","drink","energy","pepsi","coke","redbull","sandwich","peanut","popcorn","crackers","nuts","7up"],
  "Dessert & Sweets": ["icecream","ice cream","dessert","chocolate","sprinkles","cake","sweet","candy","kunafa","baklava","brownie","waffle"],
  "Health & Medical": ["health","medical","doctor","pharmacy","medicine","tablet","hospital","clinic","vitamin","gym","fitness","lab","test","xray"],
  "Entertainment": ["entertainment","movie","cinema","netflix","spotify","game","bowling","park","ticket","event","concert","show","funzone"],
  "Family & Kids": ["family","kids","baby","school","toys","diapers","hawwa","milk","formula","stroller","children","daughter","son","stationary"],
  "Others": [],
};

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

const VALID_CATEGORIES = Object.keys(CAT_ICONS);

function guessCategory(desc) {
  const lower = desc.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORDS)) {
    if (cat === "Others") continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
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

// Parse date from DD/MM or DD/MM/YYYY format
function parseDate(str) {
  // DD/MM format — assume current year
  const short = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (short) {
    const year = new Date().getFullYear();
    const month = String(short[2]).padStart(2, "0");
    const day = String(short[1]).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // DD/MM/YYYY format
  const full = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (full) {
    const month = String(full[2]).padStart(2, "0");
    const day = String(full[1]).padStart(2, "0");
    return `${full[3]}-${month}-${day}`;
  }
  return null;
}

// Find category from partial input
function matchCategory(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  // Exact match first
  const exact = VALID_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (exact) return exact;
  // Partial match
  const partial = VALID_CATEGORIES.find(c => c.toLowerCase().includes(lower));
  if (partial) return partial;
  return null;
}

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
  const lower = text.toLowerCase().trim();

  // ── HELP ──────────────────────────────────────────────
  if (lower === "/start" || lower === "/help") {
    return bot.sendMessage(chatId, `
👋 *PKM Budget Tracker v4*
_Your personal expense manager_

━━━━━━━━━━━━━━━━

*➕ ADD EXPENSE:*
\`Description Amount\`
\`Description Amount DD/MM\`
\`Description Amount Category\`
\`Description Amount Category DD/MM\`

*Examples:*
• \`Lunch 25\` — today, auto category
• \`Lunch 25 01/05\` — May 1st
• \`Metro 6 Transport\` — with category
• \`Rent 2500 Rent & Housing 03/05\` — full detail
• \`Nesto 87 Grocery & Supermarket 02/05\`

━━━━━━━━━━━━━━━━

*✏️ EDIT EXPENSE:*
\`edit ID desc New description\`
\`edit ID amount 30\`
\`edit ID cat Food & Dining\`
\`edit ID date 01/05\`

*Examples:*
• \`edit 5 desc Lunch at work\`
• \`edit 5 amount 30\`
• \`edit 5 cat Transport\`
• \`edit 5 date 01/05\`

━━━━━━━━━━━━━━━━

*📊 VIEW COMMANDS:*
• \`today\` • \`yesterday\` • \`week\`
• \`month\` • \`all\` • \`list\`
• \`report\` • \`total\` • \`cats\`
• \`view 5\` — see single entry
• \`delete 5\` — delete entry

━━━━━━━━━━━━━━━━

*🏷️ CATEGORIES:*
• \`categories\` — see full list
    `, { parse_mode: "Markdown" });
  }

  // ── CATEGORIES LIST ───────────────────────────────────
  if (lower === "categories") {
    let m = `🏷️ *Your Categories*\n\n`;
    VALID_CATEGORIES.forEach(cat => { m += `${CAT_ICONS[cat]} ${cat}\n`; });
    m += `\n_Use full name when adding:_\n\`Gym 150 Health & Medical\`\n\`Nesto 87 Grocery & Supermarket\``;
    return bot.sendMessage(chatId, m, { parse_mode: "Markdown" });
  }

  // ── VIEW SINGLE ENTRY ─────────────────────────────────
  if (lower.startsWith("view ")) {
    const id = parseInt(text.split(" ")[1]);
    if (isNaN(id)) return bot.sendMessage(chatId, "❌ Usage: `view 5`", { parse_mode: "Markdown" });
    const { data, error } = await supabase.from("expenses").select("*").eq("id", id).single();
    if (error || !data) return bot.sendMessage(chatId, `❌ Expense #${id} not found.`);
    return bot.sendMessage(chatId,
      `🔍 *Expense #${id}*\n\n📝 *Description:* ${data.description}\n💵 *Amount:* ${formatAED(data.amount)}\n🏷️ *Category:* ${CAT_ICONS[data.category] || "💰"} ${data.category}\n📅 *Date:* ${formatDate(data.date)}\n\n_To edit: \`edit ${id} desc New name\`_`,
      { parse_mode: "Markdown" }
    );
  }

  // ── DELETE ────────────────────────────────────────────
  if (lower.startsWith("delete ") || lower.startsWith("del ")) {
    const id = parseInt(text.split(" ")[1]);
    if (isNaN(id)) return bot.sendMessage(chatId, "❌ Usage: `delete 5`", { parse_mode: "Markdown" });
    // First get the entry so we can confirm what was deleted
    const { data: entry } = await supabase.from("expenses").select("*").eq("id", id).single();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (entry) {
      return bot.sendMessage(chatId, `🗑️ *Deleted #${id}*\n${entry.description} — ${formatAED(entry.amount)} — ${formatDate(entry.date)}`);
    }
    return bot.sendMessage(chatId, `🗑️ Expense #${id} deleted.`);
  }

  // ── EDIT ──────────────────────────────────────────────
  // Format: edit ID field value
  if (lower.startsWith("edit ")) {
    const parts = text.split(" ");
    const id = parseInt(parts[1]);
    const field = parts[2]?.toLowerCase();
    const value = parts.slice(3).join(" ").trim();

    if (isNaN(id) || !field || !value) {
      return bot.sendMessage(chatId,
        `❌ *Edit format:*\n\`edit ID field value\`\n\nFields: \`desc\`, \`amount\`, \`cat\`, \`date\`\n\nExamples:\n• \`edit 5 desc Lunch at office\`\n• \`edit 5 amount 30\`\n• \`edit 5 cat Transport\`\n• \`edit 5 date 01/05\``,
        { parse_mode: "Markdown" }
      );
    }

    let updateObj = {};

    if (field === "desc" || field === "description") {
      updateObj.description = value;

    } else if (field === "amount" || field === "amt") {
      const amt = parseFloat(value);
      if (isNaN(amt) || amt <= 0) return bot.sendMessage(chatId, "❌ Invalid amount. Use a number like `30` or `15.50`", { parse_mode: "Markdown" });
      updateObj.amount = amt;

    } else if (field === "cat" || field === "category") {
      const matched = matchCategory(value);
      if (!matched) {
        return bot.sendMessage(chatId,
          `❌ Category not found: *${value}*\n\nType \`categories\` to see full list.`,
          { parse_mode: "Markdown" }
        );
      }
      updateObj.category = matched;

    } else if (field === "date") {
      const parsed = parseDate(value);
      if (!parsed) return bot.sendMessage(chatId, "❌ Invalid date format. Use `DD/MM` like `01/05` or `01/05/2026`", { parse_mode: "Markdown" });
      updateObj.date = parsed;

    } else {
      return bot.sendMessage(chatId,
        `❌ Unknown field: *${field}*\n\nValid fields: \`desc\`, \`amount\`, \`cat\`, \`date\``,
        { parse_mode: "Markdown" }
      );
    }

    const { data, error } = await supabase.from("expenses").update(updateObj).eq("id", id).select().single();
    if (error || !data) return bot.sendMessage(chatId, `❌ Could not update #${id}. Check the ID is correct.`);

    return bot.sendMessage(chatId,
      `✅ *Updated #${id}*\n\n📝 ${data.description}\n💵 ${formatAED(data.amount)}\n🏷️ ${CAT_ICONS[data.category] || "💰"} ${data.category}\n📅 ${formatDate(data.date)}`,
      { parse_mode: "Markdown" }
    );
  }

  // ── TODAY ─────────────────────────────────────────────
  if (lower === "today") {
    const { data, error } = await supabase.from("expenses").select("*").eq("date", todayDate()).order("created_at");
    if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses today yet.\n\nTry: `Lunch 25`", { parse_mode: "Markdown" });
    const total = data.reduce((s, e) => s + e.amount, 0);
    let m = `📅 *Today — ${formatDate(todayDate())}*\n\n`;
    data.forEach(e => {
      m += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)}\n`;
      m += `   _${e.category}_ \`#${e.id}\`\n\n`;
    });
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
    data.forEach(e => {
      m += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)}\n`;
      m += `   _${e.category}_ \`#${e.id}\`\n\n`;
    });
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
    if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.\n\nStart: `Lunch 25`", { parse_mode: "Markdown" });
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
    data.forEach(e => {
      m += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)}\n`;
      m += `   _${e.category} | ${formatDate(e.date)}_ \`#${e.id}\`\n\n`;
    });
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
      const filled = Math.max(0, Math.min(20, Math.round(pct / 5)));
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
  // Formats supported:
  // Description Amount
  // Description Amount DD/MM
  // Description Amount Category
  // Description Amount Category DD/MM
  const addMatch = text.match(/^(.+?)\s+([\d.]+)\s*(.*)$/);
  if (addMatch) {
    const description = addMatch[1].trim();
    const amount = parseFloat(addMatch[2]);
    const rest = addMatch[3]?.trim() || "";

    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ Invalid amount.\n\nTry: `Lunch 25`", { parse_mode: "Markdown" });
    }

    let category = "Others";
    let date = todayDate();

    if (rest) {
      // Check if last token is a date (DD/MM or DD/MM/YYYY)
      const tokens = rest.split(" ");
      const lastToken = tokens[tokens.length - 1];
      const parsedDate = parseDate(lastToken);

      if (parsedDate) {
        // Last token is a date
        date = parsedDate;
        const catPart = tokens.slice(0, -1).join(" ").trim();
        if (catPart) {
          const matched = matchCategory(catPart);
          category = matched || guessCategory(catPart) || guessCategory(description);
        } else {
          category = guessCategory(description);
        }
      } else {
        // No date — rest is category
        const matched = matchCategory(rest);
        category = matched || guessCategory(rest) || guessCategory(description);
      }
    } else {
      category = guessCategory(description);
    }

    const { data, error } = await supabase.from("expenses")
      .insert([{ date, description, amount, category }])
      .select().single();

    if (error) return bot.sendMessage(chatId, `❌ Error saving: ${error.message}`);

    const isToday = date === todayDate();
    return bot.sendMessage(chatId,
      `✅ *Saved!*\n\n${CAT_ICONS[category] || "💰"} *${description}*\n💵 ${formatAED(amount)}\n🏷️ ${category}\n📅 ${formatDate(date)}${isToday ? " _(Today)_" : ""}\n\n_Type \`today\` or \`list\` to view_`,
      { parse_mode: "Markdown" }
    );
  }

  // ── UNKNOWN ───────────────────────────────────────────
  bot.sendMessage(chatId,
    `❓ I didn't understand that.\n\n*Add:* \`Lunch 25\` or \`Lunch 25 01/05\`\n*View:* \`today\`, \`month\`, \`report\`\n*Edit:* \`edit 5 amount 30\`\n*Help:* \`/help\``,
    { parse_mode: "Markdown" }
  );
});

console.log("🤖 PKM Budget Bot v4 — running with date & edit support...");

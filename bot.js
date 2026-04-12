const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");

// ─── CONFIG ───────────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ALLOWED_USER = process.env.ALLOWED_TELEGRAM_USER; // your telegram username
// ──────────────────────────────────────────────────────────

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

function formatAED(n) {
    return `AED ${Number(n).toFixed(2)}`;
}

function todayDate() {
    return new Date().toISOString().split("T")[0];
}

function formatDate(d) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

const CAT_ICONS = {
    Food: "🍽️", Transport: "🚇", Grocery: "🛒", Rent: "🏠",
    Shopping: "🛍️", Snacks: "🍿", Dessert: "🍦", Other: "💰"
};

// ─── MESSAGE HANDLER ──────────────────────────────────────
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    if (!text) return;

    const lower = text.toLowerCase();

    // ── HELP ──
    if (lower === "/start" || lower === "/help") {
        return bot.sendMessage(chatId, `
👋 *Welcome to PKM Budget Tracker!*

Here's how to use me:

*➕ Add an expense:*
\`Description Amount\`
\`Description Amount Category\`

Examples:
• \`Lunch 15\`
• \`Metro 6\`
• \`Nesto 87.28 Grocery\`
• \`Ice cream 7 Dessert\`

*📊 View commands:*
• \`today\` — today's expenses
• \`yesterday\` — yesterday's expenses  
• \`week\` — this week's total
• \`total\` — all time total
• \`list\` — last 10 expenses
• \`cats\` — spending by category
• \`delete [id]\` — delete an expense

_Categories: Food, Transport, Grocery, Rent, Shopping, Snacks, Dessert, Other_
    `, { parse_mode: "Markdown" });
    }

    // ── DELETE ──
    if (lower.startsWith("delete ") || lower.startsWith("del ")) {
        const id = parseInt(text.split(" ")[1]);
        if (isNaN(id)) return bot.sendMessage(chatId, "❌ Usage: `delete 123`", { parse_mode: "Markdown" });
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        return bot.sendMessage(chatId, `🗑️ Expense #${id} deleted.`);
    }

    // ── TODAY ──
    if (lower === "today") {
        const { data, error } = await supabase
            .from("expenses").select("*").eq("date", todayDate()).order("created_at");
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        if (!data.length) return bot.sendMessage(chatId, "📭 No expenses today yet.");
        const total = data.reduce((s, e) => s + e.amount, 0);
        let msg = `📅 *Today — ${formatDate(todayDate())}*\n\n`;
        data.forEach(e => { msg += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}* _[${e.category}]_ \`#${e.id}\`\n`; });
        msg += `\n💰 *Total: ${formatAED(total)}*`;
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── YESTERDAY ──
    if (lower === "yesterday") {
        const d = new Date(); d.setDate(d.getDate() - 1);
        const date = d.toISOString().split("T")[0];
        const { data, error } = await supabase.from("expenses").select("*").eq("date", date).order("created_at");
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yesterday.");
        const total = data.reduce((s, e) => s + e.amount, 0);
        let msg = `📅 *Yesterday — ${formatDate(date)}*\n\n`;
        data.forEach(e => { msg += `${CAT_ICONS[e.category] || "💰"} ${e.description} — *${formatAED(e.amount)}* _[${e.category}]_ \`#${e.id}\`\n`; });
        msg += `\n💰 *Total: ${formatAED(total)}*`;
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── WEEK ──
    if (lower === "week") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        const from = d.toISOString().split("T")[0];
        const { data, error } = await supabase.from("expenses").select("*").gte("date", from).order("date");
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        if (!data.length) return bot.sendMessage(chatId, "📭 No expenses this week.");
        const total = data.reduce((s, e) => s + e.amount, 0);
        // group by date
        const byDate = {};
        data.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + e.amount; });
        let msg = `📊 *Last 7 Days*\n\n`;
        Object.entries(byDate).sort().reverse().forEach(([d, amt]) => {
            msg += `📅 ${formatDate(d)} — ${formatAED(amt)}\n`;
        });
        msg += `\n💰 *Total: ${formatAED(total)}*`;
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── TOTAL ──
    if (lower === "total") {
        const { data, error } = await supabase.from("expenses").select("amount");
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        const total = data.reduce((s, e) => s + e.amount, 0);
        return bot.sendMessage(chatId, `💰 *All-time Total: ${formatAED(total)}*\n📝 ${data.length} transactions`, { parse_mode: "Markdown" });
    }

    // ── LIST ──
    if (lower === "list") {
        const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(10);
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        if (!data.length) return bot.sendMessage(chatId, "📭 No expenses yet.");
        let msg = `📋 *Last 10 Expenses*\n\n`;
        data.forEach(e => { msg += `${CAT_ICONS[e.category] || "💰"} *${e.description}* — ${formatAED(e.amount)} _${formatDate(e.date)}_ \`#${e.id}\`\n`; });
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── CATS ──
    if (lower === "cats" || lower === "categories") {
        const { data, error } = await supabase.from("expenses").select("category, amount");
        if (error) return bot.sendMessage(chatId, `❌ ${error.message}`);
        const map = {};
        data.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        const total = data.reduce((s, e) => s + e.amount, 0);
        let msg = `🏷️ *Spending by Category*\n\n`;
        sorted.forEach(([cat, amt]) => {
            const pct = ((amt / total) * 100).toFixed(1);
            msg += `${CAT_ICONS[cat] || "💰"} *${cat}* — ${formatAED(amt)} _(${pct}%)_\n`;
        });
        msg += `\n💰 *Total: ${formatAED(total)}*`;
        return bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── ADD EXPENSE: "Description Amount [Category]" ──
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

        const { data, error } = await supabase.from("expenses").insert([{
            date: todayDate(),
            description,
            amount,
            category,
        }]).select().single();

        if (error) return bot.sendMessage(chatId, `❌ Error saving: ${error.message}`);

        return bot.sendMessage(chatId,
            `✅ *Saved!*\n\n${CAT_ICONS[category] || "💰"} ${description}\n💵 ${formatAED(amount)}\n🏷️ ${category}\n📅 Today\n\n_Type \`today\` to see all today's expenses_`,
            { parse_mode: "Markdown" }
        );
    }

    // ── UNKNOWN ──
    bot.sendMessage(chatId, `❓ I didn't understand that.\n\nTry:\n• \`Lunch 15\` to add expense\n• \`today\` to see today\n• \`/help\` for all commands`, { parse_mode: "Markdown" });
});

console.log("🤖 PKM Budget Bot is running...");
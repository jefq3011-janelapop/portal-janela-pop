const {
  loadEnvFiles,
  readActionsState,
  writeActionsState,
  approveCandidate,
  ignoreCandidate,
} = require("./lib/editorial");

async function telegram(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram nao configurado.");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram falhou em ${method}: ${JSON.stringify(result)}`);
  return result.result;
}

async function answerCallback(callbackQueryId, text) {
  try {
    await telegram("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  } catch (error) {
    if (!String(error.message).includes("query is too old")) throw error;
  }
}

async function sendMessage(chatId, text) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: false,
  });
}

async function handleCallback(callback) {
  const [action, id] = String(callback.data || "").split(":");
  const chatId = callback.message?.chat?.id;

  if (!["aprovar", "ignorar"].includes(action) || !id) {
    await answerCallback(callback.id, "Acao desconhecida.");
    return;
  }

  if (action === "aprovar") {
    const result = approveCandidate(id);
    await answerCallback(callback.id, "Materia aprovada.");
    if (chatId) {
      await sendMessage(
        chatId,
        [
          "Materia aprovada no Portal Janela Pop.",
          `Titulo: ${result.item.titlePt || result.item.title}`,
          `Arquivo: posts/${result.fileName}`,
          "Atualize o site local para ver a materia na home.",
        ].join("\n")
      );
    }
    return;
  }

  const item = ignoreCandidate(id);
  await answerCallback(callback.id, "Pauta ignorada.");
  if (chatId) {
    await sendMessage(chatId, `Pauta ignorada: ${item.titlePt || item.title}`);
  }
}

async function main() {
  loadEnvFiles();
  const state = readActionsState();
  const updates = await telegram("getUpdates", {
    offset: Number(state.offset || 0) + 1,
    timeout: 0,
    allowed_updates: ["callback_query"],
  });

  for (const update of updates) {
    state.offset = Math.max(Number(state.offset || 0), update.update_id);
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  }

  writeActionsState(state);
  console.log(`Acoes processadas: ${updates.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

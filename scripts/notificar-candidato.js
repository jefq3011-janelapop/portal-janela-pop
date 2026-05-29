const fs = require("fs");
const path = require("path");
const { ROOT, loadEnvFiles, readCandidates } = require("./lib/editorial");

const id = process.argv[2];

function buildText(item) {
  return [
    "NOVA PAUTA PARA O PORTAL JANELA POP",
    `Codigo: ${item.id}`,
    `Tema: ${item.titlePt || item.title}`,
    `Categoria: ${item.category}`,
    `Imagem: ${item.image ? "sim" : "arte padrao Janela Pop"}`,
    "",
    "Toque em uma opcao:",
    "",
    item.link,
  ].join("\n");
}

async function sendCandidate(item) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram nao configurado.");

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "Aprovar materia", callback_data: `aprovar:${item.id}` },
        { text: "Ignorar", callback_data: `ignorar:${item.id}` },
      ],
    ],
  };

  const text = buildText(item);
  const endpoint = item.image ? "sendPhoto" : "sendMessage";
  let response;

  if (item.image && !/^https?:\/\//i.test(item.image)) {
    const filePath = path.join(ROOT, item.image.replace(/^\//, ""));
    const form = new FormData();
    form.set("chat_id", chatId);
    form.set("caption", text.slice(0, 1024));
    form.set("reply_markup", JSON.stringify(reply_markup));
    form.set("photo", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
    response = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: "POST",
      body: form,
    });
  } else {
    const body = item.image
      ? { chat_id: chatId, photo: item.image, caption: text.slice(0, 1024), reply_markup }
      : { chat_id: chatId, text, disable_web_page_preview: false, reply_markup };
    response = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram falhou: ${JSON.stringify(result)}`);
}

async function main() {
  loadEnvFiles();
  const candidates = readCandidates().items;
  const item = id
    ? candidates.find((candidate) => candidate.id === id)
    : candidates.find((candidate) => candidate.status === "pendente");

  if (!item) throw new Error(id ? `Candidato nao encontrado: ${id}` : "Nenhum candidato pendente encontrado.");
  await sendCandidate(item);
  console.log(`Candidato enviado ao Telegram: ${item.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

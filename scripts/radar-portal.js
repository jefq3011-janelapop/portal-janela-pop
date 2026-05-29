const fs = require("fs");
const path = require("path");
const { loadEnvFiles } = require("./lib/editorial");

const ROOT = path.join(__dirname, "..");
const CANDIDATES_FILE = path.join(ROOT, "data", "candidatos.json");

const SOURCES = [
  {
    label: "Collider",
    series: "FROM",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('FROM MGM+ Collider OR "FROM season" Collider when:2d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "ScreenRant",
    series: "FROM",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('FROM MGM+ ScreenRant OR "FROM season" ScreenRant when:2d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "Bloody Disgusting",
    series: "FROM",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('FROM MGM+ "Bloody Disgusting" OR "FROM season" horror when:2d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "IGN",
    series: "FROM",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('FROM MGM+ IGN OR "FROM episode" IGN when:2d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "Reddit FromSeries",
    series: "FROM",
    category: "From",
    url: "https://www.reddit.com/r/FromSeries/new/.rss",
  },
  {
    label: "Google News - Trailers",
    series: "Cultura pop",
    category: "Trailers",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('("official trailer" OR teaser) (Netflix OR HBO OR Disney OR Marvel OR DC OR Prime Video) when:1d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "Google News - Series",
    series: "Series",
    category: "Series",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('("new series" OR "season" OR "finale") (Netflix OR HBO OR Prime Video OR Disney+) when:1d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "Google News - Filmes",
    series: "Filmes",
    category: "Filmes",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('("movie trailer" OR "new movie" OR "box office") (Disney OR Warner OR Universal OR Netflix) when:1d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "Google News - Terror",
    series: "Terror",
    category: "Terror",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('("horror movie" OR "horror series" OR "scary") (trailer OR release OR Netflix OR Shudder) when:1d') +
      "&hl=en-US&gl=US&ceid=US:en",
  },
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanTitle(value) {
  return stripTags(value)
    .replace(/#[A-Za-z0-9_]+/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtml(match[1]).trim() : "";
}

function getImageFromXml(item) {
  const media =
    item.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
    item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//i);
  if (media) return decodeHtml(media[1]);

  const html = decodeHtml(getTag(item, "description") || getTag(item, "summary") || "");
  const image = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return image ? decodeHtml(image[1]) : "";
}

function imageForItem(item, source) {
  const image = getImageFromXml(item);
  if (image) return image;
  if (source.series === "FROM") return "assets/from-serie.jpg";
  if (source.category === "Filmes") return "assets/moana-live-action.jpg";
  if (source.category === "Series") return "assets/the-boroughs-netflix.jpg";
  if (source.category === "Terror") return "assets/from-serie.jpg";
  return "assets/banner-janela-pop.png";
}

function parseFeed(xml, source) {
  const itemMatches = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => match[0]);
  const entryMatches = Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((match) => match[0]);
  const items = itemMatches.length ? itemMatches : entryMatches;

  return items.map((item) => {
    const title = cleanTitle(getTag(item, "title"));
    let link = stripTags(getTag(item, "link"));
    if (!link) {
      const href = item.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = href ? decodeHtml(href[1]) : "";
    }
    const pubDate = stripTags(getTag(item, "pubDate")) || stripTags(getTag(item, "updated")) || stripTags(getTag(item, "published"));
    const description = stripTags(getTag(item, "description")) || stripTags(getTag(item, "summary"));
    const id = makeId(`${source.series}:${title}:${link}`);
    return {
      id,
      title,
      titlePt: translateTitle(title),
      series: source.series,
      category: source.category || (source.series === "FROM" ? "From" : "Series"),
      source: source.label,
      link,
      pubDate,
      description,
      image: imageForItem(item, source),
      score: scoreItem(`${title} ${description}`),
      status: "pendente",
      createdAt: new Date().toISOString(),
    };
  });
}

function scoreItem(text) {
  const value = text.toLowerCase();
  let score = 0;
  for (const term of ["trailer", "teaser", "theory", "explained", "episode", "confirmed", "ending", "finale", "release date"]) {
    if (value.includes(term)) score += 2;
  }
  if (value.includes("from")) score += 2;
  if (value.includes("spoiler")) score += 1;
  return score;
}

function makeId(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `jp-${hash.toString(16)}`;
}

function translateTitle(title) {
  return title
    .replace(/\bnew look at\b/gi, "nova imagem de")
    .replace(/\bpremiering this sunday\b/gi, "estreia neste domingo")
    .replace(/\bfans\b/gi, "fas")
    .replace(/\bnew\b/gi, "novo")
    .replace(/\bseason\b/gi, "temporada")
    .replace(/\bepisode\b/gi, "episodio")
    .replace(/\btrailer\b/gi, "trailer")
    .replace(/\bteaser\b/gi, "teaser")
    .replace(/\btheory\b/gi, "teoria")
    .replace(/\bexplained\b/gi, "explicado")
    .replace(/\brelease date\b/gi, "data de estreia")
    .replace(/\bofficial\b/gi, "oficial")
    .replace(/\bending\b/gi, "final")
    .replace(/\bfinale\b/gi, "episodio final")
    .replace(/\s+-\s+.+$/g, "")
    .trim();
}

function loadCandidates() {
  try {
    return JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8"));
  } catch {
    return { items: [] };
  }
}

function saveCandidates(data) {
  ensureDir(CANDIDATES_FILE);
  fs.writeFileSync(CANDIDATES_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "JanelaPopPortal/1.0",
      accept: "application/rss+xml,application/atom+xml,text/xml,*/*",
    },
  });
  if (!response.ok) throw new Error(`${source.label}: HTTP ${response.status}`);
  return parseFeed(await response.text(), source);
}

async function sendTelegramCandidate(item) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = [
    "NOVA PAUTA PARA O PORTAL JANELA POP",
    `Codigo: ${item.id}`,
    `Tema: ${item.titlePt}`,
    `Categoria: ${item.category}`,
    "",
    "Toque em uma opcao:",
    "",
    item.link,
  ].join("\n");

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "Aprovar materia", callback_data: `aprovar:${item.id}` },
        { text: "Ignorar", callback_data: `ignorar:${item.id}` },
      ],
    ],
  };

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
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram falhou: ${JSON.stringify(result)}`);
  }
}

async function main() {
  loadEnvFiles();

  const current = loadCandidates();
  const knownIds = new Set(current.items.map((item) => item.id));
  const found = [];
  const errors = [];

  for (const source of SOURCES) {
    try {
      found.push(...(await fetchSource(source)));
    } catch (error) {
      errors.push(error.message);
    }
  }

  const newItems = found
    .filter((item) => item.title && item.link)
    .filter((item) => item.score >= 3)
    .filter((item) => !knownIds.has(item.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  current.items = [...newItems, ...current.items].slice(0, 60);
  saveCandidates(current);

  for (const item of newItems.slice(0, 3)) {
    await sendTelegramCandidate(item);
  }

  console.log(`Radar do portal: ${newItems.length} nova(s) pauta(s).`);
  if (errors.length) console.log(`Avisos: ${errors.join(" | ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES_FILE = path.join(ROOT, "data", "candidatos.json");
const POSTS_DIR = path.join(ROOT, "posts");
const SITE_SCRIPT = path.join(ROOT, "scripts", "site.js");
const ACTIONS_FILE = path.join(ROOT, "data", "telegram-actions.json");
const DEFAULT_IMAGE = "assets/from-serie.jpg";

function loadEnvFiles() {
  const files = [
    path.join(ROOT, ".env.telegram"),
    path.join(ROOT, "..", "cerebro-janela-pop", ".env.telegram"),
  ];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  }
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function readCandidates() {
  return readJson(CANDIDATES_FILE, { items: [] });
}

function writeCandidates(data) {
  writeJson(CANDIDATES_FILE, data);
}

function readActionsState() {
  return readJson(ACTIONS_FILE, { offset: 0 });
}

function writeActionsState(data) {
  writeJson(ACTIONS_FILE, data);
}

function escapeYaml(value) {
  return String(value || "").replace(/"/g, '\\"');
}

function buildPost(item) {
  const title = item.titlePt || item.title;
  const slug = slugify(title);
  const image = item.image || DEFAULT_IMAGE;
  const excerpt = `Uma novidade sobre ${item.series} chamou atencao fora do Brasil e movimentou novas discussoes entre os fas da serie.`;

  return {
    slug,
    fileName: `${slug}.md`,
    content: `---\ntitle: "${escapeYaml(title)}"\nslug: "${slug}"\ncategory: "${escapeYaml(item.category || "Noticias")}"\ndate: "${new Date().toISOString().slice(0, 10)}"\nimage: "${escapeYaml(image)}"\nexcerpt: "${escapeYaml(excerpt)}"\nsource: "${escapeYaml(item.source)}"\nsourceUrl: "${escapeYaml(item.link)}"\n---\n\nUma publicacao internacional voltou a colocar ${item.series} no centro das conversas entre fas. A novidade ganhou tracao porque toca em pontos que costumam movimentar a comunidade: misterio, expectativa para os proximos episodios e possiveis pistas escondidas na narrativa.\n\nNo caso de ${item.series}, pequenas imagens, falas ou descricoes promocionais costumam ganhar peso porque a serie trabalha com informacoes fragmentadas. Por isso, qualquer detalhe novo rapidamente vira materia-prima para interpretacoes, comparacoes com episodios anteriores e novas leituras sobre os personagens.\n\nO ponto principal e entender se a novidade confirma uma direcao que a serie ja vinha sugerindo ou se apenas aumenta o suspense antes de uma revelacao maior. Para os fas, a duvida continua sendo parte essencial da experiencia: cada pista pode ser apenas um detalhe visual ou uma indicacao importante sobre o rumo da historia.\n\nAinda e cedo para cravar respostas definitivas, mas a movimentacao mostra que ${item.series} segue forte entre o publico que acompanha teorias, trailers e discussoes semanais. A grande questao agora e se esse novo detalhe antecipa uma virada real ou apenas prepara o terreno para mais perguntas.\n`,
  };
}

function addPostToSite(fileName) {
  const source = fs.readFileSync(SITE_SCRIPT, "utf8");
  if (source.includes(`"${fileName}"`)) return;
  const updated = source.replace("const postFiles = [", `const postFiles = [\n  "${fileName}",`);
  fs.writeFileSync(SITE_SCRIPT, updated);
}

function approveCandidate(id) {
  const data = readCandidates();
  const item = data.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Candidato nao encontrado: ${id}`);

  if (item.status === "aprovado" && item.post) {
    return { item, fileName: item.post, alreadyApproved: true };
  }

  const post = buildPost(item);
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(POSTS_DIR, post.fileName), post.content);
  addPostToSite(post.fileName);

  item.status = "aprovado";
  item.imageUsed = item.image || DEFAULT_IMAGE;
  item.usedDefaultImage = !item.image;
  item.post = post.fileName;
  item.approvedAt = new Date().toISOString();
  writeCandidates(data);

  return { item, fileName: post.fileName, alreadyApproved: false };
}

function ignoreCandidate(id) {
  const data = readCandidates();
  const item = data.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Candidato nao encontrado: ${id}`);
  item.status = "ignorado";
  item.ignoredAt = new Date().toISOString();
  writeCandidates(data);
  return item;
}

module.exports = {
  ROOT,
  loadEnvFiles,
  readCandidates,
  readActionsState,
  writeActionsState,
  approveCandidate,
  ignoreCandidate,
};

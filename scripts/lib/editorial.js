const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES_FILE = path.join(ROOT, "data", "candidatos.json");
const POSTS_DIR = path.join(ROOT, "posts");
const SITE_SCRIPT = path.join(ROOT, "scripts", "site.js");
const ACTIONS_FILE = path.join(ROOT, "data", "telegram-actions.json");
const DEFAULT_IMAGE = "assets/from-serie.jpg";
const FALLBACK_IMAGES = {
  from: "assets/from-serie.jpg",
  disney: "assets/moana-live-action.jpg",
  theBoys: "assets/the-boys-vought-rising.jpg",
  houseDragon: "assets/house-of-the-dragon-s3.jpg",
  netflix: "assets/the-boroughs-netflix.jpg",
  culture: "assets/banner-janela-pop.png",
};

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

function getEditorialProfile(item) {
  const text = `${item.titlePt || ""} ${item.title || ""} ${item.series || ""} ${item.category || ""}`.toLowerCase();
  if (/from|mgm\+/.test(text)) return "from";
  if (/moana|disney/.test(text)) return "disney-live-action";
  if (/the boys|vought|soldier boy|stormfront/.test(text)) return "superheroes-adult";
  if (/house of the dragon|targaryen|westeros|rhaenyra/.test(text)) return "fantasy-hbo";
  if (/stranger things|boroughs|duffer/.test(text)) return "netflix-scifi";
  if (/marvel|dc|superman|batman|avengers|spider-man/.test(text)) return "superheroes";
  if (/horror|terror|shudder|scary/.test(text)) return "horror";
  if (/trailer|teaser/.test(text)) return "trailer";
  if (/movie|film|filme/.test(text)) return "movie";
  return "culture";
}

function imageForItem(item) {
  const text = `${item.titlePt || ""} ${item.title || ""} ${item.series || ""} ${item.category || ""}`.toLowerCase();
  if (/from|mgm\+/.test(text)) return FALLBACK_IMAGES.from;
  if (/moana|disney/.test(text)) return FALLBACK_IMAGES.disney;
  if (/the boys|vought|soldier boy|stormfront/.test(text)) return FALLBACK_IMAGES.theBoys;
  if (/house of the dragon|targaryen|westeros|rhaenyra/.test(text)) return FALLBACK_IMAGES.houseDragon;
  if (/stranger things|boroughs|duffer|netflix/.test(text)) return FALLBACK_IMAGES.netflix;
  if (/horror|terror|shudder|scary/.test(text)) return FALLBACK_IMAGES.from;
  return FALLBACK_IMAGES.culture;
}

function isWeakRemoteImage(image) {
  return /^https:\/\/lh3\.googleusercontent\.com\/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc=/i.test(
    image || ""
  );
}

function resolveImage(item) {
  const image = item.imageUsed || item.image || "";
  if (!image || isWeakRemoteImage(image)) return imageForItem(item);
  return image;
}

function normalizeCandidateImage(item) {
  const image = resolveImage(item);
  item.image = image;
  if (item.status === "aprovado") item.imageUsed = image;
  item.usedDefaultImage = !/^https?:\/\//i.test(image);
  return item;
}

function seoTitle(item) {
  const title = item.titlePt || item.title;
  const profile = getEditorialProfile(item);

  if (profile === "trailer" && !/trailer/i.test(title)) return `${title}: trailer e novidades`;
  if (profile === "horror" && !/terror|horror/i.test(title)) return `${title}: novidade agita fas de terror`;
  if (profile === "superheroes" && !/Marvel|DC|Superman|Batman|Avengers|Spider/i.test(title)) return `${title}: nova movimentacao chama atencao`;
  return title;
}

function buildExcerpt(item) {
  const profile = getEditorialProfile(item);
  if (profile === "disney-live-action") {
    return "O live-action de Moana voltou ao centro das conversas com novo trailer, imagem oficial e a promessa de revisitar uma das aventuras mais populares da Disney.";
  }
  if (profile === "superheroes-adult") {
    return "O universo de The Boys se expande com Vought Rising, derivado que recoloca Soldier Boy e Stormfront em destaque.";
  }
  if (profile === "fantasy-hbo") {
    return "A nova fase de House of the Dragon promete ampliar a guerra Targaryen e colocar Westeros em um ponto decisivo.";
  }
  if (profile === "netflix-scifi") {
    return "A nova serie sci-fi dos criadores de Stranger Things chamou atencao com trailer e clima de misterio suburbano.";
  }
  if (profile === "from") {
    return "FROM voltou a movimentar os fas com novas teorias, imagens e discussoes sobre os misterios da cidade.";
  }
  if (profile === "horror") {
    return "Uma novidade de terror chamou atencao e pode movimentar fas de filmes, series sombrias e producoes de suspense.";
  }
  if (profile === "superheroes") {
    return "Uma novidade envolvendo super-herois voltou ao radar da cultura pop e deve gerar debate entre fas de grandes franquias.";
  }
  if (profile === "trailer") {
    return "Um novo trailer entrou no radar e colocou a producao entre os assuntos que podem movimentar os proximos dias.";
  }
  return `Uma novidade sobre ${item.series} chamou atencao fora do Brasil e movimentou novas discussoes entre os fas.`;
}

function buildArticleBody(item) {
  const title = item.titlePt || item.title;
  const text = `${title} ${item.series}`.toLowerCase();

  if (text.includes("moana")) {
    return `O live-action de Moana voltou a ganhar forca com a divulgacao de novo material oficial, colocando a nova versao da aventura da Disney entre os assuntos mais comentados da cultura pop. A producao revisita a historia da jovem navegadora em uma abordagem com atores reais, mantendo Dwayne Johnson ligado ao papel de Maui e apresentando Catherine Laga'aia como a nova Moana.\n\nA aposta da Disney segue uma estrategia conhecida do estudio: transformar animacoes populares em grandes eventos cinematograficos. No caso de Moana, o interesse e ainda maior porque o filme original se manteve muito forte no streaming, nas musicas e no imaginario do publico familiar.\n\nO trailer tambem chama atencao por tentar equilibrar fidelidade visual com uma escala mais realista. Cenarios naturais, figurinos e a presenca de Maui aparecem como pontos centrais para convencer tanto quem cresceu com a animacao quanto quem vai conhecer essa versao agora.\n\nPara o publico brasileiro, o assunto tem alto potencial porque mistura nostalgia, Disney, musica e curiosidade sobre adaptacoes live-action. A grande pergunta e se o novo filme conseguira repetir a energia do original ou se enfrentara a mesma resistencia que outras releituras recentes do estudio.\n\nCom a divulgacao ganhando tracao, Moana live-action deve seguir entre os temas fortes dos proximos dias, principalmente conforme novas imagens, entrevistas e comparacoes com a animacao forem aparecendo.`;
  }

  if (text.includes("the boys") || text.includes("vought")) {
    return `O universo de The Boys continua se expandindo, e Vought Rising voltou ao radar com um trailer que destaca o retorno de Soldier Boy e Stormfront. O derivado promete explorar outra fase da Vought, ampliando a mitologia da franquia e mostrando como a empresa consolidou seu poder antes dos eventos principais da serie.\n\nA presenca de Soldier Boy e um dos pontos mais fortes da divulgacao. O personagem se tornou um dos nomes mais marcantes de The Boys por representar uma versao distorcida do heroismo classico, carregada de violencia, propaganda e trauma historico. Stormfront, por sua vez, traz de volta uma das figuras mais controversas da franquia.\n\nVought Rising pode funcionar como uma ponte importante para entender como a cultura dos super-herois foi transformada em produto, controle politico e manipulacao de imagem. Esse sempre foi um dos temas centrais de The Boys, e o derivado parece disposto a aprofundar justamente essa origem.\n\nO interesse pelo projeto tambem cresce porque a franquia ja provou que consegue render alem da serie principal. Com Gen V, o universo mostrou que ainda havia espaco para novas historias dentro da mesma critica social acida.\n\nSe o trailer cumprir o que promete, Vought Rising pode ser uma das producoes mais comentadas entre fas de super-herois, streaming e cultura pop adulta, especialmente por trazer de volta personagens que ainda geram debate forte.`;
  }

  if (text.includes("house of the dragon") || text.includes("targaryen")) {
    return `House of the Dragon voltou ao centro das discussoes com novidades da terceira temporada, que prometem colocar a guerra Targaryen em um estagio ainda mais intenso. Depois de uma segunda temporada marcada por tensao politica, perdas e preparacao para conflitos maiores, a nova fase deve entregar consequencias mais diretas para Westeros.\n\nA serie sempre teve como grande forca o choque entre ambicao familiar, disputa pelo trono e destruicao causada pelos dragoes. A expectativa para a terceira temporada cresce justamente porque a historia se aproxima de momentos mais explosivos da Danca dos Dragoes, um dos conflitos mais tragicos da historia Targaryen.\n\nRhaenyra aparece como uma das figuras centrais desse novo momento. Sua disputa pelo poder deixou de ser apenas uma questao de legitimidade e passou a envolver vinganca, estrategia militar e sobrevivencia politica. Do outro lado, os verdes tambem enfrentam divisoes internas e consequencias das proprias escolhas.\n\nPara os fas de Game of Thrones, a promessa de batalhas maiores e decisoes irreversiveis e um dos principais atrativos. House of the Dragon tem a chance de entregar uma temporada mais movimentada, sem abandonar o peso dramatico que sustenta a serie.\n\nCom a guerra se aproximando de um ponto sem retorno, a terceira temporada deve ser decisiva para definir o legado da producao dentro do universo criado por George R. R. Martin.`;
  }

  if (text.includes("stranger things") || text.includes("boroughs")) {
    return `A nova serie sci-fi dos criadores de Stranger Things voltou a chamar atencao apos a divulgacao de trailer, despertando curiosidade entre fas de misterio, ficcao cientifica e producoes da Netflix. The Boroughs surge como uma das apostas mais interessantes do streaming para manter vivo o interesse por historias de grupo, suspense e eventos estranhos em ambientes aparentemente comuns.\n\nO envolvimento dos irmaos Duffer naturalmente aumenta a expectativa. Stranger Things se tornou um dos maiores fenomenos da Netflix justamente por misturar nostalgia, terror leve, amizade e ameacas sobrenaturais. Qualquer novo projeto associado aos criadores passa a ser observado com cuidado.\n\nO trailer sugere uma abordagem diferente, mas ainda familiar para quem gosta desse tipo de historia. A ideia de um misterio surgindo em uma comunidade fechada, com personagens precisando entender algo maior do que eles, conversa diretamente com o publico que acompanhou Stranger Things ao longo dos anos.\n\nA grande curiosidade e saber se The Boroughs conseguira criar identidade propria ou se sera comparada o tempo todo com o sucesso anterior dos Duffer. Esse e um desafio comum para criadores que saem de uma obra gigantesca e tentam iniciar uma nova franquia.\n\nMesmo antes da estreia, a serie ja entra no radar por combinar sci-fi, suspense e nomes fortes nos bastidores. Se a Netflix acertar na divulgacao, The Boroughs pode se tornar uma das proximas grandes conversas entre fas de misterio e cultura pop.`;
  }

  if (text.includes("marvel") || text.includes("dc") || text.includes("superman") || text.includes("batman") || text.includes("avengers") || text.includes("spider-man")) {
    return `Uma nova movimentacao envolvendo grandes franquias de super-herois voltou a chamar atencao entre fas de cultura pop. O assunto ganha peso porque Marvel e DC continuam entre os nomes mais fortes do entretenimento, capazes de transformar qualquer trailer, anuncio de elenco ou rumor de bastidor em conversa imediata.\n\nNos ultimos anos, o publico passou a acompanhar esses universos com um olhar mais atento. Cada detalhe de producao, calendario de estreia ou retorno de personagem pode indicar uma mudanca maior na estrategia dos estudios.\n\nO interesse tambem vem do momento atual do genero. Depois de fases irregulares e muitas discussoes sobre desgaste de franquias, qualquer novidade relevante pode ser vista como tentativa de renovar a empolgacao dos fas.\n\nAinda e preciso esperar novas confirmacoes, mas o tema tem potencial para seguir em alta, principalmente se vier acompanhado de imagens oficiais, trailer ou declaracoes de nomes envolvidos na producao.`;
  }

  if (text.includes("horror") || text.includes("terror") || text.includes("scary") || text.includes("shudder")) {
    return `Uma nova producao de terror entrou no radar da cultura pop e chamou atencao entre fas do genero. O interesse cresce porque o terror continua vivendo uma fase forte, com filmes e series explorando misterio, trauma, criaturas, casas assombradas e novas formas de suspense.\n\nO publico desse tipo de producao costuma reagir rapidamente a trailers, primeiras imagens e detalhes de trama. Pequenas pistas sobre atmosfera, ameaca principal ou estilo visual ja sao suficientes para gerar comparacoes com outros sucessos recentes.\n\nA forca do terror esta justamente na capacidade de criar conversa antes mesmo da estreia. Quando uma producao promete uma ideia diferente ou revive um subgenero conhecido, a expectativa aumenta entre quem acompanha cinema e streaming.\n\nSe a divulgacao continuar ganhando tracao, o titulo pode se tornar uma das apostas interessantes para quem busca historias sombrias, misterios fortes e experiencias mais intensas dentro do entretenimento.`;
  }

  if (text.includes("trailer") || text.includes("teaser")) {
    return `Um novo trailer voltou a movimentar as conversas sobre cultura pop, colocando a producao em destaque entre fas que acompanham estreias, franquias e novidades do streaming. Esse tipo de divulgacao costuma ser decisivo para medir o interesse inicial do publico.\n\nO material promocional ajuda a apresentar o tom da obra, os personagens centrais e o tipo de experiencia que o estudio pretende vender. Quando um trailer consegue entregar imagens fortes ou uma promessa clara, rapidamente passa a circular entre comunidades de fas.\n\nA repercussao tambem depende do contexto da producao. Sequencias, adaptacoes, derivadas e novas temporadas costumam carregar uma expectativa maior, principalmente quando envolvem nomes conhecidos ou universos ja estabelecidos.\n\nCom a divulgacao em andamento, a tendencia e que novas informacoes aparecam nos proximos dias, incluindo entrevistas, imagens oficiais e detalhes sobre estreia.`;
  }

  return `Uma novidade internacional colocou ${item.series} novamente em destaque entre os fas de cultura pop. O assunto ganhou tracao porque envolve uma producao com apelo imediato, capaz de gerar conversa entre quem acompanha series, filmes, trailers e grandes franquias.\n\nO interesse cresce porque o publico esta cada vez mais atento a materiais promocionais, imagens oficiais e pequenos detalhes divulgados antes das estreias. Em muitos casos, uma nova foto ou trailer ja e suficiente para criar teorias, comparacoes e expectativas.\n\nAinda e cedo para medir o impacto real da novidade, mas o tema tem potencial para seguir em alta conforme novas informacoes forem surgindo. Para quem acompanha entretenimento, esse tipo de movimentacao costuma indicar quais producoes devem dominar as conversas nos proximos dias.\n\nA tendencia e que o assunto continue rendendo, principalmente se novas cenas, entrevistas ou detalhes de bastidores forem divulgados.`;
}

function buildPost(item) {
  const title = seoTitle(item);
  const slug = slugify(title);
  const image = resolveImage(item);
  const excerpt = buildExcerpt(item);
  const body = buildArticleBody(item);

  return {
    slug,
    fileName: `${slug}.md`,
    content: `---\ntitle: "${escapeYaml(title)}"\nslug: "${slug}"\ncategory: "${escapeYaml(item.category || "Noticias")}"\ndate: "${new Date().toISOString().slice(0, 10)}"\nimage: "${escapeYaml(image)}"\nexcerpt: "${escapeYaml(excerpt)}"\nsource: "${escapeYaml(item.source)}"\nsourceUrl: "${escapeYaml(item.link)}"\n---\n\n${body}\n`,
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
  item.image = resolveImage(item);
  item.imageUsed = item.image;
  item.usedDefaultImage = !/^https?:\/\//i.test(item.image);
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
  imageForItem,
  resolveImage,
  normalizeCandidateImage,
};

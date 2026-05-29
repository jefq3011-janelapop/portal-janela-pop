const postFiles = [
  "moana-live-action-ganha-trailer-e-mostra-nova-versao-da-aventura-da-disney.md",
  "criadores-de-stranger-things-revelam-trailer-de-nova-serie-sci-fi-da-netflix.md",
  "from-fas-debatem-qual-seria-o-final-ideal-para-a-serie.md",
  "from-nova-imagem-de-boyd-stevens-no-episodio-6-aumenta-a-expectativa-dos-fas.md",
  "from-temporada-4-episodio-5-teorias.md",
  "from-jade-ciclo-vilao.md",
  "from-homem-de-amarelo-vilao.md"
];

const state = {
  posts: [],
  filter: "Todos",
  query: ""
};

function parsePost(markdown, slug) {
  const [, rawFrontmatter = "", content = markdown] = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
  const data = {};

  rawFrontmatter.split("\n").forEach((line) => {
    const index = line.indexOf(":");
    if (index === -1) return;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    data[key] = value;
  });

  return {
    slug: data.slug || slug.replace(".md", ""),
    title: data.title || "Sem titulo",
    category: data.category || "Noticias",
    date: data.date || "",
    image: data.image || "assets/hero-janela-pop.png",
    excerpt: data.excerpt || "",
    source: data.source || "",
    sourceUrl: data.sourceUrl || "",
    content
  };
}

function markdownToHtml(markdown) {
  return markdown
    .trim()
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (!line.trim()) return "";
      return `<p>${line}</p>`;
    })
    .join("");
}

function renderPosts() {
  const root = document.querySelector("#posts");
  if (!root) return;

  const categoryFromUrl = new URLSearchParams(window.location.search).get("cat");
  if (categoryFromUrl) state.filter = categoryFromUrl;

  const filtered = state.posts.filter((post) => {
    const categoryMatch = state.filter === "Todos" || post.category === state.filter;
    const query = state.query.toLowerCase();
    const queryMatch = !query || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(query);
    return categoryMatch && queryMatch;
  });

  const postsToShow = document.querySelector("#featured") ? filtered.slice(1) : filtered;

  root.innerHTML = postsToShow
    .map(
      (post) => `
        <a class="post-card" href="post.html?slug=${post.slug}">
          <div class="thumb">
            <img src="${post.image}" alt="">
          </div>
          <div class="post-body">
            <div class="meta">
              <span class="tag">${post.category}</span>
              <span>${post.date}</span>
            </div>
            <h3>${post.title}</h3>
            <p>${post.excerpt}</p>
          </div>
        </a>
      `
    )
    .join("");

  renderFeatured(filtered[0]);
  renderCategoryTitle(categoryFromUrl);
}

function renderFeatured(post) {
  const root = document.querySelector("#featured");
  if (!root || !post) return;

  root.innerHTML = `
    <a class="featured-card" href="post.html?slug=${post.slug}">
      <img src="${post.image}" alt="">
      <div class="featured-copy">
        <div class="meta">
          <span class="tag">${post.category}</span>
          <span>${post.date}</span>
        </div>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
      </div>
    </a>
  `;
}

function renderCategoryTitle(categoryFromUrl) {
  const title = document.querySelector("#category-title");
  if (!title) return;
  title.textContent = categoryFromUrl || "Todos";
}

function renderArticle() {
  const root = document.querySelector("#article");
  if (!root) return;

  const slug = new URLSearchParams(window.location.search).get("slug");
  const post = state.posts.find((item) => item.slug === slug) || state.posts[0];
  if (!post) return;

  document.title = `${post.title} | Janela Pop`;
  root.innerHTML = `
    <div class="article-hero"><img src="${post.image}" alt=""></div>
    <p class="eyebrow">${post.category} | ${post.date}</p>
    <h1>${post.title}</h1>
    <p class="lead">${post.excerpt}</p>
    ${markdownToHtml(post.content)}
  `;
}

async function loadPosts() {
  const loaded = await Promise.all(
    postFiles.map(async (file) => {
      const response = await fetch(`posts/${file}`);
      const markdown = await response.text();
      return parsePost(markdown, file);
    })
  );

  state.posts = loaded;
  const categoryFromUrl = new URLSearchParams(window.location.search).get("cat");
  if (categoryFromUrl) {
    const matchingButton = document.querySelector(`[data-filter="${categoryFromUrl}"]`);
    if (matchingButton) {
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
      matchingButton.classList.add("active");
    }
  }
  renderPosts();
  renderArticle();
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderPosts();
  });
});

const search = document.querySelector("#search");
if (search) {
  search.addEventListener("input", () => {
    state.query = search.value;
    renderPosts();
  });
}

loadPosts();

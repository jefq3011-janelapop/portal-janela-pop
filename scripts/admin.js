const statusLabels = {
  pendente: "Pendente",
  aprovado: "Aprovada",
  ignorado: "Ignorada"
};

let candidates = [];

function statusClass(status) {
  return `status-${status || "pendente"}`;
}

function renderSummary(items) {
  const root = document.querySelector("#admin-summary");
  const counts = items.reduce((acc, item) => {
    const status = item.status || "pendente";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  root.innerHTML = `
    <div class="summary-card"><strong>${items.length}</strong><span>Total</span></div>
    <div class="summary-card"><strong>${counts.pendente || 0}</strong><span>Pendentes</span></div>
    <div class="summary-card"><strong>${counts.aprovado || 0}</strong><span>Aprovadas</span></div>
    <div class="summary-card"><strong>${counts.ignorado || 0}</strong><span>Ignoradas</span></div>
  `;
}

function renderList() {
  const root = document.querySelector("#admin-list");
  const query = (document.querySelector("#admin-search")?.value || "").toLowerCase();
  const filtered = candidates.filter((item) =>
    `${item.titlePt || item.title} ${item.category} ${item.status}`.toLowerCase().includes(query)
  );

  renderSummary(candidates);

  root.innerHTML = filtered
    .map((item) => {
      const title = item.titlePt || item.title;
      const image = item.imageUsed || item.image || "assets/hero-janela-pop.png";
      const postLink = item.post ? `post.html?slug=${item.post.replace(/\.md$/, "")}` : "";
      return `
        <article class="admin-item">
          <img src="${image}" alt="">
          <div>
            <div class="meta">
              <span class="tag">${item.category || "Noticias"}</span>
              <span class="status-pill ${statusClass(item.status)}">${statusLabels[item.status] || "Pendente"}</span>
            </div>
            <h2>${title}</h2>
            <p>${item.description || "Sem descricao."}</p>
            <div class="admin-actions">
              ${postLink ? `<a href="${postLink}">Ver matéria</a>` : `<span>Aguardando aprovação pelo Telegram</span>`}
              <span>${item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : ""}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAdmin() {
  const response = await fetch("data/candidatos.json");
  const data = await response.json();
  candidates = data.items || [];
  renderList();
}

document.querySelector("#admin-search")?.addEventListener("input", renderList);
loadAdmin();

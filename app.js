const state = {
  latest: null,
  archiveIndex: [],
  selectedCategory: 'Tümü',
  search: ''
};

const categories = ['Tümü', 'Dijital Pazarlama', 'Web Tasarım', 'AI', 'SEO / GEO', 'Araçlar', 'Sağlık Sektörü'];

const els = {
  heroTitle: document.getElementById('heroTitle'),
  heroSummary: document.getElementById('heroSummary'),
  heroMeta: document.getElementById('heroMeta'),
  heroCard: document.getElementById('heroCard'),
  highlightsList: document.getElementById('highlightsList'),
  quickNotesList: document.getElementById('quickNotesList'),
  categoryTabs: document.getElementById('categoryTabs'),
  searchInput: document.getElementById('searchInput'),
  newsGrid: document.getElementById('newsGrid'),
  enesActions: document.getElementById('enesActions'),
  archiveList: document.getElementById('archiveList'),
  sourceList: document.getElementById('sourceList'),
  lastUpdated: document.getElementById('lastUpdated'),
  modal: document.getElementById('articleModal'),
  modalCategory: document.getElementById('modalCategory'),
  modalTitle: document.getElementById('modalTitle'),
  modalSummary: document.getElementById('modalSummary'),
  modalBody: document.getElementById('modalBody'),
  modalSource: document.getElementById('modalSource'),
  refreshArchive: document.getElementById('refreshArchive')
};

async function getJson(path) {
  const res = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} yüklenemedi`);
  return res.json();
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(dateString));
}

function renderTabs() {
  els.categoryTabs.innerHTML = categories.map(category => `
    <button class="tab ${category === state.selectedCategory ? 'active' : ''}" type="button" data-category="${category}">${category}</button>
  `).join('');
}

function renderHero() {
  const hero = state.latest?.hero;
  if (!hero) return;
  els.heroTitle.textContent = hero.title;
  els.heroSummary.textContent = hero.summary;
  els.heroMeta.innerHTML = `
    <span>${formatDate(state.latest.date)}</span>
    <span class="meta-pill">${hero.category || 'Gündem'}</span>
    <span>${state.latest.readingTime || '5 dk okuma'}</span>
  `;
  els.heroCard.onclick = () => openArticle(hero);
  els.heroCard.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') openArticle(hero);
  };
}

function renderSide() {
  const highlights = state.latest?.highlights || [];
  const quickNotes = state.latest?.quickNotes || [];
  els.highlightsList.innerHTML = highlights.map(item => `<li>${item}</li>`).join('');
  els.quickNotesList.innerHTML = quickNotes.map(item => `<li>${item}</li>`).join('');
}

function matchesArticle(article) {
  const categoryMatch = state.selectedCategory === 'Tümü' || article.category === state.selectedCategory;
  const haystack = [article.title, article.summary, article.category, article.sourceName].join(' ').toLowerCase();
  const searchMatch = !state.search || haystack.includes(state.search.toLowerCase());
  return categoryMatch && searchMatch;
}

function renderNews() {
  const articles = (state.latest?.articles || []).filter(matchesArticle);
  if (!articles.length) {
    els.newsGrid.innerHTML = '<div class="empty-state">Bu filtre için haber bulunamadı.</div>';
    return;
  }
  els.newsGrid.innerHTML = articles.map((article, index) => `
    <article class="news-card" tabindex="0" role="button" data-index="${index}" aria-label="${article.title} haberini aç">
      <div class="card-top">
        <span class="category-label">${article.category}</span>
        <span class="source-badge">${article.sourceName || 'Kaynak'}</span>
      </div>
      <h3>${article.title}</h3>
      <p>${article.summary}</p>
      <div class="card-meta">
        <span>${article.publishedAt ? formatDate(article.publishedAt) : formatDate(state.latest.date)}</span>
        <span>${article.readingTime || '3 dk'}</span>
      </div>
    </article>
  `).join('');
  [...els.newsGrid.querySelectorAll('.news-card')].forEach((card, index) => {
    const article = articles[index];
    card.onclick = () => openArticle(article);
    card.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') openArticle(article);
    };
  });
}

function renderActions() {
  const actions = state.latest?.enesActions || [];
  els.enesActions.innerHTML = actions.map(item => `
    <div class="action-item">
      <strong>${item.title}</strong>
      <span>${item.detail}</span>
    </div>
  `).join('');
}

function renderSources() {
  const sources = state.latest?.sources || [];
  els.sourceList.innerHTML = sources.map(source => `
    <a class="source-item" href="${source.url}" target="_blank" rel="noopener noreferrer">${source.name}</a>
  `).join('');
}

function renderArchive() {
  if (!state.archiveIndex.length) {
    els.archiveList.innerHTML = '<div class="empty-state">Arşiv henüz oluşmadı.</div>';
    return;
  }
  els.archiveList.innerHTML = state.archiveIndex.map(item => `
    <button class="archive-item" type="button" data-date="${item.date}">
      <strong>${formatDate(item.date)}</strong>
      <span>${item.articleCount || 0} haber</span>
    </button>
  `).join('');
  els.archiveList.querySelectorAll('.archive-item').forEach(button => {
    button.onclick = async () => {
      const date = button.dataset.date;
      const data = await getJson(`data/archive/${date}.json`);
      state.latest = data;
      state.selectedCategory = 'Tümü';
      state.search = '';
      els.searchInput.value = '';
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
}

function openArticle(article) {
  els.modalCategory.textContent = article.category || 'Gündem';
  els.modalTitle.textContent = article.title;
  els.modalSummary.textContent = article.summary;
  const paragraphs = article.body?.length ? article.body : [article.summary];
  els.modalBody.innerHTML = paragraphs.map(text => `<p>${text}</p>`).join('');
  els.modalSource.href = article.url || '#';
  els.modalSource.style.display = article.url ? 'inline-flex' : 'none';
  els.modal.classList.add('open');
  els.modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  els.modal.classList.remove('open');
  els.modal.setAttribute('aria-hidden', 'true');
}

function renderAll() {
  renderTabs();
  renderHero();
  renderSide();
  renderNews();
  renderActions();
  renderSources();
  renderArchive();
  els.lastUpdated.textContent = state.latest?.generatedAt ? `Son güncelleme: ${new Date(state.latest.generatedAt).toLocaleString('tr-TR')}` : 'Son güncelleme hazırlanıyor';
}

async function init() {
  try {
    const [latest, archiveIndex] = await Promise.all([
      getJson('data/latest.json'),
      getJson('data/archive-index.json').catch(() => [])
    ]);
    state.latest = latest;
    state.archiveIndex = archiveIndex;
    renderAll();
  } catch (error) {
    els.newsGrid.innerHTML = `<div class="empty-state">Veri yüklenemedi. Detay: ${error.message}</div>`;
  }
}

els.categoryTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.selectedCategory = button.dataset.category;
  renderTabs();
  renderNews();
});

els.searchInput.addEventListener('input', event => {
  state.search = event.target.value.trim();
  renderNews();
});

els.modal.addEventListener('click', event => {
  if (event.target.dataset.close) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

els.refreshArchive.addEventListener('click', async () => {
  state.archiveIndex = await getJson('data/archive-index.json').catch(() => []);
  renderArchive();
});

init();

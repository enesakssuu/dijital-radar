const state = {
  latest: null,
  archiveIndex: [],
  selectedCategory: 'Tümü',
  search: '',
  activeDate: null
};

const categories = ['Tümü', 'Dijital Pazarlama', 'Web Tasarım', 'AI', 'SEO / GEO', 'Araçlar', 'Sağlık Sektörü'];

const els = {
  heroTitle: document.getElementById('heroTitle'),
  heroSummary: document.getElementById('heroSummary'),
  heroMeta: document.getElementById('heroMeta'),
  heroCard: document.getElementById('heroCard'),
  heroLink: document.getElementById('heroLink'),
  highlightsList: document.getElementById('highlightsList'),
  quickNotesList: document.getElementById('quickNotesList'),
  categoryTabs: document.getElementById('categoryTabs'),
  searchInput: document.getElementById('searchInput'),
  newsGrid: document.getElementById('newsGrid'),
  enesActions: document.getElementById('enesActions'),
  archiveList: document.getElementById('archiveList'),
  sourceList: document.getElementById('sourceList'),
  lastUpdated: document.getElementById('lastUpdated'),
  refreshArchive: document.getElementById('refreshArchive'),
  pageDateLabel: document.getElementById('pageDateLabel')
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

function slugify(text = '') {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'haber';
}

function getArticleSlug(article) {
  return article.slug || slugify(article.title);
}

function articleUrl(article, type = 'article') {
  const date = state.latest?.date || state.activeDate || new Date().toISOString().slice(0, 10);
  const slug = getArticleSlug(article);
  return `article.html?date=${encodeURIComponent(date)}&type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
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
  const href = articleUrl(hero, 'hero');
  els.heroCard.href = href;
  if (els.heroLink) els.heroLink.href = href;
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
  els.newsGrid.innerHTML = articles.map(article => `
    <a class="news-card" href="${articleUrl(article, 'article')}" aria-label="${article.title} haberini oku">
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
      <span class="read-more">Haberi oku</span>
    </a>
  `).join('');
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
    <a class="archive-item" href="index.html?date=${encodeURIComponent(item.date)}">
      <strong>${formatDate(item.date)}</strong>
      <span>${item.articleCount || 0} haber</span>
    </a>
  `).join('');
}

function renderAll() {
  renderTabs();
  renderHero();
  renderSide();
  renderNews();
  renderActions();
  renderSources();
  renderArchive();
  if (els.pageDateLabel) {
    els.pageDateLabel.textContent = state.latest?.date ? `${formatDate(state.latest.date)} yayını` : 'Bugünün yayını';
  }
  els.lastUpdated.textContent = state.latest?.generatedAt ? `Son güncelleme: ${new Date(state.latest.generatedAt).toLocaleString('tr-TR')}` : 'Son güncelleme hazırlanıyor';
}

async function loadDigestForCurrentUrl() {
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');
  state.activeDate = date;
  if (date) return getJson(`data/archive/${date}.json`);
  return getJson('data/latest.json');
}

async function init() {
  try {
    const [latest, archiveIndex] = await Promise.all([
      loadDigestForCurrentUrl(),
      getJson('data/archive-index.json').catch(() => [])
    ]);
    state.latest = latest;
    state.archiveIndex = archiveIndex;
    document.title = latest?.date ? `Dijital Radar - ${formatDate(latest.date)}` : 'Dijital Radar';
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

if (els.refreshArchive) {
  els.refreshArchive.addEventListener('click', async () => {
    state.archiveIndex = await getJson('data/archive-index.json').catch(() => []);
    renderArchive();
  });
}

init();

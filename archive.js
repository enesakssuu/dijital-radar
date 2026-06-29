const state = { items: [], search: '', category: 'Tümü' };
const els = {
  list: document.getElementById('archiveFullList'),
  search: document.getElementById('archiveSearch'),
  category: document.getElementById('archiveCategory')
};

async function getJson(path) {
  const res = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} yüklenemedi`);
  return res.json();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(dateString));
}

function renderCategories() {
  const categories = ['Tümü', ...new Set(state.items.map(item => item.category).filter(Boolean))];
  els.category.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function matches(item) {
  const q = state.search.toLowerCase();
  const categoryOk = state.category === 'Tümü' || item.category === state.category;
  const searchOk = !q || [item.title, item.category, item.date].join(' ').toLowerCase().includes(q);
  return categoryOk && searchOk;
}

function render() {
  const filtered = state.items.filter(matches);
  if (!filtered.length) {
    els.list.innerHTML = '<div class="empty-state">Arşiv kaydı bulunamadı.</div>';
    return;
  }
  els.list.innerHTML = filtered.map(item => `
    <a class="archive-row" href="index.html?date=${encodeURIComponent(item.date)}">
      <div>
        <span>${formatDate(item.date)}</span>
        <strong>${item.title}</strong>
      </div>
      <em>${item.articleCount || 0} haber</em>
    </a>
  `).join('');
}

async function init() {
  try {
    state.items = await getJson('data/archive-index.json');
    renderCategories();
    render();
  } catch (error) {
    els.list.innerHTML = `<div class="empty-state">Arşiv yüklenemedi. Detay: ${error.message}</div>`;
  }
}

els.search.addEventListener('input', event => {
  state.search = event.target.value.trim();
  render();
});

els.category.addEventListener('change', event => {
  state.category = event.target.value;
  render();
});

init();

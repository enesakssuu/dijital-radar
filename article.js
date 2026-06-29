const els = {
  category: document.getElementById('articleCategory'),
  title: document.getElementById('articleTitle'),
  summary: document.getElementById('articleSummary'),
  meta: document.getElementById('articleMeta'),
  body: document.getElementById('articleBody'),
  source: document.getElementById('articleSource'),
  related: document.getElementById('relatedArticles'),
  breadcrumbDate: document.getElementById('breadcrumbDate')
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

function getSlug(article) {
  return article.slug || slugify(article.title);
}

function articleUrl(article, date, type = 'article') {
  return `article.html?date=${encodeURIComponent(date)}&type=${encodeURIComponent(type)}&slug=${encodeURIComponent(getSlug(article))}`;
}

function findArticle(digest, params) {
  const type = params.get('type') || 'article';
  const slug = params.get('slug');
  if (type === 'hero') return { article: digest.hero, type: 'hero' };
  const articles = digest.articles || [];
  const found = articles.find(item => getSlug(item) === slug) || articles[0];
  return { article: found, type: 'article' };
}

function renderArticle(digest, article, type) {
  document.title = `${article.title} - Dijital Radar`;
  els.category.textContent = article.category || 'Gündem';
  els.title.textContent = article.title;
  els.summary.textContent = article.summary || '';
  els.meta.innerHTML = `
    <span>${formatDate(article.publishedAt || digest.date)}</span>
    <span>${article.readingTime || digest.readingTime || '4 dk okuma'}</span>
    <span>${article.sourceName || 'Dijital Radar'}</span>
  `;
  els.breadcrumbDate.textContent = formatDate(digest.date);
  els.breadcrumbDate.href = `index.html?date=${encodeURIComponent(digest.date)}`;
  const paragraphs = article.body?.length ? article.body : [article.summary || 'Bu haber için kısa özet oluşturuldu.'];
  els.body.innerHTML = paragraphs.map(text => `<p>${text}</p>`).join('');
  if (article.url) {
    els.source.href = article.url;
    els.source.style.display = 'inline-flex';
  } else {
    els.source.style.display = 'none';
  }

  const relatedPool = type === 'hero' ? (digest.articles || []) : (digest.articles || []).filter(item => getSlug(item) !== getSlug(article));
  els.related.innerHTML = relatedPool.slice(0, 3).map(item => `
    <a class="related-card" href="${articleUrl(item, digest.date)}">
      <span>${item.category}</span>
      <strong>${item.title}</strong>
      <em>${item.readingTime || '3 dk'}</em>
    </a>
  `).join('');
}

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    const digest = date ? await getJson(`data/archive/${date}.json`) : await getJson('data/latest.json');
    const { article, type } = findArticle(digest, params);
    if (!article) throw new Error('Haber bulunamadı');
    renderArticle(digest, article, type);
  } catch (error) {
    els.title.textContent = 'Haber bulunamadı';
    els.summary.textContent = error.message;
    els.body.innerHTML = '<p>Ana sayfaya dönerek güncel haberleri görüntüleyebilirsin.</p>';
  }
}

init();

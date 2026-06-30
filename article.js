const els = {
  category: document.getElementById('articleCategory'),
  title: document.getElementById('articleTitle'),
  summary: document.getElementById('articleSummary'),
  meta: document.getElementById('articleMeta'),
  body: document.getElementById('articleBody'),
  source: document.getElementById('articleSource'),
  related: document.getElementById('relatedArticles'),
  breadcrumbDate: document.getElementById('breadcrumbDate'),
  sharePreview: document.getElementById('sharePreview'),
  nativeShareButton: document.getElementById('nativeShareButton'),
  copyShareButton: document.getElementById('copyShareButton'),
  whatsappShareButton: document.getElementById('whatsappShareButton'),
  linkedinShareButton: document.getElementById('linkedinShareButton'),
  xShareButton: document.getElementById('xShareButton'),
  shareStatus: document.getElementById('shareStatus')
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


function buildShareText(article, digest) {
  const pageUrl = window.location.href;
  const summary = article.summary ? article.summary.replace(/\s+/g, ' ').trim() : '';
  const source = article.sourceName ? `Kaynak: ${article.sourceName}` : 'Kaynak: Dijital Radar';
  const category = article.category ? `Kategori: ${article.category}` : 'Kategori: Dijital gündem';
  return [
    `Dijital Radar: ${article.title}`,
    '',
    summary,
    '',
    `${category} | ${source}`,
    pageUrl,
    '',
    '#DijitalRadar #DijitalPazarlama #AI'
  ].filter(Boolean).join('\n');
}

function setupShare(article, digest) {
  const url = window.location.href;
  const text = buildShareText(article, digest);
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  if (els.sharePreview) els.sharePreview.textContent = text;
  if (els.whatsappShareButton) els.whatsappShareButton.href = `https://wa.me/?text=${encodedText}`;
  if (els.linkedinShareButton) els.linkedinShareButton.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (els.xShareButton) els.xShareButton.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodedUrl}`;

  if (els.nativeShareButton) {
    els.nativeShareButton.addEventListener('click', async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: article.title, text, url });
          if (els.shareStatus) els.shareStatus.textContent = 'Paylaşım paneli açıldı.';
        } else {
          await navigator.clipboard.writeText(text);
          if (els.shareStatus) els.shareStatus.textContent = 'Paylaşım metni panoya kopyalandı.';
        }
      } catch (error) {
        if (els.shareStatus) els.shareStatus.textContent = 'Paylaşım işlemi tamamlanmadı.';
      }
    });
  }

  if (els.copyShareButton) {
    els.copyShareButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        if (els.shareStatus) els.shareStatus.textContent = 'Paylaşım metni panoya kopyalandı.';
      } catch (error) {
        if (els.shareStatus) els.shareStatus.textContent = 'Kopyalama başarısız oldu. Metni seçerek kopyalayabilirsin.';
      }
    });
  }
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

  setupShare(article, digest);

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

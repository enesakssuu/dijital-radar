import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const DRY_RUN = process.argv.includes('--dry-run');
const TZ = 'Europe/Istanbul';
const MAX_ITEMS = Number(process.env.MAX_ITEMS || 18);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const CATEGORIES = [
  'Dijital Pazarlama',
  'Web Tasarım',
  'AI',
  'SEO / GEO',
  'Araçlar',
  'Sağlık Sektörü'
];

const FEEDS = [
  { name: 'Webrazzi', category: 'Dijital Pazarlama', url: 'https://webrazzi.com/feed/' },
  { name: 'Pazarlamasyon', category: 'Dijital Pazarlama', url: 'https://www.pazarlamasyon.com/feed/' },
  { name: 'Search Engine Land', category: 'SEO / GEO', url: 'https://searchengineland.com/feed' },
  { name: 'Search Engine Journal', category: 'SEO / GEO', url: 'https://www.searchenginejournal.com/feed/' },
  { name: 'Google Ads Blog', category: 'Dijital Pazarlama', url: 'https://blog.google/products/ads-commerce/rss/' },
  { name: 'Think with Google', category: 'Dijital Pazarlama', url: 'https://www.thinkwithgoogle.com/rss.xml' },
  { name: 'TechCrunch AI', category: 'AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'The Verge AI', category: 'AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'Smashing Magazine', category: 'Web Tasarım', url: 'https://www.smashingmagazine.com/feed/' },
  { name: 'Nielsen Norman Group', category: 'Web Tasarım', url: 'https://www.nngroup.com/feed/rss/' },
  { name: 'WordPress Tavern', category: 'Araçlar', url: 'https://wptavern.com/feed' },
  { name: 'Healthcare IT News', category: 'Sağlık Sektörü', url: 'https://www.healthcareitnews.com/rss.xml' },
  { name: 'MobiHealthNews', category: 'Sağlık Sektörü', url: 'https://www.mobihealthnews.com/rss.xml' }
];

function todayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function decodeEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(text = '') {
  return decodeEntities(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeEmoji(text = '') {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  return match ? stripHtml(match[1]) : '';
}

function getLink(block) {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (atom?.[1]) return decodeEntities(atom[1]);
  return getTag(block, 'link');
}

function parseFeed(xml, feed) {
  const itemBlocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m => m[0]);
  const entryBlocks = [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map(m => m[0]);
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  return blocks.slice(0, 8).map(block => {
    const title = removeEmoji(getTag(block, 'title'));
    const url = getLink(block);
    const rawSummary = getTag(block, 'description') || getTag(block, 'summary') || getTag(block, 'content:encoded') || '';
    const publishedAt = getTag(block, 'pubDate') || getTag(block, 'published') || getTag(block, 'updated') || new Date().toISOString();
    return {
      title,
      url,
      summary: removeEmoji(stripHtml(rawSummary)).slice(0, 340),
      publishedAt: new Date(publishedAt).toISOString(),
      sourceName: feed.name,
      category: feed.category
    };
  }).filter(item => item.title && item.url);
}

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'user-agent': 'DijitalRadarBot/1.0 (+https://github.com/enesakssuu/dijital-radar)',
        'accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const xml = await response.text();
    return parseFeed(xml, feed);
  } catch (error) {
    console.warn(`[feed-skip] ${feed.name}: ${error.message}`);
    return [];
  }
}

function rankItems(items) {
  const keywords = [
    'ai', 'artificial intelligence', 'generative', 'google', 'search', 'seo', 'geo', 'overview',
    'ads', 'marketing', 'wordpress', 'figma', 'design', 'ux', 'healthcare', 'hospital', 'patient',
    'automation', 'analytics', 'dashboard', 'conversion', 'privacy'
  ];
  const now = Date.now();
  return items.map(item => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    const keywordScore = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
    const ageHours = Math.max(1, (now - new Date(item.publishedAt).getTime()) / 36e5);
    const freshness = Math.max(0, 72 - ageHours) / 12;
    return { ...item, score: keywordScore + freshness };
  }).sort((a, b) => b.score - a.score);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = (item.url || item.title).toLowerCase().replace(/\?.*$/, '').replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function slugify(text = '') {
  return removeEmoji(text)
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

function addSlugs(digest) {
  if (digest.hero) digest.hero.slug = digest.hero.slug || slugify(digest.hero.title);
  digest.articles = (digest.articles || []).map(article => ({
    ...article,
    slug: article.slug || slugify(article.title)
  }));
  return digest;
}

function fallbackDigest(items, date) {
  const selected = items.slice(0, Math.min(MAX_ITEMS, items.length));
  const heroItem = selected[0] || {
    title: 'Dijital pazarlama, web tasarım ve AI gündemi izleniyor',
    summary: 'Bugünün haber akışı henüz yeterli veri üretmedi. Sistem kaynakları kontrol etmeye devam eder.',
    category: 'AI',
    sourceName: 'Dijital Radar',
    url: ''
  };
  const articles = selected.slice(0, 9).map(item => ({
    title: item.title,
    summary: item.summary || 'Kaynakta öne çıkan gelişme kısa özetlenemedi. Detay için kaynağı açabilirsiniz.',
    body: [
      item.summary || 'Bu haberin detayları kaynak bağlantısında yer alır.',
      'Dijital Radar bu gelişmeyi dijital pazarlama, web tasarım, SEO, AI veya sağlık teknolojileri açısından takip edilmesi gereken başlıklar arasına aldı.'
    ],
    category: item.category,
    sourceName: item.sourceName,
    url: item.url,
    publishedAt: item.publishedAt,
    readingTime: '3 dk'
  }));
  return {
    date,
    generatedAt: new Date().toISOString(),
    readingTime: '6 dk okuma',
    hero: {
      title: heroItem.title,
      summary: heroItem.summary || 'Günün en önemli dijital gündemi otomatik olarak seçildi.',
      body: [
        heroItem.summary || 'Bu başlık günün öne çıkan gelişmesi olarak seçildi.',
        'Hisar Hospital tarafında bu gelişme içerik kalitesi, arama görünürlüğü, landing page dönüşümü ve operasyonel otomasyon başlıklarında değerlendirilebilir.'
      ],
      category: heroItem.category,
      sourceName: heroItem.sourceName,
      url: heroItem.url,
      publishedAt: heroItem.publishedAt
    },
    articles,
    highlights: selected.slice(0, 4).map(item => `${item.category}: ${item.title}`),
    quickNotes: [
      'AI arama deneyimleri SEO ve içerik stratejisini doğrudan etkiliyor.',
      'Landing page içeriklerinde kısa, net ve kaynaklanabilir cevap blokları daha önemli hale geliyor.',
      'WordPress ve otomasyon tarafında tekrar eden işleri veri tabanlı akışlara çevirmek avantaj sağlar.',
      'Sağlık sektöründe AI kullanımı için KVKK, veri kalitesi ve klinik doğruluk mutlaka ayrı ele alınmalı.'
    ],
    hhWebActions: [
      { title: 'Landing page içeriklerini kısa cevap bloklarıyla güncelle', detail: 'SMILE PRO, Tiroid Ablasyonu ve Robotik Cerrahi LP’lerinde AI aramalarına uygun özet alanları test et.' },
      { title: 'GSC’de sıralama var trafik yok raporu çıkar', detail: 'Pozisyonu iyi ama CTR’ı düşük sorguları GEO ve AI Overview etkisi açısından ayrıca incele.' },
      { title: 'Doktor sayfalarına mini FAQ modülü ekle', detail: 'Uzmanlık alanı, tedavi kapsamı ve hasta başvuru sorularını kısa cevaplarla standartlaştır.' },
      { title: 'Haftalık yönetim raporuna AI etkisi bölümü ekle', detail: 'SEO, reklam, web tasarım ve otomasyon tarafındaki gelişmeleri somut aksiyonlarla bağla.' }
    ],
    sources: FEEDS.map(({ name, url, category }) => ({ name, url, category }))
  };
}

function buildPrompt(items, date) {
  const compactItems = items.slice(0, MAX_ITEMS).map((item, index) => ({
    index: index + 1,
    title: item.title,
    summary: item.summary,
    category: item.category,
    sourceName: item.sourceName,
    url: item.url,
    publishedAt: item.publishedAt
  }));
  return `
Sen Dijital Radar adlı Türkçe bir haber bülteni editörüsün. Konular: dijital pazarlama, web tasarım, AI, SEO/GEO, WordPress, reklam teknolojileri ve sağlık sektöründe dijital dönüşüm.

Kurallar:
- Çıktıyı yalnızca geçerli JSON olarak ver.
- Emoji kullanma.
- Türkçe yaz. Kaynak İngilizce olsa bile tüm haber başlıklarını, özetleri, gövde metinlerini ve HH - Web aksiyonlarını Türkçeye çevir.
- Site arayüzünde ve JSON içeriğinde kullanıcıya görünen hiçbir metin İngilizce kalmasın; yalnızca kaynak marka adları orijinal kalabilir.
- Kısa, profesyonel, haber sitesi üslubunda yaz.
- Sağlık iddialarında kesin tıbbi öneri verme; dijital pazarlama ve teknoloji etkisine odaklan.
- HH - Web bölümü için Hisar Hospital web tasarım ve dijital pazarlama ekibinin kullanabileceği somut aksiyonlar üret.
- Haberleri abartma; kaynaklardan gelen başlıklara dayan.

JSON şeması:
{
  "date": "${date}",
  "generatedAt": "ISO_DATE",
  "readingTime": "6 dk okuma",
  "hero": {"title":"", "summary":"", "body":["", ""], "category":"", "sourceName":"", "url":"", "publishedAt":""},
  "articles": [{"title":"", "summary":"", "body":["", ""], "category":"", "sourceName":"", "url":"", "publishedAt":"", "readingTime":"3 dk"}],
  "highlights": ["", "", "", ""],
  "quickNotes": ["", "", "", ""],
  "hhWebActions": [{"title":"", "detail":""}],
  "sources": [{"name":"", "url":"", "category":""}]
}

Kategori değerleri yalnızca şunlardan biri olsun: ${CATEGORIES.join(', ')}.

Haber girdileri:
${JSON.stringify(compactItems, null, 2)}
`;
}

function extractJson(text) {
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI çıktısında JSON bulunamadı');
  return JSON.parse(clean.slice(start, end + 1));
}

async function createAiDigest(items, date) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: buildPrompt(items, date),
      temperature: 0.2
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API hatası: ${response.status} ${detail}`);
  }
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap(o => o.content || []).map(c => c.text || '').join('\n');
  if (!text) throw new Error('OpenAI API boş çıktı döndürdü');
  return extractJson(removeEmoji(text));
}

function normalizeDigest(digest, rawItems, date) {
  const fallback = fallbackDigest(rawItems, date);
  const normalized = {
    ...fallback,
    ...digest,
    date,
    generatedAt: new Date().toISOString(),
    sources: FEEDS.map(({ name, url, category }) => ({ name, url, category }))
  };
  normalized.articles = (normalized.articles || fallback.articles).slice(0, 12).map(article => ({
    ...article,
    title: removeEmoji(article.title || ''),
    summary: removeEmoji(article.summary || ''),
    body: (article.body?.length ? article.body : [article.summary || '']).map(removeEmoji),
    category: CATEGORIES.includes(article.category) ? article.category : 'AI',
    readingTime: article.readingTime || '3 dk'
  }));
  normalized.hero = {
    ...fallback.hero,
    ...normalized.hero,
    title: removeEmoji(normalized.hero?.title || fallback.hero.title),
    summary: removeEmoji(normalized.hero?.summary || fallback.hero.summary),
    body: (normalized.hero?.body?.length ? normalized.hero.body : fallback.hero.body).map(removeEmoji),
    category: CATEGORIES.includes(normalized.hero?.category) ? normalized.hero.category : fallback.hero.category
  };
  normalized.highlights = (normalized.highlights || fallback.highlights).slice(0, 4).map(removeEmoji);
  normalized.quickNotes = (normalized.quickNotes || fallback.quickNotes).slice(0, 4).map(removeEmoji);
  normalized.hhWebActions = (normalized.hhWebActions || fallback.hhWebActions).slice(0, 6).map(action => ({
    title: removeEmoji(action.title || ''),
    detail: removeEmoji(action.detail || '')
  }));
  return addSlugs(normalized);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function updateArchiveIndex(date, digest) {
  const indexFile = path.join(DATA_DIR, 'archive-index.json');
  const previous = await readJson(indexFile, []);
  const nextItem = {
    date,
    title: digest.hero.title,
    category: digest.hero.category || 'Gündem',
    articleCount: digest.articles.length,
    generatedAt: digest.generatedAt
  };
  const next = [nextItem, ...previous.filter(item => item.date !== date)]
    .sort((a, b) => b.date.localeCompare(a.date));
  await writeJson(indexFile, next);
}

async function main() {
  const date = todayKey();
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const fetched = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  const items = dedupe(rankItems(fetched)).slice(0, MAX_ITEMS);
  let digest;
  try {
    const aiDigest = await createAiDigest(items, date);
    digest = normalizeDigest(aiDigest || fallbackDigest(items, date), items, date);
  } catch (error) {
    console.warn(`[ai-fallback] ${error.message}`);
    digest = normalizeDigest(fallbackDigest(items, date), items, date);
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({ date, itemCount: items.length, hero: digest.hero.title }, null, 2));
    return;
  }

  await writeJson(path.join(DATA_DIR, 'latest.json'), digest);
  await writeJson(path.join(ARCHIVE_DIR, `${date}.json`), digest);
  await updateArchiveIndex(date, digest);
  console.log(`Dijital Radar güncellendi: ${date} / ${digest.articles.length} haber`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

# Dijital Radar

Dijital Radar; dijital pazarlama, web tasarım, AI, SEO/GEO, WordPress, reklam teknolojileri ve sağlık sektöründe dijital dönüşüm haberlerini günlük olarak Türkçe özetleyen otomatik haber panelidir.

## Özellikler

- Tüm kullanıcıya görünen haber içerikleri Türkçe üretilir.
- Emoji kullanılmaz.
- Ana sayfa haber kartları doğrudan detay sayfasına gider; popup/modal kullanılmaz.
- Her haber `article.html` üzerinde ayrı detay sayfası olarak açılır.
- Arşiv günlük olarak korunur.
- `archive.html` üzerinden eski yayınlara ulaşılır.
- GitHub Actions her gün otomatik haber güncellemesi yapar.
- OpenAI API varsa haberleri Türkçe editoryal üslupla özetler.
- OpenAI API yoksa fallback veri üretimi çalışır.

## GitHub Pages

Settings > Pages bölümünden:

- Source: Deploy from a branch
- Branch: main
- Folder: /root

Canlı adres örneği:

```text
https://enesakssuu.github.io/dijital-radar/
```

## OpenAI API Secret

Settings > Secrets and variables > Actions > New repository secret:

```text
OPENAI_API_KEY
```

## Manuel çalıştırma

Actions > Dijital Radar Daily Update > Run workflow

## Dosya yapısı

```text
index.html
article.html
archive.html
app.js
article.js
archive.js
styles.css
assets/logo.svg
data/latest.json
data/archive-index.json
data/archive/YYYY-MM-DD.json
scripts/update-news.mjs
.github/workflows/daily-news.yml
```

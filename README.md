# Dijital Radar

Dijital Radar; dijital pazarlama, web tasarım, AI, SEO/GEO, WordPress, reklam teknolojileri ve sağlık sektöründeki dijital gelişmeleri günlük olarak toplayan, AI ile özetleyen ve eski bültenleri arşivde tutan statik haber panelidir.

## Özellikler

- Her gün otomatik haber toplama
- OpenAI API ile Türkçe özet ve kişisel aksiyon üretimi
- Eski bültenleri günlük JSON arşivinde saklama
- Ana sayfa, kategori filtresi, arama ve haber detay modali
- Dijital Radar logosu
- Emoji kullanımı kapalı
- GitHub Pages ile ücretsiz yayınlanabilir yapı

## Dosya yapısı

```text
.
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── logo.svg
├── data/
│   ├── latest.json
│   ├── archive-index.json
│   └── archive/
│       └── 2026-06-29.json
├── scripts/
│   └── update-news.mjs
└── .github/
    └── workflows/
        └── daily-news.yml
```

## Kurulum

Repoya dosyaları yükledikten sonra GitHub Pages ayarını açın.

GitHub üzerinde:

```text
Settings > Pages > Build and deployment > Source: Deploy from a branch
Branch: main
Folder: /root
```

Canlı link yaklaşık birkaç dakika içinde oluşur.

## OpenAI API Secret ekleme

AI özetleme için GitHub reposunda şu secret eklenmelidir:

```text
Settings > Secrets and variables > Actions > New repository secret
Name: OPENAI_API_KEY
Value: kendi OpenAI API anahtarınız
```

Secret eklenmezse sistem yine çalışır, ancak AI özet yerine basit otomatik özet üretir.

İsteğe bağlı model değişikliği için repository variable eklenebilir:

```text
Settings > Secrets and variables > Actions > Variables > New repository variable
Name: OPENAI_MODEL
Value: gpt-4.1-mini
```

## Günlük otomasyon

Workflow her gün Türkiye saatiyle 08:00'de çalışacak şekilde ayarlanmıştır.

```yaml
cron: '0 5 * * *'
```

Türkiye saati UTC+3 olduğu için 05:00 UTC, 08:00 Türkiye saatine denk gelir.

Manuel çalıştırmak için:

```text
Actions > Dijital Radar Daily Update > Run workflow
```

## Lokal test

```bash
npm run check
npm run update
```

`npm run update` komutu yeni `data/latest.json`, `data/archive/YYYY-MM-DD.json` ve `data/archive-index.json` dosyalarını üretir.

## Kaynaklar

Varsayılan RSS kaynakları `scripts/update-news.mjs` içindeki `FEEDS` listesinde tutulur. Yeni kaynak eklemek için bu listeye şu formatta yeni satır ekleyin:

```js
{ name: 'Kaynak Adı', category: 'AI', url: 'https://example.com/feed.xml' }
```

Geçerli kategoriler:

- Dijital Pazarlama
- Web Tasarım
- AI
- SEO / GEO
- Araçlar
- Sağlık Sektörü

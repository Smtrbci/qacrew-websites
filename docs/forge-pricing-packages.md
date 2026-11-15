# Forge fiyatlandırma ve paket kapsamı

Bu dosya, kullanıcının ilettiği `QAcrew-Forge-Pricing-README.md` ve `qacrew-forge-pricing.zip` içindeki tasarımları gerçek Forge akışıyla eşleştiren ödeme öncesi çalışma notudur. Üç aylık/yıllık planın fiyatları kullanıcı tarafından verilmiştir. Tasarım arşivindeki `Solo`, `$19/$79` ve `[X]` yer tutucuları artık kullanılmıyor.

## Fiyatlar ve Paddle price ID’leri

| Plan | Dönem | Price ID | USD | EUR | TRY | Deneme |
|---|---|---|---:|---:|---:|---|
| Starter | Aylık | `pri_01m7dt0d4kfckn1es9602kak1g` | $9 | €8 | ₺149 | 7 gün |
| Starter | Yıllık | `pri_01m7dt0dbeye1gdctcsz6taafy` | $90 | €80 | ₺1.490 | 7 gün |
| Pro | Aylık | `pri_01m7dt0dy77cjwdhnq15r41v2w` | $29 | €25 | ₺499 | 7 gün |
| Pro | Yıllık | `pri_01m7dt0e5zdvwwa9k4498ysnfx` | $290 | €250 | ₺4.990 | 7 gün |
| Team | Aylık | `pri_01m7dt0enhx9qx29gvmvbztrac` | $79 | €69 | ₺1.399 | Yok |
| Team | Yıllık | `pri_01m7dt0ewra0mj0ar69x34ndw0` | $790 | €690 | ₺13.990 | Yok |

Yıllık ücret, ilgili aylık ücretin 12 katına göre yaklaşık %16,7 avantaj sağlar. Fiyat ekranındaki para birimi seçimi bilgilendirme amaçlıdır. Paddle checkout, hesapta etkin para dönüşümü ve ülke fiyatı ayarlarına göre kesin para birimini, vergiyi ve toplamı belirler.

## Önerilen paket kapsamı

| Alan | Starter | Pro | Team |
|---|---|---|---|
| Gereksinim, soru ve senaryo akışı | Dahil | Dahil | Dahil |
| Aylık üretim isteği kotası | 50 | 250 | 1.000 |
| Test planı, koşum ve hata takibi | Dahil | Dahil | Dahil |
| Rapor ve CSV | Dahil | Dahil | Dahil |
| Tek kullanıcı çalışma alanı | Dahil | Dahil | — |
| Birden çok proje ve sürüm takibi | — | Dahil | Dahil |
| GitHub iş kalemi bağlantısı | — | Dahil | Dahil |
| Paylaşılabilir rapor | — | Dahil | Dahil |
| QA / geliştirici / PM rolleri ve ekip portföyü | — | — | Dahil |
| Kullanıcı koltuğu (sahip dahil) | 1 | 1 | 5 |
| Destek kanalı | Topluluk | E-posta | Öncelikli |

Bu ayrım, mevcut Forge menü/işlevleri ve kullanıcının GitHub tercihi temelinde hazırlanmış paket önerisidir. Kullanıcının onayıyla aylık üretim kotası sunucuda workspace başına UTC takvim ayı olarak uygulanır; `FORGE_PLAN` geçerli tier’ı seçer. Koltuk sınırı yapılandırılmış girişleri sahip dahil Starter/Pro’da 1, Team’de 5 kişiyle sınırlar. Ücretli abonelik henüz Paddle webhook’undan otomatik bağlanmaz; test checkout tamamlanınca `FORGE_PLAN` değişmez. Özellik erişimi de plan bazında kapatılmaz. Arşivdeki Excel/PDF, Jira/Azure DevOps ve bazı entegrasyonlar ürün akışında yok; satılabilir özellik gibi gösterilmemelidir.

## Test checkout’ı için gerekli hesap ayarları

1. Paddle Sandbox’ta altı aylık/yıllık fiyatı oluşturun; checkout kodundaki `priceId` değerleri Sandbox kataloğunda mevcut olmalıdır. Paddle Sandbox ve canlı kataloglar ayrıdır.
2. Sandbox için `test_` ile başlayan client-side token’ı Cloudflare Worker’da `PADDLE_CLIENT_TOKEN` değişkeni olarak tanımlayın. Ön yüz token’ı `/api/billing/config` üzerinden sadece Sandbox modunda alır; API secret bu uçta hiçbir zaman yayımlanmaz.
3. Paddle Sandbox’ta varsayılan payment link’i `https://www.qacrew.it/forge/checkout/` olarak belirleyin. İstemcinin devam yönlendirmesi `/forge/checkout/success/`.
4. Test ödemesini Transactions alanından doğrulayın. Paket erişimini açma, hesap oluşturma/bağlama ve iade/iptal yönetimi için imzası doğrulanan webhook ve abonelik kayıt/değiştirme akışı ayrıca tamamlanmalıdır. Başarı sayfası tek başına ödeme veya erişim kanıtı sayılmaz.
5. Canlı moda geçiş, Sandbox testleri, hukuki sayfalar ve yenileme/iptal/iade şartları netleşmeden yapılmamalıdır.

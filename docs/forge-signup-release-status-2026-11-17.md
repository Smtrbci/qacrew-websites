# QAcrew Forge kayıt ve hukuk ekranı — sürüm durumu

**Tarih:** 17 Kasım 2026  
**Kaynak:** `Smtrbci/qacrew-websites`, PR #6 (`0a88f935a68e1a58fed9fcb234d3cdfbe326d19c`)

## Yayına alınanlar

- PR #6 birleştirildi; GitHub'daki Cloudflare Pages ve Workers Build kontrolleri başarılı tamamlandı.
- Kayıt ekranında QA, Developer, PM ve PMO rol seçimi; şifre tekrarı ve şifre gücü ölçütleri bulunuyor.
- Kullanım koşulları, gizlilik ve iade belgelerinin Türkçe/İngilizce sayfaları eklendi. Kapı numarası alanı eklenmedi.
- Sunucu tarafı kayıt, hukuki onay sürümünü ve kayıt anındaki onay bilgisini doğruluyor/kaydediyor.
- E-posta doğrulama kodu ile kayıt başarılı olduğunu kullanıcı bildirdi.

## Henüz üretime hazır olduğu kanıtlanmayanlar

| Konu | Mevcut kanıt / durum | Tamamlamak için gereken |
|---|---|---|
| Paddle canlı tahsilat | Dağıtım notu Sandbox akışını tarif ediyor. | Live token, Live fiyatlar ve ayrı webhook/secret kurup gerçek para almadan önce uçtan uca kontrol et. |
| 7 günlük ücretsiz deneme | Kullanıcının Paddle ekran görüntüsünde Starter aylık ve yıllık fiyatlarında “7 days trial” görünüyor. | Pro için de Paddle fiyat ekranını kontrol et; Live fiyatlar Sandbox'tan ayrı doğrulanmalı. |
| Abonelikten plan yetkisi | Doğrulanmış webhook olayı abonelik durumunu ve planı kaydediyor. | Her fiyat kimliğinin doğru plana bağlandığını ve iptal/gecikmiş ödeme/yenileme davranışını Sandbox'ta doğrula. |
| Team koltukları ve roller | Kayıtta rol seçimi ve Team için beş kişilik hedef mevcut. | Davet/koltuk yönetimi ve gerçek hesaplar arası sunucu izin izolasyonunu doğrula; eksikse ayrı iş olarak geliştir. |
| E-posta/auth yaşam döngüsü | Kullanıcı OTP doğrulamasının başarılı olduğunu bildirdi. | Şifre sıfırlama, kodu yeniden gönderme/süresi, tekrar giriş ve farklı rollerle temel senaryoları kaydet. |
| Altyapı yapılandırması | Dokümantasyon Supabase ve D1 kullanımını belirtiyor. | Cloudflare üretim binding/secret'ları ile migration durumunu panelden doğrula; secret değerlerini rapora koyma. |
| Hukuki yayın | TR/EN sayfaları depoya eklendi ve PR dağıtımı başarılı. | Metin, yürürlük tarihi ve onay ifadelerini yayın öncesi hukuki incelemeden geçir. |
| AI/kota ve entegrasyonlar | Bu PR'ın kapsamı değil. | Gerçek model çağrısı/kota, PDF, Jira ve Azure DevOps durumlarını ayrı ayrı doğrula; hazır değilse pazarlamada etkin özellik gibi göstermeme. |

## Önerilen devam sırası

1. Paddle Sandbox'ta Starter/Pro 7 günlük denemeyi ve plan eşlemesini doğrula.
2. Team planı için davet, koltuk ve rol izolasyonunun ürün kapsamını kararlaştır; mevcutsa iki hesapla doğrula.
3. Canlı ödeme öncesi Cloudflare yapılandırması, webhook senaryoları ve hukuki metin incelemesini tamamla.
4. Sonuçları `PROJE_HAFIZASI.md` ve bu sürüm raporunda güncelle.

> Bu rapor, PR/dağıtım kontrollerini ve kullanıcı bildirimini kaydeder; Paddle panelindeki fiyat deneme ayarlarını, Cloudflare secret değerlerini veya gerçek para ile ödeme akışını bağımsız olarak doğruladığını iddia etmez.

## 17.11 ek inceleme: girişli kullanıcının checkout hatası

Kullanıcının paylaştığı ekranlarda checkout her zaman “Giriş yap / Forge hesabına dön” bağlantısını gösteriyordu ve başlatma sırasında “Hesap doğrulaması yapılamadı” hatası veriyordu. Kod incelemesinde iki neden bulundu:

1. Giriş bağlantısı başlangıç HTML'inde oturum durumundan bağımsız görünüyordu.
2. Checkout intent hesabı yalnızca statik Worker üyelerinde arıyordu; e-posta ile doğrulanmış Supabase kullanıcı profillerini bu hesaba katmıyordu.

Kayıtlı Supabase profilini hesap doğrulamasına dahil etme, giriş bağlantısını yalnız oturum yokken gösterme ve checkout hazırlama sonuçlarını hassas veri olmadan kaydetme düzeltmeleri PR #7 ile birleştirildi. Commit `6d3089ff4e642dc5f1266a75e680eee74dee474a`; Worker 17 Kasım 2026 09:34 UTC'de `811f2b26-7591-42d5-8842-c9cab2db2ef9` sürüm kimliğiyle dağıtıldı. D1 `0002_billing_audit.sql` migration'ı 07:53 UTC'de uygulanmış görünüyor. Checkout ve audit tablo kontrolü tamamlandı; gerçek ödeme akışı bu dağıtımda başlatılmadı.

Audit kaydı hesap e-postası yerine gizli anahtarla üretilen HMAC kimliğini tutar; işlem türü/sonucu, plan, durum kodu ve referans ID saklanır. Kart bilgisi, parola, oturum çerezi, token veya webhook gövdesi yazılmaz. 180 günden eski satırlar sonraki audit yazımında temizlenir.

## 17.11 ek inceleme: Team ve canlı ödeme hazırlığı

### Team daveti uygulama durumu

Team sahibi/Admin, beş koltuk, QA/Developer/PM/PMO daveti, e-postaya bağlı tek kullanımlık bağlantı, yedi günlük sona erme, iptal ve Team aboneliğinin üyelerle paylaşılması yerel kodda uygulandı. Davet bağlantısı e-posta servisi olmadan panelde bir kez gösterilip kopyalanıyor. Güvenlik için veritabanında açık token yerine SHA-256 özeti tutuluyor. İki migration eklendi: Supabase davet/üyelik RPC'leri ve D1 abonelik workspace alanı.

**Bu Team değişiklikleri henüz veritabanlarına uygulanmadı veya dağıtılmadı.** Dağıtım sırası `README-deploy.md` içindeki Team bölümünde. Mevcut projeleri olan bir hesap başka Team çalışma alanına otomatik taşınamaz; davet kabulü bunu reddediyor. Verili hesaplar için taşıma aracı ayrıca gerekecek. Canlı ödeme açılmadı; Paddle Sandbox olarak kalıyor.

- Supabase `forge_users` tablosundaki `workspace_key` benzersizliği yeni migration ile kaldırılacak; migration henüz uygulanmadı.
- `/api/workspace/members` ve davet uçları Team'e katılan üyeleri aynı çalışma alanında gösterecek; bu değişiklikler henüz dağıtılmadı.
- `worker/workspace.js` içinde proje, gereksinim, test, hata, karar ve paylaşım için rol izinleri var. Bunlar tek başına üyelik/çalışma alanı eşlemesi ve koltuk sınırını sağlamıyor.
- Etkin abonelik ve kota artık Team workspace aboneliğini üyeler için kullanacak; D1 migration ve Worker dağıtımı bekliyor. Üyelerin kendi etkin bireysel aboneliği yoksa Team erişimi kullanılacak.
- Paddle yapılandırması Sandbox: `PADDLE_ENV=sandbox`, ön yüz config endpoint'i yalnız `test_` token'ını açıyor ve altı Sandbox price ID kodda sabit. Live ürün/fiyat kimlikleri ile ayrı live webhook destination/secret yok; canlı tahsilat etkinleştirilmemeli.
- Kullanıcı görüntüsünde Starter aylık ve yıllık Sandbox fiyatlarında 7 günlük deneme görünüyordu. Pro fiyatı ve Live katalogdaki deneme süresi doğrulanmış değil.

### Önerilen iş sırası

1. Supabase migration'ını, ardından D1 migration'ını uygula; Worker'ı deploy et.
2. Sandbox'ta iki hesapla paylaşım, davet kabulü, yanlış e-posta/iptal/süre, koltuk sınırı ve rol izinlerini doğrula.
3. Paddle Sandbox'ta Starter/Pro deneme süresini ve plan eşlemesini doğrula; Team için deneme olmadığını teyit et.
4. Live billing öncesi Live ürün/fiyat ID'leri, token ve webhook destination/secret'ı ayrıca kur; satın alma ve hukuki koşulları onayla.

Canlı Paddle hesabı, Live price ID'leri ve yasal satın alma/iade şartları kullanıcı hesabı/paneli gerektirdiğinden yerel kod incelemesi bunların hazır olduğunu kanıtlamaz.

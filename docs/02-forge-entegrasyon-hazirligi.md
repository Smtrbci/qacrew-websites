# QAcrew Forge — PDF ve Jira / Azure DevOps entegrasyon hazırlığı

**Durum:** Teknik hazırlık ve karar kaydı. PDF içe aktarma ve Jira/Azure DevOps bağlantıları henüz uygulanmış değildir; panelin üretim erişimi şu an etkin değildir.

## Kararlaştırılan ilk sürüm kapsamı

- **PDF:** Metni seçilebilir PDF’den yerel tarayıcıda çıkar; kullanıcıya metni gözden geçirip düzenleme olanağı ver; onaylanan metni Forge üretim akışına aktar. İlk sürümde taranmış PDF ve OCR yok.
- **Jira / Azure DevOps:** Kullanıcı bir Jira issue veya Azure DevOps work item seçip içeriğini Forge’a alır; üretilen QA dokümanını onayından sonra aynı kayda ekler. Otomatik yayınlama ve arka plan senkronizasyonu kapsam dışıdır.
- Her iki kaynakta da kullanıcı, içeri aktarılan metni üretimden önce görebilmeli ve düzenleyebilmelidir.

## Mevcut kod ve kısıtlar

- `forge/app/index.html` şu anda `.txt`, `.md`, `.csv` ve `.json` seçimine izin veriyor; PDF kabul edilmiyor.
- `forge/js/app.js` dosyaları tarayıcıdaki `FileReader.readAsText` ile okuyor. PDF metin çıkarımı yok.
- Üretim istemcisi `{ job }` gövdesiyle `/api/generate` çağrısını kullanıyor. Worker, girdi metnini 12.000 karakterle, HTTP gövdesini 64 KB ile sınırlıyor.
- Worker’da `/api/session` ve `/api/generate` bulunuyor; demo kullanıcı üretim yapamıyor. `FORGE_LOGIN_EMAIL` tek kullanıcıyı yapılandırıyor. Mevcut yapıda kullanıcı başına kalıcı entegrasyon hesabı ve bağlantı/token kasası yok.
- Wrangler’da kalıcı kotayı yöneten Durable Object var; D1/R2 tanımlı değil. Kota verisi entegrasyon token’ı saklamak için kullanılmamalı.
- Pazarlama sayfası PDF ve Jira/Azure DevOps’u henüz sunmadığımızı doğru biçimde belirtiyor; bu durum değişmedi.

## Önerilen teknik sıra

### A. Ön koşul: gerçek kullanıcı hesabı ve kalıcı veri katmanı

1. Paylaşılan/sabit tekli giriş yerine kullanıcı kimliği, oturum ve kullanıcıya bağlı kayıtları tasarla.
2. Entegrasyon bağlantılarını kullanıcı/çalışma alanı bazında saklayacak kalıcı veri katmanını seç. OAuth erişim ve yenileme token’ları istemciye dönmemeli; sunucu tarafında şifreli saklanmalı ve loglara yazılmamalı.
3. OAuth `state`, PKCE, callback alan adı allowlist’i, CSRF kontrolleri, erişim iptali ve bağlantıyı kesme akışını tanımla.
4. İş maddesi okuma ve çıktı ekleme ayrı ayrı, asgari yetkilerle yetkilendirilmeli. Dış kayda yazma yalnızca kullanıcının önizleme/onayı sonrasında yapılmalı.

### B. PDF içe aktarma

1. PDF.js’i proje içinde sabitlenmiş/self-host edilen bir istemci bağımlılığı olarak değerlendir; PDF dosyasını varsayılan olarak sunucuya yükleme.
2. Yalnızca dosyanın metnini tarayıcıda çıkar; sayfa sayısı, boş/korumalı PDF, çıkarılamayan metin ve boyut sınırı hatalarını anlaşılır göster.
3. Çıkarılan metni düzenleme alanına doldur; 12.000 karakter sınırını göster ve aşan içeriği kullanıcıya seçtir/kısalttır. Sessizce kırpma yapma.
4. PDF’nin kendisini ve çıkarılan metni kalıcı kaydetme; üretimden önce kullanıcı açıkça kaydetmeyi seçerse mevcut doküman saklama politikasına tabi tut.
5. OCR, görsel/ekli metin çıkarımı ve şifreli PDF desteği ilk sürümde yok.

### C. Jira Cloud

1. Jira Cloud uygulama bağlantısı için OAuth 2.0 authorization code (3LO) kullan; kullanıcıdan Jira parola/API token’ı isteme.
2. İzin kapsamı yalnızca issue/work item okuma ve seçilen kayda QA çıktısı ekleme için gereken asgari izinlerle sınırlandırılmalı.
3. Kullanıcı workspace/proje ve issue anahtarını seçer; Forge başlık, açıklama ve kabul kriterlerini okur.
4. Üretilen doküman Jira’ya yazılmadan önce hedef proje, issue ve gönderilecek içerik kullanıcıya gösterilir.

### D. Azure DevOps

1. Yeni bağlantı Microsoft Entra ID OAuth ile tasarlanmalı. Eski Azure DevOps OAuth uygulama kayıtları Nisan 2025’ten beri kabul edilmiyor ve 2026’da kaldırılma planında; yeni entegrasyon için bu eski yönteme dayanma.
2. Kullanıcı organizasyon, proje ve work item’ı seçer; Forge gerekli alanları okur.
3. Üretilen QA çıktısı aynı work item’a eklenmeden önce kullanıcı onayı istenir; ilk sürümde otomatik senkronizasyon yok.

## Benden/ürün sahibinden beklenenler

### Ürün kararları — henüz eksik

- PDF için azami dosya boyutu ve sayfa sayısı. (İlk sürüm metin seçilebilir PDF olarak kararlaştırıldı.)
- PDF’den çıkarılan içerikte sayfa başlıkları/sayfa numaraları korunmalı mı?
- Jira’ya çıktı hangi biçimde yazılsın: issue yorumu, açıklama alanı, ek dosya, yoksa kullanıcı başına seçim mi?
- Azure DevOps’ta çıktı hangi biçimde yazılsın: discussion comment, work item alanı, ek dosya, yoksa kullanıcı başına seçim mi?
- İlk sürüm yalnızca Jira Cloud ve Azure DevOps Services mi kapsasın? Jira Data Center ve Azure DevOps Server için ayrı kapsam gerekir.
- Bağlantı tek kişisel hesapla mı başlasın, yoksa birden fazla kullanıcı/ortak çalışma alanı baştan gerekli mi?

### Yayın ve hesap ayarları — entegrasyon koduna geçmeden gerekli

- Doğrulanmış HTTPS callback URL ve son production alan adı.
- Atlassian Developer Console’da QAcrew Forge uygulaması, callback ve gereken scopes.
- Microsoft Entra tenant/app kaydı, callback, gerekli delegated permissions ve tenant türü (yalnızca kendi kuruluşun mu, çok kiracılı mı?).
- Sunucu tarafında OAuth client secret’ları ve token şifreleme anahtarı için güvenli secret yönetimi.
- Kullanıcı hesabı ve çalışma alanı kalıcı depolaması seçimi; mevcut `SESSION_SECRET` tek başına bu ihtiyacı karşılamaz.
- Her entegrasyon için yetki iptali, token silme ve bağlantı kesildiğinde veri saklama/silme davranışı.

## Uygulama aşamaları ve kabul ölçütleri

1. **PDF prototipi:** PDF seç, metni çıkar, kullanıcıya göster/düzenlet, boyut/karakter sınırlarını açık göster; sunucuya ham PDF yüklenmediğini doğrula.
2. **Kimlik ve bağlantı temeli:** gerçek kullanıcı hesabı, kalıcı bağlantı kaydı, OAuth callback ve token’ların şifreli saklanması.
3. **Jira okuma/yazma:** bir issue seç, alanları içe al, örnek çıktıyı aynı kayda kullanıcı onayıyla ekle, bağlantıyı kes/iptal et.
4. **Azure DevOps okuma/yazma:** bir work item seç, içeriği al, QA çıktısını onayla ve aynı kayda ekle.
5. **Yayın öncesi:** yetkisiz kullanıcı, süresi dolmuş token, erişilemeyen proje, çok büyük PDF, API hata/zaman aşımı ve bağlantı iptali akışlarını doğrula.

Bu belge hazırlık planıdır; herhangi bir entegrasyonun çalışır, bağlı veya yayına hazır olduğu anlamına gelmez.

## Kaynaklar

- Atlassian: [OAuth 2.0 (3LO) apps](https://developer.atlassian.com/cloud/jira/software/oauth-2-3lo-apps/) ve [Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/).
- Microsoft: [Azure DevOps authentication overview](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/azure-devops-oauth) ve [Microsoft Entra OAuth for Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra-oauth?view=azure-devops).

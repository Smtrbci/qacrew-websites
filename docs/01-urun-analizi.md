# QAcrew Forge — ürün analizi ve yol haritası

## QAcrew Pulse — Test Oturumu Kaydedici

**Durum:** Fikir / erken erişim tanıtımı. Ürün özelliği henüz mevcut değildir. Pazarlama sayfasındaki Pulse alanı örnek görünüm ve geliştirme yol haritası olarak sunulur.

**Ürün fikri:** Testçi Android beta/debug uygulamasını normal biçimde denerken Pulse oturum bağlamında crash, ANR, ekran açılış süresi, yavaş API çağrısı, RAM/FPS ve son adımları kaydetmeyi hedefler. Oturum bitiminde bu verilerin taslak bug raporuna ve performans özetine dönüştürülmesi planlanır. Kapsam beta/debug sürümleriyle sınırlıdır; canlı sürüm hedeflenmez.

| Faz | Kapsam | Durum |
| --- | --- | --- |
| Faz 1 | Log veya crash metnini yapıştırma ve rapor üretme | Geliştiriliyor |
| Faz 2 | Android cihazı bilgisayara bağlayarak ADB üzerinden kayıt | Planlanıyor |
| Faz 3 | Beta sürümler için SDK ve canlı panel | Araştırma |

Faz 3 gizlilik hedefi: Network içerikleri varsayılan olarak maskelenir; kişisel veri toplanmaz. iOS desteği ileride değerlendirilecektir; mevcut yol haritası iOS desteği vaat etmez.


## PDF ve iş takip sistemi entegrasyonları

**Durum:** Hazırlık / kapsam çalışması. PDF içe aktarma ve Jira/Azure DevOps bağlantıları henüz uygulanmamıştır.

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1 | Metin seçilebilir PDF’den tarayıcıda metin çıkarma, kullanıcıya gözden geçirtme; ilk sürümde OCR yok | Hazırlık |
| 2 | Jira issue içeriğini içe alma ve onaylanan QA çıktısını aynı issue’a ekleme | Hazırlık |
| 3 | Azure DevOps work item içeriğini içe alma ve onaylanan QA çıktısını aynı work item’a ekleme | Hazırlık |

Entegrasyonlardan önce gerçek kullanıcı hesabı, kalıcı bağlantı verisi, sunucu tarafında güvenli OAuth token saklama ve HTTPS callback adresi gerekir. Ayrıntılar ve ürün sahibinden beklenen kararlar için [Forge entegrasyon hazırlığı](02-forge-entegrasyon-hazirligi.md) belgesine bakın.

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

# Studio tasarım entegrasyonu — 11 Kasım 2026

Kaynak: Kullanıcının QAcrew-Studio-README1.md ve qacrew-studio-site1.zip paketi.
Hedef: Mevcut işlevleri koruyarak yeni tasarımı qacrew.it üzerinde ana sürüm yapmak.

## Geri dönüş

Önceki GitHub commit: c9642db13a756f3efcdc11b6dd1663a9620f2dfa.
Önceki Cloudflare sürümü: 3daa946e-b76f-4320-b49b-e04797616a1e.
Worker: qacrew-websites. Geri dönüş etiketi: studio-before-2026-11-11-design.

## Değişiklikler

- Business, Forge, Game, Travel, Portfolio ve Asistra için gönderilen sayfa tasarımları; Studio ana sayfasındaki tamamlanmış çeviriler korunur.
- Forge giriş/panel/üretim aracı yeni tipografi, renkler ve responsive kenar menüye uyarlanır. app.js, qa-workflow.js ve Worker API davranışı değiştirilmez; mevcut kayıt anahtarları korunur.
- Ortak TR/EN ve tema tercihleri; gerçek portre ve iki PDF CV; gerçek mailto iletişim akışı; AhaPath hukuk sayfalarının metin/URL'leri korunarak stil güncellenir.
- Asistra ve Travel taslakları yerel olarak kaydedilebilir/silinebilir; örnek etkileşimler açıkça demo etiketlidir. Oyun örneği cevaplara tepki verir.
- Kaydırma animasyonlarının içerik gizlemesi ve etkileşimli oyunun sürekli hareket etmesi giderilir.
- Paket içindeki .html URL'leri mevcut kanonik adreslere yönlendirilir.

## Sınırlar

Bu iş tasarım entegrasyonudur. Mevcut Forge demo kısıtları, gerçek AI üretimi/hesap/abonelik erişimi değişmez. Asistra kanal bağlantısı, mesaj gönderimi, takvim entegrasyonu, Travel rezervasyonları ve ödeme hizmetleri etkinleştirilmez. Yerel taslaklar ekip veya sunucu ile paylaşılmaz. E-posta talebi kullanıcının e-posta uygulamasında taslak açar; otomatik abonelik değildir.

## Doğrulama

Worker testleri: 7/7. Tarayıcı testleri: 29 başarılı, masaüstüne uygulanmayan 1 mobil kontrol atlandı. Chromium masaüstü ve 390px mobil; 12 sayfada yerel bağlantılar, görünüm taşması, JS hataları, dil/tema, CV dosyaları, yerel taslakların korunması, Forge üretim demosu ve test/hata/koşum iş akışları kontrol edildi. Gerçek ücretli model çağrısı yapılmadı.

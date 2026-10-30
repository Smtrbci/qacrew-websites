# QAcrew Game — AhaPath sayfa tasarımı

**Durum:** Yerel tasarım ve uygulama hazır; yayına alınmadı  
**Sayfa:** `/game/`  
**Tasarım tarihi:** 31 Ekim 2026

## Tasarım amacı

QAcrew Game’i Studio panelinden ayrı, AhaPath’ın kendisini tanıtan bir ürün sayfası olarak sunmak. Sayfa oyunun gerçek özelliklerini ve güncel mobil ekranlarını gösterir; geliştirme sürecindeki yenilikler için de günlük alanı sağlar.

## Görsel yön

- QAcrew’in web sitesindeki orman yeşili, açık yeşil ve IBM Plex yazı ailesi korunur.
- AhaPath’ın koyu lacivert arayüzü ve mint vurguları oyun görsellerine taşınır.
- QA çalışma paneli görünümü kullanılmaz; geniş editoryal başlıklar, gerçek telefon ekranı ve anlatı odaklı bölümler kullanılır.
- Süsleme olarak örüntü çizgileri, rota noktaları ve bulmaca dizisi kullanılır.

## Sayfa akışı

1. **Hero:** “Her aşamada yeni bir keşif.” başlığı, oyunun kısa tanıtımı, gerçek oynanış ekranı ve geliştirme durumu.
2. **Ürün özeti:** 50 aşama, 250 bulmaca, 8 dil ve çevrimdışı oynanış.
3. **Oyun fikri:** Sayı ve şekil örüntülerinden başlayan, yeni kurallarla derinleşen oynanış anlatısı.
4. **Özellikler:** İlerledikçe artan zorluk, çevrimdışı oynama ve dil seçenekleri.
5. **Oyun ekranları:** Aşama seçim tasarım önizlemesi ve gerçek oynanış görüntüsü.
6. **Geliştirme günlüğü:** Aşama kartlarından bölüm seçimi ve iOS/Android simülatör ilerlemesi.
7. **Kapanış:** Oyunun gelişimini takip etmeye yönlendiren son alan.

## Responsive davranış

- Masaüstünde hero iki sütun: tanıtım metni ve telefon maketi.
- Mobilde içerik tek sütuna iner; oynanış görseli hero metninin altında görünür.
- Menü 700 px altında tam ekran, kaydırılabilir panel olarak açılır; Escape ve bağlantı seçimi paneli kapatır.
- Oyun ekranları mobilde alt alta, geniş ekranda yan yana dizilir.

## Dosyalar

- `game/index.html` — sayfa yapısı ve Türkçe içerik
- `game/game.css` — renk sistemi, tipografi, bileşenler ve responsive düzen
- `game/game.js` — mobil menü davranışı
- `assets/ahapath/gameplay.png` — gerçek AhaPath oynanış ekranı
- `index.html` — ana QAcrew menüsündeki “Game · AhaPath” bağlantısı

## İçerik doğruluğu

Aşama ve bulmaca sayıları AhaPath proje durum raporundaki **50 aşama / 250 bulmaca** bilgisine göre yazılmıştır. Aşama seçim kartları, eski uygulama görüntüsü yerine açıkça tasarım önizlemesi olarak işaretlenmiştir. Mağaza bağlantısı veya yayında olma iddiası eklenmemiştir.

## Önizleme

Dosya yöneticisinden `game/index.html` açıldığında tarayıcı güvenlik kısıtları CSS ve görseller gibi yan dosyaları yüklemeyebilir. Stil dosyasının yolu `./game.css` olarak ayarlanmıştır; yerel bir HTTP önizlemesinde sayfanın tüm varlıkları aynı kökten sunulmalıdır.

Bu çalışma kaynak koduna eklendi; Git’e commit edilmedi ve canlı siteye deploy edilmedi.

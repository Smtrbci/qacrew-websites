# QAcrew Proje Hafızası

**Güncellendi:** 11 Kasım 2026 · **Sahip:** Samet Arabacı  
Bu dosya karar ve durumu özetler; bağlı belgelerdeki görev metinleri, tek başına tamamlanmış özellik kanıtı sayılmaz.

## 1. Proje ve hedef

QAcrew, Samet Arabacı'nın ürün ailesi ve QA araçları markasıdır. Ana hedef, dağınık ürün girdilerini kullanılabilir QA dokümanlarına ve giderek daha geniş bir test yönetimi akışına dönüştürmektir: **özelliği tanımla → belirsizlikleri netleştir → planla → testi yürüt → hatayı/retest'i izle → sürüm risklerini değerlendir.** Ana kitle QA uzmanları; ayrıca QA ekibi olmayan ürün ekiplerinin PM/PMO'larıdır. Marka alan adı `qacrew.it`; destek e-postası `info@qacrew.it`.

Ürünler/portallar:

- **QAcrew Studio:** ürün ailesinin çatı markası ve ana tanıtım/ürün portalı.
- **QAcrew Forge:** QA dokümanı ve test akışı ürünü; `https://www.qacrew.it/forge/`, uygulama `https://www.qacrew.it/forge/app/`.
- **QAcrew Game — AhaPath:** mobil bulmaca oyunu ve tanıtım sayfaları.
- **QAcrew Travel:** BuduTrip fikrinden türetilen gezi planlama portalı.
- **Asistra:** asistan ürünü; demo/planlama aşaması.
- **Samet Arabacı Portfolio:** kişisel portfolyo; Studio/Forge'dan ayrı gezinme hedefi.

Portfolyo içeriğinde Samet, sağlık teknolojilerinde mobil uygulama testi ve gereksinim analizi yapan QA uzmanı olarak anlatılır. Medilcapark ve Liv mobil uygulamalarını test ediyor; Temmuz'da yenilenen ana uygulama için kapsamlı testler yapmış. Şirket içi Dijital İş mobil uygulaması ve web sürümünün test/senaryo çalışmalarında görevli; Dijital İş farklı departmanları dijitalleştirme ve iş yükünü azaltma amacında, kutucuklardaki alt modüller ayrı projeler. İletişim e-postası `info@qacrew.it`, LinkedIn `https://www.linkedin.com/in/smtrbci/`. Türkçe/İngilizce CV'ler kaynak olarak verilmiş. Mobil portfolyoda portre ortalanmalı ve orantılı küçültülmeli; Studio/Portfolio menüleri Forge mobil menü davranışına uymalı.

## 2. Çok önemli: iki yerel depo ve canlı kaynak

Bu oturumda iki farklı kopya kullanıldı; karıştırılmamalı:

1. **Çalışma alanı:** `/Users/sametarabaci/Documents/ChatGPT/QCrew` — `master` dalı, son görülen commit `696df49` (`SDK: seed iOS sample projects for qacrew-test`). `origin` remote görünmüyor. `src/ui-v2/` tamamen untracked yerel taslak/önizleme klasörüdür; `src/ui-v2/README.md` bunun mevcut çalışan Forge'u değiştirmediğini ve yayına alınmadığını söyler. Bu klasörün içindeki son Studio/Forge/Game/Travel UI fikirlerini otomatik olarak production sayma.
2. **Canlı sitenin kaynak reposu:** `/Users/sametarabaci/Documents/qacrew-website`, `origin https://github.com/Smtrbci/qacrew-websites.git`, `master`. Cloudflare Worker adı `qacrew-websites`, yapılandırma `wrangler.jsonc`, entry `worker/index.js`, statik dosyalar `.` içinden sunuluyor. Son kontrol: `origin/master` ile eşit `68312f3` (`Improve Forge release testing workflow`); yalnız `test-results/.last-run.json` untracked görünüyordu. `.env` ve test verilerini okumadan/taşımadan koru.

**Son yayın (11.11.2026):** `npx --yes wrangler deploy` ile canlı kaynak reposundaki Worker yayımlandı; Cloudflare sürüm kimliği `806cc398-ecfc-428c-8836-024d79ca826f`. `https://www.qacrew.it/forge/`, `/forge/app/` ve `https://qacrew-websites.sametarabacitr.workers.dev/` HTTP `200` verdi. Bu deploy, yukarıdaki `QCrew` çalışma alanındaki untracked `src/ui-v2` taslaklarını yayımlamadı. Sonraki sohbette "son commit", "canlıdaki sürüm" ve "UI-v2 prototipi" eş anlamlı kabul edilmemeli.

## 3. Kesin ürün kararları

### QAcrew Forge

- Dört temel çıktı: test senaryosu, bug raporu, smoke checklist, regresyon seti. Girdiler user story, gereksinim, sürüm notu veya dağınık metin olabilir.
- Doküman dili Türkçe/İngilizce seçilebilir; **arayüz dili ile çıktı dili ayrı tercihlerdir**. EN seçiliyken şablon açıklaması, örnek girdi, sonuç, hata ve panel metni de çevrilmiş olmalı.
- Olmayan iş kuralı uydurulmaz. Doğrulanmış bilgi, önerilen varsayım ve açık soru ayrı gösterilir. Kullanıcı soruları cevaplayabilir veya “Henüz belli değil” seçebilir; planı düzenleyip onaylar.
- Demo/örnek, gerçek kullanıcı verisi ve henüz yapılmamış özellikler net etiketlenir. Sahte AI üretimi, ölçülmemiş tasarruf/başarı oranı veya "yayına hazır" skoru yok.
- İstenen test yönetimi kapsamı: proje/modül/sürüm; yeniden kullanılabilir senaryo kütüphanesi ve sürümden bağımsız senaryo ile değişmez snapshot'lı koşum; etki analizi (yalnız girilen sürüm notu/modül ilişkilerine dayanır); 15/30/60/özel süreli tahmini test planı; platform/cihaz/OS/tarayıcı/uygulama sürümü/ortam bazında ayrı koşum; keşif testi; test-hata-retest bağlantısı; gerçek kayıtlardan tek sayfa/yazdırılabilir sürüm raporu. Kısa test tamamlandı diye ürün geneli test edilmiş sayılmaz.
- Koşum sonuçları `Bekliyor / Geçti / Kaldı / Engellendi`; engel gerekçesi tutulur. Başarısız koşumdan hata açarken kaynak test ve bağlam taşınır, mükerrer kayıt kontrol edilir. Testin geçmesi bağlı hatayı otomatik kapatmaz; açık retest gerekir. Yenilenince kaybolmamalı.
- Ana panel metrikleri gerçek kayıtlardan hesaplanır: toplam test ve durum dağılımı, açık kritik/yüksek hatalar, test edilmemiş kritik akışlar, sorumlular/sıradaki işler. Farklı ortam sonuçları birbirine aktarılmaz.
- UI'da mevcut QAcrew Forge koyu tema ve yeşil vurgusu korunur; mobil, tablet, masaüstü taşma yapmaz. Mevcut doküman/şablon/CSV akışı bozulmamalı. Erişilebilir özel seçim kutuları, metin arkasına düşmeyen dropdown tercih edilir. Test notu zorunlu olarak gösterilecekse en az 10 karakter doğrulanmalı.
- Forge tasarımında tarihsel, ekrana özgü net palet kararı: bej `#F3EDE3` ve lime `#B8E986`, metin siyah; üçüncü vurgu rengi/turuncu istemiyor. Kod panelleri koyu, kod metni açık ve okunaklı olabilir. Animasyon açık/koyu temada da görünür ve mobilde kesilmez; reduced-motion desteklenir. Marka yazımı `QAcrew Forge` (QACrew/Qacrew/QA Crew kullanma).
- Kayıt/giriş durumunu gerçek altyapının durumuna göre anlat. Geçmişte demo girişi ve demo hesabı gösterimi istendi; bu, güvenli production auth kanıtı değildir.

### Forge paketleri ve AI adlandırması

- Plan adları **QAcrew Keşfet, QAcrew Uzman, QAcrew Ekip**; kullanıcıya model sağlayıcı adları/Haiku/Sonnet yerine **Forge AI** denmesi istendi.
- Kararlaştırılan fiyat/kota taslağı: **Keşfet:** ücretsiz, tek seferlik 10 standart + 10 detaylı; **Uzman:** 29 USD/ay, 150 standart + 20 detaylı; **Ekip:** 99 USD/ay, ekipçe 400 standart + 100 detaylı, en fazla 5 kullanıcı. Ekip planının ortak çalışma kabiliyetleri hazır olunca geçerli olduğu açıklanmalı.
- Plan kopyası kullanıcı tarafından sağlandı: Keşfet “İlk testlerini oluştur”, Uzman “Test hazırlığına daha az zaman ayır”, Ekip “Ekibin aynı test düzeninde çalışsın”. Bir üretim bir dokümandır; görüntüleme/düzenleme/indirme kota yemez. Standart günlük odaklı, detaylı daha kapsamlıdır; eksikler tahmin edilmez.
- Paket fiyatları ve kota kararı, ödeme/abonelik sisteminin çalıştığını göstermez. Gerçek ödeme, kota sayacı, hesap katmanı ve AI bağlantısının canlı durumunu kod/Cloudflare yapılandırmasından doğrula.

### Diğer portallar

- **Game:** isim “QAcrew Game”, oyun “AhaPath”; header/logoda sadece `QAcrew Game` yazımı (eski “Game — AhaPath” sekme başlığı/marka istenmiyor). Açık/koyu tema ve TR/EN desteği; son açık renk vurgusu için kullanıcı `#B9C0FF` istedi ve önceki mint/teal (`#7DE3C3`) rengin kullanılmamasını söyledi. Logo renk düzeni sabit; koyu/açık zeminde okunur karşıtlık sağla. Mağaza düğmeleri yayın yokken uyarı/modal göstermeli, sahte indirme olmamalı. Oyun sayfası tanıtım içerikleri, mağazada yayınlandığı iddiası olmamalı.
- **Studio:** ürün kartlarından Forge, Game, Travel, Asistra'ya yönlendirme. Ürün durumları kullanıcı kararıyla: AhaPath **Yayın aşamasında**, Travel **Geliştirme**, Asistra **Demo/planlama**, Forge **Geliştirme**. Bu ifadeleri gerçek dağıtım kanıtı gibi genişletme.
- Eski marka kararlarında resmi QACrew kurumsal logosunun renkleri korunmalı; logo yeniden renklendirilmemeli. Studio/Forge/Portfolio üst markası logo yerine yazı olarak istenen ekranlarda metin kullanılmalı. Studio portalı son istekle karanlık mod varsayılan olmalı; eski üst bildirim “Yeni arayüz önizlemesi…” tüm ekranlardan kaldırılmalı, fakat gerçek uyarı/önizleme bağlamını sessizce gizleme.
- **Travel:** “QAcrew Travel”, BuduTrip uyarlaması; Studio yönlendirmesi, TR/EN, açık/koyu tema; kullanıcı marka adının metin olarak kalmasını, logo simgesi kullanılmamasını ve boş alanların ürünle ilgili görsel tasarımla doldurulmasını istemişti.
- **Pulse:** Forge pazarlama sayfasında yalnız **yakında/erken erişim yol haritası**; mevcut SDK/özellik gibi anlatılmaz, fiyat/SSS'de var olan özellik olarak gösterilmez. Üç aşama: log/crash metnini yapıştırıp rapor (geliştiriliyor), Android ADB (planlanıyor), beta için SDK/canlı panel (araştırma); iOS ileride değerlendirilir. Örnek görünüm yalnız örnek; network maskesi ve kişisel veri notu gelecek Faz 3 hedefidir, mevcut garanti değildir. İlgileniyorum CTA'sı gerçek kayıt servisi yoksa iletişime/mailto'ya gider; sahte başarı yok.

## 4. Teknik durum ve korunacak sınırlar

- Canlı hosting: Cloudflare Workers/Assets (`qacrew-websites`). Doğru deploy projesi `/Users/sametarabaci/Documents/qacrew-website`; rastgele `npm start` ile başka bir app veya `src/ui-v2` yayınlanmaz. Değişiklikten önce `git status`, `git log`, `git remote`, Worker config ve Cloudflare hedefini yeniden kontrol et.
- Çalışma alanındaki `README.md`: QAcrew Studio prototipi Node 18+, `npm start`, `npm test`; `POST /api/generate`; kullanıcı verisi/localStorage ve demo auth sınırları; test özeti 37/37 (28.10.2026). Bu README'nin eski varsayımlarını production gerçekliği olarak kabul etme.
- Workspace commits: son `696df49`; Supabase/Auth, `qacrew-test` projesi, Durable Object quota, Android/iOS QAcrew SDK ve örnek uygulama işleri commit/docs geçmişinde var. `docs/sdk/CODEX-FAZ3A-PANEL.md` Faz 3a için plan/şartnameyi içerir; doküman içindeki “mevcut” tabloları bile canlı uzakta doğrula. SDK, rapor endpointi, ekip izolasyonu, mağaza servisi veya AI işlevi için PASS kanıtı yoksa tamamlandı deme.
- Önceki üretim API şartları: API anahtarı sadece sunucu ortam değişkeninde, repoya/browser'a/log'a girmez; `.env` gitignore'da; istek gövdesi ≤64 KB, input ≤12.000; model JSON çıktısı şema doğrulamalı; timeout ≥120 sn; kullanıcı başına kalıcı günlük kota ve IP hız sınırı. Bunların tamamını gerçek hosting ortamında teyit etmeden production-ready iddiası yok.
- PDF/Jira/Azure DevOps hazırlığı: kullanıcı ilk aşama olarak metin seçilebilir PDF (OCR yok), iş maddesini içe alıp üretilen çıktıyı aynı kayda ekleme akışını seçti. Gerçek OAuth/entegrasyon/bağlantı altyapısı doğrulanmadıysa UI'da çalışan gibi gösterme.
- Çalışma alanında `.env` var: **okuma, kopyalama, rapora koyma, commit etme**. `.env.example` sadece ad/örnek değer içerir. Secrets (Anthropic, Supabase service role, auth token) hafıza dosyasına asla girmez.

## 5. AhaPath hukuki ve mağaza içeriği

- Sayfalar: `/ahapath/privacy/`, `/ahapath/terms/`, `/ahapath/support/`; URL'ler değiştirilmeden UI güncellemesi istendi. Destek: `info@qacrew.it`, doğru görüntülenecek.
- Yayıncı metni: **Samet Arabacı (şahıs işletmesi)**. Genel kitleye hitap eder; yayıncı çocuklara pazarlama yapılmayacağını onayladı. Bunu “yalnızca yetişkinler içindir” şeklinde büyütme.
- Destek yazışmaları sadece talebi yanıtlamak için gerektiği kadar tutulur; ihtiyaç bitince elle silinir. Google Workspace Gmail otomatik silme kapalı; e-posta sağlayıcısındaki silinmiş öğe/Çöp Kutusu 30 gün bilgisi, bizim retention vaadimiz değildir. Saklama süresi vaat etme.
- Cloudflare Workers Observability Free hesapta Disabled görülmüştü. Bu, “hiç log/veri tutulmuyor” genellemesi yapmaya yetmez; diğer operasyonel/güvenlik günlüklerini doğrulanmış sayma.
- Eksik/üretim dışı olarak belirtilenler: bireysel Apple üyeliği, bekleyen AdMob doğrulaması, dağıtılmamış satın alma doğrulama servisi, etkin olmayan Apple Server Notifications/PostgreSQL, belirlenmemiş veri saklama/silme süreleri. Bunları aktifmiş veya production tamamlanmış gibi yazma. Yürürlük tarihi ve hukuk incelemesi onaylanana kadar “Taslak” ve eksik bilgi uyarılarını kaldırma. `qacrew.it` ve HTTPS sayfa URL'leri özel olarak doğrulanmadan App Store Connect'e URL girme/yayınlama adımı yapma.

## 6. Tamamlanan / devam eden / bekleyen

**Son doğrulanmış tamamlanan:** 11.11.2026 Cloudflare Worker dağıtımı ve Forge pazarlama/uygulama URL'lerinin 200 kontrolü (sürüm ID yukarıda). Canlı kaynak reposunda Forge release workflow iyileştirmeleri commit'i mevcuttu.

**Çalışma alanında mevcut ama canlı olduğu kanıtlanmamış:** `src/ui-v2/` altındaki 15 ekran/varlık; `forge-workspace.html` ve `forge-workspace.js` rol odaklı lokal çalışma alanı taslağıdır. README'ye göre localStorage kullanır; gerçek auth/ekip paylaşımı, sunucu depolaması, AI, güvenli dosya depolama, Jira/Azure/TestRail etkin değildir. Bu taslaklar kullanıcı incelemesine göre canlı repo ile birleştirilmelidir; henüz otomatik yayınlama yapma.

**Ürün yönü olarak istenmiş, doğrulanması gereken işler:** gereksinim belirsizlikleri, kritik akış kütüphanesi, etki temelli regresyon, süre planı, çevre/cihaz ayrımı, keşif testi, sürüm raporu; test/bug/retest döngüsü; i18n ve 760px dahil responsive düzen; panel gerçek metrikleri; kalıcı erişim kontrolü; PDF/Jira/Azure entegrasyonları. Son canlı kodda var mı diye her birini incele; konuşmada istenmiş olması tamamlandığı anlamına gelmez.

**Önceki test/inceleme raporundan takip edilecek UX bulguları:** login linkinin form doğrulamadan içeri alması ve `/forge-panel`'in korumasız olması; karakter sayacı ve hazır örnek doldurma; seçilen belge türünün yanlış sonuç vermesi/üretim durumunun sahte görünmesi; durdur düğmesi; panel araması, son doküman açma ve şablon seçimi; sürüm kaydetme bildirimi/tarih; dil/tema tercihlerinin sayfalar arasında kalması; menü öğelerinin dar ekranda kaybolması. `68312f3` “Improve Forge release testing workflow” commit'i görülmüş olsa da her bulguyu tek tek PASS sayma; güncel E2E ve canlı akışla doğrula.

**Polonya erişim teşhisi:** kullanıcının partneri iPhone Safari'de “server stopped responding” gördü. Cloudflare Analytics'te Polonya kaynaklı istekler, `/cdn-cgi/trace`, `/favicon.ico`, CSS/JS görülmüş; bir HTTP `/` isteği 504 iken aynı saniyedeki HTTPS `/` 200 ve varlıklar 200 döndü. Güvenlik Events ekranı yalnız güvenlik/örneklenmiş olayları gösterir; tüm ziyaretçi oturumlarının eksiksiz kaydı değildir. Bu kanıt ülke çapında erişilebilirlik garantisi vermez; yeniden test ederken tam URL'nin HTTPS olduğuna, gerçek kullanıcının IP/ülke/saati ve `www` yönlendirmesine bak.

**Açık:** iki checkout'taki kod farklarının ve production versiyonuyla workspace commit `696df49` ilişkisinin çözülmesi; UI-v2'yi canlıya taşıma kararı/işi; Forge AI ve ödeme/kota durumu; Faz 3a SDK/auth canlı testleri; hukuki eksikler ve saklama kuralları; mağaza URL/yayın adımları.

## 7. Referans dosyalar

- Workspace genel: `README.md`, `docs/01-urun-dokumani.md`, `docs/02-tasarim-sistemi.md`, `docs/03-teknik-mimari.md`, `docs/04-yayina-alma.md`, `docs/05-test-plani.md`.
- SDK: `docs/sdk/01-api-ve-rapor-semasi.md`, `docs/sdk/CODEX-FAZ0.md`, `docs/sdk/CODEX-FAZ3A-PANEL.md`, `docs/sdk/yapay-zeka-modlari.md`; test sonuçları `docs/e2e-results.json`.
- UI-v2: `src/ui-v2/README.md`, `index.html`, `forge.html`, `forge-giris.html`, `forge-panel.html`, `forge-yeni-dokuman.html`, `forge-workspace.html`, `forge-workspace.js`, `game.html`, `travel.html`, `asistra-*.html`, `portfolio.html`; görseller `src/ui-v2/assets/`.
- Production repository: `/Users/sametarabaci/Documents/qacrew-website`; `wrangler.jsonc`, `worker/index.js`, `forge/`, `game/`, `travel/`, `ahapath/`, `e2e/`, `tests/`.
- Sohbette sağlanan önemli kaynaklar (Downloads/Documents): `PORTFOLIO_BRIEF.md`, Türkçe/İngilizce Samet CV PDF'leri, `01-urun-dokumani.md` vb. ürün belgeleri, `qacrew-forge.zip`, `QAcrew-Studio-README.md`, `qacrew-studio-site.zip`, `GAME_TASARIMI.md`, `AhaPath-Project-Status-Report-2026-10-31.md`, `BUDUTRIP_WEBSITE_TASARIMI.md`, `budutrip-site/`, `AhaPath-website-integration-brief.md`, `AhaPath-yayin-oncesi-bilgi-durumu.md`. Herhangi bir dosyanın güncel kopyası elinde yoksa içeriğini uydurma; kullanıcıdan tekrar iste.

## 8. Yeni sohbet için DEVAM TALİMATI

Bu hafıza dosyasını bağlam kabul et ve kullanıcıdan projeyi yeniden anlatmasını isteme. Önce `PROJE_HAFIZASI.md` içindeki **iki repo/canlı kaynak ayrımını** ve son canlı sürüm bilgisini oku. Devam edeceğin işi kullanıcı mesajından belirle; son durum değişmiş olabileceği için ilgili kaynakta `git status`, `git log`, `git remote`, hosting config ve canlı sayfayı salt okunur kontrol et. `.env`/token/anahtarları açma veya çıktılara koyma; untracked taslakları ve test sonuçlarını koru. Dosyadaki kararları uygula, eksik bilgiyi tahmin etme, talep metnini tamamlanmış özellik sanma. Değişikliği mümkün olan doğru repoda yap; test veya deploy gerekirse kapsamı anlatıp sonuçları doğrula. Kullanıcı inceleme/önizleme istediğinde prod'a geçme; açıkça “canlıya al” dediğinde doğru Cloudflare Worker'a yayınla ve URL'leri kontrol et. AhaPath hukuk/mağaza koşullarını ve yerel `src/ui-v2` taslaklarını ayrı tut. Sonunda değişen dosyaları, test/yayın kanıtını ve kalan gerçek eksikleri kısa raporla.

## 9. Tasarım entegrasyonu — 11.11.2026, bu sohbet

Kullanıcı yeni README1/ZIP1 tasarımının mevcut işlevler korunarak ana sürüm yapılmasını ve canlıya alınmasını açıkça onayladı. GitHub deposu `Smtrbci/qacrew-websites` bağlı hesapla doğrulandı. İzole ve güncel entegrasyon kopyası: `/Users/sametarabaci/Documents/ChatGPT/QCrew/production-integration` (`codex/studio-design-integration`). Önceki `/Users/sametarabaci/Documents/qacrew-website` kopyası değiştirilmedi; artık uzaktan geride olabilir.

GitHub `master` commit'i: `c44c006` — Integrate Studio redesign while preserving Forge workflows. Eski kaynak `c9642db` için `studio-before-2026-11-11-design` etiketi GitHub'a gönderildi. Önceki Cloudflare sürümü `3daa946e-b76f-4320-b49b-e04797616a1e`; yeni başarılı yayın `49f3b72a-0646-4e22-9610-c7a0b4e22895` (Worker `qacrew-websites`).

Yeni tasarım: Studio, Business, Forge, Game, Travel, Portfolio, Asistra; Forge uygulamasının giriş/panel/üretim görünümü. Mevcut `forge/js/app.js`, `qa-workflow.js` ve Worker API davranışı değişmedi; kullanıcı kayıt anahtarları korundu. Asistra/Travel demo ekranları eklendi; yerel taslak kaydetme/silme çalışır, gerçek mesaj/rezervasyon/ödeme servisi değildir. Ana sayfadan Business ve Asistra'ya bağlantılar aktif. TR/EN ve tema ortak, CV'ler gerçek PDF, portre mevcut varlık, AhaPath hukuk metinleri ve URL'leri korunur.

Doğrulama: 7/7 Worker testi, 29 başarılı tarayıcı testi ve yalnız mobil için olan 1 desktop skip; son tanıtım/metin değişiklikleri sonrası 12/12 ek tarayıcı kontrolü. Yerel paket bağlantıları ve 12 ekrandaki yatay taşmalar kontrol edildi. Gerçek AI/ücretli model çağrısı, ödeme veya kanal entegrasyonu yapılmadı. Ayrıntılı sürüm notu: `production-integration/docs/studio-design-release-2026-11-11.md`.

Son görsel kontrolde Forge yan menüsünü başlığa hapseden backdrop-filter giderildi; 2 ek masaüstü/mobil gezinme testi geçti. Güncel GitHub master `19f35d6`, son Cloudflare yayın sürümü `79b358a9-a3d9-4994-be17-d1bc4982d6d1`. 13 canlı sayfa HTTP 200; yeni CSS/JS kaynak eşleşmesi, canlı Forge demo girişi/test planı ve Studio→Business İngilizce tercih aktarımı doğrulandı.

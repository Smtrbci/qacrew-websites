# Forge çalışma alanı önizlemesi

11 Kasım 2026 — codex/forge-workflow-preview. Canlı sürüm değiştirilmedi.

## Deneme

`node scripts/preview-server.mjs` ardından http://127.0.0.1:8790/forge/preview/.
QA, geliştirici, PM ve PMO düğmeleri yerel örnek hesapları doldurur. Şifre: `Preview-only-2026!`. Örnek veriler üretimden ayrıdır.

Menü: Panel → Gereksinimler → Senaryolar → Planlar → Koşumlar → Hatalar → Raporlar. Portföy ve yedekleme de mevcuttur.

## Düzeltilen bulgular

1. Sunucuda oturum, üyelik ve rol kontrolü; oturumsuz proje verisi döndürülmez.
2. Düzenlenebilir doküman kaydı, gerçek liste ve sayaç.
3. Platform, çıktı türü, dil ve kapsam seçimlerinin üretime aktarılması.
4. Düzenlenebilir satırlar ve cevaplanabilir eksik bilgi soruları.
5. Doküman sihirbazından bağımsız koşum ekranı.
6–9. Aynı kartta not, kanıt, sonuç ve hata formu; yalnızca Kaldı/Engellendi için 10 karakter not; senaryo önceliğinden hata önemi; birleşik sayaç.
10. Plan başlatma öncesi zorunlu alanların görünür doğrulanması.
11. Ayrı gereksinim, senaryo, plan, koşum ve rapor bölümleri.
12–14. Türkçe/İngilizce durumlar, kararlar ve menüler; Ret kararı; karar sahibi ve zamanı.
15. Dört gerçek doküman türüyle uyumlu tanıtım; plan ve metriklerin kendi ekranlarına yönlendirme. API platform olarak seçilir.
16. Form kontrollerinde erişilebilir etiketler.
17. Dokümanlarda arama, tür filtresi ve sıralama.

## Eklenen akışlar

- Görsel/video/metin kanıtı; toplu geçirme, durum filtresi, devam etme ve Alt+P/F/B/N kısayolları.
- CSV ve XLSX senaryo içe aktarma; onaydan önce taslak inceleme.
- Ayrı hatalar, bana atananlar, oturum gerektiren hata bağlantıları, düzeltilen build ve QA tekrar testi.
- Gereksinim–senaryo–koşum izlenebilirliği; kişi ataması ve süre bütçesi.
- Salt okunur, yedi günlük rapor bağlantısı; HTML indirme ve tarayıcı PDF/yazdırma.
- Çoklu proje portföyü ve sürüm eğilimleri; kanıtları içeren JSON yedeği ve PMO içe aktarma.

## Doğrulama

14 sunucu testi ve masaüstü/mobil toplam 14 uçtan uca tarayıcı testi geçti. Oturum, yetki, kayıtların farklı oturumdan görünmesi, senaryo/plan/koşum, hata düzeltme–tekrar test, karar/paylaşım, Excel ve yedek indirme kontrol edildi. Yayın paketinin dry-run kontrolü başarılı. Gerçek GitHub gönderimi yapılmadı.

## Önizleme sınırları ve yayın hazırlığı

Yerel önizleme gerçek Worker işleyicisini ve dosya destekli depolama benzetimini kullanır. Üretim için WORKSPACE Durable Object migration'ı, FORGE_WORKSPACE_ID, FORGE_USERS_JSON üyeleri ve SESSION_SECRET yapılandırılmalıdır. Önizleme hesapları üretimde açılmamalıdır.

AI anahtarı olmayan önizlemede üretim, açıkça belirtilen kurallı ve düzenlenebilir taslaktır. Gerçek AI çıktısı ve kalite değerlendirmesi bu kontrollerin kapsamında değildir.

GitHub iş kalemi okuma ve hata taslağı açma eklendi. Sunucu üzerinden doğrudan gönderim için GITHUB_REPOSITORY ve yetkili GITHUB_TOKEN gerekir. API davranışı sahte upstream ile test edildi; gerçek hesabın yazma erişimi denenmedi. Jira/Azure için CSV dışa aktarma vardır, doğrudan bağlantı yoktur.

Paylaşılabilir rapor bağlantıları bağlantıya sahip kişilerce okunabilir; ham gereksinimleri ve kanıt dosyalarını içermez. Yerel bağlantılar bu bilgisayar dışından erişilemez. Büyük ekip/yoğun eşzamanlı kullanım için yük testi henüz yapılmadı.

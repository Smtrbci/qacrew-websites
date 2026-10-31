const SITE_CONFIG = { brandName: 'QAcrew' };
const translations = {
  'İçeriğe geç':'Skip to content','Nasıl çalışır?':'How it works','Özellikler':'Features','Örnek rota':'Sample itinerary','Yolculuğu keşfet':'Explore the trip','QAcrew Studio ↗':'QAcrew Studio ↗',
  'Şehri kendi ritminde keşfet':'Explore the city at your own pace','Günlerini planla,':'Plan your days,','şehri yürüyerek':'explore the city on foot','gez.':'with ease.','Otelini ve görmek istediğin yerleri seç.':'Choose your hotel and the places you want to see.','gezini günlere bölsün, her gün için yürüyüş rotanı oluştursun.':'will spread your trip across days and create a walking route for each one.',
  'Nasıl çalıştığını gör':'See how it works','Bir günlük rotayı incele':'Explore a sample day','Otelinden başlar.':'It starts at your hotel.','Günün sonunda yine oteline döner.':'And brings you back at the end of the day.','Senin şehrin':'Your city','Senin seçtiğin duraklar':'Places you choose','ŞEHİRDE KEŞFET':'EXPLORE THE CITY','yürüyüş rotan':'your walking route','Başlangıç ve bitiş':'Start and finish','Otelin: Hotel Suadiye':'Your hotel: Hotel Suadiye','YAVAŞLA':'SLOW DOWN','VE BAK':'AND LOOK','Şehri keşfetmenin daha sakin bir yolu':'A calmer way to explore a city','AŞAĞI KAYDIR':'SCROLL TO EXPLORE',
  'BİR PLAN, DAHA AZ KARMAŞA':'A PLAN WITH LESS FUSS','“Nereye gitsem?”':'“Where should I go?”','sorusunu bırak.':'Let go of the question.','Seyahat listendeki yerleri tek tek günlere yerleştirmek zorunda değilsin. QAcrew Travel, görmek istediklerini ve konakladığın oteli bir araya getirip şehir gezini yürüyüş günlerine dönüştürür.':'You don’t have to sort every place on your travel list into days yourself. QAcrew Travel brings together the places you want to see and your hotel, then shapes them into walking days.',
  'ÜÇ ADIMDA YOLA ÇIK':'THREE STEPS TO GET GOING','Planı kur.':'Make your plan.','Şehre karış.':'Get out and explore.','Gezinin kontrolü sende; rotanın hesabı QAcrew Travel\'da.':'You choose the trip; QAcrew Travel helps organize the route.',
  'Otelini seç':'Choose your hotel','Şehrini ve nerede kaldığını belirle. Her günün başlangıç noktası belli olsun.':'Choose your city and where you’re staying. Give each day a clear starting point.','ŞEHİR + OTEL':'CITY + HOTEL','Görmek istediklerini ekle':'Add places you want to see','Müzeleri, meydanları, parkları ve istersen yeme içme duraklarını seç.':'Pick museums, squares, parks, and any food stops you’d like to include.','YERLER + KÜÇÜK KEŞİFLER':'PLACES + LITTLE DISCOVERIES','GEZİ SÜREN':'TRIP LENGTH','gün':'days','Her güne bir rota':'A route for each day','Günlerini planla':'Plan your days','Kaç günün olduğunu ve güne kaçta başlamak istediğini seç. Planın hazır.':'Choose how many days you have and when you want to start. Your plan is ready.','GÜN GÜN YÜRÜYÜŞ':'WALKING, DAY BY DAY',
  'ROTANIN MANTIĞI':'HOW YOUR ROUTE TAKES SHAPE','Otelinden başla.':'Start at your hotel.','Kendi temponda keşfet.':'Explore at your own pace.','Planın, seçtiğin duraklar ve ayırdığın günler etrafında şekillenir.':'Your plan takes shape around the places you choose and the days you set aside.','01 / BAŞLANGIÇ':'01 / STARTING POINT','Her gün aynı güvenli nokta.':'A familiar starting point each day.','Otelini belirle; günlük planın başlangıç ve dönüş noktasını bilsin.':'Set your hotel as the start and return point for each day.','02 / SEÇİMLER':'02 / YOUR PICKS','Yalnızca görmek istediklerin.':'Only the places you want to see.','Müze, park, sahil veya meydanları kendi seyahat listenden ekle.':'Add museums, parks, waterfronts, and squares from your own travel list.','03 / TEMPO':'03 / YOUR PACE','Gün sayısı senin kararın.':'You decide how many days.','Kaç gün ayıracağını ve güne ne zaman başlayacağını sen belirlersin.':'You choose how many days to plan and when each day begins.','QAcrew Travel tanıtım önizlemesidir; rota görseli temsili bir arayüz çizimidir.':'This is a QAcrew Travel concept preview; the route artwork is an illustrative interface, not a live map.',
  'İSTANBUL · 1. GÜN':'ISTANBUL · DAY 1','Şehir bir harita değil,':'A city is more than a map,','yaşanan bir yol.':'it’s a journey lived.','Güne otelinden başla. Duraklarını sırayla keşfet. İstersen bir müzede oyalan; rota günün ritmine eşlik etsin.':'Start at your hotel and explore your stops in order. Take your time at a museum; let the route follow the rhythm of your day.','Başlangıç':'Start','Keşif durağı':'A place to explore','Günün sonu':'End of day','Otele dönüş rotası':'Route back to your hotel','ÖRNEK ARAYÜZ GÖRSELİ · UYGULAMANIN GERÇEK HARİTASI DEĞİLDİR':'ILLUSTRATIVE INTERFACE · NOT A LIVE MAP','4 gün · Hotel Suadiye çıkışlı':'4 days · starting at Hotel Suadiye','SULTANAHMET':'SULTANAHMET','GÜLHANE PARKI':'GÜLHANE PARK','KENNEDY CAD.':'KENNEDY AVE.','Google Maps':'Illustrative map','1. gün':'Day 1','2. gün':'Day 2','3. gün':'Day 3','1. gün · 1 durak · yürüyüş rotan':'Day 1 · 1 stop · your walking route','Güne buradan başla':'Start your day here','Şehrin hikâyelerine uğra':'Step into the city’s stories','Sonra oteline dön':'Then return to your hotel','BİR GÜN':'ONE DAY','DAHA AZ':'AT A','ACELE':'SLOWER PACE',
  'HER ŞEY YERİNDE, HER ŞEY YOLUNDA':'EVERYTHING IN ITS PLACE, THE DAY IN ITS RHYTHM','Daha çok görmek için değil.':'Not to see more.','Daha güzel gezmek için.':'To travel better.','Yürüyüş odaklı günlük rotalar. Otelinden başlayan plan. Kendi seçtiğin duraklar.':'Walking-focused daily routes. Plans that start at your hotel. Stops you choose.','Şehrin tadını çıkarmaya alan bırakan bir yolculuk.':'A trip that leaves room to enjoy the city.','Yolculuğa dön':'Back to the top','şehir senin':'the city is yours','Şehrin sokaklarında görüşürüz.':'See you out in the city.','Bir yolculuk fikri':'A travel idea',
};
function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-travel-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.travelLang === lang)));
  document.querySelectorAll('.mobile-nav,.nav').forEach((nav) => nav.setAttribute('aria-label', lang === 'en' ? 'Main menu' : (nav.classList.contains('mobile-nav') ? 'Mobil menü' : 'Ana menü')));
  const menuButton = document.querySelector('.menu-toggle');
  if (menuButton) menuButton.setAttribute('aria-label', menuButton.getAttribute('aria-expanded') === 'true' ? (lang === 'en' ? 'Close menu' : 'Menüyü kapat') : (lang === 'en' ? 'Open menu' : 'Menüyü aç'));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('[data-brand]')) { node.nodeValue = SITE_CONFIG.brandName; continue; }
    if (!node.datasetOriginal) node.datasetOriginal = node.nodeValue;
    const original = node.datasetOriginal;
    if (lang === 'tr') { node.nodeValue = original; continue; }
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const key = original.trim();
    node.nodeValue = translations[key] ? leading + translations[key] + trailing : original;
  }
  document.querySelectorAll('[aria-label]').forEach((el) => {
    if (!el.datasetOriginalLabel) el.datasetOriginalLabel = el.getAttribute('aria-label');
    const original = el.datasetOriginalLabel;
    el.setAttribute('aria-label', lang === 'en' ? (translations[original] || original) : original);
  });
  document.title = lang === 'en' ? 'QAcrew Travel — Explore the city on foot' : 'QAcrew Travel — Şehrini yürüyerek keşfet';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = lang === 'en' ? 'Plan your city trip by day and explore on foot. Build a personal itinerary starting and ending at your hotel with QAcrew Travel.' : 'Şehir gezini günlere böl, yürüyüş rotanı kolayca planla. QAcrew Travel ile otelinden başlayan kişisel gezi planını oluştur.';
  try { localStorage.setItem('qacrew-studio-language', lang); } catch (_) {}
}

let language = 'tr';
try { language = localStorage.getItem('qacrew-studio-language') || 'tr'; } catch (_) {}
document.querySelectorAll('[data-travel-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.travelLang)));
setLanguage(language === 'en' ? 'en' : 'tr');

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', !open ? (document.documentElement.lang === 'en' ? 'Close menu' : 'Menüyü kapat') : (document.documentElement.lang === 'en' ? 'Open menu' : 'Menüyü aç'));
  mobileNav.hidden = open;
});
mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

const themeButton = document.querySelector('[data-theme-toggle]');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  themeButton?.setAttribute('aria-label', dark ? (document.documentElement.lang === 'en' ? 'Switch to light theme' : 'Açık temaya geç') : (document.documentElement.lang === 'en' ? 'Switch to dark theme' : 'Koyu temaya geç'));
  themeButton?.setAttribute('title', dark ? (document.documentElement.lang === 'en' ? 'Light theme' : 'Açık tema') : (document.documentElement.lang === 'en' ? 'Dark theme' : 'Koyu tema'));
  if (themeButton) themeButton.innerHTML = dark ? '<span aria-hidden="true">☼</span>' : '<span aria-hidden="true">☾</span>';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15242a' : '#f6f1e9');
  try { localStorage.setItem('qacrew-theme', theme); } catch (_) {}
}
let theme = 'light';
try { theme = localStorage.getItem('qacrew-theme') || 'light'; } catch (_) {}
setTheme(theme === 'dark' ? 'dark' : 'light');
themeButton?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

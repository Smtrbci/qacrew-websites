const button = document.querySelector('.menu-toggle');
const nav = document.querySelector('#game-nav');
const translations = {
  'İçeriğe geç':'Skip to content','Menüyü aç':'Open menu','Menüyü kapat':'Close menu','Game menüsü':'Game menu','Desteklenen diller':'Available languages',
  'Nasıl oynanır':'How to play','Oyun ekranları':'Screenshots','Geliştirme günlüğü':'Dev log','QAcrew Studio’ya dön':'Back to QAcrew Studio',
  'Mobil oyun geliştirme':'Mobile game development','Her aşamada':'At every stage,','yeni bir ':'a new ','Örüntüleri fark et. Mantığını kur. Yolunu aç.':'Spot patterns. Find the logic. Make your way forward.',
  'AhaPath, sayı ve şekil dizilerinden farklı mantık kurallarına uzanan çevrimdışı bir bulmaca oyunu. Her aşama yeni bir fikir, her doğru cevap yeni bir “aha!” anı.':'AhaPath is an offline puzzle game built around number and shape sequences and a range of logic rules. Every stage brings a new idea; every right answer, an “aha!” moment.',
  'Oyunun içinden gör':'See the game','Geliştirme günlüğü ↗':'Dev log ↗','iOS ve Android için geliştiriliyor':'In development for iOS and Android','ŞU AN OYUNDA':'IN THE GAME','Aşama 1 · İlk Işık':'Stage 1 · First Light',
  '50 AŞAMA':'50 STAGES','250 BULMACA':'250 PUZZLES','8 DİL':'8 LANGUAGES','ÇEVRİMDIŞI':'OFFLINE','BİR OYUN · SÜREN BİR YOLCULUK':'A GAME · AN ONGOING JOURNEY',
  'OYUNUN FİKRİ':'THE IDEA','Bir sonraki adımı':'Find the next','sen bul.':'step.','Sayılar, şekiller, yönler ve gizli kurallar… AhaPath’te her bölüm küçük bir keşif. Başlangıçta örüntüyü tanırsın; ilerledikçe yeni kuralları bir araya getirirsin.':'Numbers, shapes, directions, and hidden rules… Every level in AhaPath is a small discovery. Recognize patterns at first, then combine new rules as you progress.',
  'HER BULMACA BİR İPUCU BIRAKIR':'EVERY PUZZLE LEAVES A CLUE','BİR BULMACA NASIL AKAR?':'HOW A PUZZLE UNFOLDS','Fark et.':'Spot it.','Çöz. İlerle.':'Solve. Move on.','Her bölüm tek bir soruyla başlar. Örüntüyü keşfet, seçeneklerden cevabını seç ve yeni bir kurala doğru ilerle.':'Every level starts with one question. Discover the pattern, choose an answer, and move on to a new rule.',
  'Örüntüyü incele':'Study the pattern','Kuralı keşfet':'Find the rule','Cevabını seç':'Choose your answer','Eksik sayıyı tamamla':'Complete the sequence','ÖRNEK OYUN AKIŞI · TASARIM ÖNİZLEMESİ':'SAMPLE GAMEPLAY · DESIGN PREVIEW',
  'İlerledikçe':'A path that','zorlaşan yol.':'grows with you.','50 aşama boyunca yeni bulmaca türleri ve giderek büyüyen örüntülerle karşılaş.':'Discover new puzzle types and increasingly complex patterns across 50 stages.',
  'Her yerde':'Ready to play','oynamaya hazır.':'wherever you are.','İnternet bağlantısı olmadan oyna. İlerlemen cihazında saklanır.':'Play without an internet connection. Your progress stays on your device.','OFFLINE BY DESIGN':'OFFLINE BY DESIGN',
  'Kendi dilinde':'Discover in','keşfet.':'your language.','Türkçe ve İngilizceden İspanyolcaya, Çinceye uzanan 8 dil seçeneği.':'Choose from 8 languages, including Turkish, English, Spanish, and Chinese.','8 LANGUAGE EDITIONS':'8 LANGUAGES',
  'KEŞİF YOLU':'THE JOURNEY','Her beş bölümde':'A new milestone','yeni bir eşik.':'every five levels.','İlk aşamalarda örüntüleri tanı. İlerledikçe birden fazla kuralı birlikte çöz ve sıradaki aşamaların kilidini aç.':'Recognize patterns in the early stages. Later, solve several rules at once and unlock what comes next.',
  'İlk ışık':'First Light','Sayı ve şekillerle mantık kurmaya başla.':'Start reasoning with numbers and shapes.','İLK ADIMLAR':'FIRST STEPS','Yeni kurallar':'New Rules','Farklı örüntüleri bir arada takip et.':'Follow different patterns together.','KEŞİF DERİNLEŞİR':'A DEEPER DISCOVERY','Ustalığa doğru':'Toward Mastery','250 bulmacalık yolun son aşamalarına ilerle.':'Make your way through the final stages of 250 puzzles.','YOLCULUK SÜRÜYOR':'THE JOURNEY CONTINUES','aşama':'stages','bölüm / aşama':'levels / stage','250 bulmaca':'250 puzzles',
  'KENDİ DİLİNDE OYNA':'PLAY IN YOUR LANGUAGE','Keşif,':'Discovery,','her dilde.':'in every language.','AhaPath sekiz dil seçeneğiyle geliyor. Oyun çevrimdışı oynanır; ilerlemen cihazında saklanır.':'AhaPath is planned in eight languages. Play offline, with progress saved on your device.',
  'OYUNDAN GÖRÜNTÜLER':'IN-GAME SCREENSHOTS','Yol, ekranda':'The journey','şekilleniyor.':'takes shape.','AhaPath’in mevcut mobil sürümünden gerçek ekranlar.':'Screens from the current AhaPath mobile build.','AŞAMALAR':'STAGES','5 bölüm':'5 levels','AHA PATH · UI ÖNİZLEMESİ':'AHA PATH · UI PREVIEW','01 / AŞAMA SEÇİMİ · TASARIM ÖNİZLEMESİ':'01 / STAGE SELECT · DESIGN PREVIEW','İlerlemeni takip et, yeni aşamaları aç.':'Track your progress and unlock new stages.','02 / BULMACA':'02 / PUZZLE','Örüntüyü bul. Cevabını seç. Devam et.':'Find the pattern. Choose your answer. Keep going.',
  'GELİŞTİRME GÜNLÜĞÜ':'DEVELOPMENT LOG','Yolculuktan':'Notes from','notlar.':'the journey.','AhaPath’i geliştirirken nelerin değiştiğini buradan paylaşacağım.':'I’ll share what changes as AhaPath takes shape.',
  'EKİM':'OCT','GÜNCELLEME 01':'UPDATE 01','OYUN GELİŞTİRME':'GAME DEVELOPMENT','Aşama seçimi ve mobil sürümler güncellendi.':'Stage selection and mobile builds updated.','Aşama kartlarından doğrudan o aşamanın beş bölümüne geçiş eklendi. Kilitli aşamalar ilerleme sırasını koruyor; aşama adları da ilerledikçe değişen bulmaca türlerini yansıtıyor. Güncel, normal ilerleme sürümü iOS simülatöründe ve Android emülatöründe açıldı.':'Stage cards now open their five levels directly. Locked stages preserve progression, and stage names reflect the puzzle types that appear as you advance. The latest build with normal progression has been launched in both the iOS and Android simulators.',
  'Aktif geliştirme':'In active development','Sıradaki durak?':'What’s next?','Bulmaca içerik incelemesi, oyun akışı ve mağaza hazırlıkları. Yeni gelişmeleri bu günlükte paylaşacağım.':'Puzzle content review, gameplay flow, and store preparation. I’ll share the next updates here.','DEVAM EDİYOR':'IN PROGRESS',
  'Her yolculuk':'Every journey','bir adımla başlar.':'starts with one step.','AhaPath’in gelişimini buradan takip et. Yeni bir keşif ekledikçe bu sayfaya not düşeceğim.':'Follow AhaPath’s development here. I’ll post an update whenever a new discovery is added.','Geliştirme notlarına git':'Read the dev log','QAcrew Studio’ya dön':'Back to QAcrew Studio',
  'Uygulama mağazaları':'App stores','İNDİRMEK İÇİN':'COMING TO','ÇOK YAKINDA':'COMING SOON','Kapat':'Close','AHAPATH · QAcrew GAME':'AHAPATH · QAcrew GAME','Yakında yayınlanıyor':'Coming soon','AhaPath şu anda test ve geliştirme aşamasında. Mağaza sayfaları, oyun yayınlanmaya hazır olduğunda burada yer alacak.':'AhaPath is currently in testing and development. Store pages will be available here when the game is ready to launch.','Test aşamasında · Yayın hazırlığı sürüyor':'In testing · Preparing for launch','Tamam':'Got it'
};
const originalText = new Map();
function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-game-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.gameLang === lang)));
  if (nav) nav.setAttribute('aria-label', lang === 'en' ? 'Game menu' : 'Game menüsü');
  if (button) button.setAttribute('aria-label', button.getAttribute('aria-expanded') === 'true' ? (lang === 'en' ? 'Close menu' : 'Menüyü kapat') : (lang === 'en' ? 'Open menu' : 'Menüyü aç'));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    let value = originalText.get(node);
    if (lang === 'en') for (const [tr, en] of Object.entries(translations)) value = value.replaceAll(tr, en);
    node.nodeValue = value;
  }
  document.querySelectorAll('[data-game-en-html]').forEach(el => {
    if (!el.dataset.gameTrHtml) el.dataset.gameTrHtml = el.innerHTML;
    el.innerHTML = lang === 'en' ? el.dataset.gameEnHtml : el.dataset.gameTrHtml;
  });
  document.querySelectorAll('[aria-label]').forEach(el => {
    if (!el.dataset.originalLabel) el.dataset.originalLabel = el.getAttribute('aria-label');
    let value = el.dataset.originalLabel;
    if (lang === 'en') for (const [tr, en] of Object.entries(translations)) value = value.replaceAll(tr, en);
    el.setAttribute('aria-label', value);
  });
  document.title = lang === 'en' ? 'QAcrew Game — AhaPath' : 'QAcrew Game — AhaPath';
  document.querySelector('meta[name="description"]')?.setAttribute('content', lang === 'en' ? 'AhaPath is an offline mobile puzzle game with 50 stages and 250 logic puzzles. Follow the QAcrew Game development journal.' : 'AhaPath, 50 aşama ve 250 mantık bulmacasıyla çevrimdışı oynanan mobil bir keşif oyunu. QAcrew Game geliştirme günlüğü.');
  try { localStorage.setItem('qacrew-studio-language', lang); } catch (_) {}
}
document.querySelectorAll('[data-game-lang]').forEach(el => el.addEventListener('click', () => setLanguage(el.dataset.gameLang)));
let initialLanguage = 'tr';
try { initialLanguage = localStorage.getItem('qacrew-studio-language') || 'tr'; } catch (_) {}
setLanguage(initialLanguage === 'en' ? 'en' : 'tr');
const storeDialog = document.querySelector('.store-dialog');
document.querySelectorAll('[data-store-notice]').forEach(el => el.addEventListener('click', () => storeDialog?.showModal()));
storeDialog?.querySelector('.dialog-close')?.addEventListener('click', () => storeDialog.close());
storeDialog?.querySelector('.dialog-ok')?.addEventListener('click', () => storeDialog.close());
storeDialog?.addEventListener('click', event => { if (event.target === storeDialog) storeDialog.close(); });
function setMenu(open) {
  button.setAttribute('aria-expanded', String(open));
  const en = document.documentElement.lang === 'en';
  button.setAttribute('aria-label', open ? (en ? 'Close menu' : 'Menüyü kapat') : (en ? 'Open menu' : 'Menüyü aç'));
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}
button.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

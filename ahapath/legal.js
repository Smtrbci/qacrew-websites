(() => {
  const params = new URLSearchParams(location.search);
  const language = params.get('lang') === 'en' ? 'en' : 'tr';
  document.documentElement.dataset.language = language;
  document.documentElement.lang = language;
  const titles = {tr:['AhaPath · Gizlilik Politikası','AhaPath mobil oyunu için gizlilik politikası ve veri işleme bilgileri.'],en:['AhaPath · Privacy Policy','Privacy policy and data-handling information for the AhaPath mobile game.']};
  if (location.pathname.includes('/terms/')) { titles.tr[0]='AhaPath · Kullanım Koşulları'; titles.tr[1]='AhaPath mobil oyununun kullanım koşulları.'; titles.en[0]='AhaPath · Terms of Use'; titles.en[1]='Terms of use for the AhaPath mobile game.'; }
  if (location.pathname.includes('/support/')) { titles.tr[0]='AhaPath · Destek'; titles.tr[1]='AhaPath çevrimdışı mantık bulmaca oyunu için destek. Destek e-postası: info@qacrew.it.'; titles.en[0]='AhaPath · Support'; titles.en[1]='Support for AhaPath, an offline logic puzzle game. Support email: info@qacrew.it.'; }
  document.title = titles[language][0];
  document.querySelector('meta[name="description"]')?.setAttribute('content', titles[language][1]);
  document.querySelectorAll('.language a').forEach(link => {
    const selected = new URL(link.href);
    selected.searchParams.set('lang', link.dataset.language);
    link.href = selected.pathname + selected.search;
    if (link.dataset.language === language) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const email = document.querySelector('meta[name="ahapath-support-email"]')?.content.trim() || '';
  const emailLink = document.querySelector('[data-support-contact]');
  if (emailLink) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailLink.href = 'mailto:' + email;
      emailLink.textContent = email;
      emailLink.removeAttribute('aria-disabled');
      emailLink.removeAttribute('tabindex');
    } else {
      emailLink.removeAttribute('href');
      emailLink.setAttribute('aria-disabled','true');
      emailLink.setAttribute('tabindex','-1');
    }
  }
})();

/* İSTEĞE BAĞLI — gece modu.
   Sitenin geri kalanında seçilen gece modunu AhaPath yasal sayfalarına da taşır.
   Kullanım: bu dosyanın içeriğini mevcut /ahapath/legal.js dosyasının EN SONUNA ekle.
   Sayfaların HTML'i ve metni değişmez. Eklemezsen sayfalar her zaman gündüz modunda açılır. */
(function () {
  function apply() {
    var dark = false;
    try { dark = localStorage.getItem('qs-theme') === '1'; } catch (e) {}
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  apply();
  window.addEventListener('pageshow', apply);
})();

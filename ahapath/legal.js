(() => {
  const params = new URLSearchParams(location.search);
  const language = params.get('lang') === 'en' ? 'en' : 'tr';
  document.documentElement.dataset.language = language;
  document.documentElement.lang = language;
  const titles = {tr:['AhaPath · Gizlilik Politikası Taslağı','AhaPath gizlilik politikası yayın öncesi taslaktır; yayıncı, iletişim ve üretim ayarları doğrulanmalıdır.'],en:['AhaPath · Privacy Policy Draft','AhaPath privacy policy is a pre-publication draft; publisher, contact, and production settings must be confirmed.']};
  if (location.pathname.includes('/terms/')) { titles.tr[0]='AhaPath · Kullanım Koşulları Taslağı'; titles.tr[1]='AhaPath kullanım koşulları yayıncı ve hukukî inceleme bekleyen bir taslaktır.'; titles.en[0]='AhaPath · Terms of Use Draft'; titles.en[1]='AhaPath terms of use are a draft pending publisher and legal review.'; }
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
      emailLink.href = `mailto:${email}`;
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

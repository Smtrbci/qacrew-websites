(() => {
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'tr';
  const labels = {tr:{light:'Açık temaya geç',dark:'Koyu temaya geç'},en:{light:'Switch to light theme',dark:'Switch to dark theme'}};
  const saved = (() => { try { return localStorage.getItem('qacrew-theme'); } catch (_) { return null; } })();
  const fallback = /\/(forge|game)(\/|$)/.test(location.pathname) ? 'dark' : 'light';
  const theme = saved === 'light' || saved === 'dark' ? saved : fallback;
  document.documentElement.dataset.theme = theme;
  const groups = document.querySelectorAll('.language-switch,.lang,.game-language');
  const group = groups[0];
  if (!group) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'portal-theme-toggle'; button.dataset.portalThemeToggle = '';
  button.setAttribute('aria-label', labels[lang()][theme === 'dark' ? 'light' : 'dark']);
  button.title = button.getAttribute('aria-label');
  button.innerHTML = theme === 'dark' ? '<span aria-hidden="true">☼</span>' : '<span aria-hidden="true">☾</span>';
  group.insertAdjacentElement('afterend', button);
  const apply = (next) => {
    document.documentElement.dataset.theme = next;
    const text = labels[lang()][next === 'dark' ? 'light' : 'dark'];
    button.setAttribute('aria-label', text); button.title = text;
    button.innerHTML = next === 'dark' ? '<span aria-hidden="true">☼</span>' : '<span aria-hidden="true">☾</span>';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#0D0C0B' : '#F4F3EE');
    try { localStorage.setItem('qacrew-theme', next); } catch (_) {}
  };
  button.addEventListener('click', () => apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-set-lang="tr"],[data-game-lang="tr"],[data-lang="tr"]')) button.setAttribute('aria-label', labels.tr[document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark']);
    if (event.target.closest('[data-set-lang="en"],[data-game-lang="en"],[data-lang="en"]')) button.setAttribute('aria-label', labels.en[document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark']);
  });
})();

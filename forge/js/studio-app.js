(() => {
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  function theme(value) {
    document.documentElement.dataset.theme = value;
    set('qacrew-theme', value); set('qs-theme', value === 'dark' ? '1' : '0'); set('qs-theme-v2',value === 'dark' ? '1' : '0');
  }
  theme(get('qacrew-theme') || (get('qs-theme') === '0' ? 'light' : 'dark'));
  document.querySelectorAll('[data-app-theme]').forEach(button => button.addEventListener('click', () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
  function language() {
    const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';
    set('qs-language',lang);set('qs-lang',lang === 'en' ? '1' : '0');
    document.querySelectorAll('[data-intro-tr]').forEach(el => el.textContent = lang === 'en' ? el.dataset.introEn : el.dataset.introTr);
  }
  const preferred = get('qs-language');
  if(preferred) document.querySelector('[data-forge-lang="'+preferred+'"]')?.click();
  language(); window.addEventListener('qacrew-language-change',language);
  let opened = false;
  function openRequestedDocument(){
    if (!opened && new URLSearchParams(location.search).has('new') && !document.getElementById('appShell').hidden) {
      opened = true; document.querySelector('[data-open-tool]')?.click();history.replaceState(null,'',location.pathname);
    }
  }
  new MutationObserver(openRequestedDocument).observe(document.getElementById('appShell'),{attributes:true,attributeFilter:['hidden']});
  openRequestedDocument();
})();

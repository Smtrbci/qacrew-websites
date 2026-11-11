(() => {
  'use strict';
  const $ = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key,value) => { try { localStorage.setItem(key,value); return true; } catch { return false; } };
  const en = () => document.documentElement.lang === 'en';
  const t = (tr,eng) => en() ? eng : tr;
  const pair = (tr,eng) => '<span class="tr">'+tr+'</span><span class="en">'+eng+'</span>';
  const theme = $('#qs-theme'), lang = $('#qs-lang');
  function setTheme(){
    if (!theme) return;
    const value = theme.checked ? 'dark' : 'light';
    write('qacrew-theme',value); write('qs-theme',theme.checked?'1':'0');write('qs-theme-v2',theme.checked?'1':'0');
    document.documentElement.dataset.theme = value;
  }
  function preferences(){
    if(theme){theme.checked = (read('qacrew-theme') || (read('qs-theme-v2')==='0'?'light':'dark')) === 'dark';setTheme();}
    const saved=read('qs-language') || (read('qs-lang')==='1'?'en':'tr');
    if(lang){lang.checked=saved==='en';document.documentElement.lang=saved;}
  }
  theme?.addEventListener('change',setTheme);
  lang?.addEventListener('change',()=>{const value=lang.checked?'en':'tr';document.documentElement.lang=value;write('qs-language',value);write('qs-lang',lang.checked?'1':'0');});
  all('[data-lang]').forEach(b=>b.addEventListener('click',()=>write('qs-lang',b.dataset.lang==='en'?'1':'0')));
  preferences();window.addEventListener('pageshow',preferences);
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','studioDialogTitle');
  dialog.innerHTML='<h2 id="studioDialogTitle"></h2><p></p><a href="mailto:info@qacrew.it">info@qacrew.it</a><form method="dialog" style="margin-top:24px"><button>OK</button></form>';
  ($('.qs-root')||document.body).append(dialog);
  function message(title,body){dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=body;dialog.showModal();}
  function unavailable(){message(t('Geliştirme aşamasında','In development'),t('Bu bölüm henüz gerçek hizmete bağlı değil. Bu ekrandaki veriler örnektir. Bilgi için bize yazabilirsiniz.','This section is not connected to a live service yet. The displayed data is illustrative. Contact us for details.'));}
  // Interest forms open an actual email draft; no fictitious subscription success.
  all('form').filter(f=>f!==dialog.querySelector('form') && f.id!=='studio-interest-form' && f.querySelector('input[type=email]') && !f.querySelector('input[type=password]')).forEach(form=>{
    const input=form.querySelector('input[type=email]');input.required=true;
    const note=document.createElement('p');note.className='mut';note.innerHTML=pair('E-posta uygulamanızda bir talep taslağı açılır.','Opens a request draft in your email app.');form.after(note);
    form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())location.href='mailto:info@qacrew.it?subject='+encodeURIComponent(location.pathname.includes('forge')?'Forge Pulse — ilgi talebi':'QAcrew — ilgi talebi')+'&body='+encodeURIComponent(input.value.trim());});
  });
  const panel=$('[data-demo-panel]');
  if(panel){const note=document.createElement('div');note.className='studio-notice';note.innerHTML=pair('Demo / planlama · Örnek veriler. Yerel taslaklar yalnızca bu tarayıcıda saklanır. Gerçek hesap, mesaj gönderimi, rezervasyon ve ödeme etkin değildir.','Demo / planning · Sample data. Local drafts stay in this browser only. Real accounts, messaging, bookings and payments are not enabled.');panel.prepend(note);}
  // Never request a real password for an unconnected service.
  if(location.pathname==='/asistra/giris/'){
    const form=$('form');if(form){form.innerHTML='<p class="p">'+pair('Demo panelini hesap oluşturmadan inceleyin.','Explore the demo panel without creating an account.')+'</p><a class="btn" href="/asistra/app/">'+pair('Demo panelini aç','Open demo panel')+'</a>';}
  }
  const storeKey='qacrew.asistra.drafts.v1';
  function records(key){try{const value=JSON.parse(read(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}}
  if(location.pathname==='/asistra/yeni/'){
    $('#uretim').hidden=true;$('#sonuc').hidden=true;
    const generate=$('a[href="#uretim"]');generate.innerHTML=pair('Yerel taslağı hazırla','Prepare local draft');
    const result=$('#sonuc');
    const render=()=>{const name=$('#ad').value.trim(),info=$('#anlat').value.trim();if(!name||!info){message(t('Eksik bilgi','Missing information'),t('İşletme adını ve açıklamasını doldurun.','Enter a business name and description.'));return;}
      result.replaceChildren();const title=document.createElement('h2');title.textContent=name;const p=document.createElement('p');p.textContent=info;p.style.whiteSpace='pre-wrap';
      const note=document.createElement('p');note.className='mut';note.textContent=t('Yerel taslak; AI eğitimi veya kanal bağlantısı yapılmaz.','Local draft; no AI training or channel connection is performed.');
      const save=document.createElement('button');save.className='btn';save.textContent=t('Taslağı kaydet','Save draft');save.onclick=()=>{const data=records(storeKey);data.push({id:crypto.randomUUID(),name,info,industry:$('#sektor').value});if(write(storeKey,JSON.stringify(data)))location.href='/asistra/app/';else message(t('Kaydedilemedi','Could not save'),t('Tarayıcı depolamasına erişilemiyor.','Browser storage is unavailable.'));};
      result.append(title,p,note,save);result.hidden=false;result.scrollIntoView({block:'center'});
    };generate.addEventListener('click',e=>{e.preventDefault();render();});
  }
  if(location.pathname==='/asistra/app/'){
    const drafts=records(storeKey);if(drafts.length){const section=document.createElement('section');section.className='col';section.id='localDrafts';const h=document.createElement('h2');h.innerHTML=pair('Yerel taslaklar','Local drafts');section.append(h);drafts.forEach(item=>{const card=document.createElement('article');card.className='studio-local-card';const title=document.createElement('h3');title.textContent=item.name;const p=document.createElement('p');p.textContent=item.info;const remove=document.createElement('button');remove.className='btn2';remove.textContent=t('Sil','Delete');remove.onclick=()=>{if(write(storeKey,JSON.stringify(records(storeKey).filter(r=>r.id!==item.id))))card.remove();};card.append(title,p,remove);section.append(card);});panel.append(section);}
    const search=$('input[type=search]');search?.addEventListener('input',()=>{all('article,.studio-local-card').forEach(card=>card.hidden=!card.textContent.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));});
  }
  if(location.pathname==='/travel/partner/'){
    const section=document.createElement('section');section.id='yeni';section.className='card';section.innerHTML='<h2>'+pair('Yerel gezi planı taslağı','Local trip plan draft')+'</h2><form class="studio-demo-form"><label>'+pair('Plan adı','Plan name')+'<input name="title" required maxlength="120"></label><label>'+pair('Duraklar (her satıra bir durak)','Stops (one per line)')+'<textarea name="stops" required rows="4" maxlength="4000"></textarea></label><button class="btn" type="submit">'+pair('Taslağı kaydet','Save draft')+'</button></form><div id="travelDrafts"></div>';panel.append(section);
    const key='qacrew.travel.drafts.v1',list=$('#travelDrafts');
    function render(){list.replaceChildren();records(key).forEach(item=>{const card=document.createElement('article');card.className='studio-local-card';const h=document.createElement('h3');h.textContent=item.title;const p=document.createElement('p');p.textContent=item.stops;p.style.whiteSpace='pre-line';const del=document.createElement('button');del.className='btn2';del.textContent=t('Sil','Delete');del.onclick=()=>{if(write(key,JSON.stringify(records(key).filter(x=>x.id!==item.id))))render();};card.append(h,p,del);list.append(card);});}render();
    section.querySelector('form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,data=records(key);data.push({id:crypto.randomUUID(),title:form.elements.title.value.trim(),stops:form.elements.stops.value.trim()});if(write(key,JSON.stringify(data))){render();form.reset();}else message(t('Kaydedilemedi','Could not save'),t('Tarayıcı depolaması kullanılamıyor.','Browser storage is unavailable.'));};
    all('a[href="#planlar"].btn').forEach(a=>a.href='#yeni');
    $('input[type=search]')?.addEventListener('input',e=>all('#travelDrafts article').forEach(card=>card.hidden=!card.textContent.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase())));
  }
  // The supplied puzzle now responds to each choice.
  all('.opt').forEach((button,index)=>button.addEventListener('click',()=>{let note=$('#puzzleFeedback');if(!note){note=document.createElement('p');note.id='puzzleFeedback';note.className='studio-feedback';note.setAttribute('role','status');button.parentElement.after(note);}note.textContent=index===1?t('Doğru! Her adımda sayı iki katına çıkıyor.','Correct! The number doubles each step.'):t('Tekrar dene: sayılar arasındaki ilişkiye bak.','Try again: look at the relationship between the numbers.');}));
  // Missing demo destinations give an explicit status instead of a dead link.
  all('a[href^="#"]').forEach(link=>{const hash=link.getAttribute('href').slice(1);if(hash && !document.getElementById(hash)){link.addEventListener('click',e=>{e.preventDefault();unavailable();});}});
  if(panel) all('button').filter(button=>!button.closest('dialog') && !button.closest('.studio-demo-form') && !button.closest('.studio-local-card') && !button.closest('#sonuc')).forEach(button=>button.addEventListener('click',()=>unavailable()));
})();

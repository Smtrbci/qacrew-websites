/* QAcrew Forge — uygulama (giriş, panel, üretim aracı) */
(function(){
  "use strict";
  // ---------- helpers ----------
  var $=function(id){return document.getElementById(id)};
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
  function toast(msg){var t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true},2600)}
  function locale(){return document.documentElement.lang==="en"?"en-GB":"tr-TR"}
  function fmtDate(iso){try{return new Date(iso).toLocaleDateString(locale(),{day:"numeric",month:"short",year:"numeric"})}catch(e){return ""}}
  function uid(){return "w"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  var CHECK='<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- config ----------
  var TYPES={
    test:{label:"Test senaryoları",short:"Test senaryosu",desc:"Pozitif, negatif ve sınır değer",tag:"TEST"},
    bug:{label:"Bug raporu",short:"Bug raporu",desc:"Geliştiriciye hazır format",tag:"BUG"},
    smoke:{label:"Smoke checklist",short:"Smoke checklist",desc:"Sürüm öncesi hızlı kontrol",tag:"SMOKE"},
    reg:{label:"Regresyon seti",short:"Regresyon",desc:"Değişen modüllere göre öncelikli",tag:"REG"}
  };
  var PLATS=["Web","iOS","Android","API"];
  var DEPTHS={quick:{label:"Hızlı",desc:"6–8 madde, ana akışlar"},deep:{label:"Detaylı",desc:"10–14 madde, kenar durumlar dahil"}};
  var SAMPLES=[
    {name:"Ödeme akışı (user story)",nameEn:"Payment flow (user story)",type:"test",text:"US-482 Kayıtlı kartla ödeme\nKullanıcı olarak, sepetimdeki ürünler için kayıtlı kartımla ödeme yapabilmek istiyorum.\n\nKabul kriterleri:\n- Kayıtlı kart yoksa kullanıcı yeni kart ekleyebilmeli\n- Ödemede 3D Secure doğrulaması zorunlu\n- Limit yetersizse anlaşılır bir uyarı gösterilmeli\n- Sepet tutarı 0 TL ise Öde butonu pasif olmalı\n- Başarılı ödemeden sonra sipariş onay ekranı ve e-posta gelmeli",textEn:"US-482 Saved card payment\nAs a user, I want to pay for items in my cart with a saved card.\n\nAcceptance criteria:\n- If no card is saved, the user can add a new card\n- 3D Secure verification is required for payment\n- Show a clear warning when the card limit is insufficient\n- Disable Pay when the cart total is zero\n- After payment, show order confirmation and send an email"},
    {name:"Dağınık Slack mesajı",nameEn:"Unstructured Slack message",type:"bug",text:"@ali ödeme sayfası yine bozuk, bazen açılmıyor. androidde oldu sanırım dün akşam. wifi'dan mobil veriye geçince oluyor gibi. tekrar denedim düzeldi sonra yine oldu. geri tuşu da çalışmadı o an. uygulama son sürüm 3.8.2",textEn:"@alex the payment page is broken again and sometimes will not open. It happened on Android yesterday evening. It seems related to switching from Wi-Fi to mobile data. It worked after retrying, then failed again. The back button did not respond. App version 3.8.2."},
    {name:"Sürüm notları v3.9",nameEn:"Release notes v3.9",type:"smoke",text:"v3.9 sürüm notları\n- Giriş ekranı yeniden tasarlandı\n- Face ID / parmak izi ile giriş eklendi\n- Bildirim izni artık ilk açılışta değil, ilk siparişten sonra isteniyor\n- Ödeme SDK'sı 5.2'ye güncellendi\n- Profil fotoğrafı yükleme hatası düzeltildi",textEn:"v3.9 release notes\n- Redesigned sign-in screen\n- Added Face ID / fingerprint sign-in\n- Notification permission is requested after the first order, not at first launch\n- Updated payment SDK to 5.2\n- Fixed profile photo upload"},
    {name:"Sprint değişiklikleri",nameEn:"Sprint changes",type:"reg",text:"Sprint 24'te değişenler:\n- Sepet servisi yeniden yazıldı (adet güncelleme, ürün silme)\n- Kampanya motoru: kampanya + kupon birlikte kullanılabilir hale geldi\n- Adres formu: yeni il/ilçe listesi\n- Ödeme ekranında küçük UI değişikliği\nDokunulmayanlar: profil, favoriler, bildirim ayarları",textEn:"Sprint 24 changes:\n- Rewrote cart service (update quantity, remove item)\n- Promotion engine now supports a promotion and coupon together\n- Address form has a new province/district list\n- Minor payment screen UI change\nUnchanged: profile, favorites, notification settings"}
  ];

  // ---------- state ----------
  var state={email:null,demo:false,works:[],examples:[],runs:[],type:"test",plats:["Web"],depth:"quick",current:null,filter:"all",viewing:null,selectedRelease:"all"};
  var store={mode:"local",col:null};
  var sample=null, downloads=null;

  // ---------- Sunucu tarafında üretim ve paketli örnekler ----------
  var CFG=window.QACREW_CONFIG||{};
  function httpSample(){
    return {json:async function(opts){
      opts=opts||{};var r,d=null;
      if(state.demo)throw {code:"demo_read_only",message:"Salt okunur erişimdesiniz; belge üretimi etkin değildir."};
      try{r=await fetch("/api/generate",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({job:currentJob}),signal:opts.signal})}
      catch(e){throw {code:e&&e.name==="AbortError"?"cancelled":"upstream_error"}}
      try{d=await r.json()}catch(e){}
      if(!r.ok||!d)throw {code:(d&&d.error)||"upstream_error",message:d&&d.message};
      if(opts.onText)opts.onText({text:JSON.stringify(d.result),delta:""});
      return d.result;
    }};
  }
  // ---------- capabilities ----------
  var capsReady=(async function(){
    sample=httpSample();
    if(CFG.examplesUrl)fetch(CFG.examplesUrl).then(function(r){return r.json()}).then(function(list){state.examples=list.map(function(x){x.example=true;return x});renderAll()}).catch(function(){});
    renderNotice();
  })();
  function localKey(){return "qacrew.works."+(state.email||"anon")}
  function loadLocal(){try{state.works=JSON.parse(lsGet(localKey())||"[]")}catch(e){state.works=[]}}
  function saveLocal(){lsSet(localKey(),JSON.stringify(state.works))}
  function runKey(){return "qacrew.runs."+(state.email||"anon")}
  function loadRuns(){try{state.runs=JSON.parse(lsGet(runKey())||"[]")}catch(e){state.runs=[]}}
  function saveRuns(){lsSet(runKey(),JSON.stringify(state.runs));window.dispatchEvent(new Event("qacrew-runs-updated"))}
  function renderNotice(){
    var n=$("storeNote"),msgs=[];
    var en=document.documentElement.lang==="en";
    if(state.demo)msgs.push(en?"Sample project: real generation is off. You can run the sample plan locally in this browser.":"Örnek proje: gerçek üretim kapalı. Örnek planı bu tarayıcıda yerel olarak yürütebilirsiniz.");
    else if(store.mode!=="db")msgs.push(en?"Documents and execution records are stored in this browser only; they are not shared with a team.":"Dokümanlar ve yürütme kayıtları yalnızca bu tarayıcıda tutulur; ekiple paylaşılmaz.");
    n.hidden=!msgs.length;n.textContent=msgs.join(" ");
  }

  // ---------- login ----------
  function nameFrom(email){var n=(email.split("@")[0]||"").split(/[._-]/)[0]||"Kullanıcı";return n.charAt(0).toLocaleUpperCase("tr-TR")+n.slice(1)}
  function signIn(em,isDemo){
    state.email=em;state.demo=isDemo===true;lsSet("qacrew.session",em);if(state.demo)lsSet("qacrew.demo-preview","1");else lsDel("qacrew.demo-preview");
    document.dispatchEvent(new CustomEvent("qacrew-auth-changed",{detail:{email:em}}));
    if(store.mode!=="db")loadLocal();loadRuns();
    $("login").hidden=true;$("appShell").hidden=false;
    var nm=nameFrom(em);
    $("avatarBtn").textContent=nm.charAt(0);$("whoName").textContent=nm;$("whoMail").textContent=em;
    updateWelcome(nm);
    showTab("panel");renderAll();renderNotice();
  }
  var demoLoginForm=$("demoLoginForm"),demoLoginError=$("demoLoginError");
  if(demoLoginForm)demoLoginForm.addEventListener("submit",function(e){
    e.preventDefault();
    var email=$("demoEmail").value.trim().toLowerCase(),password=$("demoPassword").value;
    if(email!=="demo@qacrew.it"||password!=="qacrew2026"){
      demoLoginError.textContent=document.documentElement.lang==="en"?"Use the demo email and password shown below.":"Demo için aşağıda gösterilen e-posta ve şifreyi kullanın.";
      demoLoginError.hidden=false;return;
    }
    demoLoginError.hidden=true;signIn(email,true);
  });
  var fillDemoCredentials=$("fillDemoCredentials");
  if(fillDemoCredentials)fillDemoCredentials.addEventListener("click",function(){$("demoEmail").value="demo@qacrew.it";$("demoPassword").value="qacrew2026";$("demoPassword").focus()});
  function updateWelcome(name){
    var h=new Date().getHours(),en=document.documentElement.lang==="en";
    $("hello").textContent=(en?(h<12?"Good morning, ":h<18?"Good afternoon, ":"Good evening, "):(h<12?"Günaydın, ":h<18?"İyi günler, ":"İyi akşamlar, "))+name;
    $("today").textContent=new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"});
  }
  window.addEventListener("qacrew-language-change",function(){
    updateCount();renderOpts();
    if(state.email){updateWelcome(nameFrom(state.email));renderAll();renderNotice();if(!$('tool').hidden&&state.viewing)showResult(state.viewing,true);if(state.activeRun){var active=findRun(state.activeRun);if(active)renderExecution(active)}}
  });
  $("logoutBtn").onclick=async function(){try{await fetch("/api/session",{method:"DELETE",credentials:"same-origin"})}catch(e){}lsDel("qacrew.session");lsDel("qacrew.demo-preview");state.email=null;state.demo=false;$("userMenu").hidden=true;$("appShell").hidden=true;$("login").hidden=false};
  $("avatarBtn").onclick=function(e){e.stopPropagation();var m=$("userMenu");m.hidden=!m.hidden;this.setAttribute("aria-expanded",String(!m.hidden))};
  document.addEventListener("click",function(e){if(!e.target.closest(".avatar-wrap")){$("userMenu").hidden=true;$("avatarBtn").setAttribute("aria-expanded","false")}});

  // ---------- tabs ----------
  function showTab(t){
    document.querySelectorAll(".tab").forEach(function(b){b.setAttribute("aria-selected",String(b.dataset.tab===t))});
    ["panel","docs","tpl","qa"].forEach(function(v){$("view-"+v).hidden=v!==t});
    window.scrollTo(0,0);
  }
  document.querySelectorAll(".tab").forEach(function(b){b.onclick=function(){showTab(b.dataset.tab)}});

  // ---------- dashboard ----------
  function countItems(w){var r=w.result||{};if(w.type==="bug")return r.bug?1:0;return (r.items||[]).length}
  function countHigh(w){var r=w.result||{};if(w.type==="bug")return r.bug&&/kritik|yüksek/i.test(r.bug.severity||"")?1:0;return (r.items||[]).filter(function(i){return /yüksek|kritik/i.test(i.priority||"")}).length}
  function renderStats(){
    var en=locale()==="en-GB",versions=Array.from(new Set(state.runs.map(function(r){return r.version||"Unspecified"}))).sort();
    if(state.selectedRelease!=="all"&&versions.indexOf(state.selectedRelease)<0)state.selectedRelease="all";
    $("releaseFilter").innerHTML='<option value="all">'+(en?"All releases":"Tüm sürümler")+'</option>'+versions.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>'}).join("");
    $("releaseFilter").value=state.selectedRelease;
    var runs=state.runs.filter(function(r){return state.selectedRelease==="all"||r.version===state.selectedRelease}),cases=runs.reduce(function(a,r){return a.concat(r.cases||[])},[]);
    var counts={pending:0,passed:0,failed:0,blocked:0};cases.forEach(function(c){counts[c.status]=(counts[c.status]||0)+1});
    var openBugs=runs.reduce(function(a,r){return a.concat(r.bugs||[])},[]).filter(function(b){return b.status!=="closed"&&(/critical|high|kritik|yüksek/i.test(b.severity||""))});
    var S=[
      {k:en?"Total tests":"Toplam test",v:cases.length,d:en?"in selected release":"seçili sürümde"},
      {k:en?"Passed":"Geçti",v:counts.passed,d:en?"recorded results":"kaydedilmiş sonuç"},
      {k:en?"Failed":"Kaldı",v:counts.failed,d:en?"needs triage":"inceleme bekliyor"},
      {k:en?"Blocked / waiting":"Engellendi / bekliyor",v:counts.blocked+" / "+counts.pending,d:en?"never counted as passed":"başarılı sayılmaz"}
    ];
    $("stats").innerHTML=S.map(function(s){return '<div class="stat"><span class="k">'+s.k+'</span><span class="v">'+s.v+'</span><span class="d">'+s.d+'</span></div>'}).join("");
    var critical=cases.filter(function(c){return /critical|high|kritik|yüksek/i.test(c.priority||"")&&(c.status==="pending"||c.status==="blocked")});
    var owners=Array.from(new Set(runs.map(function(r){return r.assignee||r.startedBy||"—"}))).join(", ")||"—";
    $("releaseRisks").innerHTML='<div><b>'+(en?"Open high / critical bugs":"Açık yüksek / kritik hatalar")+'</b><strong>'+openBugs.length+'</strong></div><div><b>'+(en?"Untested high-priority tests":"Test edilmemiş yüksek öncelikli akışlar")+'</b><strong>'+critical.length+'</strong></div><div><b>'+(en?"Owners":"Sorumlular")+'</b><span>'+esc(owners)+'</span></div><div><b>'+(en?"Next action":"Sıradaki işler")+'</b><span>'+esc(critical.length?(en?"Run pending critical paths":"Bekleyen kritik akışları yürütün"):(openBugs.length?(en?"Verify open bugs":"Açık hataları doğrulayın"):(en?"No recorded action":"Kayıtlı iş yok")))+'</span></div>'+renderRunList();
  }
  function thumb(w){
    var r=w.result||{},rows="";
    if(w.type==="bug"){
      var sev=(r.bug&&r.bug.severity)||"";var c=/kritik|yüksek/i.test(sev)?"c-high":/orta/i.test(sev)?"c-mid":"c-low";
      rows='<div class="r"><span class="ln"></span><span class="dt '+c+'"></span></div><div class="r"><span class="ln s"></span></div><div class="r"><span class="ln"></span></div><div class="r"><span class="ln"></span></div><div class="r"><span class="ln s"></span></div>';
    }else{
      (r.items||[]).slice(0,5).forEach(function(i){
        var p=i.priority||"",c=/yüksek|kritik/i.test(p)?"c-high":/orta/i.test(p)?"c-mid":/düşük/i.test(p)?"c-low":"c-acc";
        rows+=w.type==="smoke"?'<div class="r"><span class="dt c-low" style="width:12px;height:12px;border-radius:3px"></span><span class="ln"></span></div>':'<div class="r"><span class="ln s"></span><span class="ln"></span><span class="dt '+c+'"></span></div>';
      });
    }
    return '<div class="thumb" aria-hidden="true"><div class="tt"><span>'+TYPES[w.type].tag+'</span><span>'+countItems(w)+(w.type==="bug"?(locale()==="en-GB"?" reports":" rapor"):(locale()==="en-GB"?" items":" madde"))+'</span></div>'+rows+'</div>';
  }
  function card(w){
    return '<button class="card" type="button" data-work="'+esc(w.id)+'"'+(w.example?' data-ex="1"':'')+'>'+thumb(w)+
      '<div class="card-body"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill p-acc">'+esc(TYPES[w.type].short)+'</span>'+(w.example?'<span class="pill p-mute">Örnek</span>':'')+(w.platforms||[]).slice(0,2).map(function(p){return '<span class="pill p-mute">'+esc(p)+'</span>'}).join("")+'</div>'+
      '<h3>'+esc(w.title||"Adsız doküman")+'</h3><div class="card-meta"><span>'+esc(w.project||"Genel")+'</span><span>'+fmtDate(w.createdAt)+'</span></div></div></button>';
  }
  var ADD='<button class="card-add" type="button" data-open-tool><span class="plus"><svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>Yeni ekle</button>';
  function renderGrids(){
    var recent=state.works.slice(0,7);
    $("recentGrid").innerHTML=(recent.length?"":'<div class="empty">Henüz kaydedilmiş dokümanınız yok. Bir user story yapıştırın, QAcrew test senaryolarını üretsin.</div>')+recent.map(card).join("")+ADD;
    var ex=state.examples;$("exNote").hidden=!ex.length;$("exGrid").innerHTML=ex.map(card).join("");
    var f=state.filter,list=state.works.filter(function(w){return f==="all"||w.type===f});
    $("docsGrid").innerHTML=(list.length?"":'<div class="empty">Bu türde doküman yok.</div>')+list.map(card).join("")+ADD;
    var en=locale()==="en-GB",typeNames=en?{test:"Test cases",bug:"Bug report",smoke:"Smoke checklist",reg:"Regression suite"}:null;
    var fl=[["all",en?"All":"Tümü"]].concat(Object.keys(TYPES).map(function(k){return [k,en?typeNames[k]:TYPES[k].label]}));
    $("filters").innerHTML=fl.map(function(x){var n=x[0]==="all"?state.works.length:state.works.filter(function(w){return w.type===x[0]}).length;return '<button class="fchip" type="button" data-filter="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+x[1]+' · '+n+'</button>'}).join("");
  }
  function renderTpl(){
    $("tplGrid").innerHTML=Object.keys(TYPES).map(function(k){var t=TYPES[k];return '<div class="tpl"><span class="pill p-acc" style="align-self:flex-start">'+t.tag+'</span><h3 style="font-size:19px">'+t.label+'</h3><p>'+t.desc+'. Girdiyi verin, seçenekleri belirleyin, QAcrew dokümanı üretsin.</p><button class="btn btn-ghost" type="button" data-open-tool="'+k+'">Bu şablonla başla</button></div>'}).join("");
  }
  function renderAll(){if(!state.email)return;ensureSampleRun();renderStats();renderGrids();renderTpl()}
  $("releaseFilter").addEventListener("change",function(){state.selectedRelease=this.value;renderStats()});
  window.addEventListener("qacrew-runs-updated",function(){loadRuns();renderStats()});
  function ensureSampleRun(){
    if(!state.demo||state.runs.length||!state.examples.length)return;
    var doc=state.examples.find(function(w){return w.type==="test"});if(!doc)return;
    state.runs.push(makeRun(doc,{version:"v3.9 · örnek",environment:"Örnek ortam",assignee:"Demo kullanıcısı",sample:true}));saveRuns();
  }
  function makeRun(w,meta){
    var items=w.type==="smoke"?(w.result.items||[]).map(function(x,i){return {id:"SM-"+String(i+1).padStart(3,"0"),scenario:x.check,preconditions:"Belirtilmedi",steps:[x.check],expected:x.note||"Kontrolü doğrula",priority:x.priority||"Orta"}}):(w.result.items||[]);
    return {id:uid(),docId:w.id||null,title:w.title,project:w.project||"Genel",type:w.type,version:meta.version||"Belirtilmedi",platform:(w.platforms||[]).join(", ")||"Belirtilmedi",environment:meta.environment||"Belirtilmedi",assignee:meta.assignee||"",sample:meta.sample===true,startedBy:state.email,startedAt:new Date().toISOString(),cases:items.map(function(i){return {id:i.id,scenario:i.scenario||i.check,preconditions:i.preconditions||"Belirtilmedi",steps:i.steps||[i.check||i.scope||"Kontrol et"],expected:i.expected||i.note||i.reason||"Beklenen sonuç belirtilmemiş",priority:i.priority||"Orta",status:"pending",actual:"",blockedReason:"",executedBy:"",executedAt:null,history:[],bugId:null}}),bugs:[]};
  }
  function renderRunList(){
    if(!state.runs.length)return "";
    return '<div class="run-list"><h3>'+(locale()==="en-GB"?"Recent test runs":"Son test yürütmeleri")+'</h3>'+state.runs.slice().reverse().slice(0,5).map(function(r){var cs=r.cases||[],done=cs.filter(function(c){return c.status!=="pending"}).length;return '<button class="run-link" type="button" data-run-view="'+esc(r.id)+'"><b>'+esc(r.title)+(r.sample?' · '+(locale()==="en-GB"?"Sample project":"Örnek proje"):"")+'</b><span>'+esc(r.version)+' · '+done+"/"+cs.length+' '+(locale()==="en-GB"?"handled":"tamamlanan")+'</span></button>'}).join("")+'</div>';
  }
  document.addEventListener("click",function(e){
    var o=e.target.closest("[data-open-tool]");if(o){$("userMenu").hidden=true;openTool(o.getAttribute("data-open-tool")||null);return}
    var c=e.target.closest("[data-work]");if(c){var id=c.dataset.work,w=(c.dataset.ex?state.examples:state.works).find(function(x){return x.id===id});if(w)openSaved(w);return}
    var f=e.target.closest("[data-filter]");if(f){state.filter=f.dataset.filter;renderGrids()}
    var rv=e.target.closest("[data-run-view]");if(rv){var run=findRun(rv.dataset.runView);if(run)openRun(run)}
  });

  // ---------- tool: compose ----------
  function setStep(n){document.querySelectorAll("#stepper span").forEach(function(s){var k=+s.dataset.s;s.className=k===n?"on":k<n?"done":""})}
  function stage(name){["compose","gen","result"].forEach(function(s){$("stage-"+s).hidden=s!==name});$("tool").scrollTop=0}
  function renderOpts(){
    $("typeOpts").innerHTML=Object.keys(TYPES).map(function(k){return '<button class="opt" type="button" data-type="'+k+'" aria-pressed="'+(state.type===k)+'"><b>'+TYPES[k].label+'</b><small>'+TYPES[k].desc+'</small></button>'}).join("");
    $("platOpts").innerHTML=PLATS.map(function(p){return '<button class="fchip" type="button" data-plat="'+p+'" aria-pressed="'+(state.plats.indexOf(p)>-1)+'" style="min-height:40px">'+p+'</button>'}).join("");
    $("depthOpts").innerHTML=Object.keys(DEPTHS).map(function(k){return '<button class="opt" type="button" data-depth="'+k+'" aria-pressed="'+(state.depth===k)+'"><b>'+DEPTHS[k].label+'</b><small>'+DEPTHS[k].desc+'</small></button>'}).join("");
    $("samples").innerHTML=SAMPLES.map(function(s,i){return '<button class="fchip" type="button" data-sample="'+i+'">'+esc(locale()==="en-GB"?(s.nameEn||s.name):s.name)+'</button>'}).join("");
  }
  $("tool").addEventListener("click",function(e){
    var t=e.target.closest("[data-type]");if(t){state.type=t.dataset.type;renderOpts();return}
    var p=e.target.closest("[data-plat]");if(p){var v=p.dataset.plat,i=state.plats.indexOf(v);if(i>-1){if(state.plats.length>1)state.plats.splice(i,1)}else state.plats.push(v);renderOpts();return}
    var d=e.target.closest("[data-depth]");if(d){state.depth=d.dataset.depth;renderOpts();return}
    var s=e.target.closest("[data-sample]");if(s){var smp=SAMPLES[+s.dataset.sample];$("inputText").value=locale()==="en-GB"?(smp.textEn||smp.text):smp.text;state.type=smp.type;updateCount();renderOpts();$("composeErr").hidden=true}
  });
  function updateCount(){var en=locale()==="en-GB",n=$("inputText").value.length;$("charCount").textContent=n.toLocaleString(locale())+(en?" / 12,000 characters":" / 12.000 karakter");$("charCount").style.color=n>12000?"var(--fail)":""}
  $("inputText").addEventListener("input",updateCount);
  function readFile(f){
    if(!f)return;
    if(f.size>200000){showComposeErr("Dosya çok büyük. 200 KB'tan küçük bir metin dosyası seçin.");return}
    var r=new FileReader();
    r.onload=function(){$("inputText").value=String(r.result).slice(0,12000);$("dropText").textContent=f.name+" yüklendi";updateCount();$("composeErr").hidden=true};
    r.onerror=function(){showComposeErr("Dosya okunamadı. Düz metin (.txt, .md) bir dosya deneyin.")};
    r.readAsText(f);
  }
  $("fileIn").addEventListener("change",function(){readFile(this.files[0])});
  var drop=$("drop");
  ["dragenter","dragover"].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add("over")})});
  ["dragleave","drop"].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove("over")})});
  drop.addEventListener("drop",function(e){readFile(e.dataTransfer.files[0])});
  function showComposeErr(m){var el=$("composeErr");el.textContent=m;el.hidden=false}

  var lastFocus=null;
  function openTool(type){
    lastFocus=document.activeElement;
    if(type&&TYPES[type])state.type=type;
    state.viewing=null;renderOpts();stage("compose");setStep(1);
    $("generationNotice").textContent=state.demo?(locale()==="en-GB"?"Sample project: real generation is off. The button shows a ready-made sample; your input is not sent.":"Örnek proje: gerçek üretim kapalı. Düğme hazır örnek sonucu gösterir; girdiniz gönderilmez."):(locale()==="en-GB"?"Choose the document language independently from the interface language.":"Doküman dilini arayüz dilinden bağımsız seçebilirsiniz.");
    $("genBtn").firstChild.textContent=state.demo?(locale()==="en-GB"?"Show sample output":"Örnek çıktıyı göster"):(locale()==="en-GB"?"Generate":"Üret");
    $("composeErr").hidden=true;$("tool").hidden=false;document.body.style.overflow="hidden";
    setTimeout(function(){$("inputText").focus()},30);
  }
  function closeTool(){
    if(ctl){ctl.abort();ctl=null}
    $("tool").hidden=true;document.body.style.overflow="";
    if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }
  $("closeTool").onclick=closeTool;
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("tool").hidden&&$("stage-gen").hidden)closeTool()});
  $("inputText").addEventListener("focus",function(){setStep(1)});
  $("typeOpts").addEventListener("click",function(){setStep(2)});

  // ---------- tool: generate ----------
  // Üretim promptu yalnızca Worker içinde oluşturulur.
  var currentJob=null;
  var STEPS={
    test:["Girdi okunuyor","Kabul kriterleri ayrıştırılıyor","Senaryolar yazılıyor","Önceliklendiriliyor","Doküman hazırlanıyor"],
    bug:["Mesaj okunuyor","Ortam ve adımlar çıkarılıyor","Beklenen ve gerçekleşen ayrılıyor","Eksik bilgiler belirleniyor","Rapor hazırlanıyor"],
    smoke:["Sürüm notları okunuyor","Riskli alanlar belirleniyor","Kontroller yazılıyor","Sıralanıyor","Liste hazırlanıyor"],
    reg:["Değişiklikler okunuyor","Bağımlı akışlar eşleniyor","Setler oluşturuluyor","Önceliklendiriliyor","Plan hazırlanıyor"]
  };
  var ctl=null,timer=null;
  function startGenUI(){
    var steps=STEPS[state.type],t0=Date.now(),idx=0;
    $("genTitle").textContent=TYPES[state.type].label+" üretiliyor";
    $("genSub").textContent="Belge üretimi şu anda etkin değildir.";
    $("genChars").textContent="Sunucu yanıtı bekleniyor";
    function paint(){$("genSteps").innerHTML=steps.map(function(s,i){var c=i<idx?"ok":i===idx?"on":"";return '<li class="'+c+'"><span class="b">'+(i<idx?CHECK:"")+'</span>'+s+'</li>'}).join("")}
    paint();
    clearInterval(timer);
    timer=setInterval(function(){
      var sec=Math.floor((Date.now()-t0)/1000);$("genTime").textContent=sec+" sn";
      var target=Math.min(steps.length-1,Math.floor(sec/9));
      if(target>idx){idx=target;paint()}
    },500);
    return function(n){if(n){$("genChars").textContent=n.toLocaleString("tr-TR")+" karakter yazıldı";if(idx<steps.length-1){idx=steps.length-1;paint()}}};
  }
  function errCopy(c){
    if(c==="demo_read_only")return document.documentElement.lang==="en"?"The demo account can only view examples; real generation is disabled.":"Salt okunur erişimdesiniz; belge üretimi etkin değildir.";
    return ({not_granted:"Üretim için izin verilmedi. İzin vermeden yeni doküman üretilemez.",
      sampling_disabled:"Üretim servisi şu an kapalı",
      rate_limited:"Günlük deneme hakkın doldu, yarın tekrar dene",
      session_expired:"Oturumunuzun süresi doldu. Yeniden giriş yapıp tekrar deneyin.",
      prompt_too_large:"Girdi çok uzun. Metni kısaltıp tekrar deneyin.",
      refused:"Bu girdi için doküman üretilemedi. Girdiyi değiştirip tekrar deneyin.",
      invalid_json:"Sunucu yanıtı okunamadı. Yeniden üretmeyi deneyin.",
      empty_completion:"Sunucu boş yanıt döndü. Girdiyi biraz daha açıklayıcı yazıp tekrar deneyin.",
      demo_read_only:"Salt okunur erişimdesiniz; belge üretimi etkin değildir."})[c]||"Üretim sunucusuna ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.";
  }
  async function generate(){
    if(state.demo){
      var demoOutput=state.examples.find(function(w){return w.type===state.type});
      if(!demoOutput){showComposeErr(document.documentElement.lang==="en"?"A sample output for this type is not available yet.":"Bu çıktı türü için henüz örnek sonuç yok.");return}
      demoOutput=Object.assign({},demoOutput,{example:true,documentLanguage:$("docLanguage").value||"tr"});state.viewing=demoOutput;showResult(demoOutput,true);return;
    }
    if(!sample){showComposeErr(document.documentElement.lang==="en"?"Document generation is currently unavailable.":"Belge üretim servisi şu anda etkin değil.");return}
    var text=$("inputText").value.trim();
    if(text.length<20){showComposeErr("Biraz daha ayrıntı gerekiyor: en az 20 karakterlik bir girdi yazın veya örnek seçin.");$("inputText").focus();return}
    if(text.length>12000){showComposeErr("Girdi 12.000 karakteri geçemez.");return}
    await capsReady;
    if(!sample){showComposeErr("Üretim servisi şu an kapalı");return}
    $("composeErr").hidden=true;
    var job={type:state.type,plats:state.plats.slice(),depth:state.depth,project:$("projName").value.trim(),input:text,language:$("docLanguage").value};currentJob=job;
    stage("gen");setStep(3);
    var onLen=startGenUI();
    ctl=new AbortController();
    try{
      var res=await sample.json({signal:ctl.signal,cache:false,onText:function(u){onLen(u.text.length)}});
      clearInterval(timer);ctl=null;
      if(!res||typeof res!=="object")throw {code:"invalid_json"};
      state.current={id:null,type:job.type,platforms:job.plats,depth:job.depth,documentLanguage:job.language,project:job.project,input:job.input,title:String(res.title||TYPES[job.type].label).slice(0,90),summary:String(res.summary||""),result:res,createdAt:new Date().toISOString(),saved:false};
      showResult(state.current,false);
    }catch(e){
      clearInterval(timer);ctl=null;
      stage("compose");setStep(2);
      if(e&&e.code==="cancelled"){showComposeErr("Üretim durduruldu.");return}
      showComposeErr(errCopy(e&&e.code));
    }
  }
  $("genBtn").onclick=generate;
  $("stopBtn").onclick=function(){if(ctl)ctl.abort()};

  // ---------- tool: result ----------
  function prClass(p){return /critical|high|kritik|yüksek/i.test(p||"")?"p-high":/medium|orta/i.test(p||"")?"p-mid":"p-low"}
  function renderResult(w){
    var r=w.result||{};
    if(w.type==="test"){
      return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Senaryo</th><th>Adımlar</th><th>Beklenen sonuç</th><th>Öncelik</th></tr></thead><tbody>'+
        (r.items||[]).map(function(i,k){return '<tr><td>'+esc(i.id||("TC-"+String(k+1).padStart(3,"0")))+'</td><td><b>'+esc(i.scenario)+'</b>'+(i.type?'<div style="margin-top:6px"><span class="pill p-mute">'+esc(i.type)+'</span></div>':'')+(i.preconditions?'<div style="color:var(--muted);font-size:13px;margin-top:6px">Ön koşul: '+esc(i.preconditions)+'</div>':'')+'</td><td><ol>'+(i.steps||[]).map(function(s){return '<li>'+esc(s)+'</li>'}).join("")+'</ol></td><td>'+esc(i.expected)+'</td><td><span class="pill '+prClass(i.priority)+'">'+esc(i.priority||"-")+'</span></td></tr>'}).join("")+'</tbody></table></div>';
    }
    if(w.type==="bug"){
      var b=r.bug||{};
      return '<dl class="fields"><dt>Başlık</dt><dd><b>'+esc(b.title)+'</b></dd><dt>Önem</dt><dd><span class="pill '+prClass(b.severity)+'">'+esc(b.severity||"-")+'</span></dd><dt>Ortam</dt><dd>'+esc(b.environment)+'</dd>'+(b.preconditions?'<dt>Ön koşul</dt><dd>'+esc(b.preconditions)+'</dd>':'')+
        '<dt>Adımlar</dt><dd><ol>'+(b.steps||[]).map(function(s){return '<li>'+esc(s)+'</li>'}).join("")+'</ol></dd><dt>Beklenen</dt><dd>'+esc(b.expected)+'</dd><dt>Gerçekleşen</dt><dd>'+esc(b.actual)+'</dd>'+(b.frequency?'<dt>Sıklık</dt><dd>'+esc(b.frequency)+'</dd>':'')+(b.notes?'<dt>Notlar</dt><dd>'+esc(b.notes)+'</dd>':'')+
        ((b.missing_info||[]).length?'<dt>Eksik bilgi</dt><dd><ul>'+b.missing_info.map(function(s){return '<li>'+esc(s)+'</li>'}).join("")+'</ul></dd>':'')+'</dl>';
    }
    if(w.type==="smoke"){
      return '<ul class="checks">'+(r.items||[]).map(function(i,k){var id="ck"+k;return '<li><input type="checkbox" id="'+id+'"><label for="'+id+'"><b style="font-weight:600">'+esc(i.check)+'</b>'+(i.note?'<small>'+esc(i.note)+'</small>':'')+'</label><span class="area">'+esc(i.area||"")+'</span></li>'}).join("")+'</ul>';
    }
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Set</th><th>Kapsam</th><th>Neden</th><th>Test</th><th>Öncelik</th></tr></thead><tbody>'+
      (r.items||[]).map(function(i,k){return '<tr><td>'+esc(i.id||("RG-"+String(k+1).padStart(2,"0")))+'</td><td><b>'+esc(i.scope)+'</b></td><td>'+esc(i.reason)+'</td><td class="mono">'+esc(i.tests)+'</td><td><span class="pill '+prClass(i.priority)+'">'+esc(i.priority||"-")+'</span></td></tr>'}).join("")+'</tbody></table></div>';
  }
  function executionAction(){return '<button class="btn btn-primary" type="button" id="startExecution" data-start-execution>'+(locale()==="en-GB"?"Start testing with this plan":"Bu planla teste başla")+'</button>'}
  function forgeSelect(id,value,options,attrs){
    var current=options.find(function(option){return option.value===value})||options[0];
    return '<div class="forge-select" data-forge-select><button class="forge-select-trigger" type="button" data-forge-select-toggle aria-haspopup="listbox" aria-expanded="false"><span data-forge-select-label>'+esc(current.label)+'</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button><div class="forge-select-menu" role="listbox" hidden>'+options.map(function(option){return '<button type="button" role="option" aria-selected="'+String(option.value===value)+'" class="forge-select-option" data-forge-option="'+esc(option.value)+'">'+esc(option.label)+'</button>'}).join("")+'</div><input type="hidden" id="'+esc(id)+'" value="'+esc(value)+'" '+(attrs||"")+'></div>';
  }
  function startExecutionForm(w){
    var en=locale()==="en-GB",p=$("executionPanel");p.hidden=false;
    var platforms=["Web","iOS","Android","API"],platform=(w.platforms||[]).find(function(x){return platforms.indexOf(x)>=0})||"Web";
    p.innerHTML='<h3>'+(en?"Set up this test run":"Test yürütmesini ayarla")+'</h3><p class="hint">'+(en?"Records stay in this browser and are not shared with a team.":"Kayıtlar bu tarayıcıda kalır ve ekiple paylaşılmaz.")+'</p><div class="run-meta-form"><label>'+(en?"Release / version":"Sürüm")+'<input class="input" id="runVersion" maxlength="80" value="'+esc(w.version||"")+'" placeholder="'+(en?"e.g. 1.4.0":"Örn. 1.4.0")+'"></label><label>'+(en?"Platform":"Platform")+forgeSelect("runPlatform",platform,platforms.map(function(x){return {value:x,label:x}}))+'</label><label>'+(en?"Environment":"Ortam")+'<input class="input" id="runEnvironment" maxlength="120" placeholder="'+(en?"e.g. staging, iPhone 15":"Örn. staging, iPhone 15")+'"></label><label>'+(en?"Owner":"Sorumlu")+'<input class="input" id="runAssignee" maxlength="100" value="'+esc(state.email||"")+'"></label></div><button class="btn btn-primary" type="button" data-create-run>'+ (en?"Start test run":"Yürütmeyi başlat")+'</button>';
    p.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }
  function renderCaseHistory(c,en,run){
    var statuses=en?{pending:"Waiting",passed:"Passed",failed:"Failed",blocked:"Blocked"}:{pending:"Bekliyor",passed:"Geçti",failed:"Kaldı",blocked:"Engellendi"};
    var history=(c.history||[]).map(function(h){return '<li><b>'+esc(statuses[h.result]||h.result)+'</b> · '+esc(h.actor)+' · '+new Date(h.at).toLocaleString(locale())+(h.notes?'<span>'+esc(h.notes)+'</span>':'')+(h.blockedReason?'<span>'+(en?"Blocked because: ":"Engel nedeni: ")+esc(h.blockedReason)+'</span>':'')+'</li>'}).join("");
    return '<p class="run-owner-line">'+(en?"Owner":"Sorumlu")+': '+esc(run.assignee||run.startedBy)+' · '+(c.executedAt?(en?"Last updated ":"Son güncelleme ")+new Date(c.executedAt).toLocaleString(locale()):(en?"Not executed yet":"Henüz yürütülmedi"))+'</p>'+(history?'<details class="run-history"><summary>'+(en?"Result history":"Sonuç geçmişi")+' · '+(c.history||[]).length+'</summary><ol>'+history+'</ol></details>':'');
  }
  function renderExecution(run){
    state.activeRun=run.id;
    var en=locale()==="en-GB",p=$("executionPanel");p.hidden=false;
    var statuses=en?{pending:"Waiting",passed:"Passed",failed:"Failed",blocked:"Blocked"}:{pending:"Bekliyor",passed:"Geçti",failed:"Kaldı",blocked:"Engellendi"};
    p.innerHTML='<div class="run-heading"><div><span class="pill p-acc">'+(run.sample?(en?"SAMPLE PROJECT":"ÖRNEK PROJE"):(en?"TEST RUN":"TEST YÜRÜTMESİ"))+'</span><h3 id="runTitle">'+esc(run.title)+'</h3><p>'+esc(run.project)+' · '+esc(run.version)+' · '+esc(run.platform)+' · '+esc(run.environment)+'</p><small>'+(en?"Owner":"Sorumlu")+': '+esc(run.assignee||run.startedBy)+' · '+fmtDate(run.startedAt)+'</small></div><button type="button" class="btn btn-ghost" data-close-run>'+ (en?"Close":"Kapat")+'</button></div><p class="run-local-note">'+(en?"Local browser record · no team sharing or file storage is configured.":"Tarayıcıdaki yerel kayıt · ekip paylaşımı veya dosya depolaması yapılandırılmamış.")+'</p><div class="run-cases">'+(run.cases||[]).map(function(c,i){
      var linked=(run.bugs||[]).find(function(b){return b.id===c.bugId});
      var statusOptions=Object.keys(statuses).map(function(s){return {value:s,label:statuses[s]}}),actual=String(c.actual||""),statusAttrs='data-run-id="'+esc(run.id)+'" data-run-field="status" data-case-index="'+i+'"';
      return '<article class="run-case" data-case="'+i+'"><div class="run-case-head"><span class="mono">'+esc(c.id)+'</span><span class="pill '+prClass(c.priority)+'">'+esc(c.priority)+'</span><label>'+(en?"Result":"Sonuç")+forgeSelect("runStatus-"+i,c.status,statusOptions,statusAttrs)+'</label></div><h4>'+esc(c.scenario)+'</h4><p><b>'+(en?"Preconditions":"Ön koşullar")+':</b> '+esc(c.preconditions)+'</p><p><b>'+(en?"Steps":"Adımlar")+':</b></p><ol>'+c.steps.map(function(s){return '<li>'+esc(s)+'</li>'}).join("")+'</ol><p><b>'+(en?"Expected result":"Beklenen sonuç")+':</b> '+esc(c.expected)+'</p><label>'+(en?"Actual result / test notes · required (at least 10 characters)":"Gerçekleşen sonuç / test notu · zorunlu (en az 10 karakter)")+'<textarea class="textarea" rows="2" required minlength="10" data-run-id="'+esc(run.id)+'" data-run-field="actual" data-case-index="'+i+'" placeholder="'+(en?"Record at least 10 characters about what happened":"Gerçekleşeni en az 10 karakterle yazın")+'">'+esc(actual)+'</textarea><small class="actual-note-hint" data-actual-hint>'+ (en?"Test notes are required · at least 10 characters":"Test notu zorunlu · en az 10 karakter")+' <span data-actual-count>'+actual.length+'</span>/10</small></label>'+(c.status==="blocked"?'<label>'+(en?"Blocker reason":"Engel nedeni")+'<textarea class="textarea" rows="2" required data-run-id="'+esc(run.id)+'" data-run-field="blockedReason" data-case-index="'+i+'">'+esc(c.blockedReason)+'</textarea></label>':'')+(c.executedAt?'<small>'+(en?"Recorded by":"Kaydeden")+' '+esc(c.executedBy)+' · '+new Date(c.executedAt).toLocaleString(locale())+'</small>':'')+(c.status==="failed"?(linked?'<button type="button" class="btn btn-ghost" data-view-bug="'+esc(linked.id)+'">'+(en?"Open linked bug":"Bağlı hata kaydını aç")+': '+esc(linked.id)+'</button>':'<button type="button" class="btn btn-primary" data-run-id="'+esc(run.id)+'" data-open-bug="'+i+'">'+(en?"Create linked bug":"İlişkili hata kaydı aç")+'</button>'):'')+'</article>';
    }).join("")+'</div><div class="run-bugs"><h3>'+(en?"Related bugs":"İlişkili hatalar")+'</h3>'+((run.bugs||[]).length?run.bugs.map(function(b){return renderBug(b,run,en)}).join(""):'<p class="hint">'+(en?"No linked bugs yet.":"Henüz ilişkili hata yok.")+'</p>')+'</div>';
    p.querySelectorAll(".run-case").forEach(function(card,i){card.insertAdjacentHTML("beforeend",renderCaseHistory(run.cases[i],en,run))});
  }
  function renderBug(b,run,en){
    var tc=(run.cases||[]).find(function(c){return c.id===b.testId}),label=en?{open:"Open",verify:"Retest required",closed:"Closed"}:{open:"Açık",verify:"Yeniden test gerekli",closed:"Kapalı"};
    var sevLabel=en?{critical:"Critical",high:"High",medium:"Medium",low:"Low"}:{critical:"Kritik",high:"Yüksek",medium:"Orta",low:"Düşük"};
    return '<article class="bug-card"><div class="run-case-head"><span class="mono">'+esc(b.id)+' · '+esc(b.testId)+'</span><span class="pill p-high">'+esc(sevLabel[b.severity]||b.severity)+'</span><span class="pill p-mute">'+label[b.status]+'</span></div><h4>'+esc(b.title)+'</h4><p><b>'+(en?"Actual":"Gerçekleşen")+':</b> '+esc(b.actual)+'</p><p><b>'+(en?"Expected":"Beklenen")+':</b> '+esc(b.expected)+'</p><p><b>'+(en?"Steps":"Adımlar")+':</b> '+esc((b.steps||[]).join(" → "))+'</p><p>'+esc(b.version)+' · '+esc(b.platform)+' · '+esc(b.environment)+'</p><p><b>'+(en?"Evidence note":"Kanıt notu")+':</b> '+esc(b.evidence||"—")+'</p>'+(tc?'<small>'+(en?"Source test status":"Kaynak test durumu")+': '+esc(tc.status)+'</small>':'')+(b.status!=="closed"?'<div class="verify-form"><label>'+(en?"Retest result":"Yeniden test sonucu")+'<select class="input" data-bug-field="retestResult" data-bug-id="'+esc(b.id)+'"><option value="pending">'+(en?"Waiting":"Bekliyor")+'</option><option value="passed" '+(b.retestResult==="passed"?'selected':'')+'>'+(en?"Passed":"Geçti")+'</option><option value="failed" '+(b.retestResult==="failed"?'selected':'')+'>'+(en?"Failed":"Kaldı")+'</option></select></label><label>'+(en?"Retest notes":"Yeniden test notu")+'<textarea class="textarea" rows="2" data-bug-field="retestNote" data-bug-id="'+esc(b.id)+'">'+esc(b.retestNote||"")+'</textarea></label>'+(b.retestResult==="passed"?'<button type="button" class="btn btn-primary" data-verify-bug="'+esc(b.id)+'">'+(en?"Confirm verification and close bug":"Doğrulamayı onayla ve hatayı kapat")+'</button>':'')+'</div>':'')+'<div class="bug-history">'+(b.history||[]).map(function(h){return '<small>'+esc(h.result)+' · '+esc(h.actor)+' · '+new Date(h.at).toLocaleString(locale())+'</small>'}).join("")+'</div></article>';
  }
  function showBugForm(run,index){
    var c=run.cases[index],existing=(run.bugs||[]).find(function(b){return b.testId===c.id});
    if(existing){c.bugId=existing.id;saveRuns();renderExecution(run);return}
    var en=locale()==="en-GB",box=document.createElement("div");box.className="bug-editor";box.innerHTML='<h4>'+(en?"New linked bug":"Yeni ilişkili hata")+' · '+esc(c.id)+'</h4><label>'+(en?"Bug title":"Hata başlığı")+'<input class="input" id="bugTitle" value="'+esc(c.scenario)+'"></label><label>'+(en?"Severity":"Önem")+'<select class="input" id="bugSeverity"><option value="critical">'+(en?"Critical":"Kritik")+'</option><option value="high" selected>'+(en?"High":"Yüksek")+'</option><option value="medium">'+(en?"Medium":"Orta")+'</option><option value="low">'+(en?"Low":"Düşük")+'</option></select></label><label>'+(en?"Actual result":"Gerçekleşen sonuç")+'<textarea class="textarea" id="bugActual" rows="2">'+esc(c.actual)+'</textarea></label><label>'+(en?"Evidence note or reference (no file upload is configured)":"Kanıt notu veya referansı (dosya yükleme yapılandırılmamış)")+'<textarea class="textarea" id="bugEvidence" rows="2"></textarea></label><button type="button" class="btn btn-primary" data-run-id="'+esc(run.id)+'" data-save-bug="'+index+'">'+(en?"Save bug":"Hata kaydını oluştur")+'</button><button type="button" class="btn btn-ghost" data-cancel-bug>'+ (en?"Cancel":"Vazgeç")+'</button>';
    $("executionPanel").appendChild(box);box.scrollIntoView({block:"center",behavior:"smooth"});
  }
  document.addEventListener("click",function(e){
    var toggle=e.target.closest("[data-forge-select-toggle]");
    if(toggle){var own=toggle.closest("[data-forge-select]"),menu=own.querySelector("[role=listbox]"),opening=menu.hidden;document.querySelectorAll("[data-forge-select] [role=listbox]").forEach(function(other){other.hidden=true;other.closest("[data-forge-select]").querySelector("[data-forge-select-toggle]").setAttribute("aria-expanded","false");var card=other.closest(".run-case");if(card)card.classList.remove("select-open")});menu.hidden=!opening;toggle.setAttribute("aria-expanded",String(opening));var parentCase=own.closest(".run-case");if(parentCase&&opening)parentCase.classList.add("select-open");if(opening){var selected=menu.querySelector('[aria-selected="true"]');if(selected)selected.focus()}return}
    var option=e.target.closest("[data-forge-option]");
    if(option){var wrapper=option.closest("[data-forge-select]"),input=wrapper.querySelector("input[type=hidden]"),trigger=wrapper.querySelector("[data-forge-select-toggle]"),parentCase=wrapper.closest(".run-case");input.value=option.dataset.forgeOption;wrapper.querySelector("[data-forge-select-label]").textContent=option.textContent;wrapper.querySelectorAll("[data-forge-option]").forEach(function(item){item.setAttribute("aria-selected",String(item===option))});wrapper.querySelector("[role=listbox]").hidden=true;trigger.setAttribute("aria-expanded","false");if(parentCase)parentCase.classList.remove("select-open");trigger.focus();input.dispatchEvent(new Event("change",{bubbles:true}));return}
    if(!e.target.closest("[data-forge-select]"))document.querySelectorAll("[data-forge-select] [role=listbox]").forEach(function(menu){menu.hidden=true;menu.closest("[data-forge-select]").querySelector("[data-forge-select-toggle]").setAttribute("aria-expanded","false");var card=menu.closest(".run-case");if(card)card.classList.remove("select-open")});
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){var open=document.querySelector("[data-forge-select] [role=listbox]:not([hidden])");if(open){open.hidden=true;var wrapper=open.closest("[data-forge-select]"),trigger=wrapper.querySelector("[data-forge-select-toggle]"),card=wrapper.closest(".run-case");trigger.setAttribute("aria-expanded","false");if(card)card.classList.remove("select-open");trigger.focus()}}});
  function openRun(run){
    $("tool").hidden=false;document.body.style.overflow="hidden";stage("result");setStep(4);$("resTitle").textContent=run.title;$("resSummary").textContent=run.sample?(locale()==="en-GB"?"Sample project · example execution data":"Örnek proje · örnek yürütme verileri"):"";$("resSrc").textContent="";$("resOut").innerHTML="";$("resTags").textContent="";$("resActions").innerHTML="";renderExecution(run);
  }
  function findRun(id){return state.runs.find(function(r){return r.id===id})}
  $("executionPanel").addEventListener("click",function(e){
    var create=e.target.closest("[data-create-run]");if(create){var version=$("runVersion").value.trim(),environment=$("runEnvironment").value.trim();if(!version||!environment){toast(locale()==="en-GB"?"Add a release and environment first.":"Önce sürüm ve ortam bilgisi girin.");return}var doc=state.viewing||state.current;if(!doc){toast(locale()==="en-GB"?"Test plan not found.":"Test planı bulunamadı.");return}var run=makeRun(doc,{version:version,platform:$("runPlatform").value.trim()||"Belirtilmedi",environment:environment,assignee:$("runAssignee").value.trim()||state.email,sample:doc.example===true});state.runs.push(run);saveRuns();state.selectedRelease=version;renderStats();renderExecution(run);return}
    var close=e.target.closest("[data-close-run]");if(close){$("executionPanel").hidden=true;state.activeRun=null;return}
    var openBug=e.target.closest("[data-open-bug]");if(openBug){var runForBug=findRun(openBug.dataset.runId);if(runForBug)showBugForm(runForBug,+openBug.dataset.openBug);return}
    var saveBug=e.target.closest("[data-save-bug]");if(saveBug){var idx=+saveBug.dataset.saveBug,run=findRun(saveBug.dataset.runId);if(!run)return;var c=run.cases[idx],actual=$("bugActual").value.trim();if(actual.length<3){toast(locale()==="en-GB"?"Add the actual result first.":"Önce gerçekleşen sonucu yazın.");return}var bug={id:"BUG-"+Date.now().toString(36).toUpperCase(),testId:c.id,title:$("bugTitle").value.trim()||c.scenario,severity:$("bugSeverity").value,actual:actual,expected:c.expected,steps:c.steps.slice(),preconditions:c.preconditions,version:run.version,platform:run.platform,environment:run.environment,evidence:$("bugEvidence").value.trim(),status:"open",createdAt:new Date().toISOString(),history:[],retestResult:"pending",retestNote:""};run.bugs.push(bug);c.bugId=bug.id;saveRuns();renderStats();renderExecution(run);return}
    var cancel=e.target.closest("[data-cancel-bug]");if(cancel){var form=e.target.closest(".bug-editor");if(form)form.remove();return}
    var viewBug=e.target.closest("[data-view-bug]");if(viewBug){var br=state.runs.find(function(r){return r.bugs.some(function(b){return b.id===viewBug.dataset.viewBug})});if(br)renderExecution(br);return}
    var verify=e.target.closest("[data-verify-bug]");if(verify){var br=state.runs.find(function(r){return r.bugs.some(function(b){return b.id===verify.dataset.verifyBug})}),bug=br&&br.bugs.find(function(b){return b.id===verify.dataset.verifyBug});if(!bug||bug.retestResult!=="passed"||!bug.retestNote.trim()){toast(locale()==="en-GB"?"A passing retest and notes are required.":"Başarılı yeniden test ve not zorunludur.");return}bug.status="closed";bug.closedAt=new Date().toISOString();bug.history.push({result:locale()==="en-GB"?"Retest passed; bug explicitly verified and closed":"Yeniden test geçti; hata açıkça doğrulanıp kapatıldı",actor:state.email,at:bug.closedAt});saveRuns();renderStats();renderExecution(br);return}
  });
  $("executionPanel").addEventListener("change",function(e){
    var f=e.target.closest("[data-run-field]");if(f){var ci=+f.dataset.caseIndex,run=findRun(f.dataset.runId);if(!run)return;var c=run.cases[ci];c[f.dataset.runField]=f.value;if(f.dataset.runField==="status"){if(f.value==="pending"){c.executedAt=null;c.executedBy=""}else if(c.actual.trim().length<10){c.status="pending";toast(locale()==="en-GB"?"Test notes are required; enter at least 10 characters before recording a result.":"Test notu zorunlu; sonucu kaydetmek için en az 10 karakter girin.")}else if(f.value!=="blocked"||c.blockedReason.trim()){c.executedAt=new Date().toISOString();c.executedBy=state.email;c.history.push({result:f.value,actor:state.email,at:c.executedAt,notes:c.actual,blockedReason:c.blockedReason})}saveRuns();renderStats();renderExecution(run);return}saveRuns()}
    var bf=e.target.closest("[data-bug-field]");if(bf){var br=state.runs.find(function(r){return r.bugs.some(function(b){return b.id===bf.dataset.bugId})}),bug=br&&br.bugs.find(function(b){return b.id===bf.dataset.bugId});if(bug){bug[bf.dataset.bugField]=bf.value;saveRuns();if(bf.dataset.bugField==="retestResult"){renderExecution(br)}}}
  });
  $("executionPanel").addEventListener("input",function(e){
    var f=e.target.closest("[data-run-field]");if(f){var run=findRun(f.dataset.runId);if(!run)return;var c=run.cases[+f.dataset.caseIndex],card=f.closest(".run-case");c[f.dataset.runField]=f.value;if(f.dataset.runField==="actual"){var counter=card&&card.querySelector("[data-actual-count]");if(counter)counter.textContent=String(f.value.trim().length);if(f.value.trim().length<10&&c.status!=="pending"){c.status="pending";c.executedAt=null;c.executedBy="";var statusInput=card.querySelector('input[data-run-field="status"]');if(statusInput){statusInput.value="pending";var statusWrap=statusInput.closest("[data-forge-select]");statusWrap.querySelector("[data-forge-select-label]").textContent=locale()==="en-GB"?"Waiting":"Bekliyor";statusWrap.querySelectorAll("[data-forge-option]").forEach(function(item){item.setAttribute("aria-selected",String(item.dataset.forgeOption==="pending"))})}}}if(f.dataset.runField==="actual"&&f.value.trim().length>=10&&c.status!=="pending"&&(c.status!=="blocked"||c.blockedReason.trim())&&!c.executedAt){c.executedAt=new Date().toISOString();c.executedBy=state.email;c.history.push({result:c.status,actor:state.email,at:c.executedAt,notes:c.actual,blockedReason:c.blockedReason})}saveRuns();renderStats();return}
    var bf=e.target.closest("[data-bug-field]");if(bf){var br=state.runs.find(function(r){return r.bugs.some(function(b){return b.id===bf.dataset.bugId})}),bug=br&&br.bugs.find(function(b){return b.id===bf.dataset.bugId});if(bug){bug[bf.dataset.bugField]=bf.value;saveRuns()}}
  });
  function showResult(w,readonly){
    state.activeRun=null;
    stage("result");setStep(4);
    $("resTags").innerHTML='<span class="pill p-acc">'+esc(TYPES[w.type].short)+'</span>'+(w.platforms||[]).map(function(p){return '<span class="pill p-mute">'+esc(p)+'</span>'}).join("")+(w.example?'<span class="pill p-mute">'+(locale()==="en-GB"?"Sample output":"Örnek çıktı")+'</span>':'')+'<span class="pill p-mute">'+(locale()==="en-GB"?"Document language: ":"Doküman dili: ")+(w.documentLanguage==="en"?"English":"Türkçe")+'</span><span class="pill p-mute">'+countItems(w)+(w.type==="bug"?(locale()==="en-GB"?" reports":" rapor"):(locale()==="en-GB"?" items":" madde"))+'</span>';
    $("resTitle").textContent=w.title;$("resSummary").textContent=w.summary||"";
    $("resSrc").textContent=w.input||"";
    $("resOut").innerHTML=renderResult(w);
    var a="";
    if(!readonly){
      a+='<button class="btn btn-ghost" type="button" id="regenBtn">Yeniden üret</button>';
      a+=w.saved?'<span class="btn btn-ghost saved-pill" style="cursor:default;color:var(--pass)">'+CHECK+' Kaydedildi</span>':'<button class="btn btn-primary" type="button" id="saveBtn">Kaydet</button>';
    }else{
      a+='<button class="btn btn-ghost" type="button" id="reuseBtn">Bu girdiyle yeniden üret</button>';
      if(!w.example)a+='<button class="btn btn-danger" type="button" id="delBtn">Sil</button>';
    }
    a+='<button class="btn btn-ghost" type="button" id="csvBtn">CSV indir</button>';
    if(w.type==="test"||w.type==="smoke")a+=executionAction();
    $("resActions").innerHTML=a;
    $("executionPanel").hidden=true;
    var sb=$("saveBtn");if(sb)sb.onclick=save;
    var rb=$("regenBtn");if(rb)rb.onclick=function(){restoreJob(w);generate()};
    var ub=$("reuseBtn");if(ub)ub.onclick=function(){restoreJob(w);state.viewing=null;stage("compose");setStep(2);$("genBtn").focus()};
    var db=$("delBtn");if(db)db.onclick=function(){confirmDelete(w,db)};
    $("csvBtn").onclick=function(){exportCsv(w)};
    var start=$("startExecution");if(start)start.onclick=function(){startExecutionForm(w)};
  }
  function restoreJob(w){$("inputText").value=w.input||"";state.type=w.type;state.plats=(w.platforms&&w.platforms.length?w.platforms:["Web"]).slice();state.depth=w.depth||"quick";$("projName").value=w.project||"";$("docLanguage").value=w.documentLanguage||"tr";updateCount();renderOpts()}
  function openSaved(w){
    lastFocus=document.activeElement;state.viewing=w;
    $("tool").hidden=false;document.body.style.overflow="hidden";renderOpts();showResult(w,true);
  }
  async function save(){
    var w=state.current;if(!w||w.saved)return;
    var btn=$("saveBtn");btn.disabled=true;btn.textContent="Kaydediliyor…";
    var doc={type:w.type,platforms:w.platforms,depth:w.depth,documentLanguage:w.documentLanguage||"tr",project:w.project,input:w.input,title:w.title,summary:w.summary,result:w.result,createdAt:w.createdAt};
    try{
      if(store.mode==="db"){var id=uid();await store.col.doc(id).set(doc);w.id=id}
      else{w.id=uid();doc.id=w.id;state.works.unshift(doc);saveLocal();renderAll()}
      w.saved=true;showResult(w,false);toast("Panele eklendi");
    }catch(e){
      btn.disabled=false;btn.textContent="Kaydet";
      toast(e&&e.code==="quota_exceeded"?"Depolama dolu. Eski dokümanları silip tekrar deneyin.":"Kaydedilemedi. Tekrar deneyin.");
    }
  }
  function confirmDelete(w,btn){
    if(btn.dataset.armed!=="1"){btn.dataset.armed="1";btn.textContent="Silmek için tekrar bas";setTimeout(function(){if(btn.isConnected){btn.dataset.armed="";btn.textContent="Sil"}},3500);return}
    (async function(){
      try{
        if(store.mode==="db")await store.col.doc(w.id).delete();
        else{state.works=state.works.filter(function(x){return x.id!==w.id});saveLocal();renderAll()}
        closeTool();toast("Doküman silindi");
      }catch(e){toast("Silinemedi. Tekrar deneyin.")}
    })();
  }
  function csvCell(v){v=Array.isArray(v)?v.map(function(s,i){return (i+1)+". "+s}).join("\n"):String(v==null?"":v);return '"'+v.replace(/"/g,'""')+'"'}
  function toCsv(w){
    var r=w.result||{},rows;
    if(w.type==="test")rows=[["ID","Senaryo","Tür","Ön koşul","Adımlar","Beklenen sonuç","Öncelik"]].concat((r.items||[]).map(function(i){return [i.id,i.scenario,i.type,i.preconditions,i.steps,i.expected,i.priority]}));
    else if(w.type==="bug"){var b=r.bug||{};rows=[["Alan","Değer"],["Başlık",b.title],["Önem",b.severity],["Ortam",b.environment],["Ön koşul",b.preconditions],["Adımlar",b.steps],["Beklenen",b.expected],["Gerçekleşen",b.actual],["Sıklık",b.frequency],["Notlar",b.notes],["Eksik bilgi",b.missing_info]]}
    else if(w.type==="smoke")rows=[["Kontrol","Alan","Not","Öncelik","Sonuç"]].concat((r.items||[]).map(function(i){return [i.check,i.area,i.note,i.priority,""]}));
    else rows=[["Set","Kapsam","Neden","Test sayısı","Öncelik"]].concat((r.items||[]).map(function(i){return [i.id,i.scope,i.reason,i.tests,i.priority]}));
    return "﻿"+rows.map(function(r){return r.map(csvCell).join(";")}).join("\r\n");
  }
  function openSampleOutput(type){state.type=type||"test";openTool(state.type);generate()}
  async function exportCsv(w){
    await capsReady;
    var name=(w.title||"qacrew").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşıöç]+/gi,"-").replace(/^-|-$/g,"").slice(0,50)+".csv";
    if(!downloads){
      var csv=toCsv(w);
      try{await navigator.clipboard.writeText(csv);toast("İndirme bu görünümde kapalı; CSV panoya kopyalandı")}catch(e){toast("Bu görünümde indirme kullanılamıyor")}
      return;
    }
    try{await downloads.save({filename:name,data:new Blob([toCsv(w)],{type:"text/csv;charset=utf-8"})});toast("CSV hazır")}
    catch(e){if(!(e&&e.code==="cancelled"))toast("Dosya kaydedilemedi")}
  }

  // ---------- boot ----------
  renderOpts();updateCount();
  lsDel("qacrew.session");
  fetch("/api/session",{credentials:"same-origin"}).then(async function(r){var raw=await r.text(),data=null;try{data=raw?JSON.parse(raw):null}catch(_){}return r.ok?data:null}).then(function(data){if(data&&data.user){signIn(data.user.email,false);if(new URLSearchParams(location.search).has("try")){openTool();history.replaceState(null,"",location.pathname)}return}}).catch(function(){});
})();

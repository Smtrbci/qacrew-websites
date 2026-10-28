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
    {name:"Ödeme akışı (user story)",type:"test",text:"US-482 Kayıtlı kartla ödeme\nKullanıcı olarak, sepetimdeki ürünler için kayıtlı kartımla ödeme yapabilmek istiyorum.\n\nKabul kriterleri:\n- Kayıtlı kart yoksa kullanıcı yeni kart ekleyebilmeli\n- Ödemede 3D Secure doğrulaması zorunlu\n- Limit yetersizse anlaşılır bir uyarı gösterilmeli\n- Sepet tutarı 0 TL ise Öde butonu pasif olmalı\n- Başarılı ödemeden sonra sipariş onay ekranı ve e-posta gelmeli"},
    {name:"Dağınık Slack mesajı",type:"bug",text:"@ali ödeme sayfası yine bozuk, bazen açılmıyor. androidde oldu sanırım dün akşam. wifi'dan mobil veriye geçince oluyor gibi. tekrar denedim düzeldi sonra yine oldu. geri tuşu da çalışmadı o an. uygulama son sürüm 3.8.2"},
    {name:"Sürüm notları v3.9",type:"smoke",text:"v3.9 sürüm notları\n- Giriş ekranı yeniden tasarlandı\n- Face ID / parmak izi ile giriş eklendi\n- Bildirim izni artık ilk açılışta değil, ilk siparişten sonra isteniyor\n- Ödeme SDK'sı 5.2'ye güncellendi\n- Profil fotoğrafı yükleme hatası düzeltildi"},
    {name:"Sprint değişiklikleri",type:"reg",text:"Sprint 24'te değişenler:\n- Sepet servisi yeniden yazıldı (adet güncelleme, ürün silme)\n- Kampanya motoru: kampanya + kupon birlikte kullanılabilir hale geldi\n- Adres formu: yeni il/ilçe listesi\n- Ödeme ekranında küçük UI değişikliği\nDokunulmayanlar: profil, favoriler, bildirim ayarları"}
  ];

  // ---------- state ----------
  var state={email:null,works:[],examples:[],type:"test",plats:["Web"],depth:"quick",current:null,filter:"all",viewing:null};
  var store={mode:"local",col:null};
  var sample=null, downloads=null;

  // ---------- bağımsız mod (Claude dışında): HTTP üretim ucu + paketli örnekler ----------
  var CFG=window.QACREW_CONFIG||{};
  function httpSample(){
    if(!CFG.apiUrl)return null;
    return {json:async function(prompt,opts){
      opts=opts||{};var r,d=null;
      try{r=await fetch(CFG.apiUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job:currentJob}),signal:opts.signal})}
      catch(e){throw {code:e&&e.name==="AbortError"?"cancelled":"upstream_error"}}
      try{d=await r.json()}catch(e){}
      if(!r.ok||!d)throw {code:(d&&d.code)||"upstream_error"};
      if(opts.onText)opts.onText({text:JSON.stringify(d.result),delta:""});
      return d.result;
    }};
  }
  function standalone(){
    if(!sample)sample=httpSample();
    if(store.mode!=="db"&&!state.examples.length&&CFG.examplesUrl){
      fetch(CFG.examplesUrl).then(function(r){return r.json()}).then(function(list){state.examples=list.map(function(x){x.example=true;return x});renderAll()}).catch(function(){});
    }
  }

  // ---------- capabilities ----------
  var capsReady=(async function(){
    if(!window.claude||!claude.use){standalone();renderNotice();return}
    try{
      var r=await Promise.all([claude.use("db"),claude.use("user"),claude.use("sample"),claude.use("downloads")]);
      var db=r[0],user=r[1];sample=r[2];downloads=r[3];
      var id=user?await user.id():null;
      if(db&&id){
        store.mode="db";store.col=db.collection("data/users/"+id);
        store.col.onSnapshot(function(snap){
          state.works=snap.docs.map(function(d){var x=Object.assign({},d.data());x.id=d.id;return x}).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"")});
          renderAll();
        },function(){store.mode="local";loadLocal();renderAll()});
        db.collection("examples").get().then(function(s){state.examples=s.docs.map(function(d){var x=Object.assign({},d.data());x.id=d.id;x.example=true;return x});renderAll()}).catch(function(){});
      }
    }catch(e){}
    standalone();renderNotice();
  })();
  function localKey(){return "qacrew.works."+(state.email||"anon")}
  function loadLocal(){try{state.works=JSON.parse(lsGet(localKey())||"[]")}catch(e){state.works=[]}}
  function saveLocal(){lsSet(localKey(),JSON.stringify(state.works))}
  function renderNotice(){
    var n=$("storeNote"),msgs=[];
    var en=document.documentElement.lang==="en";
    if(!sample)msgs.push(en?"Forge is currently in demo mode. Explore the sample documents; real generation is coming soon.":"Forge şu an demo modunda. Örnek dokümanları inceleyebilirsiniz; gerçek üretim yakında açılacak.");
    if(store.mode!=="db")msgs.push(en?"Documents are stored only in this browser.":"Kayıtlar yalnızca bu tarayıcıda tutuluyor.");
    n.hidden=!msgs.length;n.textContent=msgs.join(" ");
  }

  // ---------- login ----------
  function nameFrom(email){var n=(email.split("@")[0]||"").split(/[._-]/)[0]||"Kullanıcı";return n.charAt(0).toLocaleUpperCase("tr-TR")+n.slice(1)}
  $("fillDemo").onclick=function(){$("lEmail").value="demo@qacrew.it";$("lPass").value="qacrew2026";$("lPass").focus()};
  $("loginForm").addEventListener("submit",function(e){
    e.preventDefault();
    var em=$("lEmail").value.trim(),pw=$("lPass").value,er=$("lErr");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){er.textContent="Geçerli bir e-posta adresi girin.";er.hidden=false;$("lEmail").focus();return}
    if(pw.length<4){er.textContent="Şifre en az 4 karakter olmalı.";er.hidden=false;$("lPass").focus();return}
    er.hidden=true;$("lPass").value="";
    signIn(em);
  });
  function signIn(em){
    state.email=em;lsSet("qacrew.session",em);
    if(store.mode!=="db")loadLocal();
    $("login").hidden=true;$("appShell").hidden=false;
    var nm=nameFrom(em);
    $("avatarBtn").textContent=nm.charAt(0);$("whoName").textContent=nm;$("whoMail").textContent=em;
    updateWelcome(nm);
    showTab("panel");renderAll();renderNotice();
  }
  function updateWelcome(name){
    var h=new Date().getHours(),en=document.documentElement.lang==="en";
    $("hello").textContent=(en?(h<12?"Good morning, ":h<18?"Good afternoon, ":"Good evening, "):(h<12?"Günaydın, ":h<18?"İyi günler, ":"İyi akşamlar, "))+name;
    $("today").textContent=new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"});
  }
  window.addEventListener("qacrew-language-change",function(){
    updateCount();renderOpts();
    if(state.email){updateWelcome(nameFrom(state.email));renderAll();renderNotice();if(!$('tool').hidden&&state.viewing)showResult(state.viewing,true)}
  });
  $("logoutBtn").onclick=function(){lsDel("qacrew.session");state.email=null;$("userMenu").hidden=true;$("appShell").hidden=true;$("login").hidden=false;$("lEmail").focus()};
  $("avatarBtn").onclick=function(e){e.stopPropagation();var m=$("userMenu");m.hidden=!m.hidden;this.setAttribute("aria-expanded",String(!m.hidden))};
  document.addEventListener("click",function(e){if(!e.target.closest(".avatar-wrap")){$("userMenu").hidden=true;$("avatarBtn").setAttribute("aria-expanded","false")}});

  // ---------- tabs ----------
  function showTab(t){
    document.querySelectorAll(".tab").forEach(function(b){b.setAttribute("aria-selected",String(b.dataset.tab===t))});
    ["panel","docs","tpl"].forEach(function(v){$("view-"+v).hidden=v!==t});
    window.scrollTo(0,0);
  }
  document.querySelectorAll(".tab").forEach(function(b){b.onclick=function(){showTab(b.dataset.tab)}});

  // ---------- dashboard ----------
  function countItems(w){var r=w.result||{};if(w.type==="bug")return r.bug?1:0;return (r.items||[]).length}
  function countHigh(w){var r=w.result||{};if(w.type==="bug")return r.bug&&/kritik|yüksek/i.test(r.bug.severity||"")?1:0;return (r.items||[]).filter(function(i){return /yüksek|kritik/i.test(i.priority||"")}).length}
  function renderStats(){
    var ws=state.works,now=Date.now(),wk=7*864e5;
    var items=ws.filter(function(w){return w.type==="test"||w.type==="reg"}).reduce(function(a,w){return a+countItems(w)},0);
    var high=ws.reduce(function(a,w){return a+countHigh(w)},0);
    var bugs=ws.filter(function(w){return w.type==="bug"}).length;
    var thisWeek=ws.filter(function(w){return now-new Date(w.createdAt).getTime()<wk}).length;
    var mins=ws.reduce(function(a,w){return a+Math.max(5,countItems(w)*4)},0);
    var S=[
      {k:"Kaydedilen doküman",v:ws.length,d:'<b>+'+thisWeek+'</b> '+(locale()==="en-GB"?"this week":"bu hafta")},
      {k:"Üretilen test senaryosu",v:items,d:locale()==="en-GB"?"test + regression suites":"test + regresyon setleri"},
      {k:"Yüksek öncelikli madde",v:high,d:bugs+(locale()==="en-GB"?" bug reports included":" bug raporu dahil")},
      {k:"Tasarruf edilen süre",v:mins>=60?(Math.round(mins/6)/10).toLocaleString(locale())+(locale()==="en-GB"?" hr":" sa"):mins+(locale()==="en-GB"?" min":" dk"),d:locale()==="en-GB"?"~4 min of manual writing per item":"madde başına ~4 dk elle yazım"}
    ];
    $("stats").innerHTML=S.map(function(s){return '<div class="stat"><span class="k">'+s.k+'</span><span class="v">'+s.v+'</span><span class="d">'+s.d+'</span></div>'}).join("");
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
  function renderAll(){if(!state.email)return;renderStats();renderGrids();renderTpl()}
  document.addEventListener("click",function(e){
    var o=e.target.closest("[data-open-tool]");if(o){$("userMenu").hidden=true;openTool(o.getAttribute("data-open-tool")||null);return}
    var c=e.target.closest("[data-work]");if(c){var id=c.dataset.work,w=(c.dataset.ex?state.examples:state.works).find(function(x){return x.id===id});if(w)openSaved(w);return}
    var f=e.target.closest("[data-filter]");if(f){state.filter=f.dataset.filter;renderGrids()}
  });

  // ---------- tool: compose ----------
  function setStep(n){document.querySelectorAll("#stepper span").forEach(function(s){var k=+s.dataset.s;s.className=k===n?"on":k<n?"done":""})}
  function stage(name){["compose","gen","result"].forEach(function(s){$("stage-"+s).hidden=s!==name});$("tool").scrollTop=0}
  function renderOpts(){
    $("typeOpts").innerHTML=Object.keys(TYPES).map(function(k){return '<button class="opt" type="button" data-type="'+k+'" aria-pressed="'+(state.type===k)+'"><b>'+TYPES[k].label+'</b><small>'+TYPES[k].desc+'</small></button>'}).join("");
    $("platOpts").innerHTML=PLATS.map(function(p){return '<button class="fchip" type="button" data-plat="'+p+'" aria-pressed="'+(state.plats.indexOf(p)>-1)+'" style="min-height:40px">'+p+'</button>'}).join("");
    $("depthOpts").innerHTML=Object.keys(DEPTHS).map(function(k){return '<button class="opt" type="button" data-depth="'+k+'" aria-pressed="'+(state.depth===k)+'"><b>'+DEPTHS[k].label+'</b><small>'+DEPTHS[k].desc+'</small></button>'}).join("");
    $("samples").innerHTML=SAMPLES.map(function(s,i){return '<button class="fchip" type="button" data-sample="'+i+'">'+esc(s.name)+'</button>'}).join("");
  }
  $("tool").addEventListener("click",function(e){
    var t=e.target.closest("[data-type]");if(t){state.type=t.dataset.type;renderOpts();return}
    var p=e.target.closest("[data-plat]");if(p){var v=p.dataset.plat,i=state.plats.indexOf(v);if(i>-1){if(state.plats.length>1)state.plats.splice(i,1)}else state.plats.push(v);renderOpts();return}
    var d=e.target.closest("[data-depth]");if(d){state.depth=d.dataset.depth;renderOpts();return}
    var s=e.target.closest("[data-sample]");if(s){var smp=SAMPLES[+s.dataset.sample];$("inputText").value=smp.text;state.type=smp.type;updateCount();renderOpts();$("composeErr").hidden=true}
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
  // Prompt şablonları ../js/prompts.js içinde (sunucu da aynı dosyayı kullanır)
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
    $("genSub").textContent="Bu demo ekranında üretim akışı yakında açılacak.";
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
    return ({not_granted:"Üretim için izin verilmedi. İzin vermeden yeni doküman üretilemez.",
      sampling_disabled:"QAcrew Studio · Forge şu an demo modunda. Gerçek üretim yakında açılacak.",
      rate_limited:"Çok fazla istek gönderildi. Biraz bekleyip tekrar deneyin.",
      session_expired:"Oturumunuzun süresi doldu. Yeniden giriş yapıp tekrar deneyin.",
      prompt_too_large:"Girdi çok uzun. Metni kısaltıp tekrar deneyin.",
      refused:"Bu girdi için doküman üretilemedi. Girdiyi değiştirip tekrar deneyin.",
      invalid_json:"Sunucu yanıtı okunamadı. Yeniden üretmeyi deneyin.",
      empty_completion:"Sunucu boş yanıt döndü. Girdiyi biraz daha açıklayıcı yazıp tekrar deneyin."})[c]||"Üretim sunucusuna ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.";
  }
  async function generate(){
    var text=$("inputText").value.trim();
    if(text.length<20){showComposeErr("Biraz daha ayrıntı gerekiyor: en az 20 karakterlik bir girdi yazın veya örnek seçin.");$("inputText").focus();return}
    if(text.length>12000){showComposeErr("Girdi 12.000 karakteri geçemez.");return}
    await capsReady;
    if(!sample){showComposeErr("QAcrew Studio · Forge demo modunda; gerçek doküman üretimi yakında açılacak.");return}
    $("composeErr").hidden=true;
    var job={type:state.type,plats:state.plats.slice(),depth:state.depth,project:$("projName").value.trim(),input:text};currentJob=job;
    stage("gen");setStep(3);
    var onLen=startGenUI();
    ctl=new AbortController();
    try{
      var res=await sample.json(QAPrompts.build(job),{signal:ctl.signal,cache:false,modelTier:job.depth==="deep"?"complex":"default",onText:function(u){onLen(u.text.length)}});
      clearInterval(timer);ctl=null;
      if(!QAPrompts.isValidResult(job.type,res))throw {code:"invalid_json"};
      state.current={id:null,type:job.type,platforms:job.plats,depth:job.depth,project:job.project,input:job.input,title:String(res.title||TYPES[job.type].label).slice(0,90),summary:String(res.summary||""),result:res,createdAt:new Date().toISOString(),saved:false};
      showResult(state.current,false);
    }catch(e){
      clearInterval(timer);ctl=null;
      stage("compose");setStep(2);
      if(e&&e.code==="cancelled"){showComposeErr("Üretim durduruldu.");return}
      showComposeErr(errCopy(e&&e.code));
      if(e&&(e.code==="not_granted"||e.code==="sampling_disabled")){sample=null;renderNotice()}
    }
  }
  $("genBtn").onclick=generate;
  $("stopBtn").onclick=function(){if(ctl)ctl.abort()};

  // ---------- tool: result ----------
  function prClass(p){return /kritik|yüksek/i.test(p||"")?"p-high":/orta/i.test(p||"")?"p-mid":"p-low"}
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
  function showResult(w,readonly){
    stage("result");setStep(4);
    $("resTags").innerHTML='<span class="pill p-acc">'+esc(TYPES[w.type].short)+'</span>'+(w.platforms||[]).map(function(p){return '<span class="pill p-mute">'+esc(p)+'</span>'}).join("")+(w.example?'<span class="pill p-mute">'+(locale()==="en-GB"?"Sample":"Örnek")+'</span>':'')+'<span class="pill p-mute">'+countItems(w)+(w.type==="bug"?(locale()==="en-GB"?" reports":" rapor"):(locale()==="en-GB"?" items":" madde"))+'</span>';
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
    $("resActions").innerHTML=a;
    var sb=$("saveBtn");if(sb)sb.onclick=save;
    var rb=$("regenBtn");if(rb)rb.onclick=function(){restoreJob(w);generate()};
    var ub=$("reuseBtn");if(ub)ub.onclick=function(){restoreJob(w);state.viewing=null;stage("compose");setStep(2);$("genBtn").focus()};
    var db=$("delBtn");if(db)db.onclick=function(){confirmDelete(w,db)};
    $("csvBtn").onclick=function(){exportCsv(w)};
  }
  function restoreJob(w){$("inputText").value=w.input||"";state.type=w.type;state.plats=(w.platforms&&w.platforms.length?w.platforms:["Web"]).slice();state.depth=w.depth||"quick";$("projName").value=w.project||"";updateCount();renderOpts()}
  function openSaved(w){
    lastFocus=document.activeElement;state.viewing=w;
    $("tool").hidden=false;document.body.style.overflow="hidden";renderOpts();showResult(w,true);
  }
  async function save(){
    var w=state.current;if(!w||w.saved)return;
    var btn=$("saveBtn");btn.disabled=true;btn.textContent="Kaydediliyor…";
    var doc={type:w.type,platforms:w.platforms,depth:w.depth,project:w.project,input:w.input,title:w.title,summary:w.summary,result:w.result,createdAt:w.createdAt};
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
  var sess=lsGet("qacrew.session");
  if(sess){capsReady.then(function(){signIn(sess)});signIn(sess)}
})();

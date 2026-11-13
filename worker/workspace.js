const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
const text=(v,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
const required=(v,label,max)=>{const s=text(v,max);if(!s)throw fail(label+' gerekli / required');return s;};
const permissions={project:['admin','pmo','pm','qa'],requirement:['admin','pm','qa'],scenario:['admin','qa'],document:['admin','qa'],plan:['admin','qa','pm'],run:['admin','qa'],bug:['admin','dev','qa'],retest:['admin','qa'],decision:['admin','pm','pmo'],restore:['admin','pmo'],share:['admin','pm','pmo','qa']};
const blank=()=>({schema:1,revision:0,projects:[],audit:[]});
function upsert(list,item){const index=list.findIndex(x=>x.id===item.id);if(index<0)list.push(item);else list[index]=item;}
export function applyCommand(state,command,user){
 const {action,payload:p={}}=command,kind=action.split('.')[0];
 if(!permissions[kind]?.includes(user.role))throw fail('Bu işlem için yetkiniz yok / Not permitted',403);
 if(p.id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id))throw fail('Geçersiz kayıt kimliği');
 const s=structuredClone(state),stamp=now();
 if(action==='project.create'){
  const name=required(p.name,'Proje',200);if(s.projects.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw fail('Proje zaten var / Project exists');
  s.projects.push({id:id(),name,createdAt:stamp,requirements:[],scenarios:[],documents:[],plans:[],runs:[],bugs:[],decisions:[]});
 }else if(action==='restore.import'){
  if(p.data?.schema!==1||!Array.isArray(p.data.projects)||p.data.projects.length>100)throw fail('Geçersiz yedek / Invalid backup');
  for(const project of p.data.projects){if(typeof project.id!=='string'||!text(project.name))throw fail('Geçersiz proje');for(const k of ['requirements','scenarios','documents','plans','runs','bugs','decisions'])if(!Array.isArray(project[k]))throw fail('Eksik kayıt dizisi: '+k);}
  if(new Set(p.data.projects.map(x=>x.id)).size!==p.data.projects.length)throw fail('Tekrarlanan proje kimliği');
  validateBackup(p.data);s.projects=structuredClone(p.data.projects);for(const project of s.projects)for(const decision of project.decisions)decision.imported=true;
 }else{
  const project=s.projects.find(x=>x.id===p.projectId);if(!project)throw fail('Proje bulunamadı / Project not found',404);
  if(action==='requirement.save'){
   const item={id:p.id||id(),title:required(p.title,'Başlık',200),input:required(p.input,'Gereksinim'),source:text(p.source,500),questions:(p.questions||[]).slice(0,40).map(q=>({question:required(q.question,'Soru',1000),answer:text(q.answer,3000),status:['open','confirmed','unknown'].includes(q.status)?q.status:'open'})),updatedAt:stamp,updatedBy:user.email};
   if(item.questions.some(q=>q.status==='confirmed'&&!q.answer))throw fail('Doğrulanan soruyu yanıtlayın / Answer confirmed questions');upsert(project.requirements,item);
  }else if(action==='scenario.save'||action==='scenario.import'){
   const items=action==='scenario.import'?p.items:[p];if(!Array.isArray(items)||!items.length||items.length>1000)throw fail('1–1000 senaryo gerekli');
   for(const row of items){if(row.id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id))throw fail('Geçersiz senaryo kimliği');if(row.requirementId&&!project.requirements.some(r=>r.id===row.requirementId))throw fail('Gereksinim bulunamadı');
    const item={id:row.id||id(),title:required(row.title,'Senaryo başlığı',300),requirementId:text(row.requirementId,100),preconditions:text(row.preconditions,3000),steps:(Array.isArray(row.steps)?row.steps:String(row.steps||'').split('\n')).map(x=>text(x,1500)).filter(Boolean).slice(0,50),expected:required(row.expected,'Beklenen sonuç',4000),priority:['Critical','High','Medium','Low'].includes(row.priority)?row.priority:'Medium',platform:['Web','Android','iOS','API'].includes(row.platform)?row.platform:'Web',estimate:Math.max(1,Math.min(240,Number(row.estimate)||5)),approved:row.approved===true,updatedAt:stamp,updatedBy:user.email};
    if(!item.steps.length)throw fail('En az bir adım gerekli / Add a step');upsert(project.scenarios,item);
   }
  }else if(action==='document.save'){
   if(!['test','bug','smoke','reg'].includes(p.type)||!Array.isArray(p.rows)||!p.rows.length||p.rows.length>200)throw fail('Geçersiz doküman');
   if(p.requirementId&&!project.requirements.some(r=>r.id===p.requirementId))throw fail('Gereksinim bulunamadı');
   const item={id:p.id||id(),title:required(p.title,'Doküman başlığı',300),type:p.type,platform:required(p.platform,'Platform',30),language:p.language==='en'?'en':'tr',requirementId:text(p.requirementId,100),rows:p.rows.map(r=>({title:required(r.title,'Satır başlığı',300),steps:text(r.steps,5000),expected:text(r.expected,4000),priority:['Critical','High','Medium','Low'].includes(r.priority)?r.priority:'Medium'})),questions:(p.questions||[]).slice(0,30).map(q=>({question:text(q.question,1000),answer:text(q.answer,3000)})),sample:p.sample===true,updatedAt:stamp,updatedBy:user.email};upsert(project.documents,item);
  }else if(action==='plan.save'){
   const scenarioIds=[...new Set(p.scenarioIds||[])];if(!scenarioIds.length||scenarioIds.some(i=>!project.scenarios.some(x=>x.id===i&&x.approved)))throw fail('Onaylanmış senaryolar seçin / Select approved scenarios');
   const assignments={};for(const sid of scenarioIds)assignments[sid]=text(p.assignments?.[sid]||p.assignee,200);
   upsert(project.plans,{id:p.id||id(),title:required(p.title,'Plan adı',200),version:required(p.version,'Sürüm',100),environment:required(p.environment,'Ortam',200),platform:required(p.platform,'Platform',30),notes:text(p.notes),scenarioIds,assignments,budget:Math.max(1,Math.min(14400,Number(p.budget)||30)),updatedAt:stamp});
  }else if(action==='run.create'){
   const plan=project.plans.find(x=>x.id===p.planId);if(!plan)throw fail('Plan bulunamadı');
   project.runs.push({id:id(),title:plan.title,version:plan.version,environment:plan.environment,platform:plan.platform,planId:plan.id,createdAt:stamp,createdBy:user.email,cases:plan.scenarioIds.map(sid=>({...structuredClone(project.scenarios.find(x=>x.id===sid)),id:id(),scenarioId:sid,assignee:plan.assignments[sid],status:'pending',note:'',evidence:[],history:[]}))});
  }else if(action==='run.result'||action==='run.bulk'){
   const run=project.runs.find(x=>x.id===p.runId);if(!run)throw fail('Koşum bulunamadı');
   const targets=action==='run.bulk'?run.cases.filter(x=>(p.caseIds||[]).includes(x.id)&&x.status==='pending'):[run.cases.find(x=>x.id===p.caseId)];
   if(!targets.length||targets.some(x=>!x))throw fail('Test bulunamadı');
   const status=action==='run.bulk'?'passed':p.status;if(!['pending','passed','failed','blocked'].includes(status))throw fail('Geçersiz sonuç');
   if(['failed','blocked'].includes(status)&&text(p.note).length<10)throw fail('Kaldı/Engellendi için en az 10 karakter not gerekli / At least 10 characters required');
   for(const c of targets){c.status=status;c.note=text(p.note,5000);c.executedAt=stamp;c.executedBy=user.email;c.evidence=[...new Set([...(c.evidence||[]),...(Array.isArray(p.evidence)?p.evidence:[])])].filter(v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)).slice(0,20);c.history.push({status,note:c.note,at:stamp,by:user.email});
    if(status==='failed'&&p.bug){let bug=project.bugs.find(b=>b.caseId===c.id&&b.status!=='closed');if(!bug){bug={id:id(),runId:run.id,caseId:c.id,scenarioId:c.scenarioId,requirementId:c.requirementId,title:required(p.bug.title||c.title,'Hata başlığı',300),severity:['Critical','High','Medium','Low'].includes(p.bug.severity)?p.bug.severity:c.priority,assignee:text(p.bug.assignee,200),status:'open',actual:c.note,expected:c.expected,steps:c.steps,environment:run.environment,version:run.version,platform:run.platform,evidence:[...c.evidence],createdAt:stamp,history:[{status:'open',by:user.email,at:stamp}],fixedBuild:''};project.bugs.push(bug);}c.bugId=bug.id;}
   }
  }else if(action==='bug.update'){
   const bug=project.bugs.find(x=>x.id===p.id);if(!bug)throw fail('Hata bulunamadı');
   if(!['open','fixed','retest'].includes(p.status))throw fail('Kapatma için açık tekrar test gerekir / Explicit retest required');
   if(p.status==='fixed'&&!text(p.fixedBuild))throw fail('Düzeltme build bilgisi gerekli / Fixed build required');
   if(p.status==='retest'&&(!['fixed','retest'].includes(bug.status)||user.role==='dev'))throw fail('QA tekrar test başlatmalı');
   if(bug.status==='closed'&&p.status!=='open')throw fail('Kapalı hata önce yeniden açılmalı');
   Object.assign(bug,{status:p.status,assignee:text(p.assignee,200),fixedBuild:text(p.fixedBuild,100)});bug.history.push({status:p.status,by:user.email,at:stamp,note:text(p.note,3000)});
  }else if(action==='retest.save'){
   const bug=project.bugs.find(x=>x.id===p.id);if(!bug||!['fixed','retest'].includes(bug.status))throw fail('Önce düzeltildi olarak işaretleyin');
   const note=required(p.note,'Tekrar test notu',3000);if(note.length<10)throw fail('En az 10 karakter tekrar test notu gerekli');
   bug.status=p.passed===true?'closed':'open';bug.history.push({status:bug.status,by:user.email,at:stamp,note,build:bug.fixedBuild,retest:true});
  }else if(action==='decision.save'){
   if(!['undecided','approved','hold','rejected'].includes(p.status))throw fail('Geçersiz karar');
   const version=required(p.version,'Sürüm',100);if(!project.runs.some(r=>r.version===version))throw fail('Bu sürümde koşum yok');
   project.decisions.push({id:id(),version,status:p.status,note:required(p.note,'Karar gerekçesi',5000),by:user.email,at:stamp});
  }else throw fail('Bilinmeyen işlem / Unknown action');
 }
 s.revision++;s.audit.push({id:id(),action,by:user.email,role:user.role,at:stamp,projectId:p.projectId||null});s.audit=s.audit.slice(-2000);return s;
}
export function createDemoState(){
 let state=blank();const user={email:'demo@qacrew.it',role:'admin'};
 const cmd=(action,payload)=>{state=applyCommand(state,{action,payload},user);return state;};
 const project=(name)=>{cmd('project.create',{name});return state.projects.at(-1);};
 const scenario=(projectId,requirementId,title,expected,priority='Medium',platform='Web')=>{cmd('scenario.save',{projectId,requirementId,title,steps:['İlgili ekrana git','Örnek koşulu uygula','Sonucu doğrula'],expected,priority,platform,estimate:5,approved:true});return state.projects.find(p=>p.id===projectId).scenarios.at(-1);};
 const requirement=(projectId,title,input,questions=[])=>{cmd('requirement.save',{projectId,title,input,questions});return state.projects.find(p=>p.id===projectId).requirements.at(-1);};
 const plan=(projectId,title,version,environment,scenarioIds)=>{cmd('plan.save',{projectId,title,version,environment,platform:'Web',scenarioIds,budget:30,assignee:user.email});return state.projects.find(p=>p.id===projectId).plans.at(-1);};
 const shop=project('Örnek · ShopFlow');
 const pay=requirement(shop.id,'Kayıtlı kartla ödeme','Kullanıcı kayıtlı kartla ödeme yapabilir. Yetersiz bakiyede açık uyarı gösterilir. Başarılı ödemede sipariş onayı görünür.',[{question:'Ödeme zaman aşımında yeniden deneme kuralı nedir?',answer:'',status:'unknown'}]);
 const shopCases=[scenario(shop.id,pay.id,'Geçerli kayıtlı kart','Sipariş onayı ve işlem numarası görünür.','High'),scenario(shop.id,pay.id,'Yetersiz bakiye','Ödeme reddedilir ve anlaşılır uyarı gösterilir.','Medium'),scenario(shop.id,pay.id,'Çift tıklama koruması','Tek sipariş ve tek tahsilat oluşur.','Critical'),scenario(shop.id,pay.id,'Sipariş geçmişi','Tamamlanan sipariş geçmişte görünür.','Medium')];
 requirement(shop.id,'Kupon doğrulama','Geçerli kupon indirimi toplam tutara uygulanır; süresi dolmuş kupon için neden açıklanır.');
 for(const [type,title] of [['test','ShopFlow ödeme senaryoları'],['bug','Ödeme hatası örnek raporu'],['smoke','Yayın öncesi smoke listesi'],['reg','Sepet regresyon seti']])cmd('document.save',{projectId:shop.id,title,type,platform:'Web',language:'tr',requirementId:pay.id,rows:shopCases.slice(0,3).map(s=>({title:s.title,steps:s.steps.join('\n'),expected:s.expected,priority:s.priority})),questions:[{question:'Zaman aşımında tekrar deneme?',answer:''}],sample:true});
 const p10=plan(shop.id,'Ödeme temel akışı','v1.0','Staging · Chrome',shopCases.map(s=>s.id));cmd('run.create',{projectId:shop.id,planId:p10.id});let run=state.projects.find(p=>p.id===shop.id).runs.at(-1);cmd('run.bulk',{projectId:shop.id,runId:run.id,caseIds:run.cases.map(c=>c.id)});
 cmd('decision.save',{projectId:shop.id,version:'v1.0',status:'approved',note:'Örnek karar: kapsam içindeki dört senaryo geçti.'});
 const p11=plan(shop.id,'Kupon ve ödeme regresyonu','v1.1','Staging · Chrome',shopCases.map(s=>s.id));cmd('run.create',{projectId:shop.id,planId:p11.id});run=state.projects.find(p=>p.id===shop.id).runs.at(-1);cmd('run.result',{projectId:shop.id,runId:run.id,caseId:run.cases[0].id,status:'passed',note:''});cmd('run.result',{projectId:shop.id,runId:run.id,caseId:run.cases[1].id,status:'failed',note:'Örnek bulgu: yetersiz bakiye uyarısı görünmüyor.',bug:{title:'Bakiye uyarısı görünmüyor',severity:'Medium',assignee:'developer@demo.qacrew.it'}});cmd('decision.save',{projectId:shop.id,version:'v1.1',status:'hold',note:'Örnek karar: hata düzeltildikten ve QA tekrar testinden sonra yeniden değerlendir.'});
 const mobile=project('Örnek · CareMobile');const auth=requirement(mobile.id,'Güvenli oturum','Kullanıcı geçerli bilgilerle giriş yapar. Oturum süresi dolunca güvenli biçimde tekrar giriş ister.');const mobileCases=[scenario(mobile.id,auth.id,'Başarılı giriş','Ana sayfa ve kullanıcı adı görünür.','High','Android'),scenario(mobile.id,auth.id,'Hatalı parola','Genel güvenlik uyarısı görünür, oturum açılmaz.','High','iOS'),scenario(mobile.id,auth.id,'Oturum süresi dolması','Kullanıcı güvenli giriş ekranına yönlendirilir.','Medium','Android')];const p=plan(mobile.id,'Mobil giriş smoke','2.4.0','Android · Pixel / iOS · iPhone',mobileCases.map(s=>s.id));cmd('run.create',{projectId:mobile.id,planId:p.id});run=state.projects.find(x=>x.id===mobile.id).runs.at(-1);cmd('run.bulk',{projectId:mobile.id,runId:run.id,caseIds:run.cases.slice(0,2).map(c=>c.id)});
 return state;
}
export class WorkspaceStore{
 constructor(ctx){this.ctx=ctx;}
 async read(storage=this.ctx.storage){const count=await storage.get('state-count');if(!count)return blank();let raw='';for(let i=0;i<count;i++)raw+=await storage.get('state-'+i);return JSON.parse(raw);}
 async save(storage,state){const raw=JSON.stringify(state),count=Math.ceil(raw.length/16000);if(raw.length>3000000)throw fail('Çalışma alanı 3 MB sınırına ulaştı',413);for(let i=0;i<count;i++)await storage.put('state-'+i,raw.slice(i*16000,(i+1)*16000));const old=await storage.get('state-count')||0;for(let i=count;i<old;i++)await storage.delete('state-'+i);await storage.put('state-count',count);}
 async fetch(request){try{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/share/')){const share=await this.ctx.storage.get('share:'+path.split('/').pop());return share&&share.expires>Date.now()?json(share):json({error:'Paylaşım bulunamadı veya süresi doldu'},404);}
  if(path==='/demo-state'){const state=await this.ctx.storage.transaction(async storage=>{let data=await storage.get('demo-state-v1');if(!data){data=createDemoState();await storage.put('demo-state-v1',data);}return data;});return json({state});}
  const user=JSON.parse(request.headers.get('x-workspace-user')||'null');if(!user)return json({error:'Unauthorized'},401);
  if(path==='/publish'){const p=await request.json();if(!permissions.share.includes(user.role))throw fail('Not permitted',403);await this.ctx.storage.put('share:'+p.token,p.snapshot);return json({ok:true});}
  if(path==='/state')return json({state:await this.read()});
  if(path==='/command'){
   const command=await request.json();if(!permissions[command.action?.split('.')[0]]?.includes(user.role))throw fail('Bu işlem için yetkiniz yok / Not permitted',403);const state=await this.ctx.storage.transaction(async storage=>{const state=await this.read(storage);if(command.revision!==state.revision)throw fail('Başka kullanıcı kaydı güncelledi. Yenileyip tekrar deneyin / Conflict: reload and retry',409);const next=applyCommand(state,command,user);await this.save(storage,next);return next;});return json({state});
  }
  if(path==='/share'){
   if(!permissions.share.includes(user.role))throw fail('Not permitted',403);
   const p=await request.json(),state=await this.read(),project=state.projects.find(x=>x.id===p.projectId);if(!project)throw fail('Proje bulunamadı',404);
   const token=id()+id(),runs=project.runs.filter(r=>r.version===p.version);if(!runs.length)throw fail('Koşum yok');
   const share={project:project.name,version:p.version,runs:runs.map(r=>({title:r.title,platform:r.platform,environment:r.environment,cases:r.cases.map(c=>({title:c.title,priority:c.priority,status:c.status,note:c.note,executedAt:c.executedAt,executedBy:c.executedBy}))})),bugs:project.bugs.filter(b=>b.version===p.version).map(b=>({id:b.id,title:b.title,status:b.status,severity:b.severity})),decision:project.decisions.filter(d=>d.version===p.version).at(-1)||null,createdAt:now(),by:user.email,expires:Date.now()+7*86400000};await this.ctx.storage.put('share:'+token,share);return json({token,expires:share.expires});
  }
  if(path==='/evidence'&&request.method==='POST'){
   if(!['admin','qa','pmo'].includes(user.role))throw fail('Not permitted',403);
   const body=await request.json();if(!['image/png','image/jpeg','image/webp','video/mp4','video/webm','text/plain'].includes(body.type))throw fail('Desteklenmeyen dosya türü');
   if(typeof body.data!=='string'||body.data.length>7000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))throw fail('Dosya en fazla 5 MB olabilir',413);
   const token=id(),count=Math.ceil(body.data.length/60000),meta={id:token,name:text(body.name,200),type:body.type,count,by:user.email,at:now()};
   await this.ctx.storage.transaction(async storage=>{const size=await storage.get('evidence-size')||0;if(size+body.data.length>70000000)throw fail('Kanıt alanı 50 MB sınırına ulaştı',413);for(let i=0;i<count;i++)await storage.put('evidence:'+token+':'+i,body.data.slice(i*60000,(i+1)*60000));await storage.put('evidence:'+token,meta);await storage.put('evidence-size',size+body.data.length);});return json(meta);
  }
  if(path.startsWith('/evidence/')){const token=path.split('/').pop(),meta=await this.ctx.storage.get('evidence:'+token);if(!meta)throw fail('Dosya bulunamadı',404);let data='';for(let i=0;i<meta.count;i++)data+=await this.ctx.storage.get('evidence:'+token+':'+i);return json({...meta,data});}
  return json({error:'Not found'},404);
 }catch(e){return json({error:e.message},e.status||400);}}
}

function validateBackup(data){
 const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
 const str=(v,label)=>{if(typeof v!=='string')throw fail('Yedek alanı geçersiz: '+label);};
 for(const p of data.projects){
  if(!safeId(p.id))throw fail('Geçersiz proje kimliği');
  for(const collection of ['requirements','scenarios','documents','plans','runs','bugs','decisions']){
   if(p[collection].length>10000)throw fail('Yedek çok büyük');
   const ids=new Set();for(const item of p[collection]){if(!item||!safeId(item.id)||ids.has(item.id))throw fail('Geçersiz veya tekrarlanan kayıt kimliği');ids.add(item.id);}
  }
  for(const r of p.requirements){str(r.title,'title');str(r.input,'input');if(!Array.isArray(r.questions)||r.questions.some(q=>typeof q.question!=='string'||typeof q.answer!=='string'))throw fail('Geçersiz sorular');}
  for(const s of p.scenarios){str(s.title,'title');str(s.expected,'expected');if(!Array.isArray(s.steps)||s.steps.some(x=>typeof x!=='string'))throw fail('Geçersiz adımlar');}
  for(const d of p.documents){str(d.title,'title');if(!Array.isArray(d.rows)||!Array.isArray(d.questions)||typeof d.language!=='string'||typeof d.updatedAt!=='string')throw fail('Geçersiz doküman');}
  for(const plan of p.plans){str(plan.title,'title');str(plan.version,'version');if(!Array.isArray(plan.scenarioIds)||!plan.assignments||plan.scenarioIds.some(i=>!p.scenarios.some(s=>s.id===i)))throw fail('Plan senaryoları bulunamadı');}
  for(const r of p.runs){str(r.title,'title');str(r.version,'version');if(!Array.isArray(r.cases))throw fail('Geçersiz koşum');for(const c of r.cases){if(!safeId(c.id)||!Array.isArray(c.steps)||!Array.isArray(c.history)||(c.evidence||[]).some(v=>!safeId(v))||!['pending','passed','failed','blocked'].includes(c.status))throw fail('Geçersiz test');str(c.title,'case title');}}
  for(const b of p.bugs){str(b.title,'bug title');if(!Array.isArray(b.steps)||!Array.isArray(b.history)||(b.evidence||[]).some(v=>!safeId(v)))throw fail('Geçersiz hata');}
  for(const d of p.decisions){str(d.note,'decision note');if(!['undecided','approved','hold','rejected'].includes(d.status))throw fail('Geçersiz karar');}
 }
}

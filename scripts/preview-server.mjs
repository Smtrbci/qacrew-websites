// Local-only preview using the actual Worker handlers and file-backed Durable Object emulator.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {webcrypto,pbkdf2Sync,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import worker,{QuotaCounter,WorkspaceStore} from '../worker/index.js';
import {applyCommand} from '../worker/workspace.js';
globalThis.crypto??=webcrypto;
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),storageDir=path.join(root,'.wrangler',process.env.FORGE_PREVIEW_DATA_NAME||'forge-preview');await fs.mkdir(storageDir,{recursive:true});
const stores=new Map();
class Storage{
 constructor(file,data){this.file=file;this.data=data;this.queue=Promise.resolve();}
 async get(k){return structuredClone(this.data[k]);}
 async put(k,v){this.data[k]=structuredClone(v);await this.flush();}
 async delete(k){delete this.data[k];await this.flush();}
 async setAlarm(){}
 async deleteAll(){this.data={};await this.flush();}
 async flush(){await fs.writeFile(this.file+'.tmp',JSON.stringify(this.data));await fs.rename(this.file+'.tmp',this.file);}
 transaction(fn){const task=this.queue.then(async()=>{const data=structuredClone(this.data),tx={get:async k=>structuredClone(data[k]),put:async(k,v)=>{data[k]=structuredClone(v);},delete:async k=>{delete data[k];}};const result=await fn(tx);this.data=data;await this.flush();return result;});this.queue=task.catch(()=>{});return task;}
}
async function getObject(kind,key){const cacheKey=kind+':'+key;if(stores.has(cacheKey))return stores.get(cacheKey);const promise=(async()=>{const file=path.join(storageDir,Buffer.from(cacheKey).toString('hex')+'.json');let data={};try{data=JSON.parse(await fs.readFile(file,'utf8'));}catch{}const ctx={storage:new Storage(file,data)};return kind==='quota'?new QuotaCounter(ctx):new WorkspaceStore(ctx);})();stores.set(cacheKey,promise);return promise;}
const binding=kind=>({idFromName:name=>name,get:key=>({fetch:async(url,init)=>{const object=await getObject(kind,key);return object.fetch(url instanceof Request?url:new Request(url,init));}})});
const accounts=['qa','dev','pm','pmo'].map(role=>{const salt='local-preview-'+role;return {email:role+'@preview.local',role,salt,hash:pbkdf2Sync('Preview-only-2026!',salt,100000,32,'sha256').toString('hex')};});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
const env={SESSION_SECRET:'local-preview-only-'+randomBytes(32).toString('hex'),FORGE_PREVIEW_MODE:'true',GITHUB_REPOSITORY:'Smtrbci/qacrew-websites',FORGE_WORKSPACE_ID:'local-preview',FORGE_USERS_JSON:JSON.stringify(accounts),QUOTA:binding('quota'),WORKSPACE:binding('workspace'),ASSETS:{fetch:async req=>{let pathname=decodeURIComponent(new URL(req.url).pathname);if(pathname==='/')return Response.redirect(new URL('/forge/preview/',req.url));if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||pathname.includes('/.')||/^\/(worker|scripts|tests|docs|node_modules)\//.test(pathname))return new Response('Not found',{status:404});try{return new Response(await fs.readFile(file),{headers:{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}});}catch{return new Response('Not found',{status:404});}}}};
// An explicit sample dataset, kept separate from all production records.
const object=await getObject('workspace','workspace:local-preview');let state=await object.read();
if(!state.projects.length){
 const qa={email:'qa@preview.local',role:'admin'};const cmd=(action,payload)=>{state=applyCommand(state,{action,payload},qa);};
 cmd('project.create',{name:'Örnek · ShopFlow'});const p=state.projects[0].id;
 cmd('requirement.save',{projectId:p,title:'Kayıtlı kartla ödeme',input:'Kullanıcı kayıtlı kartıyla ödeme yapabilir. Yetersiz bakiyede açık uyarı gösterilir. Başarılı ödemede sipariş onayı gösterilir.',questions:[{question:'Ağ zaman aşımında yeniden deneme kuralı nedir?',answer:'',status:'unknown'}]});const req=state.projects[0].requirements[0].id;
 for(const [title,expected,priority]of [['Kayıtlı kartla ödeme','Sipariş onayı görünür','High'],['Yetersiz bakiye','Anlaşılır uyarı görünür','Medium'],['Çift tıklama','Tek tahsilat gerçekleşir','Critical'],['Sipariş geçmişi','Yeni sipariş listelenir','Medium']])cmd('scenario.save',{projectId:p,title,requirementId:req,steps:['Ödeme sayfasını aç','İlgili koşulu uygula','Sonucu kontrol et'],expected,priority,platform:'Web',estimate:5,approved:true});
 const ids=state.projects[0].scenarios.map(x=>x.id);
 cmd('plan.save',{projectId:p,title:'Ödeme regresyonu',version:'v1.0',environment:'Staging · Chrome',platform:'Web',scenarioIds:ids,budget:30,assignee:'qa@preview.local'});cmd('run.create',{projectId:p,planId:state.projects[0].plans[0].id});let run=state.projects[0].runs[0];cmd('run.bulk',{projectId:p,runId:run.id,caseIds:run.cases.map(c=>c.id)});
 cmd('decision.save',{projectId:p,version:'v1.0',status:'approved',note:'Örnek karar: kapsam içindeki dört test geçti.'});
 cmd('plan.save',{projectId:p,title:'Ödeme regresyonu',version:'v1.1',environment:'Staging · Chrome 130',platform:'Web',scenarioIds:ids,budget:20,assignee:'qa@preview.local'});cmd('run.create',{projectId:p,planId:state.projects[0].plans[1].id});run=state.projects[0].runs[1];cmd('run.result',{projectId:p,runId:run.id,caseId:run.cases[0].id,status:'passed',note:''});cmd('run.result',{projectId:p,runId:run.id,caseId:run.cases[1].id,status:'failed',note:'Örnek bulgu: yetersiz bakiye uyarısı görünmüyor.',bug:{title:'Bakiye uyarısı görünmüyor',severity:'Medium',assignee:'dev@preview.local'}});
 cmd('project.create',{name:'Örnek · CareMobile'});
 await object.ctx.storage.transaction(tx=>object.save(tx,state));
}
const port=Number(process.env.PORT||8790);
const server=http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>76000000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const headers=new Headers(req.headers);headers.set('cf-connecting-ip','127.0.0.1:'+req.socket.remotePort);const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}});
server.listen(port,'127.0.0.1',()=>console.log('Forge preview: http://127.0.0.1:'+port+'/forge/preview/'));

export function parseCSV(input){
 const rows=[];let row=[],cell='',quote=false;const delim=input.split('\n')[0].includes(';')?';':',';
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quote&&input[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===delim&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quote)throw Error('CSV: kapatılmamış tırnak / unclosed quote');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export async function parseXLSX(file){
 // Read the central directory, then the first worksheet. No formulas or macros execute.
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files=new Map();let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Geçersiz XLSX / invalid archive');let ptr=view.getUint32(end+16,true),total=0;const entries=view.getUint16(end+10,true);if(entries>3000)throw Error('Çok fazla dosya');
 for(let i=0;i<entries;i++){
  if(view.getUint32(ptr,true)!==0x02014b50)throw Error('Invalid XLSX directory');
  const method=view.getUint16(ptr+10,true),size=view.getUint32(ptr+20,true),unpacked=view.getUint32(ptr+24,true),nl=view.getUint16(ptr+28,true),el=view.getUint16(ptr+30,true),cl=view.getUint16(ptr+32,true),offset=view.getUint32(ptr+42,true),name=decoder.decode(bytes.slice(ptr+46,ptr+46+nl));ptr+=46+nl+el+cl;
  if(!/^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(name))continue;
  total+=unpacked;if(total>10000000||unpacked>8000000)throw Error('XLSX içeriği çok büyük');
  const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);let data=bytes.slice(start,start+size);
  if(method===8){const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));const reader=stream.getReader(),parts=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>8000000){await reader.cancel();throw Error('XLSX boyut sınırı');}parts.push(value);}data=new Uint8Array(await new Blob(parts).arrayBuffer());}else if(method!==0)throw Error('Unsupported ZIP method');
  files.set(name,decoder.decode(data));
 }
 const xml=value=>{const doc=new DOMParser().parseFromString(value,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid worksheet XML');return doc;};
 const strings=files.has('xl/sharedStrings.xml')?[...xml(files.get('xl/sharedStrings.xml')).querySelectorAll('si')].map(si=>[...si.querySelectorAll('t')].map(t=>t.textContent).join('')):[];
 const sheet=[...files.keys()].filter(k=>k.includes('/worksheets/')).sort()[0];if(!sheet)throw Error('Çalışma sayfası bulunamadı');
 return [...xml(files.get(sheet)).querySelectorAll('sheetData row')].map(row=>{const result=[];for(const cell of row.querySelectorAll('c')){const column=(cell.getAttribute('r')||'A').match(/^[A-Z]+/)[0];let index=0;for(const c of column)index=index*26+c.charCodeAt(0)-64;const type=cell.getAttribute('t'),value=cell.querySelector('v')?.textContent||'';result[index-1]=type==='s'?(strings[+value]||''):type==='inlineStr'?cell.querySelector('is')?.textContent||'':value;}return result;});
}
export function scenariosFromRows(rows){
 const aliases={title:['title','senaryo','başlık','scenario'],steps:['steps','adımlar','adimlar'],expected:['expected','beklenen sonuç','beklenen','expected result'],priority:['priority','öncelik'],platform:['platform'],estimate:['estimate','süre','tahmin'],preconditions:['preconditions','ön koşul']};
 const headers=(rows.shift()||[]).map(x=>String(x||'').replace(/^\uFEFF/,'').trim().toLowerCase()),index={};for(const [key,words]of Object.entries(aliases))index[key]=headers.findIndex(h=>words.includes(h));
 if(['title','steps','expected'].some(k=>index[k]<0))throw Error('Başlıklar: title, steps, expected zorunlu / required');
 return rows.filter(row=>row.some(x=>String(x||'').trim())).map(row=>{const result={};for(const [key,i]of Object.entries(index))result[key]=i>=0?String(row[i]||''):'';result.steps=result.steps.split(/\n|\|/).filter(Boolean);result.priority=({Yüksek:'High',Orta:'Medium',Düşük:'Low',Kritik:'Critical'})[result.priority]||result.priority||'Medium';result.platform=result.platform||'Web';result.estimate=Number(result.estimate)||5;result.approved=false;return result;});
}
export function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}

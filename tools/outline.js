const {JSDOM}=require(__dirname+'/node_modules/jsdom');
const f=process.argv[2], sel=process.argv[3]||'.pagina-produto #corpo, body';
const d=new JSDOM(require('fs').readFileSync(f,'utf8')).window.document;
function walk(el,depth,max){ if(depth>max) return; for(const c of el.children){ if(['SCRIPT','STYLE','NOSCRIPT','svg','LINK','META'].includes(c.tagName)) continue; const id=c.id?'#'+c.id:''; const cls=c.className&&typeof c.className=='string'?'.'+c.className.trim().split(/\s+/).join('.'):''; const txt=c.children.length==0?(' "'+(c.textContent||'').trim().slice(0,50)+'"'):''; console.log('  '.repeat(depth)+c.tagName.toLowerCase()+id+cls+txt); walk(c,depth+1,max);} }
const root=d.querySelector(sel); console.log('BODY:',d.body.className); walk(root,0,+process.argv[4]||6);

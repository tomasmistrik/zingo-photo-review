/* Own photo: paste / drop / choose -> crop to the pick-row thumbnail ratio (.tile .im aspect-ratio var(--vis) = 390/320.48) -> JPEG 1600w q0.85 -> IndexedDB. */
(function(){
const RW=390,RH=320.48,OUTW=1600,OUTH=Math.round(OUTW*RH/RW),Q=0.85;
const DBN='zingo_own_photos';let dbp;
function db(){return dbp||(dbp=new Promise((ok,ko)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)}))}
function tx(mode,fn){return db().then(d=>new Promise((ok,ko)=>{const t=d.transaction('p',mode),s=t.objectStore('p');const r=fn(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>ko(t.error)}))}
const k=n=>KEY+':'+n,put=(n,b)=>tx('readwrite',s=>s.put(b,k(n))),get=n=>tx('readonly',s=>s.get(k(n))),del=n=>tx('readwrite',s=>s.delete(k(n)));
const ak=(n,L)=>'adj:'+n+':'+L,aput=(n,L,o)=>put(ak(n,L),o),aget=(n,L)=>get(ak(n,L)),adel=(n,L)=>del(ak(n,L));
const ADJ={};/* n -> {L:{rect,blob}} */const aurl={};
window.OwnPhoto={get,aget,ratio:RW/RH,ADJ};
let active=null,hover=null;const urls={};
function item(n){return D.find(p=>p.n===n)}
function fname(n){const p=item(n);return String((p&&p.id)||n).replace(/[^\w-]/g,'_')+'.jpg'}
function ownSel(){document.querySelectorAll('.tile.own').forEach(t=>t.classList.toggle('sel',val(+t.dataset.n)==='OWN'&&!!urls[t.dataset.n]))}
function markOwn(n,on){user[n]=on?'OWN':(val(n)==='OWN'?null:user[n]);save();paint(n);ownSel()}
function show(n,blob){const t=document.getElementById('own'+n);if(!t)return;const im=t.querySelector('.im');
 if(urls[n]){URL.revokeObjectURL(urls[n]);delete urls[n]}
 if(!blob){im.innerHTML='<div class="ophint"><b>＋</b>Paste (⌘V), drop<br>or click to choose</div>';t.querySelector('.meta').textContent='your own photo';return}
 urls[n]=URL.createObjectURL(blob);im.innerHTML=`<img src="${urls[n]}" style="height:100%"><button class="oprm" title="remove">✕</button>`;t.querySelector('.meta').textContent='your own photo (cropped)';
 im.querySelector('.oprm').onclick=e=>{e.stopPropagation();del(n).then(()=>{show(n,null);if(val(n)==='OWN')markOwn(n,false)})}}
function addTile(sec){const n=+sec.id.slice(1);if(document.getElementById('own'+n))return;
 const t=document.createElement('div');t.className='tile own';t.id='own'+n;t.dataset.n=n;t.tabIndex=0;
 t.innerHTML='<span class="lab">OWN</span><div class="im"></div><div class="meta"></div>';sec.querySelector('.row').appendChild(t);show(n,null);
 get(n).then(b=>{if(b){show(n,b);markOwn(n,val(n)==='OWN')}});
 const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.style.display='none';t.appendChild(fi);
 fi.onchange=()=>{if(fi.files[0])crop(n,fi.files[0]);fi.value=''};
 t.onclick=e=>{active=n;if(urls[n]&&val(n)!=='OWN'){markOwn(n,true);return}fi.click()};
 t.onmouseenter=()=>{hover=n;t.focus({preventScroll:true})};t.onmouseleave=()=>{if(hover===n)hover=null};t.onfocus=()=>active=n;
 t.ondragover=e=>{e.preventDefault();t.classList.add('drag')};t.ondragleave=()=>t.classList.remove('drag');
 t.ondrop=e=>{e.preventDefault();t.classList.remove('drag');const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));if(f)crop(n,f)};
 sec.addEventListener('click',()=>active=n,true);sec.addEventListener('mouseenter',()=>active=n);
 /* OWN button now opens the tile */
 const b=sec.querySelector('.btns button[data-k="OWN"]');if(b)b.addEventListener('click',e=>{if(!urls[n]){e.stopPropagation();fi.click()}},true);
}
document.addEventListener('paste',e=>{if(document.getElementById('opModal').classList.contains('on'))return;
 const f=[...(e.clipboardData||{}).items||[]].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile())[0];if(!f)return;
 let n=hover||active;if(!n){const s=[...document.querySelectorAll('.place')].find(s=>s.getBoundingClientRect().bottom>80);n=s&&+s.id.slice(1)}
 if(n){e.preventDefault();crop(n,f)}});
/* adjust any tile (current + A-E) */
function tileOf(n,L){const s=document.getElementById('p'+n);return L==='KEEP'?document.getElementById('cur'+n):s.querySelector(`.tile[data-k="${L}"]:not(.cur)`)}
function srcOf(n,L){if(L==='KEEP')return NOW[n]&&NOW[n].url;const p=item(n),c=p&&p.c.find(c=>c.l===L);return c&&(c.full||c.f)}
function showAdj(n,L){const t=tileOf(n,L);if(!t)return;const im=t.querySelector('.im img'),a=ADJ[n]&&ADJ[n][L],key=n+':'+L;
 if(aurl[key]){URL.revokeObjectURL(aurl[key]);delete aurl[key]}t.classList.toggle('adj',!!a);
 if(a){if(!t.dataset.orig)t.dataset.orig=im.getAttribute('data-src')||im.getAttribute('src')||'';aurl[key]=URL.createObjectURL(a.blob);im.removeAttribute('data-src');im.src=aurl[key];im.classList.add('adjimg');im.style.display=''}
 else if(t.dataset.orig!==undefined){im.classList.remove('adjimg');im.src=t.dataset.orig;delete t.dataset.orig}}
async function adjust(n,L){const p=item(n),a=ADJ[n]&&ADJ[n][L],url=(a&&a.src)||srcOf(n,L);if(!url){alert('No photo to adjust');return}
 try{const r=await fetch(url,{mode:'cors'});if(!r.ok)throw r.status;const b=await r.blob();crop(n,b,{L,src:url,rect:a&&a.rect})}catch(e){alert('Could not load this photo for adjusting ('+e+')')}}
function addAdj(sec){const n=+sec.id.slice(1);sec.querySelectorAll('.tile:not(.own)').forEach(t=>{const L=t.classList.contains('cur')?'KEEP':t.dataset.k;if(!L||t.querySelector('.adjbtn'))return;
 const b=document.createElement('button');b.className='adjbtn';b.title='Reposition / zoom';b.textContent='✥';b.onclick=e=>{e.stopPropagation();if(L==='KEEP'&&!hasCur(n))return;adjust(n,L)};
 const r=document.createElement('button');r.className='adjrst';r.title='Reset to original';r.textContent='↺';r.onclick=e=>{e.stopPropagation();adel(n,L).then(()=>{if(ADJ[n])delete ADJ[n][L];showAdj(n,L)})};
 const d=document.createElement('span');d.className='adjdot';d.title='adjusted';t.append(b,r,d)});
}
function loadAdj(){return db().then(d=>new Promise(ok=>{const t=d.transaction('p'),s=t.objectStore('p'),r=s.openCursor(),pre=KEY+':adj:';
 r.onsuccess=()=>{const c=r.result;if(!c){ok();return}if(String(c.key).startsWith(pre)){const [n,L]=String(c.key).slice(pre.length).split(':');(ADJ[+n]=ADJ[+n]||{})[L]=c.value}c.continue()}}))
 .then(()=>Object.keys(ADJ).forEach(n=>Object.keys(ADJ[n]).forEach(L=>showAdj(+n,L))))}
/* crop editor */
const M=document.createElement('div');M.id='opModal';M.innerHTML='<div id="opTitle"></div><div id="opFrame"><img></div><div class="ctl">Zoom <input type="range" id="opZoom" min="1" max="4" step="0.01" value="1"></div><div class="ctl"><button id="opCancel">Cancel</button><button id="opSave">Use this crop</button></div><div style="font-size:12px;opacity:.7">Drag to position · scroll / pinch / slider to zoom · frame = same shape as the photo tiles</div>';
document.body.appendChild(M);
const F=M.querySelector('#opFrame'),I=F.querySelector('img'),Z=M.querySelector('#opZoom');let st=null;
let raf=0;function lay(){if(!raf)raf=requestAnimationFrame(lay0)}
function lay0(){raf=0;if(!st)return;const fw=F.clientWidth,fh=F.clientHeight,b=Math.max(fw/st.w,fh/st.h),s=b*st.z;
 st.x=Math.min(0,Math.max(fw-st.w*s,st.x));st.y=Math.min(0,Math.max(fh-st.h*s,st.y));I.style.transform=`translate3d(${st.x}px,${st.y}px,0) scale(${s})`;st.s=s}
function fix(){const fw=F.clientWidth,fh=F.clientHeight,s=Math.max(fw/st.w,fh/st.h)*st.z;st.s=s;st.x=Math.min(0,Math.max(fw-st.w*s,st.x));st.y=Math.min(0,Math.max(fh-st.h*s,st.y))}
function zoomTo(z,cx,cy){z=Math.min(4,Math.max(1,z));const fw=F.clientWidth,fh=F.clientHeight;cx=cx??fw/2;cy=cy??fh/2;const ix=(cx-st.x)/st.s,iy=(cy-st.y)/st.s;st.z=z;
 const s=Math.max(fw/st.w,fh/st.h)*z;st.x=cx-ix*s;st.y=cy-iy*s;Z.value=z;fix();lay()}
function crop(n,file,o){o=o||{};const p=item(n);const u=URL.createObjectURL(file);I.onload=()=>{st={n,u,o,w:I.naturalWidth,h:I.naturalHeight,z:1,x:0,y:0};I.style.width=st.w+'px';I.style.height=st.h+'px';
  M.classList.add('on');const fw=F.clientWidth,fh=F.clientHeight,b=Math.max(fw/st.w,fh/st.h);
  if(o.rect){st.z=Math.min(4,Math.max(1,fw/(o.rect.w*st.w)/b));const s=b*st.z;st.s=s;st.x=-o.rect.x*st.w*s;st.y=-o.rect.y*st.h*s}else{st.s=b;st.x=(fw-st.w*b)/2;st.y=(fh-st.h*b)/2}
  Z.value=st.z;lay()};
 I.onerror=()=>alert('Could not read that image');I.src=u;M.querySelector('#opTitle').textContent=(p?((p.id||p.n)+'. '+p.name):'')+(o.L?'  ·  adjust '+(o.L==='KEEP'?'current':o.L):'')}
Z.oninput=()=>zoomTo(+Z.value);
F.addEventListener('wheel',e=>{e.preventDefault();const r=F.getBoundingClientRect();zoomTo(st.z*Math.exp(-e.deltaY*0.002),e.clientX-r.left,e.clientY-r.top)},{passive:false});
const pts=new Map();let last=null;
F.addEventListener('pointerdown',e=>{F.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);last=null});
F.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const pr=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
 if(pts.size===1){st.x+=e.clientX-pr[0];st.y+=e.clientY-pr[1];fix();lay()}else{const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);const r=F.getBoundingClientRect();if(last)zoomTo(st.z*d/last,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top);last=d}});
['pointerup','pointercancel'].forEach(ev=>F.addEventListener(ev,e=>{pts.delete(e.pointerId);last=null}));
F.addEventListener('gesturestart',e=>{e.preventDefault();st.g=st.z});F.addEventListener('gesturechange',e=>{e.preventDefault();zoomTo(st.g*e.scale)}); /* Safari trackpad pinch */
function close(){M.classList.remove('on');if(st)URL.revokeObjectURL(st.u);st=null;F.style.cursor=''}
M.querySelector('#opCancel').onclick=close;
M.querySelector('#opSave').onclick=()=>{const c=document.createElement('canvas');c.width=OUTW;c.height=OUTH;const g=c.getContext('2d');g.imageSmoothingQuality='high';
 fix();const sx=-st.x/st.s,sy=-st.y/st.s,sw=F.clientWidth/st.s,sh=F.clientHeight/st.s;g.drawImage(I,sx,sy,sw,sh,0,0,OUTW,OUTH);const n=st.n,o=st.o;
 const rect={x:+(sx/st.w).toFixed(5),y:+(sy/st.h).toFixed(5),w:+(sw/st.w).toFixed(5),h:+(sh/st.h).toFixed(5),src_w:st.w,src_h:st.h};
 c.toBlob(b=>{const done=o.L?aput(n,o.L,{rect,blob:b,src:o.src}).then(()=>{(ADJ[n]=ADJ[n]||{})[o.L]={rect,blob:b,src:o.src};showAdj(n,o.L);user[n]=o.L;save();paint(n);ownSel()})
   :put(n,b).then(()=>{show(n,b);markOwn(n,true)});done.then(close).catch(e=>alert('Save failed: '+e))},'image/jpeg',Q)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&st)close()});
/* export: ZIP with picks.json + own/<id>.jpg */
window.dl=async function(){doExport();const r=JSON.parse($('#out').value),z=new JSZip(),files={};
 for(const p of D){if(val(p.n)!=='OWN')continue;const b=await get(p.n);if(b){const f='own/'+fname(p.n);z.file(f,b);files[p.n]=f}}
 const adj={};for(const n of Object.keys(ADJ))for(const L of Object.keys(ADJ[n])){const a=ADJ[n][L],f='adjusted/'+fname(+n).replace(/\.jpg$/,'')+'_'+(L==='KEEP'?'CURRENT':L)+'.jpg';z.file(f,a.blob);(adj[n]=adj[n]||{})[L]={...a.rect,source:a.src,file:f}}
 r.own_photo_files=files;r.adjustments=adj;z.file('picks.json',JSON.stringify(r,null,1));
 const blob=await z.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(window.OWN_ZIP_NAME||'zingo_photo_picks')+'.zip';document.body.appendChild(a);a.click();a.remove()};
/* hook into render */
const r0=window.render;window.render=function(){r0.apply(this,arguments);document.querySelectorAll('.place').forEach(s=>{addTile(s);addAdj(s)});loadAdj()};
})();

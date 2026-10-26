let role=null, currentLoginId=null, roomsRole=null;
var viewAuto=true, mapSizeSig='', mapLock=true, sizeDrag=null, ZOOM_MIN=0.1, ZOOM_MAX=12;
const state={
  chapter:'CAPÍTULO 01 — ORIENTAÇÃO', location:'CORTEX HEADQUARTERS',
  timerSec:0, timerRunning:false, timerAt:0, musicNow:null, turn:0, round:1, startedAt:Date.now(), mapBackground:null,
  turnOrder:[],
  grid:false, fogLevel:0,
  fogCfg:{vision:false,radius:14,brush:12,tool:'',holes:[]},
  setups:[], activeSetup:null,
  zoom:1, panX:0, panY:0,
  mapSize:{w:1000,h:563,fit:'cover',grid:40},
  characters:{},
  enemies:{},
  npcs:{},
  log:[],
  notes:{shared:[],private:{}},
  noteTab:'my',
  locations:['CORTEX HEADQUARTERS','CORTEX LOBBY','CORTEX FLOOR 07','CORTEX BASEMENT','CORTEX ROOFTOP','THE EMPTY CITY'],
  rooms:[
    {id:'r1',name:'',x:4,y:8,w:22,h:28,color:'gray'},
    {id:'r2',name:'',x:30,y:6,w:34,h:20,color:'gray'},
    {id:'r3',name:'',x:68,y:8,w:26,h:34,color:'gray'},
    {id:'r4',name:'',x:4,y:42,w:40,h:40,color:'gray'},
    {id:'r5',name:'',x:48,y:50,w:24,h:32,color:'gray'}],
  roomEdit:false,
  tracks:[],
  events:[{id:'ev1',title:'THE ELEVATOR',trigger:'PLAYER ENTERS FLOOR 13',text:'YOU ARE NOT SUPPOSED\nTO BE HERE.',track:''}],
  currentPlayer:null,
  customActions:[],
  mapImages:[],
  sceneEffect:'none', library:{enemies:[],npcs:[]},
  spotlight:null,
};
let enemyCounter=0, npcCounter=0;

function goto(id){
  if(id==='intro'||id==='login') musicHalt();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  if(id==='session'){ renderAll(); }
}

const ACCOUNTS={
  'LL1':{password:'301217', role:'gm', label:'GAME MASTER'},
  '2':{password:'2', role:'player'}
};
function doLogin(){
  if(window.ONLINE_ON && !window.ONLINE_READY){
    const m=document.getElementById('login-msg'); m.style.color='var(--amber)';
    m.textContent='SINCRONIZANDO COM O SERVIDOR... TENTE DE NOVO EM INSTANTES.'; return;
  }
  const id=document.getElementById('emp-id').value.trim().toUpperCase();
  const pass=document.getElementById('emp-pass').value;
  const acc=ACCOUNTS[id];
  const msg=document.getElementById('login-msg');
  if(!acc || acc.password!==pass){
    msg.style.color='var(--red-dark)';
    msg.textContent='ACESSO NEGADO — Vou ter que refazer seu login??? :(';
    return;
  }
  role=acc.role; currentLoginId=id;
  musicUnlock(); if(role==='gm') musicPublish();
  try{ sessionStorage.setItem('d0login',JSON.stringify({id,pass})); }catch(e){}
  if(role==='player') state.currentPlayer=acc.character||null;
  msg.style.color='var(--term)';
  const loginName=acc.label||(acc.character&&state.characters[acc.character]?state.characters[acc.character].short:'PLAYER');
  msg.textContent='ACESSO LIBERADO! — BEM VINDO!, '+loginName+'.';
  setTimeout(()=>{ goto('session'); initOnlinePresence(); updateUserBadge(); },450);
}
function doLogout(){
  stopOnlinePresence();
  if(role==='gm') musicHalt();
  try{ sessionStorage.removeItem('d0login'); }catch(e){}
  role=null; state.currentPlayer=null; (function(){const b=document.getElementById('log-list'); if(b) b.innerHTML='';})(); document.getElementById('emp-id').value=''; document.getElementById('emp-pass').value=''; 
  document.getElementById('login-msg').textContent='';
  goto('login');
}
// depois de F5, entra de novo sozinho (só nesta aba) assim que os dados do servidor chegam
function autoLogin(){
  if(role) return;
  let sv=null; try{ sv=JSON.parse(sessionStorage.getItem('d0login')||'null'); }catch(e){}
  if(!sv) return;
  document.getElementById('emp-id').value=sv.id; document.getElementById('emp-pass').value=sv.pass;
  doLogin();
  if(!role){ try{ sessionStorage.removeItem('d0login'); }catch(e){} document.getElementById('login-msg').textContent=''; }
}
window.addEventListener('load',()=>{ if(!window.ONLINE_ON) autoLogin(); });
document.addEventListener('click',e=>{
  const d=document.getElementById('gm-tools'); if(!d||!d.open) return;
  if(!d.contains(e.target) || e.target.closest('.tools-pop button')) d.open=false;
});
function updateUserBadge(){
  const el=document.getElementById('user-badge-text');
  if(role==='gm'){ el.textContent='OLÁ LELIS!'; }
  else { const c=state.characters[state.currentPlayer]; const pn=((c&&c.playerName)||currentLoginId||'PLAYER').toUpperCase(); el.textContent=c?('OLÁ '+pn+' • '+c.short):'PLAYER'; }
  document.getElementById('btn-gm-control').style.display= role==='gm'?'inline-block':'none'; document.getElementById('btn-board').style.display= role==='gm'?'inline-block':'none';
  ['btn-rooms','btn-report','btn-music','btn-fog','btn-freveal','btn-fhide'].forEach(id=>{const b=document.getElementById(id); if(b) b.style.display= role==='gm'?'inline-block':'none';});
  document.querySelectorAll('.gm-only').forEach(e=>e.style.display=role==='gm'?'':'none');
  document.querySelectorAll('.top-menu').forEach(e=>e.style.display=role==='gm'?'':'none');
  const resetTop=document.getElementById('btn-reset-match-top'); if(resetTop) resetTop.style.display=role==='gm'?'':'none';
  const cm=document.querySelector('#menu-personagens'); if(cm) cm.closest('details').style.display=role==='gm'?'':'none';
  const gt=document.getElementById('gm-tools'); if(gt) gt.style.display= role==='gm'?'inline-block':'none';
  const tb=document.getElementById('turn-btns'); if(tb) tb.style.display= role==='gm'?'':'none';
  const mv=document.getElementById('music-vol-player'); if(mv) mv.classList.toggle('hidden',role!=='player');
  music.audio.volume=musicEffVol();
  renderTimer();
  msgComposerUpdate();
  renderLog();
  if(roomsRole!==role){ roomsRole=role; renderRooms(); }
  renderRoomToolbar();
}

(function buildCity(){
  const c=document.getElementById('city');
  const n=26;
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    const h=20+Math.random()*55;
    const w=100/n;
    d.className='bldg'+(i===Math.floor(n/2)?' tall':'');
    d.style.width=w+'%';
    d.style.height=(i===Math.floor(n/2)? 96:h)+'%';
    if(Math.random()>.5){const s=document.createElement('span');s.style.top=(10+Math.random()*70)+'%';s.style.left=(20+Math.random()*60)+'%';d.appendChild(s);}
    c.appendChild(d);
  }
})();
function tickClock(){document.getElementById('intro-clock').textContent=new Date().toLocaleString('pt-BR');}
setInterval(tickClock,1000); tickClock();

let timerOffset=0; // diferença relógio local x servidor (online.js preenche)
function fmtTimer(s){const h=String(Math.floor(s/3600)).padStart(2,'0');const m=String(Math.floor(s%3600/60)).padStart(2,'0');const sec=String(s%60).padStart(2,'0');return h+':'+m+':'+sec;}
// tempo = segundos acumulados + (agora - início) quando está rodando. Todos calculam o mesmo valor.
function timerNow(){
  let s=+state.timerSec||0;
  if(state.timerRunning && state.timerAt) s+=Math.max(0,Math.floor((Date.now()+timerOffset-state.timerAt)/1000));
  return s;
}
function renderTimer(){
  const d=document.getElementById('timer-display'); if(d) d.textContent=fmtTimer(timerNow());
  const b=document.getElementById('timer-btn'); if(b) b.textContent=state.timerRunning?'PAUSAR':'INICIAR';
  const gm=role==='gm';
  ['timer-btn','timer-reset'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display=gm?'':'none'; });
}
function toggleTimer(){
  if(role!=='gm') return;
  if(state.timerRunning){ state.timerSec=timerNow(); state.timerRunning=false; state.timerAt=0; }
  else { state.timerAt=Date.now()+timerOffset; state.timerRunning=true; }
  renderTimer();
}
function resetTimer(){
  if(role!=='gm') return;
  state.timerSec=0; state.timerRunning=false; state.timerAt=0; renderTimer();
}
setInterval(renderTimer,500);

function allCombatants(){return [...Object.entries(state.characters).map(([id,c])=>({id,...c,kind:'pc'})),...Object.entries(state.enemies).map(([id,c])=>({id,...c,kind:'enemy'})),...Object.entries(state.npcs).map(([id,c])=>({id,...c,kind:'npc'}))];}

function renderAll(){
  applyMapSize();
  renderParticipants(); renderEnemiesList(); renderNpcsList(); renderTokens(); renderMapImages(); renderLog(); renderTurns(); renderTimer(); updateUserBadge(); renderSceneEffect();
  document.getElementById('chap-label').textContent=state.chapter+' · '+state.location;
}

const openFolders=new Set(), autoOpened=new Set();
function makeFolder({key,kind,avatar,initial,name,hpPct,acting,bodyHtml,onOpen}){
  const el=document.createElement('div');
  el.className='folder '+kind+(openFolders.has(key)?' open':'');
  el.innerHTML=`<div class="folder-tab">
      <div class="ft-av" style="${kind==='enemy'?'background:#3a1414':kind==='npc'?'background:#142014':''}">${avatar?`<img src="${avatar}">`:initial}</div>
      <span class="ft-name">${name}</span>
      ${acting?'<span class="ft-act">ACTING</span>':''}
      ${hpPct!=null?`<span class="ft-hp"><i style="width:${hpPct}%"></i></span>`:''}
      <span class="ft-chev">▸</span>
    </div>
    <div class="folder-body"><div class="folder-inner">${bodyHtml}
      <button class="btn small ghost folder-open">ABRIR DOSSIÊ</button></div></div>`;
  el.querySelector('.folder-tab').onclick=()=>{
    const o=el.classList.toggle('open');
    if(o) openFolders.add(key); else openFolders.delete(key);
  };
  el.querySelector('.folder-open').onclick=e=>{e.stopPropagation(); onOpen();};
  return el;
}
function renderParticipants(){
  clearTimeout(afterT); afterT=setTimeout(afterRender,0);
  const box=document.getElementById('participants-list'); box.innerHTML='';
  Object.entries(state.characters).forEach(([id,c])=>{
    const acting=id===state.turnOrder[state.turn];
    const mine=id===state.currentPlayer, lite=role==='player'&&!mine;
    if(role==='player'&&mine&&!autoOpened.has(id)){ autoOpened.add(id); openFolders.add(id); }
    box.appendChild(makeFolder({key:id,kind:'pc',avatar:c.avatar,initial:(c.short||'?')[0],name:c.short,
      hpPct:100*c.hp/c.maxHp,acting,onOpen:()=>openSheet(id),
      bodyHtml:lite?`<div class="bar hp"><i style="width:${100*c.hp/c.maxHp}%"></i></div><div class="stat-line"><span>HP ${c.hp}/${c.maxHp}</span></div>`:`<div class="arcana">${c.arcana}</div>
        <div class="bar hp"><i style="width:${100*c.hp/c.maxHp}%"></i></div>
        <div class="stat-line"><span>HP ${c.hp}/${c.maxHp}</span><span>SP ${c.sp}/${c.maxSp}</span></div>
        <div class="bar sp"><i style="width:${100*c.sp/c.maxSp}%"></i></div>
        <div style="margin-top:4px">${(c.status||[]).map(s=>`<span class="status-tag">${s}</span>`).join('')}</div>`}));
  });
}
function renderEnemiesList(){
  const box=document.getElementById('enemies-list');
  const es=Object.entries(state.enemies);
  if(!es.length){box.innerHTML='Nenhum inimigo por enquanto...';return;}
  box.innerHTML='';
  es.forEach(([id,c])=>{
    box.appendChild(makeFolder({key:id,kind:'enemy',avatar:c.avatar,initial:c.short[0],name:c.short,
      hpPct:100*c.hp/c.maxHp,onOpen:()=>openSheet(id),
      bodyHtml:`<div class="arcana" style="color:#8a5a00">${c.type||'ENEMY'}</div>
        <div class="bar hp"><i style="width:${100*c.hp/c.maxHp}%"></i></div>
        <div class="stat-line"><span>HP ${c.hp}/${c.maxHp}</span><span>LV ${c.level||'?'}</span></div>
        <div style="margin-top:4px">${(c.status||[]).map(s=>`<span class="status-tag">${s}</span>`).join('')}</div>`}));
  });
}
function renderNpcsList(){
  const box=document.getElementById('npcs-list');
  const ns=Object.entries(state.npcs);
  if(!ns.length){box.innerHTML='Nenhum NPC no mapa por enquanto...';return;}
  box.innerHTML='';
  ns.forEach(([id,c])=>{
    box.appendChild(makeFolder({key:id,kind:'npc',avatar:c.avatar,initial:c.short[0],name:c.short,
      hpPct:null,onOpen:()=>openSheet(id),
      bodyHtml:`<div class="arcana" style="color:#1f6b3a">${c.role||'NPC'}</div>`}));
  });
}

function renderTokens(){
  const wrap=document.getElementById('map-wrap'); if(!wrap) return;
  const old=new Map();
  wrap.querySelectorAll('.token').forEach(t=>old.set(t.dataset.kind+':'+t.dataset.id,t));
  allCombatants().forEach(c=>{
    const key=c.kind+':'+c.id;
    let t=old.get(key); old.delete(key);
    const hasHp=typeof c.maxHp==='number';
    if(!t){
      t=document.createElement('div');
      t.dataset.id=c.id; t.dataset.kind=c.kind;
      t.onclick=()=>{ if(!t.dragging) openTokenMenu(t); };
      t.addEventListener('pointerdown',startDrag);
      wrap.appendChild(t);
    }
    const fx=['hit','healed','ko'].filter(k=>t.classList.contains(k)).map(k=>' '+k).join('');
    t.className='token'+fx+(c.kind==='enemy'?' enemy':'')+(c.kind==='npc'?' npc':'')+(hasHp&&c.hp<=0?' downed':'')+(t===dragTok?' dragging-now':'');
    // só mexe no conteúdo (e recarrega a imagem) se algo visível mudou
    const sig=[c.avatar||'',c.short||'',hasHp?c.hp+'/'+c.maxHp:'-'].join('|');
    if(t._sig!==sig){
      t._sig=sig;
      const avatarOrLetter = c.avatar? `<img class="token-avatar" src="${c.avatar}">` : (hasHp&&c.hp<=0?'✕':(c.short||'?')[0]);
      const dmgHtml = hasHp? `<div class="dmg" data-dmg></div>` : '';
      const hpHtml = hasHp? `<div class="hp-mini"><i style="width:${100*c.hp/c.maxHp}%"></i></div>` : '';
      t.innerHTML=`${avatarOrLetter}${dmgHtml}${hpHtml}`;
    }
    if(t!==dragTok){
      t.style.left=(typeof c.x==='number'?c.x:50)+'%';
      t.style.top=(typeof c.y==='number'?c.y:50)+'%';
    }
  });
  old.forEach(t=>t.remove());
  updateTokenVisibility();
}
let dragTok=null,dragWrap=null;
function startDrag(e){
  const id=e.currentTarget.dataset.id, kind=e.currentTarget.dataset.kind;
  if(role==='player' && !(kind==='pc' && id===state.currentPlayer)) return;
  e.stopPropagation();
  dragTok=e.currentTarget; dragTok.dragging=false; dragWrap=document.getElementById('map-wrap');
  dragTok.classList.add('dragging-now');
  dragTok.setPointerCapture(e.pointerId);
  dragTok.addEventListener('pointermove',onDrag);
  dragTok.addEventListener('pointerup',endDrag);
  dragTok.addEventListener('pointercancel',endDrag);
}
function onDrag(e){
  if(!dragTok) return; dragTok.dragging=true;
  const r=dragWrap.getBoundingClientRect();
  let x=(e.clientX-r.left)/r.width*100, y=(e.clientY-r.top)/r.height*100;
  x=Math.round(Math.max(2,Math.min(98,x))*100)/100; y=Math.round(Math.max(4,Math.min(96,y))*100)/100;
  dragTok.style.left=x+'%'; dragTok.style.top=y+'%';
  const id=dragTok.dataset.id, kind=dragTok.dataset.kind;
  const obj= kind==='pc'? state.characters[id] : kind==='npc'? state.npcs[id] : state.enemies[id];
  if(!obj) return;
  obj.x=x; obj.y=y;
  if(state.fogLevel>0 && state.fogCfg.vision) renderFog();
}
function endDrag(e){
  const t=dragTok; if(!t) return;
  t.removeEventListener('pointermove',onDrag); t.removeEventListener('pointerup',endDrag); t.removeEventListener('pointercancel',endDrag);
  t.classList.remove('dragging-now');
  dragTok=null;
  setTimeout(()=>{ t.dragging=false; },50);
}

function toggleGrid(){
  state.grid=!state.grid;
  document.getElementById('grid-overlay').classList.toggle('on',state.grid);
  document.getElementById('btn-grid').classList.toggle('on-state',state.grid);
}
const FOG_LEVELS=[{n:'DESLIGADO',o:0},{n:'LEVE',o:.35},{n:'MÉDIO',o:.6},{n:'DENSO',o:.85},{n:'BREU',o:1}];
function fogCircles(){
  const c=state.fogCfg.holes.map(h=>({x:h.x,y:h.y,r:h.r}));
  if(state.fogCfg.vision) Object.values(state.characters).forEach(ch=>c.push({x:ch.x,y:ch.y,r:state.fogCfg.radius}));
  return c;
}
function fogDims(){ const m=mapSizeNow(), vh=160*m.h/m.w; return {vh,fy:vh/100}; }
function isRevealed(x,y){
  const fy=fogDims().fy;
  if(fogCircles().some(h=>Math.hypot((x-h.x)*1.6,(y-h.y)*fy)<=h.r*1.6)) return true;
  return state.rooms.some(r=>r.revealed && r.kind!=='cover' && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h);
}
function renderFog(){
  const svg=document.getElementById('fog'); if(!svg) return;
  const {vh,fy}=fogDims();
  svg.setAttribute('viewBox','0 0 160 '+vh);
  const lvl=FOG_LEVELS[state.fogLevel]||FOG_LEVELS[0];
  if(!lvl.o){ svg.classList.add('hidden'); svg.innerHTML=''; updateTokenVisibility(); return; }
  svg.classList.remove('hidden');
  const op= role==='gm'? Math.min(lvl.o,.5) : lvl.o;
  const holes=fogCircles().map(h=>`<circle cx="${h.x*1.6}" cy="${h.y*fy}" r="${h.r*1.6}"/>`).join('')
    + state.rooms.filter(r=>r.revealed && r.kind!=='cover').map(r=>`<rect x="${r.x*1.6}" y="${r.y*fy}" width="${r.w*1.6}" height="${r.h*fy}"/>`).join('');
  svg.innerHTML=`<defs><filter id="fogblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <mask id="fogmask"><rect width="160" height="${vh}" fill="white"/><g fill="black" filter="url(#fogblur)">${holes}</g></mask></defs>
    <rect width="160" height="${vh}" fill="#000" fill-opacity="${op}" mask="url(#fogmask)"/>`;
  updateTokenVisibility();
}
function updateTokenVisibility(){
  document.querySelectorAll('#map-wrap .token').forEach(t=>{
    let hide=false;
    if(role!=='gm' && state.fogLevel>0 && t.dataset.kind!=='pc'){ const o=findObj(t.dataset.id); hide=!!o && !isRevealed(o.x,o.y); }
    t.style.display=hide?'none':'';
  });
}
function updateFogButtons(){
  const b=document.getElementById('btn-fog'); if(!b) return;
  b.textContent='FOG: '+FOG_LEVELS[state.fogLevel].n; b.classList.toggle('on-state',state.fogLevel>0); const q=document.getElementById('btn-fog-quick'); if(q){q.textContent=b.textContent;q.classList.toggle('on-state',state.fogLevel>0);}
  ['reveal','hide'].forEach(t=>{ const x=document.getElementById('btn-f'+t); if(x) x.classList.toggle('on-state',state.fogCfg.tool===t); });
  document.getElementById('map-viewport').classList.toggle('fog-tool',!!state.fogCfg.tool);
}
function setFogLevel(i){
  if(role!=='gm') return;
  state.fogLevel=i; renderFog(); updateFogButtons(); addLog('Fog of War: '+FOG_LEVELS[i].n+'.');
  if(gmActivePane==='map') gmRenderMap();
}
function toggleFog(){ setFogLevel((state.fogLevel+1)%FOG_LEVELS.length); }
function fogSetTool(t){
  if(role!=='gm') return;
  state.fogCfg.tool= state.fogCfg.tool===t? '' : t;
  if(state.fogCfg.tool && state.fogLevel===0){ setFogLevel(2); return; }
  updateFogButtons(); if(gmActivePane==='map') gmRenderMap();
}
function fogSetVision(on){ state.fogCfg.vision=!!on; renderFog(); }
function fogSetRadius(v){ state.fogCfg.radius=+v; renderFog(); }
function fogSetBrush(v){ state.fogCfg.brush=+v; }
function fogClear(){ state.fogCfg.holes=[]; renderFog(); if(gmActivePane==='map') gmRenderMap(); }
function gmRoomRevealed(id,on){ const r=state.rooms.find(x=>x.id===id); if(r){ r.revealed=!!on; renderFog(); } }
function fogClick(e){
  const rect=document.getElementById('map-wrap').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*100, y=(e.clientY-rect.top)/rect.height*100;
  if(x<0||x>100||y<0||y>100) return;
  if(state.fogCfg.tool==='reveal') state.fogCfg.holes.push({x,y,r:state.fogCfg.brush});
  else if(state.fogCfg.tool==='hide') state.fogCfg.holes=state.fogCfg.holes.filter(h=>Math.hypot((x-h.x)*1.6,(y-h.y)*fogDims().fy)>h.r*1.6);
  renderFog();
}

function applyMapTransform(){
  const wrap=document.getElementById('map-wrap');
  wrap.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  wrap.style.setProperty('--z',state.zoom);
  document.getElementById('zoom-lvl').textContent=Math.round(state.zoom*100)+'%';
  const rg=document.getElementById('zoom-range'); if(rg) rg.value=Math.log2(state.zoom).toFixed(3);
}
function clampZoom(z){ return Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,z)); }
function zoomAt(z,sx,sy){
  const r=document.getElementById('map-viewport').getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  if(sx===undefined){ sx=cx; sy=cy; }
  const nz=clampZoom(z), k=nz/state.zoom;
  state.panX=(sx-cx)-k*(sx-cx-state.panX);
  state.panY=(sy-cy)-k*(sy-cy-state.panY);
  state.zoom=+nz.toFixed(3);
  viewAuto=false;
  applyMapTransform();
}
function zoomMap(dir){ zoomAt(state.zoom*(dir>0?1.25:0.8)); }
function zoomSlider(v){ zoomAt(Math.pow(2,+v)); }
function fitView(){
  const vp=document.getElementById('map-viewport'); if(!vp) return;
  const vw=vp.clientWidth, vh=vp.clientHeight; if(!vw||!vh) return;
  const m=mapSizeNow();
  state.zoom=+clampZoom(Math.min(vw/m.w,vh/m.h)).toFixed(3); state.panX=0; state.panY=0;
  viewAuto=true;
  applyMapTransform();
}
function resetView(){ fitView(); }

function clampPx(v){ return Math.max(200,Math.min(6000,Math.round(+v)||1000)); }
function mapSizeNow(){
  const m=Object.assign({w:1000,h:563,fit:'cover',grid:40},state.mapSize||{});
  m.w=clampPx(m.w); m.h=clampPx(m.h);
  return m;
}
function setMapSize(m,noFit){
  state.mapSize=Object.assign({},m,{w:clampPx(m.w),h:clampPx(m.h)});
  applyMapSize(noFit);
}
function applyMapSize(noFit){
  const wrap=document.getElementById('map-wrap'); if(!wrap) return;
  const m=mapSizeNow(), sig=[m.w,m.h,m.fit,m.grid,m.tok||0].join('|');
  if(sig===mapSizeSig) return;
  mapSizeSig=sig;
  wrap.style.width=m.w+'px'; wrap.style.height=m.h+'px';
  if(m.tok) wrap.style.setProperty('--tok',m.tok+'px'); else wrap.style.removeProperty('--tok');
  const img=document.getElementById('map-bg-img'); if(img) img.style.objectFit=m.fit;
  const g=document.getElementById('grid-overlay');
  if(g){
    const l=`rgba(243,240,232,.18) 0px,rgba(243,240,232,.18) 1px,transparent 1px,transparent ${m.grid}px`;
    g.style.backgroundImage=`repeating-linear-gradient(0deg,${l}),repeating-linear-gradient(90deg,${l})`;
  }
  renderFog();
  if(viewAuto && !noFit) fitView();
}
function gmMapSize(k,v){
  if(role!=='gm') return;
  const m=mapSizeNow();
  if(k==='fit') m.fit=v;
  else if(k==='tok'){ v=Math.round(+v); if(v>=16&&v<=200) m.tok=v; else delete m.tok; }
  else if(k==='grid') m.grid=Math.max(10,Math.min(200,Math.round(+v)||40));
  else {
    v=Math.round(+v); if(!(v>0)) return refreshRoomUI();
    const r=m.w/m.h;
    if(k==='w'){ m.w=v; if(mapLock) m.h=Math.round(v/r); }
    else { m.h=v; if(mapLock) m.w=Math.round(v*r); }
  }
  setMapSize(m); refreshRoomUI();
}
function gmMapPreset(v){
  if(role!=='gm'||!v) return;
  const p=v.split(':').map(Number), m=mapSizeNow();
  m.h=Math.round(m.w*p[1]/p[0]);
  setMapSize(m); refreshRoomUI();
}
function gmMapMatchImage(){
  if(role!=='gm'||!state.mapBackground) return;
  const i=new Image();
  i.onload=()=>{ const m=mapSizeNow(); m.h=Math.round(m.w*i.naturalHeight/i.naturalWidth); setMapSize(m); refreshRoomUI(); };
  i.src=state.mapBackground;
}
function toggleMapLock(){ mapLock=!mapLock; refreshRoomUI(); }
const MAP_RATIOS=['16:9','4:3','3:2','1:1','3:4','9:16','21:9'];
const MAP_FITS=[['cover','IMAGEM: PREENCHER'],['contain','IMAGEM: INTEIRA'],['fill','IMAGEM: ESTICAR']];
function mapToolsHtml(){
  const m=mapSizeNow();
  return `<b>MAPA</b>
    <label>LARGURA <input type="number" min="200" max="6000" step="50" value="${m.w}" onchange="gmMapSize('w',this.value)"></label>
    <label>ALTURA <input type="number" min="200" max="6000" step="50" value="${m.h}" onchange="gmMapSize('h',this.value)"></label>
    <button class="btn small ghost ${mapLock?'on-state':''}" onclick="toggleMapLock()" title="mantém a proporção ao mudar largura ou altura">${mapLock?'🔒':'🔓'} PROPORÇÃO</button>
    <select onchange="gmMapPreset(this.value)"><option value="">FORMATO…</option>${MAP_RATIOS.map(r=>`<option value="${r}">${r}</option>`).join('')}</select>
    <label>CÉLULA <input type="number" min="10" max="200" step="5" value="${m.grid}" onchange="gmMapSize('grid',this.value)"></label>
    <label>TOKEN <input type="number" min="16" max="200" step="2" value="${m.tok||''}" placeholder="38" onchange="gmMapSize('tok',this.value)"></label>
    <select onchange="gmMapSize('fit',this.value)">${MAP_FITS.map(f=>`<option value="${f[0]}" ${m.fit===f[0]?'selected':''}>${f[1]}</option>`).join('')}</select>
    ${state.mapBackground?'<button class="btn small ghost" onclick="gmMapMatchImage()">USAR FORMATO DA IMAGEM</button>':''}
    <button class="btn small ghost" onclick="fitView()">AJUSTAR À TELA</button>`;
}
function sizeHandleDown(e){
  if(role!=='gm') return;
  e.stopPropagation(); e.preventDefault();
  const m=mapSizeNow(), el=e.currentTarget;
  sizeDrag={sx:e.clientX,sy:e.clientY,w:m.w,h:m.h,z:state.zoom,el};
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove',sizeHandleMove);
  el.addEventListener('pointerup',sizeHandleUp);
  el.addEventListener('pointercancel',sizeHandleUp);
}
function sizeHandleMove(e){
  const d=sizeDrag; if(!d) return;
  let w=d.w+2*(e.clientX-d.sx)/d.z, h=d.h+2*(e.clientY-d.sy)/d.z;
  if(mapLock) h=w*d.h/d.w;
  setMapSize(Object.assign(mapSizeNow(),{w,h}),true);
}
function sizeHandleUp(){
  const d=sizeDrag; if(!d) return;
  d.el.removeEventListener('pointermove',sizeHandleMove);
  d.el.removeEventListener('pointerup',sizeHandleUp);
  d.el.removeEventListener('pointercancel',sizeHandleUp);
  sizeDrag=null; refreshRoomUI();
}

let panClick=null, panning=false, panStart={x:0,y:0}, panOrigin={x:0,y:0};
function mapPointerDown(e){
  if(e.target.closest('.token')) return;
  if(role==='gm' && e.target.closest('.map-img')) return;
  if(e.target.closest('.map-room.editing')) return;
  panClick={x:e.clientX,y:e.clientY};
  panning=true; panStart={x:e.clientX,y:e.clientY}; panOrigin={x:state.panX,y:state.panY};
  document.getElementById('map-viewport').style.cursor='grabbing';
}
function mapPointerMove(e){
  if(!panning) return;
  state.panX=panOrigin.x+(e.clientX-panStart.x);
  state.panY=panOrigin.y+(e.clientY-panStart.y);
  viewAuto=false;
  applyMapTransform();
}
function mapPointerUp(e){
  if(panning && e && e.type==='pointerup' && role==='gm' && state.fogCfg.tool && panClick && Math.hypot(e.clientX-panClick.x,e.clientY-panClick.y)<5) fogClick(e);
  panning=false; document.getElementById('map-viewport').style.cursor=''; }
function mapWheelZoom(e){
  e.preventDefault();
  const d=Math.max(-100,Math.min(100,e.deltaMode===1?e.deltaY*33:e.deltaY));
  zoomAt(state.zoom*Math.exp(-d*0.002),e.clientX,e.clientY);
}
(function initMapPanZoom(){
  const vp=document.getElementById('map-viewport');
  vp.addEventListener('pointerdown',mapPointerDown);
  vp.addEventListener('pointermove',mapPointerMove);
  vp.addEventListener('pointerup',mapPointerUp);
  vp.addEventListener('pointerleave',mapPointerUp);
  vp.addEventListener('wheel',mapWheelZoom,{passive:false});
  if(window.ResizeObserver) new ResizeObserver(()=>{ if(viewAuto) fitView(); }).observe(vp);
})();

function setFooterCollapsed(c){
  ['log-col','comms-col'].forEach(id=>{ const e=document.getElementById(id); if(e) e.classList.toggle('collapsed',c); });
  ['log-toggle-btn','comms-toggle-btn'].forEach(id=>{ const b=document.getElementById(id); if(b) b.textContent=c?'▲ EXPANDIR':'▼ RETRAIR'; });
}
function toggleLog(){ setFooterCollapsed(!document.getElementById('log-col').classList.contains('collapsed')); }
function toggleTurnPanel(){
  const col=document.getElementById('turn-col');
  const collapsed=col.classList.toggle('collapsed');
  document.getElementById('turn-toggle-btn').textContent= collapsed? '▲ EXPANDIR':'▼ RETRAIR';
}

function msgVisible(l){
  if(role==='gm') return true;
  if(!l.k||l.k==='act') return true;
  if(l.k==='whisper') return !!state.currentPlayer && (l.from===state.currentPlayer||l.to===state.currentPlayer);
  return l.to==='all' || l.to===state.currentPlayer;
}
function charLabel(id){ const c=state.characters[id]; return c?(c.short||c.name||id):'???'; }
function logLineHtml(l){
  if(!l.k||l.k==='act') return `<div class="log-line act">&gt; ${l.t}</div>`;
  if(l.k==='whisper'){ const me=state.currentPlayer, f=escHtml(charLabel(l.from)), t=l.to==='gm'?'MESTRE':escHtml(charLabel(l.to));
    const tag= role==='gm' ? `🤫 ${f} → ${t}` : (l.from===me ? `🤫 VOCÊ → ${t}` : `🤫 ${f} → VOCÊ`);
    return `<div class="log-line whisper priv"><span class="log-tag">${tag}</span>${escHtml(l.t)}</div>`; }
  const all=l.to==='all', gm=role==='gm', dest=escHtml(charLabel(l.to));
  const tag= l.k==='scene'
    ? (all?'◈ CENA':(gm?'◈ CENA → '+dest:'◈ CENA · SÓ PRA VOCÊ'))
    : (all?'📢 MESTRE → TODOS':(gm?'✉ MESTRE → '+dest:'✉ MESTRE → VOCÊ'));
  return `<div class="log-line ${l.k} ${all?'all':'priv'}"><span class="log-tag">${tag}</span>${escHtml(l.t)}</div>`;
}
function renderLog(){
  const box=document.getElementById('log-list');
  if(box){
    box.innerHTML=state.log.filter(l=>(!l.k||l.k==='act') && msgVisible(l)).slice(-60).map(logLineHtml).join('');
    box.scrollTop=box.scrollHeight;
  }
  renderComms();
}
function renderComms(){
  const box=document.getElementById('comms-list'); if(!box) return;
  box.innerHTML=state.log.filter(l=>['scene','contact','whisper'].includes(l.k) && msgVisible(l)).slice(-40).map(logLineHtml).join('');
  box.scrollTop=box.scrollHeight;
}
function addLog(t,cat,extra){ const l={k:'act',t,cat:cat||'geral',ts:Date.now(),round:state.round||1}; if(extra) Object.assign(l,extra); state.log.push(l); renderLog(); }
function pushMsg(l){
  state.log.push(l); renderLog();
  if(role!=='gm' && msgVisible(l) && l.from!==state.currentPlayer) logNotify();
}
function logNotify(){
  const col=document.getElementById('comms-col'); if(!col) return;
  if(col.classList.contains('collapsed')) setFooterCollapsed(false);
  col.classList.remove('flash'); void col.offsetWidth; col.classList.add('flash');
}
function toggleComms(){ toggleLog(); }
function sendMsg(){
  if(role!=='gm') return;
  const ta=document.getElementById('msg-text'); const text=ta.value.trim(); if(!text) return;
  pushMsg({k:document.getElementById('msg-kind').value, to:document.getElementById('msg-to').value||'all', t:text, ts:Date.now()});
  ta.value=''; ta.focus();
}
function msgComposerUpdate(){ whisperUpdate();
  const box=document.getElementById('msg-composer'); if(!box) return;
  const gm=role==='gm';
  box.classList.toggle('on',gm);
  document.getElementById('log-col').classList.toggle('gm',gm);
  const kind=document.getElementById('msg-kind');
  kind.style.color=kind.style.borderColor= kind.value==='scene'?'var(--scene)':'var(--yellow)';
  const sel=document.getElementById('msg-to'), ids=Object.keys(state.characters);
  const sig=ids.map(id=>id+':'+charLabel(id)).join('|');
  if(sel.dataset.sig!==sig){
    const cur=sel.value||'all';
    sel.innerHTML='<option value="all">TODOS OS PLAYERS</option>'+ids.map(id=>`<option value="${escHtml(id)}">${escHtml(charLabel(id))}</option>`).join('');
    sel.value=(cur==='all'||ids.includes(cur))?cur:'all'; sel.dataset.sig=sig;
  }
}

function turnOrderFix(){
  if(role!=='gm') return;
  const existe=id=>state.characters[id]||state.enemies[id];
  const atual=state.turnOrder[state.turn];
  const nova=state.turnOrder.filter((id,i)=>existe(id)&&state.turnOrder.indexOf(id)===i);
  Object.keys(state.characters).concat(Object.keys(state.enemies)).forEach(id=>{ if(!nova.includes(id)) nova.push(id); });
  const mudou=nova.length!==state.turnOrder.length||nova.some((id,i)=>id!==state.turnOrder[i]);
  if(mudou){
    state.turnOrder=nova;
    const ni=nova.indexOf(atual);
    state.turn=ni>=0?ni:0;
  }
  if(state.turn>=state.turnOrder.length||state.turn<0) state.turn=0;
}
function renderTurns(){
  const turnNum=document.getElementById('turn-num');
  const turnCurrent=document.getElementById('turn-current');
  const box=document.getElementById('turn-list');

  box.innerHTML='';
  turnOrderFix();

  const pos=(state.turn>=0&&state.turn<state.turnOrder.length)?state.turn:0;
  if(!state.turnOrder.length){
    turnNum.textContent='00';
    turnCurrent.textContent='—';
    renderTurnSlots();
    return;
  }

  turnNum.textContent=String(pos+1).padStart(2,'0');

  const curId=state.turnOrder[pos];
  const cur=state.characters[curId]||state.enemies[curId];
  turnCurrent.textContent=cur?cur.short:'—';

  state.turnOrder.forEach((id,i)=>{
    const c=state.characters[id]||state.enemies[id];
    if(!c) return;

    const el=document.createElement('div');
    el.className='turn-item'+(i===pos?' current':'');
    el.innerHTML=`<span>${c.short}</span><span>${c.hp}/${c.maxHp}</span>`;
    box.appendChild(el);
  });
  renderTurnSlots();
}
let turnCheckId=0;
function turnSent(){
  if(window.enviarAgora) window.enviarAgora();
  const id=++turnCheckId, t=state.turn, r=state.round;
  setTimeout(()=>{
    if(id!==turnCheckId||!window.ONLINE_ON) return;
    if(state.turn!==t||state.round!==r) alert('O servidor desfez a mudança de turno.\nOlhe a caixinha no canto de baixo à esquerda: se estiver vermelha, o Firebase está recusando as gravações.');
  },2000);
}
function nextTurn(){
  if(role!=='gm') return;
  turnOrderFix();
  if(!state.turnOrder.length){ alert('Ninguém na ordem de turnos ainda. Crie um personagem ou um inimigo primeiro.'); return; }
  const nt=(state.turn+1)%state.turnOrder.length;
  if(nt===0) state.round=(state.round||1)+1;
  state.turn=nt;
  resetTurnSlots();
  renderTurns();
  renderParticipants();
  const ta=currentTurnActor(); if(ta) addLog(`Rodada ${state.round} — turno de ${escHtml(ta.short)}.`,'turn');
  turnSent();
}
function prevTurn(){
  if(role!=='gm') return;
  turnOrderFix();
  if(!state.turnOrder.length){ alert('Ninguém na ordem de turnos ainda. Crie um personagem ou um inimigo primeiro.'); return; }
  if(state.turn===0 && (state.round||1)>1) state.round--;
  state.turn=(state.turn-1+state.turnOrder.length)%state.turnOrder.length;
  resetTurnSlots();
  renderTurns();
  renderParticipants();
  turnSent();
}

function skillDiceTxt(s){ return [s.roll?'TESTE '+s.roll:'', s.dmg?'DANO '+s.dmg:''].filter(Boolean).join(' · '); }
function skillDiceHtml(s){ return (s.roll?`<span class="sk-dice">🎲 TESTE ${escHtml(s.roll)}</span>`:'')+(s.dmg?`<span class="sk-dice">💥 DANO ${escHtml(s.dmg)}</span>`:''); }
const TURN_SLOTS=[{key:'bonus',label:'AÇÃO BÔNUS'},{key:'action',label:'AÇÃO'},{key:'move',label:'MOVIMENTAÇÃO'}];
let turnSlotState={bonus:null,action:null,move:null};
let openSlotKey=null;

const ACTION_CAT_COLORS={'COMBATE':'#c8202e','EXPLORAÇÃO':'#e0a020','SOCIAL':'#d94f9b','MOVIMENTO':'#3fdc7a','GERAL':'#8b888f'};
const DEFAULT_ACTIONS=[
  {name:'ATACAR',cat:'COMBATE',slots:['action']},
  {name:'DEFENDER',cat:'COMBATE',slots:['action']},
  {name:'AJUDAR',cat:'COMBATE',slots:['action']},
  {name:'PREPARAR AÇÃO',cat:'COMBATE',slots:['action']},
  {name:'USAR ITEM',cat:'COMBATE',slots:['action','bonus']},
  {name:'INVESTIGAR',cat:'EXPLORAÇÃO',slots:['action']},
  {name:'PERCEBER',cat:'EXPLORAÇÃO',slots:['action','bonus']},
  {name:'ARROMBAR',cat:'EXPLORAÇÃO',slots:['action']},
  {name:'ESCONDER-SE',cat:'EXPLORAÇÃO',slots:['action','bonus']},
  {name:'CHARME',cat:'SOCIAL',slots:['action']},
  {name:'PERSUADIR',cat:'SOCIAL',slots:['action']},
  {name:'INTIMIDAR',cat:'SOCIAL',slots:['action']},
  {name:'ENGANAR',cat:'SOCIAL',slots:['action']},
  {name:'MOVER',cat:'MOVIMENTO',slots:['move']},
  {name:'DASH',cat:'MOVIMENTO',slots:['move','action']},
  {name:'RECUAR',cat:'MOVIMENTO',slots:['move']},
  {name:'ESCALAR',cat:'MOVIMENTO',slots:['move']}
];
function turnActionsFor(key){ return DEFAULT_ACTIONS.concat(state.customActions||[]).filter(a=>a.slots.includes(key)); }
function currentTurnActor(){
  const id=state.turnOrder[state.turn];
  return id? findObj(id) : null;
}
function renderTurnSlots(){
  const box=document.getElementById('turn-slots'); if(!box) return;
  const actor=currentTurnActor();
  const skills=(actor&&actor.skills)? actor.skills : [];
  box.innerHTML=TURN_SLOTS.map(slot=>{
    const chosen=turnSlotState[slot.key];
    let inner;
    if(chosen){
      inner=`<div class="slot-filled"><span><b>${escHtml(chosen.name)}</b> <span style="color:var(--gray)">— ${escHtml(chosen.type||'—')}</span></span>
        <button class="btn small ghost" onclick="clearTurnSlot('${slot.key}')">LIMPAR</button></div>`;
    } else if(openSlotKey===slot.key){
      const acts=turnActionsFor(slot.key);
      inner=`<div class="slot-pick-list">
        <div class="slot-pick-head">AÇÕES</div>
        ${acts.map((a,i)=>`<div class="slot-pick-item" style="border-left-color:${ACTION_CAT_COLORS[a.cat]||'#8b888f'}" onclick="chooseTurnSlotAction('${slot.key}',${i})"><b>${escHtml(a.name)}</b> — ${escHtml(a.cat)}</div>`).join('')}
        ${skills.length?`<div class="slot-pick-head">HABILIDADES</div>`+skills.map((s,i)=>`<div class="slot-pick-item" style="border-left-color:${SKILL_TYPE_COLORS[s.type]||'#c9bfa0'}" onclick="chooseTurnSlotSkill('${slot.key}',${i})"><b>${escHtml(s.name)}</b> — ${escHtml(s.type||'—')} · ${s.cost} SP${skillDiceTxt(s)?' · '+escHtml(skillDiceTxt(s)):''}</div>`).join(''):''}
      </div>`;
    } else {
      inner=`<button class="btn small ghost" onclick="openTurnSlot('${slot.key}')" ${actor?'':'disabled'}>SELECIONAR AÇÃO / HABILIDADE</button>`;
    }
    return `<div class="turn-slot"><label>${slot.label}</label>${inner}</div>`;
  }).join('');
}
function openTurnSlot(key){ openSlotKey = (openSlotKey===key)? null : key; renderTurnSlots(); }
function chooseTurnSlotSkill(key,i){
  const actor=currentTurnActor(); if(!actor || !actor.skills) return;
  const skill=actor.skills[i]; if(!skill) return;
  turnSlotState[key]=skill; openSlotKey=null;
  addLog(`${escHtml(actor.short)} usou ${escHtml(skill.name)}${skillDiceTxt(skill)?' — '+escHtml(skillDiceTxt(skill)):''}.${skill.desc&&skill.desc.trim()?' '+escHtml(skill.desc.trim()):''}`,'skill',{actor:actor.short,what:skill.name});
  renderTurnSlots();
}
function chooseTurnSlotAction(key,i){
  const actor=currentTurnActor(); if(!actor) return;
  const a=turnActionsFor(key)[i]; if(!a) return;
  turnSlotState[key]={name:a.name,type:a.cat,std:true}; openSlotKey=null;
  addLog(`${escHtml(actor.short)} declarou ${escHtml(a.name)}.`,'skill',{actor:actor.short,what:a.name});
  renderTurnSlots();
}
function clearTurnSlot(key){ turnSlotState[key]=null; renderTurnSlots(); }
function resetTurnSlots(){ turnSlotState={bonus:null,action:null,move:null}; openSlotKey=null; }

function findObj(id){return state.characters[id]||state.enemies[id]||state.npcs[id];}

// ---------- CONTROLES RÁPIDOS DE HP (iguais no menu do token e no quadro de combate) ----------
function hpQuickHtml(id,key){
  return `<div class="tm-row">${[-10,-5,-1,1,5,10].map(n=>`<button class="btn small ghost ${n<0?'danger':''}" onclick="qhDelta('${id}',${n})">${n>0?'+':''}${n}</button>`).join('')}</div>
    <div class="tm-row"><input id="qh-${key}-${id}" type="number" min="1" placeholder="valor" onkeydown="if(event.key==='Enter')qhCustom('${id}','${key}',-1)"><button class="btn small" onclick="qhCustom('${id}','${key}',-1)">DANO</button><button class="btn small ghost" onclick="qhCustom('${id}','${key}',1)">CURA</button></div>`;
}
function qhDelta(id,n){ applyDelta(id,n); }
function qhCustom(id,key,sign){
  const el=document.getElementById(`qh-${key}-${id}`); const v=Math.abs(parseInt(el&&el.value,10));
  if(!v) return;
  applyDelta(id,sign*v);
  const n=document.getElementById(`qh-${key}-${id}`); if(n) n.focus();
}

function applyDelta(id,delta){
  const c=findObj(id); if(!c) return;
  const hpBefore=c.hp;
  c.hp=Math.max(0,Math.min(c.maxHp,c.hp+delta));
  addLog(`${c.short} ${delta<0?'recebeu '+(-delta)+' de dano':'recuperou '+delta+' HP'}. HP: ${c.hp}/${c.maxHp}${c.hp===0?' — DOWNED':''}`,'hp',{target:c.short,tid:id,real:c.hp-hpBefore,down:c.hp===0&&hpBefore>0});
  renderParticipants(); renderEnemiesList(); renderTokens(); renderTurns();
  if(role==='gm'){ boardRender(); if(tmId===id) renderTokenMenu(); }
  showFloatDmg(id,delta);
  if(gmActivePane==='chars') gmRenderChars();
  if(gmActivePane==='enemies') gmRenderEnemies();
}
function showFloatDmg(id,delta){
  const tok=document.querySelector(`.token[data-id="${id}"]`); if(!tok||!delta) return;
  const c=findObj(id), max=(c&&c.maxHp)||0, pct=max?Math.abs(delta)/max:0;
  const d=tok.querySelector('[data-dmg]');
  if(d){
    d.textContent=(delta<0?'−'+(-delta):'+'+delta);
    d.className='dmg show'+(delta>0?' heal':'')+(pct>=.5?' crit':pct>=.25?' big':'');
    void d.offsetWidth;
    clearTimeout(d._t); d._t=setTimeout(()=>d.classList.remove('show'),1200);
  }
  // o token reage: treme e pisca vermelho (dano), brilha verde (cura) ou desaba (caiu a 0)
  const cls= delta>0?'healed' : (c&&typeof c.hp==='number'&&c.hp<=0?'ko':'hit');
  tok.classList.remove('hit','healed','ko'); void tok.offsetWidth; tok.classList.add(cls);
  clearTimeout(tok._fx); tok._fx=setTimeout(()=>tok.classList.remove(cls),900);
  if(delta<0 && role==='player' && id===state.currentPlayer) flashHit(pct);
  // o cartão no quadro de combate reage igual ao token
  const card=document.querySelector(`.bd-card[data-id="${id}"]`);
  if(card){
    let p=card.querySelector('.bd-pop'); if(!p){ p=document.createElement('div'); card.appendChild(p); }
    p.textContent=(delta<0?'−'+(-delta):'+'+delta);
    p.className='bd-pop show'+(delta>0?' heal':'')+(pct>=.5?' crit':pct>=.25?' big':'');
    card.classList.remove('hit','healed'); void card.offsetWidth; card.classList.add(delta>0?'healed':'hit');
    clearTimeout(card._fx); card._fx=setTimeout(()=>{ card.classList.remove('hit','healed'); if(p) p.classList.remove('show'); },1200);
  }
}
function flashHit(pct){
  let f=document.getElementById('hit-flash');
  if(!f){ f=document.createElement('div'); f.id='hit-flash'; document.body.appendChild(f); }
  f.className=''; void f.offsetWidth; f.className='on'+(pct>=.25?' strong':'');
}

// ---------- MENU RÁPIDO DO TOKEN (mestre) ----------
let tmId=null;
function openTokenMenu(t){
  const id=t.dataset.id;
  if(role!=='gm'){ openSheet(id); return; }
  tmId=id; renderTokenMenu(t);
}
function closeTokenMenu(){ tmId=null; const m=document.getElementById('token-menu'); if(m) m.remove(); }
function renderTokenMenu(tok){
  const old=document.getElementById('token-menu'); if(old) old.remove();
  const c=tmId&&findObj(tmId); if(!c){ tmId=null; return; }
  tok=tok||document.querySelector(`.token[data-id="${tmId}"]`); if(!tok) return;
  const hasHp=typeof c.maxHp==='number';
  const m=document.createElement('div'); m.id='token-menu';
  m.innerHTML=`<div class="tm-head"><b>${escHtml(c.short||c.name)}</b>${hasHp?`<span>${c.hp}/${c.maxHp} HP</span>`:''}<i class="tm-x" onclick="closeTokenMenu()">✕</i></div>`
    +(hasHp?hpQuickHtml(tmId,'tm'):'')
    +`<div class="tm-row"><button class="btn small ghost" onclick="openSheet('${tmId}');closeTokenMenu()">FICHA</button>${state.enemies[tmId]?`<button class="btn small ghost" onclick="libSave('enemies','${tmId}')">💾 SALVAR</button>`:state.npcs[tmId]?`<button class="btn small ghost" onclick="libSave('npcs','${tmId}')">💾 SALVAR</button>`:''}${state.turnOrder.includes(tmId)?`<button class="btn small ghost" onclick="tmFocusTurn()">DAR O TURNO</button>`:''}</div>`;
  document.body.appendChild(m);
  const r=tok.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight;
  m.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';
  let top=r.bottom+8; if(top+h>innerHeight-6) top=Math.max(6,r.top-h-8);
  m.style.top=top+'px';
}
function tmFocusTurn(){
  const i=state.turnOrder.indexOf(tmId); if(i<0) return;
  state.turn=i; resetTurnSlots(); renderTurns(); renderParticipants();
  const ta=currentTurnActor(); if(ta) addLog(`Rodada ${state.round} — turno de ${escHtml(ta.short)}.`,'turn');
  turnSent();
  closeTokenMenu();
}
document.addEventListener('pointerdown',e=>{ if(tmId && !e.target.closest('#token-menu') && !e.target.closest('.token')) closeTokenMenu(); },true);
// atalhos do mestre: N = próximo turno, P = turno anterior, Esc = fecha o menu do token
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ closeTokenMenu(); return; }
  if(role!=='gm'||e.ctrlKey||e.metaKey||e.altKey) return;
  if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')) return;
  if(document.querySelector('.overlay.active')) return;
  const k=e.key.toLowerCase();
  if(k==='n') nextTurn(); else if(k==='p') prevTurn();
});
function addStatus(id,st){const c=findObj(id); if(!c||c.status.includes(st))return; if(c.status.includes('NORMAL')) c.status=c.status.filter(s=>s!=='NORMAL'); c.status.push(st); addLog(`${c.short} recebeu status ${st}.`,'status'); renderParticipants(); renderEnemiesList(); if(gmActivePane==='chars')gmRenderChars();}
function removeStatus(id,st){const c=findObj(id); if(!c)return; c.status=c.status.filter(s=>s!==st); if(!c.status.length)c.status=['NORMAL']; addLog(`${c.short} perdeu status ${st}.`,'status'); renderParticipants(); renderEnemiesList(); if(gmActivePane==='chars')gmRenderChars();}

let sheetActiveTab='profile', sheetId=null;
const TABS=['profile','card','arcana','stats','skills','equipment','notes'];
const TAB_LABELS={profile:'PERFIL',card:'CARTÃO',arcana:'ARCANA',stats:'STATUS',skills:'HABILIDADES',equipment:'EQUIPAMENTO',notes:'NOTAS'};
const SKILL_TYPES=['FÍSICO','ARMA','FOGO','GELO','ELÉTRICO','VENTO','LUZ','TREVAS','PSIQUE','ALMIGHTY','CURA','SUPORTE','AFLIÇÃO','PASSIVA'];
const SKILL_TYPE_COLORS={'FÍSICO':'#8b8b8b','ARMA':'#b0a8a0','FOGO':'#e0522a','GELO':'#4fb3d9','ELÉTRICO':'#e8c93b','VENTO':'#4bbf7a','LUZ':'#f2e6a0','TREVAS':'#7a4fb0','PSIQUE':'#d94f9b','ALMIGHTY':'#c8202e','CURA':'#3fdc7a','SUPORTE':'#6ea7e0','AFLIÇÃO':'#a06a3a','PASSIVA':'#8b888f'};
const SKILL_TARGETS=['1 INIMIGO','TODOS OS INIMIGOS','1 ALIADO','TODOS OS ALIADOS','SI MESMO'];
function openSheet(id){
  sheetId=id; sheetActiveTab='profile';
  const c=findObj(id);
  if(!c) return;
  const pn=(state.characters[id]&&c.playerName)?c.playerName:'';
  document.getElementById('sheet-name').innerHTML = escHtml(c.name||c.short)+(pn?` <span class="sheet-player">• PLAYER: ${escHtml(pn)}</span>`:'');
  const pl=document.getElementById('sheet-id-player'); pl.textContent=pn||'—'; pl.parentNode.style.display= state.characters[id]?'':'none';
  const photo=document.getElementById('sheet-photo');
  photo.innerHTML = c.avatar? `<img src="${c.avatar}">` : `<div class="ph-fallback">${c.short[0]}</div>`;
  document.getElementById('sheet-id-name').textContent=c.short;
  document.getElementById('sheet-id-arcana').textContent= state.enemies[id]? (c.type||'—') : (state.npcs[id]? (c.role||'—') : c.arcana);
  document.getElementById('sheet-id-level').textContent= state.enemies[id]? (c.level||'—') : (state.npcs[id]? '—' : (c.persona? c.persona.level:'—'));
  document.getElementById('sheet-id-status').textContent= state.npcs[id]? 'NPC' : (c.status? c.status.join(', ') : (c.hp<=0?'DOWNED':'ACTIVE'));
  const tabsBox=document.getElementById('sheet-tabs'); tabsBox.innerHTML='';
  if(state.enemies[id] || state.npcs[id]){ tabsBox.style.display='none'; renderSheetBody(); document.getElementById('ov-sheet').classList.add('active'); return; }
  tabsBox.style.display='flex';
  TABS.forEach(t=>{
    const b=document.createElement('button'); b.className='tab'+(t==='profile'?' active':''); b.textContent=TAB_LABELS[t]||t.toUpperCase();
    b.onclick=()=>{document.querySelectorAll('#sheet-tabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');sheetActiveTab=t;renderSheetBody();};
    tabsBox.appendChild(b);
  });
  renderSheetBody();
  document.getElementById('ov-sheet').classList.add('active');
}
const VIS_FIELDS=[['age','IDADE'],['desc','DESCRIÇÃO'],['personality','PERSONALIDADE'],['fears','MEDOS'],['goals','OBJETIVOS'],['history','HISTÓRICO'],['arcana','ARCANA'],['stats','STATUS / ATRIBUTOS'],['skills','HABILIDADES'],['equipment','EQUIPAMENTO'],['notes','NOTAS']];
function visOf(c,f){ const v=c.visibility||{}; if(v[f]) return v[f]; if(['age','desc','personality','fears','goals'].includes(f)&&v.history) return v.history; return ['arcana','stats','equipment'].includes(f)?'PUBLIC':'OWNER'; }
function canSee(id,field){
  const c=state.characters[id]; if(!c) return true;
  if(role==='gm') return true;
  const perm=visOf(c,field);
  if(perm==='GM') return false;
  if(perm==='OWNER') return id===state.currentPlayer;
  return true;
}
function fieldHtml(label,val,visible){
  return `<div class="field-block"><label>${label}${!visible?' <span class="perm-badge">HIDDEN</span>':''}</label><div class="v ${!visible?'hidden-val':''}">${visible? val : '████████'}</div></div>`;
}
function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function idNumber(id){ let h=hashStr('D0:'+id), out=''; for(let i=0;i<9;i++){ out+=h%10; h=(Math.imul(h,1103515245)+12345)>>>0; } return 'CTX-'+out.slice(0,3)+'-'+out.slice(3,6)+'-'+out.slice(6); }
function barcodeSvg(id){
  let h=hashStr('BAR:'+id), x=0, bars='';
  while(x<96){ h=(Math.imul(h,1664525)+1013904223)>>>0; const w=1+(h%4), gap=1+((h>>>8)%3); bars+=`<rect x="${x}" y="0" width="${w}" height="100"/>`; x+=w+gap; }
  return `<svg viewBox="0 0 96 100" preserveAspectRatio="none" fill="#1a1712">${bars}</svg>`;
}
function cardHtml(id){
  const c=state.characters[id]; if(!c) return '';
  const E=escHtml, arc=canSee(id,'arcana')?E(c.arcana||'—'):'████';
  const photo=c.avatar? `<img src="${c.avatar}" alt="">` : `<div class="ph-fallback">${E((c.short||'?')[0])}</div>`;
  const down=(c.hp<=0);
  return `<div class="idcard-wrap"><div class="idcard">
    <div class="idc-head">
      <img class="idc-logo" src="assets/logo2.png" alt="Cortex Corp" onerror="this.outerHTML='<span class=\\'idc-logo-txt\\'>CORTEX</span>'">
      <div class="idc-org"><b>CORTEX CORP</b>DEPARTMENT 0 · REGISTRO DE FUNCIONÁRIO</div>
      <div class="idc-emblem"></div>
    </div>
    <div class="idc-photo">${photo}</div>
    <div class="idc-fields">
      <div class="idc-f w2"><label>NOME</label><div class="v big">${E(c.name||c.short)}</div></div>
      <div class="idc-f"><label>PLAYER</label><div class="v">${E(c.playerName||'—')}</div></div>
      <div class="idc-f"><label>ACESSO</label><div class="v">${E(c.clearance||'1')}</div></div>
      <div class="idc-f w2"><label>ID Nº</label><div class="v sm">${idNumber(id)}</div></div>
      <div class="idc-f"><label>ARCANA</label><div class="v sm">${arc}</div></div>
      <div class="idc-f"><label>CAPÍTULO</label><div class="v sm">${E((state.chapter||'').split('—')[0].replace('CAPÍTULO','CAP.').trim()||'—')}</div></div>
    </div>
    <div class="idc-chip"></div>
    ${down?'<div class="idc-stamp">DOWNED</div>':''}
    <div class="idc-bar">${barcodeSvg(id)}</div>
    <div class="idc-foot">DOCUMENTO PROPRIEDADE DA CORTEX CORP — NÃO TENTE DESTRUIR OU ALTERAR</div>
  </div><div class="idc-note">Nível de acesso e nome do player são editados pelo mestre na ficha completa.</div></div>`;
}
function renderSheetBody(){
  const id=sheetId, c=findObj(id); const body=document.getElementById('sheet-body');
  if(state.npcs[id]){
    body.innerHTML=`<div class="sheet-grid">
      ${fieldHtml('NOME',c.short,true)}${fieldHtml('FUNÇÃO',c.role||'—',true)}
      </div><div class="field-block">${fieldHtml('DESCRIÇÃO',c.desc||'—',true)}</div>`;
    return;
  }
  if(state.enemies[id]){
    const weakVisible = role==='gm' || !!c.weaknessRevealed;
    body.innerHTML=`<div class="sheet-grid">
      ${fieldHtml('NOME',c.short,true)}${fieldHtml('TIPO',c.type||'—',true)}
      ${fieldHtml('NÍVEL',c.level||'—',true)}${fieldHtml('HP',c.hp+'/'+c.maxHp,true)}
      ${fieldHtml('FRAQUEZA',c.weakness||'—',weakVisible)}${fieldHtml('RESISTÊNCIA',c.resistance||'—',true)}
      </div><div class="field-block">${fieldHtml('DESCRIÇÃO',c.desc||'—',true)}</div>`;
    return;
  }
  if(sheetActiveTab==='profile'){
    body.innerHTML=`<div class="sheet-grid">
      ${fieldHtml('IDADE',c.profile.age,canSee(id,'age'))}
      ${fieldHtml('STATUS','ATIVO',true)}
      </div>
      ${fieldHtml('DESCRIÇÃO',c.profile.desc,canSee(id,'desc'))}
      ${fieldHtml('PERSONALIDADE',c.profile.personality,canSee(id,'personality'))}
      <div class="sheet-grid">${fieldHtml('MEDOS',c.profile.fears,canSee(id,'fears'))}${fieldHtml('OBJETIVOS',c.profile.goals,canSee(id,'goals'))}</div>
      ${fieldHtml('HISTÓRICO',c.profile.history,canSee(id,'history'))}`;
  } else if(sheetActiveTab==='card'){
    body.innerHTML=cardHtml(id);
  } else if(sheetActiveTab==='arcana'){
    body.innerHTML=`<div class="sheet-grid">${fieldHtml('ARCANA PRIMÁRIA',c.arcana,canSee(id,'arcana'))}${fieldHtml('ARCANA SECUNDÁRIA',c.secArcana,canSee(id,'arcana'))}</div>`;
  } else if(sheetActiveTab==='stats'){
    body.innerHTML=`<div class="sheet-grid">${fieldHtml('HP',c.hp+'/'+c.maxHp,canSee(id,'stats'))}${fieldHtml('SP',c.sp+'/'+c.maxSp,canSee(id,'stats'))}
    ${fieldHtml('STATUS',c.status.join(', '),canSee(id,'stats'))}</div>
    <div class="sheet-grid" style="margin-top:6px">${fieldHtml('STR',c.stats.str,canSee(id,'stats'))}${fieldHtml('MAG',c.stats.mag,canSee(id,'stats'))}
    ${fieldHtml('END',c.stats.end,canSee(id,'stats'))}${fieldHtml('AGI',c.stats.agi,canSee(id,'stats'))}${fieldHtml('LUK',c.stats.luk,canSee(id,'stats'))}</div>`;
  } else if(sheetActiveTab==='skills'){
    const vis=canSee(id,'skills');
    const mine=(role==='player' && id===state.currentPlayer);
    const rowHtml=(sk,k)=>`<div class="skill-row" style="border-left:4px solid ${SKILL_TYPE_COLORS[sk.type]||'#c9bfa0'}"><b>${escHtml(sk.name)}</b> <span style="color:#7a7260">— ${escHtml(sk.type||'—')} · ALVO: ${escHtml(sk.target||'—')} · CUSTO ${sk.cost} SP · PODER ${sk.power}</span>
      ${mine&&sk.own?`<span style="float:right"><button class="btn small ghost" onclick="playerEditSkill(${k})">✎</button> <button class="btn small ghost" onclick="playerDelSkill(${k})">✕</button></span>`:''}
      <br>${skillDiceHtml(sk)}${sk.desc?`<div>${escHtml(sk.desc)}</div>`:''}</div>`;
    let html= vis? (c.skills.length? c.skills.map(rowHtml).join('') : '<div class="field-block">— nenhuma habilidade cadastrada —</div>') : fieldHtml('HABILIDADES','—',false);
    if(mine) html+=skillFormHtml();
    body.innerHTML=html;
  } else if(sheetActiveTab==='equipment'){
    const ev=canSee(id,'equipment'), q=x=>ev?x:'████████';
    body.innerHTML=`<div class="equip-wrap"><div class="weapon-img-slot">${ev&&c.equipment.weaponImage?`<img src="${c.equipment.weaponImage}">`:'<span>SEM IMAGEM<br>DA ARMA</span>'}</div>
      <div class="equip-chips">
        <div class="equip-chip"><label>ARMA</label>${q(c.equipment.weapon)}</div>
        <div class="equip-chip"><label>ARMADURA</label>${q(c.equipment.armor)}</div>
        <div class="equip-chip"><label>ACESSÓRIO</label>${q(c.equipment.accessory)}</div>
        <div class="equip-chip"><label>ITENS</label>${q(c.equipment.items)}</div>
      </div></div>`;
  } else if(sheetActiveTab==='notes'){
    body.innerHTML= fieldHtml('NOTAS PRIVADAS',c.notes||'—',canSee(id,'notes'));
  }
}

let boardTab='status', boardSkip=false, afterT=null;
const BOARD_STATUS=['ENVENENADO','QUEIMADO','CONFUSO','ATORDOADO','BUFF','DEBUFF','NORMAL','ESTRESSADO','CALMO','ASSUSTADO','FURIOSO','EXAUSTO','INSPIRADO','ANSIOSO'];
function afterRender(){
  boardRefresh();
  const ov=document.getElementById('ov-sheet'), sb=document.getElementById('sheet-body');
  if(ov&&ov.classList.contains('active')&&sheetId&&findObj(sheetId)&&!sb.contains(document.activeElement)) renderSheetBody();
}
function liteRender(){ boardSkip=true; renderParticipants(); renderEnemiesList(); renderTokens(); renderTurns(); setTimeout(()=>{boardSkip=false},40); }
function boardRefresh(){
  if(boardSkip||role!=='gm') return;
  const ov=document.getElementById('ov-board'), a=document.activeElement;
  if(!ov||(ov.contains(a)&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))) return;
  boardRender();
}
function boardSwitch(t){ boardTab=t; boardRender(); }
function boardRender(){
  const b=document.getElementById('board-body'); if(!b) return;
  document.querySelectorAll('#board-tabs .tab').forEach(x=>x.classList.toggle('active',x.dataset.t===boardTab));
  const f=boardTab==='status'?bdStatus:bdSkills;
  const sec=(t,l)=>`<h4>${t} (${l.length})</h4>`+(l.length?`<div class="bd-grid">${l.map(([id,c])=>f(id,c)).join('')}</div>`:'<div class="bd-empty">— ninguém —</div>');
  b.innerHTML=sec('PLAYERS',Object.entries(state.characters))+sec('INIMIGOS',Object.entries(state.enemies));
}
function bdStatus(id,c){
  const en=!!state.enemies[id]; if(c.maxSp==null) c.maxSp=c.sp||0;
  const n=(k,v,w)=>`<input class="mini-input" type="number" value="${v}" style="width:${w||54}px" onchange="bdSet('${id}','${k}',this.value)">`;
  const t=(k,l)=>`<div class="bd-row">${l} <input class="mini-input" style="flex:1" value="${escHtml(c[k]||'')}" onchange="bdSet('${id}','${k}',this.value)"></div>`;
  return `<div class="bd-card ${en?'en':''}${c.hp<=0?' down':''}" data-id="${id}"><div class="bd-h"><b>${escHtml(c.short)}</b><span>${escHtml(en?(c.type||'INIMIGO'):(c.arcana||''))}</span>${en?`<button class="btn small ghost" onclick="gmDeleteEnemy('${id}')">✕</button>`:''}</div>
    <div class="bar hp"><i style="width:${100*c.hp/c.maxHp}%"></i></div>
    <div class="bd-row">HP ${n('hp',c.hp)} / ${n('maxHp',c.maxHp)}</div>
    ${hpQuickHtml(id,'bd')}
    <div class="bar sp"><i style="width:${c.maxSp?100*c.sp/c.maxSp:0}%"></i></div>
    <div class="bd-row">SP ${n('sp',c.sp)} / ${n('maxSp',c.maxSp)}</div>
    ${en?`<div class="bd-row">NÍVEL ${n('level',c.level||1)} <button class="btn small ghost" onclick="gmToggleWeakness('${id}')">${c.weaknessRevealed?'ESCONDER FRAQUEZA':'REVELAR FRAQUEZA'}</button></div>${t('weakness','FRAQUEZA')}${t('resistance','RESISTÊNCIA')}`
      :`<div class="bd-row">${['str','mag','end','agi','luk'].map(s=>`${s.toUpperCase()} ${n('stats.'+s,c.stats[s],44)}`).join(' ')}</div>`}
    <div class="bd-row">${(c.status||[]).map(s=>`<span class="status-tag" style="cursor:pointer" onclick="removeStatus('${id}','${s}')">${s} ✕</span>`).join('')}</div>
    <div class="bd-row"><select class="mini-input" id="bst-${id}">${BOARD_STATUS.map(s=>`<option>${s}</option>`).join('')}</select><button class="btn small" onclick="addStatus('${id}',document.getElementById('bst-${id}').value)">+ STATUS</button></div></div>`;
}
function bdSet(id,f,v){
  const c=findObj(id); if(!c) return;
  if(f==='hp'){ const n=parseInt(v,10), alvo=Math.max(0,Math.min(c.maxHp,isNaN(n)?0:n)); if(alvo!==c.hp) applyDelta(id,alvo-c.hp); else boardRender(); return; }
  const txt=f==='weakness'||f==='resistance';
  let o=c,k=f; if(f.startsWith('stats.')){ o=c.stats; k=f.slice(6); }
  if(txt) o[k]=v; else { const n=parseInt(v,10); o[k]=Math.max(k==='maxHp'?1:0,isNaN(n)?0:n); }
  const h=c.hp,sp=c.sp; c.hp=Math.min(c.hp,c.maxHp); c.sp=Math.min(c.sp,c.maxSp);
  if(f==='hp'||f==='sp') addLog(`${c.short}: ${f.toUpperCase()} ajustado para ${c[f]}/${f==='hp'?c.maxHp:c.maxSp}.`,'adjust');
  liteRender(); if(h!==c.hp||sp!==c.sp||f==='hp'||f==='sp'||f==='maxHp'||f==='maxSp') boardRender();
}
function bdSkills(id,c){
  const en=!!state.enemies[id]; c.skills=c.skills||[]; const f=k=>`bsk-${id}-${k}`;
  const rows=c.skills.map((s,i)=>`<div class="skill-row" style="border-left:4px solid ${SKILL_TYPE_COLORS[s.type]||'#c9bfa0'}"><b>${escHtml(s.name)}</b> <span style="color:var(--gray)">— ${escHtml(s.type||'—')} · ${escHtml(s.target||'—')} · ${s.cost} SP · PODER ${s.power}</span> <button class="btn small ghost" style="float:right" onclick="gmRemoveSkill('${id}',${i})">✕</button><br>${skillDiceHtml(s)}${s.desc?`<div>${escHtml(s.desc)}</div>`:''}</div>`).join('')||'<div class="bd-empty">— sem habilidades —</div>';
  return `<div class="bd-card ${en?'en':''}"><div class="bd-h"><b>${escHtml(c.short)}</b><span>${c.skills.length} habilidade(s)</span></div>${rows}
    <details class="bd-add"><summary>+ NOVA HABILIDADE</summary>
      <input id="${f('name')}" placeholder="NOME">
      <select id="${f('type')}">${SKILL_TYPES.map(t=>`<option>${t}</option>`).join('')}</select>
      <select id="${f('target')}">${SKILL_TARGETS.map(t=>`<option>${t}</option>`).join('')}</select>
      <input id="${f('cost')}" type="number" placeholder="CUSTO (SP)"><input id="${f('power')}" type="number" placeholder="PODER">
      <input id="${f('roll')}" placeholder="DADO DE TESTE (ex.: 1d20+AGI)"><input id="${f('dmg')}" placeholder="DADO DE DANO (ex.: 2d6)">
      <textarea id="${f('desc')}" rows="2" placeholder="DESCRIÇÃO"></textarea>
      <button class="btn small" onclick="gmAddSkill('${id}')">ADICIONAR</button></details></div>`;
}
function gmAddSkill(id){
  const c=findObj(id); if(!c) return; const g=k=>document.getElementById('bsk-'+id+'-'+k).value;
  const name=g('name').trim(); if(!name){ alert('Dê um nome à habilidade.'); return; }
  (c.skills=c.skills||[]).push({name,type:g('type'),target:g('target'),cost:parseInt(g('cost'),10)||0,power:parseInt(g('power'),10)||0,roll:g('roll').trim(),dmg:g('dmg').trim(),desc:g('desc')});
  addLog(`GM adicionou a habilidade ${name} a ${c.short}.`); boardRender(); renderTurnSlots(); afterRender();
}
function gmRemoveSkill(id,i){ const c=findObj(id); if(!c||!c.skills) return; c.skills.splice(i,1); boardRender(); renderTurnSlots(); afterRender(); }
function visPanelHtml(id){
  const c=state.characters[id], o=(f,v,t)=>`<option value="${v}" ${visOf(c,f)===v?'selected':''}>${t}</option>`;
  return `<h4 style="margin-top:12px">VISIBILIDADE PARA OS JOGADORES <span style="font-size:.55rem;color:var(--gray)">(aplica na hora)</span></h4>
    <div style="display:flex;gap:6px;margin-bottom:6px"><button class="btn small ghost" onclick="gmVisAll('${id}','PUBLIC')">TUDO VISÍVEL</button><button class="btn small ghost" onclick="gmVisAll('${id}','OWNER')">TUDO SÓ DO DONO</button></div>
    <div class="form-2col">${VIS_FIELDS.map(([f,l])=>`<div class="form-row"><label>${l}</label><select onchange="gmSetVis('${id}','${f}',this.value)">${o(f,'OWNER','APENAS O PLAYER')}${o(f,'GM','APENAS O MESTRE')}${o(f,'PUBLIC','TODOS OS PLAYERS')}</select></div>`).join('')}</div>`;
}
function gmSetVis(id,f,v){ const c=state.characters[id]; if(!c) return; c.visibility=c.visibility||{}; c.visibility[f]=v; afterRender(); }
function gmVisAll(id,v){ const c=state.characters[id]; if(!c) return; c.visibility=c.visibility||{}; VIS_FIELDS.forEach(([f])=>c.visibility[f]=v); gmLoadCharEditor(id); afterRender(); }

function noteOwnerId(){
  if(role==='gm'){ const sel=document.getElementById('note-player-select'); return sel && sel.value ? sel.value : '__gm__'; }
  if(role==='player') return state.currentPlayer || (currentLoginId?('acc:'+currentLoginId):null);
  return null;
}
function noteOwnerLabel(id){
  if(id==='__gm__') return 'GM';
  if(state.characters[id]) return state.characters[id].short;
  if(String(id).indexOf('acc:')===0) return 'LOGIN '+String(id).slice(4);
  return String(id);
}
function noteAuthor(){
  if(role==='gm') return 'GM';
  const c=state.characters[state.currentPlayer];
  return c ? c.short : (currentLoginId?('LOGIN '+currentLoginId):'PLAYER');
}
function populateNotePlayerSelect(){
  const sel=document.getElementById('note-player-select'); if(!sel) return;
  const prev=sel.value;
  const ids=Object.keys(state.characters);
  const loose=Object.entries(ACCOUNTS).filter(([k,a])=>a.role==='player'&&!(a.character&&state.characters[a.character])).map(([k])=>'acc:'+k);
  sel.innerHTML='<option value="__gm__">GM (minhas notas)</option>'
    + ids.map(id=>`<option value="${id}">${escHtml(state.characters[id].short)}</option>`).join('')
    + loose.map(id=>`<option value="${id}">${escHtml(noteOwnerLabel(id))}</option>`).join('');
  if(prev && [...sel.options].some(o=>o.value===prev)) sel.value=prev;
}
function switchNoteTab(tab,btn){
  eviLink=null;
  state.noteTab=tab;
  document.querySelectorAll('#ov-notes .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const picker=document.getElementById('note-owner-picker');
  const showPicker= tab==='my' && role==='gm';
  if(picker) picker.classList.toggle('hidden', !showPicker);
  if(showPicker) populateNotePlayerSelect();
  renderNotes();
}
function renderNotes(){
  const card=document.querySelector('#ov-notes .overlay-card');
  if(card) card.classList.add('evi-mode');
  const w=document.getElementById('evi-wrap'), l=document.getElementById('note-list-mode');
  if(w) w.classList.remove('hidden');
  if(l) l.classList.add('hidden');
  eviRender();
}
function addNote(){
  const title=document.getElementById('note-title').value.trim(); const content=document.getElementById('note-content').value.trim();
  const msg=document.getElementById('note-msg');
  if(!title && !content){ msg.textContent='Escreva ao menos um título ou um conteúdo.'; return; }
  const cat=document.getElementById('note-cat').value;
  const now=new Date(); const date=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const author= role==='gm' ? 'GM' : (state.characters[state.currentPlayer]? state.characters[state.currentPlayer].short : 'PLAYER');
  const entry={title: title||'(sem título)', cat, author, date, content: content||'—'};
  if(state.noteTab==='shared'){
    state.notes.shared.push(entry);
  } else {
    const owner=noteOwnerId();
    if(!owner){ msg.textContent='Selecione um player pra adicionar a nota privada.'; return; }
    if(!state.notes.private[owner]) state.notes.private[owner]=[];
    state.notes.private[owner].push(entry);
  }
  document.getElementById('note-title').value=''; document.getElementById('note-content').value=''; msg.textContent='';
  renderNotes();
}

const EVI_COLORS=['#fff176','#ff9fc2','#8fd0f7','#b2e68f','#ffbf6b','#d3b6f5'];
const EVI_CATS=['IMPORTANTE','TEORIAS','NPC','LOCALIZAÇÃO','PERGUNTA','ITEM'];
const EVI_PHOTO_MAX=640;
let eviLink=null, eviDrag=null, eviZ=10, eviSeq=0, eviNextColor=0, eviPhotoFor=null, eviFileEl=null;
function eviId(p){ return p+Date.now().toString(36)+(eviSeq++)+Math.floor(Math.random()*1e4); }
function eviList(){
  if(state.noteTab==='shared') return state.notes.shared;
  const owner=noteOwnerId();
  if(!owner) return [];
  if(!state.notes.private[owner]) state.notes.private[owner]=[];
  return state.notes.private[owner];
}
function eviLinks(){
  if(state.noteTab==='shared'){
    if(!Array.isArray(state.notes.links)) state.notes.links=[];
    return state.notes.links;
  }
  const owner=noteOwnerId();
  if(!owner) return [];
  if(!state.notes.privateLinks) state.notes.privateLinks={};
  if(!Array.isArray(state.notes.privateLinks[owner])) state.notes.privateLinks[owner]=[];
  return state.notes.privateLinks[owner];
}
function eviPrep(){
  const list=eviList(), links=eviLinks();
  list.forEach((n,i)=>{
    if(!n.id) n.id=eviId('n');
    if(typeof n.x!=='number'){ n.x=30+(i%7)*225; n.y=40+Math.floor(i/7)*250; }
    if(n.style!=='polaroid') n.style='postit';
    if(!n.color) n.color=EVI_COLORS[i%EVI_COLORS.length];
    if(typeof n.rot!=='number') n.rot=Math.round((Math.random()*6-3)*10)/10;
    if(!n.w) n.w=190;
    delete n.pin;
  });
  const ids=new Set(list.map(n=>n.id));
  const valid=links.filter(l=>ids.has(l.a)&&ids.has(l.b));
  links.splice(0,links.length,...valid);
}
function eviFind(id){ return eviList().find(n=>n.id===id); }
function eviPinPos(n){ return {x:n.x+n.w/2, y:n.y+11}; }
function eviNoteHtml(n){
  const hasImg=typeof n.img==='string' && n.img.indexOf('data:image/')===0;
  const common=`<input class="evi-title" placeholder="${n.style==='polaroid'?'legenda…':'Título…'}" value="${escHtml(n.title)}" oninput="eviEdit('${n.id}','title',this.value)">
    <textarea class="evi-body" placeholder="${n.style==='polaroid'?'detalhes…':'Escreva aqui...'}" oninput="eviEdit('${n.id}','content',this.value)">${escHtml(n.content==='—'?'':n.content)}</textarea>`;
  const who=`<span>${escHtml(n.author)} · ${escHtml(n.date)}</span>`;
  let inner;
  if(n.style==='polaroid'){
    inner=`<div class="evi-photo${hasImg?' has':''}" data-id="${n.id}">${hasImg?`<img src="${n.img}" alt="" draggable="false">`:''}
      <button class="evi-photo-btn" title="${hasImg?'Trocar foto':'Adicionar foto'}" onclick="eviPickPhoto('${n.id}')">📷${hasImg?'':'<span>ADICIONAR FOTO<br>clique, arraste ou cole</span>'}</button></div>
      ${common}<div class="evi-meta">${who}</div>`;
  } else {
    const sw=EVI_COLORS.map(c=>`<button class="evi-sw" style="background:${c}" title="Cor do post-it" onclick="eviColor('${n.id}','${c}')"></button>`).join('');
    inner=`<select class="evi-cat" onchange="eviEdit('${n.id}','cat',this.value)">${EVI_CATS.map(c=>`<option ${c===n.cat?'selected':''}>${c}</option>`).join('')}${EVI_CATS.includes(n.cat)?'':`<option selected>${escHtml(n.cat)}</option>`}</select>
      ${common}<div class="evi-meta">${who}<span>${sw}</span></div>`;
  }
  return `<div class="evi-note st-${n.style}" data-id="${n.id}" style="--pi:${n.color};left:${n.x}px;top:${n.y}px;width:${n.w}px;transform:rotate(${n.rot}deg);z-index:${n.z||2}">
    <div class="evi-pin${eviLink&&eviLink.id===n.id?' linking':''}" title="Clique pra puxar um fio"></div>
    <button class="evi-del" title="Apagar nota" onclick="eviDelNote('${n.id}')">✕</button>
    <div class="evi-fields">${inner}</div></div>`;
}
function eviRender(){
  eviPrep();
  const surf=document.getElementById('evi-surface'); if(!surf) return;
  surf.innerHTML='<svg id="evi-svg"></svg>'+eviList().map(eviNoteHtml).join('');
  eviDrawLinks(); eviHint();
  surf.onpointerdown=eviDown; surf.onpointermove=eviMove; surf.onpointerup=eviUp; surf.onpointercancel=eviUp; surf.onclick=eviClick;
  surf.ondragover=eviDragOver; surf.ondragleave=eviDropClear; surf.ondrop=eviDrop;
}
function eviHint(){
  const h=document.getElementById('evi-hint'); if(!h) return;
  const who = state.noteTab==='shared' ? 'QUADRO COMPARTILHADO' : 'NOTAS PESSOAIS DE '+escHtml(noteOwnerLabel(noteOwnerId()));
  h.innerHTML = '<b>'+who+'</b> · ' + (eviLink ? '<b>FIO NA MÃO:</b> clique no pino da outra nota (ESC cancela)' : 'arraste as notas · clique num <b>pino</b> e depois noutro pra ligar com fio vermelho · ✕ no fio corta');
}
function eviDrawLinks(){
  const svg=document.getElementById('evi-svg'); if(!svg) return;
  let h='';
  eviLinks().forEach(l=>{
    const a=eviFind(l.a), b=eviFind(l.b); if(!a||!b) return;
    const p=eviPinPos(a), q=eviPinPos(b), d=Math.hypot(q.x-p.x,q.y-p.y);
    const cx=(p.x+q.x)/2, cy=(p.y+q.y)/2+Math.min(70,d*.16);
    h+=`<path class="thread" d="M${p.x},${p.y} Q${cx},${cy} ${q.x},${q.y}"/>`;
    const hx=(p.x+2*cx+q.x)/4, hy=(p.y+2*cy+q.y)/4;
    h+=`<g class="evi-x" onclick="eviDelLink('${l.id}')"><title>Cortar fio</title><circle cx="${hx}" cy="${hy}" r="8"/><text x="${hx}" y="${hy}">×</text></g>`;
  });
  h+='<path id="evi-prev" class="thread" d=""/>';
  svg.innerHTML=h;
}
function eviPt(e){ const r=document.getElementById('evi-surface').getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
function eviDown(e){
  const el=e.target.closest('.evi-note');
  if(!el || e.target.closest('input,textarea,select,button,.evi-pin')) return;
  const n=eviFind(el.dataset.id); if(!n) return;
  const pt=eviPt(e);
  eviDrag={n,el,dx:pt.x-n.x,dy:pt.y-n.y};
  n.z=++eviZ; el.style.zIndex=n.z; if(eviZ>900){ eviZ=10; }
  el.classList.add('dragging');
  try{ el.setPointerCapture(e.pointerId); }catch(_){}
}
function eviMove(e){
  const pt=eviPt(e);
  if(eviDrag){
    const {n,el}=eviDrag;
    n.x=Math.max(0,Math.min(1700-n.w,Math.round(pt.x-eviDrag.dx)));
    n.y=Math.max(0,Math.min(1150-60,Math.round(pt.y-eviDrag.dy)));
    el.style.left=n.x+'px'; el.style.top=n.y+'px';
    eviDrawLinks(); return;
  }
  if(eviLink){
    const n=eviFind(eviLink.id), pr=document.getElementById('evi-prev'); if(!n||!pr) return;
    const p=eviPinPos(n); pr.setAttribute('d',`M${p.x},${p.y} L${pt.x},${pt.y}`);
  }
}
function eviUp(){ if(eviDrag){ eviDrag.el.classList.remove('dragging'); eviDrag=null; } }
function eviClick(e){
  const pin=e.target.closest('.evi-pin');
  if(pin){
    const id=pin.closest('.evi-note').dataset.id;
    if(!eviLink){ eviLink={id}; pin.classList.add('linking'); }
    else if(eviLink.id===id){ eviLink=null; pin.classList.remove('linking'); const pr=document.getElementById('evi-prev'); if(pr) pr.setAttribute('d',''); }
    else {
      const a=eviLink.id, b=id;
      if(!eviLinks().some(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a))) eviLinks().push({id:eviId('l'),a,b});
      eviLink=null; eviRender(); return;
    }
    eviHint(); return;
  }
  if(eviLink && !e.target.closest('.evi-note') && !e.target.closest('.evi-x')) eviCancelLink();
}
function eviCancelLink(){ eviLink=null; eviRender(); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && eviLink) eviCancelLink(); });
function eviEdit(id,f,v){ const n=eviFind(id); if(n) n[f]=v; }
function eviColor(id,c){
  const n=eviFind(id); if(!n) return; n.color=c;
  const el=document.querySelector(`.evi-note[data-id="${id}"]`); if(el) el.style.setProperty('--pi',c);
}
function eviDelLink(id){ const links=eviLinks(); const keep=links.filter(l=>l.id!==id); links.splice(0,links.length,...keep); eviDrawLinks(); }
function eviDelNote(id){
  const n=eviFind(id); if(!n) return;
  if(!confirm('Apagar esta nota do quadro (e os fios ligados a ela)?')) return;
  const list=eviList(), links=eviLinks();
  const remaining=list.filter(x=>x.id!==id); list.splice(0,list.length,...remaining);
  const keptLinks=links.filter(l=>l.a!==id&&l.b!==id); links.splice(0,links.length,...keptLinks);
  if(eviLink&&eviLink.id===id) eviLink=null;
  eviRender();
}
function eviAdd(style,opt){
  opt=opt||{};
  if(state.noteTab!=='shared' && !noteOwnerId()){ alert('Entre com um login de player ou de mestre pra usar as notas pessoais.'); return; }
  eviPrep();
  const sc=document.getElementById('evi-scroll'), list=eviList(), k=list.length;
  const now=new Date(), date=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const author=noteAuthor();
  const n={id:eviId('n'),title:'',cat:'IMPORTANTE',author,date,content:'',
    x:Math.round(sc.scrollLeft+40+(k%6)*26), y:Math.round(sc.scrollTop+40+(k%6)*26), w:190,
    style:style==='polaroid'?'polaroid':'postit', color:EVI_COLORS[eviNextColor++%EVI_COLORS.length],
    rot:Math.round((Math.random()*6-3)*10)/10, z:++eviZ};
  if(typeof opt.x==='number'){ n.x=Math.max(0,Math.min(1700-n.w,Math.round(opt.x))); n.y=Math.max(0,Math.min(1090,Math.round(opt.y))); }
  if(opt.img) n.img=opt.img;
  list.push(n); eviRender();
  if(opt.pick) eviPickPhoto(n.id);
  else if(!opt.img){ const t=document.querySelector(`.evi-note[data-id="${n.id}"] .evi-title`); if(t) t.focus(); }
}

function eviShrink(file,cb){
  if(!file||String(file.type).indexOf('image/')!==0) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const sc=Math.min(1,EVI_PHOTO_MAX/Math.max(im.width,im.height)), c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*sc)); c.height=Math.max(1,Math.round(im.height*sc));
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',.8));
    };
    im.onerror=()=>alert('Não consegui ler essa imagem.');
    im.src=rd.result;
  };
  rd.readAsDataURL(file);
}
function eviSetPhoto(id,file){ eviShrink(file,url=>{ const n=eviFind(id); if(!n) return; n.img=url; eviRender(); }); }
function eviPickPhoto(id){
  eviPhotoFor=id;
  if(!eviFileEl){
    eviFileEl=document.createElement('input'); eviFileEl.type='file'; eviFileEl.accept='image/*'; eviFileEl.style.display='none';
    eviFileEl.onchange=()=>{ const f=eviFileEl.files[0]; if(f&&eviPhotoFor) eviSetPhoto(eviPhotoFor,f); eviFileEl.value=''; };
    document.body.appendChild(eviFileEl);
  }
  eviFileEl.click();
}
function eviHasFiles(e){ return !!(e.dataTransfer&&e.dataTransfer.types&&[...e.dataTransfer.types].includes('Files')); }
function eviDropClear(){ document.querySelectorAll('.evi-photo.drop').forEach(x=>x.classList.remove('drop')); }
function eviDragOver(e){
  if(!eviHasFiles(e)) return; e.preventDefault();
  const ph=e.target.closest('.evi-photo');
  document.querySelectorAll('.evi-photo.drop').forEach(x=>{ if(x!==ph) x.classList.remove('drop'); });
  if(ph) ph.classList.add('drop');
}
function eviDrop(e){
  if(!eviHasFiles(e)) return; e.preventDefault(); eviDropClear();
  const f=[...e.dataTransfer.files].find(f=>String(f.type).indexOf('image/')===0); if(!f) return;
  const ph=e.target.closest('.evi-photo');
  if(ph) eviSetPhoto(ph.dataset.id,f);
  else { const pt=eviPt(e); eviShrink(f,url=>eviAdd('polaroid',{img:url,x:pt.x-95,y:pt.y-30})); }
}
document.addEventListener('paste',e=>{
  const w=document.getElementById('evi-wrap'); if(!w||w.classList.contains('hidden')||!w.offsetParent) return;
  if(e.target.closest&&e.target.closest('input,textarea')) return;
  const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(i=>String(i.type).indexOf('image/')===0); if(!it) return;
  e.preventDefault(); eviShrink(it.getAsFile(),url=>eviAdd('polaroid',{img:url}));
});

let gmActivePane='chars';
function gmSwitch(p,btn){gmActivePane=p; document.querySelectorAll('.gm-nav button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); gmRender();}
function gmRender(){
  if(gmActivePane==='chars') gmRenderChars();
  else if(gmActivePane==='enemies') gmRenderEnemies();
  else if(gmActivePane==='npcs') gmRenderNpcs();
  else if(gmActivePane==='map') gmRenderMap();
  else if(gmActivePane==='events') gmRenderEvents();
  else if(gmActivePane==='images') gmRenderImages();
  else if(gmActivePane==='music') gmRenderMusic();
  else if(gmActivePane==='session') gmRenderSession();
  else if(gmActivePane==='accounts') gmRenderAccounts();
}
function gmRenderChars(){
  const pane=document.getElementById('gm-pane');
  pane.innerHTML=`<button class="btn small" onclick="openOverlay('board')">ABRIR QUADRO DE COMBATE (HP · SP · HABILIDADES)</button>
    <h4>CRIAR PERSONAGEM</h4>
    <div class="form-2col">
  <div class="form-row">
    <label>NOME DO PERSONAGEM</label>
    <input id="new-char-name" placeholder="Nome">
  </div>

  <div class="form-row">
    <label>NOME DO PLAYER</label>
    <input id="new-char-player" placeholder="Nome de quem joga">
  </div>

  <div class="form-row">
    <label>ARCANA PRIMÁRIA</label>
    <select id="new-char-arcana">
      <option value=""> SELECIONE SEU ARCANO </option>
      <option value="THE FOOL">THE FOOL</option>
      <option value="THE MAGICIAN">THE MAGICIAN</option>
      <option value="THE HIGH PRIESTESS">THE HIGH PRIESTESS</option>
      <option value="THE EMPRESS">THE EMPRESS</option>
      <option value="THE EMPEROR">THE EMPEROR</option>
      <option value="THE HIEROPHANT">THE HIEROPHANT</option>
      <option value="THE LOVERS">THE LOVERS</option>
      <option value="THE CHARIOT">THE CHARIOT</option>
      <option value="JUSTICE">JUSTICE</option>
      <option value="THE HERMIT">THE HERMIT</option>
      <option value="WHEEL OF FORTUNE">WHEEL OF FORTUNE</option>
      <option value="STRENGTH">STRENGTH</option>
      <option value="THE HANGED MAN">THE HANGED MAN</option>
      <option value="DEATH">DEATH</option>
      <option value="TEMPERANCE">TEMPERANCE</option>
      <option value="THE DEVIL">THE DEVIL</option>
      <option value="THE TOWER">THE TOWER</option>
      <option value="THE STAR">THE STAR</option>
      <option value="THE MOON">THE MOON</option>
      <option value="THE SUN">THE SUN</option>
      <option value="JUDGEMENT">JUDGEMENT</option>
      <option value="THE WORLD">THE WORLD</option>
    </select>
  </div>

  <div class="form-row">
    <label>ARCANA SECUNDÁRIA</label>
    <select id="new-char-sec-arcana">
      <option value=""> SELECIONE SEU ARCANO </option>
      <option value="THE FOOL">THE FOOL</option>
      <option value="THE MAGICIAN">THE MAGICIAN</option>
      <option value="THE HIGH PRIESTESS">THE HIGH PRIESTESS</option>
      <option value="THE EMPRESS">THE EMPRESS</option>
      <option value="THE EMPEROR">THE EMPEROR</option>
      <option value="THE HIEROPHANT">THE HIEROPHANT</option>
      <option value="THE LOVERS">THE LOVERS</option>
      <option value="THE CHARIOT">THE CHARIOT</option>
      <option value="JUSTICE">JUSTICE</option>
      <option value="THE HERMIT">THE HERMIT</option>
      <option value="WHEEL OF FORTUNE">WHEEL OF FORTUNE</option>
      <option value="STRENGTH">STRENGTH</option>
      <option value="THE HANGED MAN">THE HANGED MAN</option>
      <option value="DEATH">DEATH</option>
      <option value="TEMPERANCE">TEMPERANCE</option>
      <option value="THE DEVIL">THE DEVIL</option>
      <option value="THE TOWER">THE TOWER</option>
      <option value="THE STAR">THE STAR</option>
      <option value="THE MOON">THE MOON</option>
      <option value="THE SUN">THE SUN</option>
      <option value="JUDGEMENT">JUDGEMENT</option>
      <option value="THE WORLD">THE WORLD</option>
    </select>
  </div>

  <div class="form-row">
    <label>MAX HP</label>
    <input id="new-char-hp" type="number" value="30">
  </div>

  <div class="form-row">
    <label>MAX SP</label>
    <input id="new-char-sp" type="number" value="20">
  </div>
</div>
    <button class="btn small" onclick="gmCreateCharacter()">CRIAR PERSONAGEM</button>

    <h4 style="margin-top:18px">EDITAR FICHA COMPLETA</h4>
    <select id="gm-char-select" onchange="gmLoadCharEditor(this.value)">
      <option value="">Selecionar personagem…</option>
      ${Object.keys(state.characters).map(id=>`<option value="${id}">${state.characters[id].short}</option>`).join('')}
    </select>
    <div id="gm-char-editor"></div>`;
}
function gmCreateCharacter(){
  const name=(document.getElementById('new-char-name').value||'').trim();
  const arcana=(document.getElementById('new-char-arcana').value||'').trim()||'—';
  const secArcana=(document.getElementById('new-char-sec-arcana').value||'').trim()||'—';
  const maxHp=parseInt(document.getElementById('new-char-hp').value||'30',10);
  const maxSp=parseInt(document.getElementById('new-char-sp').value||'20',10);

  if(!name){
    alert('Digite um nome para o personagem.');
    return;
  }

  const id='pc_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  const short=name.split(' ')[0].toUpperCase();

  state.characters[id]={
    name:name.toUpperCase(),
    playerName:(document.getElementById('new-char-player').value||'').trim(),
    short:short,
    arcana:arcana.toUpperCase(),
    secArcana:secArcana.toUpperCase(),
    hp:maxHp,
    maxHp:maxHp,
    sp:maxSp,
    maxSp:maxSp,
    status:['NORMAL'],
    x:25+Math.random()*50,
    y:25+Math.random()*50,
    stats:{str:10,mag:10,end:10,agi:10,luk:10},
    profile:{age:'—',desc:'',personality:'',history:'',fears:'',goals:''},
    persona:{name:'—',arcana:arcana,level:1},
    skills:[],
    equipment:{weapon:'—',armor:'—',accessory:'—',items:'—',weaponImage:null},
    notes:'',
    visibility:{persona:'OWNER',history:'OWNER',skills:'OWNER',notes:'OWNER'}
  };

  state.turnOrder.push(id);
  addLog(`GM criou o personagem ${state.characters[id].short}.`);
  renderAll();
  gmRenderChars();
  document.getElementById('gm-char-select').value=id;
  gmLoadCharEditor(id);
}

function gmApply(id){const v=parseInt(document.getElementById('dmg-'+id).value||'0',10); if(!v)return; applyDelta(id,v); document.getElementById('dmg-'+id).value='';}

// ---------- BIBLIOTECA DE NPCS E CRIATURAS (guardada no navegador e no Firebase, só o mestre vê) ----------
function persistLibrary(){
  try{ localStorage.setItem('dept0_library',JSON.stringify(state.library)); }
  catch(e){ if(!persistLibrary.warned){ persistLibrary.warned=true; alert('Não deu pra guardar a biblioteca neste navegador (espaço cheio). Ela continua sendo enviada ao Firebase.'); } }
}
function loadLibrary(){
  try{ const j=localStorage.getItem('dept0_library'); if(j){ const o=JSON.parse(j); if(o&&typeof o==='object') state.library={enemies:o.enemies||[],npcs:o.npcs||[]}; } }catch(e){}
}
function gmToast(msg){
  let t=document.getElementById('gm-toast');
  if(!t){ t=document.createElement('div'); t.id='gm-toast'; t.className='gm-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show'); clearTimeout(gmToast._t); gmToast._t=setTimeout(()=>t.classList.remove('show'),2200);
}
function libSave(kind,id,quiet){
  const src=(kind==='enemies'?state.enemies:state.npcs)[id]; if(!src) return;
  const e=JSON.parse(JSON.stringify(src));
  delete e.x; delete e.y; delete e.id;
  if(kind==='enemies'){ e.hp=e.maxHp; e.sp=e.maxSp; e.status=['NORMAL']; e.weaknessRevealed=false; }
  const list=state.library[kind], i=list.findIndex(x=>(x.name||'')===(e.name||''));
  if(i>=0){ e.lid=list[i].lid; list[i]=e; } else { e.lid='lib'+Date.now()+Math.random().toString(36).slice(2,5); list.push(e); }
  persistLibrary(); libRefresh(kind);
  if(!quiet) gmToast((i>=0?'Atualizado na biblioteca: ':'Salvo na biblioteca: ')+(e.short||e.name));
}
function libAdd(kind,lid){
  const e=state.library[kind].find(x=>x.lid===lid); if(!e) return;
  const c=JSON.parse(JSON.stringify(e)); delete c.lid;
  const group=kind==='enemies'?state.enemies:state.npcs;
  // repetidos viram "GOBLIN 2", "GOBLIN 3"...
  const same=Object.values(group).filter(o=>o.short===e.short||String(o.short||'').startsWith(e.short+' ')).length;
  if(same) c.short=e.short+' '+(same+1);
  let id;
  if(kind==='enemies'){ do{ enemyCounter++; id='enemy'+enemyCounter; }while(state.enemies[id]); c.x=60+Math.random()*20; c.y=40+Math.random()*20; }
  else { do{ npcCounter++; id='npc_'+npcCounter; }while(state.npcs[id]); c.x=15+Math.random()*20; c.y=15+Math.random()*20; }
  group[id]=c;
  if(kind==='enemies') state.turnOrder.push(id);
  addLog(kind==='enemies'?`GM invocou ${c.short} no mapa.`:`GM adicionou o NPC ${c.short} ao mapa.`);
  renderAll();
  if(kind==='enemies') gmRefreshEnemiesList(); else gmRefreshNpcsList();
}
function libRemove(kind,lid){
  const e=state.library[kind].find(x=>x.lid===lid); if(!e) return;
  if(!confirm('Excluir "'+(e.short||e.name)+'" da biblioteca? (o que já está no mapa não muda)')) return;
  state.library[kind]=state.library[kind].filter(x=>x.lid!==lid);
  persistLibrary(); libRefresh(kind);
}
function libRefresh(kind){
  const box=document.getElementById('gm-lib-'+kind); if(!box) return;
  const l=state.library[kind]||[];
  if(!l.length){ box.innerHTML='<div style="font-size:.65rem;color:var(--gray)">— nada salvo ainda. Use 💾 SALVAR numa linha acima, ou marque "salvar também na biblioteca" ao criar. —</div>'; return; }
  box.innerHTML=l.map(e=>`<div class="gm-char-row" style="flex-wrap:wrap">${e.avatar?`<img src="${escHtml(e.avatar)}" alt="" style="width:26px;height:26px;object-fit:cover;border:1px solid var(--line)">`:''}<span class="name">${escHtml(e.short||e.name)}</span>`
    +`<span>${kind==='enemies'?'LV '+escHtml(e.level||'?')+' · HP '+escHtml(e.maxHp):escHtml(e.role||'—')}</span>`
    +`<button class="btn small" onclick="libAdd('${kind}','${e.lid}')">ADICIONAR AO MAPA</button>`
    +`<button class="btn small ghost" onclick="libRemove('${kind}','${e.lid}')">EXCLUIR</button></div>`).join('');
}
function gmRenderEnemies(){
  const pane=document.getElementById('gm-pane');
  pane.innerHTML=`<h4>CRIAR INIMIGO</h4>
    <div class="form-row"><label>FOTO DO INIMIGO</label><input type="file" accept="image/*" id="en-avatar"></div>
    <div class="form-2col">
      <div class="form-row"><label>NOME</label><input id="en-name"></div>
      <div class="form-row"><label>TIPO</label><input id="en-type" placeholder="EX:'BESTA '"></div>
      <div class="form-row"><label>MAX HP</label><input id="en-hp" type="number" value="30"></div>
      <div class="form-row"><label>SP</label><input id="en-sp" type="number" value="10"></div>
      <div class="form-row"><label>NÍVEL</label><input id="en-level" type="number" value="1"></div>
      <div class="form-row"><label>FRAQUEZA</label><input id="en-weak"></div>
      <div class="form-row"><label>RESISTÊNCIA</label><input id="en-resist"></div>
      <div class="form-row"><label>DESCRIÇÃO</label><input id="en-desc"></div>
    </div>
    <label class="lib-check"><input type="checkbox" id="en-save"> SALVAR TAMBÉM NA BIBLIOTECA</label>
    <button class="btn small" onclick="gmCreateEnemy()">ADICIONAR</button>
    <h4 style="margin-top:16px">INIMIGOS ATIVOS</h4><div id="gm-enemies-list"></div>
    <h4 style="margin-top:16px">BIBLIOTECA — CRIATURAS SALVAS</h4><div id="gm-lib-enemies"></div>`;
  gmRefreshEnemiesList();
}
function gmCreateEnemy(){
  const fileInput=document.getElementById('en-avatar');
  const file=fileInput&&fileInput.files[0];
  const build=(avatar)=>{
    let id; do{ enemyCounter++; id='enemy'+enemyCounter; }while(state.enemies[id]);
    const hp=parseInt(document.getElementById('en-hp').value||'30',10);
    state.enemies[id]={name:document.getElementById('en-name').value||'UNKNOWN ENEMY',short:(document.getElementById('en-name').value||'ENEMY').split(' ')[0].toUpperCase(),
      type:document.getElementById('en-type').value||'ENEMY', hp:hp, maxHp:hp, sp:parseInt(document.getElementById('en-sp').value||'10',10), maxSp:parseInt(document.getElementById('en-sp').value||'10',10), skills:[],
      level:document.getElementById('en-level').value||'1', weakness:document.getElementById('en-weak').value, resistance:document.getElementById('en-resist').value,
      weaknessRevealed:false, avatar:avatar||null,
      desc:document.getElementById('en-desc').value, status:['NORMAL'], x:60+Math.random()*20, y:40+Math.random()*20};
    state.turnOrder.push(id);
    addLog(`GM invocou ${state.enemies[id].short} no mapa.`);
    const sv=document.getElementById('en-save'); if(sv&&sv.checked) libSave('enemies',id,true);
    renderAll(); gmRefreshEnemiesList();
  };
  if(file){ imgDownscale(file,256,build); }
  else build(null);
}
function gmRefreshEnemiesList(){
  const box=document.getElementById('gm-enemies-list'); if(!box) return;
  const es=Object.entries(state.enemies);
  box.innerHTML= es.length? '' : '<div style="font-size:.65rem;color:var(--gray)">— nenhum inimigo —</div>';
  es.forEach(([id,c])=>{
    const row=document.createElement('div'); row.className='gm-char-row'; row.style.flexWrap='wrap';
    row.innerHTML=`<span class="name">${c.short}</span><span>LV ${c.level||'?'}</span>
      <label class="btn small ghost" style="cursor:pointer">FOTO<input type="file" accept="image/*" style="display:none" onchange="gmUploadEnemyAvatar('${id}',event)"></label>
      <button class="btn small ghost" onclick="openOverlay('board')">QUADRO</button>
      <button class="btn small ghost" onclick="libSave('enemies','${id}')">💾 SALVAR</button>
      <button class="btn small ghost" onclick="gmDeleteEnemy('${id}')">EXCLUIR</button>`;
    box.appendChild(row);
  });
  libRefresh('enemies');
}
function gmToggleWeakness(id){
  const c=state.enemies[id]; if(!c) return;
  c.weaknessRevealed=!c.weaknessRevealed;
  addLog(`A fraqueza de ${c.short} foi ${c.weaknessRevealed?'revelada':'ocultada novamente'}.`);
  renderAll(); gmRefreshEnemiesList();
}
function gmUploadEnemyAvatar(id,ev){
  const file=ev.target.files[0]; if(!file) return;
  imgDownscale(file,256,d=>{ state.enemies[id].avatar=d; addLog(`GM atualizou a foto de ${state.enemies[id].short}.`); renderAll(); });
}
function gmDeleteEnemy(id){delete state.enemies[id]; state.turnOrder=state.turnOrder.filter(t=>t!==id); addLog(`${id} foi removido do mapa.`); renderAll(); gmRefreshEnemiesList();}

function gmRenderNpcs(){
  document.getElementById('gm-pane').innerHTML=`<h4>CRIAR NPC</h4>
    <div class="form-row"><label>FOTO DO NPC</label><input type="file" accept="image/*" id="npc-avatar"></div>
    <div class="form-2col"><div class="form-row"><label>NOME</label><input id="npc-name"></div>
    <div class="form-row"><label>FUNÇÃO</label><input id="npc-role"></div></div>
    <div class="form-row"><label>DESCRIÇÃO</label><input id="npc-desc"></div>
    <label class="lib-check"><input type="checkbox" id="npc-save"> SALVAR TAMBÉM NA BIBLIOTECA</label>
    <button class="btn small" onclick="gmCreateNpc()">ADICIONAR AO MAPA</button>
    <h4 style="margin-top:16px">NPCS NO MAPA</h4><div id="gm-npcs-list"></div>
    <h4 style="margin-top:16px">BIBLIOTECA — NPCS SALVOS</h4><div id="gm-lib-npcs"></div>`;
  gmRefreshNpcsList();
}
function gmCreateNpc(){
  const name=(document.getElementById('npc-name').value||'').trim();
  if(!name){ alert('Digite um nome para o NPC.'); return; }
  const fileInput=document.getElementById('npc-avatar');
  const file=fileInput&&fileInput.files[0];
  const build=(avatar)=>{
    let id; do{ npcCounter++; id='npc_'+npcCounter; }while(state.npcs[id]);
    state.npcs[id]={name:name.toUpperCase(), short:name.split(' ')[0].toUpperCase(), role:document.getElementById('npc-role').value||'—',
      desc:document.getElementById('npc-desc').value||'', avatar:avatar||null, x:15+Math.random()*20, y:15+Math.random()*20};
    addLog(`GM adicionou o NPC ${state.npcs[id].short} ao mapa.`);
    const sv=document.getElementById('npc-save'); if(sv&&sv.checked) libSave('npcs',id,true);
    renderAll(); gmRefreshNpcsList();
  };
  if(file){ imgDownscale(file,256,build); }
  else build(null);
}
function gmRefreshNpcsList(){
  const box=document.getElementById('gm-npcs-list'); if(!box) return;
  const ns=Object.entries(state.npcs);
  box.innerHTML= ns.length? '' : '<div style="font-size:.65rem;color:var(--gray)">— nenhum NPC no mapa —</div>';
  ns.forEach(([id,c])=>{
    const row=document.createElement('div'); row.className='gm-char-row';
    row.innerHTML=`<span class="name">${c.short}</span><span>${c.role||'—'}</span>
      <label class="btn small ghost" style="cursor:pointer">FOTO<input type="file" accept="image/*" style="display:none" onchange="gmUploadNpcAvatar('${id}',event)"></label>
      <button class="btn small ghost" onclick="libSave('npcs','${id}')">💾 SALVAR</button>
      <button class="btn small ghost" onclick="gmDeleteNpc('${id}')">REMOVER</button>`;
    box.appendChild(row);
  });
  libRefresh('npcs');
}
function gmUploadNpcAvatar(id,ev){
  const file=ev.target.files[0]; if(!file) return;
  imgDownscale(file,256,d=>{ state.npcs[id].avatar=d; addLog(`GM atualizou a foto do NPC ${state.npcs[id].short}.`); renderAll(); });
}
function gmDeleteNpc(id){delete state.npcs[id]; addLog(`NPC removido do mapa.`); renderAll(); gmRefreshNpcsList();}
const ROOM_COLORS={gray:['rgba(30,28,33,.6)','#3a3740'],red:['rgba(122,15,26,.35)','#c8202e'],amber:['rgba(224,160,32,.18)','#e0a020'],green:['rgba(63,220,122,.12)','#3fdc7a'],blue:['rgba(46,110,207,.2)','#2e6ecf'],purple:['rgba(122,79,176,.25)','#7a4fb0']};
const ROOM_LABELS={gray:'CINZA',red:'VERMELHO',amber:'ÂMBAR',green:'VERDE',blue:'AZUL',purple:'ROXO'};
function escHtml(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function gmRenderMap(){
  const locRows=state.locations.map((l,i)=>`<div class="gm-char-row"><input class="mini-input" style="flex:1;text-align:left" value="${escHtml(l)}" onchange="gmRenameLocation(${i},this.value)"><button class="btn small ghost" onclick="gmDeleteLocation(${i})">✕</button></div>`).join('');
  const roomRows=state.rooms.map(r=>{
    const cover=r.kind==='cover', on=r.covered!==false;
    return `<div class="gm-char-row" style="flex-wrap:wrap"><span style="font-size:.58rem;color:${cover?'var(--amber)':'var(--gray)'};width:44px">${cover?'TAMPA':'SALA'}</span>
      <input class="mini-input" style="width:110px;text-align:left" value="${escHtml(r.name)}" placeholder="nome" onchange="gmRoomName('${r.id}',this.value)">
      ${cover?`<button class="btn small ghost ${on?'on-state':''}" onclick="gmRoomCover('${r.id}',${!on})">${on?'TAMPANDO':'ABERTA'}</button>`
      :`<select class="mini-input" style="width:84px" onchange="gmRoomColor('${r.id}',this.value)">${Object.keys(ROOM_COLORS).map(c=>`<option value="${c}" ${r.color===c?'selected':''}>${ROOM_LABELS[c]}</option>`).join('')}</select>
      <label style="font-size:.58rem;white-space:nowrap"><input type="checkbox" onchange="gmRoomRevealed('${r.id}',this.checked)" ${r.revealed?'checked':''}> REVELADA</label>`}
      <button class="btn small ghost" title="duplicar" onclick="gmRoomDuplicate('${r.id}')">⧉</button>
      <button class="btn small ghost" title="excluir" onclick="gmRoomDelete('${r.id}')">✕</button></div>`;}).join('');
  document.getElementById('gm-pane').innerHTML=`${gmSetupsHtml()}
    <h4 style="margin-top:16px">MAPA DE FUNDO</h4>
    <div style="width:100%;height:90px;border:1px solid var(--line);background:var(--panel2);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px" id="map-preview">
      ${state.mapBackground?`<img src="${state.mapBackground}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:.6rem;color:var(--gray)">NO CUSTOM MAP — USING DEFAULT LAYOUT</span>'}
    </div>
    <div class="form-row"><label>INSERIR NOVO MAPA DE FUNDO</label><input type="file" accept="image/*" onchange="gmUploadMap(event)"></div>
    ${state.mapBackground?'<button class="btn small ghost danger" onclick="gmClearMap()">REMOVE CUSTOM MAP</button>':''}
    <h4 style="margin-top:16px">TAMANHO DO MAPA E GRID</h4>
    <div class="map-tools">${mapToolsHtml()}</div>
    <div style="font-size:.58rem;color:var(--gray);margin-top:4px">Salas, tokens e imagens acompanham o tamanho do mapa. Também dá pra arrastar o quadrado amarelo no canto do mapa (botão EDITAR MAPA).</div>
    <h4 style="margin-top:16px">LOCALIZAÇÃO ATUAL (etiquetas de mapa)</h4>
    <div class="form-row"><select id="map-select" onchange="gmSetLocation(this.value)">${state.locations.map(l=>`<option ${l===state.location?'selected':''}>${escHtml(l)}</option>`).join('')}</select></div>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:4px">EDITAR / EXCLUIR ETIQUETAS</div>
    ${locRows}
    <div style="display:flex;gap:6px;margin-top:6px"><input id="new-loc" placeholder="NOVA ETIQUETA" style="flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--white);padding:5px 7px;font-size:.7rem"><button class="btn small" onclick="gmAddLocation()">+ ADICIONAR</button></div>
    <h4 style="margin-top:16px">SALAS E TAMPAS DO MAPA (quadrados)</h4>
    ${roomRows||'<div style="font-size:.65rem;color:var(--gray)">Nenhuma sala.</div>'}
    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
      <button class="btn small" onclick="gmAddRoom('room')">+ ADICIONAR SALA</button>
      <button class="btn small" onclick="gmAddRoom('cover')" title="quadrado preto que esconde uma parte do mapa dos players">+ ADICIONAR TAMPA</button>
      <button class="btn small ghost ${state.roomEdit?'on-state':''}" onclick="toggleRoomEdit()">${state.roomEdit?'✔ EDITANDO NO MAPA (sair)':'MOVER / REDIMENSIONAR NO MAPA'}</button>
    </div>
    <div style="font-size:.58rem;color:var(--gray);margin-top:4px">TAMPA = quadrado preto que cobre o mapa (tokens e imagens também) pros players; você o vê listrado. Clique em TAMPANDO/ABERTA pra revelar o que está embaixo. No modo de edição (feche este painel ou abra em outra tela) arraste pra mover, canto vermelho redimensiona, ✕ exclui.</div>
    <h4 style="margin-top:16px">FOG OF WAR</h4>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:6px">O nível define o quão escura é a névoa. Áreas reveladas ficam limpas, e os players não veem inimigos/NPCs fora delas. Pra você a névoa aparece mais fraca.</div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${FOG_LEVELS.map((l,i)=>`<button class="btn small ghost ${state.fogLevel===i?'on-state':''}" onclick="setFogLevel(${i})">${l.n}</button>`).join('')}</div>
    <label style="font-size:.68rem"><input type="checkbox" onchange="fogSetVision(this.checked)" ${state.fogCfg.vision?'checked':''}> Visão dos players (revela ao redor de cada token)</label>
    <div class="mus-ctrl">RAIO DA VISÃO <input type="range" min="4" max="40" value="${state.fogCfg.radius}" oninput="fogSetRadius(this.value)"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <button class="btn small ghost ${state.fogCfg.tool==='reveal'?'on-state':''}" onclick="fogSetTool('reveal')">PINCEL: REVELAR</button>
      <button class="btn small ghost ${state.fogCfg.tool==='hide'?'on-state':''}" onclick="fogSetTool('hide')">PINCEL: ESCONDER</button>
      <button class="btn small ghost" onclick="fogClear()">LIMPAR REVELAÇÕES (${state.fogCfg.holes.length})</button>
    </div>
    <div class="mus-ctrl">TAMANHO DO PINCEL <input type="range" min="4" max="40" value="${state.fogCfg.brush}" oninput="fogSetBrush(this.value)"></div>
    <div style="font-size:.58rem;color:var(--gray);margin-top:4px">Com um pincel ativo, feche este painel e clique no mapa. Também dá pra marcar salas como REVELADA na lista acima.</div>
    <h4 style="margin-top:16px">GRID</h4>
    <label style="font-size:.68rem"><input type="checkbox" onchange="toggleGrid()" ${state.grid?'checked':''}> Grid</label>`;
}
function gmSetLocation(v){ state.location=v; document.getElementById('chap-label').textContent=state.chapter+' · '+v; addLog('Localização alterada para: '+v); }
function gmAddLocation(){ const el=document.getElementById('new-loc'); const v=(el.value||'').trim().toUpperCase(); if(!v||state.locations.includes(v)) return; state.locations.push(v); gmRenderMap(); }
function gmRenameLocation(i,v){ v=(v||'').trim().toUpperCase(); if(!v) return gmRenderMap(); const old=state.locations[i]; state.locations[i]=v; if(state.location===old){ state.location=v; document.getElementById('chap-label').textContent=state.chapter+' · '+v; } gmRenderMap(); }
function gmDeleteLocation(i){ state.locations.splice(i,1); gmRenderMap(); }
let selectedRoomId=null;
function roomById(id){ return state.rooms.find(x=>x.id===id); }
function refreshRoomUI(){ renderRoomToolbar(); if(gmActivePane==='map' && document.getElementById('gm-pane') && document.getElementById('ov-gm').classList.contains('active')) gmRenderMap(); }
function gmRoomName(id,v){ const r=roomById(id); if(r){ r.name=v.trim(); renderRooms(); renderRoomToolbar(); } }
function gmRoomColor(id,v){ const r=roomById(id); if(r){ r.color=v; renderRooms(); } }
function gmRoomCover(id,on){ const r=roomById(id); if(r){ r.covered=!!on; renderRooms(); refreshRoomUI(); addLog(`GM ${on?'tampou':'abriu'} uma área do mapa${r.name?' ('+escHtml(r.name)+')':''}.`); } }
function gmRoomDelete(id){ state.rooms=state.rooms.filter(x=>x.id!==id); if(selectedRoomId===id) selectedRoomId=null; renderRooms(); renderFog(); refreshRoomUI(); }
function gmRoomDuplicate(id){
  const r=roomById(id); if(!r) return;
  const c=Object.assign({},r,{id:'r'+Date.now()+Math.random().toString(36).slice(2,5),x:Math.min(r.x+3,100-r.w),y:Math.min(r.y+3,100-r.h)});
  state.rooms.push(c); selectedRoomId=c.id; renderRooms(); renderFog(); refreshRoomUI();
}
function gmAddRoom(kind){
  kind = kind==='cover' ? 'cover' : 'room';
  const off=(state.rooms.length%8)*3;
  const r={id:'r'+Date.now()+Math.random().toString(36).slice(2,5),kind,name:'',x:30+off,y:30+off,w:20,h:20,color:'gray'};
  if(kind==='cover') r.covered=true;
  state.rooms.push(r); selectedRoomId=r.id; renderRooms(); renderFog(); refreshRoomUI();
}
function renderRooms(){
  const wrap=document.getElementById('map-wrap'); wrap.querySelectorAll('.map-room').forEach(r=>r.remove());
  const anchor=document.getElementById('grid-overlay'), gm=role==='gm';
  state.rooms.forEach(r=>{
    const cover=r.kind==='cover', open=cover && r.covered===false;
    if(open && !gm) return;
    const el=document.createElement('div');
    el.className='map-room'+(cover?' cover'+(gm?' gm-view':'')+(open?' off':''):'')+(state.roomEdit?' editing':'')+(state.roomEdit&&r.id===selectedRoomId?' selected':'');
    el.dataset.id=r.id;
    let st=`left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;`;
    if(!cover){ const c=ROOM_COLORS[r.color]||ROOM_COLORS.gray; st+=`background:${c[0]};border-color:${c[1]}`; }
    el.style.cssText=st;
    el.innerHTML=((r.name&&(!cover||gm))?`<span class="room-label">${escHtml(r.name)}</span>`:'')+(state.roomEdit?'<i class="room-del" title="excluir">✕</i><i class="room-handle"></i>':'');
    if(state.roomEdit) el.addEventListener('pointerdown',roomPointerDown);
    wrap.insertBefore(el,anchor);
  });
  wrap.querySelectorAll('.map-size-handle').forEach(h=>h.remove());
  if(gm && state.roomEdit){
    const h=document.createElement('div'); h.className='map-size-handle'; h.title='arraste para mudar o tamanho do mapa';
    h.addEventListener('pointerdown',sizeHandleDown); wrap.appendChild(h);
  }
}
function renderRoomToolbar(){
  const tb=document.getElementById('room-toolbar'); if(!tb) return;
  const active=role==='gm' && state.roomEdit;
  tb.classList.toggle('on',active);
  if(!active){ tb.innerHTML=''; return; }
  const r=roomById(selectedRoomId);
  let h=`<div class="map-tools">${mapToolsHtml()}</div><span class="rt-break"></span><button class="btn small" onclick="gmAddRoom('room')">+ SALA</button><button class="btn small" onclick="gmAddRoom('cover')" title="esconde uma parte do mapa dos players">+ TAMPA</button><span class="rt-sep"></span>`;
  if(r){
    const cover=r.kind==='cover', on=r.covered!==false;
    h+=`<b style="color:${cover?'var(--amber)':'var(--white)'}">${cover?'TAMPA':'SALA'}</b>
      <input value="${escHtml(r.name)}" placeholder="nome" style="width:120px" onchange="gmRoomName('${r.id}',this.value)">`;
    h+= cover
      ? `<button class="btn small ghost ${on?'on-state':''}" onclick="gmRoomCover('${r.id}',${!on})">${on?'TAMPANDO (clique pra abrir)':'ABERTA (clique pra tampar)'}</button>`
      : `<select onchange="gmRoomColor('${r.id}',this.value)">${Object.keys(ROOM_COLORS).map(c=>`<option value="${c}" ${r.color===c?'selected':''}>${ROOM_LABELS[c]}</option>`).join('')}</select>
         <label style="white-space:nowrap"><input type="checkbox" onchange="gmRoomRevealed('${r.id}',this.checked)" ${r.revealed?'checked':''}> REVELADA</label>`;
    h+=`<button class="btn small ghost" onclick="gmRoomDuplicate('${r.id}')">⧉ DUPLICAR</button><button class="btn small ghost danger" onclick="gmRoomDelete('${r.id}')">✕ EXCLUIR</button>`;
  } else h+=`<span style="color:var(--gray)">Nenhum quadrado selecionado.</span>`;
  h+=`<span class="rt-hint">Clique num quadrado pra selecionar · arraste pra mover · canto vermelho redimensiona · ✕ (ou tecla Delete) exclui. O quadrado amarelo no canto do mapa muda o tamanho do mapa.</span>`;
  tb.innerHTML=h;
}
function toggleRoomEdit(){
  if(role!=='gm') return;
  state.roomEdit=!state.roomEdit; if(!state.roomEdit) selectedRoomId=null;
  renderRooms(); renderRoomToolbar();
  document.getElementById('btn-rooms').classList.toggle('on-state',state.roomEdit);
  document.getElementById('btn-rooms').textContent= state.roomEdit? 'SAIR DA EDIÇÃO':'EDITAR MAPA';
  if(gmActivePane==='map') gmRenderMap();
}
document.addEventListener('keydown',e=>{
  if(role!=='gm' || !state.roomEdit || !selectedRoomId) return;
  if(e.key!=='Delete') return;
  if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')) return;
  gmRoomDelete(selectedRoomId);
});
let roomDrag=null;
function roomPointerDown(e){
  if(role!=='gm') return; e.stopPropagation();
  const el=e.currentTarget, r=roomById(el.dataset.id); if(!r) return;
  if(e.target.classList.contains('room-del')){ gmRoomDelete(r.id); return; }
  selectedRoomId=r.id;
  document.querySelectorAll('.map-room').forEach(n=>n.classList.toggle('selected',n.dataset.id===r.id));
  renderRoomToolbar();
  roomDrag={el,r,resize:e.target.classList.contains('room-handle'),rect:document.getElementById('map-wrap').getBoundingClientRect(),sx:e.clientX,sy:e.clientY,ox:r.x,oy:r.y,ow:r.w,oh:r.h};
  el.setPointerCapture(e.pointerId); el.addEventListener('pointermove',roomMove); el.addEventListener('pointerup',roomUp);
}
function roomMove(e){
  if(!roomDrag) return; const d=roomDrag, r=d.r;
  const dx=(e.clientX-d.sx)/d.rect.width*100, dy=(e.clientY-d.sy)/d.rect.height*100;
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  if(d.resize){ r.w=cl(d.ow+dx,4,100-r.x); r.h=cl(d.oh+dy,4,100-r.y); }
  else { r.x=cl(d.ox+dx,0,100-r.w); r.y=cl(d.oy+dy,0,100-r.h); }
  d.el.style.left=r.x+'%'; d.el.style.top=r.y+'%'; d.el.style.width=r.w+'%'; d.el.style.height=r.h+'%';
}
function roomUp(){ if(roomDrag){ roomDrag.el.removeEventListener('pointermove',roomMove); roomDrag.el.removeEventListener('pointerup',roomUp); roomDrag=null; } }
function gmUploadMap(ev){
  const file=ev.target.files[0]; if(!file) return;
  imgDownscale(file,2000,d=>{
    state.mapBackground=d;
    const img=document.getElementById('map-bg-img'); img.src=d; img.classList.remove('hidden');
    addLog('GM trocou o background do mapa.');
    gmRenderMap();
  });
}
function gmClearMap(){
  state.mapBackground=null;
  const img=document.getElementById('map-bg-img'); img.src=''; img.classList.add('hidden');
  addLog('GM removeu o mapa customizado.');
  gmRenderMap();
}
let evEditId=null;
function gmRenderEvents(){
  const ev=state.events.find(e=>e.id===evEditId)||{title:'',trigger:'',text:'',track:''};
  const rows=state.events.map(e=>`<div class="track-row"><div class="tn"><b>${escHtml(e.title)}</b><span style="color:var(--gray)">${escHtml(e.trigger||'—')}</span></div>
      <button class="btn small" onclick="fireEvent('${e.id}')">DISPARAR</button>
      <button class="btn small ghost" onclick="evEdit('${e.id}')">✎</button>
      <button class="btn small ghost" onclick="evDelete('${e.id}')">✕</button></div>`).join('') || '<div style="padding:10px;font-size:.65rem;color:var(--gray)">Nenhum evento criado.</div>';
  document.getElementById('gm-pane').innerHTML=`<h4>EVENTOS</h4>
    <div style="font-size:.62rem;color:var(--gray);margin-bottom:8px">Ao DISPARAR, aparece uma tela cheia com a mensagem (e toca a música vinculada, se houver).</div>
    <div class="track-box">${rows}</div>
    <h4>${evEditId?'EDITAR EVENTO':'NOVO EVENTO'}</h4>
    <div class="form-row"><label>TÍTULO</label><input id="ev-title" value="${escHtml(ev.title)}"></div>
    <div class="form-row"><label>GATILHO / LEMBRETE (só o mestre vê)</label><input id="ev-trigger" value="${escHtml(ev.trigger)}"></div>
    <div class="form-row"><label>MENSAGEM NA TELA</label><textarea id="ev-text" rows="3">${escHtml(ev.text)}</textarea></div>
    <div class="form-row"><label>MÚSICA VINCULADA</label><select id="ev-track"><option value="">— nenhuma —</option>${state.tracks.map(t=>`<option value="${t.id}" ${ev.track===t.id?'selected':''}>${escHtml(t.name)}</option>`).join('')}</select></div>
    <button class="btn small" onclick="gmSaveEvent()">${evEditId?'SALVAR ALTERAÇÕES':'+ CRIAR EVENTO'}</button>
    ${evEditId?'<button class="btn small ghost" onclick="evEditId=null;gmRenderEvents()">CANCELAR</button>':''}`;
}
function gmSaveEvent(){
  const v=id=>document.getElementById(id).value;
  const title=v('ev-title').trim(); if(!title){ alert('Dê um título ao evento.'); return; }
  const data={title,trigger:v('ev-trigger').trim(),text:v('ev-text'),track:v('ev-track')};
  if(evEditId){ Object.assign(state.events.find(e=>e.id===evEditId),data); }
  else state.events.push({id:'ev'+Date.now(),...data});
  evEditId=null; gmRenderEvents();
}
function evEdit(id){ evEditId=id; gmRenderEvents(); }
function evDelete(id){ if(!confirm('Excluir este evento?')) return; state.events=state.events.filter(e=>e.id!==id); if(evEditId===id) evEditId=null; gmRenderEvents(); }
function fireEvent(id){
  const e=state.events.find(x=>x.id===id); if(!e) return;
  document.getElementById('event-title').textContent=e.title;
  document.getElementById('event-text').innerHTML=escHtml(e.text).replace(/\n/g,'<br>');
  document.getElementById('ov-event').classList.add('active');
  addLog('EVENTO disparado: '+e.title+'.');
  if(e.track) musicPlay(e.track);
}
function gmRenderSession(){
  document.getElementById('gm-pane').innerHTML=`<h4>SESSÕES</h4>
    <div class="form-row"><label>CAPÍTULO ATUAL</label><input id="sess-chap" value="${state.chapter}"></div>
    <div class="form-row"><label>LOCALIZAÇÃO ATUAL</label><input id="sess-loc" value="${state.location}"></div>
    <button class="btn small" onclick="state.chapter=document.getElementById('sess-chap').value; state.location=document.getElementById('sess-loc').value; renderAll();">SALVAR</button>
    <h4 style="margin-top:18px">AÇÕES PERSONALIZADAS DOS TURNOS</h4>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:6px">Além das ações padrão (investigar, charme, dash…), crie as suas. Elas aparecem na lista de ações do turno.</div>
    <div class="track-box">${(state.customActions||[]).map((a,i)=>`<div class="track-row"><div class="tn"><b>${escHtml(a.name)}</b><span style="color:var(--gray)">${escHtml(a.cat)} · ${a.slots.map(k=>TURN_SLOTS.find(t=>t.key===k).label).join(', ')}</span></div><button class="btn small ghost" onclick="gmDelAction(${i})">✕</button></div>`).join('')||'<div style="padding:10px;font-size:.65rem;color:var(--gray)">Nenhuma ação personalizada.</div>'}</div>
    <div class="form-2col">
      <div class="form-row"><label>NOME</label><input id="act-name" placeholder="ex.: HACKEAR"></div>
      <div class="form-row"><label>CATEGORIA</label><select id="act-cat">${Object.keys(ACTION_CAT_COLORS).map(c=>`<option>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>PODE SER USADA EM</label><select id="act-slot"><option value="action">AÇÃO</option><option value="bonus">AÇÃO BÔNUS</option><option value="move">MOVIMENTAÇÃO</option><option value="all">QUALQUER SLOT</option></select></div>
    <button class="btn small" onclick="gmAddAction()">+ ADICIONAR AÇÃO</button>
    <h4 style="margin-top:18px">RELATÓRIO DA PARTIDA</h4>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:6px">Resumo + participantes + histórico de combate por rodada. Abre em nova aba (imprimir/PDF ou baixar).</div>
    <button class="btn small" onclick="gmGenerateReport()">📄 GERAR RELATÓRIO</button>`;
}
function gmAddAction(){
  const name=(document.getElementById('act-name').value||'').trim().toUpperCase(); if(!name) return;
  const v=document.getElementById('act-slot').value;
  state.customActions.push({name,cat:document.getElementById('act-cat').value,slots:v==='all'?['action','bonus','move']:[v]});
  renderTurnSlots(); gmRenderSession();
}
function gmDelAction(i){ state.customActions.splice(i,1); renderTurnSlots(); gmRenderSession(); }

function gmRenderAccounts(){
  const pane=document.getElementById('gm-pane');
  pane.innerHTML=`<h4>CONTAS DE ACESSO</h4>
    <div id="gm-accounts-list" style="margin-bottom:16px"></div>
    <h4>CRIAR CONTA DE JOGADOR</h4>
    <div class="form-2col">
      <div class="form-row"><label>ID</label><input id="acc-id" placeholder="C-0500"></div>
      <div class="form-row"><label>SENHA</label><input id="acc-pass" placeholder="senha"></div>
    </div>
    <div class="form-row"><label>VINCULAR A PERSONAGEM</label>
      <select id="acc-char">${Object.keys(state.characters).map(id=>`<option value="${id}">${state.characters[id].short}</option>`).join('')}</select>
    </div>
    <div class="form-row"><label>NOME DO PLAYER (aparece no "Olá …" e na ficha)</label><input id="acc-player" placeholder="ex.: Lucas"></div>
    <button class="btn small" onclick="gmCreateAccount()">CRIAR CONTA</button>
    <p style="font-size:.62rem;color:var(--gray);margin-top:14px">Apenas contas com papel GAME MASTER têm acesso ao GM CONTROL. Jogadores nunca veem essa aba nem podem trocar de papel — o acesso é decidido só no login.</p>`;
  gmRefreshAccountsList();
}
function gmRefreshAccountsList(){
  const box=document.getElementById('gm-accounts-list'); if(!box) return;
  box.innerHTML=Object.entries(ACCOUNTS).map(([id,a])=>{
    const character=a.role==='gm'?'GAME MASTER':(state.characters[a.character]?state.characters[a.character].short:'SEM PERSONAGEM');
    return `<div class="gm-char-row"><span class="name">${id}</span><span>${character}</span>${a.role!=='gm'?`<button class="btn small ghost" onclick="gmDeleteAccount('${id}')">REMOVER</button>`:''}</div>`;
  }).join('');
}
function gmCreateAccount(){
  const id=(document.getElementById('acc-id').value||'').trim().toUpperCase();
  const pass=document.getElementById('acc-pass').value.trim();
  const ch=document.getElementById('acc-char').value;

  if(!id||!pass){
    alert('Preencha o ID e a senha.');
    return;
  }

  if(!ch || !state.characters[ch]){
    alert('Crie um personagem antes de criar uma conta de jogador.');
    return;
  }

  if(ACCOUNTS[id]){
    alert('Esse ID já está em uso.');
    return;
  }

  const pnAcc=(document.getElementById('acc-player').value||'').trim(); if(pnAcc) state.characters[ch].playerName=pnAcc;
  ACCOUNTS[id]={password:pass, role:'player', character:ch};
  addLog(`GM criou uma conta de acesso para ${state.characters[ch].short} (${id}).`);
  gmRefreshAccountsList();
}
function gmDeleteAccount(id){delete ACCOUNTS[id]; gmRefreshAccountsList();}

function gmLoadCharEditor(id){
  const box=document.getElementById('gm-char-editor');
  if(!id){box.innerHTML='';return;}
  const c=state.characters[id];
  const permSel=(field,val)=>`<select id="perm-${field}-${id}"><option value="OWNER" ${val==='OWNER'?'selected':''}>APENAS O PLAYER</option><option value="GM" ${val==='GM'?'selected':''}>APENAS O MESTRE</option><option value="PUBLIC" ${val==='PUBLIC'?'selected':''}>TODOS OS PLAYERS</option></select>`;
  box.innerHTML=`
    <div class="form-row"><label>FOTO DO PERSONAGEM</label>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:48px;height:48px;border:1px solid var(--line);background:var(--panel2);display:flex;align-items:center;justify-content:center;overflow:hidden" id="ed-avatar-preview">${c.avatar?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover">`:(c.short||'?')[0]}</div>
        <input type="file" accept="image/*" id="ed-avatar-file" onchange="gmUploadAvatar('${id}',event)">
      </div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>NOME</label><input id="ed-name" value="${c.name}"></div>
      <div class="form-row"><label>NOME DO PLAYER</label><input id="ed-player" value="${escHtml(c.playerName||'')}"></div>
      <div class="form-row"><label>NÍVEL DE ACESSO (cartão)</label><input id="ed-clearance" value="${escHtml(c.clearance||'1')}"></div>
      <div class="form-row"><label>ARCANA PRIMÁRIA</label><input id="ed-arcana" value="${c.arcana}"></div>
      <div class="form-row"><label>ARCANA SECUNDÁRIA</label><input id="ed-secarcana" value="${c.secArcana}"></div>
      <div class="form-row"><label>MAX HP</label><input id="ed-maxhp" type="number" value="${c.maxHp}"></div>
      <div class="form-row"><label>MAX SP</label><input id="ed-maxsp" type="number" value="${c.maxSp}"></div>
    </div>
    <div class="form-2col">
      ${['str','mag','end','agi','luk'].map(s=>`<div class="form-row"><label>${s.toUpperCase()}</label><input id="ed-${s}" type="number" value="${c.stats[s]}"></div>`).join('')}
    </div>
    <div class="form-row"><label>DESCRIÇÃO <span class="perm-badge" style="background:var(--panel2);color:var(--gray)">visibilidade abaixo</span></label><textarea id="ed-desc" rows="2">${c.profile.desc}</textarea></div>
    <div class="form-row"><label>PERSONALDIADE</label><textarea id="ed-personality" rows="2">${c.profile.personality}</textarea></div>
    <div class="form-2col"><div class="form-row"><label>MEDOS</label><input id="ed-fears" value="${c.profile.fears}"></div><div class="form-row"><label>GOALS</label><input id="ed-goals" value="${c.profile.goals}"></div></div>
    <div class="form-row"><label>HISTÓRIA</label><textarea id="ed-history" rows="2">${c.profile.history}</textarea></div>
    <div class="form-2col"><div class="form-row"><label>ARMA</label><input id="ed-weapon" value="${c.equipment.weapon}"></div><div class="form-row"><label>ARMADURA</label><input id="ed-armor" value="${c.equipment.armor}"></div></div>
    <div class="form-row"><label>IMAGEM DA ARMA (retângulo vertical)</label>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="weapon-img-mini" id="ed-weaponimg-preview">${c.equipment.weaponImage?`<img src="${c.equipment.weaponImage}">`:'—'}</div>
        <input type="file" accept="image/*" id="ed-weaponimg-file" onchange="gmUploadWeaponImage('${id}',event)">
      </div>
    </div>
    <div class="form-2col"><div class="form-row"><label>ACESSÓRIOS</label><input id="ed-accessory" value="${c.equipment.accessory}"></div><div class="form-row"><label>ITENS</label><input id="ed-items" value="${c.equipment.items}"></div></div>
    <div class="form-row"><label>NOTAS PRIVADAS</label><textarea id="ed-notes" rows="2">${c.notes}</textarea></div>
    ${visPanelHtml(id)}
    <div style="font-size:.6rem;color:var(--gray);margin-top:10px">Vida, SP, status e habilidades agora ficam no QUADRO DE COMBATE.</div>
    <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn" onclick="gmSaveCharEditor('${id}')">SALVAR ALTERAÇÕES</button>
      <button class="btn small ghost" onclick="gmDeleteCharacter('${id}')">EXCLUIR PERSONAGEM</button>
    </div>`;
}
function gmSaveCharEditor(id){
  const c=state.characters[id]; const v=n=>document.getElementById(n).value;

  const oldName=c.name;
  c.name=(v('ed-name')||c.name).trim().toUpperCase();
  c.short=(c.name.split(' ')[0]||'PLAYER').toUpperCase();
  c.playerName=(v('ed-player')||'').trim(); c.clearance=(v('ed-clearance')||'1').trim();

  c.arcana=v('ed-arcana'); c.secArcana=v('ed-secarcana');
  c.maxHp=parseInt(v('ed-maxhp'),10)||c.maxHp; c.hp=Math.min(c.hp,c.maxHp);
  c.maxSp=parseInt(v('ed-maxsp'),10)||c.maxSp; c.sp=Math.min(c.sp,c.maxSp);
  ['str','mag','end','agi','luk'].forEach(s=>c.stats[s]=parseInt(v('ed-'+s),10)||c.stats[s]);
  c.profile.desc=v('ed-desc'); c.profile.personality=v('ed-personality'); c.profile.fears=v('ed-fears'); c.profile.goals=v('ed-goals'); c.profile.history=v('ed-history');
  c.equipment.weapon=v('ed-weapon'); c.equipment.armor=v('ed-armor'); c.equipment.accessory=v('ed-accessory'); c.equipment.items=v('ed-items');
  c.notes=v('ed-notes');
  addLog(`GM atualizou a ficha de ${c.short}.`);
  renderAll();
}
let skillEditIdx=null;
function skillFormHtml(){
  const c=state.characters[state.currentPlayer]; const e=(skillEditIdx!==null&&c&&c.skills[skillEditIdx])||{};
  const v=x=>escHtml(e[x]===undefined||e[x]===null?'':String(e[x]));
  return `<div class="sk-form"><h4>${skillEditIdx!==null?'EDITAR HABILIDADE':'+ NOVA HABILIDADE'}</h4>
    <div class="form-2col">
      <div><label>NOME</label><input id="ps-name" value="${v('name')}"></div>
      <div><label>TIPO</label><select id="ps-type">${SKILL_TYPES.map(t=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div><label>ALVO</label><select id="ps-target">${SKILL_TARGETS.map(t=>`<option ${e.target===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div><label>CUSTO (SP)</label><input id="ps-cost" type="number" value="${v('cost')}"></div>
      <div><label>DADO DE TESTE (o que rolar)</label><input id="ps-roll" placeholder="ex.: 1d20 + AGI" value="${v('roll')}"></div>
      <div><label>DADO DE DANO</label><input id="ps-dmg" placeholder="ex.: 2d6 + 2" value="${v('dmg')}"></div>
    </div>
    <label>PODER</label><input id="ps-power" type="number" value="${v('power')}">
    <label>OBSERVAÇÕES / DESCRIÇÃO</label><textarea id="ps-desc" rows="2">${v('desc')}</textarea>
    <div style="margin-top:6px"><button class="btn small" onclick="playerSaveSkill()">${skillEditIdx!==null?'SALVAR':'ADICIONAR'}</button>${skillEditIdx!==null?' <button class="btn small ghost" onclick="skillEditIdx=null;renderSheetBody()">CANCELAR</button>':''}</div></div>`;
}
function playerSaveSkill(){
  const c=state.characters[state.currentPlayer]; if(role!=='player'||!c) return;
  const g=id=>document.getElementById(id).value;
  const name=g('ps-name').trim(); if(!name){ alert('Dê um nome à habilidade.'); return; }
  const sk={name:name.slice(0,60),type:g('ps-type'),target:g('ps-target'),cost:parseInt(g('ps-cost'),10)||0,power:parseInt(g('ps-power'),10)||0,
    roll:g('ps-roll').trim().slice(0,40),dmg:g('ps-dmg').trim().slice(0,40),desc:g('ps-desc').trim().slice(0,400),own:true};
  if(skillEditIdx!==null && c.skills[skillEditIdx] && c.skills[skillEditIdx].own) c.skills[skillEditIdx]=sk; else c.skills.push(sk);
  skillEditIdx=null; renderSheetBody(); renderTurnSlots();
}
function playerEditSkill(k){ const c=state.characters[state.currentPlayer]; if(c&&c.skills[k]&&c.skills[k].own){ skillEditIdx=k; renderSheetBody(); } }
function playerDelSkill(k){ const c=state.characters[state.currentPlayer]; if(!c||!c.skills[k]||!c.skills[k].own||!confirm('Remover esta habilidade?')) return; c.skills.splice(k,1); skillEditIdx=null; renderSheetBody(); renderTurnSlots(); }
function gmDeleteCharacter(id){
  const c=state.characters[id];
  if(!c) return;

  if(!confirm(`Excluir o personagem ${c.short}?`)) return;

  Object.keys(ACCOUNTS).forEach(accId=>{
    if(ACCOUNTS[accId].character===id) delete ACCOUNTS[accId];
  });

  delete state.characters[id];
  state.turnOrder=state.turnOrder.filter(t=>t!==id);

  if(state.currentPlayer===id) state.currentPlayer=null;

  addLog(`GM excluiu o personagem ${c.short}.`);
  renderAll();
  gmRenderChars();
}

function openOverlay(name){
  if(popouts[name] && !popouts[name].win.closed){ popouts[name].win.focus(); return; }
  if(name==='gm'){gmRender();}
  if(name==='board'){boardRender();}
  if(name==='notes'){
    const picker=document.getElementById('note-owner-picker');
    const showPicker= state.noteTab==='my' && role==='gm';
    if(picker) picker.classList.toggle('hidden', !showPicker);
    if(showPicker) populateNotePlayerSelect();
    renderNotes();
  }
  document.getElementById('ov-'+name).classList.add('active');
}

function plainText(h){ try{ return new DOMParser().parseFromString(String(h==null?'':h),'text/html').body.textContent||''; }catch(e){ return String(h); } }
function fmtClock(ts){ return ts? new Date(ts).toLocaleTimeString('pt-BR',{hour12:false}) : ''; }
function buildReportHtml(){
  const E=escHtml, COMBAT=['skill','hp','status','turn','adjust'];
  const acts=state.log.filter(l=>!l.k||l.k==='act');
  const combat=acts.filter(l=>COMBAT.includes(l.cat));
  const other=acts.filter(l=>!COMBAT.includes(l.cat));
  const msgs=state.log.filter(l=>l.k==='scene'||l.k==='contact');
  const st={}; const S=n=>st[n]||(st[n]={dmg:0,heal:0,acts:0,downs:0,skills:{}});
  combat.forEach(l=>{
    if(l.cat==='hp'&&l.target){ const s=S(l.target); if(l.real<0) s.dmg+=-l.real; else s.heal+=l.real; if(l.down) s.downs++; }
    if(l.cat==='skill'&&l.actor){ const s=S(l.actor); s.acts++; s.skills[l.what]=(s.skills[l.what]||0)+1; }
  });
  const TAG={skill:['AÇÃO','#7a0f1a'],hp:['HP','#a35a00'],status:['STATUS','#4a2f7a'],turn:['TURNO','#333'],adjust:['AJUSTE','#555']};
  const rows=[]; let lastRound=null;
  combat.forEach(l=>{
    if(l.round!==lastRound){ lastRound=l.round; rows.push(`<tr class="rd"><td colspan="3">RODADA ${E(l.round||1)}</td></tr>`); }
    const tg=TAG[l.cat]||['—','#555'];
    let tagTxt=tg[0]; if(l.cat==='hp') tagTxt= l.real<0?'DANO':(l.real>0?'CURA':'HP');
    rows.push(`<tr class="${l.cat==='turn'?'turn':''}"><td class="tm">${fmtClock(l.ts)}</td><td><span class="tag" style="background:${tg[1]}">${tagTxt}</span></td><td>${E(plainText(l.t))}</td></tr>`);
  });
  const parts=[];
  const add=(obj,kind)=>Object.keys(obj).forEach(id=>{ const c=obj[id];
    const s=st[c.short]||{dmg:0,heal:0,acts:0,downs:0,skills:{}};
    const label=E(c.name||c.short)+(kind==='PLAYER'&&c.playerName?` <span class="pl">• ${E(c.playerName)}</span>`:'');
    const top=Object.entries(s.skills).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>E(x[0])+' ×'+x[1]).join(', ')||'—';
    parts.push(`<tr><td>${label}</td><td>${kind}</td><td>${c.hp!=null?c.hp+'/'+c.maxHp:'—'}</td><td>${c.sp!=null?c.sp+'/'+c.maxSp:'—'}</td><td>${E((c.status||[]).join(', ')||'—')}</td><td>${s.dmg}</td><td>${s.heal}</td><td>${s.acts}</td><td>${top}</td></tr>`); });
  add(state.characters,'PLAYER'); add(state.enemies,'INIMIGO');
  const maxRound=combat.reduce((m,l)=>Math.max(m,l.round||1),1);
  const first=state.log.length&&state.log[0].ts? state.log[0].ts : state.startedAt;
  const totalDmg=Object.values(st).reduce((a,s)=>a+s.dmg,0), totalHeal=Object.values(st).reduce((a,s)=>a+s.heal,0);
  const now=new Date();
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório — ${E(state.chapter)}</title>
<style>
body{font-family:'Courier New',monospace;background:#e9e2d0;color:#1a1712;margin:0;padding:24px}
.page{max-width:980px;margin:0 auto;background:#f2ecdd;padding:28px 32px;border:1px solid #b9b098;box-shadow:0 4px 18px rgba(0,0,0,.25)}
h1{font-family:Impact,'Arial Narrow',sans-serif;letter-spacing:.04em;margin:0;font-size:2rem;color:#c8202e}
h2{font-size:.9rem;letter-spacing:.14em;border-bottom:2px solid #c8202e;padding-bottom:4px;margin:26px 0 8px}
.sub{color:#5b5648;font-size:.8rem;margin:4px 0 14px}
.kpis{display:flex;gap:10px;flex-wrap:wrap}.kpi{border:1px solid #b9b098;padding:8px 12px;min-width:120px;background:#e9e2d0}
.kpi b{display:block;font-size:1.3rem}.kpi span{font-size:.62rem;letter-spacing:.1em;color:#5b5648}
table{width:100%;border-collapse:collapse;font-size:.74rem}
th,td{border-bottom:1px solid #cfc7b0;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#1a1712;color:#f3f0e8;font-size:.62rem;letter-spacing:.08em}
tr.rd td{background:#c8202e;color:#fff;font-weight:bold;letter-spacing:.14em;font-size:.7rem}
tr.turn td{color:#6a6555;font-style:italic}
.tm{white-space:nowrap;color:#6a6555;width:64px}
.tag{color:#fff;font-size:.58rem;padding:1px 6px;letter-spacing:.06em}
.pl{color:#7a0f1a}.muted{color:#6a6555;font-size:.75rem}
.msg{border-left:3px solid #6fb1ff;padding:3px 8px;margin:4px 0;font-size:.75rem}.msg.contact{border-color:#d9b400}
.noprint{margin-bottom:14px;display:flex;gap:8px}.noprint button{font-family:inherit;padding:6px 12px;background:#1a1712;color:#f3f0e8;border:0;cursor:pointer}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border:0}.noprint{display:none}tr{page-break-inside:avoid}}
</style></head><body><div class="page">
<div class="noprint"><button onclick="window.print()">🖨 IMPRIMIR / SALVAR PDF</button>
<button onclick="var b=new Blob(['<!DOCTYPE html>'+document.documentElement.outerHTML],{type:'text/html'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='relatorio-partida.html';a.click();">⬇ BAIXAR .HTML</button></div>
<h1>DEPARTMENT 0 — RELATÓRIO DA PARTIDA</h1>
<div class="sub">${E(state.chapter)} · ${E(state.location)} · gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR',{hour12:false})}</div>
<div class="kpis">
<div class="kpi"><b>${fmtTimer(timerNow())}</b><span>TEMPO NO TIMER</span></div>
<div class="kpi"><b>${maxRound}</b><span>RODADAS DE COMBATE</span></div>
<div class="kpi"><b>${combat.filter(l=>l.cat==='skill').length}</b><span>AÇÕES / HABILIDADES</span></div>
<div class="kpi"><b>${totalDmg}</b><span>DANO TOTAL</span></div>
<div class="kpi"><b>${totalHeal}</b><span>CURA TOTAL</span></div>
<div class="kpi"><b>${first?fmtClock(first):'—'}</b><span>PRIMEIRO REGISTRO</span></div></div>
<h2>PARTICIPANTES</h2>
<table><tr><th>NOME</th><th>TIPO</th><th>HP</th><th>SP</th><th>STATUS</th><th>DANO SOFRIDO</th><th>CURA</th><th>AÇÕES</th><th>MAIS USADAS</th></tr>${parts.join('')||'<tr><td colspan="9" class="muted">Nenhum participante.</td></tr>'}</table>
<h2>HISTÓRICO DE COMBATE</h2>
${rows.length?`<table><tr><th>HORA</th><th></th><th>EVENTO</th></tr>${rows.join('')}</table>`:'<div class="muted">Nenhum evento de combate registrado.</div>'}
<h2>OUTROS EVENTOS DA SESSÃO</h2>
${other.length?`<table>${other.map(l=>`<tr><td class="tm">${fmtClock(l.ts)}</td><td>${E(plainText(l.t))}</td></tr>`).join('')}</table>`:'<div class="muted">Nenhum.</div>'}
<h2>MENSAGENS E CENAS DO MESTRE</h2>
${msgs.length?msgs.map(l=>`<div class="msg ${l.k}"><b>${l.k==='scene'?'CENA':'MENSAGEM'}${l.to&&l.to!=='all'?' → '+E(charLabel(l.to)):' → TODOS'}</b> ${l.ts?'· '+fmtClock(l.ts):''}<br>${E(l.t)}</div>`).join(''):'<div class="muted">Nenhuma.</div>'}
</div></body></html>`;
}
function reportDownload(html){
  const b=new Blob([html],{type:'text/html'}), a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download='relatorio-partida.html'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function gmGenerateReport(){
  if(role!=='gm') return;
  const html=buildReportHtml();
  const win=window.open('','report_partida');
  if(!win){ reportDownload(html); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

const popouts={};
function popOut(name){
  const overlayId='ov-'+name;
  const mainCard=document.querySelector('#'+overlayId+' .overlay-card');
  if(!mainCard) return;
  if(popouts[name] && !popouts[name].win.closed){ popouts[name].win.focus(); return; }
  const win=window.open('', 'popout_'+name, 'width=980,height=780');
  if(!win){ alert('O navegador bloqueou o pop-up. Permita pop-ups pra este site e tente de novo.'); return; }
  win.document.open();
  win.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>DEPARTMENT 0 — '+(name==='gm'?'PAINEL DO MESTRE':name==='board'?'QUADRO DE COMBATE':'FICHA')+'</title><base href="'+location.href+'">'+document.head.innerHTML+'</head><body></body></html>');
  win.document.close();
  win.document.body.style.cssText='margin:0;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto;background:var(--bg,#0b0b0d)';
  const root=win.document.createElement('div');
  root.id='popout-root'; root.style.width='100%';
  win.document.body.appendChild(root);
  function sync(){
    root.innerHTML='';
    const clone=mainCard.cloneNode(true);
    clone.style.width='100%'; clone.style.maxWidth='none'; clone.style.maxHeight='none';
    root.appendChild(clone);
  }
  sync();
  const obs=new MutationObserver(sync);
  obs.observe(mainCard,{childList:true,subtree:true,attributes:true,characterData:true});
  function pathOf(node,top){ const p=[]; while(node&&node!==top){ const par=node.parentNode; if(!par) return null; p.unshift(Array.prototype.indexOf.call(par.childNodes,node)); node=par; } return node===top?p:null; }
  function nodeAt(top,p){ let n=top; for(const i of p){ n=n&&n.childNodes[i]; } return n||null; }
  function forward(e){
    const t=e.target; if(!t||!t.closest||!root.firstChild) return;
    const el= e.type==='click' ? t.closest('[onclick]') : t;
    if(!el) return;
    const p=pathOf(el,root.firstChild); const mainEl=p&&nodeAt(mainCard,p);
    if(!mainEl) return;
    if(el.tagName==='INPUT' && el.type==='file'){
      if(e.type!=='change' || !el.files || !el.files.length) return;
      try{
        const dt=new DataTransfer();
        for(const f of el.files) dt.items.add(f);
        mainEl.files=dt.files;
        mainEl.dispatchEvent(new Event('change',{bubbles:true}));
      }catch(err){}
      return;
    }
    if(e.type==='click'){ e.preventDefault(); e.stopPropagation(); mainEl.click(); return; }
    if(el.type==='checkbox'||el.type==='radio') mainEl.checked=el.checked;
    else if('value' in el) mainEl.value=el.value;
    if(el.hasAttribute('on'+e.type)) mainEl.dispatchEvent(new Event(e.type,{bubbles:true}));
  }
  win.addEventListener('click',forward,true);
  win.addEventListener('change',forward,true);
  win.addEventListener('input',forward,true);
  win.addEventListener('beforeunload',()=>{ obs.disconnect(); delete popouts[name]; });
  popouts[name]={win,obs};
  closeOverlay(name);
  addLog(`${name==='gm'?'Painel do Mestre':name==='board'?'Quadro de Combate':'Ficha'} aberto em outra tela.`);
}
function closeOverlay(name){ document.getElementById('ov-'+name).classList.remove('active'); }
document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov) ov.classList.remove('active');}));

const music={audio:new Audio(),currentId:null,filter:'',volume:.7,localVol:1,editId:null,fadeT:null};
function musicEffVol(){ return Math.max(0,Math.min(1,music.volume*(role==='player'?music.localVol:1))); }
function musicSetLocalVolume(v){ music.localVol=v/100; music.audio.volume=musicEffVol(); }
music.audio.loop=true; music.audio.volume=.7;
music.audio.addEventListener('ended',()=>musicRefreshUI());
music.audio.addEventListener('error',()=>{ if(role==='gm' && music.audio.src) addLog('⚠ Não foi possível tocar a faixa atual.'); });
function musicAllTags(){ return [...new Set(state.tracks.flatMap(t=>t.tags))].sort(); }
function musicParseTags(str){ return [...new Set((str||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean))]; }
// ---------- MÚSICA SINCRONIZADA ----------
// O mestre toca localmente e publica "musicNow" (faixa, play/pause, posição, volume). Os players seguem.
// Arquivos locais (blob) são convertidos em data URL (até 6 MB) para trafegar pelo Firebase; links diretos vão como link.
const MUS_MAX=6*1024*1024;
const SILENT_WAV='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
music.cache={}; music.pubTok=0; music.blocked=false; music._src=''; music._rev='';
// play() devolve Promise nos navegadores atuais; aqui garantimos isso em qualquer um
function audioPlay(a){ try{ const p=a.play(); return (p&&p.then)?p:Promise.resolve(); }catch(e){ return Promise.reject(e); } }
function musicDataFor(t){
  if(!t.blob) return Promise.resolve(t.src);
  if(music.cache[t.id]!==undefined) return Promise.resolve(music.cache[t.id]);
  return fetch(t.src).then(r=>r.blob()).then(bl=>{
    if(bl.size>MUS_MAX){
      music.cache[t.id]='';
      alert('"'+t.name+'" tem '+(bl.size/1048576).toFixed(1)+' MB: grande demais pra enviar aos players.\nUse um arquivo de até 6 MB (MP3 mais comprimido) ou cole um link direto (pode ser um mp3 hospedado no seu repositório).');
      return '';
    }
    return new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>{ music.cache[t.id]=fr.result; res(fr.result); }; fr.readAsDataURL(bl); });
  }).catch(()=>'');
}
function musicPublish(){
  if(role!=='gm') return;
  const cur=state.tracks.find(t=>t.id===music.currentId);
  const base={rev:Date.now()+'-'+Math.random().toString(36).slice(2,5),vol:music.volume,loop:music.audio.loop};
  const tok=++music.pubTok;
  if(!cur){ state.musicNow=Object.assign(base,{src:'',name:'',playing:false,pos:0,at:0}); return; }
  musicDataFor(cur).then(src=>{
    if(tok!==music.pubTok) return;
    state.musicNow=Object.assign(base,{name:cur.name,src:src||'',playing:!music.audio.paused,pos:music.audio.currentTime||0,at:Date.now()+timerOffset});
  });
}
function musicSetBlocked(b){
  music.blocked=b;
  let bt=document.getElementById('music-unlock');
  if(b && !bt){
    bt=document.createElement('button'); bt.id='music-unlock'; bt.className='btn small';
    bt.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9998';
    bt.textContent='♪ ATIVAR SOM'; bt.onclick=()=>musicApply();
    document.body.appendChild(bt);
  }
  if(bt) bt.style.display=b?'':'none';
}
document.addEventListener('pointerdown',()=>{ if(music.blocked) musicApply(); },true);
// chamado dentro de um clique (login) pra liberar o áudio no navegador do player
function musicUnlock(){
  if(role!=='player') return;
  const a=music.audio; a.loop=false; music._src=''; music._rev=''; a.src=SILENT_WAV;
  audioPlay(a).catch(()=>{});
}
function musicApply(){
  if(role!=='player') return;
  const m=state.musicNow, a=music.audio;
  if(!m || !m.src){ if(!a.paused) a.pause(); music._src=''; music._rev=''; musicSetBlocked(false); return; }
  music.volume=(typeof m.vol==='number')?m.vol:.7; a.volume=musicEffVol(); a.loop=!!m.loop;
  if(music._src!==m.src){ music._src=m.src; music._rev=''; a.src=m.src; }
  if(!m.playing){ a.pause(); musicSetBlocked(false); return; }
  if(a.readyState<1){ a.addEventListener('loadedmetadata',musicApply,{once:true}); return; }
  if(music._rev!==m.rev){      // só reposiciona quando o mestre fez algo novo (não a cada ajuste de volume)
    let t=(m.pos||0)+Math.max(0,(Date.now()+timerOffset-m.at)/1000);
    if(isFinite(a.duration) && a.duration>0){ t=a.loop? t%a.duration : Math.min(t,a.duration-.05); }
    try{ a.currentTime=t; }catch(e){}
    music._rev=m.rev;
  }
  audioPlay(a).then(()=>musicSetBlocked(false)).catch(()=>musicSetBlocked(true));
}
function musicPlay(id){
  const t=state.tracks.find(x=>x.id===id); if(!t) return;
  clearInterval(music.fadeT);
  if(role!=='gm') return;
  music.audio.src=t.src; music.audio.volume=musicEffVol(); music.currentId=id;
  audioPlay(music.audio).catch(()=>addLog('⚠ O navegador bloqueou o áudio — clique de novo em ▶.'));
  musicPublish();
  addLog('♪ Tocando: '+t.name); musicRefreshUI();
}
function musicToggle(){
  if(role!=='gm' || !music.currentId) return;
  if(music.audio.paused) audioPlay(music.audio); else music.audio.pause();
  musicPublish(); musicRefreshUI();
}
function musicHalt(){
  clearInterval(music.fadeT); music.audio.pause(); music.audio.currentTime=0; music.audio.volume=musicEffVol(); music.currentId=null;
  music._src=''; music._rev='';
  musicPublish(); musicRefreshUI();
}
function musicStop(){ if(role!=='gm') return; musicHalt(); }
function musicFade(){
  if(role!=='gm' || !music.currentId) return; clearInterval(music.fadeT);
  music.fadeT=setInterval(()=>{
    const v=music.audio.volume-0.05;
    if(v<=0){ musicHalt(); } else { music.audio.volume=v; if(state.musicNow) state.musicNow.vol=v; }
  },100);
}
function musicSetVolume(v){ if(role!=='gm') return; music.volume=v/100; music.audio.volume=musicEffVol(); if(state.musicNow) state.musicNow.vol=music.volume; }
function musicSetLoop(on){ music.audio.loop=!!on; if(role==='gm' && state.musicNow) state.musicNow.loop=!!on; }
function musicSetFilterIdx(i){ music.filter= i<0? '' : (musicAllTags()[i]||''); gmRenderMusic(); }
function musicAdd(){
  const g=id=>document.getElementById(id);
  const file=g('mus-file').files[0], url=(g('mus-url').value||'').trim();
  let name=(g('mus-name').value||'').trim(); const tags=musicParseTags(g('mus-tags').value);
  const editing=music.editId?state.tracks.find(t=>t.id===music.editId):null;
  if(!editing && !file && !url){ alert('Escolha um arquivo de áudio ou cole um link direto.'); return; }
  if(!name) name= file? file.name.replace(/\.[^.]+$/,'') : (editing? editing.name : url.split('/').pop()||'FAIXA');
  let src=null,blob=false;
  if(file){ src=URL.createObjectURL(file); blob=true; } else if(url){ src=url; }
  if(editing){
    editing.name=name; editing.tags=tags;
    if(src){ if(editing.blob) URL.revokeObjectURL(editing.src); editing.src=src; editing.blob=blob; if(music.currentId===editing.id) musicPlay(editing.id); }
    music.editId=null;
  } else state.tracks.push({id:'t'+Date.now()+Math.random().toString(36).slice(2,5),name,tags,src,blob});
  gmRenderMusic();
}
function musicEdit(id){ music.editId=id; gmRenderMusic(); }
function musicCancelEdit(){ music.editId=null; gmRenderMusic(); }
function musicDelete(id){
  const t=state.tracks.find(x=>x.id===id); if(!t||!confirm('Excluir a faixa "'+t.name+'"?')) return;
  if(music.currentId===id) musicHalt();
  if(t.blob) URL.revokeObjectURL(t.src);
  state.tracks=state.tracks.filter(x=>x.id!==id);
  state.events.forEach(e=>{ if(e.track===id) e.track=''; });
  music.editId=null; gmRenderMusic();
}
function musicRefreshUI(){
  const cur=state.tracks.find(t=>t.id===music.currentId);
  const mini=document.getElementById('music-mini');
  if(mini){
    mini.classList.toggle('hidden',!cur||role!=='gm');
    document.getElementById('music-mini-name').textContent=cur?cur.name:'';
    document.getElementById('music-mini-btn').textContent= music.audio.paused?'▶':'⏸';
  }
  if(gmActivePane==='music') gmRenderMusic();
}
function openMusic(){
  gmActivePane='music';
  document.querySelectorAll('.gm-nav button').forEach(b=>b.classList.toggle('active',b.dataset.p==='music'));
  openOverlay('gm');
}
function gmRenderMusic(){
  const cur=state.tracks.find(t=>t.id===music.currentId);
  const tags=musicAllTags();
  if(music.filter && !tags.includes(music.filter)) music.filter='';
  const list=state.tracks.filter(t=>!music.filter||t.tags.includes(music.filter));
  const ed=music.editId?state.tracks.find(t=>t.id===music.editId):null;
  const playing=cur&&!music.audio.paused;
  const rows=list.map(t=>`<div class="track-row ${t.id===music.currentId?'playing':''}">
      <button class="btn small ghost ${t.id===music.currentId&&playing?'on-state':''}" onclick="${t.id===music.currentId?'musicToggle()':`musicPlay('${t.id}')`}">${t.id===music.currentId&&playing?'⏸':'▶'}</button>
      <div class="tn"><b>${escHtml(t.name)}</b>${t.tags.map(x=>`<span class="tag-chip">${escHtml(x)}</span>`).join('')}</div>
      <button class="btn small ghost" onclick="musicEdit('${t.id}')">✎</button>
      <button class="btn small ghost" onclick="musicDelete('${t.id}')">✕</button></div>`).join('') || `<div style="padding:10px;font-size:.65rem;color:var(--gray)">${state.tracks.length?'Nenhuma faixa com essa etiqueta.':'Nenhuma faixa ainda — adicione abaixo.'}</div>`;
  document.getElementById('gm-pane').innerHTML=`<h4>MÚSICA DE FUNDO</h4>
    <div class="mus-now">
      <div style="font-size:.55rem;color:var(--gray);letter-spacing:.1em">${cur?(playing?'TOCANDO AGORA':'PAUSADA'):'NADA TOCANDO'}</div>
      <div class="np">${cur?escHtml(cur.name):'—'}</div>
      <div class="mus-ctrl">
        <button class="btn small" onclick="musicToggle()">${playing?'⏸ PAUSAR':'▶ TOCAR'}</button>
        <button class="btn small ghost" onclick="musicStop()">⏹ PARAR</button>
        <button class="btn small ghost" onclick="musicFade()">FADE OUT</button>
        <span>VOL</span><input type="range" min="0" max="100" value="${Math.round(music.volume*100)}" oninput="musicSetVolume(this.value)">
        <label><input type="checkbox" onchange="musicSetLoop(this.checked)" ${music.audio.loop?'checked':''}> LOOP</label>
      </div>
    </div>
    <div style="margin-bottom:6px">
      <button class="tag-chip ${!music.filter?'on':''}" onclick="musicSetFilterIdx(-1)">TODAS</button>${tags.map((t,i)=>`<button class="tag-chip ${music.filter===t?'on':''}" onclick="musicSetFilterIdx(${i})">${escHtml(t)}</button>`).join('')}
    </div>
    <div class="track-box">${rows}</div>
    <h4>${ed?'EDITAR FAIXA':'ADICIONAR FAIXA'}</h4>
    <div class="form-2col">
      <div class="form-row"><label>NOME</label><input id="mus-name" value="${ed?escHtml(ed.name):''}" placeholder="ex.: Combate — Chefe"></div>
      <div class="form-row"><label>ETIQUETAS (separe por vírgula)</label><input id="mus-tags" value="${ed?escHtml(ed.tags.join(', ')):''}" placeholder="COMBATE, TENSÃO"></div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>${ed?'TROCAR ARQUIVO (opcional)':'ARQUIVO DE ÁUDIO'}</label><input type="file" accept="audio/*" id="mus-file"></div>
      <div class="form-row"><label>OU LINK DIRETO (.mp3/.ogg)</label><input id="mus-url" placeholder="https://..."></div>
    </div>
    <button class="btn small" onclick="musicAdd()">${ed?'SALVAR ALTERAÇÕES':'+ ADICIONAR'}</button>
    ${ed?'<button class="btn small ghost" onclick="musicCancelEdit()">CANCELAR</button>':''}`;
}

const clone=o=>JSON.parse(JSON.stringify(o));
function persistSetups(){
  try{ localStorage.setItem('dept0_setups',JSON.stringify(state.setups)); }
  catch(e){ if(!persistSetups.warned){ persistSetups.warned=true; addLog('⚠ Não deu pra salvar os setups no navegador (espaço cheio ou bloqueado). Use EXPORTAR pra guardar um backup.'); } }
}
function loadSetups(){ try{ const j=localStorage.getItem('dept0_setups'); if(j){ const a=JSON.parse(j); if(Array.isArray(a)) state.setups=a; } }catch(e){} }
function captureSetup(){
  const tokens={};
  [state.characters,state.enemies,state.npcs].forEach(o=>Object.entries(o).forEach(([id,c])=>{ tokens[id]={x:c.x,y:c.y}; }));
  return {bg:state.mapBackground||null,tokens,rooms:clone(state.rooms),size:clone(mapSizeNow()),
    fog:{level:state.fogLevel,cfg:{...clone(state.fogCfg),tool:''}},grid:state.grid,location:state.location,
    images:clone(state.mapImages||[]),
    music:music.currentId||'',musicName:(state.tracks.find(t=>t.id===music.currentId)||{}).name||''};
}
function applyMapBackground(src){
  state.mapBackground=src||null; const img=document.getElementById('map-bg-img');
  if(src){ img.src=src; img.classList.remove('hidden'); } else { img.removeAttribute('src'); img.classList.add('hidden'); }
}
function applySetup(sp){
  applyMapBackground(sp.bg);
  Object.entries(sp.tokens||{}).forEach(([id,pos])=>{ const o=findObj(id); if(o){ o.x=pos.x; o.y=pos.y; } });
  state.rooms=clone(sp.rooms||[]);
  state.mapSize=clone(sp.size||{w:1000,h:563,fit:'cover',grid:40}); applyMapSize();
  if(Array.isArray(sp.images)){ state.mapImages=clone(sp.images); renderMapImages(); }
  state.fogLevel=(sp.fog&&sp.fog.level)||0;
  state.fogCfg={vision:false,radius:14,brush:12,holes:[],...clone((sp.fog&&sp.fog.cfg)||{}),tool:''};
  state.grid=!!sp.grid; document.getElementById('grid-overlay').classList.toggle('on',state.grid); document.getElementById('btn-grid').classList.toggle('on-state',state.grid);
  if(sp.location){ state.location=sp.location; document.getElementById('chap-label').textContent=state.chapter+' · '+sp.location; }
  renderRooms(); renderTokens(); renderFog(); updateFogButtons();
  if(sp.music){
    if(state.tracks.some(t=>t.id===sp.music)) musicPlay(sp.music);
    else addLog('⚠ A música deste setup ("'+(sp.musicName||'?')+'") não está na lista — adicione a faixa de novo e escolha-a no setup.');
  }
}
function gmSetupsHtml(){
  const act=state.setups.find(x=>x.id===state.activeSetup);
  const rows=state.setups.map(sp=>`<div class="track-row ${sp.id===state.activeSetup?'playing':''}" style="flex-wrap:wrap">
      ${sp.bg?`<img class="setup-thumb" src="${sp.bg}">`:'<div class="setup-thumb"></div>'}
      <div class="tn"><b>${escHtml(sp.name)}</b><span style="color:var(--gray)">${(sp.rooms||[]).length} salas · fog ${FOG_LEVELS[(sp.fog&&sp.fog.level)||0].n.toLowerCase()}${sp.location?' · '+escHtml(sp.location):''}</span></div>
      <button class="btn small" onclick="gmLoadSetup('${sp.id}')">CARREGAR</button>
      <button class="btn small ghost" title="salvar o mapa atual dentro deste setup" onclick="gmUpdateSetup('${sp.id}')">💾</button>
      <button class="btn small ghost" onclick="gmRenameSetup('${sp.id}')">✎</button>
      <button class="btn small ghost" onclick="gmDeleteSetup('${sp.id}')">✕</button>
      <div style="width:100%;display:flex;align-items:center;gap:6px;font-size:.58rem;color:var(--gray)">♪ MÚSICA
        <select class="mini-input" style="flex:1;width:auto;text-align:left" onchange="gmSetupMusic('${sp.id}',this.value)"><option value="">— manter a atual —</option>${state.tracks.map(t=>`<option value="${t.id}" ${sp.music===t.id?'selected':''}>${escHtml(t.name)}</option>`).join('')}</select></div>
    </div>`).join('') || '<div style="padding:10px;font-size:.65rem;color:var(--gray)">Nenhum setup salvo ainda.</div>';
  return `<h4>SETUPS DE MAPA</h4>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:6px">Guarda imagem do mapa, posição dos tokens, salas, fog, grid, imagens pop-up, localização e música. ${act?'Ativo: <b style="color:var(--white)">'+escHtml(act.name)+'</b>':'Nenhum setup ativo.'}</div>
    <div class="track-box">${rows}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input id="setup-name" placeholder="nome do novo setup" style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--line);color:var(--white);padding:5px 7px;font-size:.7rem">
      <button class="btn small" onclick="gmSaveSetup()">+ SALVAR ATUAL COMO NOVO</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      ${act?`<button class="btn small" onclick="gmUpdateSetup('${act.id}')">💾 SALVAR ALTERAÇÕES EM "${escHtml(act.name)}"</button>`:''}
      <button class="btn small ghost" onclick="gmBlankSetup()">NOVO EM BRANCO</button>
      <button class="btn small ghost" onclick="gmExportSetups()">EXPORTAR</button>
    </div>
    <div class="form-row" style="margin-top:6px"><label>IMPORTAR SETUPS (.json exportado)</label><input type="file" accept="application/json,.json" onchange="gmImportSetups(event)"></div>`;
}
function gmSaveSetup(){
  const el=document.getElementById('setup-name'); const name=((el&&el.value)||'').trim()||('Setup '+(state.setups.length+1));
  const sp={id:'sp'+Date.now(),name,...captureSetup()};
  state.setups.push(sp); state.activeSetup=sp.id; persistSetups(); addLog('Setup salvo: '+name+'.'); gmRenderMap();
}
function gmUpdateSetup(id){
  const sp=state.setups.find(x=>x.id===id); if(!sp) return;
  const keepMusic=sp.music, keepName=sp.musicName;
  Object.assign(sp,captureSetup());
  if(!music.currentId && keepMusic){ sp.music=keepMusic; sp.musicName=keepName; }
  state.activeSetup=id; persistSetups(); addLog('Setup atualizado: '+sp.name+'.'); gmRenderMap();
}
function gmLoadSetup(id){
  const sp=state.setups.find(x=>x.id===id); if(!sp) return;
  state.activeSetup=id; applySetup(sp); addLog('Setup carregado: '+sp.name+'.'); gmRenderMap();
}
function gmRenameSetup(id){
  const sp=state.setups.find(x=>x.id===id); if(!sp) return;
  const n=prompt('Novo nome do setup:',sp.name); if(n&&n.trim()){ sp.name=n.trim(); persistSetups(); gmRenderMap(); }
}
function gmDeleteSetup(id){
  const sp=state.setups.find(x=>x.id===id); if(!sp||!confirm('Excluir o setup "'+sp.name+'"?')) return;
  state.setups=state.setups.filter(x=>x.id!==id); if(state.activeSetup===id) state.activeSetup=null; persistSetups(); gmRenderMap();
}
function gmSetupMusic(id,v){
  const sp=state.setups.find(x=>x.id===id); if(!sp) return;
  sp.music=v; sp.musicName=(state.tracks.find(t=>t.id===v)||{}).name||''; persistSetups();
}
function gmBlankSetup(){
  if(!confirm('Limpar o mapa atual (imagem, salas, fog)? Os tokens ficam onde estão. Salve antes se quiser guardar.')) return;
  applyMapBackground(null); state.rooms=[]; state.fogLevel=0; state.fogCfg={vision:false,radius:14,brush:12,tool:'',holes:[]}; state.activeSetup=null;
  renderRooms(); renderFog(); updateFogButtons(); gmRenderMap();
}
function gmExportSetups(){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(state.setups)],{type:'application/json'}));
  a.download='setups-department0.json'; document.body.appendChild(a); a.click(); a.remove();
}
function gmImportSetups(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const arr=JSON.parse(r.result); if(!Array.isArray(arr)) throw 0;
      arr.forEach(sp=>{ if(sp&&sp.name) state.setups.push({...sp,id:'sp'+Date.now()+Math.random().toString(36).slice(2,5)}); });
      persistSetups(); addLog('Setups importados: '+arr.length+'.'); gmRenderMap();
    }catch(e){ alert('Arquivo inválido.'); }
  };
  r.readAsText(f);
}

let dismissedSpot=0, dragImg=null;
function renderMapImages(){
  const wrap=document.getElementById('map-wrap'); if(!wrap) return;
  wrap.querySelectorAll('.map-img').forEach(n=>n.remove());
  const gm=role==='gm';
  (state.mapImages||[]).forEach(im=>{
    if(!im.shown && !gm) return;
    const el=document.createElement('div');
    el.className='map-img'+(im.shown?'':' hiddenimg');
    el.dataset.id=im.id;
    el.style.left=im.x+'%'; el.style.top=im.y+'%'; el.style.width=im.w+'%';
    el.innerHTML=`<img src="${escHtml(im.src)}" alt="" draggable="false"><div class="mi-cap">${escHtml(im.title||'')}</div>`
      +(gm?`${im.shown?'':'<span class="mi-badge">OCULTA</span>'}<i class="mi-resize" title="arraste pra redimensionar"></i>`:'');
    el.addEventListener('pointerdown',miPointerDown);
    el.addEventListener('click',e=>{
      const d=el._down; if(d && Math.hypot(e.clientX-d.x,e.clientY-d.y)>5) return;
      openMapImage(im.id);
    });
    wrap.appendChild(el);
  });
  const sp=state.spotlight;
  if(sp && sp.ts!==dismissedSpot){
    const age=Date.now()+timerOffset-(sp.ts||0);
    dismissedSpot=sp.ts;                                   // cada pedido do mestre vale uma vez
    if(age>=-3000 && age<=20000 && (state.mapImages||[]).some(m=>m.id===sp.id)) openMapImage(sp.id);   // pedido antigo (ex.: ao abrir o jogo) é ignorado
  }
}
function openMapImage(id){
  const im=(state.mapImages||[]).find(m=>m.id===id); if(!im) return;
  document.getElementById('mapimg-title').textContent=im.title||'IMAGEM';
  document.getElementById('mapimg-big').src=im.src;
  openOverlay('mapimg');
}
function miPointerDown(e){
  const el=e.currentTarget; el._down={x:e.clientX,y:e.clientY};
  if(role!=='gm') return;
  const im=state.mapImages.find(m=>m.id===el.dataset.id); if(!im) return;
  e.stopPropagation();
  const r=document.getElementById('map-wrap').getBoundingClientRect();
  dragImg={el,im,resize:e.target.classList.contains('mi-resize'),
    ox:(e.clientX-r.left)/r.width*100-im.x, oy:(e.clientY-r.top)/r.height*100-im.y};
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove',miMove); el.addEventListener('pointerup',miUp);
}
function miMove(e){
  if(!dragImg) return;
  const r=document.getElementById('map-wrap').getBoundingClientRect();
  const px=(e.clientX-r.left)/r.width*100, py=(e.clientY-r.top)/r.height*100, im=dragImg.im, el=dragImg.el;
  if(dragImg.resize){ im.w=Math.max(6,Math.min(90,px-im.x)); el.style.width=im.w+'%'; }
  else{ im.x=Math.max(-60,Math.min(150,px-dragImg.ox)); im.y=Math.max(-60,Math.min(150,py-dragImg.oy)); el.style.left=im.x+'%'; el.style.top=im.y+'%'; }
}
function miUp(e){
  if(!dragImg) return;
  dragImg.el.removeEventListener('pointermove',miMove); dragImg.el.removeEventListener('pointerup',miUp);
  dragImg=null;
}
function gmUploadAvatar(id,ev){
  const file=ev.target.files[0]; if(!file||!state.characters[id]) return;
  imgDownscale(file,256,d=>{
    state.characters[id].avatar=d;
    const pv=document.getElementById('ed-avatar-preview');
    if(pv) pv.innerHTML=`<img src="${d}" style="width:100%;height:100%;object-fit:cover">`;
    addLog(`GM atualizou a foto de ${state.characters[id].short}.`);
    renderAll();
  });
}
function gmUploadWeaponImage(id,ev){
  const file=ev.target.files[0]; if(!file||!state.characters[id]) return;
  imgDownscale(file,400,d=>{
    state.characters[id].equipment.weaponImage=d;
    const pv=document.getElementById('ed-weaponimg-preview');
    if(pv) pv.innerHTML=`<img src="${d}">`;
    addLog(`GM atualizou a imagem da arma de ${state.characters[id].short}.`);
    renderAll();
  });
}
function imgDownscale(file,max,cb){
  const r=new FileReader();
  r.onload=()=>{ const im=new Image();
    im.onload=()=>{ const k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement('canvas');
      c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      let out=c.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.85);
      if(out.length>1500000) out=c.toDataURL('image/jpeg',.8); // PNG gigante vira JPEG
      cb(out); };
    im.onerror=()=>alert('Não consegui ler essa imagem.'); im.src=r.result; };
  r.readAsDataURL(file);
}
function gmRenderImages(){
  const rows=(state.mapImages||[]).map(im=>`<div class="track-row" style="flex-wrap:wrap">
      <img class="setup-thumb" src="${escHtml(im.src)}">
      <div class="tn"><b>${escHtml(im.title||'(sem título)')}</b><span style="color:var(--gray)">${im.shown?'visível pros players':'oculta dos players'}</span></div>
      <button class="btn small ghost ${im.shown?'on-state':''}" onclick="gmToggleImage('${im.id}')">${im.shown?'👁 VISÍVEL':'REVELAR'}</button>
      <button class="btn small" title="abre o pop-up grande na tela de todos" onclick="gmSpotlight('${im.id}')">📣 MOSTRAR A TODOS</button>
      <button class="btn small ghost" onclick="gmRenameImage('${im.id}')">✎</button>
      <button class="btn small ghost" onclick="gmDeleteImage('${im.id}')">✕</button>
    </div>`).join('')||'<div style="padding:10px;font-size:.65rem;color:var(--gray)">Nenhuma imagem ainda.</div>';
  document.getElementById('gm-pane').innerHTML=`<h4>IMAGENS DO MAPA (POP-UPS)</h4>
    <div style="font-size:.6rem;color:var(--gray);margin-bottom:6px">Arraste a imagem no mapa pra posicionar (pode ficar fora do mapa, ao redor) e puxe o quadrado vermelho do canto pra redimensionar. Clicar numa imagem abre ela grande. Imagens novas entram <b style="color:var(--yellow)">ocultas</b> — clique em REVELAR quando quiser que os players vejam.</div>
    <div class="track-box">${rows}</div>
    <div class="form-row"><label>ENVIAR ARQUIVO DE IMAGEM</label><input id="mi-file" type="file" accept="image/*"></div>
    <div class="form-row"><label>OU COLAR UM LINK (URL) DA IMAGEM</label><input id="mi-url" placeholder="https://…"></div>
    <div class="form-row"><label>TÍTULO (aparece na legenda e no pop-up)</label><input id="mi-title" placeholder="ex.: FOTO DA VÍTIMA"></div>
    <button class="btn small" onclick="gmAddImage()">+ ADICIONAR AO MAPA</button>`;
}
function gmAddImage(){
  const url=(document.getElementById('mi-url').value||'').trim(), title=(document.getElementById('mi-title').value||'').trim();
  const f=document.getElementById('mi-file').files[0];
  if(!url && !f){ alert('Escolha um arquivo de imagem ou cole um link.'); return; }
  const add=src=>{ const n=state.mapImages.length;
    state.mapImages.push({id:'mi'+Date.now()+Math.random().toString(36).slice(2,5),src,title,x:6+(n%5)*14,y:6+(n%4)*10,w:22,shown:false});
    renderMapImages(); gmRenderImages(); };
  if(url) add(url); else imgDownscale(f,1400,add);
}
function gmToggleImage(id){ const im=state.mapImages.find(m=>m.id===id); if(!im) return; im.shown=!im.shown; renderMapImages(); gmRenderImages(); }
function gmSpotlight(id){
  const ts=Date.now()+timerOffset; state.spotlight={id,ts}; renderMapImages();
  setTimeout(()=>{ if(state.spotlight&&state.spotlight.ts===ts) state.spotlight=null; },30000);   // limpa do servidor: não reaparece depois
}
function gmRenameImage(id){ const im=state.mapImages.find(m=>m.id===id); if(!im) return; const n=prompt('Título da imagem:',im.title||''); if(n!==null){ im.title=n.trim(); renderMapImages(); gmRenderImages(); } }
function gmDeleteImage(id){ const im=state.mapImages.find(m=>m.id===id); if(!im||!confirm('Remover esta imagem do mapa?')) return; state.mapImages=state.mapImages.filter(m=>m.id!==id); if(state.spotlight&&state.spotlight.id===id) state.spotlight=null; renderMapImages(); gmRenderImages(); }

document.querySelectorAll('.sidebar .panel-block h3').forEach(h=>h.addEventListener('click',()=>h.parentElement.classList.toggle('collapsed')));

renderNotes(); renderRooms(); loadSetups(); loadLibrary(); renderFog(); updateFogButtons();

(function initPinch(){
  const vp=document.getElementById('map-viewport'), pts=new Map(); let d0=0,z0=1;
  vp.addEventListener('pointerdown',e=>{ pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){ panning=false; const [a,b]=[...pts.values()]; d0=Math.hypot(a.x-b.x,a.y-b.y)||1; z0=state.zoom; } });
  vp.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){ const [a,b]=[...pts.values()]; state.zoom=clampZoom(z0*Math.hypot(a.x-b.x,a.y-b.y)/d0); viewAuto=false; applyMapTransform(); } });
  const up=e=>pts.delete(e.pointerId);
  vp.addEventListener('pointerup',up); vp.addEventListener('pointercancel',up); vp.addEventListener('pointerleave',up);
})();

const AUTOSAVE_KEY='dept0_autosave';
function campaignDump(){ const c=Object.assign({},state); delete c.setups; return JSON.stringify({v:1,savedAt:Date.now(),state:c}); }
function campaignLoad(txt){
  const o=JSON.parse(txt); if(!o||!o.state) throw 0;
  Object.assign(state,o.state); state.timerRunning=false; state.timerAt=0;
  const img=document.getElementById('map-bg-img');
  if(img){ if(state.mapBackground){ img.src=state.mapBackground; img.classList.remove('hidden'); } else img.classList.add('hidden'); }
  renderAll(); addLog('Campanha restaurada.');
}
function autosaveNow(){ try{ localStorage.setItem(AUTOSAVE_KEY,campaignDump()); const t=document.getElementById('bk-st'); if(t) t.textContent='autosave '+new Date().toLocaleTimeString().slice(0,5); }catch(e){ const t=document.getElementById('bk-st'); if(t) t.textContent='autosave cheio: exporte .json'; } }
function exportCampaign(){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([campaignDump()],{type:'application/json'}));
  a.download='campanha-department0-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
}
function importCampaign(ev){
  const f=ev.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ campaignLoad(r.result); }catch(e){ alert('Arquivo de campanha inválido.'); } ev.target.value=''; };
  r.readAsText(f);
}
function restoreAutosave(){ try{ const j=localStorage.getItem(AUTOSAVE_KEY); if(!j) return alert('Nenhum autosave neste navegador.'); if(confirm('Substituir a campanha atual pelo último autosave?')) campaignLoad(j); }catch(e){ alert('Não consegui restaurar.'); } }



// ---------- menus do topo ----------
document.addEventListener('toggle',e=>{
  const d=e.target; if(!d.classList||!d.classList.contains('top-menu')||!d.open) return;
  document.querySelectorAll('.top-menu[open]').forEach(o=>{ if(o!==d) o.open=false; });
  if(d.id==='mn-chars') renderCharsMenu();
  const pop=d.querySelector('.top-menu-pop'); if(!pop) return;
  pop.style.left='0'; pop.style.right='auto';
  if(pop.getBoundingClientRect().right>innerWidth-6){ pop.style.left='auto'; pop.style.right='0'; }
},true);
document.addEventListener('click',e=>{
  document.querySelectorAll('.top-menu[open]').forEach(d=>{
    if(!d.contains(e.target) || e.target.closest('.top-menu-pop button:not([data-keep])')) d.open=false;
  });
});
document.addEventListener('change',e=>{ if(e.target.matches&&e.target.matches('.top-menu-pop select')){ const d=e.target.closest('.top-menu'); if(d) d.open=false; } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('.top-menu[open]').forEach(d=>d.open=false); });
// PERSONAGENS: players, inimigos e NPCs num lugar só, com HP rápido
function renderCharsMenu(){
  const pop=document.getElementById('menu-personagens'); if(!pop||role!=='gm') return;
  const row=(id,c)=>{
    const hasHp=typeof c.maxHp==='number';
    return `<div class="cm-row${hasHp&&c.hp<=0?' down':''}"><span class="cm-name" title="achar no mapa" onclick="locateToken('${id}')">${escHtml(c.short||c.name||id)}</span>`
      +(hasHp?`<span class="cm-hp"><i style="width:${Math.max(0,100*c.hp/c.maxHp)}%"></i></span><span class="cm-n">${c.hp}/${c.maxHp}</span><button data-keep class="btn small" onclick="applyDelta('${id}',-5)">−5</button><button data-keep class="btn small ghost" onclick="applyDelta('${id}',5)">+5</button>`:'<span class="cm-n"></span>')
      +`<button class="btn small ghost" onclick="openSheet('${id}')">FICHA</button></div>`;
  };
  const sec=(t,obj,p)=>{ const l=Object.entries(obj||{});
    return `<h4>${t} (${l.length}) <a onclick="openGmPane('${p}')">gerenciar…</a></h4>`+(l.length?l.map(([id,c])=>row(id,c)).join(''):'<div class="cm-empty">— ninguém —</div>'); };
  pop.innerHTML=sec('PLAYERS',state.characters,'chars')+sec('INIMIGOS',state.enemies,'enemies')+sec('NPCS',state.npcs,'npcs');
}
function locateToken(id){
  const t=document.querySelector(`.token[data-id="${id}"]`); if(!t) return;
  t.classList.remove('locate'); void t.offsetWidth; t.classList.add('locate');
  clearTimeout(t._loc); t._loc=setTimeout(()=>t.classList.remove('locate'),2500);
}
const _rpOrig=renderParticipants;
renderParticipants=function(){ const r=_rpOrig.apply(this,arguments); try{ renderCharsMenu(); }catch(e){} return r; };

function openGmPane(p){
  if(role!=='gm') return;
  openOverlay('gm');
  gmActivePane=p;
  gmRender();
  document.querySelectorAll('.gm-nav button').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
}
function resetMatchHistory(){
  if(role!=='gm') return;
  if(!confirm('Limpar o histórico desta partida?\n\nApaga: ações, cenas, contatos e sussurros. Rodada, turno e timer voltam ao início.\nMantém: players, personagens, NPCs, inimigos, mapa, notas e contas.')) return;
  state.log=[]; state.round=1; state.turn=0; resetTurnSlots();
  state.timerSec=0; state.timerRunning=false; state.timerAt=0;
  renderLog(); renderTurns(); renderTimer();
  addLog('Nova partida — histórico limpo pelo mestre.');
}
function setSceneEffect(effect){
  if(role!=='gm') return;
  state.sceneEffect=effect||'none';
  renderSceneEffect();
}
function renderSceneEffect(){
  const layer=document.getElementById('scene-effect-layer');
  if(!layer) return;
  const effect=state.sceneEffect||'none';
  layer.className='effect-'+effect;
  layer.innerHTML=effect==='none'?'':effect==='rain'
    ? '<div class="rain-streaks"></div>'
    : effect==='glitch' ? '<div class="glitch-scan"></div>'
    : effect==='red' ? '<div class="red-alert-vignette"></div>'
    : effect==='dark' ? '<div class="dark-vignette"></div>' : '';
  const select=document.getElementById('scene-effect');
  if(select && select.value!==effect) select.value=effect;
}
// ---- quem está online (presença no Firebase, dentro da própria campanha) ----
let presRef=null, presMine=null, presConn=null, presCb=null, presConnCb=null, presTimer=null;
function paintPresence(people){
  const count=document.getElementById('online-count'), list=document.getElementById('online-list'); if(!count) return;
  const arr=Object.values(people||{}).filter(v=>v&&v.label);
  count.textContent=arr.length+' online';
  if(list) list.innerHTML=arr.map(v=>`<div>${escHtml(v.label)}</div>`).join('')||'<div>Ninguém conectado</div>';
}
function startPresence(){
  if(!window.firebase||!firebase.apps||!firebase.apps.length||typeof SALA==='undefined') return false;
  try{
    const db=firebase.database();
    const tab=window.__d0Tab||(window.__d0Tab=Math.random().toString(36).slice(2,7));
    presRef=db.ref('campanhas/'+SALA+'/presence');
    presMine=presRef.child(String(currentLoginId||'x').replace(/[^\w-]/g,'_')+'-'+tab);
    const c=state.characters[state.currentPlayer];
    const label=role==='gm'?'MESTRE':((c&&c.short)||currentLoginId||'PLAYER');
    presConn=db.ref('.info/connected');
    // a cada (re)conexão registra de novo — o onDisconnect do servidor apaga a entrada antiga
    presConnCb=snap=>{ if(snap.val()){ presMine.onDisconnect().remove(); presMine.set({label,role:role||'?',ts:firebase.database.ServerValue.TIMESTAMP}); } };
    presConn.on('value',presConnCb);
    presCb=snap=>paintPresence(snap.val());
    presRef.on('value',presCb);
    return true;
  }catch(e){ return false; }
}
function stopOnlinePresence(){
  clearInterval(presTimer);
  try{
    if(presConn&&presConnCb) presConn.off('value',presConnCb);
    if(presRef&&presCb) presRef.off('value',presCb);
    if(presMine) presMine.remove();
  }catch(e){}
  presRef=presMine=presConn=presCb=presConnCb=null;
  paintPresence({});
}
function initOnlinePresence(){
  stopOnlinePresence();
  let tries=0;
  presTimer=setInterval(()=>{ tries++; if(startPresence()||tries>20) clearInterval(presTimer); },500);
}
document.addEventListener('DOMContentLoaded',()=>{
  renderSceneEffect();
});



(function initBackupBar(){
  const b=document.createElement('div'); b.id='backup-bar';
  b.innerHTML='<span id="bk-st">backup</span><button class="btn tiny ghost" onclick="exportCampaign()">SALVAR .JSON</button><button class="btn tiny ghost" onclick="document.getElementById(\'bk-imp\').click()">CARREGAR</button><button class="btn tiny ghost" onclick="restoreAutosave()">AUTOSAVE</button><input id="bk-imp" type="file" accept=".json,application/json" style="display:none" onchange="importCampaign(event)">';
  (document.querySelector('.topbar')||document.body).appendChild(b);
  setInterval(()=>{ const gm=(typeof role!=='undefined'&&role==='gm'); b.style.display=gm?'flex':'none'; if(gm) autosaveNow(); },20000);
  setInterval(()=>{ b.style.display=(typeof role!=='undefined'&&role==='gm')?'flex':'none'; },1500);
})();

function whisperUpdate(){
  const w=document.getElementById('whisper-composer'); if(!w) return;
  const on=role==='player'&&!!state.currentPlayer; w.classList.toggle('on',on); if(!on) return;
  const sel=document.getElementById('wh-to'), ids=Object.keys(state.characters).filter(i=>i!==state.currentPlayer);
  const sig=ids.map(id=>id+':'+charLabel(id)).join('|');
  if(sel.dataset.sig!==sig){ const cur=sel.value;
    sel.innerHTML='<option value="gm">🎲 MESTRE</option>'+ids.map(id=>`<option value="${escHtml(id)}">${escHtml(charLabel(id))}</option>`).join('');
    sel.value=(cur==='gm'||ids.includes(cur))?cur:'gm'; sel.dataset.sig=sig; }
}
function sendWhisper(){
  if(role!=='player'||!state.currentPlayer) return;
  const to=document.getElementById('wh-to').value, inp=document.getElementById('wh-text'), t=inp.value.trim();
  if(!to||!t) return;
  pushMsg({k:'whisper',from:state.currentPlayer,to,t,ts:Date.now()}); inp.value=''; inp.focus();
}

let drawTool=null, drawColor='#f2d13b', drawing=null;
function renderDraw(){
  const svg=document.getElementById('draw-layer'); if(!svg) return;
  const c=Math.max(.3,1/(state.zoom||1));
  svg.innerHTML=(state.drawings||[]).map(d=>{
    const st=`stroke="${d.c}" stroke-width="${.5}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    if(d.t==='free') return `<polyline ${st} points="${d.p.map(p=>p.join(',')).join(' ')}"/>`;
    const [a,b]=d.p, ang=Math.atan2(b[1]-a[1],b[0]-a[0]), h=2.2, x1=b[0]-h*Math.cos(ang-.45), y1=b[1]-h*Math.sin(ang-.45), x2=b[0]-h*Math.cos(ang+.45), y2=b[1]-h*Math.sin(ang+.45);
    return `<g ${st}><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><polyline points="${x1},${y1} ${b[0]},${b[1]} ${x2},${y2}"/></g>`;
  }).join('');
}
function drawPt(e){ const r=document.getElementById('draw-layer').getBoundingClientRect(); return [+((e.clientX-r.left)/r.width*160).toFixed(2),+((e.clientY-r.top)/r.height*90).toFixed(2)]; }
function setDrawTool(t){ drawTool=(drawTool===t)?null:t;
  document.getElementById('map-viewport').classList.toggle('draw-mode',!!drawTool);
  document.querySelectorAll('#draw-bar [data-tool]').forEach(b=>b.classList.toggle('on-state',b.dataset.tool===drawTool)); }
function drawUndo(){ (state.drawings||[]).pop(); renderDraw(); }
function drawClear(){ if(confirm('Apagar todos os desenhos do mapa?')){ state.drawings=[]; renderDraw(); } }
(function initDraw(){
  state.drawings=state.drawings||[];
  const vp=document.getElementById('map-viewport');
  vp.addEventListener('pointerdown',e=>{
    if(!drawTool||role!=='gm'||e.button>0) return;
    panning=false; const p=drawPt(e);
    drawing={t:drawTool==='arrow'?'arrow':'free',c:drawColor,p:drawTool==='arrow'?[p,p]:[p]};
    (state.drawings=state.drawings||[]).push(drawing); vp.setPointerCapture&&vp.setPointerCapture(e.pointerId); renderDraw();
  });
  vp.addEventListener('pointermove',e=>{
    if(!drawing) return; panning=false; const p=drawPt(e);
    if(drawing.t==='arrow') drawing.p[1]=p; else drawing.p.push(p); renderDraw();
  });
  const end=()=>{ drawing=null; };
  vp.addEventListener('pointerup',end); vp.addEventListener('pointercancel',end);
  const bar=document.createElement('div'); bar.id='draw-bar';
  bar.innerHTML='<button class="btn tiny ghost" data-tool="free" onclick="setDrawTool(\'free\')" title="desenho livre">✎ LIVRE</button><button class="btn tiny ghost" data-tool="arrow" onclick="setDrawTool(\'arrow\')" title="seta">➜ SETA</button><input type="color" value="#f2d13b" title="cor" oninput="drawColor=this.value" style="width:22px;height:20px;padding:0;border:0;background:none"><button class="btn tiny ghost" onclick="drawUndo()" title="desfazer">↶</button><button class="btn tiny ghost" onclick="drawClear()" title="limpar tudo">🗑</button>';
  (document.querySelector('.topbar')||document.body).appendChild(bar);
  setInterval(()=>{ const gm=role==='gm'; bar.style.display=gm?'flex':'none'; if(!gm&&drawTool) setDrawTool(drawTool); },1500);
  const _ra=renderAll; renderAll=function(){ const r=_ra.apply(this,arguments); try{renderDraw();}catch(e){} return r; };
})();

var undoStack=[], redoStack=[], undoHead=null, undoBusy=false, undoLastEvt=0, undoTimer=null;
function undoSnap(){
  const pos={};
  [state.characters,state.enemies,state.npcs].forEach(o=>Object.entries(o).forEach(([id,c])=>{ pos[id]=[c.x,c.y]; }));
  return {
    rooms:JSON.stringify(state.rooms), size:JSON.stringify(state.mapSize||null), bg:state.mapBackground||null,
    grid:!!state.grid, fogLevel:state.fogLevel, fog:JSON.stringify(Object.assign({},state.fogCfg,{tool:''})),
    images:(state.mapImages||[]).map(i=>Object.assign({},i)), draw:JSON.stringify(state.drawings||[]),
    pos:JSON.stringify(pos), loc:state.location, fx:state.sceneEffect||'none'
  };
}
function undoSame(a,b){
  if(a.bg!==b.bg || a.images.length!==b.images.length) return false;
  const imgOk=a.images.every((x,i)=>{ const y=b.images[i], k=Object.keys(x); return k.length===Object.keys(y).length && k.every(n=>x[n]===y[n]); });
  return imgOk && ['rooms','size','grid','fogLevel','fog','draw','pos','loc','fx'].every(k=>a[k]===b[k]);
}
function undoButtons(){
  const u=document.getElementById('btn-undo'), r=document.getElementById('btn-redo');
  if(u) u.disabled=!undoStack.length;
  if(r) r.disabled=!redoStack.length;
}
function undoCheck(){
  if(role!=='gm'||undoBusy) return;
  const s=undoSnap();
  if(!undoHead){ undoHead=s; return; }
  if(undoSame(s,undoHead)) return;
  undoStack.push(undoHead);
  if(undoStack.length>60) undoStack.shift();
  undoHead=s; redoStack=[];
  undoButtons();
}
function undoApply(s){
  undoBusy=true;
  state.rooms=JSON.parse(s.rooms);
  state.mapSize=JSON.parse(s.size)||{w:1000,h:563,fit:'cover',grid:40};
  applyMapBackground(s.bg);
  state.grid=s.grid;
  document.getElementById('grid-overlay').classList.toggle('on',state.grid);
  document.getElementById('btn-grid').classList.toggle('on-state',state.grid);
  state.fogLevel=s.fogLevel;
  state.fogCfg=Object.assign(JSON.parse(s.fog),{tool:state.fogCfg.tool||''});
  state.mapImages=s.images.map(i=>Object.assign({},i));
  state.drawings=JSON.parse(s.draw);
  const pos=JSON.parse(s.pos);
  Object.keys(pos).forEach(id=>{ const o=findObj(id); if(o&&typeof pos[id][0]==='number'){ o.x=pos[id][0]; o.y=pos[id][1]; } });
  if(state.location!==s.loc){ state.location=s.loc; document.getElementById('chap-label').textContent=state.chapter+' · '+s.loc; }
  state.sceneEffect=s.fx;
  const se=document.getElementById('scene-effect'); if(se) se.value=s.fx;
  renderSceneEffect(); renderRooms(); renderTokens(); renderFog(); updateFogButtons();
  applyMapSize(); renderMapImages(); renderDraw(); refreshRoomUI();
  undoBusy=false;
  undoHead=undoSnap();
  undoButtons();
}
function undoAction(){
  if(role!=='gm') return;
  undoCheck();
  if(!undoStack.length) return;
  redoStack.push(undoHead||undoSnap());
  undoApply(undoStack.pop());
}
function redoAction(){
  if(role!=='gm'||!redoStack.length) return;
  undoCheck();
  if(!redoStack.length) return;
  undoStack.push(undoHead||undoSnap());
  undoApply(redoStack.pop());
}
(function initUndo(){
  const touch=()=>{ undoLastEvt=Date.now(); };
  const after=()=>{ touch(); clearTimeout(undoTimer); undoTimer=setTimeout(undoCheck,80); };
  ['pointerdown','pointermove'].forEach(t=>document.addEventListener(t,touch,true));
  ['pointerup','change','click','keyup'].forEach(t=>document.addEventListener(t,after,true));
  setInterval(()=>{
    if(role!=='gm'){ undoHead=null; return; }
    if(Date.now()-undoLastEvt>1500 && !undoBusy) undoHead=undoSnap();
  },1000);
  document.addEventListener('keydown',e=>{
    if(role!=='gm'||!(e.ctrlKey||e.metaKey)) return;
    if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')) return;
    const k=e.key.toLowerCase();
    if(k==='z'&&!e.shiftKey){ e.preventDefault(); undoAction(); }
    else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); redoAction(); }
  });
  undoButtons();
})();

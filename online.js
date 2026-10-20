(function(){
  if(typeof firebase==='undefined' || typeof FIREBASE_CONFIG==='undefined') return;
  if(!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('COLE')===0) return;
  if(!FIREBASE_CONFIG.databaseURL || FIREBASE_CONFIG.databaseURL.indexOf('COLE')===0){
    console.log('online.js: falta o databaseURL no firebase-config.js');
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();
  const raiz = 'campanhas/' + SALA;
  const ref = db.ref(raiz + '/d');
  const imgRef = db.ref(raiz + '/img');

  const WHOLE = ['chapter','location','turnOrder','turn','round','grid','fogLevel','rooms','mapBackground','locations','events','customActions','mapImages','spotlight'];
  const MAX_LOG = 200;
  const contasDoCodigo = {};
  Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role === 'gm') contasDoCodigo[k] = ACCOUNTS[k]; });

  const last = {}, memo = new Map(), subidas = new Set(), cacheImg = {};
  let novas = {};
  let pronto = false, conectado = false, enviadoEm = '-', recebidoEm = '-', erro = '';
  let sujo = {};

  const enc = s => encodeURIComponent(s).replace(/\./g, '%2E');
  const K = (...p) => p.map(enc).join('|');
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const hora = () => new Date().toTimeString().slice(0, 8);

  function imgId(s){
    let id = memo.get(s);
    if(id) return id;
    let a = 2166136261, b = 5381;
    for(let i = 0; i < s.length; i++){
      const c = s.charCodeAt(i);
      a ^= c; a = Math.imul(a, 16777619);
      b = (Math.imul(b, 33) ^ c) >>> 0;
    }
    id = (a >>> 0).toString(36) + (b >>> 0).toString(36) + s.length.toString(36);
    memo.set(s, id);
    return id;
  }

  const rep = (k, v) => {
    if(typeof v === 'string' && v.length > 3000 && v.indexOf('data:') === 0){
      const id = imgId(v);
      if(!subidas.has(id)) novas[id] = v;
      return '@img:' + id;
    }
    return v;
  };
  const js = v => JSON.stringify(v, rep);

  function ler(val){
    const falta = [];
    const v = JSON.parse(val, (k, x) => {
      if(typeof x === 'string' && x.indexOf('@img:') === 0){
        const id = x.slice(5);
        if(id in cacheImg) return cacheImg[id];
        falta.push(id);
        return '';
      }
      return x;
    });
    return { v, falta };
  }

  function buscar(id, tent){
    return imgRef.child(id).once('value').then(s => {
      const d = s.val();
      if(d){ cacheImg[id] = d; subidas.add(id); memo.set(d, id); return; }
      if(tent < 6) return new Promise(r => setTimeout(r, 1500)).then(() => buscar(id, tent + 1));
    });
  }

  function juntar(){
    novas = {};
    const m = {};
    WHOLE.forEach(k => { if(state[k] !== undefined) m[K('w', k)] = js(state[k]); });
    const fc = Object.assign({}, state.fogCfg); delete fc.tool;
    m[K('w', 'fogCfg')] = js(fc);
    if(typeof turnSlotState !== 'undefined') m[K('w', 'turnSlots')] = js(turnSlotState);
    ['characters','enemies','npcs'].forEach(g => {
      Object.keys(state[g]).forEach(id => {
        const o = state[g][id];
        Object.keys(o).forEach(f => { if(o[f] !== undefined) m[K('f', g, id, f)] = js(o[f]); });
      });
    });
    const N = state.notes;
    N.shared.forEach(n => { if(!n.id) n.id = novoId(); m[K('s', n.id)] = js(n); });
    (N.links || []).forEach(l => { m[K('l', l.id)] = js(l); });
    Object.keys(N.private).forEach(o => N.private[o].forEach(n => { if(!n.id) n.id = novoId(); m[K('p', o, n.id)] = js(n); }));
    Object.keys(N.privateLinks || {}).forEach(o => N.privateLinks[o].forEach(l => { m[K('q', o, l.id)] = js(l); }));
    state.log.slice(-MAX_LOG).forEach(e => { if(!e.id) e.id = novoId(); m[K('g', e.id)] = js(e); });
    const contas = {};
    Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role !== 'gm') contas[k] = ACCOUNTS[k]; });
    m[K('a')] = js(contas);
    return m;
  }

  function lista(a, id, v){
    const i = a.findIndex(x => x.id === id);
    if(v === undefined){ if(i >= 0) a.splice(i, 1); return false; }
    if(i < 0){ a.push(v); return true; }
    const o = a[i];
    Object.keys(o).forEach(k => { if(!(k in v)) delete o[k]; });
    Object.assign(o, v);
    return false;
  }

  const AREA = { chapter:'chap', location:'chap', turnOrder:'turno', turn:'turno', round:'turno', turnSlots:'turno',
    grid:'grid', fogLevel:'fog', fogCfg:'fog', rooms:'salas', mapBackground:'mapa', mapImages:'imgs', spotlight:'imgs' };

  function aplicar(k, v){
    const p = k.split('|').map(decodeURIComponent), N = state.notes;
    switch(p[0]){
      case 'w':
        if(v === undefined) return;
        if(p[1] === 'fogCfg') state.fogCfg = Object.assign({}, v, { tool: (state.fogCfg && state.fogCfg.tool) || '' });
        else if(p[1] === 'turnSlots') turnSlotState = v;
        else state[p[1]] = v;
        if(AREA[p[1]]) sujo[AREA[p[1]]] = true;
        break;
      case 'f': {
        const g = state[p[1]];
        if(v === undefined){
          if(g[p[2]]){ delete g[p[2]][p[3]]; if(!Object.keys(g[p[2]]).length) delete g[p[2]]; }
        } else {
          if(!g[p[2]]) g[p[2]] = {};
          g[p[2]][p[3]] = v;
        }
        sujo.chars = true;
        break; }
      case 's': lista(N.shared, p[1], v); sujo.notas = true; break;
      case 'l': if(!N.links) N.links = []; lista(N.links, p[1], v); sujo.notas = true; break;
      case 'p': if(!N.private[p[1]]) N.private[p[1]] = []; lista(N.private[p[1]], p[2], v); sujo.notas = true; break;
      case 'q':
        if(!N.privateLinks) N.privateLinks = {};
        if(!N.privateLinks[p[1]]) N.privateLinks[p[1]] = [];
        lista(N.privateLinks[p[1]], p[2], v); sujo.notas = true; break;
      case 'g': {
        const nova = lista(state.log, p[1], v);
        state.log.sort((x, y) => (x.ts || 0) - (y.ts || 0));
        sujo.log = true;
        if(nova && pronto && v.k !== 'act' && typeof msgVisible === 'function' && role === 'player' && v.from !== state.currentPlayer && msgVisible(v)) sujo.avisar = true;
        break; }
      case 'a':
        if(v === undefined) return;
        Object.keys(ACCOUNTS).forEach(c => delete ACCOUNTS[c]);
        Object.assign(ACCOUNTS, v, contasDoCodigo);
        break;
    }
  }

  function processar(k, val){
    if(val == null){ aplicar(k, undefined); return; }
    const r = ler(val);
    aplicar(k, r.v);
    if(r.falta.length){
      Promise.all(r.falta.map(id => buscar(id, 0))).then(() => {
        if(last[k] === val){ aplicar(k, ler(val).v); desenharLogo(); }
      });
    }
  }

  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;font:10px monospace;padding:2px 6px;background:#000;border:1px solid #444';
  document.body.appendChild(badge);
  function status(){
    if(erro){ badge.textContent = erro; badge.style.color = '#e01010'; return; }
    if(!conectado){ badge.textContent = 'sem conexão com o Firebase...'; badge.style.color = '#e0a020'; return; }
    badge.textContent = 'ONLINE · sala ' + SALA + ' · enviou ' + enviadoEm + ' · recebeu ' + recebidoEm;
    badge.style.color = '#3fdc7a';
  }
  badge.textContent = 'conectando...'; badge.style.color = '#aaa';

  db.ref('.info/connected').on('value', s => { conectado = !!s.val(); status(); });

  function erroFirebase(e){
    erro = 'erro Firebase: ' + (e.code || e.message || e) + ' (veja as Regras do banco)';
    status();
  }

  function enviar(){
    if(!pronto) return;
    const agora = juntar(), up = {};
    Object.keys(agora).forEach(k => { if(last[k] !== agora[k]){ up[k] = agora[k]; last[k] = agora[k]; } });
    Object.keys(last).forEach(k => { if(!(k in agora)){ up[k] = null; delete last[k]; } });
    if(!Object.keys(up).length) return;
    const subs = Object.keys(novas).filter(id => !subidas.has(id)).map(id => {
      subidas.add(id);
      return imgRef.child(id).set(novas[id]).catch(e => { subidas.delete(id); throw e; });
    });
    Promise.all(subs).then(() => ref.update(up)).then(() => {
      enviadoEm = hora(); erro = ''; status();
    }).catch(e => {
      Object.keys(up).forEach(k => { if(up[k] !== null) delete last[k]; });
      erroFirebase(e);
    });
  }

  let timer = null;
  function desenharLogo(){ clearTimeout(timer); timer = setTimeout(desenhar, 120); }

  function desenhar(){
    const sessao = document.getElementById('screen-session');
    if(!sessao || !sessao.classList.contains('active')) return;
    const a = document.activeElement;
    const digitando = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName);
    const em = sel => digitando && a.closest && a.closest(sel);
    const arrastando = (typeof dragTok !== 'undefined' && dragTok) || (typeof dragImg !== 'undefined' && dragImg) || (typeof eviDrag !== 'undefined' && eviDrag);
    if(arrastando){ timer = setTimeout(desenhar, 300); return; }
    try{
      if(sujo.mapa){ applyMapBackground(state.mapBackground); sujo.mapa = false; }
      if(sujo.grid){
        const g = document.getElementById('grid-overlay'); if(g) g.classList.toggle('on', !!state.grid);
        const b = document.getElementById('btn-grid'); if(b) b.classList.toggle('on-state', !!state.grid);
        sujo.grid = false;
      }
      if(sujo.salas){ renderRooms(); sujo.salas = false; }
      if(sujo.fog){ renderFog(); updateFogButtons(); sujo.fog = false; }
      if(sujo.chap){ document.getElementById('chap-label').textContent = state.chapter + ' · ' + state.location; sujo.chap = false; }
      if(sujo.imgs){ renderMapImages(); sujo.imgs = false; }
      if(sujo.chars || sujo.turno){
        if(em('#participants-list,#enemies-list,#npcs-list,#turn-col')){ timer = setTimeout(desenhar, 1000); return; }
        renderParticipants(); renderEnemiesList(); renderNpcsList(); renderTokens(); renderTurns(); msgComposerUpdate();
        sujo.chars = false; sujo.turno = false;
      }
      if(sujo.log){ renderLog(); sujo.log = false; }
      if(sujo.avisar){ if(typeof logNotify === 'function') logNotify(); sujo.avisar = false; }
      if(sujo.notas){
        const ov = document.getElementById('ov-notes');
        if(ov && ov.classList.contains('active')){
          if(em('#ov-notes')){ timer = setTimeout(desenhar, 1000); return; }
          renderNotes();
        }
        sujo.notas = false;
      }
    }catch(e){
      console.log('online.js: erro ao redesenhar', e);
      timer = setTimeout(desenhar, 500);
    }
  }

  const gotoOriginal = goto;
  goto = function(id){
    gotoOriginal(id);
    if(id === 'session'){
      ['mapa','grid','salas','fog','chap','imgs','chars','turno','log','notas'].forEach(x => sujo[x] = true);
      setTimeout(desenhar, 0);
    }
  };

  function receber(snap){
    const k = snap.key, v = snap.val();
    if(last[k] === v) return;
    last[k] = v;
    processar(k, v);
    recebidoEm = hora(); status();
    desenharLogo();
  }

  ref.once('value').then(snap => {
    const tudo = snap.val() || {};
    Object.keys(tudo).forEach(k => { last[k] = tudo[k]; processar(k, tudo[k]); });
    ['mapa','grid','salas','fog','chap','imgs','chars','turno','log','notas'].forEach(x => sujo[x] = true);
    pronto = true;
    recebidoEm = hora();
    status();
    desenharLogo();
    setInterval(enviar, 400);
    ref.on('child_added', receber, erroFirebase);
    ref.on('child_changed', receber, erroFirebase);
    ref.on('child_removed', s => { delete last[s.key]; processar(s.key, null); desenharLogo(); }, erroFirebase);
  }).catch(erroFirebase);
})();

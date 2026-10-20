(function(){
  if(typeof firebase==='undefined' || typeof FIREBASE_CONFIG==='undefined') return;
  if(!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('COLE')===0) return;
  if(!FIREBASE_CONFIG.databaseURL || FIREBASE_CONFIG.databaseURL.indexOf('COLE')===0){
    console.log('online.js: falta o databaseURL no firebase-config.js');
    return;
  }

  window.ONLINE_ON = true;      // o login espera ONLINE_READY (dados já baixados)
  window.ONLINE_READY = false;

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();
  const raiz = 'campanhas/' + SALA;
  const ref = db.ref(raiz + '/d');
  const imgRef = db.ref(raiz + '/img');

  const WHOLE = ['chapter','location','turnOrder','turn','round','grid','fogLevel','rooms','mapBackground','locations','events','customActions','mapImages','spotlight','drawings','musicNow','timerSec','timerRunning','timerAt','setups','activeSetup','tracks'];
  const MAX_LOG = 200;
  const INTERVALO = 250;           // ms entre envios
  const contasDoCodigo = {};
  Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role === 'gm') contasDoCodigo[k] = ACCOUNTS[k]; });

  const last = {}, memo = new Map(), subidas = new Set(), cacheImg = {};
  // chaves cujo valor ainda tem imagem sendo baixada (ou deu erro ao aplicar).
  // NUNCA enviamos essas chaves: o estado local tem '' no lugar da imagem e mandar isso apagaria a imagem de todo mundo.
  const pend = new Set();
  let novas = {}, refs = {}, curK = '';
  let pronto = false, conectado = false, enviadoEm = '-', recebidoEm = '-', erro = '';
  let sujo = {};
  const falhas = {};

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
      (refs[curK] || (refs[curK] = [])).push(id);
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
      if(tent < 20) return new Promise(r => setTimeout(r, 1500)).then(() => buscar(id, tent + 1));
    }).catch(() => {
      if(tent < 20) return new Promise(r => setTimeout(r, 3000)).then(() => buscar(id, tent + 1));
    });
  }

  function juntar(){
    novas = {}; refs = {};
    const m = {};
    const put = (k, v) => { curK = k; m[k] = js(v); };
    WHOLE.forEach(k => { if(state[k] !== undefined) put(K('w', k), state[k]); });
    const fc = Object.assign({}, state.fogCfg); delete fc.tool;
    put(K('w', 'fogCfg'), fc);
    if(typeof turnSlotState !== 'undefined') put(K('w', 'turnSlots'), turnSlotState);
    ['characters','enemies','npcs'].forEach(g => {
      Object.keys(state[g]).forEach(id => {
        const o = state[g][id];
        Object.keys(o).forEach(f => { if(o[f] !== undefined) put(K('f', g, id, f), o[f]); });
      });
    });
    const N = state.notes;
    N.shared.forEach(n => { if(!n.id) n.id = novoId(); put(K('s', n.id), n); });
    (N.links || []).forEach(l => { put(K('l', l.id), l); });
    Object.keys(N.private).forEach(o => N.private[o].forEach(n => { if(!n.id) n.id = novoId(); put(K('p', o, n.id), n); }));
    Object.keys(N.privateLinks || {}).forEach(o => N.privateLinks[o].forEach(l => { put(K('q', o, l.id), l); }));
    state.log.slice(-MAX_LOG).forEach(e => { if(!e.id) e.id = novoId(); put(K('g', e.id), e); });
    const contas = {};
    Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role !== 'gm') contas[k] = ACCOUNTS[k]; });
    put(K('a'), contas);
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
    grid:'grid', fogLevel:'fog', fogCfg:'fog', rooms:'salas', mapBackground:'mapa', mapImages:'imgs', spotlight:'imgs',
    drawings:'draw', musicNow:'music' };

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
        const pos = (p[3] === 'x' || p[3] === 'y');
        // quem está arrastando o token manda na posição dele; o valor remoto não "puxa" de volta
        if(pos && v !== undefined && typeof dragTok !== 'undefined' && dragTok && dragTok.dataset.id === p[2]) break;
        if(v === undefined){
          if(g[p[2]]){ delete g[p[2]][p[3]]; if(!Object.keys(g[p[2]]).length) delete g[p[2]]; }
          sujo.chars = true;
        } else {
          if(!g[p[2]]) g[p[2]] = {};
          g[p[2]][p[3]] = v;
          if(pos) sujo.pos = true; else sujo.chars = true;
        }
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
    try{
      if(val == null){ pend.delete(k); aplicar(k, undefined); return; }
      const r = ler(val);
      aplicar(k, r.v);
      if(r.falta.length){
        pend.add(k);
        Promise.all(r.falta.map(id => buscar(id, 0))).then(() => {
          if(last[k] !== val) return;            // chegou valor mais novo; ele cuida de si
          const r2 = ler(val);
          if(r2.falta.length){                   // imagem ainda não existe: tenta de novo depois
            setTimeout(() => { if(last[k] === val) processar(k, val); }, 15000);
            return;
          }
          aplicar(k, r2.v); pend.delete(k); desenharLogo();
        });
      } else pend.delete(k);
    }catch(e){
      // falhou ao aplicar: o estado local ficou defasado, então NÃO pode ser enviado de volta
      console.log('online.js: erro ao aplicar', k, e);
      pend.add(k);
    }
  }

  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;font:10px monospace;padding:2px 6px;background:#000;border:1px solid #444';
  document.body.appendChild(badge);
  function status(){
    if(erro){ badge.textContent = erro; badge.style.color = '#e01010'; return; }
    if(!conectado){ badge.textContent = 'sem conexão com o Firebase...'; badge.style.color = '#e0a020'; return; }
    badge.textContent = 'ONLINE · sala ' + SALA + ' · enviou ' + enviadoEm + ' · recebeu ' + recebidoEm + (pend.size ? ' · baixando imagens' : '');
    badge.style.color = '#3fdc7a';
  }
  badge.textContent = 'conectando...'; badge.style.color = '#aaa';

  // Setups de cena e biblioteca de faixas ficam na sala Firebase, não só no navegador do mestre.
  window.addEventListener('d0:setups-changed', e => {
    if(!e.detail || !Array.isArray(e.detail)) return;
    state.setups = e.detail;
    if(typeof state.activeSetup === 'undefined') state.activeSetup = null;
  });
  db.ref('.info/connected').on('value', s => { conectado = !!s.val(); status(); });
  // relógio do servidor: o timer fica igual para todos, mesmo com relógios de PC diferentes
  db.ref('.info/serverTimeOffset').on('value', s => { timerOffset = +s.val() || 0; });

  function erroFirebase(e){
    erro = 'erro Firebase: ' + (e.code || e.message || e) + ' (veja as Regras do banco)';
    status();
  }

  function enviar(){
    if(!pronto) return;
    const agora = juntar(), up = {};
    // chaves com imagem pendente/erro: considera "sem mudança"
    pend.forEach(k => { if(k in last) agora[k] = last[k]; else delete agora[k]; });
    Object.keys(agora).forEach(k => { if(last[k] !== agora[k]){ up[k] = agora[k]; last[k] = agora[k]; } });
    Object.keys(last).forEach(k => { if(!(k in agora) && !pend.has(k)){ up[k] = null; delete last[k]; } });
    if(!Object.keys(up).length) return;

    const falhou = new Set();
    const meusRefs = refs;
    const subs = Object.keys(novas).filter(id => !subidas.has(id)).map(id => {
      subidas.add(id);
      return imgRef.child(id).set(novas[id]).catch(e => { subidas.delete(id); falhou.add(id); erroFirebase(e); });
    });

    const mandar = () => {
      // uma imagem que falhou não pode travar o resto (posição de token, HP, chat...)
      Object.keys(up).forEach(k => {
        if((meusRefs[k] || []).some(id => falhou.has(id))){ delete up[k]; delete last[k]; }
      });
      if(!Object.keys(up).length) return;
      return ref.update(up).then(() => {
        enviadoEm = hora(); erro = ''; status();
      }).catch(e => {
        Object.keys(up).forEach(k => { if(up[k] !== null) delete last[k]; });
        erroFirebase(e);
      });
    };
    if(subs.length) Promise.all(subs).then(mandar); else mandar();   // sem imagem: envia na hora (vale no pagehide)
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

    let de_novo = 0;
    // cada parte da tela é independente: se uma quebrar, as outras (principalmente os tokens) continuam
    const passo = (flag, fn) => {
      if(!sujo[flag]) return;
      try{
        if(fn() === 'adiar'){ de_novo = Math.max(de_novo, 1000); return; }
        sujo[flag] = false; falhas[flag] = 0;
      }catch(e){
        console.log('online.js: erro ao redesenhar (' + flag + ')', e);
        falhas[flag] = (falhas[flag] || 0) + 1;
        if(falhas[flag] >= 5){ sujo[flag] = false; falhas[flag] = 0; }
        else de_novo = Math.max(de_novo, 500);
      }
    };

    passo('mapa', () => applyMapBackground(state.mapBackground));
    passo('grid', () => {
      const g = document.getElementById('grid-overlay'); if(g) g.classList.toggle('on', !!state.grid);
      const b = document.getElementById('btn-grid'); if(b) b.classList.toggle('on-state', !!state.grid);
    });
    passo('salas', () => renderRooms());
    passo('fog', () => { renderFog(); updateFogButtons(); });
    passo('chap', () => { document.getElementById('chap-label').textContent = state.chapter + ' · ' + state.location; });
    passo('imgs', () => renderMapImages());
    passo('music', () => { if(typeof musicApply === 'function') musicApply(); });
    passo('draw', () => { if(typeof drawing !== 'undefined' && drawing) return 'adiar'; renderDraw(); });

    if(sujo.turno){ sujo.chars = true; sujo.turno = false; }
    const charsEra = !!sujo.chars;
    passo('chars', () => {
      if(em('#participants-list,#enemies-list,#npcs-list,#turn-col')) return 'adiar';
      let primeiro = null;
      [renderTokens, renderParticipants, renderEnemiesList, renderNpcsList, renderTurns, msgComposerUpdate].forEach(f => {
        try{ f(); }catch(e){ if(!primeiro) primeiro = e; console.log('online.js: erro em', f.name, e); }
      });
      // a visão dos players (fog) segue os tokens: refaz quando qualquer personagem mudou de lugar
      if(state.fogLevel > 0 && state.fogCfg.vision){ try{ renderFog(); }catch(e){ if(!primeiro) primeiro = e; } }
      if(primeiro) throw primeiro;
    });
    if(charsEra && !sujo.chars) sujo.pos = false;     // os tokens já foram atualizados acima
    // só a posição mudou (alguém moveu um token): atualiza só os tokens, sem refazer as listas
    passo('pos', () => { renderTokens(); if(state.fogLevel > 0 && state.fogCfg.vision) renderFog(); });

    passo('log', () => renderLog());
    passo('avisar', () => { if(typeof logNotify === 'function') logNotify(); });
    passo('notas', () => {
      const ov = document.getElementById('ov-notes');
      if(ov && ov.classList.contains('active')){
        if(em('#ov-notes')) return 'adiar';
        renderNotes();
      }
    });

    if(de_novo) timer = setTimeout(desenhar, de_novo);
  }

  const gotoOriginal = goto;
  goto = function(id){
    gotoOriginal(id);
    if(id === 'session'){
      ['mapa','grid','salas','fog','chap','imgs','draw','music','chars','turno','log','notas'].forEach(x => sujo[x] = true);
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
    ['mapa','grid','salas','fog','chap','imgs','draw','music','chars','turno','log','notas'].forEach(x => sujo[x] = true);
    pronto = true;
    window.ONLINE_READY = true;
    recebidoEm = hora();
    status();
    desenharLogo();
    setInterval(enviar, INTERVALO);
    ref.on('child_added', receber, erroFirebase);
    ref.on('child_changed', receber, erroFirebase);
    ref.on('child_removed', s => { delete last[s.key]; processar(s.key, null); desenharLogo(); }, erroFirebase);
    if(typeof autoLogin === 'function') autoLogin();   // depois do F5, volta pra sessão sozinho
  }).catch(erroFirebase);

  // última tentativa de mandar o que ficou pendente ao fechar/atualizar a página
  window.addEventListener('pagehide', enviar);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') enviar(); });
})();

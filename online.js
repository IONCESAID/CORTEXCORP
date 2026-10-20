(function(){
  if(typeof firebase==='undefined' || typeof FIREBASE_CONFIG==='undefined') return;
  if(!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('COLE')===0) return;
  if(!FIREBASE_CONFIG.databaseURL || FIREBASE_CONFIG.databaseURL.indexOf('COLE')===0){
    console.log('online.js: falta o databaseURL no firebase-config.js');
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const ref = firebase.database().ref('campanhas/' + SALA + '/d');

  const WHOLE = ['chapter','location','turnOrder','turn','round','grid','fogLevel','rooms','mapBackground','log','locations','events','customActions','mapImages','spotlight'];
  const contasDoCodigo = {};
  Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role === 'gm') contasDoCodigo[k] = ACCOUNTS[k]; });

  const last = {};
  let pronto = false;

  const enc = s => encodeURIComponent(s).replace(/\./g, '%2E');
  const chave = (...p) => p.map(enc).join('|');

  function juntar(){
    const m = {};
    WHOLE.forEach(k => { if(state[k] !== undefined) m[chave('w', k)] = JSON.stringify(state[k]); });
    const fc = Object.assign({}, state.fogCfg); delete fc.tool;
    m[chave('w', 'fogCfg')] = JSON.stringify(fc);
    ['characters','enemies','npcs'].forEach(g => {
      Object.keys(state[g]).forEach(id => { m[chave('d', g, id)] = JSON.stringify(state[g][id]); });
    });
    const N = state.notes;
    m[chave('n', 'shared')] = JSON.stringify(N.shared);
    m[chave('n', 'links')] = JSON.stringify(N.links || []);
    Object.keys(N.private).forEach(o => { m[chave('n', 'private', o)] = JSON.stringify(N.private[o]); });
    Object.keys(N.privateLinks || {}).forEach(o => { m[chave('n', 'privateLinks', o)] = JSON.stringify(N.privateLinks[o]); });
    const contas = {};
    Object.keys(ACCOUNTS).forEach(k => { if(ACCOUNTS[k].role !== 'gm') contas[k] = ACCOUNTS[k]; });
    m[chave('a')] = JSON.stringify(contas);
    return m;
  }

  function aplicar(k, val){
    const p = k.split('|').map(decodeURIComponent);
    const v = val == null ? null : JSON.parse(val);
    if(p[0] === 'w'){
      if(v === null) return;
      if(p[1] === 'fogCfg') state.fogCfg = Object.assign({}, v, { tool: (state.fogCfg && state.fogCfg.tool) || '' });
      else state[p[1]] = v;
    } else if(p[0] === 'd'){
      if(v === null) delete state[p[1]][p[2]];
      else state[p[1]][p[2]] = v;
    } else if(p[0] === 'n'){
      if(p[1] === 'shared' || p[1] === 'links'){
        if(v !== null) state.notes[p[1]] = v;
      } else {
        if(!state.notes[p[1]]) state.notes[p[1]] = {};
        if(v === null) delete state.notes[p[1]][p[2]];
        else state.notes[p[1]][p[2]] = v;
      }
    } else if(p[0] === 'a'){
      if(!v) return;
      Object.keys(ACCOUNTS).forEach(c => delete ACCOUNTS[c]);
      Object.assign(ACCOUNTS, v, contasDoCodigo);
    }
  }

  function enviar(){
    if(!pronto) return;
    const agora = juntar(), up = {};
    Object.keys(agora).forEach(k => {
      if(last[k] !== agora[k]){ up[k] = agora[k]; last[k] = agora[k]; }
    });
    Object.keys(last).forEach(k => {
      if(!(k in agora)){ up[k] = null; delete last[k]; }
    });
    if(Object.keys(up).length) ref.update(up);
  }

  let timer = null;
  function redesenhar(){
    clearTimeout(timer);
    timer = setTimeout(tentarRedesenhar, 150);
  }
  function tentarRedesenhar(){
    const a = document.activeElement;
    if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)){ timer = setTimeout(tentarRedesenhar, 1200); return; }
    if(document.getElementById('screen-session').classList.contains('active')) renderAll();
    if(document.getElementById('ov-notes').classList.contains('active')) renderNotes();
  }

  function receber(snap){
    const k = snap.key, v = snap.val();
    if(last[k] === v) return;
    last[k] = v;
    aplicar(k, v);
    redesenhar();
  }

  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;font:10px monospace;padding:2px 6px;background:#000;color:#aaa;border:1px solid #444';
  badge.textContent = 'conectando...';
  document.body.appendChild(badge);

  firebase.database().ref('.info/connected').on('value', s => {
    badge.textContent = s.val() ? 'ONLINE · sala ' + SALA : 'sem conexão';
    badge.style.color = s.val() ? '#3fdc7a' : '#e01010';
  });

  ref.once('value').then(snap => {
    const tudo = snap.val() || {};
    Object.keys(tudo).forEach(k => { last[k] = tudo[k]; aplicar(k, tudo[k]); });
    pronto = true;
    redesenhar();
    setInterval(enviar, 700);
    ref.on('child_added', receber);
    ref.on('child_changed', receber);
    ref.on('child_removed', snap => {
      delete last[snap.key];
      aplicar(snap.key, null);
      redesenhar();
    });
  }).catch(e => {
    badge.textContent = 'erro: ' + e.message;
    badge.style.color = '#e01010';
  });
})();

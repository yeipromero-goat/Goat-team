// ═══════════════════════════════════════════════════════════════════
//  supabase-persistence.js — DATOS DEL USUARIO
// ═══════════════════════════════════════════════════════════════════
//
//  RESPONSABILIDAD:
//    Guardar y cargar el estado personal de cada usuario:
//    lineup (coach, arqueros, arcos), deck, puntos y upgrades.
//
//  DEPENDE DE:
//    - supabase.js         → debe cargar ANTES que este archivo
//                            provee: SUPABASE_URL, SUPABASE_KEY,
//                            window.ARCHERS, window.COACHES, window.BOWS
//    - auth.js             → provee: window._supabaseClient
//
//  NO DEPENDE DE:
//    - fetchSupabase()     → este archivo tiene su propio _userFetch()
//                            para no mezclar lógica de lectura de juego
//                            con lectura/escritura de usuarios
//
//  ORDEN DE CARGA EN index.html:
//    1. supabase.js            (datos del juego)
//    2. supabase-persistence.js (datos del usuario)
//    3. auth.js                (sesión)
//
//  TABLA EN SUPABASE:
//    user_selections
//      user_id          uuid  (FK auth.users)
//      coach_id         text
//      archer_ids       jsonb  (array de hasta 3 ids)
//      bow_ids          jsonb  (array de hasta 3 ids)
//      active_archer_id text
//      active_bow_id    integer
//      deck             jsonb  (array de 36 card ids)
//      points           integer
//      bow_upgrades     jsonb
//      upgrade_history  jsonb
//      tournament_results jsonb
//      username         text
//      updated_at       timestamptz
//
// ═══════════════════════════════════════════════════════════════════

// ─── FETCH PROPIO (no usa fetchSupabase de supabase.js) ───────────
// Usa el token de sesión del usuario autenticado, no el anon key.
// Esto es necesario para que las políticas RLS funcionen correctamente.
async function _userFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

  // Token de sesión activo del usuario — requerido para pasar RLS
  const { data: sessionData } = await window._supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token || SUPABASE_KEY;

  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── LINEUP STATE ─────────────────────────────────────────────────
//  Fuente de verdad del lineup persistente del usuario
window.lineupCoachId   = window.lineupCoachId   || null;  // string id del coach
window.lineupArcherIds = window.lineupArcherIds  || [];   // hasta 3 ids de arqueros
window.lineupBowIds    = window.lineupBowIds     || [];   // hasta 3 ids de arcos
window.playerDeck      = window.playerDeck       || [];   // 36 card ids
window.points          = window.points           ?? 15;
window.upgradeHistory  = window.upgradeHistory   || [];

// ─── SAVE ─────────────────────────────────────────────────────────
async function saveUserSelections() {
  try {
    // Esperar sesión activa — reintenta hasta 3 segundos
    let sessionData;
    for (let i = 0; i < 15; i++) {
      const result = await window._supabaseClient.auth.getSession();
      if (result?.data?.session) { sessionData = result.data; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    if (!sessionData?.session) {
      console.warn('⚠️ saveUserSelections: sin sesión activa, omitiendo');
      return;
    }

    const userId = sessionData.session.user.id;

    // Snapshot de upgrades actuales de cada arco
    const bow_upgrades = {};
    (window.BOWS || []).forEach(bow => {
      bow_upgrades[String(bow.id)] = {
        fps:     bow.fps,
        let_off: bow.let,
        ata:     bow.ata,
        bh:      bow.bh,
        draw:    bow.draw,
        dl:      bow.dl,
      };
    });

    const payload = {
      user_id:    userId,
      updated_at: new Date().toISOString(),

      // 🧑 Perfil
      username: window.username || null,

      // 👥 Lineup guardado
      coach_id:   window.lineupCoachId  || (window.selectedCoach?.id  || null),
      archer_ids: (window.lineupArcherIds || []).slice(0, 3),
      bow_ids:    (window.lineupBowIds   || []).slice(0, 3),
      deck:       window.playerDeck || [],

      // 🎮 Activo en esta sesión (para restaurar rápido)
      active_archer_id: window.selectedArcher?.id || null,
      active_bow_id:
        window.activeBow != null
          ? (window.BOWS?.[window.activeBow]?.id || null)
          : null,

      // 💰 Progresión
      points:          window.points ?? 15,
      bow_upgrades:    bow_upgrades,
      upgrade_history: window.upgradeHistory || [],

      // 🏆 Historial competitivo
      tournament_results: window.tournamentResults || []
    };

    await _userFetch('user_selections?on_conflict=user_id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload)
    });

    console.log('💾 Lineup guardado');

  } catch (e) {
    console.error('❌ saveUserSelections:', e.message);
  }
}

// ─── LOAD ─────────────────────────────────────────────────────────
async function loadUserSelections() {
  try {
    const { data: sessionData } = await window._supabaseClient.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;
    const rows = await _userFetch(`user_selections?user_id=eq.${userId}&limit=1`);

    if (!rows || rows.length === 0) {
      console.log('ℹ️ Usuario nuevo — sin lineup guardado');
      return;
    }

    const row = rows[0];

    // 🧑 Perfil
    if (row.username) window.username = row.username;

    // 💰 Puntos
    if (typeof row.points === 'number') window.points = row.points;

    // 🃏 Deck — mutar el array existente para no romper referencias locales
    if (Array.isArray(row.deck) && row.deck.length > 0) {
      window.playerDeck.length = 0;
      row.deck.forEach(id => window.playerDeck.push(id));
    }

    // 👥 Coach
    if (row.coach_id) {
      window.lineupCoachId = row.coach_id;
      const coach = (window.COACHES || []).find(c => c.id === row.coach_id);
      if (coach) window.selectedCoach = coach;
    }

    // 👥 Arqueros (hasta 3, el primero es el activo)
    if (Array.isArray(row.archer_ids) && row.archer_ids.length > 0) {
      window.lineupArcherIds = row.archer_ids.slice(0, 3);
      const first = (window.ARCHERS || []).find(a => a.id === row.archer_ids[0]);
      if (first) window.selectedArcher = first;
    } else if (row.active_archer_id) {
      // fallback campo legacy
      const archer = (window.ARCHERS || []).find(a => a.id === row.active_archer_id);
      if (archer) { window.selectedArcher = archer; window.lineupArcherIds = [archer.id]; }
    }

    // 🏹 Arcos (hasta 3, el primero es el activo)
    if (Array.isArray(row.bow_ids) && row.bow_ids.length > 0) {
      window.lineupBowIds = row.bow_ids.slice(0, 3);
      const idx = (window.BOWS || []).findIndex(b => b.id === row.bow_ids[0]);
      if (idx >= 0) { window.activeBow = idx; window.selectedBow = idx; }
    } else if (row.active_bow_id != null) {
      const idx = (window.BOWS || []).findIndex(b => b.id === row.active_bow_id);
      if (idx >= 0) { window.activeBow = idx; window.selectedBow = idx; window.lineupBowIds = [window.BOWS[idx].id]; }
    }

    // 🔧 Upgrades de arcos
    if (row.bow_upgrades && typeof row.bow_upgrades === 'object') {
      (window.BOWS || []).forEach(bow => {
        const saved = row.bow_upgrades[String(bow.id)];
        if (!saved) return;
        if (saved.fps     != null) bow.fps  = saved.fps;
        if (saved.let_off != null) bow.let  = saved.let_off;
        if (saved.ata     != null) bow.ata  = saved.ata;
        if (saved.bh      != null) bow.bh   = saved.bh;
        if (saved.draw    != null) bow.draw = saved.draw;
        if (saved.dl      != null) bow.dl   = saved.dl;
      });
    }

    // 📜 Historial upgrades
    if (Array.isArray(row.upgrade_history)) {
      window.upgradeHistory = row.upgrade_history;
    }

    // 🏆 Torneos
    if (Array.isArray(row.tournament_results)) {
      window.tournamentResults = row.tournament_results;
    }

    console.log('✅ Lineup cargado:', {
      coach:   window.lineupCoachId,
      archers: window.lineupArcherIds,
      bows:    window.lineupBowIds,
      deck:    window.playerDeck.length + ' cartas'
    });

    // Refrescar UI
    if (typeof updateSetupChecks === 'function') updateSetupChecks();
    if (typeof recalc            === 'function') recalc();
    if (typeof renderBowProfile  === 'function') renderBowProfile();
    if (typeof updateDeckUI      === 'function') updateDeckUI();

  } catch (e) {
    console.error('❌ loadUserSelections:', e.message);
  }
}

// ─── HELPERS DE LINEUP ────────────────────────────────────────────
//  Llamar desde las cartas/arcos al fijar una selección

function addArcherToLineup(archerId) {
  window.lineupArcherIds = window.lineupArcherIds || [];
  if (window.lineupArcherIds.includes(archerId)) return;
  if (window.lineupArcherIds.length >= 3) window.lineupArcherIds.shift();
  window.lineupArcherIds.push(archerId);
  saveUserSelections();
  if (typeof refreshLineupUI === 'function') refreshLineupUI();
}

function addBowToLineup(bowId) {
  window.lineupBowIds = window.lineupBowIds || [];
  if (window.lineupBowIds.includes(bowId)) return;
  if (window.lineupBowIds.length >= 3) window.lineupBowIds.shift();
  window.lineupBowIds.push(bowId);
  saveUserSelections();
  if (typeof refreshLineupUI === 'function') refreshLineupUI();
}

function setCoachInLineup(coachId) {
  window.lineupCoachId = coachId;
  saveUserSelections();
  if (typeof refreshLineupUI === 'function') refreshLineupUI();
}

// ─── INIT ─────────────────────────────────────────────────────────
async function initSupabasePersistence() {
  // Exponer datos del usuario para otros módulos (competencias, bitácora)
  try {
    const { data: sd } = await window._supabaseClient.auth.getSession();
    if (sd?.session) {
      window._supabaseToken   = sd.session.access_token;
      window._supabaseUserId  = sd.session.user.id;
      window._supabaseUserName = sd.session.user.user_metadata?.nombre
        || sd.session.user.user_metadata?.full_name
        || sd.session.user.email?.split('@')[0]
        || 'Arquero';
      // Admin: solo el dueño del proyecto
      const ADMIN_ID = 'd3847774-77bc-4adf-bb04-4feb3d9315e7';
      window._supabaseIsAdmin = sd.session.user.id === ADMIN_ID;
      // Anon key para requests públicos
      window._supabaseAnonKey = window._supabaseClient?.supabaseKey || '';

      // Registrar actividad silenciosamente
      fetch(`${SUPABASE_URL}/rest/v1/user_activity`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + sd.session.access_token,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: sd.session.user.id,
          last_seen_at: new Date().toISOString()
        })
      }).catch(()=>{});
    }
  } catch(e) {}
  await loadUserSelections();
  window.dispatchEvent(new CustomEvent('supabase-user-ready'));
}

// ─── EXPORTS ──────────────────────────────────────────────────────
window.saveUserSelections      = saveUserSelections;
window.loadUserSelections      = loadUserSelections;
window.initSupabasePersistence = initSupabasePersistence;
window.addArcherToLineup       = addArcherToLineup;
window.addBowToLineup          = addBowToLineup;
window.setCoachInLineup        = setCoachInLineup;


// ══════════════════════════════════════════════════════════════════
//  BITÁCORA DE PUNTUACIONES — guardar y cargar sesiones reales
// ══════════════════════════════════════════════════════════════════

// ── Token vigente ─────────────────────────────────────────────────
// window._supabaseToken se asigna una sola vez al iniciar sesión y el JWT caduca (1 h por defecto en Supabase).
// Antes de guardar o cargar se pide la sesión actual: supabase-js renueva el token si hace falta.
// Cadena .then() con tope de 2.5 s: si getSession() se cuelga o falla, se usa el token que ya había
// (el comportamiento anterior), así que esto nunca puede dejar el guardado peor que antes.
function _freshToken() {
  var fallback = window._supabaseToken;
  var c = window._supabaseClient;
  if (!c || !c.auth || typeof c.auth.getSession !== 'function') return Promise.resolve(fallback);
  var timeout = new Promise(function(res){ setTimeout(function(){ res(null); }, 2500); });
  var fresh = c.auth.getSession().then(function(r){
    var t = r && r.data && r.data.session && r.data.session.access_token;
    if (t) window._supabaseToken = t;
    return t || null;
  }).catch(function(){ return null; });
  return Promise.race([fresh, timeout]).then(function(t){ return t || fallback; });
}

// ── Limpieza de lo que va a la base ───────────────────────────────
// La tabla rechaza la FILA ENTERA si face no es 'A'/'B'/'F' o impacts no es un arreglo. Como el guardado
// es una sola inserción (scores no permite UPDATE por RLS), un dato malformado perdería toda la sesión.
// Por eso se limpia aquí y, si algo no es válido, se omite ese campo en vez de arriesgar la sesión.
function _cleanFace(f) { return (f === 'A' || f === 'B' || f === 'F') ? f : null; }
function _cleanImpacts(arr) {
  if (!Array.isArray(arr)) return null;
  var out = [];
  for (var k = 0; k < arr.length && out.length < 300; k++) {
    var p = arr[k];
    if (!p || typeof p !== 'object') continue;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    if (!isFinite(p.x) || !isFinite(p.y) || Math.abs(p.x) > 3 || Math.abs(p.y) > 3) continue;
    var o = { x: Math.round(p.x * 10000) / 10000, y: Math.round(p.y * 10000) / 10000 };
    if (Number.isInteger(p.e) && p.e >= 0) o.e = p.e;   // índice de serie
    if (Number.isInteger(p.i) && p.i >= 0) o.i = p.i;   // índice de flecha dentro de la serie
    out.push(o);
  }
  return out.length ? out : null;
}

// Devuelve una promesa que resuelve true si se guardó y false si no (antes no devolvía nada).
// Los llamadores anteriores que ignoran el valor de retorno siguen funcionando igual.
window.supabaseSaveScore = function(session) {
  var key    = window._supabaseAnonKey;
  var userId = window._supabaseUserId;
  if(!window._supabaseToken || !userId) { console.warn('supabaseSaveScore: sin token/userId'); return Promise.resolve(false); }

  var payload = {
    id:           session.id,
    user_id:      userId,
    mode:         session.mode,
    group_name:   session.g,
    label:        session.lbl,
    total:        session.total,
    arrow_count:  session.n,
    avg_arrow:    session.avg,
    specials:     session.sp,
    max_possible: session.max || null,
    ends:         session.ends || [],
    notes:        session.notes || '',
    session_date: session.date,
    setup_id:     session.setup_id || null,
    setup_note:   session.setup_note || null,
  };

  // Diana e impactos solo viajan si son válidos. Sin ellos el payload es idéntico al de siempre,
  // así que las sesiones normales no dependen de que existan las columnas nuevas.
  var face = _cleanFace(session.face);
  var impacts = _cleanImpacts(session.impacts);
  if (impacts && !face) { console.warn('supabaseSaveScore: impactos sin diana válida, se omiten'); impacts = null; }
  if (face)    payload.face    = face;
  if (impacts) payload.impacts = impacts;

  // Una sola inserción por sesión (scores no permite UPDATE). Si la base rechaza la fila por la diana o los impactos
  // (por ejemplo, porque falta correr la migración que acepta la diana F de Field), se reintenta UNA vez sin ellos:
  // es mejor guardar la sesión sin diana que perderla entera. En ese caso lastPartial queda en true para avisar.
  var post = function(body){
    return _freshToken().then(function(token){
      return fetch(SUPABASE_URL + '/rest/v1/scores', {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(body)
      });
    });
  };
  window.supabaseSaveScore.lastPartial = false;
  return post(payload).then(function(r){
    if(r.ok || r.status===201 || r.status===204){ console.log('✅ Puntuación guardada'); return true; }
    return r.text().then(function(t){
      console.error('❌ Error guardando:', r.status, t);
      if((payload.face || payload.impacts) && (r.status===400 || r.status===422)){
        var basic = {}; Object.keys(payload).forEach(function(k){ if(k!=='face' && k!=='impacts') basic[k]=payload[k]; });
        return post(basic).then(function(r2){
          if(r2.ok || r2.status===201 || r2.status===204){
            console.warn('⚠️ Sesión guardada SIN diana ni impactos: la base rechazó esos campos (¿falta la migración de Field?)');
            window.supabaseSaveScore.lastPartial = true;
            return true;
          }
          return r2.text().then(function(t2){ console.error('❌ Error guardando (reintento sin diana):', r2.status, t2); return false; });
        });
      }
      return false;
    });
  }).catch(function(e){ console.error('❌ supabaseSaveScore error:', e); return false; });
};

// Marca de versión: la Bitácora la consulta para avisar si este archivo es una versión anterior que descartaría los impactos.
window.supabaseSaveScore.supportsImpacts = true;
window.supabaseSaveScore.supportsFieldFace = true;   // acepta la diana 'F' (Field)
window.supabaseSaveScore.lastPartial = false;        // true si la última sesión se guardó sin diana (la base rechazó esos campos)

// opts.ownOnly = true: trae solo las sesiones del usuario. Sin esa opción el comportamiento es el de siempre.
// Hace falta porque la política de coach deja leer TODAS las sesiones: sin filtro, la Bitácora de un coach
// se llenaría con las de otros atletas (y el límite de 200 se repartiría entre todos).
window.supabaseLoadScores = function(opts) {
  var key = window._supabaseAnonKey;
  if(!window._supabaseToken || !key) return Promise.resolve([]);
  var own = !!(opts && opts.ownOnly);
  if (own && !window._supabaseUserId) return Promise.resolve([]);
  var url = SUPABASE_URL + '/rest/v1/scores?' +
            (own ? 'user_id=eq.' + encodeURIComponent(window._supabaseUserId) + '&' : '') +
            'order=session_date.desc&limit=200';

  return _freshToken().then(function(token){
    return fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + token } });
  }).then(function(r){ return r.json(); }).then(function(rows){
    if(!Array.isArray(rows)) return [];
    return rows.map(function(r){
      return {
        id: r.id, date: r.session_date, mode: r.mode, g: r.group_name,
        lbl: r.label, total: r.total, n: r.arrow_count,
        avg: parseFloat(r.avg_arrow), sp: r.specials, max: r.max_possible,
        ends: r.ends || [], notes: r.notes || '',
        setup_id: r.setup_id || null, setup_note: r.setup_note || null,
        impacts: Array.isArray(r.impacts) ? r.impacts : null,
        face: r.face || null,
      };
    });
  }).catch(function(e){ console.error('❌ supabaseLoadScores error:', e); return []; });
};

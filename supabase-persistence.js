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

    // 🃏 Deck
    if (Array.isArray(row.deck) && row.deck.length > 0) {
      window.playerDeck = row.deck;
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
      if (idx >= 0) window.activeBow = idx;
    } else if (row.active_bow_id != null) {
      // fallback campo legacy
      const idx = (window.BOWS || []).findIndex(b => b.id === row.active_bow_id);
      if (idx >= 0) { window.activeBow = idx; window.lineupBowIds = [window.BOWS[idx].id]; }
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

// ══════════════════════════════════════════════════════════════════
//  supabase-persistence.js — GOAT TEAM
//  Carga BOWS y CARDS desde Supabase y persiste las selecciones
//  del usuario en la tabla user_selections.
//
//  Orden de scripts en el HTML:
//    data.js → supabase.js → supabase-persistence.js → app.js
//
//  Depende de:
//    window._supabaseClient  (inicializado antes)
//    window.BOWS             (array mutable, inicialmente vacío o con valores base)
//    window.CARDS            (array mutable)
//    window.activeBow        (índice activo)
//    window.points           (puntos de torneo)
//    window.upgradeHistory   (historial de mejoras)
//    window.selectedArcher   (objeto archer activo)
//    window.selectedCoach    (objeto coach activo)
//    window.playerDeck       (array de IDs)
//    window.ARCHERS          (array cargado desde Supabase)
//    window.COACHES          (array hardcodeado en data.js)
// ══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://axaiyaflubssaghvhefe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YWl5YWZsdWJzc2FnaHZoZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjMwMzIsImV4cCI6MjA5MDQ5OTAzMn0.ur72JmEuh0KXp8Q9Eo7jF13kevxKaaDSZygR9wC3x6A';

// ─── Helper fetch ────────────────────────────────────────────────
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path}: ${res.status} — ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Cargar BOWS desde Supabase ──────────────────────────────────
async function loadBowsFromSupabase() {
  try {
    const data = await sbFetch('bows?order=id');
    if (!data || !data.length) return;

    // Mapear columnas de BD al formato que usa app.js
    window.BOWS = data.map(b => ({
      _id:    b.id,           // id serial de la tabla (para bow_upgrades)
      name:   b.name,
      model:  b.model,
      level:  b.level,
      fps:    b.fps,
      let:    b.let_off,      // app.js usa "let"
      ata:    b.ata,
      bh:     b.bh,
      draw:   b.draw,
      dl:     b.dl,
      ability: b.ability_name ? {
        name: b.ability_name,
        desc: b.ability_desc,
        used: false,
      } : null,
    }));

    console.log(`✅ ${window.BOWS.length} arcos cargados desde Supabase`);
  } catch (e) {
    console.error('❌ Error cargando BOWS:', e);
  }
}

// ─── Cargar CARDS desde Supabase ─────────────────────────────────
async function loadCardsFromSupabase() {
  try {
    const data = await sbFetch('cards?order=id');
    if (!data || !data.length) return;

    // Mapear columnas de BD al formato que usa app.js (n, cat, T, C, E, I, id)
    window.CARDS = data.map(c => ({
      id:  c.id,
      n:   c.name,
      cat: c.category,
      T:   c.t,
      C:   c.c,
      E:   c.e,
      I:   c.i,
      FUE: c.f || 0,
      RES: c.r || 0,
    }));

    console.log(`✅ ${window.CARDS.length} cartas cargadas desde Supabase`);
  } catch (e) {
    console.error('❌ Error cargando CARDS:', e);
  }
}

// ─── Guardar selecciones del usuario ─────────────────────────────
async function saveUserSelections() {
  try {
    const { data: sessionData } = await window._supabaseClient.auth.getSession();
    if (!sessionData?.session) return; // no está logueado

    const userId = sessionData.session.user.id;

    // Construir bow_upgrades a partir de los valores actuales vs. base
    const bow_upgrades = {};
    (window.BOWS || []).forEach(bow => {
      if (!bow._id) return;
      const key = String(bow._id);
      // Solo guardamos si hay diferencia respecto al valor original de la BD
      // (la función de upgrade ya modifica window.BOWS[idx] directamente)
      bow_upgrades[key] = {
        fps:     bow.fps,
        let_off: bow.let,
        ata:     bow.ata,
        bh:      bow.bh,
        draw:    bow.draw,
        dl:      bow.dl,
      };
    });

    const payload = {
      user_id:          userId,
      coach_id:         window.selectedCoach?.id || null,
      active_archer_id: window.selectedArcher?.id || null,
      active_bow_id:    window.activeBow !== null && window.activeBow !== undefined
                          ? (window.BOWS[window.activeBow]?._id || null)
                          : null,
      deck:             window.playerDeck || [],
      points:           window.points ?? 15,
      bow_upgrades:     bow_upgrades,
      upgrade_history:  window.upgradeHistory || [],
    };

    // UPSERT (insert or update por user_id)
    await sbFetch('user_selections', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });

    console.log('💾 Selecciones guardadas');
  } catch (e) {
    console.error('❌ Error guardando selecciones:', e);
  }
}

// ─── Cargar selecciones del usuario ──────────────────────────────
async function loadUserSelections() {
  try {
    const { data: sessionData } = await window._supabaseClient.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;
    const rows = await sbFetch(`user_selections?user_id=eq.${userId}&limit=1`);

    if (!rows || rows.length === 0) {
      console.log('ℹ️ Sin selecciones previas para este usuario');
      return;
    }

    const row = rows[0];

    // ── Restaurar puntos e historial ──────────────────────────
    if (typeof row.points === 'number') window.points = row.points;
    if (Array.isArray(row.upgrade_history)) window.upgradeHistory = row.upgrade_history;

    // ── Aplicar mejoras de arcos ──────────────────────────────
    if (row.bow_upgrades && typeof row.bow_upgrades === 'object') {
      (window.BOWS || []).forEach(bow => {
        if (!bow._id) return;
        const saved = row.bow_upgrades[String(bow._id)];
        if (!saved) return;
        if (saved.fps     !== undefined) bow.fps   = saved.fps;
        if (saved.let_off !== undefined) bow.let   = saved.let_off;
        if (saved.ata     !== undefined) bow.ata   = saved.ata;
        if (saved.bh      !== undefined) bow.bh    = saved.bh;
        if (saved.draw    !== undefined) bow.draw  = saved.draw;
        if (saved.dl      !== undefined) bow.dl    = saved.dl;
      });
    }

    // ── Restaurar arco activo ─────────────────────────────────
    if (row.active_bow_id !== null) {
      const bowIdx = (window.BOWS || []).findIndex(b => b._id === row.active_bow_id);
      if (bowIdx >= 0) window.activeBow = bowIdx;
    }

    // ── Restaurar arquero activo ──────────────────────────────
    if (row.active_archer_id) {
      const archer = (window.ARCHERS || []).find(a => a.id === row.active_archer_id);
      if (archer) window.selectedArcher = archer;
    }

    // ── Restaurar coach activo ────────────────────────────────
    if (row.coach_id) {
      const coach = (window.COACHES || []).find(c => c.id === row.coach_id);
      if (coach) window.selectedCoach = coach;
    }

    // ── Restaurar deck ────────────────────────────────────────
    if (Array.isArray(row.deck) && row.deck.length > 0) {
      window.playerDeck = row.deck;
    }

    console.log('✅ Selecciones del usuario restauradas');
  } catch (e) {
    console.error('❌ Error cargando selecciones:', e);
  }
}

// ─── Auto-save cada vez que cambia algo relevante ────────────────
// Llama a saveUserSelections() desde app.js después de:
//   - selectBow(), upgradeStat(), selectPersonCard(), clearPersonCard()
//   - applyDeckToBoard(), clearDeck(), randomDeck()
// O bien usa este helper desde app.js:
window.saveUserSelections = saveUserSelections;
window.loadUserSelections = loadUserSelections;
window.loadBowsFromSupabase = loadBowsFromSupabase;
window.loadCardsFromSupabase = loadCardsFromSupabase;

// ─── Inicialización al cargar la página ──────────────────────────
// Se llama desde app.js en DOMContentLoaded, después de que
// loadArchersFromSupabase() haya terminado (await).
async function initSupabasePersistence() {
  await loadBowsFromSupabase();
  await loadCardsFromSupabase();
  await loadUserSelections();

  // Si hay funciones de render que necesitan re-ejecutarse con los
  // datos restaurados, dispara un evento para que app.js lo maneje:
  window.dispatchEvent(new CustomEvent('supabase-data-ready'));
}
window.initSupabasePersistence = initSupabasePersistence;

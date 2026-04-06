// ═══════════════════════════════════════════════════════
//  supabase-persistence.js — USER STATE PRO
// ═══════════════════════════════════════════════════════

// ─── SAVE ─────────────────────────────────────────────
async function saveUserSelections() {
  try {
    const { data: sessionData } = await window._supabaseClient.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;

    // Limitar favoritos (máx 3)
    const favoriteArchers = (window.favoriteArchers || []).slice(0, 3);
    const favoriteBows = (window.favoriteBows || []).slice(0, 3);

    // Upgrades de arcos
    const bow_upgrades = {};
    (window.BOWS || []).forEach(bow => {
      if (!bow._id) return;

      bow_upgrades[String(bow._id)] = {
        fps: bow.fps,
        let_off: bow.let,
        ata: bow.ata,
        bh: bow.bh,
        draw: bow.draw,
        dl: bow.dl,
      };
    });

    const payload = {
      user_id: userId,

      // 🧑 Perfil
      username: window.username || null,

      // ⭐ Favoritos
      favorite_archers: favoriteArchers,
      favorite_bows: favoriteBows,
      favorite_coach: window.favoriteCoach || null,
      favorite_card: window.favoriteCard || null,

      // 🎮 Estado actual
      coach_id: window.selectedCoach?.id || null,
      active_archer_id: window.selectedArcher?.id || null,
      active_bow_id:
        window.activeBow !== null && window.activeBow !== undefined
          ? (window.BOWS[window.activeBow]?._id || null)
          : null,

      deck: window.playerDeck || [],
      points: window.points ?? 15,

      // 🔧 Progresión
      bow_upgrades: bow_upgrades,
      upgrade_history: window.upgradeHistory || [],

      // 🏆 Competitivo
      tournament_results: window.tournamentResults || []
    };

    await fetchSupabase('user_selections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(payload),
    });

    console.log('💾 Usuario guardado');

  } catch (e) {
    console.error('❌ Error guardando usuario:', e.message, e);
  }
}

// ─── LOAD ─────────────────────────────────────────────
async function loadUserSelections() {
  try {
    const { data: sessionData } = await window._supabaseClient.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;

    const rows = await fetchSupabase(
      `user_selections?user_id=eq.${userId}&limit=1`
    );

    if (!rows || rows.length === 0) {
      console.log('ℹ️ Usuario nuevo');
      return;
    }

    const row = rows[0];

    // 🧑 Perfil
    if (row.username) window.username = row.username;

    // ⭐ Favoritos
    if (Array.isArray(row.favorite_archers)) {
      window.favoriteArchers = row.favorite_archers.slice(0, 3);
    }

    if (Array.isArray(row.favorite_bows)) {
      window.favoriteBows = row.favorite_bows.slice(0, 3);
    }

    if (row.favorite_coach) {
      window.favoriteCoach = row.favorite_coach;
    }

    if (row.favorite_card) {
      window.favoriteCard = row.favorite_card;
    }

    // 🎮 Estado
    if (typeof row.points === 'number') {
      window.points = row.points;
    }

    if (Array.isArray(row.deck)) {
      window.playerDeck = row.deck;
    }

    // 🔧 Upgrades
    if (row.bow_upgrades && typeof row.bow_upgrades === 'object') {
      (window.BOWS || []).forEach(bow => {
        if (!bow._id) return;

        const saved = row.bow_upgrades[String(bow._id)];
        if (!saved) return;

        if (saved.fps !== undefined) bow.fps = saved.fps;
        if (saved.let_off !== undefined) bow.let = saved.let_off;
        if (saved.ata !== undefined) bow.ata = saved.ata;
        if (saved.bh !== undefined) bow.bh = saved.bh;
        if (saved.draw !== undefined) bow.draw = saved.draw;
        if (saved.dl !== undefined) bow.dl = saved.dl;
      });
    }

    // 🏹 Selecciones activas
    if (row.active_bow_id !== null) {
      const idx = (window.BOWS || []).findIndex(b => b._id === row.active_bow_id);
      if (idx >= 0) window.activeBow = idx;
    }

    if (row.active_archer_id) {
      const archer = (window.ARCHERS || []).find(a => a.id === row.active_archer_id);
      if (archer) window.selectedArcher = archer;
    }

    if (row.coach_id) {
      const coach = (window.COACHES || []).find(c => c.id === row.coach_id);
      if (coach) window.selectedCoach = coach;
    }

    // 🏆 Torneos
    if (Array.isArray(row.tournament_results)) {
      window.tournamentResults = row.tournament_results;
    }

    console.log('✅ Usuario cargado');

  } catch (e) {
    console.error('❌ Error cargando usuario:', e.message, e);
  }
}

// ─── INIT ─────────────────────────────────────────────
async function initSupabasePersistence() {
  await loadUserSelections();
  window.dispatchEvent(new CustomEvent('supabase-user-ready'));
}

// ─── GLOBALS ──────────────────────────────────────────
window.saveUserSelections = saveUserSelections;
window.loadUserSelections = loadUserSelections;
window.initSupabasePersistence = initSupabasePersistence;
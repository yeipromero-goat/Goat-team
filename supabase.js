// ── CONFIG ─────────────────────────────────────────────
const SUPABASE_URL = 'https://axaiyaflubssaghvhefe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YWl5YWZsdWJzc2FnaHZoZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjMwMzIsImV4cCI6MjA5MDQ5OTAzMn0.ur72JmEuh0KXp8Q9Eo7jF13kevxKaaDSZygR9wC3x6A';

// ── ESTADO GLOBAL ──────────────────────────────────────
window.APP_STATE = {
  archers: [],
  coaches: [],
  cards: [],
  bows: [],
  ready: false
};

// ── FETCH BASE ─────────────────────────────────────────
async function fetchSupabase(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error('Formato inválido');
  }

  return data;
}

// ── MAPPERS (SEPARACIÓN LIMPIA) ────────────────────────
const mappers = {

  archers: (a) => ({
    id: a.id,
    name: a.name || 'Sin nombre',
    rarity: a.rarity || 'common',
    role: a.role || '',
    quote: a.quote || '',

    T: a.t || 50,
    C: a.c || 50,
    E: a.e || 50,
    I: a.i || 50,
    FUE: a.f || 50,
    RES: a.r || 50,

    avatar: a.avatar || '',
    color: a.color || '#000',
    foto: a.foto || '',
    foto_position: a.foto_position || 'center center',

    ability: a.ability || '',
    abilityDesc: a.ability_desc || '',
    spec: a.spec || '',
    bio: a.bio || '',

    top: Array.isArray(a.top) ? a.top : []
  }),

  coaches: (c) => ({
    id: c.id,
    name: c.name || 'Sin nombre',
    rarity: c.rarity || 'common',
    role: c.role || '',
    quote: c.quote || '',

    T: c.t || 50,
    C: c.c || 50,
    E: c.e || 50,
    I: c.i || 50,
    FUE: c.f || 50,
    RES: c.r || 50,

    avatar: c.avatar || '',
    color: c.color || '#000',
    foto: c.foto || '',
    foto_position: c.foto_position || 'center center',

    ability: c.ability || '',
    abilityDesc: c.ability_desc || '',
    spec: c.spec || '',
    bio: c.bio || '',

    top: Array.isArray(c.top) ? c.top : [],
    certifications: c.certifications || [],
    experience_years: c.experience_years || 0,
    clubs: c.clubs || []
  }),

  cards: (c) => ({
    id: c.id,
    n: c.name || 'Sin nombre',
    cat: c.category || 'general',
    T: c.t || 0,
    C: c.c || 0,
    E: c.e || 0,
    I: c.i || 0,
    rarity: c.rarity || 'common'
  }),

  bows: (b) => ({
    id: b.id,
    name: b.name || 'Sin nombre',
    fps: b.fps || 280,
    ata: b.ata || 30,
    bh: b.bh || 6.5,
    let: b.let || 72,
    draw: b.draw || 60
  })
};

// ── LOADER GENÉRICO ────────────────────────────────────
async function loadResource(name, endpoint) {
  try {
    const data = await fetchSupabase(endpoint);
    APP_STATE[name] = data.map(mappers[name]);

    console.log(`✅ ${name} cargado:`, APP_STATE[name].length);

  } catch (e) {
    console.error(`❌ Error cargando ${name}:`, e.message);
    APP_STATE[name] = [];
  }
}

// ── INIT GLOBAL ────────────────────────────────────────
async function initAppData() {
  try {
    await Promise.all([
      loadResource('archers', 'archers?order=name'),
      loadResource('coaches', 'coaches?order=name'),
      loadResource('cards', 'cards?order=name'),
      loadResource('bows', 'bows?order=name')
    ]);

    // Mapear a variables legacy (compatibilidad con tu código actual)
    window.ARCHERS = APP_STATE.archers;
    window.COACHES = APP_STATE.coaches;
    window.CARDS   = APP_STATE.cards;
    window.BOWS    = APP_STATE.bows;

    // Render seguro
    if (typeof renderArcherCards === 'function') {
      renderArcherCards();
    }

    const coachDeck = document.getElementById('coach-deck');
    if (coachDeck && typeof buildCard === 'function') {
      coachDeck.innerHTML = COACHES.map(c => buildCard(c, 'coach')).join('');
    }

    if (typeof renderPList === 'function') {
      renderPList('');
    }

    APP_STATE.ready = true;
    console.log('🚀 App lista');

  } catch (e) {
    console.error('❌ Error inicializando app:', e);
  }
}

// ── START ──────────────────────────────────────────────
initAppData();
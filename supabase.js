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

  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Formato inválido');

  return data;
}

// ── MAPPERS ────────────────────────────────────────────
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
    foto: a.foto || '',
    foto_position: a.foto_position || 'center center',
    color: a.color || '#000',
    ability: a.ability || '',
    abilityDesc: a.ability_desc || '',
    spec: a.spec || 'all',
    bio: a.bio || '',
    top: a.top || []
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
    foto: c.foto || '',
    foto_position: c.foto_position || 'center center',
    color: c.color || '#000',
    ability: c.ability || '',
    abilityDesc: c.ability_desc || '',
    spec: c.spec || 'all',
    bio: c.bio || '',
    top: c.top || []
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
    model: b.model || '',
    fps: b.fps || 280,
    ata: b.ata || 30,
    bh: b.bh || 6.5,
    let: b.let_off || b.let || 72,
    draw: b.draw || 60,
    dl: b.dl || 28,
    ability_name: b.ability_name || '',
    ability_desc: b.ability_desc || ''
  })

};

// ── LOADER ─────────────────────────────────────────────
async function loadResource(name, endpoint) {
  try {
    const data = await fetchSupabase(endpoint);
    APP_STATE[name] = data.map(mappers[name]);
    console.log(`✅ ${name}:`, APP_STATE[name].length);
  } catch (e) {
    console.error(`❌ ${name}:`, e.message);
    APP_STATE[name] = [];
  }
}

// ── RENDERS ────────────────────────────────────────────

// ARCHERS
function renderArchers() {
  if (typeof renderArcherCards === 'function') {
    renderArcherCards();
  }
}

// COACHES
function renderCoaches() {
  const coachDeck = document.getElementById('coach-deck');
  if (coachDeck && typeof buildCard === 'function') {
    coachDeck.innerHTML = COACHES.map(c => buildCard(c, 'coach')).join('');
  }
}

// CARDS (ITEMS)
function renderCards() {
  const grid = document.getElementById('item-grid');
  if (!grid || !window.CARDS) return;

  grid.innerHTML = CARDS.map(c => `
    <div class="icard">
      <div class="ic-cat">${c.cat}</div>
      <div class="ic-name">${c.n}</div>
      <div class="ic-stats">
        ${c.T ? `<span class="ic-stat pos">T +${c.T}</span>` : ''}
        ${c.C ? `<span class="ic-stat pos">C +${c.C}</span>` : ''}
        ${c.E ? `<span class="ic-stat pos">E +${c.E}</span>` : ''}
        ${c.I ? `<span class="ic-stat pos">I +${c.I}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// BOWS
function renderBows() {
  const grid = document.getElementById('collection-grid-2');
  if (!grid || !window.BOWS) return;

  grid.innerHTML = BOWS.map(b => `
    <div class="icard">
      <div class="ic-name">${b.name}</div>
      <div class="ic-stats">
        <span class="ic-stat pos">FPS ${b.fps}</span>
        <span class="ic-stat pos">LET ${b.let}%</span>
      </div>
    </div>
  `).join('');
}

// MASTER
function renderAll() {
  renderArchers();
  renderCoaches();
  renderCards();
  renderBows();
}

// ── INIT ───────────────────────────────────────────────
async function initAppData() {
  try {
    await Promise.all([
      loadResource('archers', 'archers?order=name'),
      loadResource('coaches', 'coaches?order=name'),
      loadResource('cards', 'cards?order=name'),
      loadResource('bows', 'bows?order=name')
    ]);

    window.ARCHERS = APP_STATE.archers;
    window.COACHES = APP_STATE.coaches;
    window.CARDS   = APP_STATE.cards;
    window.BOWS    = APP_STATE.bows;

    console.log('📦 DATA READY');

    renderAll();

    APP_STATE.ready = true;

  } catch (e) {
    console.error('❌ INIT ERROR:', e);
  }
}

// ── START ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAppData);

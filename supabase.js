// ── supabase.js — Carga de datos desde Supabase
// Generado automáticamente desde app.js

// loadArchersFromSupabase y loadCoachesFromSupabase
// Depende de: ARCHERS, COACHES, renderArcherCards, buildCard (de app.js)

async function loadArchersFromSupabase() {
  const SUPABASE_URL = 'https://axaiyaflubssaghvhefe.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YWl5YWZsdWJzc2FnaHZoZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjMwMzIsImV4cCI6MjA5MDQ5OTAzMn0.ur72JmEuh0KXp8Q9Eo7jF13kevxKaaDSZygR9wC3x6A';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/archers?order=name`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    const data = await res.json();
    ARCHERS = data.map(a => ({
      id: a.id,
      name: a.name,
      rarity: a.rarity,
      role: a.role,
      quote: a.quote,
      T: a.t, C: a.c, E: a.e, I: a.i, f: a.f || 50, r: a.r || 50,
      avatar: a.avatar,
      color: a.color,
      foto: a.foto,
      foto_position: a.foto_position || 'center center',
      ability: a.ability,
      abilityDesc: a.ability_desc,
      spec: a.spec,
      bio: a.bio,
      top: Array.isArray(a.top) ? a.top : []
    }));
    renderArcherCards();
  } catch(e) {
    console.error('Error cargando arqueros:', e);
  }
}
async function loadCoachesFromSupabase() {
  const SUPABASE_URL = 'https://axaiyaflubssaghvhefe.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YWl5YWZsdWJzc2FnaHZoZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjMwMzIsImV4cCI6MjA5MDQ5OTAzMn0.ur72JmEuh0KXp8Q9Eo7jF13kevxKaaDSZygR9wC3x6A';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/coaches?order=name`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const data = await res.json();
    COACHES = data.map(c => ({
      id: c.id, name: c.name, rarity: c.rarity, role: c.role,
      quote: c.quote, T: c.t, C: c.c, E: c.e, I: c.i, f: c.f || 50, r: c.r || 50,
      avatar: c.avatar, color: c.color, foto: c.foto,
      foto_position: c.foto_position || 'center center',
      ability: c.ability, abilityDesc: c.ability_desc,
      spec: c.spec, bio: c.bio, top: c.top || [],
      certifications: c.certifications, experience_years: c.experience_years, clubs: c.clubs
    }));
    document.getElementById('coach-deck').innerHTML = COACHES.map(c=>buildCard(c,'coach')).join('');
  } catch(e) { console.error('Error cargando coaches:', e); }
}

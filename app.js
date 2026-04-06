// ── app.js — Lógica principal de GOAT TEAM
// Los datos estáticos están en data.js
// Las funciones de Supabase están en supabase.js
// Incluye estos scripts en el HTML en el orden: data.js → supabase.js → app.js


// ── TAB SWITCHING ─────────────────────────────────────────────────────────
function switchTab(id, el){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  el.classList.add('active');
}

// ── SCORING SYSTEM ────────────────────────────────────────────────────────

const MODS={indoor:{T:2,C:0,E:-13,I:-13,FUE:0,RES:0},outdoor:{T:-16,C:-13,E:2,I:-13,FUE:0,RES:0},field:{T:-13,C:-13,E:-13,I:-13,FUE:0,RES:0},'3d':{T:-13,C:-13,E:0,I:2,FUE:0,RES:0}};
const W={T:.36,C:.13,E:.13,I:.28,FUE:.06,RES:.04};
const SS=['T','C','E','I','FUE','RES'];
let comp='indoor', selCards=[], openSlot=null;
let playerDeck=[];
let activeCatFilter='all';
let envMods={T:0,C:0,E:0,I:0,FUE:0,RES:0};

function selComp(el){
  document.querySelectorAll('.comp-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel'); comp=el.dataset.comp; updateEnv();
}

function updateBars(){
  SS.forEach(s=>{
    ['a','c'].forEach(p=>{
      const v=Math.min(100,Math.max(0,parseInt(document.getElementById(p+'s-'+s).value)||0));
      document.getElementById(p+'b-'+s).style.width=v+'%';
      document.getElementById(p+'bn-'+s).textContent=v;
    });
  });
}

function updateEnv(){
  const wv=parseInt(document.getElementById('wind-slider').value)||0;
  const rv=parseInt(document.getElementById('rain-slider').value)||0;
  const tv=parseInt(document.getElementById('temp-slider').value)||2;
  const mult=ENV_COMP_MULT[comp]||1.0;
  const w=WIND_LEVELS[wv], r=RAIN_LEVELS[rv], t=TEMP_LEVELS[tv];

  document.getElementById('wind-val').textContent=w.label;
  document.getElementById('rain-val').textContent=r.label;
  document.getElementById('temp-val').textContent=t.label;

  function fmtImpact(lvl){
    if(mult===0) return 'Indoor: ambiente controlado, sin efecto';
    const delta=SS.map(s=>{
      const v=Math.round((lvl.T!==undefined?lvl[s]:0)*mult);
      return v!==0?`${v>0?'+':''}${v}${s}`:'';
    }).filter(Boolean).join('  ');
    return lvl.txt+(delta?' ['+delta+']':'');
  }

  const wi=document.getElementById('wind-impact');
  const ri=document.getElementById('rain-impact');
  const ti=document.getElementById('temp-impact');
  wi.className='env-impact '+w.cls; wi.textContent=fmtImpact(w);
  ri.className='env-impact '+r.cls; ri.textContent=fmtImpact(r);
  ti.className='env-impact '+t.cls; ti.textContent=fmtImpact(t);

  SS.forEach(s=>{ envMods[s]=Math.round((w[s]+r[s]+t[s])*mult); });

  const totalPen=SS.reduce((a,s)=>a+Math.min(0,envMods[s]),0);
  const note=document.getElementById('env-note');
  if(totalPen===0){
    note.className='env-note';
    note.textContent=mult===0?'Indoor: el clima no afecta el rendimiento.':'Condiciones perfectas — sin penalizacion ambiental.';
  } else {
    note.className='env-note active-note';
    const penalties=SS.map(s=>envMods[s]!==0?`${s}:${envMods[s]}`:'').filter(Boolean).join('  ');
    const label=mult===1.0?'Outdoor':mult===0.85?'Field':'3D';
    note.textContent=label+' — Penalizacion activa (x'+mult+') → '+penalties+'  |  Total impacto en score: '+Math.round(SS.reduce((a,s)=>a+envMods[s]*W[s],0))+' pts';
  }
  recalc();
}

function renderSlots(){
  const g=document.getElementById('cards-grid');
  if(!g) return;
  g.innerHTML='';
  for(let i=0;i<6;i++){
    const c=selCards[i];
    const div=document.createElement('div');
    div.className='cslot'+(c?' filled':'');
    div.addEventListener('click',()=>openPicker(i));
    if(c){
      const tags=SS.map(s=>c[s]!==0?`<span class="t${c[s]>0?'p':'m'}">${c[s]>0?'+':''}${c[s]}${s}</span>`:'').filter(Boolean).join('');
      const nm=document.createElement('div'); nm.className='cname2'; nm.textContent=c.n;
      const st=document.createElement('div'); st.className='cstats'; st.innerHTML=tags;
      const rm=document.createElement('div'); rm.className='cremove'; rm.textContent='x Quitar';
      rm.addEventListener('click',ev=>{ev.stopPropagation();selCards[i]=null;const pa2=document.getElementById('picker-area');if(pa2)pa2.innerHTML='';renderSlots();recalc();});
      div.appendChild(nm); div.appendChild(st); div.appendChild(rm);
    } else {
      const em=document.createElement('div'); em.className='cempty'; em.textContent='+ Carta '+(i+1);
      div.appendChild(em);
    }
    g.appendChild(div);
  }
  const ccEl=document.getElementById('card-count'); if(ccEl) ccEl.textContent='('+selCards.filter(Boolean).length+'/6)';
}

function openPicker(slot){
  openSlot=slot;
  const pa=document.getElementById('picker-area');
  if(!pa) return;
  pa.innerHTML='<div class="picker"><input class="psearch" id="psearch" type="text" placeholder="Buscar carta..." oninput="filterP()"/><div class="plist" id="plist"></div></div>';
  renderPList(''); document.getElementById('psearch').focus();
}

function renderPList(q){
  const used=selCards.filter(Boolean).map(c=>c.id);
  const items=CARDS.map((c,i)=>({...c,idx:i})).filter(c=>!used.includes(c.id)&&c.n.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('plist').innerHTML=items.map(c=>{
    const stKeys=['T','C','E','I','FUE','RES'];
    const st=stKeys.map(s=>c[s]!==0?`${c[s]>0?'+':''}${c[s]}${s==='FUE'?'F':s==='RES'?'R':s}`:'').filter(Boolean).join(' ');
    return `<div class="pitem" onclick="pickCard(${c.idx})"><span class="piname">${c.n}</span><span style="display:flex;gap:5px;align-items:center"><span class="pistats">${st}</span><span class="picat">${c.cat}</span></span></div>`;
  }).join('');
}

function filterP(){ renderPList(document.getElementById('psearch').value); }

function pickCard(idx){
  selCards[openSlot]=CARDS[idx];
  const pa=document.getElementById('picker-area');
  if(pa) pa.innerHTML='';
  renderSlots(); recalc();
}

function recalc(){
  const mods=MODS[comp], raw={T:0,C:0,E:0,I:0,FUE:0,RES:0};
  SS.forEach(s=>{
    const a=parseInt(document.getElementById('as-'+s).value)||0;
    const c=parseInt(document.getElementById('cs-'+s).value)||0;
    raw[s]=(a+c)/2+mods[s]+envMods[s];
  });
  selCards.filter(Boolean).forEach(c=>SS.forEach(s=>{if(c[s])raw[s]+=c[s];}));
  const fin={};
  SS.forEach(s=>{fin[s]=Math.min(100,Math.max(0,Math.round(raw[s])));});
  const score=Math.round(SS.reduce((a,s)=>a+fin[s]*W[s],0));
  SS.forEach(s=>{
    const bk=document.getElementById('bk-'+s); if(bk) bk.textContent=fin[s];
    const bkw=document.getElementById('bkw-'+s); if(bkw) bkw.textContent=Math.round(fin[s]*W[s])+' pts';
  });
  const fsEl = document.getElementById('final-score');
  const sgEl = document.getElementById('score-grade');
  const rlEl = document.getElementById('score-round-label');
  if(fsEl) fsEl.textContent = score;
  if(sgEl){
    sgEl.className='sgrade';
    if(score>=90){sgEl.textContent='S';sgEl.classList.add('gS');}
    else if(score>=75){sgEl.textContent='A';sgEl.classList.add('gA');}
    else if(score>=55){sgEl.textContent='B';sgEl.classList.add('gB');}
    else{sgEl.textContent='C';sgEl.classList.add('gC');}
  }
  if(rlEl && !gameState) rlEl.textContent = 'Setup';
}


// ── WEATHER SYSTEM ─────────────────────────────────────────────────────────
// Impact multipliers per competition type (indoor is sheltered, outdoor/field exposed)
const ENV_COMP_MULT={indoor:0.0, outdoor:1.0, field:0.85, '3d':0.5};

const WIND_LEVELS=[
  {label:'Sin viento',             T:0,   C:0,   E:0,   I:0,   cls:'neutral', txt:'Condiciones perfectas'},
  {label:'Viento leve 5-15 km/h',  T:-5,  C:-4,  E:-8,  I:-6,  cls:'warn',    txt:'-Tecnica punto de mira, -G.Estres concentracion'},
  {label:'Viento fuerte 15-30 km/h',T:-12, C:-8,  E:-18, I:-14, cls:'bad',     txt:'-- Deriva de flecha severa, estres alto'},
  {label:'Viento extremo 30+ km/h', T:-20, C:-14, E:-28, I:-22, cls:'bad',     txt:'-- Condicion critica: tiro casi imposible'},
];
const RAIN_LEVELS=[
  {label:'Sin lluvia',       T:0,   C:0,   E:0,   I:0,   cls:'neutral', txt:'Condiciones secas'},
  {label:'Llovizna',         T:-4,  C:-2,  E:-7,  I:-5,  cls:'warn',    txt:'-Grip soltador, -G.Estres visibilidad reducida'},
  {label:'Lluvia moderada',  T:-10, C:-5,  E:-16, I:-12, cls:'bad',     txt:'-- Equipo mojado, plumas afectadas, concentracion baja'},
  {label:'Tormenta',         T:-18, C:-10, E:-26, I:-20, cls:'bad',     txt:'-- Condicion extrema: visor, peep y grip comprometidos'},
];
const TEMP_LEVELS=[
  {label:'Frio extremo <5C',  T:-10, C:-5,  E:-8,  I:-7,  cls:'bad',  txt:'-- Musculatura rigida, grip comprometido, draw inconsistente'},
  {label:'Frio 5-15C',        T:-5,  C:-2,  E:-4,  I:-3,  cls:'warn', txt:'-Tension muscular afecta tecnica y anclaje'},
  {label:'Ideal 15-25C',      T:0,   C:0,   E:0,   I:0,   cls:'good', txt:'Condicion perfecta, sin penalizacion'},
  {label:'Calor 25-35C',      T:-4,  C:-2,  E:-8,  I:-6,  cls:'warn', txt:'-Fatiga temprana, sudor en grip, -G.Estres'},
  {label:'Calor extremo 35+C',T:-10, C:-6,  E:-18, I:-14, cls:'bad',  txt:'-- Fatiga severa, deshidratacion, concentracion critica'},
];
const DECK_SIZE     = 36;
let selectedArcher  = null;
let selectedCoach   = null;
let selectedBow     = null;
let selectedAbility = null; // índice en UNLOCKED_ABILITIES

// Habilidades desbloqueadas por el jugador (las del tab de Habilidades)


const SPEC_LABELS={indoor:"Indoor",outdoor:"Outdoor",field:"Field","3d":"3D",all:"All"};
const SPEC_COLORS={indoor:"#5a9fd8",outdoor:"#5dcaa5",field:"#d8d15a","3d":"#9a88dd",all:"#888880"};
const RARITY_PIPS={common:1,rare:2,epic:3,legend:4};

function dianaRings(){
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="90" fill="none" stroke="white" stroke-width="1"/>
    <circle cx="100" cy="100" r="70" fill="none" stroke="white" stroke-width="1"/>
    <circle cx="100" cy="100" r="50" fill="none" stroke="white" stroke-width="1"/>
    <circle cx="100" cy="100" r="32" fill="none" stroke="white" stroke-width="1"/>
    <circle cx="100" cy="100" r="16" fill="#d8d15a" opacity="0.5"/>
  </svg>`;
}

function buildCard(data, type){
  const pips = RARITY_PIPS[data.rarity];
  const pipHtml = Array.from({length:pips},()=>`<div class="pip"></div>`).join('');
  const specColor = SPEC_COLORS[data.spec]||'#888';
  const specLabel = SPEC_LABELS[data.spec]||data.spec;

  return `<div class="card ${type} ${data.rarity}" data-id="${data.id}" data-type="${type}" onclick="handleCardClick('${data.id}','${type}',event)">
    
    <!-- ⭐ FAVORITO -->
    <div 
      class="fav-btn"
      data-${type}-id="${data.id}"
      onclick="event.stopPropagation(); ${
        type === 'archer'
          ? `toggleFavoriteArcher('${data.id}')`
          : type === 'coach'
          ? `setFavoriteCoach('${data.id}')`
          : `setFavoriteCard('${data.id}')`
      }"
    >⭐</div>

    <div class="card-detail-btn" onclick="event.stopPropagation();openCardDetail('${data.id}','${type}')" title="Ver detalle" style="position:absolute;bottom:32px;right:6px;z-index:5;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.7);font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1">ⓘ</div>

    <div class="card-band"></div>
    <div class="card-rarity">${pipHtml}</div>
    <div class="card-type">${type==='archer'?'Arquero':'Coach'}</div>

    <div class="card-art">
      <div class="diana-bg">${dianaRings()}</div>
      <div class="avatar" style="background:${data.color}22;border-color:${data.color}55;overflow:hidden;padding:0">
        ${data.foto ? `<img src="https://axaiyaflubssaghvhefe.supabase.co/storage/v1/object/public/arqueros/${data.foto}.webp" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : `<span style="color:${data.color};font-family:'Bebas Neue';font-size:20px">${data.avatar}</span>`}
      </div>
      <img class="gt-logo" src="${LOGO}" alt="GT"/>
    </div>

    <div class="card-body">
      <div>
        <div class="card-name">${data.name}</div>
        <div class="card-role">${data.role}</div>
      </div>
      <div class="card-quote">"${data.quote}"</div>

      <div class="stats">
        <div class="stat-row">
          <span class="stat-label">TEC</span>
          <div class="stat-bar-wrap"><div class="stat-bar bar-T" style="width:${data.T}%"></div></div>
          <span class="stat-val">${data.T}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">COM</span>
          <div class="stat-bar-wrap"><div class="stat-bar bar-C" style="width:${data.C}%"></div></div>
          <span class="stat-val">${data.C}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">EST</span>
          <div class="stat-bar-wrap"><div class="stat-bar bar-E" style="width:${data.E}%"></div></div>
          <span class="stat-val">${data.E}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">IEM</span>
          <div class="stat-bar-wrap"><div class="stat-bar bar-I" style="width:${data.I}%"></div></div>
          <span class="stat-val">${data.I}</span>
        </div>
      </div>

      <div class="ability">
        <div class="ability-name">&#9670; ${data.ability}
          <span style="float:right;color:${specColor};font-size:7px">${specLabel}</span>
        </div>
        <div class="ability-desc">${data.abilityDesc}</div>
      </div>
    </div>

    <div class="card-footer">
      <span class="card-id">GT · ${data.id}</span>
      <span class="card-rarity-label">${data.rarity}</span>
    </div>
  </div>`;
}




// ── PERSON CARD SELECTION ─────────────────────────────────────────────────

// ── Guided pick flow state ────────────────────────────────────────
let guideMode = null; // null | 'archer' | 'coach' | 'items'

function goPickPerson(type) {
  guideMode = type;
  // Switch to cards tab
  const cardsTab = Array.from(document.querySelectorAll('.nav-tab'))
    .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes('cards'));
  if (cardsTab) switchTab('cards', cardsTab);
  // Switch to correct sub-tab
  const subId = type === 'archer' ? 'archers' : 'coaches';
  const subTab = Array.from(document.querySelectorAll('.sub-tab'))
    .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes(subId));
  if (subTab) switchSubTab(subId, subTab);
  // Show guide banner
  showGuideBanner(
    type === 'archer' ? 'Elige tu Arquero' : 'Elige tu Coach',
    type === 'archer' ? 'Toca la carta del arquero que quieres usar en esta partida'
                      : 'Toca la carta del coach que quieres usar en esta partida'
  );
}

function showGuideBanner(title, sub) {
  const b = document.getElementById('guide-banner');
  if (!b) return;
  document.getElementById('guide-title').textContent = title;
  document.getElementById('guide-sub').textContent   = sub;
  b.classList.add('show');
}

function dismissGuide() {
  guideMode = null;
  const b = document.getElementById('guide-banner');
  if (b) b.classList.remove('show');
}

function selectPersonCard(id, type) {
  const allData = type === 'archer' ? ARCHERS : COACHES;
  const data    = allData.find(x => x.id === id);
  if (!data) return;

  // Populate stats and mini card
  function fillPerson(prefix, role) {
    const nameEl = document.getElementById(prefix + 'name');
    if (nameEl) nameEl.value = data.name;
    ['T','C','E','I'].forEach(s => {
      const el = document.getElementById(prefix + 's-' + s);
      if (el) el.value = data[s];
    });
    // F y R
    const fEl = document.getElementById(prefix + 's-FUE');
    const rEl = document.getElementById(prefix + 's-RES');
    if (fEl) fEl.value = data.f || data.F || 50;
    if (rEl) rEl.value = data.r || data.R || 50;
    const emptyState  = document.getElementById(role + '-empty-state');
    const filledState = document.getElementById(role + '-filled-state');
    if (emptyState)  emptyState.style.display  = 'none';
    if (filledState) filledState.style.display = 'block';
    const av = document.getElementById(role + '-mini-avatar');
    if (av) {
      av.textContent      = data.avatar;
      av.style.background = data.color + '33';
      av.style.border     = '1.5px solid ' + data.color + '88';
      av.style.color      = data.color;
    }
    ['name','role','ability'].forEach(k => {
      const el = document.getElementById(role + '-mini-' + k);
      if (el) el.textContent = k === 'ability' ? '⬥ ' + data.ability : data[k];
    });
    const sp = document.getElementById(role + '-stats-preview');
    if (sp) {
      const lbl = {T:'Téc',C:'Com',E:'Est',I:'IEm'};
      sp.innerHTML = ['T','C','E','I'].map(s =>
        `<div class="ppc-stat"><span>${lbl[s]}</span><span class="sv">${data[s]}</span></div>`
      ).join('');
    }
  }

  if (type === 'archer') {
    if (selectedArcher && selectedArcher.id === data.id) { clearPersonCard('archer'); return; }
    selectedArcher = data;
    fillPerson('a', 'archer');
  } else {
    if (selectedCoach && selectedCoach.id === data.id)   { clearPersonCard('coach'); return; }
    selectedCoach = data;
    fillPerson('c', 'coach');
  }

  updateCardSelectionUI();
  updateBars(); recalc();

  // ── Guided flow: after selecting, go to next step ────────────────
  const wasGuided = guideMode !== null;
  dismissGuide();

  if (wasGuided) {
    if (type === 'archer' && !selectedCoach) {
      // Auto-advance: now pick coach
      setTimeout(() => goPickPerson('coach'), 300);
    } else if (type === 'coach' && !selectedArcher) {
      // Auto-advance: now pick archer
      setTimeout(() => goPickPerson('archer'), 300);
    } else if (selectedArcher && selectedCoach && playerDeck.length === 0) {
      // Both picked, no deck yet → go to items
      setTimeout(() => {
        const cardsTab = Array.from(document.querySelectorAll('.nav-tab'))
          .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes('cards'));
        if (cardsTab) switchTab('cards', cardsTab);
        const itemsTab = Array.from(document.querySelectorAll('.sub-tab'))
          .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes('items'));
        if (itemsTab) switchSubTab('items', itemsTab);
        showGuideBanner('Arma tu Deck', 'Selecciona 36 cartas para tu mazo y luego presiona "Aplicar al tablero"');
      }, 300);
    } else {
      // Both picked and deck exists → back to board
      setTimeout(() => {
        const scoreTab = Array.from(document.querySelectorAll('.nav-tab'))
          .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes('score'));
        if (scoreTab) switchTab('score', scoreTab);
      }, 300);
    }
  }
}

function clearPersonCard(type) {
  const prefix = type === 'archer' ? 'a' : 'c';
  if (type === 'archer') selectedArcher = null;
  else                   selectedCoach  = null;
  // Reset hidden inputs
  const nameEl = document.getElementById(prefix + 'name');
  if (nameEl) nameEl.value = '';
  ['T','C','E','I'].forEach(s => {
    const el = document.getElementById(prefix + 's-' + s);
    if (el) el.value = 50;
  });
  // Reset new card UI
  const emptyState  = document.getElementById(type + '-empty-state');
  const filledState = document.getElementById(type + '-filled-state');
  if (emptyState)  emptyState.style.display  = 'block';
  if (filledState) filledState.style.display = 'none';
  updateCardSelectionUI();
  updateBars(); recalc();
}

function updateCardSelectionUI() {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('selected-archer','selected-coach');
    const badge = card.querySelector('.sel-badge');
    if (badge) badge.remove();
  });
  if (selectedArcher) {
    const archerCards = document.querySelectorAll('#archer-deck .card');
    archerCards.forEach(card => {
      const nameEl = card.querySelector('.card-name');
      if (nameEl && nameEl.textContent.trim() === selectedArcher.name) {
        card.classList.add('selected-archer');
        const b = document.createElement('div');
        b.className = 'sel-badge archer-badge';
        b.textContent = '✓ Activo';
        card.appendChild(b);
      }
    });
  }
  if (selectedCoach) {
    const coachCards = document.querySelectorAll('#coach-deck .card');
    coachCards.forEach(card => {
      const nameEl = card.querySelector('.card-name');
      if (nameEl && nameEl.textContent.trim() === selectedCoach.name) {
        card.classList.add('selected-coach');
        const b = document.createElement('div');
        b.className = 'sel-badge coach-badge';
        b.textContent = '✓ Activo';
        card.appendChild(b);
      }
    });
  }
}





// Render decks


// ── SUB-TAB SWITCHING ────────────────────────────────────────────────────
function switchSubTab(id, el) {
  document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sub-' + id).classList.add('active');
}


function getAllCategories() {
  const cats = new Set(CARDS.map(c => c.cat));
  return ['all', ...Array.from(cats).sort()];
}

function renderItemFilters() {
  const cats = getAllCategories();
  const el = document.getElementById('item-filters');
  el.innerHTML = cats.map(cat =>
    `<div class="item-filter ${cat === activeCatFilter ? 'active' : ''}"
       onclick="setItemFilter('${cat}',this)">${cat === 'all' ? 'Todas (72)' : cat}</div>`
  ).join('');
}

function setItemFilter(cat, el) {
  activeCatFilter = cat;
  document.querySelectorAll('.item-filter').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  renderItemGrid();
}

function renderItemGrid() {
  const atLimit = playerDeck.length >= DECK_SIZE;
  const filtered = activeCatFilter === 'all'
    ? CARDS
    : CARDS.filter(c => c.cat === activeCatFilter);

  document.getElementById('item-grid').innerHTML = filtered.map(c => {
    const inDeck = playerDeck.includes(c.id);
    const limited = atLimit && !inDeck;
    const stats = ['T','C','E','I']
      .filter(s => c[s] !== 0)
      .map(s => `<span class="ic-stat ${c[s]>0?'pos':'neg'}">${c[s]>0?'+':''}${c[s]}${s}</span>`)
      .join('');
    return `<div class="icard ${inDeck?'in-deck':''} ${limited?'at-limit':''}"
      onclick="toggleDeckCard('${c.id}')">
      <div class="ic-cat">${c.cat}</div>
      <div class="ic-name">${c.n}</div>
      <div class="ic-stats">${stats}</div>
    </div>`;
  }).join('');
}

function toggleDeckCard(cardId) {
  const idx = playerDeck.indexOf(cardId);
  if (idx !== -1) {
    playerDeck.splice(idx, 1);
  } else {
    if (playerDeck.length >= DECK_SIZE) return;
    playerDeck.push(cardId);
  }
  updateDeckUI();
  renderItemGrid();
}

function updateDeckUI() {
  const count = playerDeck.length;
  const pct   = (count / DECK_SIZE * 100).toFixed(0);
  // Progress bar
  const bar = document.getElementById('db-bar');
  const cnt = document.getElementById('db-count');
  if (bar) bar.style.width = pct + '%';
  if (cnt) cnt.textContent = count + ' / ' + DECK_SIZE;
  // Counter badge on sub-tab
  const badge = document.getElementById('deck-counter');
  if (badge) {
    badge.textContent = count + '/' + DECK_SIZE;
    badge.classList.toggle('visible', count > 0);
  }
}

function clearDeck() {
  playerDeck = [];
  updateDeckUI();
  renderItemGrid();
}

function randomDeck() {
  playerDeck = [];
  const shuffled = [...CARDS].sort(() => Math.random() - 0.5);
  playerDeck = shuffled.slice(0, DECK_SIZE).map(c => c.id);
  updateDeckUI();
  renderItemGrid();
}

// ── APPLY DECK TO BOARD ──────────────────────────────────────────────────
function applyDeckToBoard() {
  if (playerDeck.length === 0) {
    alert('Tu deck está vacío. Agrega cartas primero.');
    return;
  }
  // Map playerDeck ids back to CARDS objects and fill the 6 scoring slots
  const deckCards = playerDeck.map(id => CARDS.find(c => c.id === id)).filter(Boolean);
  // Fill first 6 slots
  for (let i = 0; i < 6; i++) {
    selCards[i] = deckCards[i] || null;
  }
  renderSlots();
  recalc();
  // Switch to board
  const scoreTab = document.querySelectorAll('.nav-tab')[0];
  switchTab('score', scoreTab);
}

// ── INIT DECK BUILDER ────────────────────────────────────────────────────
function initDeckBuilder() {
  renderItemFilters();
  renderItemGrid();
  updateDeckUI();
}



// ══════════════════════════════════════════════════════════════════
// GAME ENGINE v2 — Score por ronda, suma total, flujo claro
// ══════════════════════════════════════════════════════════════════
const TOTAL_ROUNDS   = 6;
const HAND_SIZE      = 10;
const PLAY_PER_ROUND = 6;

let gameState = null;

// ── Grade helpers ─────────────────────────────────────────────────
function scoreGrade(s){
  return s>=90?'S':s>=75?'A':s>=55?'B':'C';
}
function gradeColor(g){
  return g==='S'?'var(--green)':g==='A'?'var(--blue)':g==='B'?'var(--yellow)':'var(--coral)';
}
function gradeDesc(g){
  return g==='S'?'¡Perfección total!':g==='A'?'Excelente rendimiento':g==='B'?'Buen intento':' Sigue entrenando';
}

// ── Setup checks ──────────────────────────────────────────────────
function updateSetupChecks() {
  const hasBow    = selectedBow    !== null;
  const hasArcher = selectedArcher !== null;
  const hasCoach  = selectedCoach  !== null;
  const deckCount = playerDeck.length;
  const ca = document.getElementById('chk-archer');
  if (!ca) return;
  const cbw = document.getElementById('chk-bow');
  if(cbw) cbw.className = 'dot '+(hasBow?'dot-ok':'dot-no');
  const cbwl = document.getElementById('chk-bow-lbl');
  if(cbwl) cbwl.textContent = hasBow?'✓ '+BOWS[selectedBow].name:'Arco no seleccionado';
  // Ability check label
  const cabl = document.getElementById('chk-ability-lbl');
  const cabd = document.getElementById('chk-ability');
  if (cabl) {
    if (selectedAbility === 'bow') {
      const bow = selectedBow !== null ? BOWS[selectedBow] : null;
      cabl.textContent = bow && bow.ability ? '⚡ ' + bow.ability.name + ' (del arco)' : 'Sin habilidad (opcional)';
    } else if (selectedAbility >= 0 && UNLOCKED_ABILITIES[selectedAbility]) {
      cabl.textContent = '⚡ ' + UNLOCKED_ABILITIES[selectedAbility].name + ' equipada';
    } else {
      cabl.textContent = 'Sin habilidad (opcional)';
    }
  }
  if(cabd) cabd.className = 'dot dot-ok';
  ca.className = 'dot '+(hasArcher?'dot-ok':'dot-no');
  document.getElementById('chk-coach').className = 'dot '+(hasCoach?'dot-ok':'dot-no');
  document.getElementById('chk-deck').className  = 'dot '+(deckCount>=PLAY_PER_ROUND?'dot-ok':'dot-no');
  document.getElementById('chk-archer-lbl').textContent = hasArcher?'✓ '+selectedArcher.name:'Arquero no seleccionado';
  document.getElementById('chk-coach-lbl').textContent  = hasCoach?'✓ '+selectedCoach.name:'Coach no seleccionado';
  document.getElementById('chk-deck-lbl').textContent   = deckCount>0?'✓ Deck listo ('+deckCount+' cartas)':'Deck vacío — ve a la pestaña Items';
  const btn = document.getElementById('btn-start-game');
  if(btn) btn.disabled = !(hasBow && hasArcher && hasCoach && deckCount>=PLAY_PER_ROUND);
}

// ── Ability selector in setup ────────────────────────────────────
// selectedAbility values:
//   null / -1  → ninguna
//   'bow'       → habilidad propia del arco (permanente, siempre activa si existe)
//   0,1,2,...   → índice en UNLOCKED_ABILITIES (de un solo uso del jugador)

function renderSetupAbilitySelector() {
  const container = document.getElementById('setup-ability-selector');
  if (!container) return;

  const bow = (selectedBow !== null && selectedBow !== undefined) ? BOWS[selectedBow] : null;
  const bowAbility = bow && bow.ability ? bow.ability : null;

  let html = '';

  // ── Ninguna ──
  const selNone = (selectedAbility === -1 || selectedAbility === null);
  html += `<div class="setup-bow-card ${selNone?'selected':''}" onclick="selectSetupAbility(-1)" style="
    border:1.5px solid ${selNone?'var(--yellow)':'var(--border2)'};
    background:${selNone?'rgba(216,209,90,0.08)':'var(--surface)'};
    border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;
  ">
    <div style="font-size:18px;margin-bottom:3px">🚫</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:var(--muted);letter-spacing:.04em">Sin habilidad</div>
    <div style="font-size:9px;color:var(--hint);margin-top:3px">Solo stats base</div>
  </div>`;

  // ── Habilidad del arco (permanente, vinculada al arco) ──
  if (bowAbility) {
    const selBow = selectedAbility === 'bow';
    // Map bow ability to UNLOCKED_ABILITIES bonus by name match
    const matchedAb = UNLOCKED_ABILITIES.find(a => a.name === bowAbility.name);
    const bonusParts = matchedAb
      ? Object.entries(matchedAb.bonus).filter(([,v])=>v!==0).map(([k,v])=>`${v>0?'+':''}${v}${k}`).join(' ')
      : '';
    html += `<div class="setup-bow-card ${selBow?'selected':''}" onclick="selectSetupAbility('bow')" style="
      border:1.5px solid ${selBow?'var(--yellow)':'var(--border2)'};
      background:${selBow?'rgba(216,209,90,0.12)':'var(--surface)'};
      border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;position:relative;
    ">
      <div style="position:absolute;top:6px;right:7px;font-size:8px;padding:1px 5px;border-radius:4px;background:rgba(216,209,90,.15);color:var(--yellow);font-weight:600">DEL ARCO</div>
      <div style="font-size:18px;margin-bottom:3px">⚡</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:${selBow?'var(--yellow)':'var(--text)'};letter-spacing:.04em">${bowAbility.name}</div>
      <div style="font-size:9px;color:var(--muted);margin-top:2px">Permanente · del arco</div>
      ${bonusParts ? `<div style="font-size:10px;color:var(--yellow);margin-top:4px;font-weight:600">${bonusParts}</div>` : ''}
    </div>`;
  } else if (bow) {
    // Bow exists but has no ability
    html += `<div style="border:1px dashed var(--border);border-radius:10px;padding:10px;opacity:.4;font-size:10px;color:var(--hint);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
      <div style="font-size:16px">🏹</div>
      <div>Sin habilidad en este arco</div>
    </div>`;
  } else {
    html += `<div style="border:1px dashed var(--border);border-radius:10px;padding:10px;opacity:.3;font-size:10px;color:var(--hint);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
      <div style="font-size:16px">🏹</div>
      <div>Selecciona un arco primero</div>
    </div>`;
  }

  // ── Habilidades desbloqueadas del jugador (de un solo uso) ──
  UNLOCKED_ABILITIES.filter(ab => ab.oneShot).forEach((ab, i) => {
    const sel = selectedAbility === i;
    const bonusParts = Object.entries(ab.bonus).filter(([,v])=>v!==0).map(([k,v])=>`${v>0?'+':''}${v}${k}`).join(' ');
    html += `<div class="setup-bow-card ${sel?'selected':''}" onclick="selectSetupAbility(${i})" style="
      border:1.5px solid ${sel?'var(--purple)':'var(--border2)'};
      background:${sel?'rgba(154,136,221,0.08)':'var(--surface)'};
      border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;
    ">
      <div style="font-size:18px;margin-bottom:3px">${ab.icon}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:${sel?'var(--purple)':'var(--text)'};letter-spacing:.04em">${ab.name}</div>
      <div style="font-size:9px;color:var(--muted);margin-top:2px">${ab.rarity} · 1 uso</div>
      <div style="font-size:10px;color:var(--purple);margin-top:4px;font-weight:600">${bonusParts}</div>
    </div>`;
  });

  container.innerHTML = html;
}

function selectSetupAbility(idx) {
  selectedAbility = idx; // -1/null = ninguna, 'bow' = del arco, número = UNLOCKED_ABILITIES
  renderSetupAbilitySelector();
  const lbl = document.getElementById('chk-ability-lbl');
  const dot = document.getElementById('chk-ability');
  if (idx === -1 || idx === null) {
    if(lbl) lbl.textContent = 'Sin habilidad (opcional)';
  } else if (idx === 'bow') {
    const bow = selectedBow !== null ? BOWS[selectedBow] : null;
    if(lbl) lbl.textContent = bow && bow.ability ? '⚡ ' + bow.ability.name + ' (del arco)' : 'Sin habilidad (opcional)';
  } else {
    const ab = UNLOCKED_ABILITIES[idx];
    if(lbl) lbl.textContent = '⚡ ' + ab.name + ' equipada';
  }
  if(dot) dot.className = 'dot dot-ok';
}

// ── Bow selector in setup ─────────────────────────────────────────
function renderSetupBowSelector() {
  const container = document.getElementById('setup-bow-selector');
  if (!container) return;
  container.innerHTML = BOWS.map((b, i) => {
    const sel = selectedBow === i;
    const fps_bonus = Math.round((b.fps - 280) / 8);
    const let_bonus = Math.round((b.let - 72) / 2);
    return `<div class="setup-bow-card ${sel ? 'selected' : ''}" onclick="selectSetupBow(${i})" style="
      border:1.5px solid ${sel ? 'var(--yellow)' : 'var(--border2)'};
      background:${sel ? 'rgba(216,209,90,0.08)' : 'var(--surface)'};
      border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;
    ">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${sel ? 'var(--yellow)' : 'var(--text)'};letter-spacing:.04em">${b.name}</div>
      <div style="font-size:9px;color:var(--muted);margin-top:2px">${b.model}</div>
      <div style="font-size:10px;margin-top:6px;color:var(--muted)">
        <span style="color:var(--blue)">${b.fps}fps</span> · 
        <span style="color:var(--green)">${b.let}% let</span> · 
        <span style="color:var(--yellow)">${b.draw}lbs</span>
      </div>
      <div style="font-size:9px;margin-top:4px;color:var(--hint)">
        Bono: T${fps_bonus > 0 ? '+' : ''}${fps_bonus} / C${let_bonus > 0 ? '+' : ''}${let_bonus}
      </div>
    </div>`;
  }).join('');
}

function selectSetupBow(idx) {
  selectedBow = idx;
  // Auto-select bow's own ability if it has one, otherwise reset to none
  const bow = BOWS[idx];
  if (bow && bow.ability) {
    selectedAbility = 'bow';
  } else {
    selectedAbility = -1;
  }
  renderSetupBowSelector();
  renderSetupAbilitySelector();
  const b = BOWS[idx];
  const infoEl = document.getElementById('chk-bow-info');
  if (infoEl) {
    infoEl.style.display = 'block';
    infoEl.innerHTML = `🏹 <strong>${b.name}</strong> — ${b.model} · Habilidad: ${b.ability ? b.ability.name : 'Ninguna'}. Sus stats afectarán tu puntuación final.`;
  }
  updateSetupChecks();
}

// ── Start game ────────────────────────────────────────────────────
function startGame() {
  if(!selectedArcher||!selectedCoach||selectedBow===null) return;
  const deckCards = playerDeck.map(id=>CARDS.find(c=>c.id===id)).filter(Boolean);
  if(deckCards.length < PLAY_PER_ROUND){ alert('Necesitas al menos '+PLAY_PER_ROUND+' cartas en tu deck.'); return; }
  const shuffled = [...deckCards].sort(()=>Math.random()-.5);
  const hand = shuffled.splice(0, HAND_SIZE);
  const roundConditions = generateRoundConditions();
  gameState = { phase:'playing', round:1, deck:shuffled, hand, played:[], roundScores:[], discardPile:[], drawnCard:null, conditions: roundConditions, pendingDiscards:[], bowIdx: selectedBow, abilityIdx: selectedAbility };
  document.getElementById('game-setup-panel').style.display = 'none';
  document.getElementById('game-active').style.display      = 'block';
  document.getElementById('game-end').style.display         = 'none';
  applyRoundConditions(roundConditions[0]);
  showRoundConditions(1, roundConditions[0]);
  renderGameUI();
  startRoundTimer();
}

// ── Main render ───────────────────────────────────────────────────
function renderGameUI() {
  if(!gameState) return;
  const gs = gameState;

  // HUD pills
  const rnEl  = document.getElementById('hud-round-num');
  const pcEl  = document.getElementById('hud-played-count');
  const drEl  = document.getElementById('hud-deck-remain');
  const hcEl  = document.getElementById('hud-hand-count');
  const phEl  = document.getElementById('hud-phase-label');
  const hlEl  = document.getElementById('hand-label-count');
  const drlEl = document.getElementById('deck-remain-label');
  if(!rnEl) return;
  rnEl.textContent  = gs.round;
  pcEl.textContent  = gs.played.length+' / '+PLAY_PER_ROUND+' jugadas';
  drEl.textContent  = 'Deck: '+gs.deck.length;
  hcEl.textContent  = 'Mano: '+gs.hand.length;
  if(hlEl) hlEl.textContent = '('+gs.hand.length+')';
  if(drlEl) drlEl.textContent = 'Deck: '+gs.deck.length;

  const maxEx = gameState ? Math.min(3, gameState.deck.length) : 3;
  const phaseText = {
    playing:'50M / FOCUS — elige tus 6 cartas y cierra la ronda',
    draw:'Fase de intercambio...',
    discard: maxEx > 0
      ? 'Intercambio: descarta hasta ' + maxEx + ' carta(s) y roba las mismas del deck'
      : 'Sin cartas en el deck — continúa sin intercambiar',
    end:'Partida terminada'
  };
  if(phEl) phEl.textContent = phaseText[gs.phase]||'';

  // End round button
  const btnEnd = document.getElementById('btn-end-round');
  if(btnEnd){
    const canEnd = gs.phase==='playing' && gs.played.length===PLAY_PER_ROUND;
    btnEnd.disabled  = !canEnd;
    btnEnd.textContent = canEnd ? 'Cerrar ronda →' : 'Cerrar ronda ('+gs.played.length+'/'+PLAY_PER_ROUND+')';
  }

  // Live score bar
  renderLiveScore();

  // Show/hide phase blocks
  const showBlock = (id, show) => {
    const el = document.getElementById(id);
    if(el) el.style.display = show ? 'block' : 'none';
  };
  showBlock('phase-playing', gs.phase==='playing');
  showBlock('phase-hand',    gs.phase==='playing');
  showBlock('phase-draw',    gs.phase==='draw');
  showBlock('phase-discard', gs.phase==='discard');
  // Show timer only during playing phase
  if (gs.phase !== 'playing') hideTimerDisplay();
  showBlock('phase-banner',  false);

  if(gs.phase==='playing')   renderPlayingPhase();
  if(gs.phase==='draw')      renderDrawPhase();
  if(gs.phase==='discard')   renderDiscardPhase();

  // Round history
  if(gs.roundScores.length>0){
    document.getElementById('round-history-wrap').style.display='block';
    const rh = document.getElementById('round-history');
    if(rh){
      const best = Math.max(...gs.roundScores);
      rh.innerHTML = gs.roundScores.map((s,i)=>
        `<div class="round-badge ${s===best?'best':''}" style="font-size:10px;padding:4px 10px">
          R${i+1}: <strong style="font-family:'Bebas Neue',sans-serif;font-size:14px">${s}</strong>
        </div>`).join('');
    }
  }
}

// ── Live score bar ────────────────────────────────────────────────
function renderLiveScore(){
  const gs = gameState;
  const score = calcCurrentScore();
  const grade = scoreGrade(score);
  const color = gradeColor(grade);

  // Big score + grade (now in the unified scorebox)
  const fsEl = document.getElementById('final-score');
  const sgEl = document.getElementById('score-grade');
  const rlEl = document.getElementById('score-round-label');
  if(fsEl) fsEl.textContent = score;
  if(sgEl){
    sgEl.className = 'sgrade g' + grade;
    sgEl.textContent = grade;
  }
  if(rlEl) rlEl.textContent = gs ? 'Ronda '+gs.round+' en vivo' : '';

  // Breakdown by stat
  const fin = calcStatBreakdown();
  SS.forEach(s => {
    const bkEl  = document.getElementById('bk-'+s);
    const bkwEl = document.getElementById('bkw-'+s);
    if(bkEl)  bkEl.textContent  = fin[s];
    if(bkwEl) bkwEl.textContent = Math.round(fin[s]*W[s])+' pts';
  });

  // Round history pills
  const hist = document.getElementById('rsb-history');
  if(hist && gs && gs.roundScores.length>0){
    const best  = Math.max(...gs.roundScores);
    const total = gs.roundScores.reduce((a,b)=>a+b,0);
    hist.innerHTML = gs.roundScores.map((s,i)=>{
      const g = scoreGrade(s);
      const c = gradeColor(g);
      return `<div class="rsb-item ${s===best?'best':''}" style="${s===best?'border-color:'+c:''}">
        <strong style="${s===best?'color:'+c:''}">${s}</strong>
        <span>R${i+1}·${g}</span>
      </div>`;
    }).join('');
    const totalEl  = document.getElementById('rsb-total');
    const totalNum = document.getElementById('rsb-total-num');
    if(totalEl)  totalEl.style.display = 'block';
    if(totalNum) totalNum.textContent  = total+' pts acumulados / '+(gs.round-1)+' rondas';
  }
}

// Helper: compute per-stat final values
function calcStatBreakdown(){
  const mods = MODS[comp], raw = {T:0,C:0,E:0,I:0,FUE:0,RES:0};
  SS.forEach(s=>{
    const a = parseInt(document.getElementById('as-'+s).value)||0;
    const c = parseInt(document.getElementById('cs-'+s).value)||0;
    raw[s] = (a+c)/2 + mods[s] + envMods[s];
  });
  const cards = gameState ? gameState.played.filter(Boolean) : selCards.filter(Boolean);
  cards.forEach(c => SS.forEach(s => { if(c[s]) raw[s] += c[s]; }));
  // BOW BONUS: el arco seleccionado agrega un bono basado en sus stats
  const bowIdx = gameState ? gameState.bowIdx : selectedBow;
  if (bowIdx !== null && bowIdx !== undefined && BOWS[bowIdx]) {
    const bow = BOWS[bowIdx];
    raw['T'] += Math.round((bow.fps - 280) / 8);
    raw['C'] += Math.round((bow.let - 72) / 2);
    raw['E'] += Math.round((bow.ata - 30) / 2) + Math.round((bow.bh - 6.5) * 2);
    raw['I'] += Math.round((bow.draw - 60) / 5) + Math.round((bow.dl - 28) / 0.5);
  }
  // ABILITY BONUS
  const abIdx = gameState ? gameState.abilityIdx : selectedAbility;
  if (abIdx === 'bow') {
    // Habilidad del arco: buscar en UNLOCKED_ABILITIES por nombre
    const bowIdx2 = gameState ? gameState.bowIdx : selectedBow;
    const bow2 = (bowIdx2 !== null && bowIdx2 !== undefined) ? BOWS[bowIdx2] : null;
    if (bow2 && bow2.ability) {
      const matchedAb = UNLOCKED_ABILITIES.find(a => a.name === bow2.ability.name);
      if (matchedAb) SS.forEach(s => { raw[s] += matchedAb.bonus[s] || 0; });
    }
  } else if (abIdx !== null && abIdx !== undefined && abIdx >= 0 && UNLOCKED_ABILITIES[abIdx]) {
    const ab = UNLOCKED_ABILITIES[abIdx];
    SS.forEach(s => { raw[s] += ab.bonus[s] || 0; });
  }
  const fin = {};
  SS.forEach(s => { fin[s] = Math.min(100, Math.max(0, Math.round(raw[s]))); });
  return fin;
}

// ── Playing phase ─────────────────────────────────────────────────
function renderPlayingPhase(){
  const gs = gameState;

  // Played slots
  const pg = document.getElementById('played-grid');
  if(!pg) return;
  pg.innerHTML='';
  for(let i=0;i<PLAY_PER_ROUND;i++){
    const c = gs.played[i];
    const div = document.createElement('div');
    div.className = 'played-slot'+(c?' filled':'');
    if(c){
      const stats = ['T','C','E','I'].filter(s=>c[s]!==0)
        .map(s=>`<span>${c[s]>0?'+':''}${c[s]}${s}</span>`).join(' ');
      div.innerHTML = `<div class="ps-name">${c.n}</div><div class="ps-stats">${stats}</div>`;
      const rm = document.createElement('div');
      rm.className='ps-remove'; rm.textContent='× quitar';
      rm.onclick = ()=>{ gs.played.splice(i,1); syncBoard(); renderGameUI(); };
      div.appendChild(rm);
    } else {
      div.innerHTML=`<div class="played-slot-empty">Slot ${i+1}</div>`;
    }
    pg.appendChild(div);
  }

  // Hint
  const hint = document.getElementById('played-hint');
  if(hint){
    hint.textContent = gs.played.length<PLAY_PER_ROUND
      ? (PLAY_PER_ROUND-gs.played.length)+' cartas más — mantén el foco'
      : '¡Listo! Estándar alto — cierra la ronda';
    hint.style.color = gs.played.length===PLAY_PER_ROUND?'var(--green)':'var(--hint)';
  }

  // Hand
  const hg = document.getElementById('hand-grid');
  if(!hg) return;
  hg.innerHTML='';
  gs.hand.forEach((c,idx)=>{
    const played = gs.played.some(p=>p&&p.id===c.id);
    const full   = !played && gs.played.length>=PLAY_PER_ROUND;
    const div = document.createElement('div');
    div.className = 'hcard'+(played?' played':'')+(full?' at-limit':'');
    const stats = ['T','C','E','I'].filter(s=>c[s]!==0)
      .map(s=>`<span class="${c[s]>0?'hstat-p':'hstat-n'}">${c[s]>0?'+':''}${c[s]}${s}</span>`).join('');
    div.innerHTML = `<div class="hcard-cat">${c.cat}</div><div class="hcard-name">${c.n}</div><div class="hcard-stats">${stats}</div>`;
    div.onclick = ()=>{
      if(played){ const pi=gs.played.findIndex(p=>p&&p.id===c.id); if(pi!==-1){ gs.played.splice(pi,1); syncBoard(); renderGameUI(); } }
      else if(!full){ gs.played.push(c); syncBoard(); renderGameUI(); }
    };
    hg.appendChild(div);
  });
}

// ── Draw phase ────────────────────────────────────────────────────
function renderDrawPhase(){
  const gs = gameState;
  const nameEl   = document.getElementById('draw-card-name');
  const remainEl = document.getElementById('draw-deck-remain');
  if(nameEl)   nameEl.textContent   = gs.drawnCard ? gs.drawnCard.n : '—';
  if(remainEl) remainEl.textContent = gs.deck.length;
}

// ── Discard phase ─────────────────────────────────────────────────
function renderDiscardPhase(){
  const gs = gameState;
  if(!gs) return;
  const pending   = gs.pendingDiscards || [];
  const maxDiscard = Math.min(3, gs.deck.length);

  // Update counters
  const selCount  = document.getElementById('discard-selected-count');
  const deckCount = document.getElementById('discard-deck-count');
  if(selCount)  selCount.textContent  = pending.length;
  if(deckCount) deckCount.textContent = gs.deck.length;

  // Update confirm button
  const btnConfirm = document.getElementById('btn-confirm-discard');
  if(btnConfirm){
    if(pending.length > 0){
      btnConfirm.textContent = '↻ Confirmar: descartar ' + pending.length + ' y robar ' + Math.min(pending.length, gs.deck.length);
      btnConfirm.classList.add('has-selection');
    } else {
      btnConfirm.textContent = '→ Continuar sin intercambiar';
      btnConfirm.classList.remove('has-selection');
    }
  }

  // Render hand cards
  const grid = document.getElementById('discard-hand-grid');
  if(!grid) return;
  grid.innerHTML = '';
  gs.hand.forEach((c, idx) => {
    const isSelected = pending.includes(idx);
    const atMax      = !isSelected && pending.length >= maxDiscard;
    const div = document.createElement('div');
    div.className = 'hcard' + (isSelected ? ' selected-discard' : '') + (atMax ? ' at-limit' : '');
    const stats = ['T','C','E','I'].filter(s=>c[s]!==0)
      .map(s=>`<span class="${c[s]>0?'hstat-p':'hstat-n'}">${c[s]>0?'+':''}${c[s]}${s}</span>`).join('');
    div.innerHTML = `<div class="hcard-cat">${c.cat}</div><div class="hcard-name">${c.n}</div><div class="hcard-stats">${stats}</div>`;
    if(!atMax || isSelected) div.onclick = () => discardCard(idx);
    grid.appendChild(div);
  });

  // Deck empty notice
  if(gs.deck.length === 0){
    const notice = document.createElement('div');
    notice.style.cssText = 'grid-column:1/-1;font-size:11px;color:var(--hint);padding:8px;text-align:center';
    notice.textContent = 'Deck vacío — no puedes robar cartas esta ronda.';
    grid.appendChild(notice);
  }
}

// ── Sync played cards to score board ─────────────────────────────
function syncBoard(){
  selCards = [...gameState.played];
  while(selCards.length<PLAY_PER_ROUND) selCards.push(null);
  recalc();
}

// ── End round button ──────────────────────────────────────────────
function endRound(forced){
  if(!gameState||gameState.phase!=='playing') return;
  // Si no es forzado por el timer, exigir las 6 cartas
  if(!forced && gameState.played.length<PLAY_PER_ROUND) return;
  stopRoundTimer();
  // Save round score (con las cartas que haya)
  const score = calcCurrentScore();
  gameState.roundScores.push(score);
  // Si es la última ronda, terminar directamente sin fase de descarte
  if(gameState.round >= TOTAL_ROUNDS){
    lockConditionUI(false);
    hideTimerDisplay();
    endGame();
    return;
  }
  // De lo contrario, ir a la fase de intercambio
  gameState.pendingDiscards = [];
  gameState.phase = 'discard';
  renderGameUI();
}

// ── confirmDraw is no longer used but keep as no-op ───────────────
function confirmDraw(){ confirmDiscard(); }

// ── Toggle a card for discard selection ───────────────────────────
function discardCard(handIdx){
  if(!gameState||gameState.phase!=='discard') return;
  const MAX_DISCARD = Math.min(3, gameState.deck.length);
  const pending = gameState.pendingDiscards;
  const already = pending.indexOf(handIdx);
  if(already !== -1){
    // Deselect
    pending.splice(already, 1);
  } else {
    if(pending.length >= MAX_DISCARD) return; // max reached
    pending.push(handIdx);
  }
  renderDiscardPhase();
}

// ── Confirm exchange: discard selected, draw same count ───────────
function confirmDiscard(){
  if(!gameState) return;
  const pending = gameState.pendingDiscards || [];
  // Sort descending so splicing doesn't shift indices
  const sorted = [...pending].sort((a,b) => b-a);
  const discarded = [];
  sorted.forEach(idx => {
    const c = gameState.hand.splice(idx, 1)[0];
    discarded.push(c);
    gameState.discardPile.push(c);
    gameState.played = gameState.played.filter(p => p && p.id !== c.id);
  });
  // Draw same number from deck
  const drawCount = Math.min(discarded.length, gameState.deck.length);
  for(let i = 0; i < drawCount; i++){
    gameState.hand.push(gameState.deck.shift());
  }
  gameState.pendingDiscards = [];
  // Next round or end
  if(gameState.round >= TOTAL_ROUNDS){
    lockConditionUI(false);
    endGame();
  } else {
    gameState.round++;
    gameState.played = [];
    gameState.phase = 'playing';
    const nextCond = gameState.conditions[gameState.round - 1];
    applyRoundConditions(nextCond);
    showRoundConditions(gameState.round, nextCond);
    renderGameUI();
    startRoundTimer();
  }
}

// ── Calc score using played cards ─────────────────────────────────
function calcCurrentScore(){
  const mods=MODS[comp], raw={T:0,C:0,E:0,I:0,FUE:0,RES:0};
  SS.forEach(s=>{
    const a=parseInt(document.getElementById('as-'+s).value)||0;
    const c=parseInt(document.getElementById('cs-'+s).value)||0;
    raw[s]=(a+c)/2+mods[s]+envMods[s];
  });
  if(gameState) gameState.played.filter(Boolean).forEach(c=>SS.forEach(s=>{if(c[s])raw[s]+=c[s];}));
  else selCards.filter(Boolean).forEach(c=>SS.forEach(s=>{if(c[s])raw[s]+=c[s];}));
  const fin={};
  SS.forEach(s=>{fin[s]=Math.min(100,Math.max(0,Math.round(raw[s])));});
  return Math.round(SS.reduce((a,s)=>a+fin[s]*W[s],0));
}

// ── End game ──────────────────────────────────────────────────────
function endGame(){
  gameState.phase='end';
  document.getElementById('game-active').style.display='none';
  document.getElementById('game-end').style.display='block';
  onGameEndHook();
  const scores  = gameState.roundScores;
  const total   = scores.reduce((a,b)=>a+b,0);
  const best    = Math.max(...scores);
  const worst   = Math.min(...scores);
  const avg     = Math.round(total/scores.length);
  const grade   = scoreGrade(avg);
  const color   = gradeColor(grade);
  document.getElementById('end-total-score').textContent = total;
  document.getElementById('end-total-score').style.color = color;
  // Grade box
  const gl = document.getElementById('end-grade-letter');
  const gd = document.getElementById('end-grade-desc');
  if(gl){ gl.textContent=grade; gl.style.color=color; }
  if(gd){ gd.textContent=gradeDesc(grade)+' — promedio '+avg+' pts/ronda'; }
  // Bar: max is 6*100=600
  const barFill = document.getElementById('end-bar-fill');
  if(barFill) setTimeout(()=>{ barFill.style.width=(total/600*100).toFixed(1)+'%'; },100);
  // Round detail
  const rd = document.getElementById('end-rounds-detail');
  if(rd) rd.innerHTML = scores.map((s,i)=>{
    const g=scoreGrade(s); const c=gradeColor(g);
    return `<div class="er-item ${s===best?'best-round':''}">
      <span class="er-num" style="color:${c}">${s}</span>
      Ronda ${i+1} · ${g}${s===best?' ★':''}${s===worst&&scores.length>1?' ↓':''}
    </div>`;
  }).join('');
  // Also update the main scorebox grade
  recalc();
}

// ── Resign ────────────────────────────────────────────────────────
function resignGame(){
  if(!confirm('¿Abandonar la partida actual?')) return;
  resetGame();
}

// ── Reset ─────────────────────────────────────────────────────────
function resetGame(){
  gameState=null; selCards=[];
  lockConditionUI(false);
  hideRoundConditions();
  stopRoundTimer();
  hideTimerDisplay();
  document.getElementById('game-setup-panel').style.display='block';
  document.getElementById('game-active').style.display='none';
  document.getElementById('game-end').style.display='none';
  recalc(); updateSetupChecks();
}

// ── Hook person selection → update setup checks ───────────────────
const _origSelectPersonCard = selectPersonCard;
selectPersonCard = function(id,type){ _origSelectPersonCard(id,type); updateSetupChecks(); };
const _origClearPersonCard = clearPersonCard;
clearPersonCard = function(type){ _origClearPersonCard(type); updateSetupChecks(); };
const _origToggleDeckCard = toggleDeckCard;
toggleDeckCard = function(cardId){ _origToggleDeckCard(cardId); updateSetupChecks(); };
const _origClearDeck = clearDeck;
clearDeck = function(){ _origClearDeck(); updateSetupChecks(); };
const _origRandomDeck = randomDeck;
randomDeck = function(){ _origRandomDeck(); updateSetupChecks(); };


// ══════════════════════════════════════════════════════════════════
// ROUND RANDOMIZER — sortea condiciones cada ronda
// ══════════════════════════════════════════════════════════════════

const COMP_KEYS   = ['indoor','outdoor','field','3d'];
const COMP_NAMES  = {indoor:'Indoor',outdoor:'Outdoor',field:'Field','3d':'3D'};
const COMP_ICONS  = {indoor:'🏛️',outdoor:'🌿',field:'🏔️','3d':'🌲'};

// Pre-generate ALL 6 rounds at game start so player can't reload-fish
function generateRoundConditions() {
  return Array.from({length: TOTAL_ROUNDS}, (_, i) => {
    // Round 1 is always gentler (tutorial-ish)
    const windMax  = i === 0 ? 1 : 3;
    const rainMax  = i === 0 ? 1 : 3;
    const tempMin  = i === 0 ? 1 : 0;
    const tempMax  = i === 0 ? 3 : 4;
    return {
      comp: COMP_KEYS[Math.floor(Math.random() * COMP_KEYS.length)],
      wind: Math.floor(Math.random() * (windMax + 1)),
      rain: Math.floor(Math.random() * (rainMax + 1)),
      temp: tempMin + Math.floor(Math.random() * (tempMax - tempMin + 1)),
    };
  });
}

function applyRoundConditions(cond) {
  // Set competition
  comp = cond.comp;
  document.querySelectorAll('.comp-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.comp === cond.comp);
  });

  // Set weather sliders (values only — oninput locked)
  const ws = document.getElementById('wind-slider');
  const rs = document.getElementById('rain-slider');
  const ts = document.getElementById('temp-slider');
  if(ws) ws.value = cond.wind;
  if(rs) rs.value = cond.rain;
  if(ts) ts.value = cond.temp;

  // Recalc env mods
  updateEnv();

  // Lock the UI
  lockConditionUI(true);
}

function lockConditionUI(locked) {
  const cg = document.getElementById('comp-grid-wrap');
  const clb = document.getElementById('comp-lock-badge');
  const elb = document.getElementById('env-lock-badge');

  if(cg)  cg.classList.toggle('game-locked', locked);
  if(clb) clb.style.display = locked ? 'inline-block' : 'none';
  if(elb) elb.style.display = locked ? 'inline-block' : 'none';

  // Disable sliders
  ['wind-slider','rain-slider','temp-slider'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.disabled = locked;
  });
}

function showRoundConditions(round, cond) {
  const wrap = document.getElementById('round-conditions');
  if(!wrap) return;

  const mult   = ENV_COMP_MULT[cond.comp] || 1.0;
  const w      = WIND_LEVELS[cond.wind];
  const r      = RAIN_LEVELS[cond.rain];
  const t      = TEMP_LEVELS[cond.temp];

  // Total env penalty on score
  const envPenalty = Math.round(
    SS.reduce((acc, s) => acc + Math.round((w[s]+r[s]+t[s])*mult) * W[s], 0)
  );

  const compMod = MODS[cond.comp];
  const compImpact = SS.map(s => compMod[s] !== 0
    ? `<span style="color:${compMod[s]>0?'var(--green)':'var(--coral)'}">${compMod[s]>0?'+':''}${compMod[s]}${s}</span>`
    : '').filter(Boolean).join(' ');

  function impactClass(lvl) {
    return lvl.cls === 'bad' ? 'bad' : lvl.cls === 'warn' ? 'warn' : lvl.cls === 'good' ? 'good' : 'neutral';
  }

  const warningLevel = (-envPenalty) + (cond.comp === 'field' ? 5 : 0);
  const warningHtml = warningLevel >= 15
    ? `<div class="rc-warning">⚠️ Condiciones difíciles — el ambiente penalizará hasta <strong>${envPenalty} pts</strong> en tu score. Elige cartas de gestión mental.</div>`
    : warningLevel >= 8
    ? `<div class="rc-warning" style="border-color:var(--yellow);background:rgba(216,209,90,.08)">⚡ Condiciones moderadas — penalización estimada de <strong>${envPenalty} pts</strong>.</div>`
    : '';

  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="round-conditions">
      <div class="rc-header">
        <div class="rc-title">&#127922; Condiciones — Ronda ${round}</div>
        <div class="rc-round-badge">${round} / ${TOTAL_ROUNDS}</div>
      </div>
      <div class="rc-grid">
        <div class="rc-item">
          <div class="rc-item-icon">${COMP_ICONS[cond.comp]}</div>
          <div class="rc-item-label">Competencia</div>
          <div class="rc-item-val" style="color:var(--yellow)">${COMP_NAMES[cond.comp]}</div>
          <div class="rc-item-impact ${compImpact ? 'warn' : 'neutral'}">${compImpact || '—'}</div>
        </div>
        <div class="rc-item">
          <div class="rc-item-icon">🌬️</div>
          <div class="rc-item-label">Viento</div>
          <div class="rc-item-val">${w.label}</div>
          <div class="rc-item-impact ${impactClass(w)}">${cond.wind === 0 ? '—' : w.txt.slice(0,35)}</div>
        </div>
        <div class="rc-item">
          <div class="rc-item-icon">🌧️</div>
          <div class="rc-item-label">Lluvia</div>
          <div class="rc-item-val">${r.label}</div>
          <div class="rc-item-impact ${impactClass(r)}">${cond.rain === 0 ? '—' : r.txt.slice(0,35)}</div>
        </div>
        <div class="rc-item">
          <div class="rc-item-icon">🌡️</div>
          <div class="rc-item-label">Temperatura</div>
          <div class="rc-item-val">${t.label}</div>
          <div class="rc-item-impact ${impactClass(t)}">${cond.temp === 2 ? '—' : t.txt.slice(0,35)}</div>
        </div>
      </div>
      ${warningHtml}
    </div>
  `;
}

function hideRoundConditions() {
  const wrap = document.getElementById('round-conditions');
  if(wrap) wrap.style.display = 'none';
}
function renderArcherCards() {
  document.getElementById('archer-deck').innerHTML = ARCHERS.map(a=>buildCard(a,'archer')).join('');
}

// — INIT —
// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  updateBars(); updateEnv(); renderSlots(); recalc();
  initDeckBuilder();
  updateSetupChecks();
  // Arco module init
  renderBowProfile();
  renderSetupBowSelector();
  renderSetupAbilitySelector();
// Deck & board init
loadArchersFromSupabase();
loadCoachesFromSupabase();
  // Pack overlay
  document.getElementById('pack-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeOverlay();
  });
});


/* ── ARCO MODULE JS ── */

// ── DATA ──


const STAT_COSTS = {fps:5,let:8,ata:6,draw:7,bh:5,dl:6};
const STAT_LIMITS = {fps:[240,360],let:[60,95],ata:[20,46],draw:[40,90],bh:[5.5,8.5],dl:[24,32]};
const STAT_STEPS = {fps:4,let:2,ata:1,draw:5,bh:0.5,dl:0.5};
const STAT_UNITS = {fps:'fps',let:'%',ata:'"',draw:'lbs',bh:'"',dl:'"'};

let activeBow = 0;
let points = 15;
let upgradeHistory = [
  {stat:'FPS +4', date:'Torneo Zacatecas · hace 3 días'},
  {stat:'Let Off +2%', date:'Torneo CDMX Élite · hace 12 días'},
  {stat:'Eje a Eje +1"', date:'Copa Nacional · hace 1 mes'},
];

const USED_CODES = new Set(['GOAT-1234-ABCD','TEST-CODE-DEMO']);
const VALID_CODES = {
  'PROX-DEMO-2025':{type:'ability',name:'Estabilizador Elite Físico',icon:'⚡',rarity:'rare'},
  'CUER-NITR-0001':{type:'ability',name:'Cuerda Nitro Física',icon:'🎯',rarity:'epic'},
  'PUNT-TORN-0050':{type:'points',amount:50,icon:'⭐'},
  'ARCO-PHAN-X007':{type:'bow',name:'PHANTOM X-7 Especial',icon:'🏹',rarity:'legend'},
};

// ── STAT DISPLAY ──
function calcPercent(stat, val) {
  const [min, max] = STAT_LIMITS[stat];
  return Math.round(((val - min) / (max - min)) * 100);
}

function renderBowProfile() {
  const b = BOWS[activeBow];
  document.getElementById('bow-name-display').textContent = b.name;
  document.getElementById('bow-model-display').textContent = b.model;

  const stats = ['fps','let','ata','draw','bh','dl'];
  stats.forEach(s => {
    document.getElementById('sv-' + s).textContent = b[s];
    document.getElementById('sf-' + s).style.width = calcPercent(s, b[s]) + '%';
  });

  // Ability
  const abs = document.getElementById('bow-ability-section');
  if (b.ability) {
    abs.style.display = '';
    document.getElementById('bow-ability-name').textContent = b.ability.name;
    document.getElementById('bow-ability-desc').textContent = b.ability.desc;
    const badge = document.getElementById('ability-used-badge');
    const btn = document.getElementById('btn-use-ability');
    if (b.ability.used) {
      badge.style.display = '';
      btn.style.opacity = '.4';
      btn.style.cursor = 'not-allowed';
      btn.disabled = true;
    } else {
      badge.style.display = 'none';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.disabled = false;
    }
  } else {
    abs.style.display = 'none';
  }

  renderUpgradeButtons();
  renderHistory();
  renderCollection();
  // Render collection in Mi Arco tab
  const grid2 = document.getElementById('collection-grid-2');
  if (grid2) {
    grid2.innerHTML = BOWS.map((b, i) => `
      <div class="bow-card ${activeBow === i ? 'active-bow' : ''}" onclick="selectBow(${i})">
        <div class="bow-card-name">${b.name}</div>
        <div class="bow-card-model">${b.model}</div>
        <div class="bow-card-stats">
          <div class="bow-mini-stat"><strong>${b.fps}</strong> fps</div>
          <div class="bow-mini-stat"><strong>${b.let}</strong>% LetOff</div>
          <div class="bow-mini-stat"><strong>${b.ata}"</strong> AxA</div>
          <div class="bow-mini-stat"><strong>${b.draw}</strong> lbs</div>
        </div>
      </div>
    `).join('');
  }
}

function renderUpgradeButtons() {
  const stats = ['fps','let','ata','draw','bh','dl'];
  stats.forEach(s => {
    const btn = document.getElementById('upg-' + s);
    const b = BOWS[activeBow];
    const [min, max] = STAT_LIMITS[s];
    if (b[s] >= max || points < STAT_COSTS[s]) {
      btn.classList.add('disabled');
    } else {
      btn.classList.remove('disabled');
    }
  });
  document.getElementById('tournament-points').textContent = points;
}

function renderHistory() {
  const list = document.getElementById('upgrade-history-list');
  list.innerHTML = upgradeHistory.slice().reverse().map(h =>
    `<div class="history-item"><span class="history-stat">${h.stat}</span><span class="history-date">${h.date}</span></div>`
  ).join('');
  document.getElementById('upgrade-history-section').style.display = upgradeHistory.length ? '' : 'none';
}

function renderCollection() {
  const cards = document.querySelectorAll('.bow-card');
  cards.forEach((c, i) => {
    if (i < BOWS.length) {
      c.classList.toggle('active-bow', i === activeBow);
    }
  });
}

// ── UPGRADE ──
function upgradeStat(stat) {
  const b = BOWS[activeBow];
  const cost = STAT_COSTS[stat];
  const [min, max] = STAT_LIMITS[stat];
  const step = STAT_STEPS[stat];

  if (points < cost) { showToast('Puntos insuficientes','error'); return; }
  if (b[stat] >= max) { showToast('Stat al máximo','error'); return; }

  points -= cost;
  b[stat] = Math.min(max, parseFloat((b[stat] + step).toFixed(1)));
  b.xp += cost * 30;
  if (b.xp >= b.level * 1000) { b.xp -= b.level * 1000; b.level++; }

  const labels = {fps:'FPS',let:'Let Off',ata:'Eje a Eje',draw:'Draw Weight',bh:'Brace Height',dl:'Draw Length'};
  upgradeHistory.push({stat:`${labels[stat]} +${step}${STAT_UNITS[stat]}`, date:'Ahora'});

  renderBowProfile();
  showToast(`✅ ${labels[stat]} mejorado · -${cost} pts`, 'success');
}

// ── SELECT BOW ──
function selectBow(idx) {
  if (idx >= BOWS.length) return;
  activeBow = idx;
  renderBowProfile();
  switchTab('mi-arco', document.querySelector('.nav-tab'));
  document.querySelectorAll('.nav-tab')[0].click();
  showToast(`🏹 ${BOWS[idx].name} activado`);
}

// ── USE ABILITY ──
function useAbility() {
  const b = BOWS[activeBow];
  if (!b.ability || b.ability.used) return;
  b.ability.used = true;
  renderBowProfile();
  showToast('⚡ Habilidad activada para este torneo');
}

// ── EQUIP ABILITY ──
function equipAbility(idx) {
  showToast('✅ Habilidad equipada en ' + BOWS[activeBow].name);
}

// ── CODE REDEMPTION ──
function formatCode(el) {
  let v = el.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  let parts = [];
  for (let i = 0; i < v.length && parts.join('').length + parts.length < 12; i += 4) {
    parts.push(v.slice(i, i+4));
  }
  el.value = parts.join('-').slice(0,14);
}

function redeemCode() {
  const raw = document.getElementById('code-input').value.trim().toUpperCase();
  const fb = document.getElementById('code-feedback');

  if (raw.length < 14) {
    fb.className = 'code-feedback error';
    fb.textContent = 'Código incompleto. Formato: XXXX-XXXX-XXXX';
    return;
  }
  if (USED_CODES.has(raw)) {
    fb.className = 'code-feedback error';
    fb.textContent = '❌ Este código ya fue canjeado. Los códigos son de uso único.';
    return;
  }

  const reward = VALID_CODES[raw];
  if (!reward) {
    fb.className = 'code-feedback error';
    fb.textContent = '❌ Código inválido. Verifica que esté escrito correctamente.';
    return;
  }

  USED_CODES.add(raw);
  document.getElementById('code-input').value = '';

  if (reward.type === 'points') {
    points += reward.amount;
    renderUpgradeButtons();
    fb.className = 'code-feedback success';
    fb.textContent = `✅ +${reward.amount} puntos de torneo desbloqueados.`;
    showToast(`⭐ +${reward.amount} puntos de torneo`,'success');
  } else {
    fb.className = 'code-feedback success';
    fb.textContent = `✅ ${reward.icon} "${reward.name}" desbloqueada y añadida a tu colección.`;
    showToast(`${reward.icon} Tarjeta desbloqueada: ${reward.name}`,'success');
  }

  setTimeout(() => { fb.style.display = 'none'; }, 5000);
}

// ── PACK PREVIEW ──
const PACK_PREVIEWS = {
  basic: {
    title:'Sobre Básico',sub:'Contenido de muestra (3 cartas comunes)',
    cards:[
      {icon:'🔩',name:'Peso de Limpieza',type:'Accesorio · Común'},
      {icon:'🎯',name:'+2 FPS (Básico)',type:'Mejora Stats · Común',rarity:'common'},
      {icon:'🧵',name:'Cuerda Estándar',type:'Equipo · Común',rarity:'common'},
    ]
  },
  pro: {
    title:'Sobre Pro',sub:'Contenido de muestra (5 cartas, 1 rara garantizada)',
    cards:[
      {icon:'⚡',name:'Estabilizador V2',type:'Habilidad · Rara',rarity:'rare'},
      {icon:'🔩',name:'+1" Eje a Eje',type:'Mejora Stats · Rara',rarity:'rare'},
      {icon:'🎯',name:'+6 FPS Pro',type:'Mejora Stats · Común'},
      {icon:'🧵',name:'Cuerda Fastflight',type:'Equipo · Común'},
      {icon:'⭐',name:'+10 Puntos Extra',type:'Bonus · Común'},
    ]
  },
  legend: {
    title:'Sobre Leyenda',sub:'Contenido de muestra (7 cartas, 1 épica garantizada)',
    cards:[
      {icon:'🏹',name:'VORTEX PRO',type:'Arco Nuevo · Épico',rarity:'epic'},
      {icon:'🔥',name:'Cam System Elite',type:'Habilidad · Épica',rarity:'epic'},
      {icon:'⚡',name:'+5% Let Off',type:'Mejora Stats · Rara',rarity:'rare'},
      {icon:'🎯',name:'+12 FPS Nitro',type:'Mejora Stats · Rara',rarity:'rare'},
      {icon:'🔩',name:'Estabilizador 3er Eje',type:'Habilidad · Rara',rarity:'rare'},
      {icon:'🧵',name:'Cuerda Élite +8fps',type:'Equipo · Común'},
      {icon:'⭐',name:'+25 Puntos Torneo',type:'Bonus · Común'},
    ]
  }
};

function openPackPreview(type) {
  const data = PACK_PREVIEWS[type];
  document.getElementById('overlay-title').textContent = data.title;
  document.getElementById('overlay-sub').textContent = data.sub;
  const rarityMap = {rare:'rarity-rare',epic:'rarity-epic',legend:'rarity-legend'};
  document.getElementById('overlay-cards').innerHTML = data.cards.map(c => `
    <div class="pack-reveal-card">
      <div class="prc-icon">${c.icon}</div>
      <div class="prc-info"><div class="prc-name">${c.name}</div><div class="prc-type">${c.type}</div></div>
      ${c.rarity ? `<span class="prc-rarity ${rarityMap[c.rarity]||'rarity-rare'}">${c.rarity||'rara'}</span>` : ''}
    </div>`).join('');
  document.getElementById('pack-overlay').style.display = 'flex';
}

function closeOverlay() {
  document.getElementById('pack-overlay').style.display = 'none';
}

// ── TAB SWITCHER ──
function switchTab(id, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  if (el) el.classList.add('active');
}

// ── TOAST ──
let toastTimer;
function showToast(msg, type='') {
  const t = document.getElementById('toast-msg');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); }, 2800);
}





// ══════════════════════════════════════════════════════════════════
// TORNEO MULTIJUGADOR — Sistema de sala local con localStorage
// ══════════════════════════════════════════════════════════════════

const TRN_STORAGE_KEY = 'goat_tournament_rooms';
let activeTournamentId = null;
let myTournamentName   = null;
let myScoreSubmitted   = false;

// ── Genera ID único estilo GOAT-XXXX ──
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'GOAT-';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── Lee/escribe rooms en localStorage ──
function readRooms() {
  try { return JSON.parse(localStorage.getItem(TRN_STORAGE_KEY) || '{}'); } catch(e) { return {}; }
}
function writeRooms(rooms) {
  try { localStorage.setItem(TRN_STORAGE_KEY, JSON.stringify(rooms)); } catch(e) {}
}
function getRoom(id) {
  return readRooms()[id] || null;
}
function saveRoom(room) {
  const rooms = readRooms();
  rooms[room.id] = room;
  writeRooms(rooms);
}

// ── Crear sala ──
function createTournament() {
  const name = (document.getElementById('trn-player-name').value || '').trim();
  if (!name) { showToast('⚠️ Escribe tu nombre de arquero'); return; }
  const id = generateRoomId();
  const room = {
    id,
    createdAt: Date.now(),
    participants: [{ name, score: null, submitted: false }],
  };
  saveRoom(room);
  activeTournamentId = id;
  myTournamentName   = name;
  myScoreSubmitted   = false;
  renderTournamentRoom();
  showToast('🏆 Sala ' + id + ' creada');
}

// ── Unirse a sala ──
function joinTournament() {
  const name = (document.getElementById('trn-join-name').value || '').trim();
  const id   = (document.getElementById('trn-join-id').value  || '').trim().toUpperCase();
  const errEl = document.getElementById('trn-join-error');
  if (!name) { errEl.textContent = 'Escribe tu nombre.'; errEl.style.display='block'; return; }
  if (!id)   { errEl.textContent = 'Ingresa el ID de sala.'; errEl.style.display='block'; return; }
  const room = getRoom(id);
  if (!room) { errEl.textContent = 'Sala ' + id + ' no encontrada. Verifica el ID.'; errEl.style.display='block'; return; }
  errEl.style.display = 'none';
  // Check not duplicate
  if (room.participants.some(p => p.name === name)) {
    errEl.textContent = 'El nombre "' + name + '" ya está en esta sala.'; errEl.style.display='block'; return;
  }
  room.participants.push({ name, score: null, submitted: false });
  saveRoom(room);
  activeTournamentId = id;
  myTournamentName   = name;
  myScoreSubmitted   = false;
  renderTournamentRoom();
  showToast('✅ Te uniste a ' + id);
}

// ── Salir de sala ──
function leaveTournament() {
  if (!activeTournamentId) return;
  const room = getRoom(activeTournamentId);
  if (room) {
    room.participants = room.participants.filter(p => p.name !== myTournamentName);
    if (room.participants.length === 0) {
      const rooms = readRooms(); delete rooms[activeTournamentId]; writeRooms(rooms);
    } else saveRoom(room);
  }
  activeTournamentId = null;
  myTournamentName   = null;
  myScoreSubmitted   = false;
  document.getElementById('tournament-lobby').style.display = '';
  document.getElementById('tournament-room').style.display  = 'none';
  showToast('Saliste de la sala');
}

// ── Copiar ID de sala ──
function copyRoomId() {
  if (!activeTournamentId) return;
  try { navigator.clipboard.writeText(activeTournamentId); } catch(e) {}
  showToast('📋 ID copiado: ' + activeTournamentId);
}

// ── Enviar puntuación al torneo ──
function submitTournamentScore() {
  if (!activeTournamentId || !myTournamentName) return;
  if (!gameState || gameState.phase !== 'end') {
    showToast('⚠️ Termina la partida antes de enviar'); return;
  }
  const totalScore = gameState.roundScores.reduce((a, b) => a + b, 0);
  const room = getRoom(activeTournamentId);
  if (!room) { showToast('Error: sala no encontrada'); return; }
  const p = room.participants.find(p => p.name === myTournamentName);
  if (p) { p.score = totalScore; p.submitted = true; }
  saveRoom(room);
  myScoreSubmitted = true;
  document.getElementById('trn-submit-wrap').style.display = 'none';
  renderTournamentRoom();
  showToast('📤 Puntuación enviada: ' + totalScore + ' pts');
}

// ── Render sala activa ──
function renderTournamentRoom() {
  document.getElementById('tournament-lobby').style.display = 'none';
  document.getElementById('tournament-room').style.display  = '';

  const room = getRoom(activeTournamentId);
  if (!room) return;

  // Room ID badge
  document.getElementById('trn-room-id-badge').textContent = room.id;
  document.getElementById('trn-count').textContent = room.participants.length;

  // Participants pills
  const pList = document.getElementById('trn-participants-list');
  pList.innerHTML = room.participants.map(p => {
    const isMe = p.name === myTournamentName;
    const submitted = p.submitted;
    return `<div style="
      font-size:11px;padding:4px 10px;border-radius:20px;
      border:1px solid ${isMe ? 'var(--yellow)' : 'var(--border2)'};
      background:${isMe ? 'rgba(216,209,90,.1)' : 'var(--surface2)'};
      color:${isMe ? 'var(--yellow)' : 'var(--text)'};
      display:flex;align-items:center;gap:5px;
    ">
      ${submitted ? '✅' : '⏳'} ${p.name}${isMe ? ' (tú)' : ''}
      ${p.score !== null ? `<strong style="color:var(--green)">${p.score}</strong>` : ''}
    </div>`;
  }).join('');

  // Leaderboard (show when 2+ participants have submitted)
  const submitted = room.participants.filter(p => p.submitted);
  const lbWrap = document.getElementById('trn-leaderboard-wrap');
  if (submitted.length >= 2) {
    lbWrap.style.display = '';
    const sorted = [...submitted].sort((a, b) => b.score - a.score);
    const medals = ['🥇','🥈','🥉'];
    const lb = document.getElementById('trn-leaderboard');
    lb.innerHTML = sorted.map((p, i) => {
      const isMe = p.name === myTournamentName;
      const isFirst = i === 0;
      return `<div style="
        display:flex;align-items:center;gap:10px;
        padding:8px 12px;border-radius:8px;
        background:${isFirst ? 'rgba(216,209,90,.08)' : isMe ? 'rgba(90,159,216,.06)' : 'var(--surface2)'};
        border:1px solid ${isFirst ? 'rgba(216,209,90,.3)' : 'var(--border)'};
      ">
        <div style="font-size:18px;min-width:24px">${medals[i] || '#'+(i+1)}</div>
        <div style="flex:1;font-size:12px;font-weight:${isFirst?'600':'400'};color:${isFirst?'var(--yellow)':isMe?'var(--blue)':'var(--text)'}">
          ${p.name}${isMe ? ' (tú)' : ''}
        </div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:${isFirst?'var(--yellow)':'var(--text)'}">
          ${p.score}<span style="font-size:10px;color:var(--muted);font-family:'DM Sans',sans-serif"> pts</span>
        </div>
      </div>`;
    }).join('');

    // Winner reward: 5+ participants, 1st place gets skill point
    const rewardEl = document.getElementById('trn-winner-reward');
    const MIN_FOR_REWARD = 5;
    if (submitted.length >= MIN_FOR_REWARD) {
      const winner = sorted[0];
      const isWinner = winner.name === myTournamentName;
      rewardEl.style.display = '';
      if (isWinner) {
        rewardEl.innerHTML = `🎖️ <strong>¡Ganaste el torneo!</strong> Con ${submitted.length} arqueros compitiendo, recibes <strong>+1 Punto de Habilidad</strong> para tu arco. Ve a "Mi Arco" y úsalo en mejoras.`;
        // Actually grant the point
        points += 1;
        const ptEl = document.getElementById('tournament-points');
        if (ptEl) ptEl.textContent = points;
        showToast('🎖️ +1 Punto de Habilidad ganado — ¡1er lugar!');
      } else {
        rewardEl.innerHTML = `🏆 Torneo con ${submitted.length} arqueros — El 1er lugar (<strong>${sorted[0].name}</strong>) gana +1 Punto de Habilidad.`;
      }
    } else if (submitted.length > 0) {
      rewardEl.style.display = '';
      rewardEl.style.color = 'var(--muted)';
      rewardEl.innerHTML = `ℹ️ Se necesitan mínimo ${MIN_FOR_REWARD} arqueros para otorgar el Premio de Habilidad. (${submitted.length}/${MIN_FOR_REWARD} listos)`;
    }
  } else {
    lbWrap.style.display = 'none';
  }

  // Show submit button if game ended and not yet submitted
  const submitWrap = document.getElementById('trn-submit-wrap');
  const gameEnded = gameState && gameState.phase === 'end';
  submitWrap.style.display = (gameEnded && !myScoreSubmitted) ? '' : 'none';
}

// ── Refresh tournament room periodically (simulates real-time) ──
setInterval(() => {
  if (activeTournamentId) renderTournamentRoom();
}, 4000);

// ── Show submit button when game ends ──
const _origShowGameEnd = typeof showGameEnd === 'function' ? showGameEnd : null;
// Hook into game end — called from endRound when round===TOTAL_ROUNDS
function onGameEndHook() {
  if (activeTournamentId) {
    const submitWrap = document.getElementById('trn-submit-wrap');
    if (submitWrap && !myScoreSubmitted) submitWrap.style.display = '';
  }
}



// ══════════════════════════════════════════════════════════════════
// TEMPORIZADOR DE RONDA — 40 segundos por ronda de juego
// ══════════════════════════════════════════════════════════════════
const ROUND_TIMER_SECS = 40;
let roundTimerInterval = null;
let roundTimerRemaining = 0;

function startRoundTimer() {
  stopRoundTimer(); // clear any existing
  roundTimerRemaining = ROUND_TIMER_SECS;
  updateTimerDisplay();
  roundTimerInterval = setInterval(() => {
    roundTimerRemaining--;
    updateTimerDisplay();
    if (roundTimerRemaining <= 0) {
      stopRoundTimer();
      // Auto-close round with whatever cards are played
      if (gameState && gameState.phase === 'playing') {
        showToast('⏰ Tiempo agotado — disciplina es también saber cuándo soltar.');
        endRound(true);
      }
    }
  }, 1000);
}

function stopRoundTimer() {
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
    roundTimerInterval = null;
  }
}

function updateTimerDisplay() {
  const pill = document.getElementById('hud-timer-pill');
  if (!pill) return;
  const secs = roundTimerRemaining;
  pill.textContent = '⏱ ' + secs;
  if (secs > 15) {
    pill.style.borderColor = 'rgba(255,255,255,0.16)';
    pill.style.color       = 'var(--text)';
    pill.style.background  = '';
  } else if (secs > 8) {
    pill.style.borderColor = 'var(--yellow)';
    pill.style.color       = 'var(--yellow)';
    pill.style.background  = 'rgba(216,209,90,0.08)';
  } else {
    pill.style.borderColor = 'var(--coral)';
    pill.style.color       = 'var(--coral)';
    pill.style.background  = 'rgba(216,120,80,0.12)';
  }
}

function hideTimerDisplay() {
  const pill = document.getElementById('hud-timer-pill');
  if (!pill) return;
  pill.textContent = '';
  pill.style.borderColor = 'transparent';
  pill.style.background  = 'transparent';
}


// ══════════════════════════════════════════════════════════════════
// CARD DETAIL MODAL
// ══════════════════════════════════════════════════════════════════
const RARITY_COLORS  = { legend:'#d8d15a', epic:'#9a88dd', rare:'#5a9fd8', common:'#888880' };
const RARITY_LABELS  = { legend:'Leyenda', epic:'Épica', rare:'Rara', common:'Común' };
const STAT_META = [
  { key:'T', label:'Técnica',           color:'#5a9fd8' },
  { key:'C', label:'Competitividad',    color:'#5dcaa5' },
  { key:'E', label:'G. Estrés',         color:'#9a88dd' },
  { key:'I', label:'Int. Emocional',    color:'#d87850' },
];

let _cdmCurrentId   = null;
let _cdmCurrentType = null;

function openCardDetail(id, type) {
  const data = (type === 'archer' ? ARCHERS : COACHES).find(d => d.id === id);
  if (!data) return;
  _cdmCurrentId   = id;
  _cdmCurrentType = type;

  const rarityColor = RARITY_COLORS[data.rarity] || '#888';
  const specColor   = SPEC_COLORS[data.spec] || '#888';
  const specLabel   = SPEC_LABELS[data.spec] || data.spec;

  // Band
  document.getElementById('cdm-band').style.background = rarityColor;

 // Banner + Avatar
const banner = document.getElementById('cdm-banner');
const av = document.getElementById('cdm-avatar');
if (data.foto) {
  banner.style.backgroundImage = `url('https://axaiyaflubssaghvhefe.supabase.co/storage/v1/object/public/arqueros/${data.foto}.webp')`;
  banner.style.backgroundSize = 'cover';
  banner.style.backgroundPosition = 'center top';
  av.innerHTML = `<img src="https://axaiyaflubssaghvhefe.supabase.co/storage/v1/object/public/arqueros/${data.foto}.webp" style="width:100%;height:100%;object-fit:cover">`;
} else {
  banner.style.background = data.color + '33';
  av.textContent = data.avatar;
  av.style.background = data.color + '22';
  av.style.borderColor = data.color + '88';
  av.style.color = data.color;
}

  // Name / role / badges
  document.getElementById('cdm-name').textContent = data.name;
  document.getElementById('cdm-role').textContent = data.role;

  const rb = document.getElementById('cdm-rarity-badge');
  rb.textContent = RARITY_LABELS[data.rarity] || data.rarity;
  rb.style.background = rarityColor + '22';
  rb.style.color = rarityColor;
  rb.style.border = '1px solid ' + rarityColor + '55';

  const sb = document.getElementById('cdm-spec-badge');
  sb.textContent = specLabel;
  sb.style.background = specColor + '22';
  sb.style.color = specColor;

  // Quote
  document.getElementById('cdm-quote').textContent = '«' + data.quote + '»';

  // Stats
  const statsEl = document.getElementById('cdm-stats');
  statsEl.innerHTML = STAT_META.map(m => `
    <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;border:0.5px solid var(--border)">
      <div style="font-size:9px;color:var(--hint);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">${m.label}</div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${data[m.key]}%;background:${m.color};border-radius:2px"></div>
        </div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--text);min-width:28px;text-align:right">${data[m.key]}</div>
      </div>
    </div>
  `).join('');

  // Ability
  document.getElementById('cdm-ability-name').textContent = data.ability;
  document.getElementById('cdm-ability-desc').textContent = data.abilityDesc;

  // Bio
  document.getElementById('cdm-bio').textContent = data.bio || 'Biografía no disponible.';

  // Top results
  const trEl = document.getElementById('cdm-top-results');
  if (data.top && data.top.length) {
    trEl.innerHTML = data.top.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surface2);border-radius:8px;border:0.5px solid var(--border)">
        <div style="font-size:18px;min-width:24px">${r.pos}</div>
        <div style="flex:1;font-size:11px;color:var(--text)">${r.event}</div>
        <div style="font-size:10px;color:var(--muted);white-space:nowrap">${r.year}</div>
      </div>
    `).join('');
  } else {
    trEl.innerHTML = '<div style="font-size:11px;color:var(--hint)">Sin resultados registrados.</div>';
  }

  // Show already-selected state
  const isArcher = type === 'archer';
  const alreadySel = isArcher
    ? (selectedArcher && selectedArcher.id === id)
    : (selectedCoach  && selectedCoach.id  === id);
  const btn    = document.getElementById('cdm-select-btn');
  const alrEl  = document.getElementById('cdm-already-selected');
  if (alreadySel) {
    btn.textContent = '✕ Quitar selección';
    btn.style.borderColor = 'var(--coral)';
    btn.style.color       = 'var(--coral)';
    btn.style.background  = 'rgba(216,120,80,.1)';
    alrEl.style.display = 'none';
  } else {
    btn.textContent = isArcher ? '▶ Seleccionar Arquero' : '▶ Seleccionar Coach';
    btn.style.borderColor = 'var(--yellow)';
    btn.style.color       = 'var(--yellow)';
    btn.style.background  = 'rgba(216,209,90,.12)';
    alrEl.style.display = 'none';
  }

  document.getElementById('card-detail-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeCardDetail(e) {
  if (e && e.target !== document.getElementById('card-detail-overlay')) return;
  document.getElementById('card-detail-overlay').style.display = 'none';
  document.body.style.overflow = '';
}


function handleCardClick(id, type, event) {
  // Always open the detail modal — user selects from inside it
  openCardDetail(id, type);
}


function selectFromModal() {
  if (!_cdmCurrentId || !_cdmCurrentType) return;
  const type = _cdmCurrentType;
  const id   = _cdmCurrentId;
  const allData = type === 'archer' ? ARCHERS : COACHES;
  const data    = allData.find(d => d.id === id);
  if (!data) return;

  // Toggle off if already selected
  const alreadySel = type === 'archer'
    ? (selectedArcher && selectedArcher.id === id)
    : (selectedCoach  && selectedCoach.id  === id);

  if (alreadySel) {
    clearPersonCard(type);
    closeCardDetail();
    return;
  }

  // Select and close modal
  selectPersonCard(id, type);
  closeCardDetail();

  // Navigate: after selecting archer → go to tablero so they can pick coach (or vice versa)
  // If both already selected → stay on tablero
  setTimeout(() => {
    const scoreTab = Array.from(document.querySelectorAll('.nav-tab'))
      .find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes('score'));
    if (scoreTab) switchTab('score', scoreTab);
  }, 150);
}


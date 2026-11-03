// ═══════════════════════════════════════════════════════
//  auth.js — AUTENTICACIÓN
//  Después de login exitoso llama initSupabasePersistence()
//  para cargar el lineup guardado del usuario.
// ═══════════════════════════════════════════════════════

window.showTab = function(t){
  document.getElementById('form-login').style.display    = t==='login'    ? 'block' : 'none';
  document.getElementById('form-register').style.display = t==='register' ? 'block' : 'none';
  document.getElementById('tab-login').style.background    = t==='login'    ? '#d8d15a' : '#222';
  document.getElementById('tab-login').style.color         = t==='login'    ? '#0e0e0e' : '#888';
  document.getElementById('tab-register').style.background = t==='register' ? '#d8d15a' : '#222';
  document.getElementById('tab-register').style.color      = t==='register' ? '#0e0e0e' : '#888';
};

window.loginEmail = async function(){
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { data, error } = await window._supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('auth-msg').textContent = error.message;
  } else {
    document.getElementById('auth-screen').style.display = 'none';
    await _onUserReadyOnce(data && data.session);
  }
};

window.registerEmail = async function(){
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const nombre   = document.getElementById('reg-nombre').value;
  const { error } = await window._supabaseClient.auth.signUp({
    email, password, options: { data: { nombre } }
  });
  if (error) {
    document.getElementById('auth-msg').textContent = error.message;
  } else {
    document.getElementById('auth-msg').textContent = '¡Revisa tu email para confirmar tu cuenta!';
  }
};

window.loginGoogle = async function(){
  // Limpiar hash del URL para que el redirect de Google funcione correctamente
  const redirectTo = window.location.origin + window.location.pathname;
  await window._supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
};

window.cerrarSesion = async function(){
  await window._supabaseClient.auth.signOut();
  document.getElementById('auth-screen').style.display = 'flex';
};

// ── Carga el lineup del usuario al entrar ──────────────
async function _onUserReady() {
  // Espera a que los datos del juego estén listos
  if (!window.APP_STATE?.ready) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window.APP_STATE?.ready) { clearInterval(check); resolve(); }
      }, 100);
    });
  }
  // Carga lineup guardado
  if (typeof initSupabasePersistence === 'function') {
    await initSupabasePersistence();
  }
  // Refresca la UI del tablero con el lineup cargado
  if (typeof refreshLineupUI === 'function') {
    refreshLineupUI();
  }
  // Ahora sí activar el historial para el botón regresar
  history.replaceState({tab:'score'}, '', window.location.pathname);
  history.pushState({tab:'score'}, '', window.location.pathname + '#score');
}

// ── Inicialización una sola vez por sesión ─────────────────────────
// Antes, _onUserReady corría en CADA evento de autenticación: al iniciar, en cada renovación de token
// (cada hora) y dos veces al iniciar sesión con email. Cada corrida recargaba el lineup, reenviaba la
// actividad, redisparaba 'supabase-user-ready' y movía el historial del navegador a #score.
let _readyPromise = null;
let _readyUserId  = null;
function _onUserReadyOnce(session) {
  const uid = session && session.user && session.user.id;
  if (_readyPromise && _readyUserId === uid) return _readyPromise;
  _readyUserId  = uid;
  _readyPromise = _onUserReady().catch(function(e){
    console.error('❌ _onUserReady:', e);
    _readyPromise = null; _readyUserId = null;   // si falla, el siguiente evento lo reintenta
  });
  return _readyPromise;
}

document.addEventListener('DOMContentLoaded', function(){
  window._supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { _readyPromise = null; _readyUserId = null; return; }
    if (!session) return;
    // El token global (Bitácora, Competencias, etc.) se mantiene al día en cada renovación.
    window._supabaseToken = session.access_token;
    document.getElementById('auth-screen').style.display = 'none';
    // Se difiere con setTimeout para no esperar llamadas de Supabase dentro de este callback:
    // hacerlo ahí es la causa documentada de promesas que se quedan colgadas.
    setTimeout(function(){ _onUserReadyOnce(session); }, 0);
  });
});

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
  const { error } = await window._supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('auth-msg').textContent = error.message;
  } else {
    document.getElementById('auth-screen').style.display = 'none';
    await _onUserReady();
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

document.addEventListener('DOMContentLoaded', function(){
  window._supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      document.getElementById('auth-screen').style.display = 'none';
      await _onUserReady();
    }
  });
});

window.showTab = function(t){
  document.getElementById('form-login').style.display = t==='login'?'block':'none';
  document.getElementById('form-register').style.display = t==='register'?'block':'none';
  document.getElementById('tab-login').style.background = t==='login'?'#d8d15a':'#222';
  document.getElementById('tab-login').style.color = t==='login'?'#0e0e0e':'#888';
  document.getElementById('tab-register').style.background = t==='register'?'#d8d15a':'#222';
  document.getElementById('tab-register').style.color = t==='register'?'#0e0e0e':'#888';
}

window.loginEmail = async function(){
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const {error} = await window._supabaseClient.auth.signInWithPassword({email, password});
  if(error) document.getElementById('auth-msg').textContent = error.message;
  else document.getElementById('auth-screen').style.display = 'none';
}

window.registerEmail = async function(){
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const nombre = document.getElementById('reg-nombre').value;
  const {error} = await window._supabaseClient.auth.signUp({email, password, options:{data:{nombre}}});
  if(error) document.getElementById('auth-msg').textContent = error.message;
  else document.getElementById('auth-msg').textContent = '¡Revisa tu email para confirmar tu cuenta!';
}

window.loginGoogle = async function(){
  await window._supabaseClient.auth.signInWithOAuth({provider:'google', options:{redirectTo: window.location.href}});
}

window._supabaseClient.auth.onAuthStateChange((event, session)=>{
  if(session) document.getElementById('auth-screen').style.display = 'none';
});
window.cerrarSesion = async function(){
  await window._supabaseClient.auth.signOut();
  document.getElementById('auth-screen').style.display = 'flex';
}
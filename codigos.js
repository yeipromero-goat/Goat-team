window.redeemCode = async function(){
  const codigo = document.getElementById('code-input').value.trim().toUpperCase();
  if(!codigo){ 
    document.getElementById('code-feedback').textContent = 'Ingresa un código';
    return; 
  }

  const session = await window._supabaseClient.auth.getSession();
  if(!session.data.session){ 
    document.getElementById('code-feedback').textContent = 'Debes iniciar sesión primero';
    return; 
  }
  const userId = session.data.session.user.id;

  const {data, error} = await window._supabaseClient
    .from('codigos')
    .select('*')
    .eq('codigo', codigo)
    .single();

  if(error || !data){ 
    document.getElementById('code-feedback').textContent = '❌ Código no válido';
    return; 
  }
  if(data.canjeado){ 
    document.getElementById('code-feedback').textContent = '❌ Este código ya fue utilizado';
    return; 
  }

  await window._supabaseClient
    .from('codigos')
    .update({ canjeado: true, canjeado_por: userId })
    .eq('codigo', codigo);

  document.getElementById('code-feedback').textContent = '✅ ¡Carta ' + data.carta_id + ' desbloqueada!';
}
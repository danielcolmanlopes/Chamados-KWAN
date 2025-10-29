document.getElementById('formChamado').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const msg = document.getElementById('msg');
  msg.innerHTML = '⏳ Enviando...';

  try{
    const res = await fetch('backend/api.php', { method:'POST', body:formData });
    const data = await res.json();
    if(data.success){
      msg.innerHTML = `✅ Chamado criado!<br>Código: <b>${data.codigo}</b><br>
        Acompanhe: <a href="acompanhar.html?c=${data.codigo}">Clique aqui</a>`;
      e.target.reset();
    }else{
      msg.innerHTML = '❌ Erro: ' + (data.message || 'Falha ao criar chamado.');
    }
  }catch(err){
    msg.innerHTML = '❌ Erro inesperado.';
  }
});

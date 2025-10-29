const params = new URLSearchParams(window.location.search);
const codigo = params.get('c');
const infoDiv = document.getElementById('infoChamado');
const msgDiv = document.getElementById('msg');

async function carregarChamado(){
  if(!codigo){ infoDiv.innerHTML="❌ Código de chamado não informado."; return; }
  try{
    const res = await fetch(`backend/api_get.php?c=${encodeURIComponent(codigo)}`);
    const data = await res.json();
    if(!data.success){ infoDiv.innerHTML = "❌ " + data.message; return; }
    const ch = data.chamado;
    infoDiv.innerHTML = `
      <p><b>Código:</b> ${ch.codigo_publico}</p>
      <p><b>Status:</b> ${ch.status}</p>
      <p><b>Produto:</b> ${ch.marca} ${ch.modelo}</p>
      <p><b>Serial:</b> ${ch.serial}</p>
      <p><b>Problema:</b> ${ch.descricao_problema}</p>
      <hr><h4>Histórico</h4>
      <ul>${data.eventos.map(e=>`<li>${e.data} — ${e.texto}</li>`).join('')}</ul>`;
    const mensagensDiv = document.getElementById('mensagens');
    mensagensDiv.innerHTML = data.mensagens.map(m=>`
      <div class="${m.autor==='cliente'?'msg-cli':'msg-int'}">
        <b>${m.autor}</b>: ${m.mensagem}
      </div>`).join('');
  }catch(_){ infoDiv.innerHTML = "❌ Falha ao carregar."; }
}

document.getElementById('formUpload').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target); fd.append('codigo', codigo);
  const res = await fetch('backend/upload.php',{method:'POST',body:fd});
  const data = await res.json();
  msgDiv.innerHTML = data.success ? '✅ Anexo enviado.' : '❌ ' + (data.message||'Falha no upload.');
});

document.getElementById('formMensagem').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target); fd.append('codigo', codigo);
  const res = await fetch('backend/api_get.php',{method:'POST',body:fd});
  const data = await res.json();
  if(data.success){ msgDiv.innerHTML='💬 Mensagem enviada.'; e.target.reset(); carregarChamado(); }
  else{ msgDiv.innerHTML='❌ ' + (data.message||'Falha ao enviar.'); }
});

carregarChamado();
